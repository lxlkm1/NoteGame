# 地图配置化重构 · 设计文档

- **日期**：2026-10-16
- **状态**：已确认
- **目标**：地图**布局**与符号**语义**全部配置化——改地图、改图例不动任何代码

## 1. 概述

把地图数据从 `js/map.js` 抽离到独立的 `maps/` 文件夹。配置文件用 `.js` 格式（浏览器安全规则禁止 `file://` 下 fetch JSON；classic `<script>` 加载不受限），内容 100% 纯数据。`js/map.js` 退化为纯引擎（只有逻辑，没有数据）。

分层原则：**高频改的进配置（布局、语义），低频改的留代码（画法渲染）**。

## 2. 决策记录

| 决策点 | 结论 | 理由 |
|---|---|---|
| 配置文件格式 | `.js` 纯数据文件 | `file://` 下 fetch JSON 被浏览器拦截；`<script>` 加载无此限制 |
| 抽离范围 | 地图布局 + 棋子 + 门 + 出生点 + 图例语义 | 用户确认的两轮方案 |
| 图例抽离程度 | 语义（名字/可走/画法名/是否门）进配置；画法实现留引擎 | 语义高频改、画法低频改；画法数据化需解释引擎，不划算 |
| 猫咪位置 | 留在 cats.js 不动 | 用户明确选择 |
| 布局不对称问题 | 本次只搬数据，不碰布局 | 用户之后用配置文件自己调 |

## 3. 目标结构

```
vibe-game/
├── maps/                  ← 新增
│   ├── tiles.js           图例：符号 → {name, solid, style, portal}
│   ├── atrium.js          中庭：map + chessSeats + doors + spawn + decor
│   ├── reading.js         阅览室：map + doors + entry
│   └── toilet.js          卫生间：map + doors + entry
├── js/
│   └── map.js             纯引擎：渲染/碰撞/门检测/画布构建
└── index.html             加载顺序：maps/*.js → js/sprites.js → js/map.js → ...
```

## 4. 配置文件契约

每个 `maps/*.js` 使用统一包装（浏览器注册全局 + Node 可直接 require）：

```js
(function (root) {
  root.MAPS = root.MAPS || {};
  root.MAPS.atrium = { /* ...数据... */ };
  if (typeof module !== 'undefined') module.exports = root.MAPS.atrium;
})(typeof window !== 'undefined' ? window : globalThis);
```

### 4.1 `maps/tiles.js`（图例）

> ⚠️ 2026-10-16 后续修订：`portal` 从 `true` 改为**直接写目的地场景名**（字符即目的地），并新增 `'W'`（大门·卫生间）。门不再需要 `doors` 数组——改门位置只动地图字符串里的字母。

```js
MAPS.tiles = {
  '#': { name: '墙',         solid: true,  style: 'wall' },
  '.': { name: '地板',       solid: false, style: 'floor' },
  'q': { name: '棋盘格',     solid: false, style: 'chessFloor' },
  'z': { name: '棋子凳',     solid: false, style: 'chessSeat' },
  'M': { name: '大门·阅览室', solid: false, style: 'bigDoor', portal: 'reading' },
  'W': { name: '大门·卫生间', solid: false, style: 'bigDoor', portal: 'toilet' },
  'm': { name: '房间门',     solid: false, style: 'door',    portal: 'atrium' },
  'D': { name: '底边大门',   solid: true,  style: 'door',    portal: false },
  'B': { name: '书架',       solid: true,  style: 'bookshelf' },
  'T': { name: '阅览桌',     solid: true,  style: 'table' },
  'c': { name: '椅子',       solid: false, style: 'chair' },
  'R': { name: '洁具',       solid: true,  style: 'toilet' },
};
```

### 4.2 `maps/atrium.js`（中庭）

- `name: '中庭'`
- `map`：现有 39×30 行**原样搬移**（不改布局）
- `chessSeats`：现有 32 子坐标**原样搬移**
- ~~`doors`~~（2026-10-16 修订：已删除，门目的地由地图字符本身编码，见 4.1 修订注）
- `spawn: { col: 19, row: 27 }`
- `decor`：挑空暖光 + 门口垫子（现在硬编码在 buildCanvas 里）
  ```js
  { light: { x: 2, y: 2, w: 35, h: 26, alpha: 0.10, color: '#ffd98a' },
    mat: { col: 19, row: 28, w: 2 } }
  ```

### 4.3 `maps/reading.js` / `maps/toilet.js`

- `name`、`map`（现有 39×30 行原样搬移）
- ~~`doors`~~（已删除：房间地图里的 `m` 字符即"回中庭"）
- `entry: { col: 20, row: 27 }`（进入房间时玩家落点，出口门上方）

## 5. 引擎 API（js/map.js，重构后）

```js
TILE                                        // = 16
parseMap(mapRows) → { rows, cols, grid }    // 校验等宽
isSolidAtPx(px, py, mapRows, tiles) → bool  // 越界 true；tiles 未定义字符视为 solid（防呆）
isDoorAt(px, py, mapRows, tiles) → bool     // tiles[ch].portal 非空（truthy）
doorDestAt(px, py, mapRows, tiles) → string|null  // 门的目的地场景名（2026-10-16 新增）
buildCanvas(sceneData, tiles) → canvas      // drawTile 内部按 tiles[ch].style 分发
```

约束：所有数据参数传入、顶层无 DOM/无全局依赖、Node 可 require。

## 6. main.js 改动

- 启动时：`scenes = { atrium/reading/toilet }` 各自 `{ data, canvas }`
- 出生点读 `MAPS.atrium.spawn`
- `doorAtPlayer()`：脚部格字符的 `portal` 为真 → 在当前场景 `data.doors` 中找包含该格的门 → 返回门配置
- E 键：门 `to === 'atrium'` → `exitRoom()`（恢复 atriumPos）；否则 `enterRoom(to)`（玩家放到 `scenes[to].data.entry`）
- 删除硬编码的「row 8-9 → toilet」逻辑

## 7. 测试

- `tests/map.test.js`：require 场景配置 + tiles + 引擎，保留原有断言（尺寸/碰撞/连通性/门检测含 doorDestAt 目的地），适配新 API
- `tests/config.test.js`（新增 · 配置体检）：
  1. 每个场景 map 行宽一致
  2. 地图里每个符号都在 tiles 有定义
  3. tiles 里每个 portal 目的地都是已知场景名（2026-10-16 修订）
  4. 每张地图里出现的 portal 符号目的地均为已知场景（2026-10-16 修订）
  5. `spawn`/`entry` 落在非 solid 格
  6. `chessSeats` 的 key 都是 `z` 格，且数量与地图中 `z` 字符数一致（32）

目的：用户改错配置时测试立刻报警，不用开浏览器。

## 8. 明确不做

- 画法（style 的渲染实现）数据化
- 猫咪位置进配置
- 调整中庭布局不对称（左右墙厚度不同）——本次只搬数据
- 新场景（二楼/室外）

## 9. 验收

- `npm test` 全部通过（含配置体检）
- 浏览器行为与重构前完全一致（像素采样关键 tile + 进出房间 e2e）
- 双击 `index.html` 可玩
