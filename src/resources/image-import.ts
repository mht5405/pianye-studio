export async function imageToDataUrl(
  blob: Blob,
  maxSide: number,
  square = false,
): Promise<string> {
  const image = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法处理这张图片。");

    if (square) {
      const side = Math.min(image.width, image.height);
      const x = (image.width - side) / 2;
      const y = (image.height - side) / 2;
      canvas.width = maxSide;
      canvas.height = maxSide;
      context.drawImage(image, x, y, side, side, 0, 0, maxSide, maxSide);
    } else {
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    }
    return canvas.toDataURL("image/jpeg", 0.88);
  } finally {
    image.close();
  }
}

export async function fetchLinkedImage(value: string, signal: AbortSignal): Promise<Blob> {
  const invalidUrl = "请输入完整的 HTTP 或 HTTPS 图片直链。";
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(invalidUrl);
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
    throw new Error(invalidUrl);
  }

  let response: Response;
  try {
    response = await fetch(url, { credentials: "omit", signal });
  } catch {
    throw new Error("无法读取图片链接。请检查网络和图床的跨域访问设置，或保存图片后上传。");
  }
  if (!response.ok) {
    throw new Error(`图片链接返回 HTTP ${response.status}。请检查直链是否可用，或保存图片后上传。`);
  }
  return response.blob();
}
