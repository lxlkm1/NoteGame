// tiles.js —— 图例：符号 → 语义（名字 / 是否 solid / 画法 style / 是否传送门 portal）
// 语义在配置，画法实现在 js/map.js 引擎（按 style 分发）
(function (root) {
  root.MAPS = root.MAPS || {};
  root.MAPS.tiles = {
    '#': { name: '墙',       solid: true,  style: 'wall' },
    '.': { name: '地板',     solid: false, style: 'floor' },
    'q': { name: '棋盘格',   solid: false, style: 'chessFloor' },
    'z': { name: '棋子凳',   solid: false, style: 'chessSeat' },
    'M': { name: '大门',     solid: false, style: 'bigDoor', portal: true },
    'm': { name: '房间门',   solid: false, style: 'door',    portal: true },
    'D': { name: '底边大门', solid: true,  style: 'door',    portal: false },
    'B': { name: '书架',     solid: true,  style: 'bookshelf' },
    'T': { name: '阅览桌',   solid: true,  style: 'table' },
    'c': { name: '椅子',     solid: false, style: 'chair' },
    'R': { name: '洁具',     solid: true,  style: 'toilet' },
  };
  if (typeof module !== 'undefined') module.exports = root.MAPS.tiles;
})(typeof window !== 'undefined' ? window : globalThis);
