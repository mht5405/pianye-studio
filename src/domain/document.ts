export type Inline =
  | { kind: 'text'; value: string }
  | { kind: 'strong'; children: Inline[] }
  | { kind: 'emphasis'; children: Inline[] }
  | { kind: 'delete'; children: Inline[] }
  | { kind: 'link'; url: string; children: Inline[] }
  | { kind: 'inlineCode'; value: string }
  | { kind: 'inlineMath'; value: string }
  | { kind: 'break' };

export type Block =
  | { id: string; kind: 'heading'; depth: number; children: Inline[] }
  | { id: string; kind: 'paragraph'; children: Inline[] }
  | { id: string; kind: 'list'; ordered: boolean; start: number; items: Block[][] }
  | { id: string; kind: 'blockquote'; children: Block[] }
  | { id: string; kind: 'code'; value: string; language: string }
  | { id: string; kind: 'math'; value: string }
  | { id: string; kind: 'image'; url: string; alt: string; caption?: string }
  | { id: string; kind: 'table'; align: Array<'left' | 'center' | 'right' | null>; rows: Inline[][][]; caption?: string }
  | { id: string; kind: 'thematicBreak' }
  | { id: string; kind: 'pageBreak' };

export interface Diagnostic {
  level: 'info' | 'warning' | 'error';
  message: string;
  blockId?: string;
}

export interface ArticleDocument {
  title: string;
  blocks: Block[];
  diagnostics: Diagnostic[];
  metadata?: ArticleMetadata;
}

export interface ArticleMetadata {
  title?: string;
  coverSource?: string;
  coverSourceUrl?: string;
  coverLicense?: string;
  references: string[];
}


export type Density = 'relaxed' | 'balanced' | 'compact' | 'custom';
export type CanvasRatio = '3:4' | '2:3' | '3:5';
export type CardTheme = 'minimal' | 'elsewhere';
export type CodeBlockAppearance = 'theme' | 'macos';
export type CoverMode = 'none' | 'integrated' | 'standalone';

export interface PageCover {
  id: string;
  mode: Exclude<CoverMode, 'none'>;
  title: string;
  kicker?: string;
  subtitle?: string;
  imageDataUrl?: string;
  imagePositionY?: number;
  authorName?: string;
  authorAvatarDataUrl?: string;
  showAuthor?: boolean;
}

export interface LayoutConfig {
  ratio: CanvasRatio;
  density: Density;
  bodyFontSize: number;
  bodyLineHeight: number;
  blockGap: number;
  headingH2BeforeSpacing: number;
  headingH3BeforeSpacing: number;
  codeFontSize: number;
  tableFontSize: number;
  mathScale: number;
  headingH3TailPercent: number;
  headingH4TailPercent: number;
  codeLineNumbers: boolean;
  codeBlockAppearance: CodeBlockAppearance;
  cardHorizontalPadding: number;
  cardVerticalPadding: number;
  imageMaxHeightPercent: number;
  showPageNumber: boolean;
  cardTheme: CardTheme;
  coverMode: CoverMode;
  coverKicker: string;
  coverSubtitle: string;
  coverImageDataUrl: string;
  coverImagePositionY: number;
  coverSource: string;
  coverSourceUrl: string;
  authorName: string;
  authorAvatarDataUrl: string;
  showAuthorOnCover: boolean;
  showAuthorOnContent: boolean;
  exportScale: 1 | 2;
}

export const DEFAULT_CONFIG: LayoutConfig = {
  ratio: '3:5',
  density: 'balanced',
  bodyFontSize: 40,
  bodyLineHeight: 1.66,
  blockGap: 27,
  headingH2BeforeSpacing: 40,
  headingH3BeforeSpacing: 26,
  codeFontSize: 30,
  tableFontSize: 30,
  mathScale: 1,
  headingH3TailPercent: 11,
  headingH4TailPercent: 6,
  codeLineNumbers: false,
  codeBlockAppearance: 'macos',
  cardHorizontalPadding: 76,
  cardVerticalPadding: 67,
  imageMaxHeightPercent: 53,
  showPageNumber: true,
  cardTheme: 'elsewhere',
  coverMode: 'standalone',
  coverKicker: '',
  coverSubtitle: '',
  coverImageDataUrl: '',
  coverImagePositionY: 50,
  coverSource: '',
  coverSourceUrl: '',
  authorName: '',
  authorAvatarDataUrl: '',
  showAuthorOnCover: false,
  showAuthorOnContent: false,
  exportScale: 1,
};

export const DENSITY_PRESETS: Record<Exclude<Density, 'custom'>, Pick<LayoutConfig,
  'bodyFontSize' | 'bodyLineHeight' | 'blockGap' | 'headingH2BeforeSpacing' | 'headingH3BeforeSpacing' | 'codeFontSize'
>> = {
  relaxed: {
    bodyFontSize: 44,
    bodyLineHeight: 1.72,
    blockGap: 34,
    headingH2BeforeSpacing: 48,
    headingH3BeforeSpacing: 30,
    codeFontSize: 33,
  },
  balanced: {
    bodyFontSize: 40,
    bodyLineHeight: 1.66,
    blockGap: 27,
    headingH2BeforeSpacing: 40,
    headingH3BeforeSpacing: 26,
    codeFontSize: 30,
  },
  compact: {
    bodyFontSize: 36,
    bodyLineHeight: 1.56,
    blockGap: 18,
    headingH2BeforeSpacing: 30,
    headingH3BeforeSpacing: 18,
    codeFontSize: 28,
  },
};

export interface PageFragment {
  id: string;
  sourceId: string;
  block: Block;
  beforeSpacing?: number;
  continuation?: { index: number; total: number; label: string };
}

export interface PagePlanPage {
  id: string;
  index: number;
  section: string;
  cover?: PageCover;
  fragments: PageFragment[];
  estimatedHeight: number;
}

export interface PagePlan {
  pages: PagePlanPage[];
  diagnostics: Diagnostic[];
}
