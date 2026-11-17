import { useEffect, useRef, useState } from "preact/hooks";
import { fetchLinkedImage, imageToDataUrl } from "../../resources/image-import";

export type CoverImageStatus =
  | { kind: "idle" | "loading" | "ready" }
  | { kind: "error"; message: string };

export function useCoverImage(onApply: (dataUrl: string) => void) {
  const activeRequest = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<CoverImageStatus>({ kind: "idle" });

  useEffect(() => () => activeRequest.current?.abort(), []);

  const resetCoverImageImport = () => {
    activeRequest.current?.abort();
    setStatus({ kind: "idle" });
  };

  const importCoverImage = async (source: File | string) => {
    activeRequest.current?.abort();
    const request = new AbortController();
    activeRequest.current = request;
    setStatus({ kind: "loading" });
    const timeout = window.setTimeout(() => {
      if (request.signal.aborted) return;
      request.abort();
      setStatus({ kind: "error", message: "读取封面图片超时，请重试。" });
    }, 20_000);

    const linked = typeof source === "string";
    try {
      const blob = linked ? await fetchLinkedImage(source, request.signal) : source;
      if (request.signal.aborted) return;
      const dataUrl = await imageToDataUrl(blob, 2560).catch(() => {
        throw new Error(linked
          ? "链接内容无法识别为图片。请复制图片地址，或保存为 JPG、PNG 或 WebP 后上传。"
          : "读取封面图片失败，请选择 JPG、PNG 或 WebP 图片。");
      });
      if (request.signal.aborted) return;
      onApply(dataUrl);
      setStatus({ kind: "ready" });
    } catch (error) {
      if (!request.signal.aborted) {
        setStatus({
          kind: "error",
          message: error instanceof Error ? error.message : "读取封面图片失败，请重试。",
        });
      }
    } finally {
      window.clearTimeout(timeout);
      if (activeRequest.current === request) activeRequest.current = null;
    }
  };

  return { coverImageStatus: status, importCoverImage, resetCoverImageImport };
}
