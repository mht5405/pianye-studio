import type { PageCover } from '../domain/document';

export function CardCover({ cover }: { cover: PageCover }) {
  const titleSize = cover.title.length > 42 ? 'cover-title-xlong' : cover.title.length > 26 ? 'cover-title-long' : '';
  const authorName = cover.authorName?.trim() ?? '';
  const showAuthor = Boolean(cover.showAuthor && (authorName || cover.authorAvatarDataUrl));
  return (
    <section class={`card-cover cover-${cover.mode} ${titleSize}${cover.imageDataUrl ? ' has-cover-image' : ''}`} style={cover.imageDataUrl ? { backgroundImage: `linear-gradient(0deg, rgba(0,0,0,.84), rgba(0,0,0,.06) 76%), url("${cover.imageDataUrl}")`, backgroundPosition: `center, center ${cover.imagePositionY ?? 50}%`, backgroundSize: 'cover, auto 115%' } : undefined}>
      <div class="card-cover-decoration" aria-hidden="true" />
      {cover.kicker && <p class="card-cover-kicker">{cover.kicker}</p>}
      <h1 class="card-cover-title">{cover.title}</h1>
      {cover.subtitle && <p class="card-cover-subtitle">{cover.subtitle}</p>}
      {showAuthor && <div class="card-author-signature cover-author-signature">
        {cover.authorAvatarDataUrl && <img src={cover.authorAvatarDataUrl} alt="" />}
        {authorName && <span>{authorName}</span>}
      </div>}
    </section>
  );
}
