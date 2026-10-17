// tiles.js —— 图例：符号 → 语义（名字 / 是否 solid / 画法 style / 传送门目的地 portal）
// 语义在配置，画法实现在 src/map.js 引擎（按 style 分发）
// portal 直接写目的地场景名：改门位置 = 只在地图字符串里挪动对应字母，无需改任何其他地方
(function (root) {
  root.MAPS = root.MAPS || {};
  root.MAPS.tiles = {
    '#': { name: '墙',         solid: true,  style: 'wall' },
    '.': { name: '地板',       solid: false, style: 'floor' },
    'q': { name: '棋盘格',     solid: false, style: 'chessFloor' },
    'z': { name: '棋子凳',     solid: false, style: 'chessSeat' },
    'M': { name: '大门·阅览室', solid: false, style: 'bigDoor', portal: 'reading' },
    'W': { name: '大门·卫生间', solid: false, style: 'bigDoor', portal: 'toilet' },
    'm': { name: '房间门',     solid: false, style: 'door',    portal: 'atrium' },
    'D': { name: '底边大门',   solid: false, style: 'door',    portal: 'outside' },
    'i': { name: '图书馆入口', solid: false, style: 'outsideDoor', portal: 'atrium' },
    'F': { name: '图书馆外墙', solid: true, style: 'facade' },
    'p': { name: '石板路', solid: false, style: 'pavement' },
    'g': { name: '草地', solid: false, style: 'grass' },
    't': { name: '树', solid: true, style: 'tree' },
    's': { name: '树丛', solid: true, style: 'shrub' },
    'l': { name: '路灯', solid: true, style: 'lamp' },
    'b': { name: '长椅', solid: true, style: 'bench' },
    'B': { name: '书架',       solid: true,  style: 'bookshelf' },
    'T': { name: '阅览桌',     solid: true,  style: 'table' },
    'c': { name: '椅子',       solid: false, style: 'chair' },
    'R': { name: '洁具',       solid: true,  style: 'toilet' },
  };
  if (typeof module !== 'undefined') module.exports = root.MAPS.tiles;
})(typeof window !== 'undefined' ? window : globalThis);
