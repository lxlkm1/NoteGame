import { ZDW_FRAMES, ZDW_PALETTE, ZDW_MIMI_FRAME, ZDW_MIMI_PALETTE, ZDW_MIMI_PAW } from '../data/zdw-sprites.js';

const cache = new Map();
const CAPTURE_PHASES = new Set(['grab', 'hold', 'release']);
const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, t) => a + (b - a) * t;

function bitmap(name, matrix, palette) {
  if (cache.has(name)) return cache.get(name);
  const image = document.createElement('canvas');
  image.width = matrix[0].length; image.height = matrix.length;
  const ctx = image.getContext('2d');
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    const color = palette[matrix[y][x]];
    if (color) { ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1); }
  }
  cache.set(name, image);
  return image;
}

export function zdwPlacement(npc) {
  return { x: Math.round(npc.x - 8), y: Math.round(npc.y - 24), width: 32, height: 40 };
}

export function selectZdwFrame(npc) {
  const flip = npc.facing === 'left';
  if (CAPTURE_PHASES.has(npc.phase)) return { name: 'reach', flip };
  if (npc.phase === 'study') return { name: 'study', flip };
  const step = npc.moving && Math.floor((npc.animTimer || 0) / 0.18) % 2 ? 2 : 1;
  const direction = npc.facing === 'left' || npc.facing === 'right' ? 'side' : npc.facing === 'up' ? 'up' : 'down';
  return { name: `${direction}${step}`, flip };
}

// 统一使用朝右的身体局部坐标，镜像时手、后爪和猫保持同一组变换。
export function zdwCapturePose(npc) {
  const placement = zdwPlacement(npc);
  const progress = clamp(1 - (npc.phaseTimer || 0) / (npc.phaseDuration || 1));
  const lift = npc.phase === 'grab' ? progress : npc.phase === 'release' ? 1 - progress : 1;
  const smooth = lift * lift * (3 - 2 * lift);
  const point = npc.phase === 'release' ? npc.releasePoint : npc.capturePoint;
  let groundX = point ? point.x + 2 - placement.x : 31;
  if (npc.facing === 'left' && point) groundX = 32 - (point.x + 14 - placement.x);
  const groundY = point ? point.y + 12 - placement.y : 37;
  return {
    hand: { x: mix(groundX, 31, smooth), y: mix(groundY, 12, smooth) },
    angle: mix(-Math.PI / 2, 0, smooth),
    lift,
  };
}

// 像素线段避免抗锯齿；手臂从肩膀到肘，再从肘到抓住后爪的手。
function pixelLine(ctx, color, from, to, width) {
  ctx.fillStyle = color;
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y), 1);
  for (let i = 0; i <= Math.ceil(steps); i++) {
    const t = Math.min(1, i / steps);
    ctx.fillRect(Math.round(mix(from.x, to.x, t) - width / 2), Math.round(mix(from.y, to.y, t) - width / 2), width, width);
  }
}

export function drawZdw(ctx, npc) {
  const { x, y, width } = zdwPlacement(npc);
  const { name, flip } = selectZdwFrame(npc);
  const carrying = CAPTURE_PHASES.has(npc.phase) && npc.heldMimi;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#00000026';
  ctx.beginPath(); ctx.ellipse(Math.round(npc.x + 8), Math.round(npc.y + 15), 10, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(flip ? x + width : x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(bitmap(name, ZDW_FRAMES[name], ZDW_PALETTE), 0, 0);
  if (carrying) {
    const pose = zdwCapturePose(npc);
    const hand = { x: Math.round(pose.hand.x), y: Math.round(pose.hand.y) };
    const shoulder = { x: 21, y: 19 };
    const elbow = { x: mix(24, 26, pose.lift), y: mix(29, 20, pose.lift) };
    pixelLine(ctx, ZDW_PALETTE.D, shoulder, elbow, 5);
    pixelLine(ctx, ZDW_PALETTE.c, shoulder, elbow, 3);
    pixelLine(ctx, ZDW_PALETTE.s, elbow, hand, 4);
    pixelLine(ctx, ZDW_PALETTE.S, elbow, hand, 2);
    ctx.save();
    ctx.translate(hand.x, hand.y);
    ctx.rotate(pose.angle);
    ctx.drawImage(bitmap('mimi-held', ZDW_MIMI_FRAME, ZDW_MIMI_PALETTE), -ZDW_MIMI_PAW.x, -ZDW_MIMI_PAW.y);
    ctx.restore();
    // 最后覆盖手掌，形成抓握；只接触后爪，手臂不穿过猫身。
    ctx.fillStyle = ZDW_PALETTE.s; ctx.fillRect(hand.x - 2, hand.y - 1, 5, 3);
    ctx.fillStyle = ZDW_PALETTE.S; ctx.fillRect(hand.x - 2, hand.y - 2, 4, 3);
  }
  ctx.restore();
  ctx.save();
  ctx.font = '8px monospace'; ctx.textAlign = 'center';
  ctx.fillStyle = '#27353bd9'; ctx.fillRect(Math.round(npc.x - 4), y - 11, 24, 10);
  ctx.fillStyle = '#f4eddb'; ctx.fillText('zdw', Math.round(npc.x + 8), y - 3);
  if (npc.phase === 'study') {
    ctx.font = '7px monospace'; ctx.fillStyle = '#ebe3c9';
    ctx.fillText('考研复习', Math.round(npc.x + 8), y - 15);
  }
  ctx.restore();
}
