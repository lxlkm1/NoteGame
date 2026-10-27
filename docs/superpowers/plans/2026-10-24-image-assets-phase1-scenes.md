# 图片资产管线 · 阶段一（导出管线 + 场景元素素材化）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立"浏览器导出页 + Playwright 采集"的导出管线，把场景渲染从逐格代码绘制换成"地块素材 PNG 按地图字符串组装"，画面逐像素不变，且改地图无需重跑导出。

**Architecture:** 导出侧：`tools/export.html` 用现有 `buildCanvasLegacy` 渲染 66×66"标定地图"（穷尽地块的全部位置参数组合），逐格裁成 32×32 素材 canvas；`tools/export.py`（Playwright）采集、按内容去重、存 PNG、写 `manifest.json`。运行时侧：`src/tile-key.js` 纯函数算出每格素材 key，`buildSceneFromTiles()` 查图组装场景；`src/assets.js` 预加载；`main.js` 启动改 async。角色/NPC 本阶段仍是代码渲染（并存）。

**Tech Stack:** 原生 JS（ES module）+ Canvas 2D；Python Playwright（opencode 环境）；node:test。

**设计文档:** [../specs/2026-10-24-image-assets-pipeline-design.md](../specs/2026-10-24-image-assets-pipeline-design.md)（元素素材方案见"场景图片粒度"决策行与"场景素材导出"节）
**绘制清单参照:** [../specs/2026-10-24-render-inventory.md](../specs/2026-10-24-render-inventory.md)

## Global Constraints

- **画面逐像素一致**：导出必须调用游戏现有的渲染函数（`buildCanvasLegacy`），禁止重写渲染逻辑。例外（2026-10-25 用户拍板的画面简化，Task 6.5/6.6）：chessSeat 半径 7.2、seed 噪点纹理移除、外墙去 parity 且亮窗拆为覆盖层——这些属既定画面变更，"一致"指素材组装与简化后代码渲染之间一致。
- **地图字符串是布局唯一事实来源**：`src/data/maps/*.js` 不动；碰撞/portal 判定不变；改地图布局不需要重跑导出（位置参数组合已全量导出），只有改画法（STYLE_DRAW）才需要。
- 像素风三件套：2d 上下文 `imageSmoothingEnabled = false`；CSS `image-rendering: pixelated`；绘制坐标 `Math.round` 取整。
- Python 一律用 `/home/lxl/miniforge3/envs/opencode/bin/python`（Playwright 在此环境）。
- 测试命令：`node --test`（测试文件放 `deploy/tests/`，跟随现有风格）。
- 代码注释用中文，风格跟随现有文件（`// 文件名 —— 职责` 开头）。
- **已知无关失败**：`deploy/tests/zdw.test.js` 有 2 个抓取测试失败（zdw WIP 现场，commit d95eeb5 已记录），不属于本计划范围，不要修。
- **chessSeat 圆半径已修为 7.2**（2026-10-25 调试发现：半径 7.5 + 描边半宽 0.75 = 外沿 8.25 > 8，向四边邻居渗色约 0.5px，打破素材化前提"地块内容不越界"；修圆属既定画面微调，用户已拍板）。
- **像素校验容差**：chessSeat 的圆/繁体字是抗锯齿渲染，Chromium 下同输入在不同绝对位置有亚像素差异（实验：792 对同 key 格子 551 对有 ≤16px 差异；fillRect 地块 0 差异）。diff 规则：**任一通道差 > 16 记硬差异（必须为 0）**；≤16 记 soft 仅供参考。
- **chessSeat key 归一化**（Task 6.5 起）：chessSeat 的 parity/seed/book 恒为 0（其画面只由棋字决定），其余风格公式不变。
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

### Task 6.5: chessSeat 素材 key 归一化（去 AA 噪点重复，2026-10-25 用户拍板）

**Files:**
- Modify: `src/tile-key.js`
- Test: `deploy/tests/tile-key.test.js`
- Re-export: `src/assent/img/`（重跑 export.py，产物随之更新）

**背景与依据（已源码核实，无需重查）：** chessSeat 画面只由棋字决定——`STYLE_DRAW.chessSeat`（tile-render.js:58-76）只画圆 + fillText 棋字，不读任何位置参数；`drawTileDetails` 的 chessSeat 分支（tile-render.js:252-255）只有一个固定 dot。但 key 里含 parity/seed/book，导致同一画面在不同绝对位置的 AA 亚像素差异（≤±11/通道）被 sha1 当成不同内容：52 个 chessSeat 文件语义上只值 12 个（每字一张）。归一化后预期：文件 277→237、manifest 条目 2057→1277（chessSeat 792→12）。其余 17 种地块已处语义最优（fillRect 确定性渲染，byte 级去重已到底），不动。

**Interfaces:**
- Consumes/Produces: `tileKey` 签名不变；chessSeat key 形如 `chessSeat|z|0|0|0|0|<字>`。导出页与运行时共用同一函数，一处改两边一致——export.html / buildSceneFromTiles / assets.test.js 均无需改。

- [ ] **Step 1: 先写失败测试**

`deploy/tests/tile-key.test.js` 追加：

```js
test('chessSeat 画面只由棋字决定：parity/seed/book 归 0，同字任意位置同 key', () => {
  const sceneData = { chessSeats: { '0,0': '車', '5,8': '車', '3,2': '馬' } };
  assert.equal(tileKey('z', 0, 0, tiles, sceneData), 'chessSeat|z|0|0|0|0|車');
  assert.equal(tileKey('z', 5, 8, tiles, sceneData), 'chessSeat|z|0|0|0|0|車', '同字不同位置（parity=1,seed=3,book=1 全变）仍同 key');
  assert.notEqual(tileKey('z', 3, 2, tiles, sceneData), tileKey('z', 0, 0, tiles, sceneData), '不同字不同 key');
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
node --test deploy/tests/tile-key.test.js
```

预期：FAIL——新测试断言 `chessSeat|z|0|0|0|0|車`，当前实现给出含位置参数的 key。

- [ ] **Step 3: tile-key.js 加归一化分支**

`src/tile-key.js` 全文替换为：

```js
// tile-key.js —— 地块素材键：由 (字符, 列, 行) 算出唯一素材 key（纯逻辑，导出页与运行时共用）
// key 必须包含所有会影响该地块画面的位置参数，否则不同画面的地块会共用同一张图
// 参数周期 2(parity)/11(seed)/6(book,facade) 的最小公倍数为 66 —— 标定地图边长的依据

export function tileKey(ch, col, row, tiles, sceneData) {
  const t = tiles[ch];
  const style = t && t.style ? t.style : 'floor'; // 未知字符按地板处理（与 drawTile 防呆一致）
  const char = style === 'chessSeat' ? (sceneData?.chessSeats?.[`${col},${row}`] ?? '') : '';
  if (style === 'chessSeat') {
    // chessSeat 画面只由棋字决定：STYLE_DRAW.chessSeat 不读位置参数，drawTileDetails 仅固定 dot
    // （tile-render.js:252）。parity/seed/book 归 0，避免 AA 亚像素噪点把同一画面炸成 52 张冗余图
    return [style, ch, 0, 0, 0, 0, char].join('|');
  }
  const parity = (col + row) % 2;                 // 木地板/棋盘格/石板路/草地交替色
  const seed = (col * 17 + row * 31) % 11;        // drawTileDetails 纹理噪点种子
  const book = (col * 7 + row * 13) % 6;          // 书架书脊颜色组合
  const win = style === 'facade' && row === 2 && col % 6 === 3 ? 1 : 0; // 外墙周期亮窗
  return [style, ch, parity, seed, book, win, char].join('|');
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
node --test deploy/tests/tile-key.test.js
```

预期：8/8 PASS（66 周期等旧测试不含 `'z'`，不受影响）。

- [ ] **Step 5: 重跑导出**

```bash
/home/lxl/miniforge3/envs/opencode/bin/python tools/export.py
```

预期：页内自检 4 场景 hard 全 0（soft 计数仅参考，方向不定——实测由 90 降为 42）；"manifest.json 写入 1277 项，去重后文件 237 个"（chessSeat 条目 792→12：可达 (parity,seed,book) 组合实为 66 种/字——book 与 parity 同源于 (col+row)，非独立——12 字 × 66 = 792，早前摘要误估 1584 导致 485 的预估作废）；PNG 回读校验 4 场景 hard 全 0、通过 ✓。

- [ ] **Step 6: 全量回归 + Commit**

```bash
node --test   # 除 zdw.test.js 2 个已知失败外全绿（assets.test.js 按新公式算 key 查 manifest，自动适配）
git add src/tile-key.js deploy/tests/tile-key.test.js src/assent/img/
git commit -m "Normalize chessSeat tile keys to dedupe AA noise variants

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 6.6: 地块去噪简化 + 外墙亮窗覆盖层（2026-10-25 用户拍板：墙=1 张、窗户单独 1 张、其余风格只留真变体）

**Files:**
- Modify: `src/tile-render.js`（删 seed 噪点、facade 去 parity、亮窗抽成覆盖层函数、组装路径叠加亮窗）
- Modify: `src/tile-key.js`（按"画面实际使用的参数"归一化）
- Modify: `tools/export.html`（导出亮窗覆盖层）
- Test: `deploy/tests/tile-key.test.js`、`deploy/tests/assets.test.js`
- Re-export: `src/assent/img/`（重跑 export.py）

**背景与依据（已源码核实）：** 用户要求素材瘦身。种子噪点（seed dot）撑起了 wall 11 / floor 12 / facade 33 / 草地家族各 22 / pavement 22 / table 22 的文件数，用户拍板全部移除（画面变素是既定取舍）。外墙亮窗从 facade 画法中拆出为**透明底覆盖层 PNG**（`tiles/facade-window`），运行时按 win 公式位置叠加——亮窗位置不再需要进 key。书架底色被木框整格覆盖（parity 不可见），key 的 parity 归 0。**保留的真变体**：parity 深浅交替（floor/chessFloor/草地家族/pavement/table/chair）、bookshelf 6 种书脊、chessSeat 12 字、门 3 种画法。

预期结果：**46 个 PNG 文件、47 条 manifest**（逐项：wall1 / floor2 / chessFloor2 / chessSeat12 / bigDoor M+W 共 2 条目 1 文件 / door m+D 各 1 / outsideDoor1 / facade1 / facade-window 1 / pavement2 / grass/tree/shrub/lamp/bench 各 2 / bookshelf6 / table2 / chair2 / toilet1）。若实际数字不符，报 DONE_WITH_CONCERNS 给实际值，不要硬凑。

**Interfaces:**
- Produces: 新导出符号 `drawFacadeWindow32(ctx, x32, y32)`（tile-render.js，32px 无变换坐标系画完整亮窗）；新素材 key `tiles/facade-window`（透明底 32×32，无 `|` 分隔段）
- Consumes: 其余接口不变

- [ ] **Step 1: 先改测试（失败）**

`deploy/tests/tile-key.test.js`：

(a) 把"位置参数变化会改变 key"测试整体替换为：

```js
test('位置参数只影响使用该参数的风格（去噪后 seed 不再属于任何风格）', () => {
  const base = tileKey('.', 0, 0, tiles, {});
  assert.notEqual(tileKey('.', 1, 0, tiles, {}), base, 'floor parity 变化');
  assert.notEqual(tileKey('B', 1, 0, tiles, {}), tileKey('B', 0, 0, tiles, {}), 'bookshelf book 变化');
  assert.equal(tileKey('g', 6, 0, tiles, {}), tileKey('g', 0, 0, tiles, {}), 'grass seed 已移除（列+6 不再改变 key）');
});
```

(b) 追加：

```js
test('墙/外墙/门等画面固定：任意位置同 key', () => {
  assert.equal(tileKey('#', 0, 0, tiles, {}), tileKey('#', 7, 9, tiles, {}));
  assert.equal(tileKey('F', 3, 2, tiles, {}), tileKey('F', 4, 5, tiles, {}), 'facade 亮窗位置不再进 key（窗户是覆盖层）');
  assert.equal(tileKey('m', 0, 0, tiles, {}), tileKey('m', 11, 13, tiles, {}));
  assert.notEqual(tileKey('m', 0, 0, tiles, {}), tileKey('D', 0, 0, tiles, {}), 'm 与 D 画法不同仍需区分');
});
```

`deploy/tests/assets.test.js` 追加：

```js
test('manifest 含外墙亮窗覆盖层', () => {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const meta = manifest['tiles/facade-window'];
  assert.ok(meta, '缺 tiles/facade-window（先跑 python tools/export.py）');
  assert.equal(meta.w, 32); assert.equal(meta.h, 32);
});
```

跑 `node --test deploy/tests/tile-key.test.js deploy/tests/assets.test.js` 确认失败。

- [ ] **Step 2: tile-key.js 全文替换**

```js
// tile-key.js —— 地块素材键：由 (字符, 列, 行) 算出唯一素材 key（纯逻辑，导出页与运行时共用）
// key 只含会影响该地块画面的参数（2026-10-25 去噪简化后 seed 纹理已移除，多数风格 key 与位置无关；
// 外墙亮窗是覆盖层素材 tiles/facade-window，不进 key）

// 各风格画面实际使用的位置参数：不在表中的风格 parity/seed/book/win 全归 0（画面固定）
const STYLE_PARAMS = {
  floor: { parity: true },     // 木地板深浅交替
  chessFloor: { parity: true },
  grass: { parity: true }, tree: { parity: true }, shrub: { parity: true },
  lamp: { parity: true }, bench: { parity: true },   // 草地家族：草地底色交替
  pavement: { parity: true },
  table: { parity: true }, chair: { parity: true },  // 暖木底色交替
  bookshelf: { book: true },   // 书脊颜色组合（底色被木框整格覆盖，parity 不可见）
};

export function tileKey(ch, col, row, tiles, sceneData) {
  const t = tiles[ch];
  const style = t && t.style ? t.style : 'floor'; // 未知字符按地板处理（与 drawTile 防呆一致）
  if (style === 'chessSeat') {
    // chessSeat 画面只由棋字决定：STYLE_DRAW.chessSeat 不读位置参数，drawTileDetails 仅固定 dot
    const char = sceneData?.chessSeats?.[`${col},${row}`] ?? '';
    return [style, ch, 0, 0, 0, 0, char].join('|');
  }
  const use = STYLE_PARAMS[style] || {};
  const parity = use.parity ? (col + row) % 2 : 0;
  const book = use.book ? (col * 7 + row * 13) % 6 : 0;
  return [style, ch, parity, 0, book, 0, ''].join('|');
}
```

- [ ] **Step 3: tile-render.js 去噪 + 亮窗覆盖层**

(a) `STYLE_DRAW.facade` 整体替换为（去掉 parity 与亮窗块）：

```js
  facade(ctx, x, y) { // 图书馆外墙：纯色 + 顶部亮线；亮窗是覆盖层 drawFacadeWindow32，不画在这里
    ctx.fillStyle = '#575169';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#6b6476'; ctx.fillRect(x, y, TILE, 2);
  },
```

(b) 在 `drawTileDetails` 之前插入：

```js
// 外墙亮窗覆盖层（32px 无变换坐标系画完整亮窗）：旧路径细节层调用它；
// 导出页用它生成透明底 tiles/facade-window.png，运行时在同位置 drawImage 叠加——两处共用保证像素一致
function drawFacadeWindow32(ctx, x, y) {
  ctx.fillStyle = '#312b40'; ctx.fillRect(x + 2, y + 2, 28, 28);
  ctx.fillStyle = '#e8bd75'; ctx.fillRect(x + 6, y + 6, 20, 20);
  ctx.fillStyle = '#7d6070'; ctx.fillRect(x + 14, y + 6, 4, 20);
  ctx.fillStyle = '#f8dca0'; ctx.fillRect(x + 8, y + 7, 2, 10);
  ctx.fillStyle = '#b48657'; ctx.fillRect(x + 22, y + 10, 1, 15);
}
```

(c) `drawTileDetails` 内：
- 删除 `const seed = (col * 17 + row * 31) % 11;` 一行（去噪后不再有任何使用）
- `case 'floor':` 整个分支删除（两条 dot 都是 seed 条件）
- `case 'wall': case 'facade':` 分支替换为：

```js
    case 'wall':
    case 'facade':
      dot('#716b80', 2, 2, 27, 1);
      dot('#3d3948', 1, 19, 30, 1);
      if (style === 'facade' && row === 2 && col % 6 === 3) drawFacadeWindow32(ctx, x, y);
      break;
```

- `case 'pavement':` 删 `dot('#a3a0a4', 7 + seed, 22, 3, 1);` 一行
- 草地家族分支（grass/tree/shrub/lamp/bench）删 `dot('#6d9473', 3 + seed, 26, 1, 3);` 一行
- `case 'table':` 删 `dot('#aa754b', 4 + seed, 13, 13, 1);` 一行

(d) `buildSceneFromTiles` 格子循环内，`if (image) {...} else {...}` 块之后插入：

```js
      // 外墙亮窗覆盖层：位置由 win 公式决定（与 drawTileDetails 的 facade 分支同一公式）
      const style = tiles[grid[r][c]] && tiles[grid[r][c]].style;
      if (style === 'facade' && r === 2 && c % 6 === 3) {
        const winImg = img('tiles/facade-window');
        if (winImg) c2.drawImage(winImg, c * TILE * ART_SCALE, r * TILE * ART_SCALE);
        else missing.add('tiles/facade-window');
      }
```

(e) 导出行改为 `export { buildCanvasLegacy, buildSceneFromTiles, drawFacadeWindow32 };`

- [ ] **Step 4: export.html 导出覆盖层**

import 行加 `drawFacadeWindow32`。在标定地图裁剪循环之后、页内自检之前插入：

```js
      // 亮窗覆盖层：透明底 32×32（与旧路径细节层共用同一函数，像素一致由页内自检兜底）
      const winCv = document.createElement('canvas');
      winCv.width = winCv.height = CELL;
      drawFacadeWindow32(winCv.getContext('2d'), 0, 0);
      window.__EXPORTS__['tiles/facade-window'] = winCv;
```

- [ ] **Step 5: 重跑导出**

```bash
/home/lxl/miniforge3/envs/opencode/bin/python tools/export.py
```

预期：页内自检 + PNG 回读 4 场景 hard 全 0（soft 全 0 或仅 chessSeat AA）；**manifest 47 项、去重后 46 个文件**。数字不符报 DONE_WITH_CONCERNS 给实际值。

- [ ] **Step 6: 全量回归 + Commit**

```bash
node --test   # 除 zdw.test.js 2 个已知失败外全绿
git add src/tile-render.js src/tile-key.js tools/export.html deploy/tests/ src/assent/img/
git commit -m "Simplify tile textures and extract facade window as overlay asset

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 6.7: 极限压缩（每风格 1 张；书架/地板/棋盘格保留变化，2026-10-26 用户拍板）

**Files:**
- Modify: `src/tile-render.js`（草地/石板路底色固定、桌椅木底固定）
- Modify: `src/tile-key.js`（STYLE_PARAMS 表收缩）
- Test: `deploy/tests/tile-key.test.js`
- Re-export: `src/assent/img/`（重跑 export.py）

**背景：** 用户要求"尽可能使用最少的图片还原游戏效果"。parity 深浅交替只保留在**大面积可见**的 floor（房间地板）与 chessFloor（棋盘格必须双色）；草地家族/石板路/桌椅的交替色视觉效果弱，全部固定为单色。**书架 6 种书脊序列用户明确保留**（每格 4 本书颜色不同，书架之间也不同）。预期：46 → **38 个文件**、47 → **39 条 manifest**（逐项：wall1 / floor2 / chessFloor2 / chessSeat12 / bigDoor 2 条目 1 文件 / door m+D 各 1 / outsideDoor1 / facade1 / facade-window1 / pavement1 / grass/tree/shrub/lamp/bench 各 1 / bookshelf6 / table1 / chair1 / toilet1）。数字不符报 DONE_WITH_CONCERNS 给实际值，不要硬凑。

**关键原则：key 归一化必须和画法固定同步改**——只改 key 不改画法会让页内自检 hard>0（组装用一张图 vs 旧路径随位置变化），这正是双校验的兜底价值。

- [ ] **Step 1: 先写失败测试**

`deploy/tests/tile-key.test.js` 追加：

```js
test('草地家族/石板路/桌椅底色固定：parity 不再进 key（floor/chessFloor 保留）', () => {
  for (const ch of ['g', 't', 's', 'l', 'b', 'p', 'T', 'c']) {
    assert.equal(tileKey(ch, 0, 0, tiles, {}), tileKey(ch, 1, 0, tiles, {}), `${ch} parity 已移除`);
  }
  assert.notEqual(tileKey('.', 0, 0, tiles, {}), tileKey('.', 1, 0, tiles, {}), 'floor parity 保留');
  assert.notEqual(tileKey('q', 0, 0, tiles, {}), tileKey('q', 1, 0, tiles, {}), 'chessFloor parity 保留');
  assert.notEqual(tileKey('B', 0, 0, tiles, {}), tileKey('B', 1, 0, tiles, {}), 'bookshelf book 保留');
});
```

跑 `node --test deploy/tests/tile-key.test.js` 确认新测试失败（前 8 个断言全失败：这些风格 key 目前含 parity）。

- [ ] **Step 2: tile-render.js 底色固定（4 处替换）**

(a) `STYLE_DRAW.grass`：`ctx.fillStyle = (col + row) % 2 ? '#3e6654' : '#426d58';` 改为 `ctx.fillStyle = '#426d58';`，签名 `(ctx, x, y, col, row)` 改为 `(ctx, x, y)`。

(b) `STYLE_DRAW.pavement`：`ctx.fillStyle = (col + row) % 2 ? '#6f6e78' : '#797984';` 改为 `ctx.fillStyle = '#797984';`，签名同样去掉 col/row。

(c) `STYLE_DRAW.table`：`drawWoodBase(ctx, x, y, col, row);` 改为 `ctx.fillStyle = '#63503e'; ctx.fillRect(x, y, TILE, TILE); // 底色固定（不再随 parity 交替）`。

(d) `STYLE_DRAW.chair`：同 (c) 的替换。

注意：`drawWoodBase` 本身保留不动——floor 与 bookshelf 仍在用（bookshelf 底色被木框整格覆盖，parity 不可见，无需改）。

顺手修 export.html 陈旧注释（Task 6.6 审查 Minor）：`const CAL = 66; // 位置参数周期 2/11/6 的最小公倍数` 改为 `const CAL = 66; // 标定地图边长：充分覆盖剩余位置参数周期（parity 2 / book 6）`。

- [ ] **Step 3: tile-key.js 的 STYLE_PARAMS 表收缩**

```js
// 各风格画面实际使用的位置参数：不在表中的风格 parity/seed/book/win 全归 0（画面固定）
const STYLE_PARAMS = {
  floor: { parity: true },      // 木地板深浅交替（大面积视觉特征，保留）
  chessFloor: { parity: true }, // 棋盘格必须双色
  bookshelf: { book: true },    // 书脊颜色组合（用户拍板保留变化）
};
```

文件头注释第二行改为：`// key 只含会影响该地块画面的参数（2026-10-26 极限压缩后仅 floor/chessFloor 保留 parity、bookshelf 保留 book；`

- [ ] **Step 4: 跑测试确认通过**

```bash
node --test deploy/tests/tile-key.test.js   # 预期 10/10 PASS
```

- [ ] **Step 5: 重跑导出**

```bash
/home/lxl/miniforge3/envs/opencode/bin/python tools/export.py
```

预期：页内自检 + PNG 回读 4 场景 hard 全 0（soft 仅 atrium ~42）；**manifest 39 项、去重后 38 个文件**。

- [ ] **Step 6: 全量回归 + Commit**

```bash
node --test   # 除 zdw.test.js 2 个已知失败外全绿
git add src/tile-render.js src/tile-key.js tools/export.html deploy/tests/tile-key.test.js src/assent/img/
git commit -m "Fix grass-family, pavement and furniture tiles to single variants

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

- 覆盖检查：tileKey 共享（Task 1）✓、预加载器（Task 2）✓、双路径拆分（Task 3）✓、标定地图导出 + 页内自检（Task 4）✓、去重采集 + 完整性测试（Task 5）✓、运行时切换 + loading + 守卫（Task 6）✓、chessSeat key 归一化去 AA 噪点重复（Task 6.5，2026-10-25 用户拍板）✓、地图可编辑性硬约束验证（Task 7 Step 2，本方案下不用重跑导出）✓。
- 已知取舍：`assets.js` / canvas 组装无 node 单测（依赖浏览器 API），由 Task 4 页内自检 + Task 5 双重校验 + Task 6 浏览器验收覆盖；阶段二（角色/道具换图）与阶段三（烘焙代码搬到 tools/export-lib/、README 更新）不在本计划内，各自单独出计划。
- 中间态说明：Task 3 完成后游戏行为不变（别名保留）；Task 4-5 只动 tools/ 与测试，运行时不受影响；Task 6 才切换运行时。
