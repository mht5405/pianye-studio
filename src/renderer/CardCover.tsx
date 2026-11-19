import type { PageCover } from '../domain/document';

export function CardCover({ cover }: { cover: PageCover }) {
  const titleSize = cover.title.length > 42 ? 'cover-title-xlong' : cover.title.length > 26 ? 'cover-title-long' : '';
  const authorName = cover.authorName?.trim() ?? '';
  const showAuthor = Boolean(cover.showAuthor && (authorName || cover.authorAvatarDataUrl));
  const standalone = cover.mode === 'standalone';
  const imagePosition = `center ${cover.imagePositionY ?? 50}%`;
  const copy = <>
    {cover.kicker && <p class="card-cover-kicker">{cover.kicker}</p>}
    <h1 class="card-cover-title">{cover.title}</h1>
    {cover.subtitle && <p class="card-cover-subtitle">{cover.subtitle}</p>}
  </>;
  return (
    <section class={`card-cover cover-${cover.mode} ${titleSize}${cover.imageDataUrl ? ' has-cover-image' : ''}`}>
      <div class="card-cover-decoration" aria-hidden="true" />
      {cover.imageDataUrl && (
        <div class="card-cover-art" aria-hidden="true" style={{
          '--cover-image': `url("${cover.imageDataUrl}")`,
          '--cover-image-position': imagePosition,
        }}>
          <div class="card-cover-art-blur" />
          {standalone
            ? <img class="card-cover-art-detail" src={cover.imageDataUrl} alt="" />
            : <div class="card-cover-art-detail" />}
        </div>
      )}
      {standalone ? <div class="card-cover-copy">{copy}</div> : copy}
      {showAuthor && <div class="card-author-signature cover-author-signature">
        {cover.authorAvatarDataUrl && <img src={cover.authorAvatarDataUrl} alt="" />}
        {authorName && <span>{authorName}</span>}
      </div>}
    </section>
  );
}
