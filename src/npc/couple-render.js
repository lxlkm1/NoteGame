// 情侣专用像素画绘制：不同身高的原生像素图，脚部和普通 NPC 对齐。
import { COUPLE_FRAMES, COUPLE_PALETTES } from '../data/couple-sprites.js';
import { COUPLE_LAWN_FRAMES, COUPLE_LAWN_PALETTE, COUPLE_LAWN_ANCHOR } from '../data/couple-lawn-sprites.js';

const cache = new Map();

export function selectCoupleFrame(npc) {
  if (COUPLE_LAWN_FRAMES[npc.action]) return { person: 'lawn', name: npc.action, flip: false };
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
  const matrix = person === 'lawn' ? COUPLE_LAWN_FRAMES[name] : COUPLE_FRAMES[person][name];
  const palette = person === 'lawn' ? COUPLE_LAWN_PALETTE : COUPLE_PALETTES[person];
  const canvas = document.createElement('canvas');
  canvas.width = matrix[0].length;
  canvas.height = matrix.length;
  const pen = canvas.getContext('2d');
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const color = palette[matrix[y][x]];
    if (!color) continue;
    pen.fillStyle = color;
    pen.fillRect(x, y, 1, 1);
  }
  cache.set(key, canvas);
  return canvas;
}

export function couplePlacement(npc) {
  const lawnFrame = COUPLE_LAWN_FRAMES[npc.action];
  if (lawnFrame) return {
    x: Math.round(npc.x + 8 - COUPLE_LAWN_ANCHOR.x),
    y: Math.round(npc.y + 16 - COUPLE_LAWN_ANCHOR.y),
    width: lawnFrame[0].length, height: lawnFrame.length,
  };
  const person = npc.id === 'couple-a' ? 'girl' : 'boy';
  const frame = COUPLE_FRAMES[person].down1;
  const width = frame[0].length, height = frame.length;
  return {
    x: Math.round(npc.x + 8 - width / 2),
    y: Math.round(npc.y + 16 - height),
    width, height,
  };
}

export function drawCouple(ctx, npc) {
  const { person, name, flip } = selectCoupleFrame(npc);
  // 坐姿中前后手臂已分层画在组合帧里，仅由男生的地面位置绘制一次。
  if (person === 'lawn' && npc.id === 'couple-a') return;
  const sprite = bitmap(person, name);
  const { x, y, width } = couplePlacement(npc);
  ctx.imageSmoothingEnabled = false;
  if (flip) {
    ctx.save();
    ctx.translate(x + width, y);
    ctx.scale(-1, 1);
    ctx.drawImage(sprite, 0, 0);
    ctx.restore();
  } else {
    ctx.drawImage(sprite, x, y);
  }
}
