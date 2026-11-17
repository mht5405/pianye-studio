import type { Block, Inline } from '../domain/document';

export type Paragraph = Extract<Block, { kind: 'paragraph' }>;
export type MeasureParagraph = (paragraph: Paragraph) => number;

const words = new Intl.Segmenter('zh', { granularity: 'word' });
const graphemes = new Intl.Segmenter('zh', { granularity: 'grapheme' });

function inlineSize(node: Inline): number {
  if ('children' in node) return node.children.reduce((size, child) => size + inlineSize(child), 0);
  return node.kind === 'text' || node.kind === 'inlineCode' ? node.value.length : 1;
}

function breakOffsets(nodes: Inline[], segmenter: Intl.Segmenter): number[] {
  const offsets: number[] = [];
  let offset = 0;
  const collect = (node: Inline) => {
    if ('children' in node) {
      node.children.forEach(collect);
      return;
    }
    if (node.kind === 'text' || node.kind === 'inlineCode') {
      for (const { index, segment } of segmenter.segment(node.value)) {
        const end = index + segment.length;
        if (end === node.value.length ||
          (!/[（《「『【“‘(]$/.test(segment) && !/^[，。？！、；：）》」』】”’!?,.;:)]/.test(node.value.slice(end)))) {
          offsets.push(offset + end);
        }
      }
    } else {
      offsets.push(offset + 1);
    }
    offset += inlineSize(node);
  };
  nodes.forEach(collect);
  return offsets.filter((offsetAtBreak) => offsetAtBreak < offset);
}

function splitInlines(nodes: Inline[], offset: number): [Inline[], Inline[]] {
  const head: Inline[] = [];
  const tail: Inline[] = [];
  for (const node of nodes) {
    const size = inlineSize(node);
    if (offset >= size) head.push(node);
    else if (offset <= 0) tail.push(node);
    else if ('children' in node) {
      const [left, right] = splitInlines(node.children, offset);
      head.push({ ...node, children: left });
      tail.push({ ...node, children: right });
    } else if (node.kind === 'text' || node.kind === 'inlineCode') {
      head.push({ ...node, value: node.value.slice(0, offset) });
      tail.push({ ...node, value: node.value.slice(offset) });
    }
    offset -= size;
  }
  return [head, tail];
}

export function splitParagraph(
  paragraph: Paragraph,
  available: number,
  lineHeight: number,
  measure: MeasureParagraph,
  breakLongWords: boolean,
) {
  const minHeadHeight = 2 * lineHeight - 1;
  if (available < minHeadHeight) return undefined;
  const findFit = (segmenter: Intl.Segmenter) => {
    const offsets = breakOffsets(paragraph.children, segmenter);
    let low = 0;
    let high = offsets.length - 1;
    let best: { head: Paragraph; tail: Paragraph; headHeight: number; tailHeight: number } | undefined;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const [left, right] = splitInlines(paragraph.children, offsets[mid]);
      const head = { ...paragraph, children: left };
      const headHeight = measure(head);
      if (headHeight > available) {
        high = mid - 1;
        continue;
      }
      const tail = { ...paragraph, children: right };
      const tailHeight = measure(tail);
      if (tailHeight < lineHeight - 1) {
        high = mid - 1;
        continue;
      }
      best = { head, tail, headHeight, tailHeight };
      low = mid + 1;
    }
    return best && best.headHeight >= minHeadHeight ? best : undefined;
  };
  return findFit(words) ?? (breakLongWords ? findFit(graphemes) : undefined);
}
