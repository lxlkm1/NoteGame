# 图书馆喂猫小游戏 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一个像素风网页小游戏——在图书馆里走动、找到 10 只猫并投喂它们（纯治愈，无目标无结局）。

**Architecture:** 纯 HTML + Canvas + 原生 JS，零依赖零构建。4 个 JS 文件各管一摊：`sprites.js`（像素矩阵资源）、`map.js`（地图+碰撞）、`cats.js`（猫状态机，纯逻辑）、`main.js`（游戏循环+输入+人物）。逻辑与渲染分离：前三个文件不引用 DOM，可在 Node 里直接单测；`main.js` 负责组装渲染。

**Tech Stack:** HTML5 Canvas、原生 JavaScript（classic script 全局命名空间 + CJS 兼容导出）、Node 内置 `node:test`、Playwright（webapp-testing 技能，仅用于截图验证）。

## Global Constraints

- 逻辑分辨率 480×320（tile 16px，地图 30×20 格），CSS 放大 2 倍，`image-rendering: pixelated`。
- **零 npm 依赖、零构建**。不用 ES modules（`file://` 双击打开会被 CORS 拦截），用 classic `<script>` 顺序加载 + 全局命名空间，文件末尾 2 行 CJS 导出让 Node 测试能 `require`。
- `js/sprites.js`、`js/map.js`、`js/cats.js` 顶层**不得**引用 `document` / `window`（Node 兼容）；DOM 只出现在 `main.js` 和各文件的渲染函数内部。
- 游戏 UI 文案全部中文。
- 固定数值：玩家速度 70px/s；投喂距离 40px；好感度 5 心；猫吃食时长 1.6s；跟随时长 8s。
- 猫的移动不查地图碰撞（领地设计保证不穿模；跟随穿家具角落是接受的简化）。
- 测试命令统一为 `node --test tests/`（在 `/home/lxl/Desktop/work/vibe-game` 下运行）。
- 每个任务完成即 `git commit`。
- （相对 spec 的一处微调：JS 从 3 个文件拆为 4 个——`sprites.js` 独立放像素矩阵，因为人物和猫共用 `drawSprite`，改造型时只动这一个文件。）

---

### Task 1: 项目骨架与游戏循环

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `js/main.js`
- Create: `package.json`
- Create: `docs/screenshots/`（截图目录）

**Interfaces:**
- Consumes: 无（起点）
- Produces: 可运行页面 + 游戏循环骨架（`loop(t)` / delta time 模式，后续任务在此文件上扩展）

- [ ] **Step 1: 写 `package.json`**

```json
{
  "name": "library-cats",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "test": "node --test tests/"
  }
}
```

- [ ] **Step 2: 写 `index.html`**

```html
<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>图书馆喂猫 · Library Cats</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<div id="game-wrap">
  <canvas id="game" width="480" height="320"></canvas>
  <div id="hud">📚 图书馆的猫 <span class="hint">WASD / 方向键移动</span></div>
</div>
<script src="js/sprites.js"></script>
<script src="js/map.js"></script>
<script src="js/cats.js"></script>
<script src="js/main.js"></script>
</body>
</html>
```

（此时 sprites/map/cats 尚未创建，先创建占位文件避免 404，Task 2-4 填实。）

- [ ] **Step 3: 写占位文件 `js/sprites.js`、`js/map.js`、`js/cats.js`**

每个文件内容仅两行：

```js
// sprites.js —— 像素矩阵资源库（Task 3 填实）
const Sprites = {};
if (typeof module !== 'undefined') module.exports = Sprites;
```

```js
// map.js —— 图书馆地图（Task 2 填实）
const MapKit = {};
if (typeof module !== 'undefined') module.exports = MapKit;
```

```js
// cats.js —— 猫咪状态机（Task 4 填实）
const Cats = {};
if (typeof module !== 'undefined') module.exports = Cats;
```

- [ ] **Step 4: 写 `style.css`**

```css
html, body {
  margin: 0;
  min-height: 100vh;
  background: #1a181f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Courier New", monospace;
}
#game-wrap { position: relative; }
#game {
  width: 960px;
  height: 640px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  background: #2b2633;
  border-radius: 4px;
  box-shadow: 0 8px 40px rgba(0,0,0,.5);
}
#hud {
  position: absolute;
  top: -26px;
  left: 2px;
  color: #e8dcc8;
  font-size: 14px;
}
#hud .hint { color: #8d8496; margin-left: 12px; font-size: 12px; }
@media (max-width: 1000px) {
  #game { width: 480px; height: 320px; }
}
```

- [ ] **Step 5: 写 `js/main.js`（游戏循环骨架 + 呼吸色块验证）**

```js
// main.js —— 游戏循环 + 输入 + 人物 + 投喂交互
(function () {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  let lastT = 0;

  function loop(t) {
    const dt = Math.min((t - lastT) / 1000, 0.05); // 秒，上限防跳帧
    lastT = t;
    update(dt, t / 1000);
    render(t / 1000);
    requestAnimationFrame(loop);
  }

  function update(dt) { /* Task 3+: 人物/猫/粒子 */ }

  function render(now) {
    ctx.fillStyle = '#2b2633';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // 临时验证：屏幕中央呼吸色块，证明循环活着（Task 3 移除）
    const s = 20 + Math.sin(now * 2) * 6;
    ctx.fillStyle = '#ef9f4d';
    ctx.fillRect(240 - s / 2, 160 - s / 2, s, s);
  }

  requestAnimationFrame((t) => { lastT = t; requestAnimationFrame(loop); });
})();
```

- [ ] **Step 6: 浏览器验证循环在跑**

用 webapp-testing 技能（Playwright）打开 `index.html`（`file://` 打开即可，本任务无模块加载），连拍两张间隔 500ms 的截图存 `docs/screenshots/task1-a.png`、`task1-b.png`。
预期：深紫背景中央有一个橘色方块，两张截图方块大小不同（呼吸动画）。

- [ ] **Step 7: Commit**

```bash
cd /home/lxl/Desktop/work/vibe-game
git add index.html style.css js/ package.json
git commit -m "feat: 项目骨架与游戏循环（Canvas 480x320 + 呼吸色块验证）"
```

---

### Task 2: 图书馆地图——数据、解析、碰撞、渲染

**Files:**
- Create: `tests/map.test.js`
- Modify: `js/map.js`（整体替换占位内容）

**Interfaces:**
- Consumes: 无
- Produces: 全局 `MapKit`，字段：
  - `TILE`（=16，number）
  - `MAP`（string[20]，每行 30 字符）
  - `parseMap()` → `{ rows: 20, cols: 30, grid: string[][] }`，尺寸不符 throw
  - `isSolidAtPx(px, py)` → boolean（像素坐标查碰撞；越界 = true）
  - `buildMapCanvas()` → HTMLCanvasElement（预渲染整张地图；只允许 main.js 在浏览器调用）
  - 图例：`#`墙 `.`地板 `B`书架 `T`桌 `c`椅(可通行) `W`窗台 `P`绿植 `d`借阅台 `D`门

- [ ] **Step 1: 写失败测试 `tests/map.test.js`**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { TILE, MAP, parseMap, isSolidAtPx } = require('../js/map.js');

test('地图尺寸：20 行，每行 30 字符', () => {
  assert.equal(MAP.length, 20);
  for (const row of MAP) assert.equal(row.length, 30);
});

test('parseMap 返回网格且四角是墙', () => {
  const { rows, cols, grid } = parseMap();
  assert.equal(rows, 20);
  assert.equal(cols, 30);
  assert.equal(grid[0][0], '#');
  assert.equal(grid[19][29], '#');
});

test('碰撞：墙/书架/桌/窗台/绿植/借阅台不可通行，地板/椅子可通行', () => {
  const solid = (c, r) => isSolidAtPx(c * TILE + 8, r * TILE + 8);
  assert.equal(solid(0, 0), true);   // 墙
  assert.equal(solid(3, 3), true);   // 书架
  assert.equal(solid(13, 11), true); // 桌
  assert.equal(solid(3, 1), true);   // 窗台
  assert.equal(solid(20, 1), true);  // 绿植（窗边 col20）
  assert.equal(solid(24, 15), true); // 借阅台
  assert.equal(solid(15, 19), true); // 门
  assert.equal(solid(10, 18), false); // 地板（出生点）
  assert.equal(solid(14, 10), false); // 椅子
});

test('越界坐标视为不可通行', () => {
  assert.equal(isSolidAtPx(-5, -5), true);
  assert.equal(isSolidAtPx(5000, 5000), true);
});

test('连通性：出生点到所有猫位邻域可达（BFS）', () => {
  const { grid } = parseMap();
  const walk = (c, r) => ' .c'.includes(grid[r][c]);
  const start = [10, 18];
  const seen = new Set([start.join(',')]);
  const queue = [start];
  while (queue.length) {
    const [c, r] = queue.shift();
    for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nc = c + dc, nr = r + dr;
      const key = nc + ',' + nr;
      if (nc < 0 || nr < 0 || nc >= 30 || nr >= 20) continue;
      if (!walk(nc, nr) || seen.has(key)) continue;
      seen.add(key);
      queue.push([nc, nr]);
    }
  }
  // 10 只猫各自邻域至少一个可走格
  const catSpots = [
    [3, 2], [11, 2], [15, 2],   // 雪球/团团/汤圆（窗台下）
    [18, 2], [4, 2], [8, 6],    // 布丁/煤球/墨墨
    [14, 10], [22, 2], [24, 14],// 奶糖(桌旁椅子)/芝麻/灰灰
    [15, 17],                   // 花卷（门边）
  ];
  for (const [c, r] of catSpots) {
    assert.equal(seen.has(c + ',' + r), true, `猫位 (${c},${r}) 不可达`);
  }
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /home/lxl/Desktop/work/vibe-game && node --test tests/`
Expected: FAIL（`MAP.length` 为 0 / Cannot read properties of undefined）

- [ ] **Step 3: 实现 `js/map.js`（完整替换占位）**

```js
// map.js —— 图书馆地图：数据、解析、碰撞、预渲染
const MapKit = (() => {
  'use strict';
  const TILE = 16;

  // 30 列 × 20 行。图例：# 墙 | . 地板 | B 书架 | T 桌 | c 椅(可走) | W 窗台 | P 绿植 | d 借阅台 | D 门
  const MAP = [
    '##############################',
    '#..W...W...W...W...W....PP...#',
    '#............................#',
    '#..BBBB..BBBB................#',
    '#..BBBB..BBBB................#',
    '#..BBBB..BBBB................#',
    '#..BBBB..BBBB................#',
    '#..BBBB..BBBB................#',
    '#..BBBB..BBBB................#',
    '#............................#',
    '#.............cc.....cc......#',
    '#............TTTT...TTTT.....#',
    '#............TTTT...TTTT.....#',
    '#.............cc.....cc......#',
    '#............................#',
    '#.....................dddddd.#',
    '#.....................dddddd.#',
    '#.PP........................#',
    '#............................#',
    '##############DD#############',
  ];

  const SOLID_CHARS = new Set(['#', 'B', 'T', 'W', 'P', 'd', 'D']);

  function parseMap() {
    const rows = MAP.length;
    const cols = MAP[0].length;
    if (rows !== 20 || cols !== 30) {
      throw new Error(`地图尺寸错误：期望 30x20，实际 ${cols}x${rows}`);
    }
    const grid = MAP.map((row) => row.split(''));
    return { rows, cols, grid };
  }

  function isSolidAtPx(px, py) {
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (col < 0 || row < 0 || col >= 30 || row >= 20) return true;
    return SOLID_CHARS.has(MAP[row][col]);
  }

  // ---- 渲染（只在浏览器调用） ----
  const BOOK_COLORS = ['#c25b4e', '#4e7cc2', '#c2a84e', '#5cb27a', '#a05cc2', '#c27b4e'];

  function drawTile(ctx, ch, col, row) {
    const x = col * TILE, y = row * TILE;
    if (ch === '#') { // 墙：深紫灰 + 顶部亮线
      ctx.fillStyle = '#4a4453';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#5a5266';
      ctx.fillRect(x, y, TILE, 3);
      return;
    }
    if (ch === 'D') { // 门：木门 + 把手
      ctx.fillStyle = '#8a5c3a';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#6d4628';
      ctx.fillRect(x, y, 1, TILE);
      ctx.fillStyle = '#e8c86e';
      ctx.fillRect(x + 11, y + 8, 2, 2);
      return;
    }
    // 地板基色（棋盘暖木）
    ctx.fillStyle = (col + row) % 2 === 0 ? '#63503e' : '#5a4837';
    ctx.fillRect(x, y, TILE, TILE);
    if (ch === '.') return;
    if (ch === 'B') { // 书架：木框 + 一排彩色书
      ctx.fillStyle = '#7a4a2e';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#5c3820';
      ctx.fillRect(x, y + 14, TILE, 2);
      for (let i = 0; i < 4; i++) {
        const hash = (col * 7 + row * 13 + i * 5) % BOOK_COLORS.length;
        ctx.fillStyle = BOOK_COLORS[hash];
        ctx.fillRect(x + 1 + i * 4, y + 2 + (i % 2), 3, 11);
      }
      return;
    }
    if (ch === 'T') { // 阅览桌：桌面 + 深边
      ctx.fillStyle = '#8a5c3a';
      ctx.fillRect(x, y + 2, TILE, TILE - 4);
      ctx.fillStyle = '#9d6d47';
      ctx.fillRect(x, y + 2, TILE, 3);
      return;
    }
    if (ch === 'c') { // 椅子（可走）
      ctx.fillStyle = '#6a4a34';
      ctx.fillRect(x + 2, y + 3, 12, 10);
      ctx.fillStyle = '#7d5a40';
      ctx.fillRect(x + 2, y + 3, 12, 3);
      return;
    }
    if (ch === 'W') { // 窗：夜空 + 窗框 + 底台
      ctx.fillStyle = '#2b3a5c';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#3a4e78';
      ctx.fillRect(x + 2, y + 2, 5, 5);   // 星/光点
      ctx.fillRect(x + 10, y + 8, 3, 3);
      ctx.fillStyle = '#d8d2c6';
      ctx.fillRect(x + 7, y, 2, TILE);    // 中框
      ctx.fillRect(x, y + 9, TILE, 2);    // 横框
      ctx.fillStyle = '#8a8095';
      ctx.fillRect(x, y + 14, TILE, 2);   // 窗台
      return;
    }
    if (ch === 'P') { // 绿植：盆 + 叶
      ctx.fillStyle = '#8a5c3a';
      ctx.fillRect(x + 3, y + 10, 10, 5);
      ctx.fillStyle = '#4a7c59';
      ctx.fillRect(x + 4, y + 2, 8, 8);
      ctx.fillStyle = '#5e9970';
      ctx.fillRect(x + 6, y, 4, 4);
      return;
    }
    if (ch === 'd') { // 借阅台：深木 + 浅台面
      ctx.fillStyle = '#7a4a2e';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#a8764a';
      ctx.fillRect(x, y, TILE, 4);
      ctx.fillStyle = '#5c3820';
      ctx.fillRect(x + 2, y + 7, 4, 6);
      ctx.fillRect(x + 10, y + 7, 4, 6);
      return;
    }
  }

  function buildMapCanvas() {
    const cv = document.createElement('canvas');
    cv.width = 480;
    cv.height = 320;
    const c2 = cv.getContext('2d');
    const { grid } = parseMap();
    for (let r = 0; r < 20; r++) {
      for (let cCol = 0; cCol < 30; cCol++) {
        drawTile(c2, grid[r][cCol], cCol, r);
      }
    }
    return cv;
  }

  return { TILE, MAP, parseMap, isSolidAtPx, buildMapCanvas };
})();

if (typeof module !== 'undefined') module.exports = MapKit;
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/`
Expected: 全部 PASS（5 个 map 测试）。若"地图尺寸"失败，逐行核对 MAP 字符数。

- [ ] **Step 5: main.js 接入地图（替换 render 函数体）**

```js
  const mapCanvas = MapKit.buildMapCanvas();

  function render(now) {
    ctx.drawImage(mapCanvas, 0, 0);
  }
```

（同时删除 Task 1 的呼吸色块代码；`update` 保持空。）

- [ ] **Step 6: Playwright 截图验证**

用 webapp-testing 打开 `index.html`（此时需 `python3 -m http.server 8137` 起服务再访问 `http://localhost:8137/index.html`），截图存 `docs/screenshots/task2.png`。
预期：一间图书馆——顶部一排夜色窗户、左侧两组竖排彩色书架、中部两张阅览桌带椅子、右下借阅台、四株绿植、底部中央木门、暖木棋盘地板。

- [ ] **Step 7: Commit**

```bash
git add js/map.js js/main.js tests/map.test.js docs/screenshots/task2.png
git commit -m "feat: 图书馆地图（30x20 ASCII 数据 + 碰撞 + 预渲染 + 连通性测试）"
```

---

### Task 3: 人物——输入、移动、碰撞、动画

**Files:**
- Modify: `js/sprites.js`（整体替换：drawSprite + 人物像素矩阵）
- Create: `tests/sprites.test.js`
- Modify: `js/main.js`（整体替换：加入输入/人物/渲染排序）

**Interfaces:**
- Consumes: `MapKit.isSolidAtPx`、`MapKit.TILE`（Task 2）
- Produces: 全局 `Sprites`，字段：
  - `drawSprite(ctx, matrix, palette, x, y, flip)` → void（matrix 为 string[]，palette 为 {字符: 颜色} 映射，flip=true 水平翻转；按 1px=1 格 fillRect）
  - `PLAYER_FRAMES`：`{ down1, down2, up1, up2, side1, side2 }`，每帧 string[16]，每行 16 字符
  - `PALETTE_PLAYER`：`{ H:'#3d3040', S:'#f0c8a0', E:'#3a2b26', C:'#c25b4e', P:'#4e5a74', B:'#3a3542' }`

- [ ] **Step 1: 写失败测试 `tests/sprites.test.js`**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { PLAYER_FRAMES } = require('../js/sprites.js');

test('人物帧齐全且每帧 16 行 × 每行 16 字符', () => {
  for (const name of ['down1', 'down2', 'up1', 'up2', 'side1', 'side2']) {
    const f = PLAYER_FRAMES[name];
    assert.ok(f, `缺少帧 ${name}`);
    assert.equal(f.length, 16, `${name} 行数`);
    for (const line of f) assert.equal(line.length, 16, `${name} 某行长度`);
  }
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/`
Expected: FAIL（PLAYER_FRAMES 为 undefined）

- [ ] **Step 3: 实现 `js/sprites.js`（完整替换占位）**

```js
// sprites.js —— 像素矩阵资源库：drawSprite + 人物帧（Task 4 加猫帧）
const Sprites = (() => {
  'use strict';

  function drawSprite(ctx, matrix, palette, x, y, flip) {
    for (let row = 0; row < matrix.length; row++) {
      const line = matrix[row];
      for (let col = 0; col < line.length; col++) {
        const ch = line[flip ? line.length - 1 - col : col];
        const color = palette[ch];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x) + col, Math.round(y) + row, 1, 1);
      }
    }
  }

  // 人物 16x16。H 发 S 肤 E 眼 C 衣 P 裤 B 鞋 | . 透明
  const PLAYER_FRAMES = {
    down1: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....HSSSSSSH....',
      '....SSESSESS....',
      '....SSSSSSSS....',
      '.....SSSSSS.....',
      '....CCCCCCCC....',
      '...CCCCCCCCCC...',
      '..SCCCCCCCCCCS..',
      '..SCCCCCCCCCCS..',
      '....PPPPPPPP....',
      '....PPP..PPP....',
      '....PPP..PPP....',
      '....BBB..BBB....',
    ],
    down2: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....HSSSSSSH....',
      '....SSESSESS....',
      '....SSSSSSSS....',
      '.....SSSSSS.....',
      '....CCCCCCCC....',
      '...CCCCCCCCCC...',
      '..SCCCCCCCCCCS..',
      '..SCCCCCCCCCCS..',
      '....PPPPPPPP....',
      '....PPP..PPP....',
      '....BBB..PPP....',
      '.........BBB....',
    ],
    up1: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '.....HHHHHH.....',
      '....CCCCCCCC....',
      '...CCCCCCCCCC...',
      '..SCCCCCCCCCCS..',
      '..SCCCCCCCCCCS..',
      '....PPPPPPPP....',
      '....PPP..PPP....',
      '....PPP..PPP....',
      '....BBB..BBB....',
    ],
    up2: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '.....HHHHHH.....',
      '....CCCCCCCC....',
      '...CCCCCCCCCC...',
      '..SCCCCCCCCCCS..',
      '..SCCCCCCCCCCS..',
      '....PPPPPPPP....',
      '....PPP..PPP....',
      '....BBB..PPP....',
      '.........BBB....',
    ],
    side1: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....HHHHSSSS....',
      '....HHHSSESS....',
      '....HHSSSSSS....',
      '.....HSSSSS.....',
      '....CCCCCCCC....',
      '...CCCCCCCCCC...',
      '...CCCCCCCCCS...',
      '...CCCCCCCCCC...',
      '....PPPPPPPP....',
      '....PPP.PPPP....',
      '....PPP.PPPP....',
      '....BBB.BBBB....',
    ],
    side2: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....HHHHSSSS....',
      '....HHHSSESS....',
      '....HHSSSSSS....',
      '.....HSSSSS.....',
      '....CCCCCCCC....',
      '...CCCCCCCCCC...',
      '...CCCCCCCCCS...',
      '...CCCCCCCCCC...',
      '....PPPPPPPP....',
      '.....PP..PPP....',
      '.....PP..PPP....',
      '.....BB..BBB....',
    ],
  };

  const PALETTE_PLAYER = {
    H: '#3d3040', S: '#f0c8a0', E: '#3a2b26',
    C: '#c25b4e', P: '#4e5a74', B: '#3a3542',
  };

  return { drawSprite, PLAYER_FRAMES, PALETTE_PLAYER };
})();

if (typeof module !== 'undefined') module.exports = Sprites;
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/`
Expected: 全部 PASS

- [ ] **Step 5: 重写 `js/main.js`（输入 + 人物 + 碰撞 + 渲染）**

```js
// main.js —— 游戏循环 + 键盘输入 + 人物
(function () {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const { TILE, isSolidAtPx, buildMapCanvas } = MapKit;
  const { drawSprite, PLAYER_FRAMES, PALETTE_PLAYER } = Sprites;

  const SPEED = 70;          // px/s
  const mapCanvas = buildMapCanvas();

  // ---- 键盘 ----
  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    keys.add(e.key.toLowerCase());
    if (['arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  // ---- 人物 ----
  const player = {
    x: 10 * TILE, y: 18 * TILE, // 出生点：门内
    dir: 'up',
    moving: false,
    animTimer: 0,
  };

  function playerSolid(x, y) { // 脚部碰撞盒 (x+3, y+12, 10, 4)
    const l = x + 3, t = y + 12, r = l + 9, b = t + 3;
    return isSolidAtPx(l, t) || isSolidAtPx(r, t) ||
           isSolidAtPx(l, b) || isSolidAtPx(r, b);
  }

  function updatePlayer(dt) {
    let dx = 0, dy = 0;
    if (keys.has('w') || keys.has('arrowup'))    { dy -= 1; player.dir = 'up'; }
    if (keys.has('s') || keys.has('arrowdown'))  { dy += 1; player.dir = 'down'; }
    if (keys.has('a') || keys.has('arrowleft'))  { dx -= 1; player.dir = 'left'; }
    if (keys.has('d') || keys.has('arrowright')) { dx += 1; player.dir = 'right'; }
    player.moving = dx !== 0 || dy !== 0;
    if (!player.moving) { player.animTimer = 0; return; }

    const len = Math.hypot(dx, dy);
    const mx = (dx / len) * SPEED * dt;
    const my = (dy / len) * SPEED * dt;
    if (!playerSolid(player.x + mx, player.y)) player.x += mx; // 分轴：先 x 后 y
    if (!playerSolid(player.x, player.y + my)) player.y += my;
    player.x = Math.max(0, Math.min(480 - 16, player.x));
    player.y = Math.max(0, Math.min(320 - 16, player.y));
    player.animTimer += dt;
  }

  function playerFrame() {
    if (!player.moving) return PLAYER_FRAMES[player.dir + '1'];
    const f = Math.floor(player.animTimer / 0.15) % 2 + 1;
    return PLAYER_FRAMES[player.dir.slice(0, 4) + f];
  }

  function drawPlayer() {
    if (player.dir === 'left') {
      drawSprite(ctx, playerFrame(), PALETTE_PLAYER, player.x, player.y, true);
    } else if (player.dir === 'right') {
      drawSprite(ctx, PLAYER_FRAMES['side' + (player.moving ? Math.floor(player.animTimer / 0.15) % 2 + 1 : 1)], PALETTE_PLAYER, player.x, player.y, false);
    } else {
      drawSprite(ctx, playerFrame(), PALETTE_PLAYER, player.x, player.y, false);
    }
  }

  // ---- 循环 ----
  let lastT = 0;
  function loop(t) {
    const dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;
    updatePlayer(dt);
    render();
    requestAnimationFrame(loop);
  }

  function render() {
    ctx.drawImage(mapCanvas, 0, 0);
    drawPlayer();
  }

  requestAnimationFrame((t) => { lastT = t; requestAnimationFrame(loop); });
})();
```

注意 `playerFrame()` 中 `player.dir.slice(0, 4)`：'down'/'up' 直接拼 `'down1'/'up1'`（slice(0,4) 对 4 字符串无损伤），'left'/'right' 走 drawPlayer 的 side 分支不会用到该函数返回值——实现时把方向帧选择统一收进一个 `frameKey()` 函数更干净，允许执行者小幅重构，但**对外行为不变**（静止=帧1，移动=0.15s 交替）。

- [ ] **Step 6: Playwright 键盘走动验证**

webapp-testing 打开 `http://localhost:8137/index.html`：
1. 截图 `task3-a.png`（人物站在门口，背对镜头 up 帧）
2. `keyboard.down('w')` 保持 800ms 后截图 `task3-b.png`
预期：b 中人物位置明显上移；再按住 `a` 走 800ms 截图 `task3-c.png`，人物左移且面朝左（翻转帧）。全程人物不穿书架/墙。

- [ ] **Step 7: Commit**

```bash
git add js/sprites.js js/main.js tests/sprites.test.js docs/screenshots/task3-*.png
git commit -m "feat: 人物（WASD 四向移动 + 脚部碰撞盒 + 2 帧走路动画）"
```

---

### Task 4: 猫咪登场——数据、闲逛/打盹状态机、渲染

**Files:**
- Modify: `js/sprites.js`（追加猫帧矩阵，不动已有内容）
- Modify: `js/cats.js`（整体替换：猫定义 + 状态机）
- Create: `tests/cats.test.js`

**Interfaces:**
- Consumes: `Sprites.drawSprite`（Task 3）
- Produces: 全局 `Cats`，字段：
  - `CAT_DEFS`：10 只猫定义数组 `{ id, name, persona, col, row, radius?, bounds?, palette }`（col/row 为格坐标，可带小数；palette 为 `{A,B,C,E,W}` 颜色映射）
  - `createCats()` → cat[]（浏览器/测试通吃；像素坐标 = col*TILE, row*TILE）
  - `updateCat(cat, dt)` → void（本任务实现 wander/nap 两态；后续任务扩展）
  - `drawCat(ctx, cat, now)` → void（渲染；只被 main.js 调用）
  - cat 对象字段：`{ id, name, persona, palette, homeX, homeY, x, y, state, stateTimer, targetX, targetY, dir, walkTimer, blinkTimer, hearts }`
  - 状态常量：`'wander'`（含停顿）与 `'nap'`，每 4~8 秒随机切换

- [ ] **Step 1: 写失败测试 `tests/cats.test.js`**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { CAT_DEFS, createCats, updateCat } = require('../js/cats.js');

test('恰好 10 只猫，每只字段齐全、调色板五色俱全', () => {
  assert.equal(CAT_DEFS.length, 10);
  const names = new Set();
  for (const d of CAT_DEFS) {
    assert.ok(d.id && d.name && d.persona, `${d.id} 文案缺失`);
    assert.equal(typeof d.col, 'number');
    assert.equal(typeof d.row, 'number');
    for (const k of ['A', 'B', 'C', 'E', 'W']) assert.ok(d.palette[k], `${d.name} 缺色 ${k}`);
    names.add(d.name);
  }
  assert.equal(names.size, 10, '猫名重复');
});

test('createCats 初始为 wander 且好感 0、坐标 = 格×16', () => {
  const cats = createCats();
  assert.equal(cats.length, 10);
  for (const c of cats) {
    assert.equal(c.state, 'wander');
    assert.equal(c.hearts, 0);
    assert.equal(c.x, c.homeX);
  }
});

test('wander 计时结束会切换到 nap，nap 结束回到 wander', () => {
  const cat = createCats()[0];
  cat.stateTimer = 0.01;
  updateCat(cat, 0.02); // 耗尽计时
  assert.equal(cat.state, 'nap');
  cat.stateTimer = 0.01;
  updateCat(cat, 0.02);
  assert.equal(cat.state, 'wander');
});

test('wander 走向目标点且不超出领地半径 + 8px 容差', () => {
  const cat = createCats()[0];
  const r = (cat.def.radius || 24) + 8;
  for (let i = 0; i < 600; i++) updateCat(cat, 0.016); // 模拟 10 秒
  assert.ok(Math.abs(cat.x - cat.homeX) <= r + 16, `x 越界: ${cat.x}`);
  assert.ok(Math.abs(cat.y - cat.homeY) <= r + 16, `y 越界: ${cat.y}`);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/`
Expected: FAIL（CAT_DEFS 为 undefined）

- [ ] **Step 3: 在 `js/sprites.js` 追加猫帧（插在 `return` 之前）**

```js
  // 猫 16x16。A 主体 B 斑纹 C 耳内/鼻 E 眼 W 白围兜 | . 透明
  const CAT_FRAMES = {
    idle1: [ // 坐姿正面
      '................',
      '................',
      '..A..........A..',
      '..AC........CA..',
      '..AAA......AAA..',
      '..AAAAAAAAAAAA..',
      '.AAAAAAAAAAAAAA.',
      '.AAEAAAAAAAAEAA.',
      '.AAAAAAAAAAAAAA.',
      '.AAAAAACCAAAAAA.',
      '.AAAWWWWWWWWAAA.',
      '..AAWWWWWWWWAA..',
      '..AAWWWWWWWWAA..',
      '..AAAWWWWWWAAA..',
      '...AAAAAAAAAA...',
      '....AA....AA....',
    ],
    idle2: [ // 眨眼
      '................',
      '................',
      '..A..........A..',
      '..AC........CA..',
      '..AAA......AAA..',
      '..AAAAAAAAAAAA..',
      '.AAAAAAAAAAAAAA.',
      '.AAAAAAAAAAAAAA.',
      '.AAAAAAAAAAAAAA.',
      '.AAAAAACCAAAAAA.',
      '.AAAWWWWWWWWAAA.',
      '..AAWWWWWWWWAA..',
      '..AAWWWWWWWWAA..',
      '..AAAWWWWWWAAA..',
      '...AAAAAAAAAA...',
      '....AA....AA....',
    ],
    walk1: [ // 侧面朝右
      '................',
      '................',
      '...........A..A.',
      '...........ACACA',
      '..........AAAAAA',
      '..........AEAAAA',
      '..........AAAAAC',
      '.A........AAAAAA',
      '.A.AAAAAAAAAAAAA',
      '..AAAAAAAAAAAAAA',
      '..AAAAAAAAAAAAAA',
      '...AAAAAAAAAAAAA',
      '....AA.....AAA..',
      '....AA.....AAA..',
      '....A......A....',
      '................',
    ],
    walk2: [
      '................',
      '................',
      '...........A..A.',
      '...........ACACA',
      '..........AAAAAA',
      '..........AEAAAA',
      '..........AAAAAC',
      '.A........AAAAAA',
      '.A.AAAAAAAAAAAAA',
      '..AAAAAAAAAAAAAA',
      '..AAAAAAAAAAAAAA',
      '...AAAAAAAAAAAAA',
      '.....AA....AA...',
      '.....AA....AA...',
      '.....A......A...',
      '................',
    ],
    eat: [ // 低头吃
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '..A..........A..',
      '..AC........CA..',
      '..AAA......AAA..',
      '..AAAAAAAAAAAA..',
      '.AABBAAAAAABBAA.',
      '.AAAAAACCAAAAAA.',
      '.AAAWWWWWWWWAAA.',
      '..AAWWWWWWWWAA..',
      '..AAAWWWWWWAAA..',
      '...AA......AA...',
    ],
    sleep: [ // 蜷缩
      '................',
      '................',
      '................',
      '................',
      '................',
      '....AAAAAAAA....',
      '...AABBBBBBAA...',
      '..AABBAAAABBAA..',
      '..ABAAAAAAAABA..',
      '..ABAAEEEEAABA..',
      '..AAAAAAAAAAAA..',
      '..AAAAAAAAAAAA..',
      '...AABBBBBBAA...',
      '....AAAAAAAA....',
      '................',
      '................',
    ],
  };

  const DISH = [ // 猫粮碟 10x4。K 碟沿 F 碟面 a 粮粒
    '..KKKKKK..',
    '.KFFFFFFF.',
    '.FaFFFFaF.',
    '..KKKKKK..',
  ];
  const PALETTE_DISH = { K: '#4a5a74', F: '#a8c0d8', a: '#8a5c34' };

  const HEART = [ // 好感心 7x6
    '.AA.AA.',
    'AAAAAAA',
    'AAAAAAA',
    '.AAAAA.',
    '..AAA..',
    '...A...',
  ];
  const ZZZ = ['AAA', '..A', 'AAA'];
```

同时把 `return { drawSprite, PLAYER_FRAMES, PALETTE_PLAYER };` 改为：

```js
  return {
    drawSprite, PLAYER_FRAMES, PALETTE_PLAYER,
    CAT_FRAMES, DISH, PALETTE_DISH, HEART, ZZZ,
  };
```

- [ ] **Step 4: 实现 `js/cats.js`（完整替换占位）**

```js
// cats.js —— 10 只猫：数据 + 状态机（纯逻辑，无 DOM）+ 渲染
const Cats = (() => {
  'use strict';
  const TILE = 16;

  // 位置 = 格坐标(可小数) × 16。bounds 为可选显式闲逛矩形（像素），否则用 home ± radius
  const CAT_DEFS = [
    { id: 'xueqiu',   name: '雪球', persona: '窗台晒太阳专业户', col: 3,    row: 1,    palette: { A: '#f5f2ec', B: '#d8d2c6', C: '#e890a8', E: '#4a4a55', W: '#f5f2ec' } },
    { id: 'tuantuan', name: '团团', persona: '晒着太阳流口水',   col: 11,   row: 1,    palette: { A: '#ef9f4d', B: '#d97f2e', C: '#e890a8', E: '#4a3a2b', W: '#f5ecd9' } },
    { id: 'tangyuan', name: '汤圆', persona: '在看窗外的鸽子',   col: 15,   row: 1,    palette: { A: '#f5f2ec', B: '#9aa0ab', C: '#e890a8', E: '#4a4a55', W: '#f5f2ec' } },
    { id: 'buding',   name: '布丁', persona: '整个图书馆都是我家', col: 18, row: 2, radius: 48, bounds: { x1: 13 * 16, y1: 24, x2: 27 * 16, y2: 56 }, palette: { A: '#f2c14e', B: '#d9a32e', C: '#e890a8', E: '#4a3a2b', W: '#faf3dd' } },
    { id: 'meiqiu',   name: '煤球', persona: '书架顶观察员',     col: 4,    row: 2,    palette: { A: '#3d3a45', B: '#2b2933', C: '#e890a8', E: '#c9c4d4', W: '#f5f2ec' } },
    { id: 'momo',     name: '墨墨', persona: '书架深处的大人物', col: 7.5,  row: 6, radius: 16, palette: { A: '#423e4a', B: '#302d38', C: '#e890a8', E: '#d4b95e', W: '#5a5566' } },
    { id: 'naitang',  name: '奶糖', persona: '占领了整张桌子',   col: 14.5, row: 11.5, radius: 10, palette: { A: '#f5f2ec', B: '#3d3a45', C: '#e890a8', E: '#4a4a55', W: '#f5f2ec' } },
    { id: 'zhima',    name: '芝麻', persona: '绿植是我的',       col: 22,   row: 2,    palette: { A: '#ef9f4d', B: '#3d3a45', C: '#e890a8', E: '#4a3a2b', W: '#f5f2ec' } },
    { id: 'huihui',   name: '灰灰', persona: '借阅台监工',       col: 24,   row: 14, radius: 16, palette: { A: '#9aa0ab', B: '#7d828d', C: '#e890a8', E: '#4a4a55', W: '#e8e4dc' } },
    { id: 'huajuan',  name: '花卷', persona: '在门口等你很久了', col: 15,   row: 18, radius: 20, palette: { A: '#ef9f4d', B: '#f5f2ec', C: '#e890a8', E: '#4a3a2b', W: '#faf3dd' } },
  ];

  const CAT_SPEED = 12; // px/s，慢悠悠

  function createCats() {
    return CAT_DEFS.map((def) => ({
      def,
      id: def.id, name: def.name, persona: def.persona, palette: def.palette,
      homeX: def.col * TILE, homeY: def.row * TILE,
      x: def.col * TILE, y: def.row * TILE,
      state: 'wander', stateTimer: 2 + Math.random() * 4,
      targetX: def.col * TILE, targetY: def.row * TILE,
      dir: 1, walkTimer: 0, blinkTimer: 0,
      hearts: 0,
      dishX: 0, dishY: 0,        // Task 5 使用
      followTimer: 0,            // Task 6 使用
      hasMet: false,             // Task 7 计数用
    }));
  }

  function pickWanderTarget(cat) {
    const r = cat.def.radius || 24;
    if (cat.def.bounds) {
      cat.targetX = cat.def.bounds.x1 + Math.random() * (cat.def.bounds.x2 - cat.def.bounds.x1);
      cat.targetY = cat.def.bounds.y1 + Math.random() * (cat.def.bounds.y2 - cat.def.bounds.y1);
    } else {
      cat.targetX = cat.homeX + (Math.random() * 2 - 1) * r;
      cat.targetY = cat.homeY + (Math.random() * 2 - 1) * r;
    }
  }

  function moveToward(cat, tx, ty, speed, dt) {
    const dx = tx - cat.x, dy = ty - cat.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return true; // 到达
    const step = Math.min(speed * dt, dist);
    cat.x += (dx / dist) * step;
    cat.y += (dy / dist) * step;
    if (Math.abs(dx) > 1) cat.dir = dx > 0 ? 1 : -1;
    cat.walkTimer += dt;
    return false;
  }

  function updateCat(cat, dt) {
    cat.stateTimer -= dt;
    cat.blinkTimer += dt;
    switch (cat.state) {
      case 'wander': {
        const arrived = moveToward(cat, cat.targetX, cat.targetY, CAT_SPEED, dt);
        if (arrived) pickWanderTarget(cat);
        if (cat.stateTimer <= 0) { // 走累了，睡一觉
          cat.state = 'nap';
          cat.stateTimer = 4 + Math.random() * 4;
        }
        break;
      }
      case 'nap': {
        if (cat.stateTimer <= 0) { // 睡够了
          cat.state = 'wander';
          cat.stateTimer = 3 + Math.random() * 5;
          pickWanderTarget(cat);
        }
        break;
      }
    }
  }

  // ---- 渲染（只被 main.js 调用） ----
  function catFrame(cat) {
    switch (cat.state) {
      case 'nap': return 'sleep';
      case 'eat': return 'eat';
      case 'wander': {
        const moving = Math.hypot(cat.targetX - cat.x, cat.targetY - cat.y) > 2;
        if (!moving) return Math.floor(cat.blinkTimer / 1.6) % 5 === 4 ? 'idle2' : 'idle1';
        return Math.floor(cat.walkTimer / 0.25) % 2 === 0 ? 'walk1' : 'walk2';
      }
      default: return Math.floor(cat.walkTimer / 0.25) % 2 === 0 ? 'walk1' : 'walk2';
    }
  }

  function drawCat(ctx, cat, drawSprite, CAT_FRAMES) {
    const frame = CAT_FRAMES[catFrame(cat)];
    drawSprite(ctx, frame, cat.palette, cat.x, cat.y, cat.dir < 0);
  }

  return { CAT_DEFS, createCats, updateCat, drawCat };
})();

if (typeof module !== 'undefined') module.exports = Cats;
```

（`drawCat` 把 `drawSprite`/`CAT_FRAMES` 作为参数传入，避免 cats.js 依赖 sprites.js 的加载顺序——浏览器中两者都已加载，Node 测试根本不调 drawCat。）

- [ ] **Step 5: 扩展 `tests/sprites.test.js`——猫帧尺寸断言**

在文件末尾追加：

```js
const { CAT_FRAMES } = require('../js/sprites.js');

test('猫帧齐全且每帧 16x16', () => {
  for (const name of ['idle1', 'idle2', 'walk1', 'walk2', 'eat', 'sleep']) {
    const f = CAT_FRAMES[name];
    assert.ok(f, `缺少猫帧 ${name}`);
    assert.equal(f.length, 16, `${name} 行数`);
    for (const line of f) assert.equal(line.length, 16, `${name} 某行长度`);
  }
});
```

- [ ] **Step 6: 运行测试确认全部通过**

Run: `node --test tests/`
Expected: 全部 PASS（map + sprites + cats）

- [ ] **Step 7: main.js 接入猫咪（修改）**

在 `js/main.js` 中：
1. 猫数组初始化（`drawPlayer` 定义之前加入）：

```js
  const cats = Cats.createCats();
```

2. `loop` 的 `updatePlayer(dt);` 后加：

```js
    for (const cat of cats) Cats.updateCat(cat, dt);
```

3. `render` 的 `drawPlayer()` 替换为按 y 排序绘制（人物插进猫之间）：

```js
  function render() {
    ctx.drawImage(mapCanvas, 0, 0);
    const actors = [...cats.map((c) => ({ y: c.y, draw: () => Cats.drawCat(ctx, c, drawSprite, Sprites.CAT_FRAMES) })),
                    { y: player.y, draw: drawPlayer }];
    actors.sort((a, b) => a.y - b.y);
    for (const a of actors) a.draw();
  }
```

- [ ] **Step 8: Playwright 截图验证**

截图 `docs/screenshots/task4.png`，隔 3 秒再截 `task4-b.png`。
预期：10 只花色各异的猫散布在 spec 规划的位置（窗台 3 只、书架区 2 只、桌上 1 只、绿植旁 1 只、借阅台前 1 只、门口 1 只、走道 1 只）；两张截图里至少有一只猫位置改变或姿态从坐变躺（sleep）。

- [ ] **Step 9: Commit**

```bash
git add js/sprites.js js/cats.js js/main.js tests/cats.test.js tests/sprites.test.js docs/screenshots/task4*.png
git commit -m "feat: 10 只猫咪（闲逛/打盹状态机 + 六帧像素动画 + y 排序渲染）"
```

---

### Task 5: 投喂交互——E 键、猫粮碟、吃食、爱心、好感度

**Files:**
- Modify: `js/cats.js`（追加 `feed()` 与 gotoFood/eat 状态）
- Modify: `tests/cats.test.js`（追加投喂测试）
- Modify: `js/main.js`（追加 E 键交互、碟绘制、名牌心条、粒子系统）

**Interfaces:**
- Consumes: Task 4 全部
- Produces:
  - `Cats.feed(cat, dishX, dishY)` → void（打断当前状态进入 `'gotoFood'`；睡着会被叫醒）
  - cat 新状态：`'gotoFood'`（走向碟）→ `'eat'`（1.6s）→ 完成后 `hearts = min(5, hearts+1)`，回到 `'wander'`（Task 6 加满心分支）
  - main.js 新增 `nearestFeedableCat()`（距离玩家 < 40px 的最近猫）与全局 `particles` 粒子数组（`spawnHearts` / `spawnText`）

- [ ] **Step 1: 追加失败测试到 `tests/cats.test.js`**

```js
const { feed } = require('../js/cats.js');

test('feed 叫醒睡着的猫并走向食物；吃完好感 +1', () => {
  const cat = createCats()[0];
  cat.state = 'nap';
  feed(cat, cat.x + 20, cat.y);
  assert.equal(cat.state, 'gotoFood');
  // 200 帧 = 3.2s：走 20px(≈1.2s) + 吃 1.6s，且吃完后 2s 内不会切 nap
  for (let i = 0; i < 200; i++) updateCat(cat, 0.016);
  assert.equal(cat.state, 'wander');
  assert.equal(cat.hearts, 1);
});

test('好感度上限 5，超出不再增加', () => {
  const cat = createCats()[0];
  cat.hearts = 5;
  feed(cat, cat.x, cat.y);
  for (let i = 0; i < 200; i++) updateCat(cat, 0.016);
  assert.equal(cat.hearts, 5);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/`
Expected: 新增 2 个 FAIL（feed 不是函数）

- [ ] **Step 3: 在 `js/cats.js` 实现投喂逻辑**

1. `updateCat` 的 `switch` 里追加两个 case（放在 `'nap'` case 之后）：

```js
      case 'gotoFood': {
        const arrived = moveToward(cat, cat.dishX, cat.dishY, CAT_SPEED * 1.5, dt);
        if (arrived) {
          cat.state = 'eat';
          cat.stateTimer = 1.6;
        }
        break;
      }
      case 'eat': {
        if (cat.stateTimer <= 0) {
          cat.hearts = Math.min(5, cat.hearts + 1);
          cat.state = 'wander';
          cat.stateTimer = 2 + Math.random() * 3;
          pickWanderTarget(cat);
        }
        break;
      }
```

2. `createCats` 之后追加导出函数（`return` 之前）：

```js
  function feed(cat, dishX, dishY) {
    if (cat.state === 'eat' || cat.state === 'gotoFood') return; // 正在吃就不重复投
    cat.dishX = dishX;
    cat.dishY = dishY;
    cat.state = 'gotoFood';
  }
```

3. `return` 列表追加 `feed`：

```js
  return { CAT_DEFS, createCats, updateCat, drawCat, feed };
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/`
Expected: 全部 PASS

- [ ] **Step 5: `js/main.js` 追加投喂交互与粒子**

在 `const cats = Cats.createCats();` 之后追加：

```js
  const FEED_RANGE = 40;
  const dishes = [];   // {x, y}
  const particles = []; // {x, y, vx, vy, life, ttl, kind, text?}

  function spawnHearts(x, y) {
    for (let i = 0; i < 5; i++) {
      particles.push({
        x: x + (Math.random() * 16 - 8), y: y - 4,
        vx: Math.random() * 8 - 4, vy: -18 - Math.random() * 10,
        life: 0, ttl: 1 + Math.random() * 0.5, kind: 'heart',
      });
    }
  }

  function spawnText(x, y, text) {
    particles.push({ x, y, vx: 0, vy: -10, life: 0, ttl: 1.4, kind: 'text', text });
  }

  function nearestFeedableCat() {
    let best = null, bestD = FEED_RANGE;
    for (const cat of cats) {
      const d = Math.hypot(cat.x + 8 - (player.x + 8), cat.y + 8 - (player.y + 8));
      if (d < bestD) { best = cat; bestD = d; }
    }
    return best;
  }

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'e') return;
    const cat = nearestFeedableCat();
    if (!cat) return;
    // 碟落在猫与玩家之间、猫身前 14px
    const dx = player.x - cat.x, dy = player.y - cat.y;
    const len = Math.hypot(dx, dy) || 1;
    const dishX = cat.x + (dx / len) * 14, dishY = cat.y + (dy / len) * 14 + 4;
    dishes.push({ x: dishX, y: dishY });
    Cats.feed(cat, dishX, dishY);
    cat.hasMet = true;
  });
```

在 `loop` 的猫更新之后追加（投喂完成检测——吃结束的瞬间冒爱心。靠对比 hearts 变化）：

```js
    for (const cat of cats) {
      const before = cat.hearts;
      Cats.updateCat(cat, dt);
      if (cat.hearts > before) { // 刚吃完一口
        spawnHearts(cat.x + 8, cat.y);
        spawnText(cat.x + 8, cat.y - 10, '喵♪');
        if (dishes.length) dishes.shift(); // 吃完撤碟
      }
    }
```

（即原 `for (const cat of cats) Cats.updateCat(cat, dt);` 替换为上面这段。）

在 `render` 的 actors 排序绘制**之前**画碟、**之后**画粒子/气泡/名牌：

```js
  function drawDishes() {
    for (const d of dishes) {
      drawSprite(ctx, Sprites.DISH, Sprites.PALETTE_DISH, d.x, d.y);
    }
  }

  function drawParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life > p.ttl) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const alpha = 1 - p.life / p.ttl;
      ctx.globalAlpha = alpha;
      if (p.kind === 'heart') {
        drawSprite(ctx, Sprites.HEART, { A: '#ef6a8a' }, p.x, p.y);
      } else {
        ctx.fillStyle = '#f5d7e0';
        ctx.font = '8px monospace';
        ctx.fillText(p.text, p.x - 6, p.y);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawCatOverlay() { // 气泡提示 + 名牌 + 心条
    const target = nearestFeedableCat();
    for (const cat of cats) {
      const near = Math.hypot(cat.x + 8 - (player.x + 8), cat.y + 8 - (player.y + 8)) < 64;
      if (!near) continue;
      // 名牌
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1a181f';
      ctx.fillText(cat.name, cat.x + 8, cat.y - 10);
      ctx.fillStyle = '#f5f2ec';
      ctx.fillText(cat.name, cat.x + 8, cat.y - 11);
      // 5 心条
      for (let i = 0; i < 5; i++) {
        drawSprite(ctx, Sprites.HEART, { A: i < cat.hearts ? '#ef6a8a' : '#4a4453' }, cat.x - 12 + i * 8, cat.y - 8);
      }
      ctx.textAlign = 'left';
    }
    if (target) { // 「E 投喂」气泡
      const bx = target.x + 4, by = target.y - 22;
      ctx.fillStyle = '#f5f2ec';
      ctx.fillRect(bx, by, 10, 10);
      ctx.fillStyle = '#1a181f';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('E', bx + 3, by + 8);
    }
  }
```

`render` 最终结构：

```js
  function render(dt) {
    ctx.drawImage(mapCanvas, 0, 0);
    drawDishes();
    const actors = [...cats.map((c) => ({ y: c.y, draw: () => Cats.drawCat(ctx, c, drawSprite, Sprites.CAT_FRAMES) })),
                    { y: player.y, draw: drawPlayer }];
    actors.sort((a, b) => a.y - b.y);
    for (const a of actors) a.draw();
    drawCatOverlay();
    drawParticles(dt);
  }
```

（`loop` 里调用改为 `render(dt)`；粒子更新合并进 `drawParticles` 的遍历，简化状态。）

- [ ] **Step 6: Playwright 全交互验证**

webapp-testing 打开页面，用键盘真实走近猫：出生点 `(10,18)` 右边 5 格就是门口的花卷 `(15,18)`——按住 `d` 走约 1.2 秒，看到「E」气泡后按 `e`：
1. 截图 `task5-a.png`：碟已落地、猫正走向碟
2. 等 3 秒截图 `task5-b.png`：猫在吃（低头帧），头顶粉色爱心与「喵♪」
3. 再投喂 1 次后截图 `task5-c.png`：名牌下方心条显示 2 颗实心
预期：三张截图依次呈现投喂全过程。

- [ ] **Step 7: Commit**

```bash
git add js/cats.js js/main.js tests/cats.test.js docs/screenshots/task5-*.png
git commit -m "feat: 投喂交互（E 键 + 猫粮碟 + 吃食动画 + 爱心粒子 + 5 心好感）"
```

---

### Task 6: 喂满跟随——满心猫跟着你走一段

**Files:**
- Modify: `js/cats.js`（追加 follow/return 状态 + Zzz 渲染钩子）
- Modify: `tests/cats.test.js`（追加跟随测试）
- Modify: `js/main.js`（`updateCat` 调用传入玩家位置；nap 时冒 Zzz）

**Interfaces:**
- Consumes: Task 5 全部
- Produces:
  - `Cats.updateCat(cat, dt, player)`——**签名扩展**：第三个参数 `{ x, y }`（可省略，省略时 follow 行为不触发）
  - cat 新状态：`'follow'`（吃满后触发，8s）→ `'return'`（回领地）→ 到家转 `'nap'`
  - `Cats.drawCat` 不变（follow/return 自动用走路帧）

- [ ] **Step 1: 追加失败测试到 `tests/cats.test.js`**

```js
test('喂满 5 心后吃完进入 follow，计时结束 return，到家 nap', () => {
  const cat = createCats()[0];
  cat.hearts = 4;
  const player = { x: cat.x + 30, y: cat.y };
  feed(cat, cat.x + 5, cat.y);
  for (let i = 0; i < 300; i++) updateCat(cat, 0.016); // 4.8s：走完 + 吃完，follow 8s 未到
  assert.equal(cat.hearts, 5);
  assert.equal(cat.state, 'follow');
  cat.followTimer = 0.01;
  updateCat(cat, 0.02, player);
  assert.equal(cat.state, 'return');
  for (let i = 0; i < 3000; i++) updateCat(cat, 0.016, player); // 48s 足够走回家
  assert.equal(cat.state, 'nap');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/`
Expected: 新增 FAIL（吃完后 state 是 'wander' 而非 'follow'）

- [ ] **Step 3: 在 `js/cats.js` 实现跟随**

1. `'eat'` case 的完成分支改为：

```js
      case 'eat': {
        if (cat.stateTimer <= 0) {
          cat.hearts = Math.min(5, cat.hearts + 1);
          if (cat.hearts >= 5) {          // 心满意足 → 跟随
            cat.state = 'follow';
            cat.followTimer = 8;
          } else {
            cat.state = 'wander';
            cat.stateTimer = 2 + Math.random() * 3;
            pickWanderTarget(cat);
          }
        }
        break;
      }
```

2. `switch` 追加两个 case：

```js
      case 'follow': {
        cat.followTimer -= dt;
        if (cat.followTimer <= 0) { cat.state = 'return'; break; }
        if (!player) break;
        const d = Math.hypot(player.x - cat.x, player.y - cat.y);
        if (d > 24) moveToward(cat, player.x, player.y, CAT_SPEED * 1.8, dt);
        break;
      }
      case 'return': {
        const arrived = moveToward(cat, cat.homeX, cat.homeY, CAT_SPEED * 1.5, dt);
        if (arrived) {
          cat.state = 'nap';
          cat.stateTimer = 5 + Math.random() * 3; // 心满意足地睡
        }
        break;
      }
```

3. `updateCat` 签名改为 `function updateCat(cat, dt, player)`（Task 4 的旧测试不传 player 也不受影响——wander/nap 不用它）。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/`
Expected: 全部 PASS

- [ ] **Step 5: `js/main.js` 适配 + Zzz**

1. `loop` 中猫更新改为：

```js
    for (const cat of cats) {
      const before = cat.hearts;
      Cats.updateCat(cat, dt, player);
      if (cat.hearts > before) {
        spawnHearts(cat.x + 8, cat.y);
        spawnText(cat.x + 8, cat.y - 10, '喵♪');
        if (dishes.length) dishes.shift();
      }
      if (cat.state === 'nap' && Math.random() < dt * 0.5) { // 睡觉偶尔冒 Z
        spawnText(cat.x + 14, cat.y - 2, 'z');
      }
    }
```

- [ ] **Step 6: Playwright 验证**

对同一只猫连按 5 次 `e`（每次等吃完成约 3s），第 5 次吃完后：
截图 `task6-a.png`：猫跟随玩家移动（玩家走猫跟）；等 8 秒截图 `task6-b.png`：猫开始往家走。
预期：跟随距离保持在 24px 左右，不推挤玩家。

- [ ] **Step 7: Commit**

```bash
git add js/cats.js js/main.js tests/cats.test.js docs/screenshots/task6-*.png
git commit -m "feat: 满心跟随（8s 跟随玩家 → 回领地心满意足打盹 + Zzz）"
```

---

### Task 7: 氛围打磨与收尾

**Files:**
- Modify: `js/map.js`（窗外光斑 + 门口垫子，画进 `buildMapCanvas`）
- Modify: `index.html`（HUD 追加撸猫进度）
- Modify: `js/main.js`（进度计数更新）
- Create: `README.md`

**Interfaces:**
- Consumes: Task 6 全部
- Produces: 成品。`MapKit.buildMapCanvas()` 签名不变（只改内部绘制）。

- [ ] **Step 1: `js/map.js` 的 `buildMapCanvas` 末尾（`return cv` 之前）追加氛围层**

```js
    // 窗外光斑：每个窗下方投一束暖光
    const { grid } = parseMap(); // 若已解构则复用
    c2.globalAlpha = 0.12;
    c2.fillStyle = '#ffd98a';
    for (let cCol = 0; cCol < 30; cCol++) {
      if (grid[1][cCol] === 'W') {
        c2.beginPath();
        c2.moveTo(cCol * TILE + 2, 2 * TILE);
        c2.lineTo(cCol * TILE + 14, 2 * TILE);
        c2.lineTo(cCol * TILE + 16, 6 * TILE);
        c2.lineTo(cCol * TILE, 6 * TILE);
        c2.closePath();
        c2.fill();
      }
    }
    c2.globalAlpha = 1;
    // 门口垫子
    c2.fillStyle = '#8c3b40';
    c2.fillRect(13 * TILE + 2, 18 * TILE + 6, 4 * TILE - 4, TILE - 6);
    c2.fillStyle = '#a54a50';
    c2.fillRect(13 * TILE + 4, 18 * TILE + 8, 4 * TILE - 8, TILE - 10);
```

- [ ] **Step 2: 猫转向玩家 + 桌上台灯**

1. `js/cats.js` 的 `drawCat` 增加一个可选转向覆盖：main.js 在 `render` 排序前，给每只 idle 状态且玩家距离 < 56px 的猫设 `cat.facePlayer = true`（其余设 `false`）；`drawCat` 内翻转逻辑改为：

```js
    const flip = cat.facePlayer
      ? (player.x < cat.x)
      : (cat.dir < 0);
    drawSprite(ctx, frame, cat.palette, cat.x, cat.y, flip);
```

（`drawCat` 因此新增第 5 参 `player`，可为 `null`，`null` 时行为同旧版；调用点同步更新。）

2. `js/map.js` 的 `drawTile` 中 `T` 分支，给桌面加一盏小台灯（画在书桌中央格右半）：

```js
      ctx.fillStyle = '#d8d2c6';                  // 灯罩
      ctx.fillRect(x + 9, y + 3, 4, 3);
      ctx.fillStyle = '#ffd98a';                  // 暖光
      ctx.fillRect(x + 10, y + 6, 2, 2);
      ctx.fillStyle = '#5c3820';                  // 灯杆
      ctx.fillRect(x + 10, y + 8, 1, 4);
```

（放在 `if (ch === 'T')` 分支内、`return` 前，只画在 `col` 为偶数的桌格上避免每格一盏：`if (col % 2 === 0) { ... }`）

- [ ] **Step 3: HUD 撸猫进度**

`index.html` 的 `#hud` 内追加：

```html
 <span id="progress" class="hint">撸猫 0 / 10</span>
```

`js/main.js` 的 `render` 末尾追加（或 hearts 变化处直接更新 DOM，二选一，推荐后者减少每帧 DOM 写）：

```js
  function updateProgress() {
    const met = cats.filter((c) => c.hasMet).length;
    document.getElementById('progress').textContent = `撸猫 ${met} / 10`;
  }
```

在投喂 keydown 处理器末尾调用 `updateProgress()`。

- [ ] **Step 4: 写 `README.md`**

```markdown
# 📚 图书馆喂猫 · Library Cats

一个像素风治愈小游戏：在一间夜晚的图书馆里闲逛，找到 10 只猫，投喂它们。

## 玩法

- **WASD / 方向键** 移动
- 走近猫咪，按 **E** 投喂
- 每只猫有 5 颗心的好感度；喂满后它会开心地跟着你走一段
- 没有目标，没有结局。猫开心，你开心。

## 运行

直接双击 `index.html` 即可（无需安装任何东西）。

或者起个本地服务：

```bash
python3 -m http.server 8137
# 打开 http://localhost:8137
```

## 技术说明

纯 HTML + Canvas + 原生 JavaScript，零依赖零构建。
`node --test tests/` 跑单元测试（地图碰撞 / 精灵尺寸 / 猫状态机）。

## 截图

见 `docs/screenshots/`。
```

- [ ] **Step 5: 全部测试 + Playwright 全流程走查**

1. Run: `node --test tests/` → 全部 PASS
2. webapp-testing 全流程：从出生点出发 → 找到门口的花卷投喂一次（爱心+心条）→ 走到窗台找雪球 → 截图 `docs/screenshots/final.png`（画面含：人物、名牌心条猫、窗外光斑、门口垫子、HUD 进度「撸猫 2 / 10」）
3. 检查控制台无报错

- [ ] **Step 6: 用户试玩（人工验收）**

请用户亲自玩 5 分钟，重点感受：猫可爱吗？图书馆氛围对吗？跟随好不好玩？记录反馈，小的直接改，大的记入后续迭代。

- [ ] **Step 7: Commit**

```bash
git add js/map.js js/cats.js js/main.js index.html README.md docs/screenshots/final.png
git commit -m "feat: 氛围打磨（窗外光斑 + 门口垫子 + 台灯 + 猫转向玩家 + 撸猫进度 + README），v1.0 完成"
```

---

## 计划自审记录

- **Spec 覆盖**：spec §3.1 画面（Task 1）、§3.2 人物（Task 3）、§3.3 十猫与"走近转向玩家"（Task 4 + Task 7 Step 2）、§3.4 投喂与满心跟随（Task 5/6）、§3.5 氛围含台灯（Task 2 + Task 7）、§4.3 ASCII 地图（Task 2）、§4.5 程序化像素（Task 3/4）、§5 边界（音效/存档/移动端均未纳入 ✓）
- **已知取舍**：猫移动不查碰撞（spec §4.4 已注明）；测试覆盖纯逻辑，渲染靠 Playwright 截图（spec §4.6）
- **类型一致**：`updateCat(cat, dt, player)` 第三参在 Task 6 引入且向后兼容；`drawCat` 第 5 参 `player` 在 Task 7 引入且可为 null；`drawSprite(ctx, matrix, palette, x, y, flip)` 全程不变
- **自审修正**：绿植实际位置 col20-21（非 24）已同步测试断言与猫"芝麻"位置；投喂测试循环帧数从 600 收敛到 200/300 避免状态切换导致的 flaky

