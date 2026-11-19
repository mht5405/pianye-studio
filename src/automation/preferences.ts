import { CARD_THEME_IDS, DEFAULT_CONFIG, DENSITY_PRESETS, type LayoutConfig } from '../domain/document';
import { downloadFile } from '../resources/download';

const retiredHeadingOptions = new Set(['headingH3TailPercent', 'headingH4TailPercent']);

function reusableLayout({
  coverImageDataUrl: _image,
  coverSource: _source,
  coverSourceUrl: _sourceUrl,
  coverSubtitle: _subtitle,
  ...layout
}: LayoutConfig) {
  for (const key of retiredHeadingOptions) Reflect.deleteProperty(layout, key);
  return layout;
}

const defaults = reusableLayout(DEFAULT_CONFIG);
const choices: Record<string, readonly unknown[]> = {
  cardTheme: CARD_THEME_IDS,
  ratio: ['3:4', '2:3', '3:5'],
  density: ['relaxed', 'balanced', 'compact', 'custom'],
  coverMode: ['none', 'integrated', 'standalone'],
  codeBlockAppearance: ['theme', 'macos'],
  exportScale: [1, 2],
};
const ranges: Record<string, readonly [number, number]> = {
  bodyFontSize: [26, 48],
  bodyLineHeight: [1.45, 1.78],
  blockGap: [0, 40],
  headingH2BeforeSpacing: [0, 72],
  headingH3BeforeSpacing: [0, 40],
  codeFontSize: [20, 36],
  tableFontSize: [20, 36],
  mathScale: [0.72, 1],
  cardHorizontalPadding: [60, 92],
  cardVerticalPadding: [50, 88],
  imageMaxHeightPercent: [35, 68],
  coverImagePositionY: [0, 100],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function configFromPreferences(input: unknown): LayoutConfig {
  if (!isRecord(input) || input.version !== 1 || !isRecord(input.layout)) {
    throw new Error('偏好文件需要 version: 1 和 layout 对象。');
  }

  // Version 1 preference files may still contain the former page-tail settings.
  const entries = Object.entries(input.layout).filter(([key]) => !retiredHeadingOptions.has(key));
  for (const [key, value] of entries) {
    if (!Object.hasOwn(defaults, key)) throw new Error(`未知的排版偏好 ${key}。`);
    const defaultValue = defaults[key as keyof typeof defaults];
    const allowed = choices[key];
    const range = ranges[key];
    const matchesType = typeof value === 'number' && typeof defaultValue === 'number'
      ? Number.isFinite(value)
      : typeof value === typeof defaultValue;
    if (!matchesType || (allowed && !allowed.includes(value))
      || (range && (typeof value !== 'number' || value < range[0] || value > range[1]))) {
      throw new Error(`排版偏好 ${key} 的值无效。`);
    }
    if (key === 'authorAvatarDataUrl' && value && !/^data:image\/(?:jpeg|png|webp|gif|avif);base64,/i.test(String(value))) {
      throw new Error('作者头像需要浏览器导出的图片数据。');
    }
  }

  const layout = Object.fromEntries(entries) as Partial<typeof defaults>;
  const density = layout.density;
  return {
    ...DEFAULT_CONFIG,
    ...(density && density !== 'custom' ? DENSITY_PRESETS[density] : {}),
    ...layout,
  };
}

export function downloadPreferences(config: LayoutConfig): void {
  const json = JSON.stringify({ version: 1, layout: reusableLayout(config) }, null, 2);
  downloadFile(new Blob([`${json}\n`], { type: 'application/json' }), 'pianye-preferences.json');
}
