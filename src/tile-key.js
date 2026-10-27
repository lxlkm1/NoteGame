// tile-key.js —— 地块素材键：由 (字符, 列, 行) 算出唯一素材 key（纯逻辑，导出页与运行时共用）
// key 只含会影响该地块画面的参数（2026-10-26 极限压缩后仅 floor/chessFloor 保留 parity、bookshelf 保留 book；
// 外墙亮窗是覆盖层素材 tiles/facade-window，不进 key）

// 各风格画面实际使用的位置参数：不在表中的风格 parity/seed/book/win 全归 0（画面固定）
const STYLE_PARAMS = {
  floor: { parity: true },      // 木地板深浅交替（大面积视觉特征，保留）
  chessFloor: { parity: true }, // 棋盘格必须双色
  bookshelf: { book: true },    // 书脊颜色组合（用户拍板保留变化）
};

export function tileKey(ch, col, row, tiles, sceneData) {
  const t = tiles[ch];
  const style = t && t.style ? t.style : 'floor'; // 未知字符按地板处理（与 drawTile 防呆一致）
  if (style === 'chessSeat') {
    // chessSeat 画面只由棋字决定：STYLE_DRAW.chessSeat 不读位置参数，drawTileDetails 仅固定 dot
    const char = sceneData?.chessSeats?.[`${col},${row}`] ?? '';
    return [style, ch, 0, 0, 0, 0, char].join('|');
  }
  const use = STYLE_PARAMS[style] || {};
  const parity = use.parity ? (col + row) % 2 : 0;
  const book = use.book ? (col * 7 + row * 13) % 6 : 0;
  return [style, ch, parity, 0, book, 0, ''].join('|');
}
