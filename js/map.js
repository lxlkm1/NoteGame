// map.js —— 图书馆地图：数据、解析、碰撞、预渲染
// 场景：中庭（40x30 大厅）+ 房间（阅览室/卫生间，独立小地图，进门切换）
const MapKit = (() => {
  'use strict';
  const TILE = 16;

  // 图例：# 墙 | . 地板 | B 书架 | T 桌 | c 椅(可走) | q 象棋棋盘格(可走)
  //        | z 棋子凳子(可走) | m 传送门(可走) | R 卫生间洁具 | D 大门
  // 中庭：中央大棋盘 + 棋子凳子，四周墙上有 6 个传送门（左右各 2 阅览室 + 左上/右上卫生间），下中大门
  const ATRIUM_MAP = [
    '####################################',
    '##................................##',
    '#m................................m#',
    '##................................##',
    '##................................##',
    '##................................##',
    '##................................##',
    '##.zqqzqqzqqzqqzqqzqqzqqzqqzqqqqq.##',
    '#m.qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq.m#',
    '#m.qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq.m#',
    '##.qqqzqqqqqqqqqqqqqqqqqzqqqqqqqq.##',
    '##.qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq.##',
    '##.qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq.##',
    '##.zqqqqqzqqqqqzqqqqqzqqqqqzqqqqq.##',
    '##.qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq.##',
    '##.qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq.##',
    '##.qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq.##',
    '##.qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq.##',
    '##.qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq.##',
    '##.qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq.##',
    '##.zqqqqqzqqqqqzqqqqqzqqqqqzqqqqq.##',
    '#m.qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq.m#',
    '#m.qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq.m#',
    '##.qqqzqqqqqqqqqqqqqqqqqzqqqqqqqq.##',
    '##.qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq.##',
    '#m.qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq.m#',
    '##.zqqzqqzqqzqqzqqzqqzqqzqqzqqqqq.##',
    '##................................##',
    '##................................##',
    '#################DD#################',
  ];

  // 棋子凳子：36 列宽地图，棋盘 col 3-32（30 格宽），标准象棋 32 子
  const CHESS_SEATS = {
    '3,7': '車', '6,7': '馬', '9,7': '象', '12,7': '士', '15,7': '將',
    '18,7': '士', '21,7': '象', '24,7': '馬', '27,7': '車',
    '6,10': '砲', '24,10': '砲',
    '3,13': '卒', '9,13': '卒', '15,13': '卒', '21,13': '卒', '27,13': '卒',
    '3,20': '兵', '9,20': '兵', '15,20': '兵', '21,20': '兵', '27,20': '兵',
    '6,23': '炮', '24,23': '炮',
    '3,26': '車', '6,26': '馬', '9,26': '相', '12,26': '仕', '15,26': '帥',
    '18,26': '仕', '21,26': '相', '24,26': '馬', '27,26': '車',
  };

  // 房间地图（独立场景，进门切换）。阅览室/卫生间 都做成 36×30 全屏。
  const ROOM_MAPS = {
    reading: [
      '####################################',
      '#..................................#',
      '#..................................#',
      '#.BBBBBB..BBBBBB..BBBBBB..BBBBBB...#',
      '#.B....B..B....B..B....B..B....B...#',
      '#.B....B..B....B..B....B..B....B...#',
      '#.BBBBBB..BBBBBB..BBBBBB..BBBBBB...#',
      '#..................................#',
      '#..................................#',
      '#..................................#',
      '#.ccTTTTcc........ccTTTTcc.........#',
      '#.ccTTTTcc........ccTTTTcc.........#',
      '#..................................#',
      '#..................................#',
      '#........ccTTTTcc........ccTTTTcc..#',
      '#........ccTTTTcc........ccTTTTcc..#',
      '#..................................#',
      '#..................................#',
      '#.ccTTTTcc........ccTTTTcc.........#',
      '#.ccTTTTcc........ccTTTTcc.........#',
      '#..................................#',
      '#..................................#',
      '#........ccTTTTcc........ccTTTTcc..#',
      '#........ccTTTTcc........ccTTTTcc..#',
      '#..................................#',
      '#..................................#',
      '#..................................#',
      '#..................................#',
      '#..................................#',
      '#################mm#################',
    ],
    toilet: [
      '####################################',
      '#..................................#',
      '#..................................#',
      '#..................................#',
      '#..................................#',
      '#.R......R......R......R...........#',
      '#.R......R......R......R...........#',
      '#..................................#',
      '#..................................#',
      '#..................................#',
      '#..................................#',
      '#.R......R......R......R...........#',
      '#.R......R......R......R...........#',
      '#..................................#',
      '#..................................#',
      '#..................................#',
      '#..................................#',
      '#.R......R......R......R...........#',
      '#.R......R......R......R...........#',
      '#..................................#',
      '#..................................#',
      '#..................................#',
      '#..................................#',
      '#..................................#',
      '#..................................#',
      '#..................................#',
      '#..................................#',
      '#..................................#',
      '#..................................#',
      '#################mm#################',
    ],
  };

  const SOLID_CHARS = new Set(['#', 'B', 'T', 'R', 'D']);

  function dims(map) {
    const rows = map.length;
    const cols = map[0].length;
    for (const r of map) if (r.length !== cols) {
      throw new Error(`地图行宽不一致：期望 ${cols}，实际 ${r.length}`);
    }
    return { rows, cols, grid: map.map((r) => r.split('')) };
  }

  function parseMap(map) {
    return dims(map || ATRIUM_MAP);
  }

  function isSolidAtPx(px, py, map) {
    map = map || ATRIUM_MAP;
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (col < 0 || row < 0 || col >= map[0].length || row >= map.length) return true;
    return SOLID_CHARS.has(map[row][col]);
  }

  // 判断某格是否为传送门（可进入的门）
  function isDoorAt(px, py, map) {
    map = map || ATRIUM_MAP;
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (col < 0 || row < 0 || col >= map[0].length || row >= map.length) return false;
    return map[row][col] === 'm';
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
    if (ch === 'm') { // 传送门：可进入的门（门框 + 门扇）
      ctx.fillStyle = '#6d4628';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#8a5c3a';
      ctx.fillRect(x + 1, y + 1, 6, 14);
      ctx.fillStyle = '#e8c86e';
      ctx.fillRect(x + 9, y + 7, 2, 2);
      ctx.fillStyle = '#5c3820';
      ctx.fillRect(x, y + 14, TILE, 2);
      return;
    }
    if (ch === 'q') { // 象棋棋盘格（可走）：米白/深棕交替
      ctx.fillStyle = (col + row) % 2 === 0 ? '#e0d3b8' : '#7a5c40';
      ctx.fillRect(x, y, TILE, TILE);
      return;
    }
    if (ch === 'z') { // 棋子凳子：圆形棋子造型，写繁体象棋字
      ctx.fillStyle = '#c89a5e';
      ctx.beginPath(); ctx.arc(x + 8, y + 8, 7.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8a5c30';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x + 8, y + 8, 7.5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#8a5c30';
      ctx.beginPath(); ctx.arc(x + 8, y + 8, 5, 0, Math.PI * 2); ctx.fill();
      const label = CHESS_SEATS[col + ',' + row];
      if (label) {
        ctx.fillStyle = '#f0d9b0';
        ctx.font = 'bold 9px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + 8, y + 9);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
      }
      return;
    }
    if (ch === 'R') { // 卫生间洁具：瓷砖 + 马桶/洗手台
      ctx.fillStyle = '#a8b8c8';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#f0f4f8';
      ctx.fillRect(x + 2, y + 3, 5, 3);
      ctx.fillStyle = '#e8ecf0';
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

  function buildCanvas(map) {
    map = map || ATRIUM_MAP;
    const { rows, cols, grid } = dims(map);
    const cv = document.createElement('canvas');
    cv.width = cols * TILE;
    cv.height = rows * TILE;
    const c2 = cv.getContext('2d');
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        drawTile(c2, grid[r][c], c, r);
      }
    }
    if (map === ATRIUM_MAP) { // 中庭挑空暖光 + 门口垫子
      c2.globalAlpha = 0.10;
      c2.fillStyle = '#ffd98a';
      c2.fillRect(2 * TILE, 2 * TILE, 35 * TILE, 26 * TILE);
      c2.globalAlpha = 1;
      c2.fillStyle = '#8c3b40';
      c2.fillRect(19 * TILE + 2, 28 * TILE + 6, 2 * TILE - 4, TILE - 6);
      c2.fillStyle = '#a54a50';
      c2.fillRect(19 * TILE + 4, 28 * TILE + 8, 2 * TILE - 8, TILE - 10);
    }
    return cv;
  }

  return {
    TILE, ATRIUM_MAP, ROOM_MAPS, CHESS_SEATS,
    parseMap, isSolidAtPx, isDoorAt, buildCanvas,
  };
})();

if (typeof module !== 'undefined') module.exports = MapKit;
