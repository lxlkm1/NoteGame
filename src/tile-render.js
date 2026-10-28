// tile-render.js —— 场景预渲染（buildSceneFromTiles）：每格按 tileKey 查素材图贴入
// 素材 PNG 是唯一画面来源（src/assent/img/，AI 生成经 tools/normalize-ai.py 规范化）；
// 旧的代码画法（STYLE_DRAW/buildCanvasLegacy）与导出管线已随素材固化删除
import { TILE, ART_SCALE, parseMap } from './map.js';
import { tileKey } from './tile-key.js';
import { img } from './assets.js';

// ---- 素材图组装（运行时路径） ----
let placeholderTile = null;
function getPlaceholderTile() { // 缺图格子的品红占位（缓存一张，避免每格重建）
  if (!placeholderTile) {
    placeholderTile = document.createElement('canvas');
    placeholderTile.width = placeholderTile.height = TILE * ART_SCALE;
    const c = placeholderTile.getContext('2d');
    c.fillStyle = '#ff00ff';
    c.fillRect(0, 0, placeholderTile.width, placeholderTile.height);
  }
  return placeholderTile;
}

// buildSceneFromTiles —— 每格按 tileKey 查素材图贴入；缺图画品红并报出全部缺失 key
function buildSceneFromTiles(sceneData, tiles) {
  const { rows, cols, grid } = parseMap(sceneData.map);
  const cv = document.createElement('canvas');
  cv.width = cols * TILE * ART_SCALE;
  cv.height = rows * TILE * ART_SCALE;
  const c2 = cv.getContext('2d');
  c2.imageSmoothingEnabled = false;
  const missing = new Set();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = 'tiles/' + tileKey(grid[r][c], c, r, tiles, sceneData);
      const image = img(key);
      if (image) {
        c2.drawImage(image, c * TILE * ART_SCALE, r * TILE * ART_SCALE);
      } else {
        missing.add(key);
        c2.drawImage(getPlaceholderTile(), c * TILE * ART_SCALE, r * TILE * ART_SCALE);
      }
      // 外墙亮窗覆盖层：位置由 win 公式决定（row===2 && col%6===3）
      const style = tiles[grid[r][c]] && tiles[grid[r][c]].style;
      if (style === 'facade' && r === 2 && c % 6 === 3) {
        const winImg = img('tiles/facade-window');
        if (winImg) c2.drawImage(winImg, c * TILE * ART_SCALE, r * TILE * ART_SCALE);
        else missing.add('tiles/facade-window');
      }
    }
  }
  if (missing.size) console.error('[tile-render] 缺失地块素材：' + [...missing].join(', '));
  // decor：暖光/门垫的位置尺寸由地图配置驱动，保留代码叠加（与旧路径相同的画法）
  const decor = sceneData.decor;
  if (decor) {
    c2.setTransform(ART_SCALE, 0, 0, ART_SCALE, 0, 0);
    if (decor.light) { // 挑空暖光
      c2.globalAlpha = decor.light.alpha;
      c2.fillStyle = decor.light.color;
      c2.fillRect(decor.light.x * TILE, decor.light.y * TILE,
                  decor.light.w * TILE, decor.light.h * TILE);
      c2.globalAlpha = 1;
    }
    if (decor.mat) { // 门口垫子
      c2.fillStyle = '#8c3b40';
      c2.fillRect(decor.mat.col * TILE + 2, decor.mat.row * TILE + 6,
                  decor.mat.w * TILE - 4, TILE - 6);
      c2.fillStyle = '#a54a50';
      c2.fillRect(decor.mat.col * TILE + 4, decor.mat.row * TILE + 8,
                  decor.mat.w * TILE - 8, TILE - 10);
    }
  }
  return cv;
}

export { buildSceneFromTiles };
