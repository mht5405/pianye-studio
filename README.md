# 篇页 · Markdown 图文工作室

> 把写好的 Markdown，编排成适合小红书与微信分享的连续图卡。

[在线工作台](https://mht5405.github.io/pianye-studio/) · [GitHub 项目仓库](https://github.com/mht5405/pianye-studio) · [来源与许可说明](./UPSTREAM.md)

![篇页新版主页](./docs/homepage-preview.png)

篇页是一款浏览器端图文排版工具。导入 Markdown 后，可以调整画布、封面、主题和内容布局，检查分页效果，再把卡片导出为 PNG ZIP。默认采用 3:5 长图文画布、暗色长文主题和独立封面；封面图片可替换并调整上下取景，也可在封面或正文页加入头像与昵称。

## 功能

- **Markdown 排版**：支持标题、段落、列表、引用、GFM 表格、代码块、KaTeX 公式和图片；自动分页，并尽量保持标题与后续内容相邻。
- **封面与署名**：可替换封面图、调整取景位置、填写图片来源；可为封面与正文添加头像和昵称。
- **两种卡片主题**：纯净排版、暗色长文；支持 3:4、2:3、3:5 画布与多档阅读密度。
- **图片与导出**：按 Markdown 相对路径绑定本地图片；预览并检查分页后，逐页生成 PNG、打包 ZIP。
- **来源说明**：通过 Markdown front matter 提供封面来源与参考资料，文章末尾自动生成来源页；工具不会替作者猜测或编造出处。
- **本地处理**：文章、本地图片和导出文件在当前浏览器处理；项目站点只托管静态应用。远程图片仍由浏览器向图片所在站点发起请求。
- **Codex Skill**：仓库附带可复用的 Markdown 图文制作工作流，源文件位于 [`skill/markdown-to-social-cards/`](./skill/markdown-to-social-cards/)。

## 快速开始

需要 Node.js 22 或更高版本。克隆仓库后运行：

```bash
npm install
npm run dev
```

打开终端输出的本地地址，再进入 `/app/`。也可以导入 [`examples/篇页示例.md`](./examples/篇页示例.md) 体验完整样例；该样例含本地图片，请一并保留 `examples/images/` 目录。

## 封面来源与参考资料

可以在 front matter 中填写来源信息，工具会据此生成文章末尾的说明页：

```yaml
---
title: "文章标题"
cover_source: "作者，《作品名》，年份，馆藏机构"
cover_source_url: "https://example.org/artwork"
cover_license: "公有领域 / CC BY 4.0 / 已获授权"
references:
  - "作者、资料标题、机构、年份或访问日期"
---

正文从这里开始……
```

封面图片可在工作台的“画布”设置中选择；来源内容由使用者填写。更多字段示例见 [`examples/cover-and-sources.md`](./examples/cover-and-sources.md)。

## 开发与部署

```bash
npm test       # 单元测试
npm run build  # 类型检查并构建 dist/
npm run preview
```

在线工作台由 GitHub Pages 提供：推送至 `main` 后，GitHub Actions 会运行测试、构建并部署 `dist/`。也可以克隆仓库，在本地启动开发服务器。

## 项目来源与许可

篇页是在 [`haodongcui/md2card`](https://github.com/haodongcui/md2card) 基础上的非官方衍生项目。项目保留原 MIT 许可证与版权声明，并记录所用上游提交；篇页与原作者无官方关联。来源、改动概述和字体许可见 [`UPSTREAM.md`](./UPSTREAM.md)。

项目代码采用 [MIT License](./LICENSE)。字体按其随附的 [SIL Open Font License](./src/assets/fonts/OFL.txt) 授权；其他依赖遵循各自许可证。
