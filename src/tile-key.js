// tile-key.js —— 地块素材键：由 (字符, 列, 行) 算出唯一素材 key（纯逻辑，导出页与运行时共用）
// key 只含会影响该地块画面的参数（2026-10-25 去噪简化后 seed 纹理已移除，多数风格 key 与位置无关；
// 外墙亮窗是覆盖层素材 tiles/facade-window，不进 key）

// 各风格画面实际使用的位置参数：不在表中的风格 parity/seed/book/win 全归 0（画面固定）
const STYLE_PARAMS = {
  floor: { parity: true },     // 木地板深浅交替
  chessFloor: { parity: true },
  grass: { parity: true }, tree: { parity: true }, shrub: { parity: true },
  lamp: { parity: true }, bench: { parity: true },   // 草地家族：草地底色交替
  pavement: { parity: true },
  table: { parity: true }, chair: { parity: true },  // 暖木底色交替
  bookshelf: { book: true },   // 书脊颜色组合（底色被木框整格覆盖，parity 不可见）
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
