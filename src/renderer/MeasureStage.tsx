import { render } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { ArticleDocument, LayoutConfig, PageCover, PagePlan } from '../domain/document';
import { createPagePlan } from '../layout/paginate';
import type { ImageResourceIndex } from '../resources/image-resources';
import { cardContentWidth, cardStyle } from './card-style';
import { CardCover } from './CardCover';
import { BlockView } from './RichText';

export function MeasureStage({ article, config, cover, resources, onPlan }: {
  article: ArticleDocument;
  config: LayoutConfig;
  cover?: PageCover;
  resources?: ImageResourceIndex;
  onPlan: (plan: PagePlan) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    const collect = async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(stageRef.current?.querySelectorAll('img') ?? []).map((image) =>
        image.decode().catch(() => { /* broken images retain their native fallback height */ }),
      ));
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const stage = stageRef.current;
      const probe = probeRef.current;
      if (cancelled || !stage || !probe) return;
      const next: Record<string, number> = {};
      stage.querySelectorAll<HTMLElement>('[data-measure-id]').forEach((element) => {
        const computed = getComputedStyle(element);
        next[element.dataset.measureId ?? ''] = element.getBoundingClientRect().height + Number.parseFloat(computed.marginBottom || '0');
      });
      try {
        onPlan(createPagePlan(article, config, next, cover, (paragraph) => {
          // The same markup and typography reflow each candidate at card width.
          render(<BlockView block={paragraph} config={config} />, probe);
          return probe.getBoundingClientRect().height;
        }));
      } finally {
        render(null, probe);
      }
    };
    void collect();
    return () => { cancelled = true; };
  }, [article, config, cover, resources, onPlan]);

  return (
    <aside ref={stageRef} class={`measure-stage theme-${config.cardTheme} density-${config.density} code-appearance-${config.codeBlockAppearance}`} style={{ ...cardStyle(config), width: `${cardContentWidth(config)}px` }} aria-hidden="true">
      {cover?.mode === 'integrated' && <div data-measure-id={cover.id} class="measure-cover"><CardCover cover={cover} /></div>}
      {article.blocks.filter((block) => block.kind !== 'pageBreak').map((block) => (
        <div key={block.id} data-measure-id={block.id} class="measure-block">
          <BlockView block={block} config={config} resources={resources} />
        </div>
      ))}
      <div ref={probeRef} class="measure-block" />
    </aside>
  );
}
