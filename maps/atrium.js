// atrium.js —— 中庭场景配置：布局 + 棋子凳 + 门 + 出生点 + 装饰（纯数据）
// 中庭：整体棋盘色地面 + 中央大棋盘（带 32 棋子凳），左右各 2 个大门，下中大门
// 39 列宽（左边加 3 列），棋盘 col 7-36
(function (root) {
  root.MAPS = root.MAPS || {};
  root.MAPS.atrium = {
    name: '中庭',
    map: [
      '#######################################',
      '#####qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq##',
      '#####qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq##',
      '#####qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq##',
      '#####qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq##',
      '#####qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq##',
      '#####qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq##',
      '#####qqzqqzqqzqqzqqzqqzqqzqqzqqzqqqqq##',
      '####MqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqM#',
      '####MqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqM#',
      '#####qqqqqzqqqqqqqqqqqqqqqqqzqqqqqqqq##',
      '#####qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq##',
      '#####qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq##',
      '#####qqzqqqqqzqqqqqzqqqqqzqqqqqzqqqqq##',
      '#####qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq##',
      '#####qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq##',
      '#####qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq##',
      '#####qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq##',
      '#####qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq##',
      '#####qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq##',
      '#####qqzqqqqqzqqqqqzqqqqqzqqqqqzqqqqq##',
      '####MqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqM#',
      '####MqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqM#',
      '#####qqqqqzqqqqqqqqqqqqqqqqqzqqqqqqqq##',
      '#####qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq##',
      '#####qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq##',
      '#####qqzqqzqqzqqzqqzqqzqqzqqzqqzqqqqq##',
      '#####qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq##',
      '#####qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq##',
      '#####################DD################',
    ],
    // 棋子凳子：39 列宽地图，棋盘 col 7-36，标准象棋 32 子
    chessSeats: {
      '7,7': '車', '10,7': '馬', '13,7': '象', '16,7': '士', '19,7': '將',
      '22,7': '士', '25,7': '象', '28,7': '馬', '31,7': '車',
      '10,10': '砲', '28,10': '砲',
      '7,13': '卒', '13,13': '卒', '19,13': '卒', '25,13': '卒', '31,13': '卒',
      '7,20': '兵', '13,20': '兵', '19,20': '兵', '25,20': '兵', '31,20': '兵',
      '10,23': '炮', '28,23': '炮',
      '7,26': '車', '10,26': '馬', '13,26': '相', '16,26': '仕', '19,26': '帥',
      '22,26': '仕', '25,26': '相', '28,26': '馬', '31,26': '車',
    },
    // 4 个大门：左侧 col 4, row 8-9（上）和 21-22（下），右侧 col 37 对称
    doors: [
      { cols: [4],  rows: [8, 9],   to: 'toilet'  },
      { cols: [4],  rows: [21, 22], to: 'reading' },
      { cols: [37], rows: [8, 9],   to: 'toilet'  },
      { cols: [37], rows: [21, 22], to: 'reading' },
    ],
    spawn: { col: 19, row: 27 }, // 出生点：大门口内侧（39 列 → col 19-20）
    decor: {
      light: { x: 2, y: 2, w: 35, h: 26, alpha: 0.10, color: '#ffd98a' }, // 挑空暖光
      mat: { col: 19, row: 28, w: 2 }, // 门口垫子
    },
  };
  if (typeof module !== 'undefined') module.exports = root.MAPS.atrium;
})(typeof window !== 'undefined' ? window : globalThis);
