import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, DENSITY_PRESETS } from '../../src/domain/document';
import { migrateStarterMarkdown, STARTER_MARKDOWN } from '../../src/data/starter-markdown';
import { createPagePlan } from '../../src/layout/paginate';
import { inlineText, parseMarkdown } from '../../src/parser/parse-markdown';
import type { MeasureParagraph } from '../../src/layout/split-paragraph';
import {
  articleImageUrls,
  buildImageResourceIndex,
  resolveImageReference,
  summarizeImageBindings,
} from '../../src/resources/image-resources';

const fixture = readFileSync(resolve(import.meta.dirname, '../fixtures/technical.md'), 'utf8');
const completeExample = readFileSync(
  resolve(import.meta.dirname, '../../examples/篇页示例.md'),
  'utf8',
);
// These fixtures use dimensions from the original 3:4 pagination cases;
// keep their geometry explicit as the product default is now 3:5.
const PAGE_TEST_CONFIG = { ...DEFAULT_CONFIG, ratio: '3:4' as const };

describe('技术 Markdown 解析', () => {
  it('新文章默认使用 macOS 浅色代码块外观', () => {
    expect(DEFAULT_CONFIG.codeBlockAppearance).toBe('macos');
  });

  it('保留表格、围栏代码、LaTex 方括号公式和手动分页', () => {
    const article = parseMarkdown(fixture);
    expect(article.title).toBe('技术内容回归样例');
    expect(article.blocks.some((block) => block.kind === 'table')).toBe(true);
    expect(article.blocks.some((block) => block.kind === 'code')).toBe(true);
    expect(article.blocks.some((block) => block.kind === 'math')).toBe(true);
    expect(article.blocks.some((block) => block.kind === 'pageBreak')).toBe(true);
  });

  it('识别显式手动分页标记', () => {
    const article = parseMarkdown('# 标题\n\n<!-- md2card:break -->\n\n下一页。');
    expect(article.blocks.some((block) => block.kind === 'pageBreak')).toBe(true);
  });

  it('解析紧接后文的粗体，避免中文笔记中显示裸露的 ** 标记', () => {
    const article = parseMarkdown('**答：是。**它们进入同一个 Transformer。');
    expect(article.blocks[0]).toMatchObject({
      kind: 'paragraph',
      children: [
        { kind: 'strong', children: [{ kind: 'text', value: '答：是。' }] },
        { kind: 'text', value: '它们进入同一个 Transformer。' },
      ],
    });
  });

  it('不把 GFM 表格的分隔线当成分页，并遵守显式分页', () => {
    const article = parseMarkdown(fixture);
    const plan = createPagePlan(article, DEFAULT_CONFIG, {});
    expect(plan.pages).toHaveLength(2);
    expect(plan.pages[0].fragments.some((fragment) => fragment.block.kind === 'table')).toBe(true);
    expect(plan.pages[1].fragments.some((fragment) => fragment.block.kind === 'heading')).toBe(true);
  });

  it('将独立 Markdown 图片与其标题图注保留为同一个图片块', () => {
    const article = parseMarkdown('# 图片\n\n![结构图](assets/diagram.png "图 1 · 结构关系")');
    expect(article.blocks[0]).toMatchObject({
      kind: 'image',
      url: 'assets/diagram.png',
      alt: '结构图',
      caption: '图 1 · 结构关系',
    });
  });

  it('将图片或表格后紧随的中文图注、表注并入前一个内容块', () => {
    const article = parseMarkdown([
      '# 图文',
      '',
      '![结构图](assets/diagram.png)',
      '',
      '图 1：结构关系。',
      '',
      '| 名称 | 说明 |',
      '| --- | --- |',
      '| A | B |',
      '',
      '表 1：变量对照。',
    ].join('\n'));
    expect(article.blocks).toHaveLength(2);
    expect(article.blocks[0]).toMatchObject({ kind: 'image', caption: '图 1：结构关系。' });
    expect(article.blocks[1]).toMatchObject({ kind: 'table', caption: '表 1：变量对照。' });
  });

  it('项目自带完整样例可以连续排版图片、公式、表格和代码', () => {
    const article = parseMarkdown(completeExample);
    expect(article.title).toBe('篇页示例');
    expect(article.blocks.filter((block) => block.kind === 'image')).toHaveLength(3);
    expect(article.blocks.some((block) => block.kind === 'math')).toBe(true);
    expect(article.blocks.some((block) => block.kind === 'table')).toBe(true);
    expect(article.blocks.some((block) => block.kind === 'code')).toBe(true);
    expect(article.blocks.some((block) => block.kind === 'pageBreak')).toBe(false);
  });

  it('首次打开的内置演示稿无需图片权限且可展示多页技术内容', () => {
    const article = parseMarkdown(STARTER_MARKDOWN);
    expect(article.title).toContain('篇页');
    expect(article.blocks.some((block) => block.kind === 'image')).toBe(false);
    expect(article.blocks.some((block) => block.kind === 'pageBreak')).toBe(false);
    expect(article.blocks.some((block) => block.kind === 'math')).toBe(true);
    expect(article.blocks.some((block) => block.kind === 'table')).toBe(true);
    expect(article.blocks.some((block) => block.kind === 'code')).toBe(true);
  });

  it('恢复旧版开箱演示稿时移除预置分页，并保留用户编辑过的 Markdown', () => {
    const legacy = STARTER_MARKDOWN.replace(/^## 0[2-5] · /gm, '<!-- md2card:break -->\n\n$&');
    const older = legacy.replace('3:5 长图文 + 蓝灰长文主题 + 独立封面', '3:5 长图文 + 暗色长文主题 + 独立封面');
    expect(migrateStarterMarkdown(legacy)).toBe(STARTER_MARKDOWN);
    expect(migrateStarterMarkdown(older)).toBe(STARTER_MARKDOWN);
    const edited = `${legacy}\n我的补充。\n`;
    expect(migrateStarterMarkdown(edited)).toBe(edited);
  });

  it('将超高表格按行续页，并在续页中重复表头', () => {
    const rows = Array.from({ length: 26 }, (_, index) => `| 行 ${index + 1} | 用于分页的长说明 |`).join('\n');
    const article = parseMarkdown(`# 表格\n\n| 名称 | 说明 |\n| --- | --- |\n${rows}`);
    const table = article.blocks.find((block) => block.kind === 'table');
    if (!table || table.kind !== 'table') throw new Error('测试前提：应解析出表格');
    const plan = createPagePlan(article, DEFAULT_CONFIG, { [table.id]: 2_200 });
    const fragments = plan.pages.flatMap((page) => page.fragments).filter((fragment) => fragment.block.kind === 'table');
    expect(fragments.length).toBeGreaterThan(1);
    expect(fragments.every((fragment) => fragment.block.kind === 'table' && fragment.block.rows[0][0][0].kind === 'text' && fragment.block.rows[0][0][0].value === '名称')).toBe(true);
  });

  it('H2 正文可沿当前页顺延，H3 仍会携带首段避开页尾', () => {
    const article = parseMarkdown('# 标题\n\n前置正文。\n\n## 二级标题\n\n短引言。\n\n### 三级标题\n\n三级标题的首段正文。');
    const [before, h2, lead, h3, body] = article.blocks;
    const plan = createPagePlan(article, PAGE_TEST_CONFIG, {
      [before.id]: 900,
      [h2.id]: 90,
      [lead.id]: 90,
      [h3.id]: 70,
      [body.id]: 200,
    });
    expect(plan.pages[0].fragments.map((fragment) => fragment.sourceId)).toEqual([before.id, h2.id, lead.id]);
    expect(plan.pages[1].fragments.map((fragment) => fragment.sourceId)).toEqual([h3.id, body.id]);
  });

  it('H2 不触发强制标题簇换页，后续代码在空间不足时自然顺延', () => {
    const article = parseMarkdown('# 标题\n\n前置正文。\n\n## 二级标题\n\n短引言。\n\n```text\n第一行\n第二行\n```');
    const [before, h2, lead, code] = article.blocks;
    const plan = createPagePlan(article, PAGE_TEST_CONFIG, {
      [before.id]: 700,
      [h2.id]: 90,
      [lead.id]: 90,
      [code.id]: 350,
    });
    expect(plan.pages[0].fragments.map((fragment) => fragment.sourceId)).toEqual([before.id, h2.id, lead.id]);
    expect(plan.pages[1].fragments.map((fragment) => fragment.sourceId)).toEqual([code.id]);
  });

  it('H2 不启用页尾安全区，内容在页面容量允许时继续排入当前页', () => {
    const article = parseMarkdown('# 标题\n\n前置正文。\n\n## 二级标题\n\n紧随的正文。');
    const [before, h2, body] = article.blocks;
    const plan = createPagePlan(article, PAGE_TEST_CONFIG, {
      [before.id]: 900,
      [h2.id]: 90,
      [body.id]: 100,
    });
    expect(plan.pages).toHaveLength(1);
    expect(plan.pages[0].fragments.map((fragment) => fragment.sourceId)).toEqual([before.id, h2.id, body.id]);
  });

  it('将 H2 段前留白计入分页，并在新页首块移除该留白', () => {
    const article = parseMarkdown('# 标题\n\n前置正文。\n\n## 二级标题\n\n紧随的正文。');
    const [before, h2, body] = article.blocks;
    const config = PAGE_TEST_CONFIG;
    const fits = createPagePlan(article, config, {
      [before.id]: 970,
      [h2.id]: 90,
      [body.id]: 100,
    });
    expect(fits.pages).toHaveLength(1);
    expect(fits.pages[0].fragments[1].beforeSpacing).toBe(config.headingH2BeforeSpacing);
    expect(fits.pages[0].fragments[2].beforeSpacing).toBe(config.blockGap);

    const wraps = createPagePlan(article, config, {
      [before.id]: 1_000,
      [h2.id]: 90,
      [body.id]: 100,
    });
    expect(wraps.pages).toHaveLength(2);
    expect(wraps.pages[1].fragments[0].beforeSpacing).toBeUndefined();
  });

  it('密度只改变块的排版，不放大物理卡片高度', () => {
    const article = parseMarkdown('# 标题\n\n第一段。\n\n第二段。');
    const [first, second] = article.blocks;
    const measurements = { [first.id]: 700, [second.id]: 600 };
    const balanced = createPagePlan(article, PAGE_TEST_CONFIG, measurements);
    const relaxed = createPagePlan(article, { ...PAGE_TEST_CONFIG, density: 'relaxed', ...DENSITY_PRESETS.relaxed }, measurements);
    expect(balanced.pages).toHaveLength(2);
    expect(relaxed.pages).toHaveLength(2);
  });

  it('根据 H3 的可调页尾安全区避免三级标题孤立在底部', () => {
    const article = parseMarkdown('# 标题\n\n前置正文。\n\n### 三级标题\n\n三级标题的首段正文。');
    const [before, h3, body] = article.blocks;
    const plan = createPagePlan(article, PAGE_TEST_CONFIG, {
      [before.id]: 1_105,
      [h3.id]: 70,
      [body.id]: 90,
    });
    expect(plan.pages[0].fragments.map((fragment) => fragment.sourceId)).toEqual([before.id]);
    expect(plan.pages[1].fragments.map((fragment) => fragment.sourceId)).toEqual([h3.id, body.id]);
  });

  it('H2 不做强制聚簇，只有实际内容超出容量时才顺延到下一页', () => {
    const article = parseMarkdown('# 标题\n\n前置正文。\n\n## 二级标题\n\n紧随的正文。');
    const [before, h2, body] = article.blocks;
    const measurements = { [before.id]: 1_000, [h2.id]: 90, [body.id]: 140 };
    const plan = createPagePlan(article, PAGE_TEST_CONFIG, measurements);
    expect(plan.pages).toHaveLength(2);
    expect(plan.pages[0].fragments.map((fragment) => fragment.sourceId)).toEqual([before.id, h2.id]);
    expect(plan.pages[1].fragments.map((fragment) => fragment.sourceId)).toEqual([body.id]);
  });

  const measureProse: MeasureParagraph = ({ children }) => (
    Math.ceil(inlineText(children).length / 20) * PAGE_TEST_CONFIG.bodyFontSize * PAGE_TEST_CONFIG.bodyLineHeight
  );

  it('在二级标题后填入能放下的正文，并保留续页中的行内格式与手动分页', () => {
    const markdown = '这句话包含**连续阅读**与[参考链接](https://example.com)，用于检查续页。'.repeat(12);
    const article = parseMarkdown(`# 标题\n\n前置正文。\n\n## 二级标题\n\n${markdown}\n\n<!-- md2card:break -->\n\n指定新页。`);
    const [before, h2, body, , last] = article.blocks;
    if (body.kind !== 'paragraph') throw new Error('测试前提：第三块应为段落');
    const plan = createPagePlan(article, PAGE_TEST_CONFIG, {
      [before.id]: 780,
      [h2.id]: 70,
      [body.id]: measureProse(body),
    }, undefined, measureProse);

    expect(plan.pages[0].fragments.map((fragment) => fragment.sourceId)).toEqual([before.id, h2.id, body.id]);
    const parts = plan.pages.flatMap((page) => page.fragments)
      .filter((fragment) => fragment.sourceId === body.id)
      .map((fragment) => fragment.block);
    expect(parts.length).toBeGreaterThan(1);
    const inlines = parts.flatMap((part) => part.kind === 'paragraph' ? part.children : []);
    expect(inlineText(inlines)).toBe(inlineText(body.children));
    expect(inlines.filter((inline) => inline.kind === 'strong').length).toBeGreaterThanOrEqual(12);
    const links = inlines.filter((inline) => inline.kind === 'link');
    expect(links.length).toBeGreaterThanOrEqual(12);
    expect(links.every((link) => link.url === 'https://example.com')).toBe(true);
    expect(plan.pages.at(-1)?.fragments.map((fragment) => fragment.sourceId)).toEqual([last.id]);
  });

  it('在页尾放不下两行正文时将二级标题和正文一起移到下一页', () => {
    const article = parseMarkdown(`# 标题\n\n前置正文。\n\n## 二级标题\n\n${'这一段应当跟在标题后方。'.repeat(12)}`);
    const [before, h2, body] = article.blocks;
    if (body.kind !== 'paragraph') throw new Error('测试前提：第三块应为段落');
    const plan = createPagePlan(article, PAGE_TEST_CONFIG, {
      [before.id]: 970,
      [h2.id]: 90,
      [body.id]: measureProse(body),
    }, undefined, measureProse);
    expect(plan.pages.map((page) => page.fragments.map((fragment) => fragment.sourceId))).toEqual([[before.id], [h2.id, body.id]]);
  });

  it('融合首页的封面高度会占用首张卡片容量，且不会重复到后续页面', () => {
    const article = parseMarkdown('# 标题\n\n第一段正文。\n\n第二段正文。');
    const [first, second] = article.blocks;
    const cover = { id: 'cover', mode: 'integrated' as const, title: '标题', subtitle: '副标题' };
    const plan = createPagePlan(article, PAGE_TEST_CONFIG, {
      [cover.id]: 260,
      [first.id]: 600,
      [second.id]: 600,
    }, cover);
    expect(plan.pages).toHaveLength(2);
    expect(plan.pages[0].cover).toEqual(cover);
    expect(plan.pages[1].cover).toBeUndefined();
  });

  it('独立封面会成为无正文的第一页，并使正文页码顺延', () => {
    const article = parseMarkdown('# 标题\n\n正文。');
    const cover = { id: 'cover', mode: 'standalone' as const, title: '标题' };
    const plan = createPagePlan(article, DEFAULT_CONFIG, {}, cover);
    expect(plan.pages[0]).toMatchObject({ index: 0, cover, fragments: [] });
    expect(plan.pages[1].index).toBe(1);
    expect(plan.pages[1].fragments).not.toHaveLength(0);
  });
});

describe('本地图片文件夹绑定', () => {
  it('按 Markdown 相对路径及其目录后缀精确绑定图片', () => {
    const images = [{ id: 'figure', name: 'figure.png', paths: ['article/images/figure.png'] }];
    const index = buildImageResourceIndex(images, { figure: 'blob:figure' });
    expect(resolveImageReference('./images/figure.png', index)).toEqual({ state: 'matched', source: 'blob:figure', imageId: 'figure' });
    expect(resolveImageReference('article/images/figure.png', index)).toEqual({ state: 'matched', source: 'blob:figure', imageId: 'figure' });
  });

  it('遇到重复目录后缀时拒绝猜测，保留冲突状态', () => {
    const images = [
      { id: 'first', name: 'diagram.png', paths: ['first/images/diagram.png'] },
      { id: 'second', name: 'diagram.png', paths: ['second/images/diagram.png'] },
    ];
    const index = buildImageResourceIndex(images, {
      first: 'blob:first',
      second: 'blob:second',
    });
    expect(resolveImageReference('images/diagram.png', index)).toEqual({ state: 'ambiguous', candidateImageIds: ['first', 'second'] });
    expect(resolveImageReference('first/images/diagram.png', index)).toEqual({ state: 'matched', source: 'blob:first', imageId: 'first' });
  });

  it('允许将冲突或缺失引用显式绑定到已导入图片', () => {
    const index = buildImageResourceIndex(
      [{ id: 'selected', name: 'replacement.png', paths: ['assets/replacement.png'] }],
      { selected: 'blob:selected' },
      { 'figures/diagram.png': 'selected' },
    );
    expect(resolveImageReference('figures/diagram.png', index)).toEqual({
      state: 'matched',
      source: 'blob:selected',
      imageId: 'selected',
    });
  });

  it('汇总 Markdown 图片的缺失状态，并保留远程图片', () => {
    const article = parseMarkdown('# 图片\n\n![封面](images/cover.png)\n\n![结构](images/diagram.png)\n\n> ![远程](https://example.com/remote.png)');
    const urls = articleImageUrls(article);
    const index = buildImageResourceIndex(
      [{ id: 'cover', name: 'cover.png', paths: ['post/images/cover.png'] }],
      { cover: 'blob:cover' },
    );
    expect(urls).toEqual(['images/cover.png', 'images/diagram.png', 'https://example.com/remote.png']);
    expect(summarizeImageBindings(urls, index)).toEqual({
      total: 3,
      matched: 2,
      missing: ['images/diagram.png'],
      ambiguous: [],
    });
  });
});
