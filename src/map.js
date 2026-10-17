// map.js —— 地图引擎：解析、碰撞、门检测（纯逻辑，无 DOM）
// 纯逻辑无数据：地图布局 / 棋子 / 门 / 出生点 / 图例语义全部在 src/maps/ 配置里
// 地砖画法与预渲染在 tile-render.js
const TILE = 16;
const ART_SCALE = 2;

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

export { TILE, ART_SCALE, parseMap, isSolidAtPx, isDoorAt, doorDestAt };
