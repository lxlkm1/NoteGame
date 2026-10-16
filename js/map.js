// map.js —— 地图引擎：解析、碰撞、门检测、预渲染
// 纯逻辑无数据：地图布局 / 棋子 / 门 / 出生点 / 图例语义全部在 maps/ 配置里
const MapKit = (() => {
  'use strict';
  const TILE = 16;

  // 校验所有行等宽，返回 { rows, cols, grid }
  function parseMap(mapRows) {
    const rows = mapRows.length;
    const cols = mapRows[0].length;
    for (const r of mapRows) if (r.length !== cols) {
      throw new Error(`地图行宽不一致：期望 ${cols}，实际 ${r.length}`);
    }
    return { rows, cols, grid: mapRows.map((r) => r.split('')) };
  }

  function charAtPx(px, py, mapRows) {
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (col < 0 || row < 0 || col >= mapRows[0].length || row >= mapRows.length) return null;
    return mapRows[row][col];
  }

  // 越界视为 solid；tiles 表未定义的字符防呆为 solid
  function isSolidAtPx(px, py, mapRows, tiles) {
    const ch = charAtPx(px, py, mapRows);
    if (ch === null) return true;
    const t = tiles[ch];
    return !t || !!t.solid;
  }

  // 判断某格是否为传送门（tiles 表里 portal 非空的符号）
  function isDoorAt(px, py, mapRows, tiles) {
    return doorDestAt(px, py, mapRows, tiles) !== null;
  }

  // 某格传送门的目的地场景名（无门或非 portal 返回 null）
  function doorDestAt(px, py, mapRows, tiles) {
    const ch = charAtPx(px, py, mapRows);
    if (ch === null) return null;
    const t = tiles[ch];
    return (t && t.portal) || null;
  }

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
      ctx.beginPath(); ctx.arc(x + 8, y + 8, 7.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8a5c30';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x + 8, y + 8, 7.5, 0, Math.PI * 2); ctx.stroke();
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
    table(ctx, x, y, col, row) { // 阅览桌：木地板 + 桌面 + 深边
      drawWoodBase(ctx, x, y, col, row);
      ctx.fillStyle = '#8a5c3a';
      ctx.fillRect(x, y + 2, TILE, TILE - 4);
      ctx.fillStyle = '#9d6d47';
      ctx.fillRect(x, y + 2, TILE, 3);
    },
    chair(ctx, x, y, col, row) { // 椅子（可走）：木地板 + 椅面
      drawWoodBase(ctx, x, y, col, row);
      ctx.fillStyle = '#6a4a34';
      ctx.fillRect(x + 2, y + 3, 12, 10);
      ctx.fillStyle = '#7d5a40';
      ctx.fillRect(x + 2, y + 3, 12, 3);
    },
  };

  function drawTile(ctx, ch, col, row, tiles, sceneData) {
    const t = tiles[ch];
    const draw = (t && STYLE_DRAW[t.style]) || STYLE_DRAW.floor; // 未知符号按地板画（防呆）
    draw(ctx, col * TILE, row * TILE, col, row, ch, sceneData);
  }

  function buildCanvas(sceneData, tiles) {
    const { rows, cols, grid } = parseMap(sceneData.map);
    const cv = document.createElement('canvas');
    cv.width = cols * TILE;
    cv.height = rows * TILE;
    const c2 = cv.getContext('2d');
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        drawTile(c2, grid[r][c], c, r, tiles, sceneData);
      }
    }
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

  return { TILE, parseMap, isSolidAtPx, isDoorAt, doorDestAt, buildCanvas };
})();

if (typeof module !== 'undefined') module.exports = MapKit;
