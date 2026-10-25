// tile-key.js —— 地块素材键：由 (字符, 列, 行) 算出唯一素材 key（纯逻辑，导出页与运行时共用）
// key 必须包含所有会影响该地块画面的位置参数，否则不同画面的地块会共用同一张图
// 参数周期 2(parity)/11(seed)/6(book,facade) 的最小公倍数为 66 —— 标定地图边长的依据

export function tileKey(ch, col, row, tiles, sceneData) {
  const t = tiles[ch];
  const style = t && t.style ? t.style : 'floor'; // 未知字符按地板处理（与 drawTile 防呆一致）
  const char = style === 'chessSeat' ? (sceneData?.chessSeats?.[`${col},${row}`] ?? '') : '';
  if (style === 'chessSeat') {
    // chessSeat 画面只由棋字决定：STYLE_DRAW.chessSeat 不读位置参数，drawTileDetails 仅固定 dot
    // （tile-render.js:252）。parity/seed/book 归 0，避免 AA 亚像素噪点把同一画面炸成 52 张冗余图
    return [style, ch, 0, 0, 0, 0, char].join('|');
  }
  const parity = (col + row) % 2;                 // 木地板/棋盘格/石板路/草地交替色
  const seed = (col * 17 + row * 31) % 11;        // drawTileDetails 纹理噪点种子
  const book = (col * 7 + row * 13) % 6;          // 书架书脊颜色组合
  const win = style === 'facade' && row === 2 && col % 6 === 3 ? 1 : 0; // 外墙周期亮窗
  return [style, ch, parity, seed, book, win, char].join('|');
}
