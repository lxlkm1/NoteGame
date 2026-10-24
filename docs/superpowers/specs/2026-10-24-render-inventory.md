核实完毕（画布 1248×960、`TILE=16/ART_SCALE=2`、`STYLE_DRAW` 18 项、`detailedSprite` 高光逻辑、`src/assent/` 现有 2 个 mp3 均与代理报告一致）。以下为汇总报告。

---

# NoteGame 渲染系统梳理报告 —— 代码绘制 → 图片资源改造调研

## 1. 渲染管线总览

游戏是纯 Canvas 2D 像素风渲染，无任何框架。`index.html` 里写死 `<canvas id="game" width="1248" height="960">`（= 39 列 × 30 行 × 16px × 2 倍），CSS 里 `image-rendering: pixelated` 保持硬边像素。世界坐标恒定 **16px/格**（`TILE=16`、`ART_SCALE=2`，定义在 `src/map.js:4-5`）。渲染分两条路：**静态场景只画一次**——`src/scenes.js` 启动时对 4 个场景（atrium/reading/toilet/outside）各调一次 `src/tile-render.js` 的 `buildCanvas()`，把整张地图按 `STYLE_DRAW` 表逐格 `fillRect` 预渲染成 1248×960 离屏 canvas；**动态部分每帧画**——`src/main.js` 的 `loop(t)`（`requestAnimationFrame` 驱动，`dt` 封顶 0.05s）先更新玩家/猫/NPC/粒子逻辑，再调 `src/render.js` 的 `render()`：`setTransform(scale)` → 清屏 → 移动端相机 `translate` → `drawImage(scenes[G.scene].canvas)` 贴场景底图 → 把猫/玩家/NPC 按 y 排序（伪深度遮挡）逐个绘制 → 画名牌/心条/气泡/门提示 → `drawParticles()` 画粒子。所有角色图形都来自"字符矩阵 + 调色板"，经 `src/sprites.js` 的 `drawSprite()` 烘焙成离屏 canvas 再贴图，全程 `imageSmoothingEnabled = false`。

## 2. 完整绘制清单

### 角色（玩家 / 猫 / 咪咪）

| 名字 | 怎么画的 | 尺寸 | 动画帧数 | 数据位置 |
|---|---|---|---|---|
| 玩家（down1/down2/up1/up2/side1/side2） | 手写字符矩阵 + `PALETTE_PLAYER`，`drawSprite` scale=1.5，left 用 side 帧镜像 | 16×16 → 屏幕 24×24 | 6 | `src/data/sprites.js` `PLAYER_FRAMES`；帧选择 `src/player.js` `frameKey()` |
| 普通猫 ×10（idle1/idle2/walk1/walk2/eat/sleep） | 同一套 `CAT_FRAMES` 矩阵，10 只猫各带一套调色板，scale=1.25 | 16×16 → 屏幕 20×20 | 6（×10 配色） | 帧：`src/data/sprites.js` `CAT_FRAMES`；配色：`src/data/cats.js` `CAT_DEFS[].palette`；选帧 `src/npc/cats.js` `catFrame()` |
| 咪咪（奶牛猫，同 6 态） | `MIMI_FRAMES` 矩阵 + 独立调色板，复用 `Cats.drawCat()` | 16×16 → 20×20 | 6 | `src/data/sprites.js` `MIMI_FRAMES`；`src/npc/mimi.js` `PALETTE` |
| 被 zdw 拎起的咪咪 | `ZDW_MIMI_FRAME` 矩阵烤 canvas，`drawZdw` 里 `translate(手)+rotate(angle)` 绕后爪锚点 `ZDW_MIMI_PAW(4,1)` 旋转 | 16×24 | 1（旋转是程序插值） | `src/data/zdw-sprites.js`；`src/npc/zdw-render.js` |

### NPC

| 名字 | 怎么画的 | 尺寸 | 动画帧数 | 数据位置 |
|---|---|---|---|---|
| 学习/通勤学生（4 套配色） | 复用 `PLAYER_FRAMES` + `src/npc/shared.js` `COLORS` 调色板，`drawPerson()` scale=1.5 | 16×16 → 24×24 | 6（×4 配色） | `src/npc/shared.js` `drawPerson`；`src/npc/student.js` |
| 小蠹鱼奶牛（typing1/typing2/walk1/walk2） | `cowFrame()` 用 rect/oval 程序化生成 32×32 矩阵，`drawDuyuCow` 缩到 24×24 | 32×32 → 24×24 | 4 | `src/data/sprites.js` `DUYU_COW_FRAMES`；`src/npc/duyu.js` |
| 情侣女生（走 6 + hug/kiss/deepKiss） | `girlFrame()` 程序化生成 40×48 矩阵，`couple-render.js bitmap()` 1:1 烘焙（无高光滤镜） | 40×48 | 9 | `src/data/couple-sprites.js` `COUPLE_FRAMES.girl`；`src/npc/couple-render.js` |
| 情侣男生（走 6 + approach/hug/kiss/deepKiss/release） | `boyFrame()` 同上；kiss 帧用 `shiftUp(3)` 踮脚 | 40×42 | 11 | `src/data/couple-sprites.js` `COUPLE_FRAMES.boy` |
| 情侣草坪组合帧（lawnSit/lawnLap/lawnHold/lawnHoldTight/lawnRise） | `lawnFrame()` 在 64×56 共享画布上合成双人（含前后手臂分层、`stamp()` 复用单人头部），只由男生 NPC 画一次，锚点 `COUPLE_LAWN_ANCHOR(40,56)` | 64×56 | 5 | `src/data/couple-lawn-sprites.js` |
| zdw 考研学生（走 6 + study/reach） | `studentFrame()` 程序化生成 32×40 矩阵，`zdw-render.js bitmap()` 烘焙；left 镜像 | 32×40 | 8 | `src/data/zdw-sprites.js` `ZDW_FRAMES`；`src/npc/zdw-render.js` |

### 地块（`src/tile-render.js` `STYLE_DRAW` 共 18 种，每格 16×16，启动时预渲染）

| 名字 | 字符 | 怎么画的 | 动画 |
|---|---|---|---|
| 墙 wall | `#` | `fillRect` 深紫灰 #4a4453 + 顶部亮线；details 补砖缝 | 无 |
| 木地板 floor | `.` | `drawWoodBase` 按 (col+row)%2 交替两色 + 木纹 | 无 |
| 象棋棋盘格 chessFloor | `q` | 米白/深棕交替整格 | 无 |
| 棋子凳 chessSeat | `z` ×32 | `arc` 画圆棋子 + `fillText` 写繁体象棋字（字表在 `src/data/maps/atrium.js` `chessSeats`） | 无 |
| 房间门 door | `m` / `D` | 门框 + 门扇 + 金把手（`D` 为整格木门） | 无 |
| 大门 bigDoor | `M` / `W` | 双格高木门（portal 到 reading/toilet） | 无 |
| 图书馆入口 outsideDoor | `i` | 深底 + 木门 + 金把手 | 无 |
| 外墙 facade | `F` | 交替紫灰；`row===2 && col%6===3` 时叠加暖光窗 | 无 |
| 石板路 pavement | `p` | 交替灰 + 缝线 | 无 |
| 草地 grass | `g` | 交替绿 + 草叶点 | 无 |
| 树 tree | `t` | 草地底 + 树干 + 两层树冠 | 无 |
| 树丛 shrub | `s` | 草地底 + 三层灌木矩形 | 无 |
| 路灯 lamp | `l` | 草地底 + 灯杆 + 暖黄灯罩 + 透光 | 无 |
| 长椅 bench | `b` | 草地底 + 椅面 + 木板亮线 | 无 |
| 书架 bookshelf | `B` | 木地板底 + 木框 + 4 本彩色书（`BOOK_COLORS` 按坐标哈希取色） | 无 |
| 阅览桌 table | `T` | 木地板底 + 桌面 + 亮边 | 无 |
| 椅子 chair | `c` | 木地板底 + 椅面 | 无 |
| 洁具 toilet | `R` | 瓷砖底 + 白色马桶/洗手台 | 无 |

### 道具

| 名字 | 怎么画的 | 尺寸 | 帧数 | 数据位置 |
|---|---|---|---|---|
| 猫粮碗 bowl（空/满） | `render.js drawDishes()` 直接 `fillRect`：碗体 + 内容色 + 粮粒 | 14×6 | 2 态 | `src/render.js`；位置 `src/bowls.js` `SPOTS` |
| 猫粮碟 DISH | 10×4 字符矩阵经 `drawSprite` | 10×4 | 1 | `src/data/sprites.js` `DISH/PALETTE_DISH` |
| 学生手中的书 | `drawPerson` 尾部 `fillRect` 书身 10×4 + 书页 1×4 两色交替（1.3s） | 10×4 | 2 | `src/npc/shared.js` |
| 小蠹鱼笔记本 | `drawDuyu` 里 `fillRect` 机身/屏幕/底座，打字光标 6 位循环 | 14×14 | 6 | `src/npc/duyu.js` |
| 门口垫子 decor.mat | `buildCanvas` 里两个红色矩形 | 约 28×10 | 1 | `src/tile-render.js`；配置 `src/data/maps/atrium.js` |

### 特效

| 名字 | 怎么画的 | 尺寸 | 帧数 | 数据位置 |
|---|---|---|---|---|
| 中庭暖光 decor.light | `globalAlpha=0.1` 暖色大矩形 | 35×26 格 | 1 | `src/tile-render.js buildCanvas` |
| 爱心 HEART（心条 + 粒子共用） | 7×6 字符矩阵，调用方现场给单色调色板（满 #ef6a8a / 空 #4a4453） | 7×6 | 1 | `src/data/sprites.js` `HEART` |
| 爱心粒子 | `drawSprite(HEART)` + `globalAlpha=1-life/ttl` 上飘 | 7×6 | 运动动画 | `src/particles.js` `spawnHearts` |
| 文字粒子（喵♪ / z） | `fillText` 8px monospace 渐隐上飘 | 文字 | 运动动画 | `src/particles.js` `spawnText` |
| zdw 抓猫手臂 | `pixelLine()` 逐像素画肩→肘→手两节线段，位置按 `zdwCapturePose` smoothstep 进度插值 | 约 30px 长 | 连续插值 | `src/npc/zdw-render.js` |
| zdw 脚下影子 | `ctx.ellipse` 半透明黑 | 20×6 | 1 | `src/npc/zdw-render.js drawZdw` |

### UI（全部 `fillText`/`fillRect` 或纯 DOM）

| 名字 | 怎么画的 | 数据位置 |
|---|---|---|
| 猫名牌 + 5 心好感条 + 「E 投喂」气泡 | `render.js drawCatOverlay()`：双色描边 `fillText` + 5 个 HEART + 白底方块 | `src/render.js` |
| 门提示（E 进馆/出馆/出门/进入） | `drawDoorHint()` 双色描边文字 | `src/render.js` |
| 咪咪名牌 / 警觉「!」/「E 放食物」提示 | `render()` 内 `fillText` | `src/render.js` |
| 小蠹鱼对话气泡 | 双层 `fillRect` + `fillText` | `src/render.js` reading 分支 |
| zdw 名牌 / 「考研复习」标签 | 半透明底 + `fillText` | `src/npc/zdw-render.js drawZdw` 末尾 |
| DOM HUD（标题/进度/音乐/全屏/触屏方向盘/交互键） | 纯 HTML+CSS，非 canvas | `index.html` + `style.css` |

## 3. 数据格式说明：sprite 数据到底是什么

一帧精灵 = **一个字符串数组（字符画）+ 一个调色板对象**。矩阵一行一个字符串、一个字符一个像素，`'.'` 表示透明；调色板把字符映射到 hex 颜色。真实例子（`src/data/sprites.js:4-21` 玩家 down1 帧节选 + 404 行 DISH）：

```js
const DISH = [ // 猫粮碟 10x4
  '..KKKKKK..',
  '.KFFFFFFF.',
  '.FaFFFFaF.',
  '..KKKKKK..',
];
const PALETTE_DISH = { K: '#4a5a74', F: '#a8c0d8', a: '#8a5c34' };
```

变成画面的过程（`src/sprites.js`）：

1. `detailedSprite(matrix, palette)` 创建 2 倍尺寸离屏 canvas（10×4 → 20×8），逐字符查调色板 `fillRect(col*2, row*2, 2, 2)`；
2. 同时程序化叠加"家风格"后处理：每个色块**顶边加高光** `tint(color, 22)`、**底边加暗点** `tint(color, -20)`、按 `(col*7 + row*11) % 9 === 0` 撒**织物颗粒** `tint(color, 12)`；
3. 结果按 `WeakMap(矩阵) → Map(JSON.stringify(palette)) → canvas` 永久缓存——所以同一套 `CAT_FRAMES` 换 10 套调色板会缓存 10 份；
4. `drawSprite(ctx, matrix, palette, x, y, flip, scale)` 取缓存 canvas，`imageSmoothingEnabled=false`，以**底边居中**为锚点（`drawY = y - (height - matrix.length)`）`drawImage`；`flip=true` 时 `translate + scale(-1,1)` 镜像——左向图全靠免费镜像，没有单独数据。

另有 5 个**程序化生成器**产出同样格式的矩阵：`cowFrame()`（奶牛）、`studentFrame()`（zdw）、`girlFrame()`/`boyFrame()`（情侣）、`lawnFrame()`（草坪组合）——它们用 `rect/oval/line/stamp/shiftUp` 原语在字符网格上"算"出像素画，模块加载时执行一次。瓦片不走 sprite 管线：`src/data/maps/*.js` 的等宽字符串地图（一字符=一格）经 `src/data/maps/tiles.js` 图例映射到 `style`，由 `STYLE_DRAW[style]` 函数逐格 `fillRect` 画进预渲染位图。

## 4. 动画系统说明

**没有帧动画框架，全靠"逻辑侧累积计时器，渲染侧按阈值取模选帧"**。主循环 `main.js loop()` 每帧产生 `dt`（秒，≤0.05），各实体的 `update()` 累加 `animTimer`/`walkTimer`/`blinkTimer`，绘制前用纯函数选帧：

- **走路循环**（玩家/学生/猫/情侣/zdw 统一套路）：`Math.floor(animTimer / 间隔) % 2` 在 xx1/xx2 两帧间切换——玩家 0.15s（`player.js frameKey()`）、学生/情侣 0.2s、zdw 0.18s、猫 0.25s（frenzy 0.09s）。朝向决定 down/up/side 前缀，**left 不存帧，绘制时镜像 side 帧**。
- **猫眨眼**：`Math.floor(blinkTimer/1.6)%5===4` 时切 idle2（约每 8 秒一次）。
- **状态→姿势映射**：猫 `nap→sleep`、`eat→eat`；zdw `phase: study/reach`；情侣 `npc.action` 直接写姿势名（approach→hug→kiss→deepKiss→release、草坪 lawnSit→…→lawnRise，由 `couple.js` 状态机的 `LAWN_STAGES`/`ACTIONS` 表驱动）。
- **唯一连续动画**：zdw 抓猫——`zdwCapturePose()` 用 `phaseTimer/phaseDuration` 算 smoothstep 进度（grab 0.55s → hold 2.4s → release 0.55s），每帧插值手臂肘/手位置和猫的旋转角（-90°→0°），不是离散帧。
- **粒子**：欧拉积分（`x+=vx*dt`），`alpha=1-life/ttl` 渐隐，无帧切换。
- **场景**：完全静态，预渲染一次后每帧只 `drawImage`，换图不需要还原任何时序。

## 5. 换图片可行性分级

### 【直接可换】一图一物，管线原样保留

| 对象 | 需要出的图 | 说明 |
|---|---|---|
| **4 张场景底图** | 4 张整图（建议 1248×960，即 2 倍）或 18 种 tileset 小图 | **收益最大、改动最小**。场景本来就是预渲染位图再 `drawImage`，把 `buildCanvas()` 改成加载 PNG 画进离屏 canvas 即可；地图字符串保留做碰撞/portal 判定，逻辑零改动 |
| 玩家 6 帧 | 6 张 PNG | 纯查表渲染；锚点（底部居中）、scale=1.5、left 镜像逻辑全部保留 |
| 咪咪 6 帧 | 6 张 | 同上，scale=1.25 |
| 猫粮碟 DISH、爱心 HEART | 各 1 张 | 单色/少色小图，几乎零成本 |
| 猫粮碗空/满 | 2 张 | 现在是 3 个 fillRect，换成 `drawImage` |
| 奶牛 4 帧 / zdw 8 帧 / 情侣 9+11 帧 / 草坪 5 帧 | 共约 37 张 | **输出本是静态矩阵，可离线烘焙**：跑一次现有生成器把 `detailedSprite()/bitmap()` 产出的 canvas `toDataURL` 导出 PNG，之后删掉生成器，运行时代码基本不动 |
| 情侣草坪组合帧 | 5 张 64×56 | 注意锚点 `(40,56)` 要随图保存 |

### 【需要切割/重组】换图但要处理变体或分层

| 对象 | 难点 | 建议 |
|---|---|---|
| 10 只普通猫 | 一套 `CAT_FRAMES` × 10 套调色板 | 要么 6×10=60 张图，要么离线按调色板批量染色导出 60 张，要么保留矩阵当"索引图"+ 运行时染色（现状即如此） |
| 4 色学生 NPC | 同理，`PLAYER_FRAMES` × 4 配色 | 4×6=24 张，或随玩家帧一起离线染色 |
| 棋子凳 ×32 | 同一圆座上写 12 种繁体象棋字 | 1 张底座图 + 12 张字图叠加，或保留 `fillText` 文字层只换底座 |
| 书架 / 木地板 / 石板路 / 草地 / 外墙亮窗 | 颜色/窗户按 col/row 坐标变化 | 整图方案直接画死即可；tileset 方案需 2~6 张变体图轮换，否则画面变重复 |
| 情侣 hug/kiss 帧的手臂层次 | 男生远臂画在女生帧内被身体遮挡 | 按"整帧合成图"出图最简单；拆两人独立 PNG 则需维持"远臂→女生身体→近臂"三层顺序 |
| 高光/暗边/颗粒后处理 | `detailedSprite` 的 tint(+22/-20/+12) 是运行时滤镜 | 美术图里画好明暗，或保留一个对 Image 的后处理 pass；否则换图后风格与未换的部分不一致 |

### 【难以替换（程序化生成）】建议保留代码

| 对象 | 原因 |
|---|---|
| **zdw 抓猫手臂** | `pixelLine` 按 smoothstep 进度逐帧插值两段手臂 + 猫绕后爪旋转 -90°→0°，是连续骨骼动画。图片化只能预渲染 8~12 个离散 lift 帧按 progress 索引（工作量大于收益），或拆成上臂/前臂/手掌/猫 4 张部件图继续程序骨骼 |
| 文字类 UI（猫名牌、门提示、对话气泡、zdw 名牌、文字粒子「喵♪/z」） | `fillText` 动态文本，换图无收益；气泡底框可换 9-slice 图，文字保留 |
| 粒子运动/渐隐、暖光层、影子 | 是行为逻辑（vx/vy/ttl/alpha）不是贴图，框架必须保留；单帧图案（爱心）换图即可 |
| 翻页书本、笔记本打字光标 | 2~6 帧小程序动画，可留代码也可做小 PNG 序列，优先级最低 |
| DOM HUD | 已是 HTML+CSS，与 canvas 管线无关；想美化换 CSS `background-image` 即可 |

**推荐落地顺序**：① 4 张场景整图（最大面积、零动画风险）→ ② 玩家/猫/道具 PNG + 图片预加载器 → ③ 离线烘焙 37 张程序生成帧 → ④ 按需处理猫的 60 张配色变体。

## 6. 换图片的技术约束

1. **资源目录已存在**：`src/assent/`（注意拼写是 assent 不是 assets，现仅有 `canon.mp3`、`Annies Wonderland.mp3` 两个 BGM，`index.html` 已引用）。图片可直接放此目录，如 `src/assent/img/player-down1.png`。
2. **必须异步预加载**：现在所有 sprite 是模块加载时同步生成的，换 `new Image()` 后必须等全部 `onload`（包成 Promise `Promise.all`）再启动 `main.js` 的 `requestAnimationFrame(loop)` 和 `scenes.js` 的 `buildCanvas()`，否则首帧画空图。缓存层直接把 `spriteCache` 的 WeakMap 换成"路径 → Image"的 Map 即可。
3. **像素风三件套不能丢**：每个 2d 上下文（主 canvas + 所有离屏 canvas）都要 `imageSmoothingEnabled = false`；CSS 的 `image-rendering: pixelated` 保留；绘制坐标用 `Math.round` 取整（`drawSprite` 现有做法）防半像素模糊。
4. **图片分辨率对齐现有 2 倍链**：世界坐标 16px/格、预渲染/角色烘焙都是 `ART_SCALE=2`。tile 图建议 32×32（或整场景图 1248×960）；角色图按"矩阵尺寸 × ART_SCALE"出图（玩家 32×32、猫 32×32、情侣 80×96、草坪帧 128×112、zdw 64×80），运行时继续按原 scale（人 1.5、猫 1.25）放大绘制，画面尺寸与现在完全一致。
5. **锚点约定要沿用**：`drawSprite` 的锚点是**底边居中**（`drawX = x - (width - matrixW)/2`，`drawY = y - (height - matrixH)`），换图后所有 PNG 的脚底位置要和原矩阵一致，否则 y 排序遮挡和碰撞视觉会错位；草坪帧另有独立锚点 `COUPLE_LAWN_ANCHOR(40,56)`，被抓猫有 `ZDW_MIMI_PAW(4,1)`。
6. **左向不要出图**：所有 left 朝向靠 `ctx.scale(-1,1)` 镜像 side 帧，换 PNG 后依然免费，只需出右向（情侣例外：女生原图朝右、男生朝左，出图时保持各自基准朝向，`selectCoupleFrame` 的 flip 条件已对应）。
7. **移动端坐标链不受影响但要测**：`render.js` 的相机 = `ART_SCALE × mobileZoom(2.5)` + `translate(-cameraX,-cameraY)`，只认世界坐标，与图片来源无关；但换图后需在移动端尺寸下验证角色没有因图片留白不同而偏移。
8. **调色板复用是最大隐患**：`CAT_FRAMES`×10、`PLAYER_FRAMES`×4、`HEART` 满/空双色都靠"一矩阵多配色"。若改为纯 PNG，这些运行时配色能力消失——要么接受资源数量膨胀（60 张猫图），要么保留一个"灰度索引图 + 运行时 tint"的折中方案。
9. **测试要同步更新**：`deploy/tests/sprites.test.js`、`couple-sprites.test.js`、`zdw-sprites.test.js` 等直接断言矩阵内容，换图后这些测试要改写为断言资源清单/尺寸，或改为像素采样校验。