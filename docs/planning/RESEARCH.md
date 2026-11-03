# 开源项目调研：Markdown 转社交图文

调研日期：2026-11-03

## 结论

确实已有多个项目覆盖了大部分基础需求，复用能显著减少 Markdown 解析、分页、预览和图片导出的开发量。最值得优先检查的是 [`haodongcui/md2card`](https://github.com/haodongcui/md2card)：它支持本地 Markdown 与图片、自动分页、主题/画布/阅读密度调整、浏览器预览、PNG/ZIP 导出，并采用 MIT 许可。下一步应本地运行并读源码后再决定是否 fork；仅凭 README 不把封面来源/末页来源署名视为已支持功能。

## 候选比较

| 项目 | 已有能力 | 与本项目的关系 |
|---|---|---|
| [`haodongcui/md2card`](https://github.com/haodongcui/md2card) | Markdown 解析、真实 DOM 测量分页、本地图片绑定、封面和主题配置、预览、PNG/ZIP 导出；MIT | **优先评估**。架构和本地素材工作流较完整；需增加文章 front matter 的封面来源信息、来源尾页、3:5 深色颗粒视觉主题与 Skill 调用层。 |
| [`joekind/chicpage`](https://github.com/joekind/chicpage) | 微信公众号编辑与预览、多个社媒比例和字体、自动/手动分页、贴图导出 | 适合作为微信与贴图双场景的功能参考；README 展示的主题、版面较通用，来源尾页字段未见说明。 |
| [`uhhc/md2card`](https://github.com/uhhc/md2card) | Markdown/JSON 输入、主题、自动分页、小红书与微信公众号多种规格、JPEG/ZIP 导出；MIT | 能力相关，但公开介绍的架构和本地图片资源管理细节少于优先候选。 |
| [`aipickgold/md2card`](https://github.com/aipickgold/md2card) | 自动分页、主题库、字体、高清 PNG/ZIP、小红书 3:4 卡片 | 视觉主题多，但 README 标示有免费/付费档位；采用前需核实仓库实际许可证及功能授权，不作为第一基座。 |
| [`caol64/wenyan`](https://github.com/caol64/wenyan) | 多平台 Markdown 排版、front matter、自定义主题、长图导出；Apache-2.0 | 更偏公众号排版和跨平台文章转换，可参考 front matter、主题及长图能力；小红书连续卡片工作台不如 md2card 直接。 |

## 初步适配差距

用户样图是约 3:5 竖版：古典画作封面、深色颗粒正文底、浅色大字号中文、宽松段落间距、章节数字强调色、统一页脚标识、结尾单独列封面图来源和产品署名。候选项目解决“文章如何切页和导出”，但需重点验证或补做：

1. Markdown front matter 中可替换封面及 `cover_source`、`cover_source_url`、`cover_license` 等字段。
2. 自动生成来源/引用尾页；不得猜测或补造来源。
3. 按样图搭建专用 3:5 深色主题，并确认主题、封面图、字体和署名配置能持久化。
4. 可重复调用的本地 Skill 工作流：输入文章目录，生成预览、PNG 和 ZIP，不自动发布。

## 许可证注意

`haodongcui/md2card` 与 `uhhc/md2card` 的仓库页面标示 MIT。若采用其代码，保留原版权与许可证文本，注明改动，并单独核查字体、示例内容、图片和其他依赖的许可；代码许可不自动授权使用项目名称、Logo、图片或品牌素材。其余候选在实施前也需对仓库中的 LICENSE 文件和依赖许可做复核。

## 来源

- GitHub 仓库与 README：[`haodongcui/md2card`](https://github.com/haodongcui/md2card)、[`joekind/chicpage`](https://github.com/joekind/chicpage)、[`uhhc/md2card`](https://github.com/uhhc/md2card)、[`aipickgold/md2card`](https://github.com/aipickgold/md2card)、[`caol64/wenyan`](https://github.com/caol64/wenyan)。
