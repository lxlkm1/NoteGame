// assets.js —— 图片资产预加载：读 manifest → 并行加载 → Map<key, Image>
let images = new Map();

export async function loadAssets(baseUrl = 'src/assent/') {
  const res = await fetch(baseUrl + 'img/manifest.json');
  if (!res.ok) throw new Error('manifest.json 加载失败：HTTP ' + res.status);
  const manifest = await res.json();
  const missing = [];
  await Promise.all(Object.entries(manifest).map(([key, meta]) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => { images.set(key, image); resolve(); };
    image.onerror = () => { missing.push(key); resolve(); }; // 缺图不阻塞启动，由绘制方画占位块
    image.src = baseUrl + meta.path;
  })));
  if (missing.length) console.error('[assets] 缺失图片：' + missing.join(', '));
  return { count: images.size, missing };
}

export function img(key) {
  return images.get(key) ?? null;
}

// _register：仅供 tools/export.html 把内存 canvas 注入为"图片"（导出页页内自检用）
export function _register(key, image) {
  images.set(key, image);
}
