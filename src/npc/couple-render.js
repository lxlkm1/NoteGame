// 情侣专用像素画绘制：原生 24×24 图像，脚部和普通 NPC 对齐。
import { COUPLE_FRAMES, COUPLE_PALETTES } from '../data/couple-sprites.js';

const cache = new Map();

export function selectCoupleFrame(npc) {
  const person = npc.id === 'couple-a' ? 'girl' : 'boy';
  const side = npc.facing === 'left' || npc.facing === 'right';
  const movingFrame = npc.moving && Math.floor(npc.animTimer / 0.2) % 2 === 1 ? '2' : '1';
  const name = npc.action || (side ? `side${movingFrame}` : `${npc.facing === 'up' ? 'up' : 'down'}${movingFrame}`);
  // 女生侧面原图朝右，男生侧面原图朝左。
  const flip = side && (person === 'girl' ? npc.facing === 'left' : npc.facing === 'right');
  return { person, name, flip };
}

function bitmap(person, name) {
  const key = `${person}/${name}`;
  if (cache.has(key)) return cache.get(key);
  const matrix = COUPLE_FRAMES[person][name];
  const palette = COUPLE_PALETTES[person];
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 24;
  const pen = canvas.getContext('2d');
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    const color = palette[matrix[y][x]];
    if (!color) continue;
    pen.fillStyle = color;
    pen.fillRect(x, y, 1, 1);
  }
  cache.set(key, canvas);
  return canvas;
}

export function drawCouple(ctx, npc) {
  const { person, name, flip } = selectCoupleFrame(npc);
  const sprite = bitmap(person, name);
  const x = Math.round(npc.x - 4);
  const y = Math.round(npc.y - 8);
  ctx.imageSmoothingEnabled = false;
  if (flip) {
    ctx.save();
    ctx.translate(x + 24, y);
    ctx.scale(-1, 1);
    ctx.drawImage(sprite, 0, 0);
    ctx.restore();
  } else {
    ctx.drawImage(sprite, x, y);
  }
}
