export type WorkspaceUiTheme = "system" | "light" | "dark";

export type WorkspaceExportState = {
  status: "idle" | "running" | "done" | "error";
  message: string;
};

function UpstreamInfoLink() {
  return (
    <a
      class="upstream-info-link"
      href="../UPSTREAM.md"
      aria-label="查看上游项目与许可证信息"
      title="上游项目与许可证信息"
    >
      上游与许可
    </a>
  );
}

export function WorkspaceHeader({
  uiTheme,
  exportState,
  onUiThemeChange,
  onOpenExport,
}: {
  uiTheme: WorkspaceUiTheme;
  exportState: WorkspaceExportState;
  onUiThemeChange: (theme: WorkspaceUiTheme) => void;
  onOpenExport: () => void;
}) {
  return (
    <header class="topbar">
      <div class="topbar-branding">
        <a class="brand" href="../" aria-label="返回篇页首页">
          <span class="brand-mark">篇</span>
          <span>篇页</span>
          <small>Markdown 图文工作室</small>
        </a>
        <nav class="workspace-site-nav" aria-label="站点导航">
          <a class="workspace-home-link" href="../">首页</a>
        </nav>
      </div>
      <div class="topbar-actions">
        <div class="theme-segmented" role="group" aria-label="网页外观">
          <button
            type="button"
            class={uiTheme === "system" ? "selected" : ""}
            aria-pressed={uiTheme === "system"}
            onClick={() => onUiThemeChange("system")}
          >
            <span class="theme-full">跟随系统</span>
            <span class="theme-short">系统</span>
          </button>
          <button
            type="button"
            class={uiTheme === "light" ? "selected" : ""}
            aria-pressed={uiTheme === "light"}
            onClick={() => onUiThemeChange("light")}
          >
            浅色
          </button>
          <button
            type="button"
            class={uiTheme === "dark" ? "selected" : ""}
            aria-pressed={uiTheme === "dark"}
            onClick={() => onUiThemeChange("dark")}
          >
            暗色
          </button>
        </div>
        <UpstreamInfoLink />
        <span class="privacy-note">全部在本地浏览器中完成</span>
        <button
          class="top-export-button"
          disabled={exportState.status === "running"}
          onClick={onOpenExport}
        >
          {exportState.status === "running"
            ? exportState.message
            : "下载图片…"}
        </button>
      </div>
    </header>
  );
}
