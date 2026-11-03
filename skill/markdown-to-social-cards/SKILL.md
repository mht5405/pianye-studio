---
name: markdown-to-social-cards
description: Turn a finished Markdown article into a Xiaohongshu and WeChat image-card package using this project's local workbench. Use when the user asks to convert, typeset, preview, or export Markdown as social image cards, especially with a replaceable cover image and source attribution.
---

# 篇页 Markdown 图文工作流

Convert one finished Markdown article into a reviewed set of PNG cards. Use the project's local Vite workbench; preserve the article source and never upload or publish on the user's behalf.

## Workflow

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
4. In **Theme**, select **暗色长文**. In **Canvas**, choose **3:5**. Select or replace the cover image for this article; image selection switches to a standalone cover and center-crops/compresses the image. Review the crop and title placement in the preview.
5. Review the generated ending page. Confirm it includes the supplied cover credit and references, with links only for valid HTTP(S) URLs. Check page breaks, paragraph density, Chinese line wrapping, image loading, and all card bottoms for clipping.
6. Export the PNG ZIP only after the preview and source page are correct. Keep the downloaded ZIP as the deliverable; do not overwrite the Markdown or claim publishing/upload succeeded.

## Output and review

The workbench generates numbered PNGs in a ZIP, including a final source-notes card when front matter has `cover_source` or `references`. If no cover image is supplied, retain the text cover. If source information is missing, stop before export and request the missing facts. Report the archive location only after confirming the download completed.

## Project-specific limits

- Supported source keys are `title`, `cover_source`, `cover_source_url`, `cover_license`, and a YAML list under `references`.
- Select cover images in the workbench; `cover:` filesystem paths in front matter are not currently loaded automatically.
- Export is local to the browser. This workflow does not upload to Xiaohongshu, WeChat, or an image host.
- The code is derived from `haodongcui/md2card`; retain the root MIT LICENSE and attribution in `UPSTREAM.md` when redistributing.
