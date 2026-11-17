import { CARD_THEME_IDS, type CardTheme, type LayoutConfig } from "../../../domain/document";

const THEME_LABELS: Record<CardTheme, { name: string; hint: string }> = {
  minimal: { name: "纯净排版", hint: "白底 · 正式" },
  "classic-dark": { name: "暗色长文", hint: "近黑横纹 · 金色标题" },
  elsewhere: { name: "蓝灰长文", hint: "蓝灰底 · 暖灰字" },
  "warm-gray": { name: "暖灰长文", hint: "暖灰底 · 柔金标题" },
};

type UpdateConfig = <Key extends keyof LayoutConfig>(
  key: Key,
  value: LayoutConfig[Key],
) => void;

export function ThemeSettings({
  config,
  onConfigChange,
}: {
  config: LayoutConfig;
  onConfigChange: UpdateConfig;
}) {
  return (
    <section class="settings-category-content">
      <h3>主题</h3>
      <p class="field-help">
        主题决定卡片的配色、标题、表格与图注样式，适用于预览和导出。
      </p>
      <div class="card-theme-grid">
        {CARD_THEME_IDS.map((id) => (
          <button
            key={id}
            type="button"
            class={`card-theme-option theme-${id}${config.cardTheme === id ? " selected" : ""}`}
            aria-pressed={config.cardTheme === id}
            onClick={() => onConfigChange("cardTheme", id)}
          >
            <span class="card-theme-swatch" />
            <strong>{THEME_LABELS[id].name}</strong>
            <small>{THEME_LABELS[id].hint}</small>
          </button>
        ))}
      </div>
      <h4>代码外观</h4>
      <div class="segmented code-block-appearance-control">
        <button
          type="button"
          class={config.codeBlockAppearance === "macos" ? "selected" : ""}
          aria-pressed={config.codeBlockAppearance === "macos"}
          onClick={() => onConfigChange("codeBlockAppearance", "macos")}
        >
          macOS 浅色
          <br />
          <small>默认 · 窗口栏与白色代码区</small>
        </button>
        <button
          type="button"
          class={config.codeBlockAppearance === "theme" ? "selected" : ""}
          aria-pressed={config.codeBlockAppearance === "theme"}
          onClick={() => onConfigChange("codeBlockAppearance", "theme")}
        >
          跟随主题
          <br />
          <small>使用卡片主题的技术面</small>
        </button>
      </div>
    </section>
  );
}
