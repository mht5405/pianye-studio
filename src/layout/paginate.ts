import type { ArticleDocument, Block, Diagnostic, LayoutConfig, PageCover, PageFragment, PagePlan, PagePlanPage } from '../domain/document';
import { canvasHeight, cardBottomPadding } from '../domain/card-metrics';
import { inlineText } from '../parser/parse-markdown';
import { splitParagraph, type MeasureParagraph, type Paragraph } from './split-paragraph';

const CONTENT_SAFETY_BUFFER = 53;
const PAGE_NUMBER_HEIGHT = 35;
const AUTHOR_AVATAR_FOOTER_HEIGHT = 72;
const AUTHOR_NAME_FOOTER_HEIGHT = 48;

const DENSITY_FACTOR: Record<LayoutConfig['density'], number> = {
  relaxed: 1.14,
  balanced: 1,
  compact: 0.87,
  custom: 1,
};

function contentCapacity(config: LayoutConfig): number {
  const hasAuthorSignature = config.showAuthorOnContent && Boolean(config.authorName.trim() || config.authorAvatarDataUrl);
  const footerHeight = hasAuthorSignature
    ? config.authorAvatarDataUrl ? AUTHOR_AVATAR_FOOTER_HEIGHT : AUTHOR_NAME_FOOTER_HEIGHT
    : config.showPageNumber ? PAGE_NUMBER_HEIGHT : 0;
  return canvasHeight(config.ratio)
    - config.cardVerticalPadding
    - cardBottomPadding(config)
    - footerHeight
    - CONTENT_SAFETY_BUFFER;
}

function fallbackHeight(block: Block, config: LayoutConfig): number {
  const factor = config.density === 'custom'
    ? (config.bodyFontSize / 30) * (config.bodyLineHeight / 1.62)
    : DENSITY_FACTOR[config.density];
  switch (block.kind) {
    case 'heading':
      return (block.depth <= 2 ? 92 : 70) * factor;
    case 'paragraph':
      return (64 + Math.ceil(inlineText(block.children).length / 31) * 49) * factor;
    case 'list':
      return (42 + block.items.reduce((sum, item) => sum + item.reduce((itemSum, child) => itemSum + fallbackHeight(child, config), 0), 0)) * factor;
    case 'blockquote':
      return (42 + block.children.reduce((sum, child) => sum + fallbackHeight(child, config), 0)) * factor;
    case 'code':
      return (78 + Math.max(1, block.value.split('\n').length) * 35) * factor;
    case 'math':
      return 120 * factor;
    case 'image':
      return 580 * factor;
    case 'table':
      return (92 + Math.max(1, block.rows.length) * 52) * factor;
    case 'thematicBreak':
      return 42;
    case 'pageBreak':
      return 0;
  }
}

function measuredHeight(block: Block, config: LayoutConfig, measurements: Record<string, number>): number {
  return measurements[block.id] ?? fallbackHeight(block, config);
}

function cloneBlock(block: Block, id: string): Block {
  return { ...block, id } as Block;
}

function isFlowingParagraph(block: Block): block is Paragraph {
  return block.kind === 'paragraph' && !block.id.startsWith('generated-source-');
}

function splitOversizeBlock(
  block: Block,
  blockHeight: number,
  available: number,
  diagnostics: Diagnostic[],
): PageFragment[] {
  if (blockHeight <= available || block.kind === 'heading' || block.kind === 'pageBreak' || isFlowingParagraph(block)) {
    return [{ id: block.id, sourceId: block.id, block }];
  }

  if (block.kind === 'code') {
    const lines = block.value.split('\n');
    const lineHeight = Math.max(25, (blockHeight - 78) / Math.max(1, lines.length));
    const perPage = Math.max(1, Math.floor((available - 86) / lineHeight));
    const total = Math.ceil(lines.length / perPage);
    return Array.from({ length: total }, (_, index) => {
      const start = index * perPage;
      const continuation = total > 1 ? { index: index + 1, total, label: `代码续 ${index + 1}/${total}` } : undefined;
      const fragment = cloneBlock({ ...block, value: lines.slice(start, start + perPage).join('\n') }, `${block.id}-code-${index}`);
      return { id: fragment.id, sourceId: block.id, block: fragment, continuation };
    });
  }

  if (block.kind === 'table' && block.rows.length > 2) {
    const bodyRows = block.rows.slice(1);
    const headerHeight = Math.max(62, blockHeight * 0.18);
    const perPage = Math.max(1, Math.floor((bodyRows.length * (available - headerHeight)) / Math.max(1, blockHeight - headerHeight)));
    const total = Math.ceil(bodyRows.length / perPage);
    return Array.from({ length: total }, (_, index) => {
      const rows = [block.rows[0], ...bodyRows.slice(index * perPage, (index + 1) * perPage)];
      const fragment = cloneBlock({ ...block, rows }, `${block.id}-table-${index}`);
      return {
        id: fragment.id,
        sourceId: block.id,
        block: fragment,
        continuation: total > 1 ? { index: index + 1, total, label: `表格续 ${index + 1}/${total}` } : undefined,
      };
    });
  }

  diagnostics.push({
    level: 'warning',
    message: block.kind === 'math' ? '公式过高，已单独放置并采用公式缩放；建议手动改为 aligned 多行公式。' : '该块过高，已独占一页以避免内容裁切。',
    blockId: block.id,
  });
  return [{ id: block.id, sourceId: block.id, block }];
}

function fragmentHeight(fragment: PageFragment, config: LayoutConfig, measurements: Record<string, number>): number {
  const base = measurements[fragment.id] ?? measurements[fragment.sourceId] ?? fallbackHeight(fragment.block, config);
  if (!fragment.continuation) return base;
  if (fragment.block.kind === 'code') return 78 + fragment.block.value.split('\n').length * 35;
  if (fragment.block.kind === 'table') return 92 + fragment.block.rows.length * 52;
  return base;
}

function fallbackCoverHeight(cover: PageCover, config: LayoutConfig): number {
  const titleLines = Math.max(1, Math.ceil(cover.title.length / 16));
  const subtitleLines = cover.subtitle ? Math.ceil(cover.subtitle.length / 30) : 0;
  const kickerHeight = cover.kicker ? 38 : 0;
  const densityFactor = config.density === 'compact' ? 0.9 : config.density === 'relaxed' ? 1.08 : 1;
  return Math.round((112 + kickerHeight + titleLines * 78 + subtitleLines * 42) * densityFactor);
}

function nextMeaningfulIndex(fragments: PageFragment[], start: number): number | undefined {
  for (let index = start; index < fragments.length; index += 1) {
    const kind = fragments[index].block.kind;
    if (kind === 'pageBreak') return undefined;
    if (kind !== 'thematicBreak') return index;
  }
  return undefined;
}

function beforeSpacingFor(block: Block, config: LayoutConfig): number {
  if (block.id.startsWith('generated-source-')) return 6;
  if (block.kind === 'heading' && block.depth === 2) return config.headingH2BeforeSpacing;
  if (block.kind === 'heading' && block.depth === 3) return config.headingH3BeforeSpacing;
  return config.blockGap;
}

function headingWithNextHeight(
  fragments: PageFragment[],
  index: number,
  headingHeight: number,
  config: LayoutConfig,
  measurements: Record<string, number>,
  capacity: number,
  paragraphLeadHeight?: number,
): number {
  const nextIndex = nextMeaningfulIndex(fragments, index + 1);
  if (nextIndex === undefined) return headingHeight;
  const next = fragments[nextIndex];
  let nextHeight = fragmentHeight(next, config, measurements);
  if (isFlowingParagraph(next.block) && paragraphLeadHeight !== undefined) {
    nextHeight = Math.min(nextHeight, paragraphLeadHeight);
  }
  return Math.min(capacity, headingHeight + beforeSpacingFor(next.block, config) + nextHeight);
}

export function createPagePlan(
  article: ArticleDocument,
  config: LayoutConfig,
  measurements: Record<string, number>,
  cover?: PageCover,
  measureParagraph?: MeasureParagraph,
): PagePlan {
  const diagnostics: Diagnostic[] = [...article.diagnostics];
  // Density changes rendered block heights, not the physical height of a
  // 1080px card. Applying its fallback factor here would overfill relaxed
  // cards after DOM measurement has produced the real block sizes.
  const capacity = contentCapacity(config);
  const lineHeight = config.bodyFontSize * config.bodyLineHeight;
  const expanded = article.blocks.flatMap((block) =>
    splitOversizeBlock(block, measuredHeight(block, config, measurements), capacity * 0.92, diagnostics),
  );

  const pages: PagePlanPage[] = [];
  if (cover?.mode === 'standalone') {
    pages.push({ id: 'page-cover', index: 0, section: '', cover, fragments: [], estimatedHeight: 0 });
  }
  let current: PageFragment[] = [];
  let currentCover = cover?.mode === 'integrated' ? cover : undefined;
  let used = currentCover ? (measurements[currentCover.id] ?? fallbackCoverHeight(currentCover, config)) : 0;
  let section = '';
  let paragraphPart = 0;
  const paragraphHeights = new Map<string, number>();

  const heightOf = (fragment: PageFragment) => paragraphHeights.get(fragment.id) ?? fragmentHeight(fragment, config, measurements);
  const paragraphFragment = (fragment: PageFragment, paragraph: Paragraph, height: number): PageFragment => {
    const id = `${fragment.sourceId}-flow-${paragraphPart++}`;
    paragraphHeights.set(id, height);
    return { ...fragment, id, block: paragraph };
  };
  const append = (fragment: PageFragment, height: number, beforeSpacing: number) => {
    current.push(beforeSpacing ? { ...fragment, beforeSpacing } : fragment);
    used += beforeSpacing + height;
  };

  const flush = () => {
    if (!current.length && !currentCover) return;
    pages.push({ id: `page-${pages.length + 1}`, index: pages.length, section, cover: currentCover, fragments: current, estimatedHeight: used });
    current = [];
    currentCover = undefined;
    used = 0;
  };

  for (let index = 0; index < expanded.length; index += 1) {
    const fragment = expanded[index];
    const { block } = fragment;
    if (block.kind === 'pageBreak') {
      flush();
      continue;
    }
    const height = heightOf(fragment);
    const pageHasContent = current.length > 0 || Boolean(currentCover);
    let beforeSpacing = current.length ? beforeSpacingFor(block, config) : 0;
    // H1 starts a new part. H2–H4 flow like ordinary blocks.
    if (pageHasContent && block.kind === 'heading') {
      const requiredHeight = block.depth >= 5
        ? headingWithNextHeight(expanded, index, height, config, measurements, capacity, measureParagraph ? 2 * lineHeight : undefined)
        : height;
      if (block.depth <= 1 || used + beforeSpacing + requiredHeight > capacity) {
        flush();
        beforeSpacing = 0;
      }
    }

    if (isFlowingParagraph(block) && measureParagraph && used + beforeSpacing + height > capacity) {
      const split = splitParagraph(block, capacity - used - beforeSpacing, lineHeight, measureParagraph, !pageHasContent);
      if (split) {
        append(paragraphFragment(fragment, split.head, split.headHeight), split.headHeight, beforeSpacing);
        expanded[index] = paragraphFragment(fragment, split.tail, split.tailHeight);
      }
      if (split || pageHasContent) {
        flush();
        index -= 1; // Retry the remaining text at the top of the new card.
        continue;
      }
    }
    if ((current.length || currentCover) && used + beforeSpacing + height > capacity) {
      flush();
      beforeSpacing = 0;
    }
    if (block.kind === 'heading' && block.depth <= 2) section = inlineText(block.children);
    append(fragment, height, beforeSpacing);

    if (height > capacity) {
      diagnostics.push({ level: 'warning', message: '该页面包含无法进一步安全拆分的超高内容，请检查公式或资源。', blockId: block.id });
      flush();
    }
  }
  flush();

  if (!pages.length && article.blocks.length === 0) {
    pages.push({ id: 'page-1', index: 0, section: '', fragments: [], estimatedHeight: 0 });
  }

  const sparsePages = pages.filter((page, index) => index > 0 && index < pages.length - 1 && page.estimatedHeight < capacity * 0.48);
  if (sparsePages.length) {
    diagnostics.push({ level: 'info', message: `${sparsePages.length} 个中间页留白较多；可切换“紧凑”或使用手动分页微调。` });
  }
  return { pages, diagnostics };
}
