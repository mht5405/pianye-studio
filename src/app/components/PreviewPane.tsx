import type { LayoutConfig, PagePlan } from "../../domain/document";
import type { ImageResourceIndex } from "../../resources/image-resources";
import { CardPage } from "../../renderer/CardPage";
import { useState } from "preact/hooks";

type PreviewColumns = 1 | 2 | 3;

export function PreviewPane({
  activeOnMobile,
  articleName,
  pagePlan,
  config,
  resources,
  previewStyle,
  effectiveColumns,
  columnLimit,
  compactWorkspace,
  diagnosticLabel,
  hasExportErrors,
  onSelectColumns,
  onOpenSettings,
  onCardRef,
}: {
  activeOnMobile: boolean;
  articleName: string;
  pagePlan: PagePlan;
  config: LayoutConfig;
  resources: ImageResourceIndex;
  previewStyle: string;
  effectiveColumns: PreviewColumns;
  columnLimit: PreviewColumns;
  compactWorkspace: boolean;
  diagnosticLabel?: string;
  hasExportErrors: boolean;
  onSelectColumns: (columns: PreviewColumns) => void;
  onOpenSettings: () => void;
  onCardRef: (pageId: string, node: HTMLElement | null) => void;
}) {
  const [activePage, setActivePage] = useState(0);
  const jumpToPage = (index: number) => {
    setActivePage(index);
    document.querySelector<HTMLElement>(`[data-preview-index="${index}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  };
  const trackActivePage = (event: Event) => {
    const viewport = event.currentTarget as HTMLElement;
    const viewportTop = viewport.getBoundingClientRect().top;
    const frames = Array.from(viewport.querySelectorAll<HTMLElement>(".preview-frame"));
    let nearest = 0;
    let distance = Number.POSITIVE_INFINITY;
    frames.forEach((frame, index) => {
      const top = frame.getBoundingClientRect().top;
      const nextDistance = Math.abs(top - viewportTop);
      if (nextDistance < distance) { distance = nextDistance; nearest = index; }
    });
    setActivePage(nearest);
  };
  return (
    <section class={`preview-panel${activeOnMobile ? " mobile-active" : ""}`}>
      <div class="panel-heading preview-heading">
        <div>
          <span class="eyebrow">所见即所得</span>
          <h2 title={articleName}>{articleName}</h2>
        </div>
        <div class="preview-toolbar">
          <div
            class="preview-layout-control"
            role="group"
            aria-label={`预览列数，当前显示 ${effectiveColumns} 列`}
          >
            {([1, 2, 3] as const)
              .filter((columns) => !compactWorkspace || columns === 1)
              .map((columns) => (
                <button
                  key={columns}
                  type="button"
                  class={effectiveColumns === columns ? "selected" : ""}
                  aria-pressed={effectiveColumns === columns}
                  disabled={columns > columnLimit}
                  title={
                    columns > columnLimit
                      ? "当前卡片数量或预览宽度不足，暂不适合此列数"
                      : undefined
                  }
                  onClick={() => onSelectColumns(columns)}
                >
                  {columns} 列
                </button>
              ))}
          </div>
          <span class="page-badge">{pagePlan.pages.length} 张卡片</span>
          {diagnosticLabel && (
            <button
              type="button"
              class={`preview-diagnostic${hasExportErrors ? " error" : ""}`}
              onClick={onOpenSettings}
            >
              {diagnosticLabel}
            </button>
          )}
        </div>
      </div>
      <div class="preview-scroll" style={previewStyle} onScroll={trackActivePage}>
        {pagePlan.pages.map((page, index) => (
          <div key={page.id} class="preview-frame" data-preview-index={index}>
            <div class="preview-scale">
              <CardPage
                ref={(node: HTMLElement | null) => onCardRef(page.id, node)}
                page={page}
                totalPages={pagePlan.pages.length}
                config={config}
                resources={resources}
              />
            </div>
          </div>
        ))}
      </div>
      <nav class="preview-filmstrip" aria-label="图卡分页导航">
        <span class="filmstrip-heading">校样页</span>
        <div class="filmstrip-pages">
          {pagePlan.pages.map((page, index) => (
            <button type="button" key={page.id} class={`filmstrip-page${activePage === index ? " selected" : ""}`} aria-current={activePage === index ? "page" : undefined} aria-label={`跳到第 ${index + 1} 张，${page.cover ? "封面" : page.section || "正文"}`} onClick={() => jumpToPage(index)}>
              <span class="filmstrip-page-index">{String(index + 1).padStart(2, "0")}</span>
              <span class="filmstrip-page-title">{page.cover ? "封面" : page.section || "正文"}</span>
            </button>
          ))}
        </div>
        <span class="filmstrip-total">{String(pagePlan.pages.length).padStart(2, "0")} 页</span>
      </nav>
    </section>
  );
}
