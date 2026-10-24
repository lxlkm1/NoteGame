# 渲染系统图片资产管线改造 —— 设计文档

日期：2026-10-24
状态：已与用户对齐，待写实现计划

## 背景与目标

NoteGame 是纯 Canvas 2D 像素风小游戏（无框架，约 4900 行 JS）。当前所有画面由代码渲染：角色是"字符矩阵 + 调色板"数据经 `detailedSprite()` 烘焙成 canvas，场景由 `STYLE_DRAW` 逐格 `fillRect` 预渲染。

**目标**：把游戏的视觉资产从"代码数据"改为"图片文件"——导出 PNG 到 `src/assent/img/`，运行时加载图片渲染。画面与现状逐像素一致，这是一次工程结构改造（资产管线），不是画面升级。

**动机**：美术与代码分离（图片可直接查看/编辑/替换）；为将来 AI 生成美术铺路；运行时渲染层变薄。

## 已确认的决策

| 决策点 | 结论 |
|---|---|
| 图片来源 | 脚本从现有像素数据批量导出 PNG |
| 替换范围 | 全量换图：场景 + 玩家/咪咪/10 配色猫/4 色学生/情侣/zdw/奶牛 + 道具 + 爱心图案（约 150 张 PNG）。**保留代码**：zdw 抓猫手臂（连续插值动画）、文字类 UI、粒子运动逻辑、DOM HUD |
| 图片组织 | 每帧一个独立 PNG（不用雪碧图），可直接打开查看/替换 |
| 像素数据去留 | 保留 `src/data/*.js` 和生成器作为"源文件"，运行时不再加载；导出脚本可随时重跑 |
| 导出方案 | 浏览器导出页 + Python Playwright 采集（100% 保真，含象棋字 fillText） |
| 场景图片粒度 | **元素素材（2026-10-24 用户拍板，取代整图方案）**：每种地块的每个位置变体一张 32×32 PNG（按内容去重，约 60-150 张），运行时按地图字符串逐格组装。改地图无需重跑导出（位置参数组合已全量覆盖）；只有改画法（STYLE_DRAW）才需重跑 |

## 总体架构

### 导出管线（开发时用，不进游戏）

```
src/data/*.js（像素数据 = 源文件）
    ↓ tools/export.html —— 在浏览器里跑游戏现有的渲染函数
    ↓ tools/export.py   —— Playwright 逐个 canvas 采集 toDataURL
src/assent/img/**.png + manifest.json（产物）
```

### 运行时管线（游戏实际运行）

```
main.js 启动 → await assets.load() 预加载全部 PNG（Promise.all）
    → drawSprite(key) 内部查 Image → drawImage（不再碰矩阵/调色板）
    → buildCanvas() 每格算 tileKey(字符,列,行) → 查地块 PNG → drawImage 组装场景
    → 地图字符串保留做碰撞/portal 判定 + 场景组装依据（逻辑零改动）
```

核心思路：**薄壳替换**——`drawSprite` 等函数签名基本不变、调用方少动，只换内部实现（从"烘焙矩阵/逐格 fillRect"换成"查图片"）。

### 场景素材导出（标定地图法）

地块画法存在位置相关变化（交替色、种子纹理、书架变色、象棋字、外墙亮窗），为保证逐像素一致且**不改任何现有渲染代码**：

1. 导出页为图例中每个字符生成 66×66 格标定地图（66 = 位置周期 2/11/6 的最小公倍数，穷尽所有参数组合），用现有 `buildCanvas` 旧路径渲染，逐格裁 32×32 小图，按内容去重
2. 象棋凳：标定地图配合成 chessSeats 数据，把 12 种繁体字各渲成独立图
3. 页内像素对比：素材组装的 4 场景 vs 旧代码渲染的 4 场景必须逐像素一致（每次导出自动验证）
4. 共享纯函数 `tileKey(ch, col, row, tiles, sceneData)`（`src/tile-key.js`）让导出与运行时算出同一个 key

## 图片目录结构

```
src/assent/img/
├── tiles/      地块素材（32×32，按内容去重）：墙/地板×2/草地/石板路/书架×6/象棋凳12字/
│               棋盘格×2/门/大门/外墙×2/树/树丛/路灯/长椅/桌椅/洁具… 约 60-150 张
├── player/     down1/down2/up1/up2/side1/side2.png（32×32）
├── mimi/       idle1/idle2/walk1/walk2/eat/sleep.png（32×32）
├── cats/       cat01…cat10/ × 6 帧（60 张，配色变体全导出）
├── students/   s1…s4/ × 6 帧（24 张）
├── couple/     girl-*（9 张 80×96）boy-*（11 张 80×84）lawn-*（5 张 128×112）
├── zdw/        8 张（64×80）
├── duyu/       cow-*（4 张）laptop-*（6 张）
└── props/      dish / bowl-empty / bowl-full / heart-full / heart-empty / book×2 等
```

`manifest.json` 格式：`{ "<key>": { "path": "img/player/down1.png", "w": 32, "h": 32 } }`。

## 运行时改动

| 文件 | 改动 |
|---|---|
| `src/assets.js`（新增） | 预加载器：fetch manifest → Promise.all 加载全部 PNG → `Map<key, Image>`；导出 `img(key)` 查询 |
| `src/sprites.js` | `drawSprite(ctx, key, x, y, flip, scale)` 内部改查 Image；`detailedSprite` 等烘焙逻辑在阶段三搬到 `tools/export-lib/` 供导出页专用 |
| `src/tile-key.js`（新增） | 纯函数 `tileKey(ch, col, row, tiles, sceneData)` → 地块素材 key；导出页与运行时共用 |
| `src/tile-render.js` | `buildCanvas(sceneData, tiles)` 改为按 tileKey 查图组装（缺图的格子画品红占位）；旧逐格绘制实现保留为 `buildCanvasLegacy`（含 `STYLE_DRAW`/`drawTileDetails`），仅导出页使用，阶段三搬到 `tools/export-lib/`；decor 暖光/门垫因尺寸位置由地图配置驱动，保留代码叠加（归"特效"类） |
| `src/scenes.js` | 模块加载时不再立即渲染；新增 `initScenes()` 在资产加载后调 `buildCanvas` 构建场景表 |
| `src/main.js` | 启动改 async：显示 loading 提示 → await assets.load → initScenes() → 启动 loop |
| 8 个调用方（player.js / cats.js / mimi.js / shared.js / duyu.js / couple-render.js / zdw-render.js / render.js） | 每处 `drawSprite(ctx, 矩阵, 调色板, …)` 改为 `drawSprite(ctx, 'key', …)`，每处几行 |

**错误处理**：图片加载失败（onerror）→ 记入错误清单，console 报出全部缺失 key；该位置每帧画品红占位方块（明显可见，便于发现缺图）。加载全部完成（含失败）后才进入主循环。

## 导出工具

### `tools/export.html`

- import 游戏现有的 `sprites.js` / `tile-render.js` / `data/*.js`（跑真实渲染代码，零重写；阶段三这些渲染函数搬到 `tools/export-lib/` 后改为从那里 import）
- 每个精灵帧调 `detailedSprite()`/`bitmap()` 得到 canvas；地块素材用"标定地图法"：`buildCanvasLegacy` 渲染 66×66 合成地图后逐格裁剪（见 §场景素材导出）
- 页内自检：素材组装的 4 场景 vs `buildCanvasLegacy` 旧路径渲染，逐像素 diff 必须为 0
- 情侣 hug/kiss 分层帧按运行时渲染顺序（远臂→女生身体→近臂）合成到同一 canvas 再导出
- 全部挂到 `window.__EXPORTS__ = { key: canvas }`

### `tools/export.py`

- 内嵌 `http.server` 线程起本地静态服务（ES module 在 file:// 下被 CORS 拦截，必须走 http）
- Playwright 打开 export.html → 等 `__EXPORTS__` 就绪 → 逐 key `toDataURL()` → 解码存 PNG
- 写 `manifest.json`（含尺寸）
- 运行：`/home/lxl/miniforge3/envs/opencode/bin/python tools/export.py`，重跑即全量重导

## 特殊情况处理

- **地图可编辑性（硬约束，不可改变）**：地图字符串文件（`src/data/maps/*.js`）是地图布局的唯一事实来源。元素素材方案下改布局的流程是：编辑字符串网格 → 直接刷新游戏（素材已按位置参数全量导出，**无需重跑导出**）；只有改画法（`STYLE_DRAW`）才需要重跑 `python tools/export.py`。运行时碰撞/portal/solid 判定全部从字符串读取，与 PNG 内容无关（现状即如此，改造不改变这一点）

- **左向朝向**：不出图；运行时 `ctx.scale(-1,1)` 镜像 side 帧的逻辑保留（情侣男女各自基准朝向例外，按现状）
- **zdw 抓猫**：手臂 `pixelLine` 连续插值保留代码；`ZDW_MIMI_FRAME`（被抓的猫）导出 PNG，`translate+rotate` 逻辑保留
- **文字类 UI**（猫名牌/心条数字/门提示/对话气泡/文字粒子）：保留 fillText；气泡底框本期不换图
- **爱心图案**：导出 `heart-full.png`（#ef6a8a）/ `heart-empty.png`（#4a4453）两张，心条按好感度选图；爱心粒子用 heart-full
- **粒子运动/渐隐、影子、暖光**：运动逻辑保留代码；暖光层和门垫（decor）因几何由地图配置驱动，作为代码叠加层保留在 `buildSceneFromTiles` 中（与旧路径画法一致）
- **锚点**：全部沿用现有约定（drawSprite 底边居中、草坪帧 `COUPLE_LAWN_ANCHOR(40,56)`、被抓猫 `ZDW_MIMI_PAW(4,1)`），保证 y 排序遮挡和碰撞视觉不错位
- **像素风三件套**：所有 2d 上下文 `imageSmoothingEnabled=false`；CSS `image-rendering: pixelated` 保留；绘制坐标 `Math.round` 取整
- **图片分辨率**：PNG = 现有烘焙 canvas 原始尺寸（矩阵 ×2，如玩家 32×32）；运行时按原 scale（人 1.5、猫 1.25）绘制，画面尺寸与现在完全一致

## 验证方案

1. **像素级对比**：export.html 页内自检 + export.py 二次校验——素材组装的场景 vs `buildCanvasLegacy` 旧代码渲染逐像素 diff 必须为 0（只允许象棋字抗锯齿级差异），不一致则导出失败退出
2. **现有测试改造**：`deploy/tests/*sprites*.test.js` 从"断言矩阵内容"改为"断言资源完整性"（每个 key 有 PNG、尺寸正确、非空白图）
3. **手测走查**：4 个场景 + 投喂猫 + zdw 抓猫 + 情侣全流程；桌面端与移动端视口各一遍

## 分阶段落地

| 阶段 | 内容 | 完成标志 |
|---|---|---|
| 一 | 导出管线（export.html + export.py）+ 地块素材导出（标定地图法）+ 运行时素材组装 | 4 个场景显示与之前逐像素一致（角色仍是代码渲染，并存）；改地图布局不重跑导出即生效 |
| 二 | 全部角色/道具导出 + assets.js + drawSprite 换芯 + 8 个调用方改 key | 全画面来自 PNG，像素对比通过 |
| 三 | 清理：运行时移除烘焙代码、测试改造、更新 README/CLAUDE.md | `node --test` 通过，文档反映新管线 |

每阶段结束后跑游戏验证 + 用户确认，再进下一阶段。token 记录照旧每任务一记（`node tools/token-log.mjs --task "…"`）。

## 参考

- 渲染系统完整梳理（179 个绘制项清单、可行性分级、技术约束细节）：[2026-10-24-render-inventory.md](2026-10-24-render-inventory.md)
