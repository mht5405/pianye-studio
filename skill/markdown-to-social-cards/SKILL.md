---
name: markdown-to-social-cards
description: Turn a finished Markdown article into Xiaohongshu or WeChat image cards through this project's local Agent command or interactive workbench. Use when the user asks to convert, typeset, preview, or export Markdown as social image cards, especially with a replaceable cover image and source attribution.
---

# 篇页 Markdown 图文工作流

Convert one finished Markdown article into a reviewed set of PNG cards. Preserve the article source and never upload or publish on the user's behalf.

## Agent workflow

When the user asks for direct or unattended export, use this command from the project directory:

```bash
npm run --silent cards:render -- "/absolute/path/to/note.md" --out "/absolute/path/to/output"
```

Read the returned JSON. Return the PNG paths from `files` in order and mention any relevant `warnings`. Inspect the PNGs for clipping or missing content when the user asks for review. Read errors from stderr, fix recoverable path issues, and never claim success without the files.

- The command loads `pianye-preferences.json` from the project root if present. The user can export it from **排版设置 → 导出 Agent 偏好**. Use `--preferences <file>` for a different saved layout.
- Markdown images use paths relative to the note's directory by default. For attachments in a shared vault directory, pass `--asset-root <vault>`. The `cover` front matter field or `--cover <path-or-direct-url>` selects the cover. Keep the article's supplied `cover_source` and references. Ask for the cover credit if the user supplies a cover with no credit.
- Node.js 22+ and installed project dependencies are required. The command starts its own renderer in Chrome, Edge, or Playwright Chromium. It writes numbered PNGs directly and does not need a running workbench. The project README documents the command and its JSON output.

## Interactive workbench workflow

1. Locate the requested `.md` file and its referenced local assets. Read the article and front matter. Do not rewrite or save over the source file.
2. Check these optional YAML front matter fields:

   ```yaml
   ---
   title: "Article title"
   cover_source: "Artist, work, year, collection or site"
   cover_source_url: "https://..."
   cover_license: "Public domain / CC BY 4.0 / permission obtained"
   references:
     - "Author, title, publisher, year or access date"
   ---
   ```

   Keep supplied details verbatim. Never infer a source, license, date, or attribution. If a cover image is supplied but its source is unknown, ask the user for the attribution before export. If there are factual references in the article but no references metadata, identify the missing citations and ask before inventing any.

3. Start the local app from the project root with `npm run dev` if it is not already running, then open the local `/app/` workbench. Import the article Markdown and confirm the title and text are intact.
4. In **Theme**, select **蓝灰长文**. In **Canvas**, choose **3:5**. Select or replace the cover image for this article; image selection switches to a standalone cover and center-crops/compresses the image. Review the crop and title placement in the preview.
5. Review the generated ending page. Confirm it includes the supplied cover credit and references, with links only for valid HTTP(S) URLs. Check page breaks, paragraph density, Chinese line wrapping, image loading, and all card bottoms for clipping.
6. Export the PNG ZIP only after the preview and source page are correct. Keep the downloaded ZIP as the deliverable; do not overwrite the Markdown or claim publishing/upload succeeded.

## Output and review

The workbench generates numbered PNGs in a ZIP, including a final source-notes card when front matter has `cover_source` or `references`. If no cover image is supplied, retain the text cover. If source information is missing, stop before export and request the missing facts. Report the archive location only after confirming the download completed.

## Project-specific limits

- Supported source keys are `title`, `cover_source`, `cover_source_url`, `cover_license`, and a YAML list under `references`.
- Use `cover:` in front matter for Agent exports, or select the cover image in the workbench for interactive exports.
- Export is local to the browser. This workflow does not upload to Xiaohongshu, WeChat, or an image host.
- The code is derived from `haodongcui/md2card`; retain the root MIT LICENSE and attribution in `UPSTREAM.md` when redistributing.
