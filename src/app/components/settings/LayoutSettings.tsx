import type { LayoutConfig } from "../../../domain/document";
import type { ComponentChildren } from "preact";

type Density = Exclude<LayoutConfig["density"], "custom">;
type ReadingSetting = "bodyFontSize" | "bodyLineHeight" | "blockGap" | "headingH2BeforeSpacing" | "headingH3BeforeSpacing";

const Range = ({ label, value, children }: { label: string; value: string; children: ComponentChildren }) => <label class="range-label">{label} <output>{value}</output>{children}</label>;

export function LayoutSettings({ config, onReadingConfigChange, onApplyDensity }: { config: LayoutConfig; onReadingConfigChange: (key: ReadingSetting, value: number) => void; onApplyDensity: (density: Density) => void }) {
  return <>
    <section class="settings-category-content"><h3>排版</h3><h4>整体密度</h4><div class="density-choices density-preset-choices">{(["relaxed", "balanced", "compact"] as const).map((density) => <button key={density} class={config.density === density ? "selected" : ""} onClick={() => onApplyDensity(density)}>{{ relaxed: "舒展", balanced: "技术平衡", compact: "紧凑" }[density]}</button>)}</div><p class="field-help">预设会同步调整正文字号、行距、标题留白与代码字号；表格、公式和图片保持单独控制。</p>{config.density === "custom" && <div class="density-custom-state"><span>已按下方参数微调整体密度。</span><button type="button" class="secondary-button" onClick={() => onApplyDensity("balanced")}>恢复技术平衡</button></div>}<h4>正文</h4><div class="setting-control-grid"><Range label="正文字号" value={`${config.bodyFontSize}px`}><input type="range" min="26" max="48" value={config.bodyFontSize} onInput={(e) => onReadingConfigChange("bodyFontSize", Number(e.currentTarget.value))} /></Range><Range label="正文行距" value={config.bodyLineHeight.toFixed(2)}><input type="range" min="1.45" max="1.78" step="0.01" value={config.bodyLineHeight} onInput={(e) => onReadingConfigChange("bodyLineHeight", Number(e.currentTarget.value))} /></Range><Range label="块间距" value={`${config.blockGap}px`}><input type="range" min="0" max="40" step="1" value={config.blockGap} onInput={(e) => onReadingConfigChange("blockGap", Number(e.currentTarget.value))} /></Range></div></section>
    <section class="settings-category-content">
      <h3>标题</h3>
      <div class="setting-control-grid">
        <Range label="H2 章节前留白" value={`${config.headingH2BeforeSpacing}px`}>
          <input type="range" min="0" max="72" step="2" value={config.headingH2BeforeSpacing} onInput={(event) => onReadingConfigChange("headingH2BeforeSpacing", Number(event.currentTarget.value))} />
        </Range>
        <Range label="H3 小节前留白" value={`${config.headingH3BeforeSpacing}px`}>
          <input type="range" min="0" max="40" step="2" value={config.headingH3BeforeSpacing} onInput={(event) => onReadingConfigChange("headingH3BeforeSpacing", Number(event.currentTarget.value))} />
        </Range>
      </div>
    </section>
  </>;
}
