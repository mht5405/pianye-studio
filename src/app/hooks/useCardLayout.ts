import { useCallback, useMemo, useState } from "preact/hooks";
import type { LayoutConfig, PagePlan } from "../../domain/document";
import { createPagePlan } from "../../layout/paginate";
import { parseMarkdown } from "../../parser/parse-markdown";
import { checkCoverCredit, createCardCover, inferArticleTitle } from "../../renderer/article-card";

/** Keeps parsing, hidden measurement, and visible pagination on one plan. */
export function useCardLayout({
  markdown,
  config,
  titleOverride,
  sourceFileName,
}: {
  markdown: string;
  config: LayoutConfig;
  titleOverride: string;
  sourceFileName: string;
}) {
  const [revision, setRevision] = useState(0);
  const article = useMemo(() => {
    const parsed = parseMarkdown(markdown, { coverSource: config.coverSource, coverSourceUrl: config.coverSourceUrl });
    checkCoverCredit(parsed, config);
    return parsed;
  }, [config.coverImageDataUrl, config.coverMode, config.coverSource, config.coverSourceUrl, markdown]);
  const inferredTitle = inferArticleTitle(article, sourceFileName);
  const articleName = titleOverride.trim() || inferredTitle;
  const titleSource = article.title.trim()
    ? article.metadata?.title ? "Markdown front matter" : "Markdown 首个 H1"
    : sourceFileName
      ? "导入文件名"
      : "默认名称";
  const cover = useMemo(() => createCardCover(articleName, config), [articleName, config]);
  const layout = useMemo(() => ({ revision, article, config, cover }), [revision, article, config, cover]);
  const [measured, setMeasured] = useState<{ layout: typeof layout; plan: PagePlan }>();
  const layoutReady = measured?.layout === layout;
  const pagePlan = useMemo(() => {
    return measured?.layout === layout ? measured.plan : createPagePlan(article, config, {}, cover);
  }, [measured, layout, article, config, cover]);
  const acceptPlan = useCallback((plan: PagePlan) => setMeasured({ layout, plan }), [layout]);
  const invalidateLayout = useCallback(() => setRevision((previous) => previous + 1), []);

  return {
    acceptPlan,
    article,
    articleName,
    cover,
    inferredTitle,
    invalidateLayout,
    layoutReady,
    pagePlan,
    titleSource,
  };
}
