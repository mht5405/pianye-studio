import type { ArticleDocument, LayoutConfig, PageCover } from '../domain/document';

export function inferArticleTitle(article: ArticleDocument, filename: string): string {
  return article.title.trim() || filename.replace(/\.[^./\\]+$/, '').trim() || '未命名笔记';
}

export function checkCoverCredit(article: ArticleDocument, config: LayoutConfig): void {
  if (config.coverMode !== 'none' && config.coverImageDataUrl && !article.metadata?.coverSource) {
    article.diagnostics.push({ level: 'error', message: '已设置封面图片，但缺少 cover_source；请补充图片来源后才能导出。' });
  }
}

export function createCardCover(title: string, config: LayoutConfig): PageCover | undefined {
  if (config.coverMode === 'none') return undefined;
  return {
    id: 'md2card-cover',
    mode: config.coverMode,
    title,
    kicker: config.coverKicker.trim(),
    subtitle: config.coverSubtitle.trim(),
    imageDataUrl: config.coverImageDataUrl,
    imagePositionY: config.coverImagePositionY,
    authorName: config.authorName,
    authorAvatarDataUrl: config.authorAvatarDataUrl,
    showAuthor: config.showAuthorOnCover,
  };
}
