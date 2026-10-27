// tile-render.js —— 地砖画法（STYLE_DRAW 按 style 分发）+ 场景预渲染（buildSceneFromTiles 运行时 / buildCanvasLegacy 导出用）
// buildCanvasLegacy 仅供 tools/export.html 导出素材用；运行时场景组装走 buildSceneFromTiles
import { TILE, ART_SCALE, parseMap } from './map.js';
import { tileKey } from './tile-key.js';
import { img } from './assets.js';

// ---- 渲染（只在浏览器调用） ----
const BOOK_COLORS = ['#c25b4e', '#4e7cc2', '#c2a84e', '#5cb27a', '#a05cc2', '#c27b4e'];

function drawWoodBase(ctx, x, y, col, row) { // 暖木交替地板（房间地板 + 书架/桌子/椅子下层）
  ctx.fillStyle = (col + row) % 2 === 0 ? '#63503e' : '#5a4837';
  ctx.fillRect(x, y, TILE, TILE);
}

// 画法按 style 名分发；'door' 被 m（portal）/ D（solid 大门）共用，
// 两者画法不同，按字符区分以保持重构前像素一致
const STYLE_DRAW = {
  wall(ctx, x, y) { // 墙：深紫灰 + 顶部亮线
    ctx.fillStyle = '#4a4453';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#5a5266';
    ctx.fillRect(x, y, TILE, 3);
  },
  door(ctx, x, y, col, row, ch) {
    if (ch === 'D') { // 底边大门：木门 + 把手
      ctx.fillStyle = '#8a5c3a';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#6d4628';
      ctx.fillRect(x, y, 1, TILE);
      ctx.fillStyle = '#e8c86e';
      ctx.fillRect(x + 11, y + 8, 2, 2);
      return;
    }
    // 房间门（portal）：门框 + 门扇
    ctx.fillStyle = '#6d4628';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#8a5c3a';
    ctx.fillRect(x + 1, y + 1, 6, 14);
    ctx.fillStyle = '#e8c86e';
    ctx.fillRect(x + 9, y + 7, 2, 2);
    ctx.fillStyle = '#5c3820';
    ctx.fillRect(x, y + 14, TILE, 2);
  },
  bigDoor(ctx, x, y) { // 大门：高大的木门（2格高组成），门框 + 门扇
    ctx.fillStyle = '#6d4628';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#8a5c3a';
    ctx.fillRect(x + 1, y + 1, 14, 14);
    ctx.fillStyle = '#e8c86e';
    ctx.fillRect(x + 11, y + 7, 3, 3);
    ctx.fillStyle = '#5c3820';
    ctx.fillRect(x, y + 14, TILE, 2);
  },
  chessFloor(ctx, x, y, col, row) { // 象棋棋盘格（可走）：米白/深棕交替
    ctx.fillStyle = (col + row) % 2 === 0 ? '#e0d3b8' : '#7a5c40';
    ctx.fillRect(x, y, TILE, TILE);
  },
  chessSeat(ctx, x, y, col, row, ch, sceneData) { // 棋子凳子：圆形棋子造型，写繁体象棋字
    ctx.fillStyle = '#c89a5e';
    ctx.beginPath(); ctx.arc(x + 8, y + 8, 7.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a5c30';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x + 8, y + 8, 7.2, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#8a5c30';
    ctx.beginPath(); ctx.arc(x + 8, y + 8, 5, 0, Math.PI * 2); ctx.fill();
    const label = sceneData.chessSeats && sceneData.chessSeats[col + ',' + row];
    if (label) {
      ctx.fillStyle = '#f0d9b0';
      ctx.font = 'bold 9px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + 8, y + 9);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
    }
  },
  toilet(ctx, x, y) { // 卫生间洁具：瓷砖 + 马桶/洗手台
    ctx.fillStyle = '#a8b8c8';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(x + 2, y + 3, 5, 3);
    ctx.fillStyle = '#e8ecf0';
    ctx.fillRect(x + 9, y + 4, 5, 6);
  },
  floor(ctx, x, y, col, row) { // 房间地板：暖木交替
    drawWoodBase(ctx, x, y, col, row);
  },
  bookshelf(ctx, x, y, col, row) { // 书架：木地板 + 木框 + 一排彩色书
    drawWoodBase(ctx, x, y, col, row);
    ctx.fillStyle = '#7a4a2e';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#5c3820';
    ctx.fillRect(x, y + 14, TILE, 2);
    for (let i = 0; i < 4; i++) {
      const hash = (col * 7 + row * 13 + i * 5) % BOOK_COLORS.length;
      ctx.fillStyle = BOOK_COLORS[hash];
      ctx.fillRect(x + 1 + i * 4, y + 2 + (i % 2), 3, 11);
    }
  },
  table(ctx, x, y) { // 阅览桌：木底 + 桌面 + 深边
    ctx.fillStyle = '#63503e'; ctx.fillRect(x, y, TILE, TILE); // 底色固定（不再随 parity 交替）
    ctx.fillStyle = '#8a5c3a';
    ctx.fillRect(x, y + 2, TILE, TILE - 4);
    ctx.fillStyle = '#9d6d47';
    ctx.fillRect(x, y + 2, TILE, 3);
  },
  chair(ctx, x, y) { // 椅子（可走）：木底 + 椅面
    ctx.fillStyle = '#63503e'; ctx.fillRect(x, y, TILE, TILE); // 底色固定（不再随 parity 交替）
    ctx.fillStyle = '#6a4a34';
    ctx.fillRect(x + 2, y + 3, 12, 10);
    ctx.fillStyle = '#7d5a40';
    ctx.fillRect(x + 2, y + 3, 12, 3);
  },
  facade(ctx, x, y) { // 图书馆外墙：纯色 + 顶部亮线；亮窗是覆盖层 drawFacadeWindow32，不画在这里
    ctx.fillStyle = '#575169';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#6b6476'; ctx.fillRect(x, y, TILE, 2);
  },
  outsideDoor(ctx, x, y) {
    ctx.fillStyle = '#3b2c36'; ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#9d704a'; ctx.fillRect(x + 2, y, 12, 15);
    ctx.fillStyle = '#e8c86e'; ctx.fillRect(x + 11, y + 8, 2, 2);
  },
  pavement(ctx, x, y) {
    ctx.fillStyle = '#797984';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#62616d'; ctx.fillRect(x, y + 15, TILE, 1);
    ctx.fillRect(x + 15, y, 1, TILE);
  },
  grass(ctx, x, y) {
    ctx.fillStyle = '#426d58';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#548066'; ctx.fillRect(x + 4, y + 5, 2, 3);
    ctx.fillRect(x + 11, y + 11, 2, 2);
  },
  tree(ctx, x, y, col, row) {
    STYLE_DRAW.grass(ctx, x, y, col, row);
    ctx.fillStyle = '#594633'; ctx.fillRect(x + 7, y + 9, 3, 7);
    ctx.fillStyle = '#244b3c'; ctx.fillRect(x + 2, y + 2, 12, 10);
    ctx.fillStyle = '#367157'; ctx.fillRect(x + 4, y + 1, 8, 8);
  },
  shrub(ctx, x, y, col, row) {
    STYLE_DRAW.grass(ctx, x, y, col, row);
    ctx.fillStyle = '#244b3c'; ctx.fillRect(x + 1, y + 5, 14, 10);
    ctx.fillStyle = '#367157'; ctx.fillRect(x + 2, y + 2, 12, 9);
    ctx.fillStyle = '#4b8968'; ctx.fillRect(x + 4, y + 3, 4, 3);
    ctx.fillRect(x + 10, y + 6, 3, 2);
  },
  lamp(ctx, x, y, col, row) {
    STYLE_DRAW.grass(ctx, x, y, col, row);
    ctx.fillStyle = '#2e3541'; ctx.fillRect(x + 7, y + 6, 2, 10);
    ctx.fillStyle = '#f3d991'; ctx.fillRect(x + 4, y + 2, 8, 6);
    ctx.fillStyle = '#ead089'; ctx.fillRect(x + 2, y + 3, 2, 4);
    ctx.fillRect(x + 12, y + 3, 2, 4);
  },
  bench(ctx, x, y, col, row) {
    STYLE_DRAW.grass(ctx, x, y, col, row);
    ctx.fillStyle = '#604333'; ctx.fillRect(x + 2, y + 5, 12, 8);
    ctx.fillStyle = '#a37b54'; ctx.fillRect(x + 2, y + 5, 12, 2);
    ctx.fillRect(x + 2, y + 9, 12, 2);
  },
};

function drawTile(ctx, ch, col, row, tiles, sceneData) {
  const t = tiles[ch];
  const draw = (t && STYLE_DRAW[t.style]) || STYLE_DRAW.floor; // 未知符号按地板画（防呆）
  draw(ctx, col * TILE, row * TILE, col, row, ch, sceneData);
}

// 外墙亮窗覆盖层（32px 无变换坐标系画完整亮窗）：旧路径细节层调用它；
// 导出页用它生成透明底 tiles/facade-window.png，运行时在同位置 drawImage 叠加——两处共用保证像素一致
function drawFacadeWindow32(ctx, x, y) {
  ctx.fillStyle = '#312b40'; ctx.fillRect(x + 2, y + 2, 28, 28);
  ctx.fillStyle = '#e8bd75'; ctx.fillRect(x + 6, y + 6, 20, 20);
  ctx.fillStyle = '#7d6070'; ctx.fillRect(x + 14, y + 6, 4, 20);
  ctx.fillStyle = '#f8dca0'; ctx.fillRect(x + 8, y + 7, 2, 10);
  ctx.fillStyle = '#b48657'; ctx.fillRect(x + 22, y + 10, 1, 15);
}

// 在 32px 绘制层补充 1px 级细节；格子与碰撞仍使用 16px 世界坐标。
function drawTileDetails(ctx, ch, col, row, tiles) {
  const style = tiles[ch] && tiles[ch].style;
  const x = col * TILE * ART_SCALE, y = row * TILE * ART_SCALE;
  const dot = (color, dx, dy, w = 1, h = 1) => {
    ctx.fillStyle = color; ctx.fillRect(x + dx, y + dy, w, h);
  };
  switch (style) {
    case 'wall':
    case 'facade':
      dot('#716b80', 2, 2, 27, 1);
      dot('#3d3948', 1, 19, 30, 1);
      if (style === 'facade' && row === 2 && col % 6 === 3) drawFacadeWindow32(ctx, x, y);
      break;
    case 'bookshelf': {
      dot('#a1714c', 0, 1, 32, 2);
      dot('#3f291d', 0, 27, 32, 2);
      for (let i = 0; i < 4; i++) {
        const bx = 2 + i * 8;
        dot('#e8d0a4', bx, 7 + i % 2, 1, 15);
        dot('#382b32', bx + 4, 19, 2, 2);
        dot('#d5aa6c', bx + 1, 9, 2, 1);
      }
      break;
    }
    case 'table':
      dot('#bd8b5a', 1, 5, 30, 1);
      dot('#71472d', 0, 24, 32, 2);
      dot('#b47d50', 19, 19, 7, 1);
      break;
    case 'chair':
      dot('#9c7351', 5, 7, 22, 2);
      dot('#4c3529', 5, 23, 22, 2);
      dot('#ad8059', 8, 12, 16, 1);
      break;
    case 'pavement':
      dot('#92919b', 3, 3, 11, 1);
      dot('#52535e', 28, 4, 1, 27);
      break;
    case 'grass':
    case 'tree':
    case 'shrub':
    case 'lamp':
    case 'bench':
      dot('#244b3c', 21, 28, 2, 2);
      if (style === 'tree' || style === 'shrub') {
        dot('#7aa883', 8, 9, 4, 2);
        dot('#5b966e', 19, 14, 5, 2);
        dot('#1d3d32', 5, 22, 7, 2);
        dot('#91ad79', 14, 5, 2, 2);
      }
      if (style === 'lamp') dot('#fff2b6', 11, 7, 10, 2);
      if (style === 'bench') dot('#c39767', 6, 11, 20, 1);
      break;
    case 'toilet':
      dot('#ffffff', 5, 7, 8, 1);
      dot('#758c9f', 18, 24, 9, 1);
      break;
    case 'door':
    case 'bigDoor':
    case 'outsideDoor':
      dot('#b17b50', 5, 3, 1, 23);
      dot('#4b2d20', 26, 4, 1, 24);
      dot('#f6d887', 22, 16, 3, 3);
      break;
    case 'chessFloor':
    case 'chessSeat':
      dot('#e9d9bd', 1, 1, 4, 1);
      break;
  }
}

function buildCanvasLegacy(sceneData, tiles) {
  const { rows, cols, grid } = parseMap(sceneData.map);
  const cv = document.createElement('canvas');
  cv.width = cols * TILE * ART_SCALE;
  cv.height = rows * TILE * ART_SCALE;
  const c2 = cv.getContext('2d');
  c2.setTransform(ART_SCALE, 0, 0, ART_SCALE, 0, 0);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      drawTile(c2, grid[r][c], c, r, tiles, sceneData);
    }
  }
  c2.setTransform(1, 0, 0, 1, 0, 0);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) drawTileDetails(c2, grid[r][c], c, r, tiles);
  }
  c2.setTransform(ART_SCALE, 0, 0, ART_SCALE, 0, 0);
  const decor = sceneData.decor;
  if (decor) {
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
      // 外墙亮窗覆盖层：位置由 win 公式决定（与 drawTileDetails 的 facade 分支同一公式）
      const style = tiles[grid[r][c]] && tiles[grid[r][c]].style;
      if (style === 'facade' && r === 2 && c % 6 === 3) {
        const winImg = img('tiles/facade-window');
        if (winImg) c2.drawImage(winImg, c * TILE * ART_SCALE, r * TILE * ART_SCALE);
        else missing.add('tiles/facade-window');
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

export { buildCanvasLegacy, buildSceneFromTiles, drawFacadeWindow32 };
