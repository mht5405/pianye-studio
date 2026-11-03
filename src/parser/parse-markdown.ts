import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { ArticleDocument, ArticleMetadata, Block, Diagnostic, Inline } from '../domain/document';

type MdNode = {
  type: string;
  value?: string;
  children?: MdNode[];
  depth?: number;
  ordered?: boolean;
  start?: number | null;
  lang?: string | null;
  url?: string;
  alt?: string | null;
  title?: string | null;
  align?: Array<'left' | 'center' | 'right' | null>;
};

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath);

// remark follows CommonMark's delimiter rules: `**重点**后文` is treated as
// literal text when the closing marker is immediately followed by a letter or
// number. This is especially easy to write in Chinese notes. Insert a parsing
// sentinel only for that pattern, then remove it again when creating inlines.
const ADJACENT_STRONG_DELIMITER = /(\*\*(?:[^*\n]|\*(?!\*))*\*\*)(?=[\p{L}\p{N}_])/gu;

function normalizeAdjacentStrongDelimiters(text: string): string {
  return text.replace(ADJACENT_STRONG_DELIMITER, '$1&#8203;');
}

/**
 * remark-math understands $...$ / $$...$$. The two sample notes also use
 * \[...\] and \(...\), so normalize only outside fenced and inline code.
 */
function normalizeMathDelimiters(markdown: string): string {
  let inFence = false;
  return markdown
    .split(/\r?\n/)
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      if (/^\s*\\\[\s*$/.test(line)) return '$$';
      if (/^\s*\\\]\s*$/.test(line)) return '$$';

      // Inline code is intentionally left untouched.
      return line
        .split(/(`[^`]*`)/g)
        .map((part) => {
          if (part.startsWith('`')) return part;
          return normalizeAdjacentStrongDelimiters(part.replace(/\\\((.+?)\\\)/g, '$$$1$'));
        })
        .join('');
    })
    .join('\n');
}

function nodeId(index: number, suffix = ''): string {
  return `block-${index}${suffix}`;
}

const CAPTION_PARAGRAPH = /^(?:图|表)\s*[0-9０-９一二三四五六七八九十]+\s*(?:[.:：、·-]\s*|\s+).+$/;

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'")))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function safeWebUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function splitFrontMatter(markdown: string): { body: string; title: string; metadata: ArticleMetadata } {
  const metadata: ArticleMetadata = { references: [] };
  const match = markdown.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) return { body: markdown, title: '', metadata };
  let listKey = '';
  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^\s+-\s+(.+)$/);
    if (item && listKey === 'references') {
      metadata.references.push(unquote(item[1]));
      continue;
    }
    const field = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!field) continue;
    const [, key, rawValue] = field;
    const value = unquote(rawValue);
    listKey = key === 'references' && !value ? key : '';
    if (key === 'title') metadata.title = value;
    if (key === 'cover_source') metadata.coverSource = value;
    if (key === 'cover_source_url') metadata.coverSourceUrl = value;
    if (key === 'cover_license') metadata.coverLicense = value;
    if (key === 'references' && value) metadata.references.push(value);
  }
  return { body: markdown.slice(match[0].length), title: metadata.title ?? '', metadata };
}

function toInline(nodes: MdNode[] | undefined): Inline[] {
  if (!nodes) return [];
  return nodes.flatMap((node): Inline[] => {
    switch (node.type) {
      case 'text':
        return [{ kind: 'text', value: (node.value ?? '').replace(/\u200b/g, '') }];
      case 'strong':
        return [{ kind: 'strong', children: toInline(node.children) }];
      case 'emphasis':
        return [{ kind: 'emphasis', children: toInline(node.children) }];
      case 'delete':
        return [{ kind: 'delete', children: toInline(node.children) }];
      case 'link':
        return [{ kind: 'link', url: node.url ?? '#', children: toInline(node.children) }];
      case 'inlineCode':
        return [{ kind: 'inlineCode', value: node.value ?? '' }];
      case 'inlineMath':
        return [{ kind: 'inlineMath', value: node.value ?? '' }];
      case 'break':
        return [{ kind: 'break' }];
      case 'image':
        return [{ kind: 'text', value: `[图片：${node.value ?? '请通过资源面板导入'}]` }];
      default:
        return toInline(node.children);
    }
  });
}

function toBlock(node: MdNode, index: number, diagnostics: Diagnostic[], suffix = ''): Block | null {
  const id = nodeId(index, suffix);
  switch (node.type) {
    case 'heading':
      return { id, kind: 'heading', depth: node.depth ?? 2, children: toInline(node.children) };
    case 'paragraph': {
      const onlyChild = node.children?.length === 1 ? node.children[0] : undefined;
      if (onlyChild?.type === 'image') {
        return {
          id,
          kind: 'image',
          url: onlyChild.url ?? '',
          alt: onlyChild.alt ?? '',
          caption: onlyChild.title ?? undefined,
        };
      }
      return { id, kind: 'paragraph', children: toInline(node.children) };
    }
    case 'code':
      return { id, kind: 'code', value: node.value ?? '', language: node.lang ?? 'text' };
    case 'math':
      return { id, kind: 'math', value: node.value ?? '' };
    case 'thematicBreak':
      return { id, kind: 'thematicBreak' };
    case 'html':
      if ((node.value ?? '').trim() === '<!-- md2card:break -->') return { id, kind: 'pageBreak' };
      diagnostics.push({ level: 'warning', message: '已忽略原始 HTML，以保证预览和导出安全一致。', blockId: id });
      return null;
    case 'blockquote': {
      const children = (node.children ?? [])
        .map((child, childIndex) => toBlock(child, index, diagnostics, `-quote-${childIndex}`))
        .filter((child): child is Block => child !== null);
      return { id, kind: 'blockquote', children };
    }
    case 'list': {
      const items = (node.children ?? []).map((item, itemIndex) =>
        (item.children ?? [])
          .map((child, childIndex) => toBlock(child, index, diagnostics, `-item-${itemIndex}-${childIndex}`))
          .filter((child): child is Block => child !== null),
      );
      return { id, kind: 'list', ordered: Boolean(node.ordered), start: node.start ?? 1, items };
    }
    case 'table': {
      const rows = (node.children ?? []).map((row) =>
        (row.children ?? []).map((cell) => toInline(cell.children)),
      );
      return { id, kind: 'table', align: node.align ?? [], rows };
    }
    case 'image':
      diagnostics.push({ level: 'info', message: '本地图片会优先按导入文件夹中的相对路径绑定；远程图片需要允许浏览器读取。', blockId: id });
      return {
        id,
        kind: 'image',
        url: node.url ?? '',
        alt: node.alt ?? '',
        caption: node.title ?? undefined,
      };
    default:
      if (node.children?.length) {
        diagnostics.push({ level: 'info', message: `已按内容降级渲染 ${node.type}。`, blockId: id });
        return { id, kind: 'paragraph', children: toInline(node.children) };
      }
      return null;
  }
}

export function inlineText(nodes: Inline[]): string {
  return nodes
    .map((node) => {
      if ('value' in node) return node.value;
      if ('children' in node) return inlineText(node.children);
      return '';
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A direct `图 1：...` / `表 1：...` paragraph is common in Chinese notes.
 * Treat it as a caption only when it immediately follows the matching block,
 * so existing drafts gain semantic captions without requiring a rewrite.
 */
function attachAdjacentCaptions(blocks: Block[]): Block[] {
  const result: Block[] = [];
  for (const block of blocks) {
    const previous = result.at(-1);
    const text = block.kind === 'paragraph' ? inlineText(block.children) : '';
    if (CAPTION_PARAGRAPH.test(text) && previous?.kind === 'image' && !previous.caption && text.startsWith('图')) {
      previous.caption = text;
      continue;
    }
    if (CAPTION_PARAGRAPH.test(text) && previous?.kind === 'table' && !previous.caption && text.startsWith('表')) {
      previous.caption = text;
      continue;
    }
    result.push(block);
  }
  return result;
}

export function parseMarkdown(markdown: string, metadataOverrides: Pick<ArticleMetadata, 'coverSource' | 'coverSourceUrl'> = {}): ArticleDocument {
  const diagnostics: Diagnostic[] = [];
  try {
    const frontMatter = splitFrontMatter(markdown);
    const metadata: ArticleMetadata = {
      ...frontMatter.metadata,
      coverSource: metadataOverrides.coverSource?.trim() || frontMatter.metadata.coverSource,
      coverSourceUrl: metadataOverrides.coverSourceUrl?.trim() || frontMatter.metadata.coverSourceUrl,
    };
    const tree = processor.parse(normalizeMathDelimiters(frontMatter.body)) as unknown as MdNode;
    const parsed = (tree.children ?? [])
      .map((node, index) => toBlock(node, index, diagnostics))
      .filter((node): node is Block => node !== null);

    let title = frontMatter.title;
    const first = parsed[0];
    const blocks = attachAdjacentCaptions(parsed);
    if (first?.kind === 'heading' && first.depth === 1) {
      title ||= inlineText(first.children);
      blocks.shift();
    }
    const sourceEntries: Array<{ label: string; text: string; url?: string; detail?: string }> = [
      ...(metadata.coverSource ? [{ label: '封面图片来源', text: metadata.coverSource, url: metadata.coverSourceUrl, detail: metadata.coverLicense }] : []),
      ...metadata.references.map((text, index) => ({ label: `资料来源 ${index + 1}`, text })),
    ];
    if (sourceEntries.length) {
      sourceEntries.forEach((entry, index) => {
        const children: Inline[] = [
          { kind: 'strong', children: [{ kind: 'text', value: `${entry.label}：` }] },
          { kind: 'text', value: entry.text },
        ];
        if (entry.detail) children.push({ kind: 'text', value: `（${entry.detail}）` });
        const sourceUrl = safeWebUrl(entry.url);
        if (sourceUrl) children.push({ kind: 'text', value: ' ' }, { kind: 'link', url: sourceUrl, children: [{ kind: 'text', value: '查看来源' }] });
        blocks.push({ id: `generated-source-${index + 1}`, kind: 'paragraph', children });
      });
    }
    return { title, blocks, diagnostics, metadata };
  } catch (error) {
    return {
      title: '',
      blocks: [],
      diagnostics: [{ level: 'error', message: error instanceof Error ? error.message : 'Markdown 解析失败。' }],
    };
  }
}
