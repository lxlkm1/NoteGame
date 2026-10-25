# 图片资产管线 · 阶段一（导出管线 + 场景元素素材化）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立"浏览器导出页 + Playwright 采集"的导出管线，把场景渲染从逐格代码绘制换成"地块素材 PNG 按地图字符串组装"，画面逐像素不变，且改地图无需重跑导出。

**Architecture:** 导出侧：`tools/export.html` 用现有 `buildCanvasLegacy` 渲染 66×66"标定地图"（穷尽地块的全部位置参数组合），逐格裁成 32×32 素材 canvas；`tools/export.py`（Playwright）采集、按内容去重、存 PNG、写 `manifest.json`。运行时侧：`src/tile-key.js` 纯函数算出每格素材 key，`buildSceneFromTiles()` 查图组装场景；`src/assets.js` 预加载；`main.js` 启动改 async。角色/NPC 本阶段仍是代码渲染（并存）。

**Tech Stack:** 原生 JS（ES module）+ Canvas 2D；Python Playwright（opencode 环境）；node:test。

**设计文档:** [../specs/2026-10-24-image-assets-pipeline-design.md](../specs/2026-10-24-image-assets-pipeline-design.md)（元素素材方案见"场景图片粒度"决策行与"场景素材导出"节）
**绘制清单参照:** [../specs/2026-10-24-render-inventory.md](../specs/2026-10-24-render-inventory.md)

## Global Constraints

- **画面逐像素一致**：导出必须调用游戏现有的渲染函数（`buildCanvasLegacy`），禁止重写渲染逻辑。
- **地图字符串是布局唯一事实来源**：`src/data/maps/*.js` 不动；碰撞/portal 判定不变；改地图布局不需要重跑导出（位置参数组合已全量导出），只有改画法（STYLE_DRAW）才需要。
- 像素风三件套：2d 上下文 `imageSmoothingEnabled = false`；CSS `image-rendering: pixelated`；绘制坐标 `Math.round` 取整。
- Python 一律用 `/home/lxl/miniforge3/envs/opencode/bin/python`（Playwright 在此环境）。
- 测试命令：`node --test`（测试文件放 `deploy/tests/`，跟随现有风格）。
- 代码注释用中文，风格跟随现有文件（`// 文件名 —— 职责` 开头）。
- **已知无关失败**：`deploy/tests/zdw.test.js` 有 2 个抓取测试失败（zdw WIP 现场，commit d95eeb5 已记录），不属于本计划范围，不要修。
- **chessSeat 圆半径已修为 7.2**（2026-10-25 调试发现：半径 7.5 + 描边半宽 0.75 = 外沿 8.25 > 8，向四边邻居渗色约 0.5px，打破素材化前提"地块内容不越界"；修圆属既定画面微调，用户已拍板）。
- **像素校验容差**：chessSeat 的圆/繁体字是抗锯齿渲染，Chromium 下同输入在不同绝对位置有亚像素差异（实验：792 对同 key 格子 551 对有 ≤16px 差异；fillRect 地块 0 差异）。diff 规则：**任一通道差 > 16 记硬差异（必须为 0）**；≤16 记 soft 仅供参考。
- 每个任务完成并经用户确认后运行 `node tools/token-log.mjs --task "任务名"`。
- 提交信息结尾带 `Co-Authored-By: Claude Code <noreply@anthropic.com>`。

## 背景：为什么 key 要包含这些参数

`tile-render.js` 的旧渲染路径里，一个地块格子的画面不只由字符决定，还随位置变化：

| 参数 | 公式 | 影响 |
|---|---|---|
| parity | `(col+row)%2` | 木地板/棋盘格/石板路/草地的交替色 |
| seed | `(col*17+row*31)%11` | `drawTileDetails` 的 1px 纹理噪点 |
| book | `(col*7+row*13)%6` | 书架 4 本书的颜色组合 |
| win | `row===2 && col%6===3` | 外墙周期性亮窗（仅 facade） |
| char | `sceneData.chessSeats['col,row']` | 象棋凳上的繁体字（仅 chessSeat） |
| ch | 字符本身 | door 的 `m`/`D` 画法不同 |

三个取模周期 2/11/6 的最小公倍数是 **66**：key 在 `(col±66, row)` 和 `(col, row±66)` 上必然重复，所以 66×66 标定地图穷尽全部参数组合。

---

### Task 1: 地块素材键 src/tile-key.js（TDD 纯逻辑）

**Files:**
- Create: `src/tile-key.js`
- Test: `deploy/tests/tile-key.test.js`

**Interfaces:**
- Consumes: `src/data/maps/tiles.js` 默认导出的图例表（`tiles[ch].style`）。
- Produces: `tileKey(ch, col, row, tiles, sceneData)` → 字符串 key，形如 `'grass|g|1|3|0|0|'`。Task 3/4/5 全部依赖它；运行时和导出页必须用这同一个函数算 key。

- [ ] **Step 1: 先写失败测试**

`deploy/tests/tile-key.test.js`：

```js
'use strict';
import test from 'node:test';
import assert from 'node:assert';
import { tileKey } from '../../src/tile-key.js';
import tiles from '../../src/data/maps/tiles.js';

test('key 确定性：同参数同 key', () => {
  assert.equal(tileKey('.', 3, 4, tiles, {}), tileKey('.', 3, 4, tiles, {}));
});

test('key 以 66 为周期重复（标定地图 66×66 因此穷尽全部组合）', () => {
  for (const ch of ['.', 'g', 'B', '#', 'q']) {
    assert.equal(tileKey(ch, 5, 7, tiles, {}), tileKey(ch, 5 + 66, 7, tiles, {}), `${ch} 列周期`);
    assert.equal(tileKey(ch, 5, 7, tiles, {}), tileKey(ch, 5, 7 + 66, tiles, {}), `${ch} 行周期`);
  }
});

test('位置参数变化会改变 key（同字符不同位置的画面可能不同）', () => {
  const base = tileKey('.', 0, 0, tiles, {});
  assert.notEqual(tileKey('.', 1, 0, tiles, {}), base, 'parity 变化');
  assert.notEqual(tileKey('.', 6, 0, tiles, {}), base, '仅 seed 变化（列+6 保持 parity/book 不变）');
});

test('door 的 m 与 D 画法不同，key 必须区分', () => {
  assert.notEqual(tileKey('m', 0, 0, tiles, {}), tileKey('D', 0, 0, tiles, {}));
});

test('facade 亮窗只在 row===2 且 col%6===3，key 必须区分', () => {
  assert.notEqual(tileKey('F', 3, 2, tiles, {}), tileKey('F', 3, 3, tiles, {}));
  assert.notEqual(tileKey('F', 3, 2, tiles, {}), tileKey('F', 4, 2, tiles, {}));
});

test('chessSeat 的字进入 key', () => {
  const a = tileKey('z', 0, 0, tiles, { chessSeats: { '0,0': '車' } });
  const b = tileKey('z', 0, 0, tiles, { chessSeats: { '0,0': '馬' } });
  const c = tileKey('z', 0, 0, tiles, {});
  assert.notEqual(a, b);
  assert.notEqual(a, c);
});

test('未知字符按地板处理（与 drawTile 防呆一致）', () => {
  assert.ok(tileKey('~', 0, 0, tiles, {}).startsWith('floor|'));
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd /home/lxl/Desktop/work/vibe-game && node --test deploy/tests/tile-key.test.js
```

预期：FAIL，`Cannot find module '../../src/tile-key.js'`。

- [ ] **Step 3: 实现 tile-key.js**

`src/tile-key.js`：

```js
// tile-key.js —— 地块素材键：由 (字符, 列, 行) 算出唯一素材 key（纯逻辑，导出页与运行时共用）
// key 必须包含所有会影响该地块画面的位置参数，否则不同画面的地块会共用同一张图
// 参数周期 2(parity)/11(seed)/6(book,facade) 的最小公倍数为 66 —— 标定地图边长的依据

export function tileKey(ch, col, row, tiles, sceneData) {
  const t = tiles[ch];
  const style = t && t.style ? t.style : 'floor'; // 未知字符按地板处理（与 drawTile 防呆一致）
  const parity = (col + row) % 2;                 // 木地板/棋盘格/石板路/草地交替色
  const seed = (col * 17 + row * 31) % 11;        // drawTileDetails 纹理噪点种子
  const book = (col * 7 + row * 13) % 6;          // 书架书脊颜色组合
  const win = style === 'facade' && row === 2 && col % 6 === 3 ? 1 : 0; // 外墙周期亮窗
  const char = style === 'chessSeat' ? (sceneData?.chessSeats?.[`${col},${row}`] ?? '') : '';
  return [style, ch, parity, seed, book, win, char].join('|');
}
```

- [ ] **Step 4: 跑测试确认通过 + 全量回归**

```bash
node --test deploy/tests/tile-key.test.js   # 预期 PASS
node --test                                 # 预期：除 zdw.test.js 2 个已知失败外全绿
```

- [ ] **Step 5: Commit**

```bash
git add src/tile-key.js deploy/tests/tile-key.test.js
git commit -m "Add tile asset key function with period-66 coverage tests

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: 图片预加载器 src/assets.js

**Files:**
- Create: `src/assets.js`

**Interfaces:**
- Consumes: `src/assent/img/manifest.json`（Task 5 产物；本任务只需接口，不依赖文件已存在）。
- Produces: `loadAssets(baseUrl = 'src/assent/')` → `Promise<{count, missing}>`；`img(key)` → `Image | null`；`_register(key, image)` → 注入内存图（仅供 tools/export.html 把 canvas 当图注入，canvas 与 Image 一样可被 drawImage）。

说明：此模块依赖浏览器 `fetch`/`Image`，无法用 node:test 单测（项目无 DOM 测试设施），靠 Task 4/6 的浏览器验收覆盖——保持它极薄就是这个原因。

- [ ] **Step 1: 实现**

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
```

- [ ] **Step 2: Commit**

```bash
git add src/assets.js
git commit -m "Add image asset preloader reading manifest

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: tile-render.js 双路径拆分（旧路径改名 + 新组装函数）

**Files:**
- Modify: `src/tile-render.js`

**Interfaces:**
- Consumes: Task 1 的 `tileKey`、Task 2 的 `img`。
- Produces: `buildCanvasLegacy(sceneData, tiles)`（旧逐格绘制，逻辑一字不改，仅供导出页）；`buildSceneFromTiles(sceneData, tiles)`（新：素材图组装）；`buildCanvas` 保留为 `buildCanvasLegacy` 的别名导出（`scenes.js` 暂不受影响，Task 6 才切换）。**任务完成后游戏行为必须完全不变。**

- [ ] **Step 1: 改名旧路径（纯机械改动）**

- 文件顶部注释后加一行说明：`// buildCanvasLegacy 仅供 tools/export.html 导出素材用；运行时场景组装走 buildSceneFromTiles`
- `function buildCanvas(sceneData, tiles)` 改名为 `function buildCanvasLegacy(sceneData, tiles)`（函数体一个字符都不动）
- 文件末尾导出改为 `export { buildCanvasLegacy, buildSceneFromTiles, buildCanvas };` 并加 `const buildCanvas = buildCanvasLegacy; // 兼容别名，Task 6 切换 scenes.js 后移除`
- `STYLE_DRAW` / `drawTile` / `drawTileDetails` / decor 叠加等其余代码一律不动

- [ ] **Step 2: 新增素材组装函数**

文件顶部 import 区加：

```js
import { tileKey } from './tile-key.js';
import { img } from './assets.js';
```

`buildCanvasLegacy` 之后追加：

```js
// ---- 素材图组装（运行时路径） ----
let placeholderTile = null;
function getPlaceholderTile() { // 缺图格子的品红占位（缓存一张，避免每格重建）
  if (!placeholderTile) {
    placeholderTile = document.createElement('canvas');
    placeholderTile.width = placeholderTile.height = TILE * ART_SCALE;
    const c = placeholderTile.getContext('2d');
    c.fillStyle = '#ff00ff';
    c.fillRect(0, 0, placeholderTile.width, placeholderTile.height);
  }
  return placeholderTile;
}

// buildSceneFromTiles —— 每格按 tileKey 查素材图贴入；缺图画品红并报出全部缺失 key
function buildSceneFromTiles(sceneData, tiles) {
  const { rows, cols, grid } = parseMap(sceneData.map);
  const cv = document.createElement('canvas');
  cv.width = cols * TILE * ART_SCALE;
  cv.height = rows * TILE * ART_SCALE;
  const c2 = cv.getContext('2d');
  c2.imageSmoothingEnabled = false;
  const missing = new Set();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = 'tiles/' + tileKey(grid[r][c], c, r, tiles, sceneData);
      const image = img(key);
      if (image) {
        c2.drawImage(image, c * TILE * ART_SCALE, r * TILE * ART_SCALE);
      } else {
        missing.add(key);
        c2.drawImage(getPlaceholderTile(), c * TILE * ART_SCALE, r * TILE * ART_SCALE);
      }
    }
  }
  if (missing.size) console.error('[tile-render] 缺失地块素材：' + [...missing].join(', '));
  // decor：暖光/门垫的位置尺寸由地图配置驱动，保留代码叠加（与旧路径相同的画法）
  const decor = sceneData.decor;
  if (decor) {
    c2.setTransform(ART_SCALE, 0, 0, ART_SCALE, 0, 0);
    if (decor.light) { // 挑空暖光
      c2.globalAlpha = decor.light.alpha;
      c2.fillStyle = decor.light.color;
      c2.fillRect(decor.light.x * TILE, decor.light.y * TILE,
                  decor.light.w * TILE, decor.light.h * TILE);
      c2.globalAlpha = 1;
    }
    if (decor.mat) { // 门口垫子
      c2.fillStyle = '#8c3b40';
      c2.fillRect(decor.mat.col * TILE + 2, decor.mat.row * TILE + 6,
                  decor.mat.w * TILE - 4, TILE - 6);
      c2.fillStyle = '#a54a50';
      c2.fillRect(decor.mat.col * TILE + 4, decor.mat.row * TILE + 8,
                  decor.mat.w * TILE - 8, TILE - 10);
    }
  }
  return cv;
}
```

- [ ] **Step 3: 验证游戏行为不变**

```bash
node --test   # 预期：除 zdw.test.js 2 个已知失败外全绿
```

再手动冒烟：`python -m http.server 8000`（用 opencode 环境的 python），打开 `http://127.0.0.1:8000` 确认中庭画面正常（此时 scenes.js 仍走 buildCanvas 别名 = 旧路径）。Ctrl+C 关服务。

- [ ] **Step 4: Commit**

```bash
git add src/tile-render.js
git commit -m "Split tile rendering: legacy path for export, tile-image assembly for runtime

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: 导出页重写 tools/export.html（标定地图法 + 页内自检）

**Files:**
- Modify: `tools/export.html`（整体重写）

**Interfaces:**
- Consumes: Task 1 的 `tileKey`、Task 2 的 `_register`、Task 3 的 `buildCanvasLegacy` / `buildSceneFromTiles`。
- Produces: `window.__EXPORTS__`（key → 32×32 canvas）、`window.__SCENE_DIFF__`（内存素材组装 vs 旧路径对比，`{atrium: {hard: 0, soft: 0}, ...}`，hard 为超容差像素数）、`window.__DIFF__`（manifest 存在时的 PNG 回读二次校验，同构，首跑为 `null`）、`window.__EXPORTS_READY__ = true`。

- [ ] **Step 1: 重写导出页**

```html
<!doctype html>
<html lang="zh">
  <head><meta charset="UTF-8" /><title>NoteGame 资产导出</title></head>
  <body>
    <p>资产导出页：地块素材渲染挂 window.__EXPORTS__，由 tools/export.py 采集。</p>
    <script type="module">
      // 不 import scenes.js（模块加载即预渲染且带音频副作用），直接复用底层渲染函数
      import { MAPS } from '../src/data/maps/index.js';
      import TILES from '../src/data/maps/tiles.js';
      import { buildCanvasLegacy, buildSceneFromTiles } from '../src/tile-render.js';
      import { tileKey } from '../src/tile-key.js';
      import { TILE, ART_SCALE } from '../src/map.js';
      import { _register } from '../src/assets.js';

      const CELL = TILE * ART_SCALE; // 32
      const CAL = 66; // 位置参数周期 2/11/6 的最小公倍数，穷尽全部组合（见 tile-key.js 注释）
      const SCENES = ['atrium', 'reading', 'toilet', 'outside'];
      const chessChars = [...new Set(Object.values(MAPS.atrium.chessSeats ?? {}))];

      const AA_TOL = 16; // chessSeat 圆/字的 AA 渲染位置相关（见 Global Constraints），每通道差 ≤16 容忍
      function diffCanvas(a, b) { // 同尺寸 canvas 对比，返回 {hard, soft}：hard=任一通道差>16 的像素数
        if (a.width !== b.width || a.height !== b.height) return { hard: -1, soft: -1 };
        const d1 = a.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, a.width, a.height).data;
        const d2 = b.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, b.width, b.height).data;
        let hard = 0, soft = 0;
        for (let i = 0; i < d1.length; i += 4) {
          const d = Math.max(
            Math.abs(d1[i] - d2[i]), Math.abs(d1[i + 1] - d2[i + 1]),
            Math.abs(d1[i + 2] - d2[i + 2]), Math.abs(d1[i + 3] - d2[i + 3]));
          if (d > AA_TOL) hard++;
          else if (d > 0) soft++;
        }
        return { hard, soft };
      }

      // 1) 标定地图法：每个图例字符渲一张 66×66 合成地图，逐格裁出全部位置变体
      window.__EXPORTS__ = {};
      for (const ch of Object.keys(TILES)) {
        const isChess = TILES[ch].style === 'chessSeat';
        if (isChess && chessChars.length === 0) continue;
        const grid = Array.from({ length: CAL }, () => ch.repeat(CAL));
        const chessSeats = {};
        if (isChess) { // 12 种字轮转铺满全图，每种字都会落在各种 seed 位置上
          for (let r = 0; r < CAL; r++) {
            for (let c = 0; c < CAL; c++) chessSeats[`${c},${r}`] = chessChars[(r * CAL + c) % chessChars.length];
          }
        }
        const sceneData = { map: grid, chessSeats };
        const big = buildCanvasLegacy(sceneData, TILES);
        for (let r = 0; r < CAL; r++) {
          for (let c = 0; c < CAL; c++) {
            const key = 'tiles/' + tileKey(ch, c, r, TILES, sceneData);
            if (window.__EXPORTS__[key]) continue; // key 已含全部画面参数，同 key 必同图
            const cell = document.createElement('canvas');
            cell.width = cell.height = CELL;
            const ctx = cell.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(big, c * CELL, r * CELL, CELL, CELL, 0, 0, CELL, CELL);
            window.__EXPORTS__[key] = cell;
          }
        }
      }

      // 2) 页内自检：内存素材组装 4 个真实场景，与旧路径逐像素对比（必须为 0）
      for (const [key, canvas] of Object.entries(window.__EXPORTS__)) _register(key, canvas);
      window.__SCENE_DIFF__ = {};
      for (const name of SCENES) {
        const legacy = buildCanvasLegacy(MAPS[name], MAPS.tiles);
        const assembled = buildSceneFromTiles(MAPS[name], MAPS.tiles);
        window.__SCENE_DIFF__[name] = diffCanvas(legacy, assembled);
      }

      // 3) 二次校验：manifest 已存在时（非首跑），从磁盘 PNG 重载素材再组装再对比
      window.__DIFF__ = null;
      try {
        const res = await fetch('../src/assent/img/manifest.json');
        if (res.ok) {
          const manifest = await res.json();
          await Promise.all(Object.entries(manifest).map(([key, meta]) => new Promise((resolve) => {
            const image = new Image();
            image.onload = () => { _register(key, image); resolve(); }; // 覆盖同名内存 canvas
            image.onerror = () => resolve();
            image.src = '../src/assent/' + meta.path;
          })));
          window.__DIFF__ = {};
          for (const name of SCENES) {
            const legacy = buildCanvasLegacy(MAPS[name], MAPS.tiles);
            const assembled = buildSceneFromTiles(MAPS[name], MAPS.tiles);
            window.__DIFF__[name] = diffCanvas(legacy, assembled);
          }
        }
      } catch (e) { /* 首次导出：manifest 不存在，跳过二次校验 */ }

      window.__EXPORTS_READY__ = true;
    </script>
  </body>
</html>
```

注意：`buildSceneFromTiles` 会给 decor（暖光/门垫）叠加代码层，`buildCanvasLegacy` 也有同样叠加，两边一致，diff 应为 0。

- [ ] **Step 2: 修复 chessSeat 描边越界（独立提交）**

调试发现（2026-10-25，页内自检 atrium 差 1058px 追出）：`STYLE_DRAW.chessSeat` 的描边圆半径 7.5 + 线宽 1.5 → 外沿 8.25 > 8，向四边邻居各渗约 0.5px。素材化前提"地块内容不越界"被它打破（其余 17 种画法全是 fillRect 格内绘制，已实证不受影响）。用户拍板修圆：

`src/tile-render.js` chessSeat 中两处 `ctx.arc(x + 8, y + 8, 7.5, 0, Math.PI * 2)`（fill 与 stroke 各一处）改为半径 `7.2`，其余不动。

```bash
git add src/tile-render.js
git commit -m "Fix chessSeat circle bleeding 0.25px into neighbor cells (radius 7.5 -> 7.2)

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

- [ ] **Step 3: Commit**

```bash
git add tools/export.html
git commit -m "Rewrite export page with calibration-map tile cropping and in-page pixel self-check

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 5: 采集器重写 tools/export.py（去重 + 双重校验）+ 资源完整性测试重写

**Files:**
- Modify: `tools/export.py`（整体重写）
- Modify: `deploy/tests/assets.test.js`（整体重写）
- Delete: `src/assent/img/scenes/`（整图方案废弃，4 张旧场景图删除）

**Interfaces:**
- Consumes: Task 4 的 `__EXPORTS__` / `__SCENE_DIFF__` / `__DIFF__` / `__EXPORTS_READY__`。
- Produces: `src/assent/img/tiles/*.png` + `src/assent/img/manifest.json`，格式 `{ "tiles/<style|ch|parity|seed|book|win|char>": { "path": "img/tiles/<style>-NNN.png", "w": 32, "h": 32 } }`（同内容多 key 指向同一文件）。Task 6 的运行时按此消费。

- [ ] **Step 1: 先重写失败测试**

`deploy/tests/assets.test.js`（全文替换）：

```js
'use strict';
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAPS } from '../../src/data/maps/index.js';
import { tileKey } from '../../src/tile-key.js';

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
const manifestPath = path.join(root, 'src/assent/img/manifest.json');

test('manifest 覆盖 4 张地图实际用到的全部地块素材，且文件为合法 32×32 PNG', () => {
  assert.ok(existsSync(manifestPath), '缺少 src/assent/img/manifest.json（先跑 python tools/export.py）');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const checked = new Set();
  for (const name of ['atrium', 'reading', 'toilet', 'outside']) {
    const { map } = MAPS[name];
    for (let r = 0; r < map.length; r++) {
      for (let c = 0; c < map[r].length; c++) {
        const key = 'tiles/' + tileKey(map[r][c], c, r, MAPS.tiles, MAPS[name]);
        const meta = manifest[key];
        assert.ok(meta, `场景 ${name} (${c},${r}) 字符 '${map[r][c]}' 缺素材 ${key}`);
        assert.equal(meta.w, 32); assert.equal(meta.h, 32);
        if (checked.has(meta.path)) continue;
        checked.add(meta.path);
        const file = path.join(root, 'src/assent', meta.path);
        assert.ok(existsSync(file), `缺少文件 ${meta.path}`);
        const buf = readFileSync(file);
        assert.deepEqual([...buf.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${meta.path} 不是合法 PNG`);
        assert.equal(buf.toString('ascii', 12, 16), 'IHDR');
        assert.equal(buf.readUInt32BE(16), 32, `${meta.path} 宽度应为 32`);
        assert.equal(buf.readUInt32BE(20), 32, `${meta.path} 高度应为 32`);
        assert.ok(statSync(file).size > 50, `${meta.path} 文件过小，疑似空白`);
      }
    }
  }
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
node --test deploy/tests/assets.test.js
```

预期：FAIL——manifest 里场景整图 key（`scenes/atrium`）与测试期望的 `tiles/...` key 不符（旧 manifest 还在）。

- [ ] **Step 3: 重写采集器**

`tools/export.py`（全文替换）：

```python
#!/usr/bin/env python3
# export.py —— 用 Playwright 打开 tools/export.html，把地块素材 canvas 按内容去重存为 PNG 并写 manifest.json
# 用法：/home/lxl/miniforge3/envs/opencode/bin/python tools/export.py
import base64
import functools
import hashlib
import http.server
import json
import shutil
import socketserver
import sys
import threading
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
    """打开导出页，返回 (items, scene_diff, diff)。
    items: [{key, w, h, dataUrl}]；scene_diff: 内存素材自检；diff: PNG 回读二次校验（首跑为 None）"""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(f'http://127.0.0.1:{PORT}/tools/export.html')
        page.wait_for_function('window.__EXPORTS_READY__ === true')
        items = page.evaluate('''() => Object.entries(window.__EXPORTS__).map(([key, cv]) => ({
            key, w: cv.width, h: cv.height, dataUrl: cv.toDataURL('image/png')
        }))''')
        scene_diff = page.evaluate('() => window.__SCENE_DIFF__')
        diff = page.evaluate('() => window.__DIFF__')
        browser.close()
    return items, scene_diff, diff


def main():
    threading.Thread(target=serve_forever, daemon=True).start()
    items, scene_diff, _ = collect()

    # 页内自检：超容差（hard）差异必须为 0，否则不写任何文件
    if scene_diff is None:
        print('页内自检未运行（__SCENE_DIFF__ 为空）')
        sys.exit(1)
    bad = {k: v['hard'] for k, v in scene_diff.items() if v['hard'] != 0}
    if bad:
        print(f'页内自检失败（素材组装 ≠ 旧渲染，超容差差异）：{bad}')
        sys.exit(1)
    print('页内自检通过：' + ', '.join(f"{k} hard=0 soft={v['soft']}" for k, v in scene_diff.items()))

    # 全量重建 tiles/（删掉已不用的旧变体）；整图方案的 scenes/ 废弃删除
    tiles_dir = IMG_DIR / 'tiles'
    if tiles_dir.exists():
        shutil.rmtree(tiles_dir)
    tiles_dir.mkdir(parents=True, exist_ok=True)
    scenes_dir = IMG_DIR / 'scenes'
    if scenes_dir.exists():
        shutil.rmtree(scenes_dir)

    # 内容去重：相同 PNG 字节只存一份，多个 key 指向同一文件
    manifest, blob_to_file, counters = {}, {}, {}
    for item in items:
        assert item['w'] == 32 and item['h'] == 32, f"{item['key']} 尺寸 {item['w']}x{item['h']} 应为 32x32"
        png = base64.b64decode(item['dataUrl'].split(',', 1)[1])
        digest = hashlib.sha1(png).hexdigest()
        if digest not in blob_to_file:
            style = item['key'].split('|')[0].replace('tiles/', '')
            counters[style] = counters.get(style, 0) + 1
            filename = f"{style}-{counters[style]:03d}.png"
            (tiles_dir / filename).write_bytes(png)
            blob_to_file[digest] = filename
        manifest[item['key']] = {'path': f"img/tiles/{blob_to_file[digest]}", 'w': 32, 'h': 32}
    (IMG_DIR / 'manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    print(f"manifest.json 写入 {len(manifest)} 项，去重后文件 {len(blob_to_file)} 个")

    # 二次校验：重载页面，从磁盘 PNG 重载素材再组装再对比
    _, _, diff = collect()
    if diff is None:
        print('警告：二次校验未生效（manifest 未找到？）')
        sys.exit(1)
    bad = {k: v['hard'] for k, v in diff.items() if v['hard'] != 0}
    for k, v in diff.items():
        print(f"PNG 回读校验 {k}: hard={v['hard']} soft={v['soft']}")
    if bad:
        print(f'PNG 回读校验失败（超容差差异）：{bad}')
        sys.exit(1)
    print('PNG 回读校验通过 ✓')


if __name__ == '__main__':
    main()
```

若 8123 端口被占用（`Address already in use`），改 PORT 为 8124 重试。

- [ ] **Step 4: 跑采集器**

```bash
/home/lxl/miniforge3/envs/opencode/bin/python tools/export.py
```

预期输出："页内自检通过：atrium hard=0 soft=…（soft 仅 chessSeat AA 边缘，~90 量级）"、N 张导出（去重后文件数明显小于 key 数）、4 行"PNG 回读校验 … hard=0"、"PNG 回读校验通过 ✓"。

- [ ] **Step 5: 跑测试确认通过 + 全量回归**

```bash
node --test deploy/tests/assets.test.js   # 预期 PASS
node --test                               # 预期：除 zdw.test.js 2 个已知失败外全绿
```

- [ ] **Step 6: Commit**

```bash
git add tools/export.py deploy/tests/assets.test.js src/assent/img/
git commit -m "Export tile variant assets via calibration maps with content dedup

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 6: 运行时切换（scenes.js / main.js / index.html / style.css）

**Files:**
- Modify: `src/scenes.js`
- Modify: `src/main.js`
- Modify: `src/tile-render.js`（移除 `buildCanvas` 兼容别名）
- Modify: `index.html`（加 loading 元素）
- Modify: `style.css`（loading 样式）

**Interfaces:**
- Consumes: Task 2 的 `loadAssets`、Task 3 的 `buildSceneFromTiles`、Task 5 的 PNG 产物。
- Produces: `scenes.js` 继续导出 `scenes`（对象引用不变，`initScenes()` 填充）与 `initScenes()`；`render.js` 完全不动（`scenes[G.scene].canvas` 仍是 canvas）。

- [ ] **Step 1: scenes.js 改异步构建**

```js
// scenes.js —— 场景表（素材图组装）与进出房间
import { MAPS } from './data/maps/index.js';
import { buildSceneFromTiles } from './tile-render.js';
import { TILE } from './map.js';
import * as Sound from './audio.js';
import * as Bowls from './bowls.js';
import * as Mimi from './npc/mimi.js';

export const scenes = {}; // initScenes() 在资产加载后填充；import 方持有同一对象引用

export function initScenes() {
  for (const name of ['atrium', 'reading', 'toilet', 'outside']) {
    scenes[name] = { data: MAPS[name], canvas: buildSceneFromTiles(MAPS[name], MAPS.tiles) };
  }
}

// enterRoom / exitRoom 两个函数原样保留，一行不改
```

（`enterRoom`/`exitRoom` 从现有文件原样复制。）

- [ ] **Step 2: tile-render.js 移除兼容别名**

删除 `const buildCanvas = buildCanvasLegacy;` 一行，导出改为 `export { buildCanvasLegacy, buildSceneFromTiles };`。

- [ ] **Step 3: main.js 改异步启动 + 加载期守卫**

顶部 import 区：`import { scenes } from './scenes.js';` 改为：

```js
import { scenes, initScenes } from './scenes.js';
import * as Assets from './assets.js';
```

`const G = {...}` 整段改为 `let G = null;`（G 的内容移入下方 main()）。

`initKeyboard` 回调加守卫（用户在图片加载完成前按键时 G 还是 null）：

```js
initKeyboard((e) => {
  if (e.repeat) return; // 忽略系统自动重复，避免 M 键长按导致静音反复切换
  if (!G) return; // 资源加载完成前的按键直接忽略
  const k = e.key.toLowerCase();
  // ……其余原样……
});
bindTouchControls({ onInteract: () => { if (G) interact(G); }, onGesture: initAudio });
```

文件末尾的启动行 `requestAnimationFrame((t) => { lastT = t; requestAnimationFrame(loop); });` 替换为：

```js
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

- [ ] **Step 4: index.html 加 loading 元素**

在 `<div id="rotate-hint" …>` 之前插入：

```html
      <div id="loading" role="status">资源加载中…</div>
```

- [ ] **Step 5: style.css 加 loading 样式（追加到文件末尾）**

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

- [ ] **Step 6: 浏览器验收**

```bash
cd /home/lxl/Desktop/work/vibe-game && /home/lxl/miniforge3/envs/opencode/bin/python -m http.server 8000
```

打开 `http://127.0.0.1:8000` 逐项确认：
1. 先看到"资源加载中…"，随后进入游戏；
2. 中庭场景与改造前完全一致（墙/棋盘格/棋子凳汉字/暖光/门垫都在）；
3. 走进阅览室、卫生间、出门到室外，4 个场景画面正常；
4. 角色仍是代码渲染（本阶段预期），叠在素材场景上正常；
5. 开发者工具切手机模拟，移动端场景正常；
6. 控制台无 `[assets] 缺失图片` / `[tile-render] 缺失地块素材` 报错。

完成后 Ctrl+C 关服务。

- [ ] **Step 7: 全量测试 + Commit**

```bash
node --test   # 预期：除 zdw.test.js 2 个已知失败外全绿
git add src/scenes.js src/main.js src/tile-render.js index.html style.css
git commit -m "Assemble scenes from tile asset images at runtime

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 7: 阶段一总验收

**Files:** 无（纯验证）

- [ ] **Step 1: 重跑导出确认可重复**

```bash
/home/lxl/miniforge3/envs/opencode/bin/python tools/export.py
```

预期：页内自检 + PNG 回读校验双双通过。

- [ ] **Step 2: 验证"改地图不用重跑导出"（本方案的核心收益）**

临时把 `src/data/maps/outside.js` 里某格草地 `g` 改成树 `t`，**不重跑 export.py**，直接起 `python -m http.server 8000` 刷新游戏，确认室外对应位置变成树（素材早已全覆盖，布局改动即时生效）。然后 `git checkout src/data/maps/outside.js` 还原。

- [ ] **Step 3: 用户目视确认 4 场景 + 移动端后，记 token**

```bash
node tools/token-log.mjs --task "阶段一：场景元素素材化"
```

---

## Self-Review 记录

- 覆盖检查：tileKey 共享（Task 1）✓、预加载器（Task 2）✓、双路径拆分（Task 3）✓、标定地图导出 + 页内自检（Task 4）✓、去重采集 + 完整性测试（Task 5）✓、运行时切换 + loading + 守卫（Task 6）✓、地图可编辑性硬约束验证（Task 7 Step 2，本方案下不用重跑导出）✓。
- 已知取舍：`assets.js` / canvas 组装无 node 单测（依赖浏览器 API），由 Task 4 页内自检 + Task 5 双重校验 + Task 6 浏览器验收覆盖；阶段二（角色/道具换图）与阶段三（烘焙代码搬到 tools/export-lib/、README 更新）不在本计划内，各自单独出计划。
- 中间态说明：Task 3 完成后游戏行为不变（别名保留）；Task 4-5 只动 tools/ 与测试，运行时不受影响；Task 6 才切换运行时。
