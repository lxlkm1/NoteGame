// sprites.js —— 像素绘制引擎：drawSprite（带缓存与高光）+ 小蠹鱼奶牛绘制
// 帧矩阵与调色板数据在 src/data/sprites.js
import { DUYU_COW_FRAMES, DUYU_COW_PALETTE } from './data/sprites.js';
const spriteCache = new WeakMap();

function tint(hex, amount) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const parts = [1, 3, 5].map(i => Math.max(0, Math.min(255, parseInt(hex.slice(i, i + 2), 16) + amount)));
  return `#${parts.map(n => n.toString(16).padStart(2, '0')).join('')}`;
}

function detailedSprite(matrix, palette) {
  let variants = spriteCache.get(matrix);
  if (!variants) { variants = new Map(); spriteCache.set(matrix, variants); }
  const key = JSON.stringify(palette);
  if (variants.has(key)) return variants.get(key);
  const width = matrix[0].length, height = matrix.length;
  const sprite = document.createElement('canvas');
  sprite.width = width * 2; sprite.height = height * 2;
  const pen = sprite.getContext('2d');
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const ch = matrix[row][col], color = palette[ch];
      if (!color) continue;
      const x = col * 2, y = row * 2;
      pen.fillStyle = color; pen.fillRect(x, y, 2, 2);
      // 32px 精灵的单像素高光、暗边和织物颗粒。
      if (row === 0 || matrix[row - 1][col] !== ch) {
        pen.fillStyle = tint(color, 22); pen.fillRect(x, y, 2, 1);
      }
      if (row === height - 1 || matrix[row + 1][col] !== ch) {
        pen.fillStyle = tint(color, -20); pen.fillRect(x + 1, y + 1, 1, 1);
      }
      if ((col * 7 + row * 11) % 9 === 0 && row > 0 && matrix[row - 1][col] === ch) {
        pen.fillStyle = tint(color, 12); pen.fillRect(x, y, 1, 1);
      }
    }
  }
  variants.set(key, sprite);
  return sprite;
}

function drawSprite(ctx, matrix, palette, x, y, flip, scale = 1) {
  const sprite = detailedSprite(matrix, palette);
  ctx.imageSmoothingEnabled = false;
  const width = matrix[0].length * scale, height = matrix.length * scale;
  const drawX = Math.round(x - (width - matrix[0].length) / 2);
  const drawY = Math.round(y - (height - matrix.length));
  if (flip) {
    ctx.save();
    ctx.translate(drawX + width, drawY);
    ctx.scale(-1, 1);
    ctx.drawImage(sprite, 0, 0, width, height);
    ctx.restore();
  } else {
    ctx.drawImage(sprite, drawX, drawY, width, height);
  }
}

function drawDuyuCow(ctx, x, y, pose) {
  const sprite = detailedSprite(DUYU_COW_FRAMES[pose], DUYU_COW_PALETTE);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, Math.round(x) - 4, Math.round(y) - 8, 24, 24);
}

export { drawSprite, drawDuyuCow };
