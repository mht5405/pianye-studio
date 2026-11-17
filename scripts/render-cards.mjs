import { readFile, realpath, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const project = fileURLToPath(new URL('..', import.meta.url));
const defaultPreferences = join(project, 'pianye-preferences.json');
const imageTypes = new Map([
  ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'], ['.svg', 'image/svg+xml'], ['.gif', 'image/gif'],
  ['.avif', 'image/avif'], ['.bmp', 'image/bmp'], ['.ico', 'image/x-icon'],
]);

function isInside(root, path) {
  const rest = relative(root, path);
  return rest !== '..' && !rest.startsWith(`..${sep}`) && !isAbsolute(rest);
}

function referencePaths(reference) {
  if (/^file:\/\//i.test(reference)) return [fileURLToPath(reference)];
  if (/^[a-z][a-z\d+.-]*:/i.test(reference) && !isAbsolute(reference)) {
    throw new Error('图片需要使用文件路径、HTTP(S) 直链或图片 data URL。');
  }
  const path = reference.split(/[?#]/, 1)[0];
  try {
    return [reference, decodeURIComponent(path)];
  } catch {
    return [reference, path];
  }
}

async function readImage(reference, noteDir, assetRoot) {
  const paths = referencePaths(reference);
  const candidates = new Set(paths.flatMap((path) => [resolve(noteDir, path), resolve(assetRoot, path)]));
  for (const candidate of candidates) {
    let actual;
    try {
      actual = await realpath(candidate);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') continue;
      throw error;
    }
    if (!isInside(assetRoot, actual)) throw new Error('该图片的实际路径超出了附件根目录。');
    const type = imageTypes.get(extname(candidate).toLowerCase()) || imageTypes.get(extname(actual).toLowerCase());
    if (!type) throw new Error('不支持这张本地图片的格式。请使用 PNG、JPG、WebP、SVG 等常见格式。');
    return { base64: (await readFile(actual)).toString('base64'), type };
  }
  throw new Error(`附件根目录 ${assetRoot} 内没有这个文件。可用 --asset-root 指定更上一级的附件目录。`);
}

async function readPreferences(preferences) {
  const path = preferences ? resolve(preferences) : defaultPreferences;
  let json;
  try {
    json = await readFile(path, 'utf8');
  } catch (error) {
    if (!preferences && error.code === 'ENOENT') return { version: 1, layout: {} };
    throw error;
  }
  try {
    return JSON.parse(json.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error(`无法解析偏好文件 ${path}，请检查 JSON 格式。`);
  }
}

async function launchBrowser() {
  for (const channel of ['chrome', 'msedge', undefined]) {
    try {
      return await chromium.launch({ channel, timeout: 10_000 });
    } catch (error) {
      // A configured browser that fails to start should give its own error.
      if (!/executable doesn't exist|distribution .*not found/i.test(error.message)) throw error;
    }
  }
  throw new Error('需要 Chrome、Edge 或 Playwright Chromium。也可以运行 npx playwright-core install chromium。');
}

async function renderCards(input, assetRoot, noteDir) {
  const server = await createServer({
    root: project,
    logLevel: 'error',
    cacheDir: 'node_modules/.vite-cards',
    optimizeDeps: { entries: ['scripts/render-cards.html'] },
    server: { host: '127.0.0.1', port: 0, hmr: false, watch: null },
  });
  let browser;
  let timeout;
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
    const pngs = new Map();
    const verifyFrame = (frame) => {
      if (frame !== page.mainFrame() || !frame.url().startsWith(`${origin}/`)) {
        throw new Error('不允许从出图页面之外调用本地文件接口。');
      }
    };
    await page.exposeBinding('readPianyeImage', ({ frame }, path) => {
      verifyFrame(frame);
      return readImage(path, noteDir, assetRoot);
    });
    await page.exposeBinding('receivePianyePng', ({ frame }, name, dataUrl) => {
      verifyFrame(frame);
      if (!/^\d{2,}\.png$/.test(name) || !dataUrl.startsWith('data:image/png;base64,')) {
        throw new Error('出图页面返回的 PNG 无效。');
      }
      pngs.set(name, Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64'));
    });
    await page.goto(`${origin}/scripts/render-cards.html`);
    await page.waitForFunction(() => typeof window.renderPianyeCards === 'function');
    const rendering = page.evaluate(async (payload) => {
      try {
        return { result: await window.renderPianyeCards(payload) };
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    }, input);
    const deadline = new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error('出图超过 5 分钟。请检查附件是否可访问，或尝试标准分辨率。')), 300_000);
    });
    const { result, error } = await Promise.race([rendering, deadline]);
    if (!result) throw new Error(error);
    return { result, pngs };
  } finally {
    clearTimeout(timeout);
    try {
      await browser?.close();
    } finally {
      await server.close();
    }
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: 'string' },
      preferences: { type: 'string' },
      'asset-root': { type: 'string' },
      cover: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) {
    console.log('node scripts/render-cards.mjs <笔记.md> [--out 目录] [--preferences 文件.json] [--asset-root 附件根目录] [--cover 图片路径或直链]');
    return;
  }
  if (positionals.length !== 1) throw new Error('请传入一个 Markdown 文件路径。使用 --help 查看用法。');

  const note = await realpath(resolve(positionals[0]));
  const noteDir = dirname(note);
  const assetRoot = values['asset-root'] ? await realpath(resolve(values['asset-root'])) : noteDir;
  const filename = basename(note);
  const [markdown, preferences] = await Promise.all([readFile(note, 'utf8'), readPreferences(values.preferences)]);
  if (!markdown.trim()) throw new Error('Markdown 文件为空。');
  const { result, pngs } = await renderCards({
    markdown: markdown.replace(/^\uFEFF/, ''),
    filename,
    preferences,
    cover: values.cover,
  }, assetRoot, noteDir);

  const outputRoot = values.out ? resolve(values.out) : join(project, 'output');
  await mkdir(outputRoot, { recursive: true });
  const stem = basename(filename, extname(filename)).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 48) || 'cards';
  const directory = await mkdtemp(join(outputRoot, `${stem}-`));
  const files = [];
  for (const [name, bytes] of pngs) {
    const path = join(directory, name);
    try {
      await writeFile(path, bytes, { flag: 'wx' });
    } catch (error) {
      throw new Error(`写入 ${path} 失败：${error.message}`);
    }
    files.push(path);
  }
  console.log(JSON.stringify({ ...result, directory, files }));
}

main().catch((error) => {
  console.error(`篇页出图失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
