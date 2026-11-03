# 篇页 · Markdown 图文工作室

篇页以 Markdown 为正文源，生成可发布的小红书图文与微信长图卡片。项目已基于 `haodongcui/md2card`（MIT）建立本地工作副本，保留原许可证并记录上游提交，见 [RESEARCH.md](./RESEARCH.md) 与项目根目录 [UPSTREAM.md](../../UPSTREAM.md)。

## 目标

- 输入 Markdown 文章，选择/替换封面图片，输出封面、分页正文图、来源页及发布文案。
- 以约 3:5 竖版为主，复用上游成熟的 Markdown 解析、分页、预览和 PNG/ZIP 导出。
- 采用深色纹理背景、浅色大字、宽松段落间距和章节强调色；保留人工检查，不自动发布。
- 在末页标注封面图片来源和正文资料来源，不推断或编造出处。

## 当前输入约定

```yaml
---
title: "文章标题"
cover_source: "作者/作品名/年份/馆藏机构"
cover_source_url: "https://..."
cover_license: "公有领域 / CC BY 4.0 / 已获授权"
references:
  - "作者、资料标题、机构、年份或访问日期"
---
```

封面图片在本地工作台“画布 → 替换封面图片”选择并随当前浏览器草稿保存。图片来源及 `references` 通过 front matter 生成文章末尾的来源说明；封面已设置但来源缺失时，导出前会提示补齐。

## 实施路线

1. **上游基线**：已克隆 MIT 项目并保留 LICENSE；工作分支为 `codex/social-card-workflow`，远程名 `upstream` 指向原项目。
2. **视觉与来源适配**：加入 3:5 画布、暗色长文主题、可换封面和 front matter 来源页；完善裁切、字体、行距与账号页脚。
3. **Skill 工作流**：封装文章检查、来源核对、封面替换、预览和导出步骤；不自动上传或发布。
4. **真实文章试排**：检查手机阅读、分页节奏、图片裁切及来源页，再修订模板。
5. **交付准备**：补齐安装/使用说明、示例和许可清单；用户准备推送 GitHub 时再配置个人远程。

## 仓库结构

```text
markdown-to-social-cards/
├── src/                              # 上游 Vite + Preact 应用与定制渲染
├── skill/markdown-to-social-cards/   # 项目 Skill
├── .agents/skills/                   # 当前项目的 Codex Skill 入口
├── examples/                         # Markdown 输入样例
├── docs/planning/                    # 调研与计划
└── UPSTREAM.md                       # 上游来源及许可证说明
```

## 当前状态

上游基线已落到本地，首轮版式、来源尾页与 Skill 工作流已写入；下一步安装依赖后检查本地运行和样例输出，再调整分页及视觉细节。
