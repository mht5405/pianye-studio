import { render } from 'preact';
import '../workbench-styles';
import { canvasHeight } from '../domain/card-metrics';
import { renderCardPngs } from '../export/export-cards';
import { checkExportReadiness } from '../export/preflight';
import type { PagePlan } from '../domain/document';
import { parseMarkdown } from '../parser/parse-markdown';
import { checkCoverCredit, createCardCover, inferArticleTitle } from '../renderer/article-card';
import { CardPage } from '../renderer/CardPage';
import { MeasureStage } from '../renderer/MeasureStage';
import { fetchLinkedImage, imageToDataUrl } from '../resources/image-import';
import { articleImageUrls, buildImageResourceIndex } from '../resources/image-resources';
import { configFromPreferences } from './preferences';

interface RenderInput {
  markdown: string;
  filename: string;
  preferences: unknown;
  cover?: string;
}

declare global {
  interface Window {
    readPianyeImage: (path: string) => Promise<{ base64: string; type: string }>;
    receivePianyePng: (name: string, dataUrl: string) => Promise<void>;
    renderPianyeCards: typeof renderPianyeCards;
  }
}

async function loadImage(source: string): Promise<Blob> {
  if (/^https?:/i.test(source)) return fetchLinkedImage(source, AbortSignal.timeout(20_000));
  if (/^data:image\//i.test(source)) return (await fetch(source)).blob();
  const { base64, type } = await window.readPianyeImage(source);
  return new Blob([Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))], { type });
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function renderPianyeCards({ markdown, filename, preferences, cover: coverOverride }: RenderInput) {
  const root = document.getElementById('app')!;
  const config = configFromPreferences(preferences);
  const article = parseMarkdown(markdown);
  const title = inferArticleTitle(article, filename);
  const coverImage = coverOverride || (config.coverMode !== 'none' ? article.metadata?.coverImage : undefined);
  if (coverImage) {
    if (config.coverMode === 'none') config.coverMode = 'standalone';
    try {
      config.coverImageDataUrl = await imageToDataUrl(await loadImage(coverImage), 2560);
    } catch (error) {
      throw new Error(`无法读取封面图片 ${coverImage}：${error instanceof Error ? error.message : String(error)}`);
    }
  }
  checkCoverCredit(article, config);
  const cover = createCardCover(title, config);

  const resolvedUrls = new Map<string, string>();
  try {
    const imageUrls = articleImageUrls(article);
    // Preload images once so measurement and export use the same bytes.
    for (const url of imageUrls) {
      try {
        resolvedUrls.set(url, URL.createObjectURL(await loadImage(url)));
      } catch (error) {
        throw new Error(`无法读取正文图片 ${url}：${error instanceof Error ? error.message : String(error)}`);
      }
    }
    const resources = { ...buildImageResourceIndex([], {}), resolvedUrls };
    const plan = await new Promise<PagePlan>((resolve) => {
      render(<MeasureStage article={article} config={config} cover={cover} resources={resources} onPlan={resolve} />, root);
    });
    render(
      <div>
        {plan.pages.map((page) => <CardPage key={page.id} page={page} totalPages={plan.pages.length} config={config} resources={resources} />)}
      </div>,
      root,
    );
    const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-card-page]'));
    await checkExportReadiness(cards, plan.diagnostics);
    await renderCardPngs({
      cards,
      pixelRatio: config.exportScale,
      onPng: async (name, bytes) => {
        const dataUrl = await toDataUrl(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
        await window.receivePianyePng(name, dataUrl);
      },
    });
    return {
      title,
      theme: config.cardTheme,
      width: 1080 * config.exportScale,
      height: canvasHeight(config.ratio) * config.exportScale,
      warnings: plan.diagnostics.filter((item) => item.level === 'warning').map((item) => item.message),
    };
  } finally {
    render(null, root);
    for (const url of resolvedUrls.values()) URL.revokeObjectURL(url);
  }
}

window.renderPianyeCards = renderPianyeCards;
