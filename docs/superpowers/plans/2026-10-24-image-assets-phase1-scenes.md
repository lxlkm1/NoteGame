# 图片资产管线 · 阶段一（导出管线 + 场景换图）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立"浏览器导出页 + Playwright 采集"的导出管线，把 4 张场景从代码预渲染换成 PNG 整图，画面逐像素不变。

**Architecture:** 导出侧：`tools/export.html` 在浏览器里调用现有 `buildCanvas()` 渲染 4 个场景 canvas，`tools/export.py`（Playwright）采集 `toDataURL` 存 PNG 并写 `manifest.json`。运行时侧：新增 `src/assets.js` 预加载器，`scenes.js` 改为从图片构建，`main.js` 启动改 async。角色/NPC 本阶段仍是代码渲染（并存）。

**Tech Stack:** 原生 JS（ES module）+ Canvas 2D；Python Playwright（opencode 环境）；node:test。

**设计文档:** [../specs/2026-10-24-image-assets-pipeline-design.md](../specs/2026-10-24-image-assets-pipeline-design.md)
**绘制清单参照:** [../specs/2026-10-24-render-inventory.md](../specs/2026-10-24-render-inventory.md)

## Global Constraints

- **画面逐像素一致**：导出必须调用游戏现有的渲染函数（`buildCanvas`），禁止重写渲染逻辑。
- **地图字符串是布局唯一事实来源**：`src/data/maps/*.js` 不动；碰撞/portal 判定不变。
- 像素风三件套：2d 上下文 `imageSmoothingEnabled = false`；CSS `image-rendering: pixelated`；绘制坐标 `Math.round` 取整。
- Python 一律用 `/home/lxl/miniforge3/envs/opencode/bin/python`（Playwright 在此环境）。
- 测试命令：`node --test`（测试文件放 `deploy/tests/`，跟随现有风格）。
- 代码注释用中文，风格跟随现有文件（`// 文件名 —— 职责` 开头）。
- 每个任务完成并经用户确认后运行 `node tools/token-log.mjs --task "任务名"`。
- 提交信息结尾带 `Co-Authored-By: Claude Code <noreply@anthropic.com>`。

---

### Task 1: 场景导出页 tools/export.html

**Files:**
- Create: `tools/export.html`

**Interfaces:**
- Produces: 页面加载完成后 `window.__EXPORTS__ = { 'scenes/atrium': HTMLCanvasElement, ... }`（4 个场景）、`window.__EXPECTED__ = { 'scenes/atrium': {w, h}, ... }`（按地图格子数 × TILE × ART_SCALE 算出的期望尺寸）、`window.__DIFF__`（校验结果，首次导出前为 `null`）、`window.__EXPORTS_READY__ = true`。Task 2 的采集器依赖这四个全局量。

- [ ] **Step 1: 创建导出页**

注意：`src/scenes.js` 会在模块加载时预渲染并 import 音频等模块，副作用多，导出页**不 import 它**，直接 import `buildCanvas` 和 `MAPS` 自己渲染。页面顶部的 `await` 在 ES module 里合法。

```html
<!doctype html>
<html lang="zh">
  <head><meta charset="UTF-8" /><title>NoteGame 资产导出</title></head>
  <body>
    <p>资产导出页：渲染 canvas 挂到 window.__EXPORTS__，由 tools/export.py 采集。</p>
    <script type="module">
      // 不 import scenes.js（模块加载即预渲染且带音频副作用），直接复用底层渲染函数
      import { MAPS } from '../src/data/maps/index.js';
      import { buildCanvas } from '../src/tile-render.js';
      import { TILE, ART_SCALE, parseMap } from '../src/map.js';

      const SCENES = ['atrium', 'reading', 'toilet', 'outside'];
      window.__EXPORTS__ = {};
      window.__EXPECTED__ = {};
      for (const name of SCENES) {
        const { rows, cols } = parseMap(MAPS[name].map);
        window.__EXPECTED__['scenes/' + name] = { w: cols * TILE * ART_SCALE, h: rows * TILE * ART_SCALE };
        window.__EXPORTS__['scenes/' + name] = buildCanvas(MAPS[name], MAPS.tiles);
      }

      // 校验模式：若 img/ 下已有导出的 PNG，则与刚渲染的 canvas 逐像素对比；
      // 首次导出前 manifest.json 不存在，__DIFF__ 保持 null
      window.__DIFF__ = null;
      try {
        const res = await fetch('../src/assent/img/manifest.json');
        if (res.ok) {
          const manifest = await res.json();
          const diffs = {};
          for (const name of SCENES) {
            const key = 'scenes/' + name;
            if (!manifest[key]) { diffs[key] = 'manifest 缺 key'; continue; }
            const image = new Image();
            await new Promise((resolve) => {
              image.onload = resolve; image.onerror = resolve;
              image.src = '../src/assent/' + manifest[key].path;
            });
            if (!image.width) { diffs[key] = '图片加载失败'; continue; }
            const cv = document.createElement('canvas');
            cv.width = image.width; cv.height = image.height;
            const c = cv.getContext('2d', { willReadFrequently: true });
            c.drawImage(image, 0, 0);
            const a = c.getImageData(0, 0, cv.width, cv.height).data;
            const src = window.__EXPORTS__[key];
            const c2 = src.getContext('2d', { willReadFrequently: true });
            const b = c2.getImageData(0, 0, src.width, src.height).data;
            let n = 0;
            for (let i = 0; i < a.length; i += 4) {
              if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) n++;
            }
            diffs[key] = n;
          }
          window.__DIFF__ = diffs;
        }
      } catch (e) { /* 首次导出：manifest 不存在，跳过校验 */ }

      window.__EXPORTS_READY__ = true;
    </script>
  </body>
</html>
```

- [ ] **Step 2: 手动冒烟（可选但推荐）**

```bash
cd /home/lxl/Desktop/work/vibe-game && /home/lxl/miniforge3/envs/opencode/bin/python -m http.server 8123 &
# 浏览器打开 http://127.0.0.1:8123/tools/export.html 后控制台应看到 __EXPORTS_READY__ === true
```

验证后 `kill %1` 关掉服务。

- [ ] **Step 3: Commit**

```bash
git add tools/export.html
git commit -m "Add scene export page rendering via existing buildCanvas

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: 采集器 tools/export.py + 资源完整性测试

**Files:**
- Create: `tools/export.py`
- Create: `deploy/tests/assets.test.js`

**Interfaces:**
- Consumes: Task 1 的 `window.__EXPORTS__` / `__EXPECTED__` / `__DIFF__` / `__EXPORTS_READY__`。
- Produces: `src/assent/img/scenes/{atrium,reading,toilet,outside}.png` 和 `src/assent/img/manifest.json`（格式 `{ "<key>": { "path": "img/<key>.png", "w": number, "h": number } }`）。Task 3 的 `loadAssets` 按此格式读 manifest。

- [ ] **Step 1: 先写失败测试**

`deploy/tests/assets.test.js`：

```js
'use strict';
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAPS } from '../../src/data/maps/index.js';

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
const imgDir = path.join(root, 'src/assent/img');
const manifestPath = path.join(imgDir, 'manifest.json');

function pngSize(file) {
  const buf = readFileSync(file);
  assert.deepEqual([...buf.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${file} 不是合法 PNG`);
  assert.equal(buf.toString('ascii', 12, 16), 'IHDR', `${file} 缺 IHDR`);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

test('manifest 存在且 4 张场景图齐全、尺寸与地图一致、非空白', () => {
  assert.ok(existsSync(manifestPath), '缺少 src/assent/img/manifest.json（先跑 python tools/export.py）');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  for (const name of ['atrium', 'reading', 'toilet', 'outside']) {
    const key = `scenes/${name}`;
    const meta = manifest[key];
    assert.ok(meta, `manifest 缺少 ${key}`);
    const file = path.join(root, 'src/assent', meta.path);
    assert.ok(existsSync(file), `缺少文件 ${meta.path}`);
    const { w, h } = pngSize(file);
    assert.equal(w, meta.w, `${key} manifest 宽度与实际不符`);
    assert.equal(h, meta.h, `${key} manifest 高度与实际不符`);
    const cols = MAPS[name].map[0].length, rows = MAPS[name].map.length;
    assert.equal(w, cols * 32, `${key} 宽度应为 格子数×32`);
    assert.equal(h, rows * 32, `${key} 高度应为 格子数×32`);
    assert.ok(statSync(file).size > 4000, `${key} 文件过小，疑似空白图`);
  }
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd /home/lxl/Desktop/work/vibe-game && node --test deploy/tests/assets.test.js
```

预期：FAIL，提示缺少 manifest.json。

- [ ] **Step 3: 实现采集器**

`tools/export.py`：

```python
#!/usr/bin/env python3
# export.py —— 用 Playwright 打开 tools/export.html，把 window.__EXPORTS__ 的 canvas 存为 PNG 并写 manifest.json
# 用法：/home/lxl/miniforge3/envs/opencode/bin/python tools/export.py
import base64
import functools
import http.server
import json
import socketserver
import threading
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
IMG_DIR = ROOT / 'src' / 'assent' / 'img'
PORT = 8123


def serve_forever():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('127.0.0.1', PORT), handler) as httpd:
        httpd.serve_forever()


def collect():
    """打开导出页，返回 (items, expected, diff)。items: [{key, w, h, dataUrl}]"""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(f'http://127.0.0.1:{PORT}/tools/export.html')
        page.wait_for_function('window.__EXPORTS_READY__ === true')
        items = page.evaluate('''() => Object.entries(window.__EXPORTS__).map(([key, cv]) => ({
            key, w: cv.width, h: cv.height, dataUrl: cv.toDataURL('image/png')
        }))''')
        expected = page.evaluate('() => window.__EXPECTED__')
        diff = page.evaluate('() => window.__DIFF__')
        browser.close()
    return items, expected, diff


def main():
    threading.Thread(target=serve_forever, daemon=True).start()
    items, expected, diff = collect()

    # 尺寸断言：canvas 尺寸必须等于 地图格子数 × TILE × ART_SCALE
    for item in items:
        exp = expected[item['key']]
        assert (item['w'], item['h']) == (exp['w'], exp['h']), \
            f"{item['key']} 尺寸 {item['w']}x{item['h']} 与期望 {exp['w']}x{exp['h']} 不符"

    IMG_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for item in items:
        png = base64.b64decode(item['dataUrl'].split(',', 1)[1])
        rel = f"img/{item['key']}.png"
        dest = ROOT / 'src' / 'assent' / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(png)
        manifest[item['key']] = {'path': rel, 'w': item['w'], 'h': item['h']}
        print(f"导出 {rel}（{item['w']}x{item['h']}，{len(png)} 字节）")

    (IMG_DIR / 'manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    print(f"manifest.json 写入 {len(manifest)} 项")

    # 二次打开页面做像素校验（此时 manifest 已存在，__DIFF__ 生效）
    _, _, diff = collect()
    if diff is None:
        print('警告：校验模式未生效（manifest 未找到？）')
        sys.exit(1)
    bad = {k: v for k, v in diff.items() if v != 0}
    for k, v in diff.items():
        print(f"像素对比 {k}: {'一致' if v == 0 else v}")
    if bad:
        print(f'校验失败：{bad}')
        sys.exit(1)
    print('全部像素一致 ✓')


if __name__ == '__main__':
    main()
```

- [ ] **Step 4: 跑采集器**

```bash
cd /home/lxl/Desktop/work/vibe-game && /home/lxl/miniforge3/envs/opencode/bin/python tools/export.py
```

预期输出：4 行"导出 img/scenes/…"、"manifest.json 写入 4 项"、4 行"像素对比 … 一致"、"全部像素一致 ✓"。

- [ ] **Step 5: 跑测试确认通过**

```bash
node --test deploy/tests/assets.test.js
```

预期：PASS。同时跑全量测试确认没有误伤：

```bash
node --test
```

预期：全部 PASS（现有测试不依赖渲染产物）。

- [ ] **Step 6: Commit**

```bash
git add tools/export.py deploy/tests/assets.test.js src/assent/img/
git commit -m "Add Playwright exporter and scene PNG assets with integrity test

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: 图片预加载器 src/assets.js

**Files:**
- Create: `src/assets.js`

**Interfaces:**
- Consumes: `src/assent/img/manifest.json`（Task 2 产物）。
- Produces: `loadAssets(baseUrl = 'src/assent/')` → `Promise<{count, missing}>`，填充内部 `Map<key, Image>`；`img(key)` → `Image | null`。Task 4 的 `scenes.js` 用 `img('scenes/atrium')` 取图。

说明：此模块依赖浏览器 `fetch`/`Image`，无法用 node:test 单测（项目无 DOM 测试设施），靠 Task 4 的浏览器验收覆盖——保持它极薄就是这个原因。

- [ ] **Step 1: 实现预加载器**

```js
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
    image.onerror = () => { missing.push(key); resolve(); }; // 缺图不阻塞启动，由调用方画占位块
    image.src = baseUrl + meta.path;
  })));
  if (missing.length) console.error('[assets] 缺失图片：' + missing.join(', '));
  return { count: images.size, missing };
}

export function img(key) {
  return images.get(key) ?? null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/assets.js
git commit -m "Add image asset preloader reading manifest

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: 运行时场景换图（scenes.js / main.js / index.html / style.css）

**Files:**
- Modify: `src/scenes.js`（整体重写，enterRoom/exitRoom 逻辑原样保留）
- Modify: `src/main.js`（G 初始化与循环启动移入 async main()）
- Modify: `index.html`（加 loading 提示元素）
- Modify: `style.css`（loading 样式）

**Interfaces:**
- Consumes: Task 3 的 `loadAssets` / `img`；Task 2 的 `img/scenes/*.png`。
- Produces: `scenes.js` 继续导出 `scenes`（对象引用不变，由 `initScenes()` 填充，`render.js:87` 的 `scenes[G.scene].canvas` 取值变成 HTMLImageElement——`drawImage` 天然兼容）与 `initScenes()`；`main.js` 导出不变。

- [ ] **Step 1: 重写 scenes.js**

```js
// scenes.js —— 场景表（场景图来自 src/assent/img/scenes/）与进出房间
import { MAPS } from './data/maps/index.js';
import { TILE, ART_SCALE, parseMap } from './map.js';
import * as Sound from './audio.js';
import * as Bowls from './bowls.js';
import * as Mimi from './npc/mimi.js';
import { img } from './assets.js';

export const scenes = {}; // initScenes() 在资产加载后填充；import 方持有同一对象引用

function placeholderCanvas(name, data) { // 缺图时的品红占位（明显可见，便于发现）
  const { rows, cols } = parseMap(data.map);
  const cv = document.createElement('canvas');
  cv.width = cols * TILE * ART_SCALE;
  cv.height = rows * TILE * ART_SCALE;
  const c = cv.getContext('2d');
  c.fillStyle = '#ff00ff';
  c.fillRect(0, 0, cv.width, cv.height);
  c.fillStyle = '#000';
  c.font = '24px monospace';
  c.fillText('缺图: scenes/' + name, 20, 48);
  return cv;
}

export function initScenes() {
  for (const name of ['atrium', 'reading', 'toilet', 'outside']) {
    const data = MAPS[name];
    scenes[name] = { data, canvas: img('scenes/' + name) ?? placeholderCanvas(name, data) };
  }
}

// G：main.js 持有的游戏状态（player / scene / currentMap / atriumPos / bowls / mimi / mimiHearts / particles）
export function enterRoom(G, name) {
  // ……原样保留现有实现，一行不改……
}
```

`enterRoom` / `exitRoom` 两个函数从现有文件原样复制，不改任何一行。注意删掉 `import { buildCanvas } from './tile-render.js';`（运行时不再逐格渲染；tile-render.js 保留给导出页用）。

- [ ] **Step 2: main.js 改异步启动**

改动点只有三处，其余原样：

```js
// 顶部 import 区：scenes 改为同时引入 initScenes，新增 assets
import { scenes, initScenes } from './scenes.js';
import * as Assets from './assets.js';

// G 的声明从 const 改为 let（在 main() 里赋值；事件回调都是用户操作触发，晚于加载完成）
let G = null;

// 文件末尾的 requestAnimationFrame(...) 启动行替换为：
async function main() {
  await Assets.loadAssets('src/assent/');
  initScenes();
  G = {
    scene: 'atrium',
    currentMap: scenes.atrium.data.map,
    atriumPos: { x: MAPS.atrium.spawn.col * TILE, y: MAPS.atrium.spawn.row * TILE },
    player: createPlayer(MAPS.atrium.spawn),
    cats: Cats.createCats(), // 普通猫固定生活在室外
    npcs: NPCs.create(MAPS),
    mimi: null,
    mimiHearts: 0,
    mimiMet: false,
    bowls: [],
    dishes: [],   // {catId, x, y}
    particles: [], // 见 particles.js
  };
  document.getElementById('loading').hidden = true;
  requestAnimationFrame((t) => { lastT = t; requestAnimationFrame(loop); });
}
main();
```

原来模块顶层的 `const G = {...}` 整段删除（内容移入 main()）。`initKeyboard` / `bindTouchControls` / 声音按钮绑定保持在模块顶层不动，但要加**加载期守卫**——用户在图片加载完成前按键时 `G` 还是 `null`，必须挡掉：

```js
initKeyboard((e) => {
  if (e.repeat) return; // 忽略系统自动重复，避免 M 键长按导致静音反复切换
  if (!G) return; // 资源加载完成前的按键直接忽略
  const k = e.key.toLowerCase();
  // ……其余原样……
});
bindTouchControls({ onInteract: () => { if (G) interact(G); }, onGesture: initAudio });
```

- [ ] **Step 3: index.html 加 loading 元素**

在 `<div id="rotate-hint" …>` 之前插入：

```html
      <div id="loading" role="status">资源加载中…</div>
```

- [ ] **Step 4: style.css 加 loading 样式**

追加到文件末尾（`#game-wrap` 已有定位上下文，若无则 relative 到视口也同样可接受）：

```css
/* 资源加载占位：图片预加载完成前盖住画布 */
#loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a181f;
  color: #e8e0d0;
  font: 14px/1 monospace;
  z-index: 50;
}
#loading[hidden] {
  display: none;
}
```

- [ ] **Step 5: 浏览器验收**

```bash
cd /home/lxl/Desktop/work/vibe-game && /home/lxl/miniforge3/envs/opencode/bin/python -m http.server 8000
```

打开 `http://127.0.0.1:8000`，逐项确认：
1. 先看到"资源加载中…"，随后进入游戏；
2. 中庭场景与改造前完全一致（墙/棋盘格/棋子凳汉字/暖光/门垫都在）；
3. 走进阅览室、卫生间、出门到室外，4 个场景画面正常；
4. 角色仍是代码渲染（本阶段预期，角色叠在图片场景上正常显示）；
5. 移动端视口（开发者工具切手机模拟）场景正常；
6. 控制台无 `[assets] 缺失图片` 报错。

完成后 Ctrl+C 关服务。

- [ ] **Step 6: 全量测试 + Commit**

```bash
node --test
git add src/scenes.js src/main.js src/assets.js index.html style.css
git commit -m "Render scenes from exported PNG images instead of tile code

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 5: 阶段一总验收

**Files:** 无（纯验证）

- [ ] **Step 1: 重跑导出确认可重复**

```bash
/home/lxl/miniforge3/envs/opencode/bin/python tools/export.py
```

预期：依然"全部像素一致 ✓"（证明 数据→PNG 管线可重复，改地图字符串后重跑即可更新场景图）。

- [ ] **Step 2: 改地图验证可编辑性（硬约束验证）**

临时把 `src/data/maps/outside.js` 里某格草地 `g` 改成树 `t`，重跑 `python tools/export.py`，刷新游戏确认室外对应位置变成树；然后 `git checkout src/data/maps/outside.js` 还原，重跑 export.py 还原图片。

- [ ] **Step 3: 用户目视确认 4 场景后，记 token**

```bash
node tools/token-log.mjs --task "阶段一：场景图片化"
```

---

## Self-Review 记录

- 覆盖检查：导出管线（Task 1-2）✓、manifest 格式 ✓、预加载器（Task 3）✓、运行时场景换图+异步启动+loading（Task 4）✓、像素对比验证（export.py 二次收集 + Task 5）✓、地图可编辑性硬约束（Task 5 Step 2）✓。
- 已知取舍：`assets.js` 无 node 单测（依赖浏览器 API），由 Task 4 Step 5 浏览器验收覆盖；阶段二/三（角色道具换图、烘焙代码搬到 tools/export-lib/、README 更新）不在本计划内，各自单独出计划。
