import type { Diagnostic } from '../domain/document';

export async function checkExportReadiness(cards: HTMLElement[], diagnostics: Diagnostic[]): Promise<void> {
  const errors = diagnostics.filter((item) => item.level === 'error');
  if (errors.length) throw new Error(errors.map((item) => item.message).join('\n'));
  if (!cards.length) throw new Error('没有可导出的卡片。');
  await document.fonts.ready;
  await Promise.all(cards.flatMap((card) => Array.from(card.querySelectorAll('img')).map((image) =>
    image.decode().catch(() => {
      throw new Error(`有图片无法解码${image.alt ? `（${image.alt}）` : ''}。`);
    }),
  )));
  for (const [index, card] of cards.entries()) {
    const content = card.querySelector<HTMLElement>('.card-content');
    if (content && content.scrollHeight > content.clientHeight + 1) {
      throw new Error(`第 ${index + 1} 张卡片内容溢出，请调整排版后重试。`);
    }
  }
}
