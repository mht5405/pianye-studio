import { zipSync, strToU8 } from 'fflate';
import { getFontEmbedCSS, toBlob } from 'html-to-image';
import { downloadFile } from '../resources/download';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function isPng(bytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

export async function renderCardPngs({
  cards,
  pixelRatio,
  onPng,
}: {
  cards: HTMLElement[];
  pixelRatio: 1 | 2;
  onPng: (name: string, bytes: Uint8Array, index: number) => void | Promise<void>;
}): Promise<void> {
  if (!cards.length) throw new Error('没有可导出的卡片。');
  await document.fonts.ready;
  await Promise.all(cards.flatMap((card) => Array.from(card.querySelectorAll('img')).map((image) => image.decode())));

  // Font discovery/data-URL conversion is expensive for a CJK font. Do it
  // once, then give every page the exact same embedded CSS.
  const fontEmbedCSS = await getFontEmbedCSS(cards[0]);
  const digits = Math.max(2, String(cards.length).length);
  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    const cardBackground = window.getComputedStyle(card).backgroundColor;
    const blob = await toBlob(card, {
      // A cache-busting query string makes browser-created blob: image URLs
      // invalid. Local imported images are already immutable object URLs.
      cacheBust: false,
      fontEmbedCSS,
      pixelRatio,
      // Each theme owns its canvas color; forcing the editor's light canvas
      // here makes light text from dark themes nearly invisible in the PNG.
      backgroundColor: cardBackground,
      width: card.offsetWidth,
      height: card.offsetHeight,
    });
    if (!blob || blob.type !== 'image/png') throw new Error(`第 ${index + 1} 张卡片没有生成真实 PNG。`);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (!isPng(bytes)) throw new Error(`第 ${index + 1} 张卡片的文件头不是 PNG。`);
    await onPng(`${String(index + 1).padStart(digits, '0')}.png`, bytes, index);
    // Yield after each bitmap so a long article keeps the page responsive.
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }

}

export async function exportCards({
  cards,
  filename,
  pixelRatio,
  onProgress,
}: {
  cards: HTMLElement[];
  filename: string;
  pixelRatio: 1 | 2;
  onProgress: (completed: number, total: number) => void;
}): Promise<void> {
  const files: Record<string, Uint8Array> = {};
  await renderCardPngs({
    cards,
    pixelRatio,
    onPng: (name, bytes, index) => {
      files[name] = bytes;
      onProgress(index + 1, cards.length);
    },
  });
  files['README.txt'] = strToU8('由篇页 Markdown 图文工作室在本地浏览器生成。每个 .png 已通过 PNG 文件头校验。\n');
  const archive = zipSync(files, { level: 6 });
  downloadFile(new Blob([archive], { type: 'application/zip' }), `${filename || 'social-cards'}.zip`);
}
