import type { LayoutConfig } from "../../../domain/document";
import { useState } from "preact/hooks";

type UpdateConfig = <Key extends keyof LayoutConfig>(key: Key, value: LayoutConfig[Key]) => void;

async function imageToDataUrl(file: File, maxSide: number, square = false): Promise<string> {
  const image = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    image.close();
    throw new Error("无法处理这张图片");
  }
  if (square) {
    const side = Math.min(image.width, image.height);
    const x = (image.width - side) / 2;
    const y = (image.height - side) / 2;
    canvas.width = maxSide;
    canvas.height = maxSide;
    context.drawImage(image, x, y, side, side, 0, 0, maxSide, maxSide);
  } else {
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  }
  image.close();
  return canvas.toDataURL("image/jpeg", 0.88);
}

export function CanvasSettings({ config, articleName, onConfigChange, onEditArticle }: { config: LayoutConfig; articleName: string; onConfigChange: UpdateConfig; onEditArticle: () => void }) {
  const [coverImageError, setCoverImageError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const setCoverImage = async (file?: File) => {
    if (!file) return;
    setCoverImageError("");
    try {
      const dataUrl = await imageToDataUrl(file, 2560);
      onConfigChange("coverImageDataUrl", dataUrl);
      onConfigChange("coverImagePositionY", 50);
      onConfigChange("coverMode", "standalone");
    } catch {
      setCoverImageError("读取图片失败，请选择 JPG、PNG 或 WebP 图片。");
    }
  };
  const setAuthorAvatar = async (file?: File) => {
    if (!file) return;
    setAvatarError("");
    try {
      onConfigChange("authorAvatarDataUrl", await imageToDataUrl(file, 192, true));
    } catch {
      setAvatarError("读取头像失败，请选择 JPG、PNG 或 WebP 图片。");
    }
  };
  const hasAuthor = Boolean(config.authorName.trim() || config.authorAvatarDataUrl);

  return <section class="settings-category-content">
    <h3>画布</h3>
    <h4>画布比例</h4>
    <div class="segmented">
      <button type="button" class={config.ratio === "3:4" ? "selected" : ""} onClick={() => onConfigChange("ratio", "3:4")}>3:4<br /><small>标准卡片</small></button>
      <button type="button" class={config.ratio === "2:3" ? "selected" : ""} onClick={() => onConfigChange("ratio", "2:3")}>2:3<br /><small>长内容</small></button>
      <button type="button" class={config.ratio === "3:5" ? "selected" : ""} onClick={() => onConfigChange("ratio", "3:5")}>3:5<br /><small>长图文</small></button>
    </div>

    <h4>首卡封面</h4>
    <p class="field-help">融合首页只在第一张卡片展示文章名；独立封面会单独占一张卡片。</p>
    <div class="segmented cover-mode-control">
      <button type="button" class={config.coverMode === "integrated" ? "selected" : ""} onClick={() => onConfigChange("coverMode", "integrated")}>融合首页<br /><small>推荐</small></button>
      <button type="button" class={config.coverMode === "standalone" ? "selected" : ""} onClick={() => onConfigChange("coverMode", "standalone")}>独立封面</button>
      <button type="button" class={config.coverMode === "none" ? "selected" : ""} onClick={() => onConfigChange("coverMode", "none")}>无封面</button>
    </div>

    {config.coverMode !== "none" && <>
      <p class="cover-title-source">封面标题：<strong title={articleName}>{articleName}</strong><button type="button" onClick={onEditArticle}>到编辑区修改</button></p>
      <div class="cover-copy-fields">
        <label class="text-field">封面标签（可选）<input value={config.coverKicker} placeholder="例如：学习笔记" onInput={(event) => onConfigChange("coverKicker", event.currentTarget.value)} /></label>
        <label class="text-field">副标题（可选）<input value={config.coverSubtitle} placeholder="一句话说明文章内容" onInput={(event) => onConfigChange("coverSubtitle", event.currentTarget.value)} /></label>
      </div>
      <label class="text-field cover-image-picker">替换封面图片<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void setCoverImage(event.currentTarget.files?.[0])} /><small>保留原图比例并压缩保存；调整下方滑杆可改变封面取景高度。</small></label>
      {config.coverImageDataUrl && <>
        <div class="cover-copy-fields">
          <label class="text-field">封面图片来源<input value={config.coverSource} placeholder="例如：作者/机构名称、作品名称或图库名称" onInput={(event) => onConfigChange("coverSource", event.currentTarget.value)} /><small>填写后会自动附加到图文末尾的“来源与说明”；也可在 Markdown 的 cover_source 中填写。</small></label>
          <label class="text-field">来源链接（可选）<input type="url" value={config.coverSourceUrl} placeholder="https://…" onInput={(event) => onConfigChange("coverSourceUrl", event.currentTarget.value)} /></label>
        </div>
        <label class="range-label cover-position-control">封面图片上下位置 <output>{config.coverImagePositionY}%</output><input type="range" min="0" max="100" step="1" value={config.coverImagePositionY} onInput={(event) => onConfigChange("coverImagePositionY", Number(event.currentTarget.value))} /><small><span>上</span><span>下</span></small></label>
        <button type="button" class="clear-cover-image" onClick={() => { onConfigChange("coverImageDataUrl", ""); onConfigChange("coverImagePositionY", 50); }}>移除封面图片</button>
      </>}
      {coverImageError && <p class="field-error">{coverImageError}</p>}
    </>}

    <h4>作者署名</h4>
    <p class="field-help">封面署名位于标题下方；正文署名固定在卡片底部，页码仍保留在右下角。</p>
    <div class="cover-copy-fields author-fields">
      <label class="text-field">昵称<input value={config.authorName} placeholder="例如：小林" onInput={(event) => onConfigChange("authorName", event.currentTarget.value)} /></label>
      <label class="text-field author-avatar-picker">头像<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void setAuthorAvatar(event.currentTarget.files?.[0])} /></label>
    </div>
    {config.authorAvatarDataUrl && <div class="author-avatar-preview"><img src={config.authorAvatarDataUrl} alt="当前作者头像" /><button type="button" class="clear-cover-image" onClick={() => onConfigChange("authorAvatarDataUrl", "")}>移除头像</button></div>}
    {avatarError && <p class="field-error">{avatarError}</p>}
    <div class="author-display-options">
      <label class="check-label"><input type="checkbox" checked={config.showAuthorOnCover} disabled={!hasAuthor} onChange={(event) => onConfigChange("showAuthorOnCover", event.currentTarget.checked)} /> 封面标题下显示署名</label>
      <label class="check-label"><input type="checkbox" checked={config.showAuthorOnContent} disabled={!hasAuthor} onChange={(event) => onConfigChange("showAuthorOnContent", event.currentTarget.checked)} /> 正文卡片底部显示署名</label>
    </div>

    <h4>画布留白</h4>
    <div class="setting-control-grid">
      <label class="range-label">左右安全边距 <output>{config.cardHorizontalPadding}px</output><input type="range" min="60" max="92" step="2" value={config.cardHorizontalPadding} onInput={(event) => onConfigChange("cardHorizontalPadding", Number(event.currentTarget.value))} /></label>
      <label class="range-label">上下安全留白 <output>{config.cardVerticalPadding}px</output><input type="range" min="50" max="88" step="2" value={config.cardVerticalPadding} onInput={(event) => onConfigChange("cardVerticalPadding", Number(event.currentTarget.value))} /></label>
    </div>
    <h4>页码</h4>
    <label class="check-label"><input type="checkbox" checked={config.showPageNumber} onChange={(event) => onConfigChange("showPageNumber", event.currentTarget.checked)} /> 显示右下角页码</label>
  </section>;
}
