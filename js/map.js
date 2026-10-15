// map.js —— 图书馆地图：数据、解析、碰撞、预渲染
const MapKit = (() => {
  'use strict';
  const TILE = 16;

  // 40 列 × 30 行。萍乡学院图书馆一楼布局。
  // 图例：# 墙 | . 地板 | B 书架 | T 桌 | c 椅(可走) | S 螺旋楼梯 | q 象棋棋盘(可走) | R 卫生间 | D 大门
  // 结构：中央超大挑空中庭（地面象棋棋盘 + 两个螺旋楼梯），左右各两个阅览室（门朝中庭），
  //       左上/右上各一个卫生间，下面中间是大门。
  const MAP = [
    '########################################',
    '#RRRR#............................#RRRR#',
    '#RRRR#............................#RRRR#',
    '#RRRR#............................#RRRR#',
    '##########....................##########',
    '#BBBBBBBB#....................#BBBBBBBB#',
    '#BBBBBBBB#....................#BBBBBBBB#',
    '#........#....................#........#',
    '#......................................#',
    '#......................................#',
    '#ccTTTTcc#....................#ccTTTTcc#',
    '#ccTTTTcc#......qqqqqqqq......#ccTTTTcc#',
    '#........#......qqqqqqqq......#........#',
    '##########..SS..qqqqqqqq..SS..##########',
    '#BBBBBBBB#..SS..qqqqqqqq..SS..#BBBBBBBB#',
    '#BBBBBBBB#..SS..qqqqqqqq..SS..#BBBBBBBB#',
    '#........#..SS..qqqqqqqq..SS..#........#',
    '#...............qqqqqqqq...............#',
    '#...............qqqqqqqq...............#',
    '#ccTTTTcc#....................#ccTTTTcc#',
    '#ccTTTTcc#....................#ccTTTTcc#',
    '#........#....................#........#',
    '##########....................##########',
    '#......................................#',
    '#......................................#',
    '#......................................#',
    '#......................................#',
    '#......................................#',
    '#......................................#',
    '###################DD###################',
  ];

  const SOLID_CHARS = new Set(['#', 'B', 'T', 'S', 'R', 'D']);

  function parseMap() {
    const rows = MAP.length;
    const cols = MAP[0].length;
    if (rows !== 30 || cols !== 40) {
      throw new Error(`地图尺寸错误：期望 40x30，实际 ${cols}x${rows}`);
    }
    const grid = MAP.map((row) => row.split(''));
    return { rows, cols, grid };
  }

  function isSolidAtPx(px, py) {
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (col < 0 || row < 0 || col >= 40 || row >= 30) return true;
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
    if (ch === 'D') { // 大门：木门 + 把手
      ctx.fillStyle = '#8a5c3a';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#6d4628';
      ctx.fillRect(x, y, 1, TILE);
      ctx.fillStyle = '#e8c86e';
      ctx.fillRect(x + 11, y + 8, 2, 2);
      return;
    }
    if (ch === 'S') { // 螺旋楼梯：深色底座 + 同心螺旋纹（不可走装饰）
      ctx.fillStyle = '#3f3546';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#6b5a78';
      ctx.beginPath(); ctx.arc(x + 8, y + 8, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a7a96';
      ctx.beginPath(); ctx.arc(x + 8, y + 8, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a4a6a';
      ctx.beginPath(); ctx.arc(x + 8, y + 8, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c2b2cc';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x + 8, y + 8, 5.5, 0, Math.PI); ctx.stroke();
      return;
    }
    if (ch === 'q') { // 象棋棋盘格（可走）：米白/深棕交替
      ctx.fillStyle = (col + row) % 2 === 0 ? '#e0d3b8' : '#7a5c40';
      ctx.fillRect(x, y, TILE, TILE);
      return;
    }
    if (ch === 'R') { // 卫生间：瓷砖 + 洁具（不可走小隔间）
      ctx.fillStyle = '#a8b8c8';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#8898a8';
      ctx.fillRect(x, y, TILE, 1);
      ctx.fillStyle = '#f0f4f8';  // 洗手台
      ctx.fillRect(x + 2, y + 3, 5, 3);
      ctx.fillStyle = '#e8ecf0';  // 马桶
      ctx.fillRect(x + 9, y + 4, 5, 6);
      return;
    }
    // 地板基色（暖木棋盘）
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
        ctx.fillStyle = '#d8d2c6';
        ctx.fillRect(x + 9, y + 3, 4, 3);
        ctx.fillStyle = '#ffd98a';
        ctx.fillRect(x + 10, y + 6, 2, 2);
        ctx.fillStyle = '#5c3820';
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
  }

  function buildMapCanvas() {
    const cv = document.createElement('canvas');
    cv.width = 640;
    cv.height = 480;
    const c2 = cv.getContext('2d');
    const { grid } = parseMap();
    for (let r = 0; r < 30; r++) {
      for (let cCol = 0; cCol < 40; cCol++) {
        drawTile(c2, grid[r][cCol], cCol, r);
      }
    }
    // 挑空中庭：中央洒下暖光（天井采光）
    c2.globalAlpha = 0.10;
    c2.fillStyle = '#ffd98a';
    c2.fillRect(10 * TILE, 4 * TILE, 20 * TILE, 24 * TILE);
    c2.globalAlpha = 1;
    // 大门口垫子
    c2.fillStyle = '#8c3b40';
    c2.fillRect(19 * TILE + 2, 28 * TILE + 6, 2 * TILE - 4, TILE - 6);
    c2.fillStyle = '#a54a50';
    c2.fillRect(19 * TILE + 4, 28 * TILE + 8, 2 * TILE - 8, TILE - 10);
    return cv;
  }

  return { TILE, MAP, parseMap, isSolidAtPx, buildMapCanvas };
})();

if (typeof module !== 'undefined') module.exports = MapKit;
