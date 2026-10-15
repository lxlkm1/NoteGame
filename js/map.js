// map.js —— 图书馆地图：数据、解析、碰撞、预渲染
const MapKit = (() => {
  'use strict';
  const TILE = 16;

  // 30 列 × 20 行。图例：# 墙 | . 地板 | B 书架 | T 桌 | c 椅(可走) | W 窗台 | P 绿植 | d 借阅台 | D 门
  const MAP = [
    '##############################',
    '#..W...W...W...W...WPP.......#',
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
    '#.PP.........................#',
    '#............................#',
    '##############DD##############',
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
      if (col % 2 === 0) { // 桌上小台灯：偶数列才画，避免每格一盏
        ctx.fillStyle = '#d8d2c6';                  // 灯罩
        ctx.fillRect(x + 9, y + 3, 4, 3);
        ctx.fillStyle = '#ffd98a';                  // 暖光
        ctx.fillRect(x + 10, y + 6, 2, 2);
        ctx.fillStyle = '#5c3820';                  // 灯杆
        ctx.fillRect(x + 10, y + 8, 1, 4);
      }
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
    // 窗外光斑：每个窗下方投一束暖光（复用上方解构的 grid）
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
    return cv;
  }

  return { TILE, MAP, parseMap, isSolidAtPx, buildMapCanvas };
})();

if (typeof module !== 'undefined') module.exports = MapKit;
