// shared.js —— NPC 共享：人物配色、人物工厂、移动辅助、通用人物绘制
import { drawSprite } from '../sprites.js';
import { PLAYER_FRAMES } from '../data/sprites.js';
import { TILE } from '../map.js';

export const COLORS = {
  blue:  { H: '#322d39', S: '#eac39f', E: '#312929', C: '#5681a7', P: '#48536d', B: '#333039' },
  green: { H: '#483830', S: '#f0cba7', E: '#312929', C: '#689274', P: '#4c5869', B: '#333039' },
  red:   { H: '#392f36', S: '#e9b996', E: '#312929', C: '#af6676', P: '#4c5368', B: '#333039' },
  brown: { H: '#343039', S: '#e6bd9c', E: '#312929', C: '#9b775b', P: '#4c5368', B: '#333039' },
};

export function student(id, scene, col, row, color, kind = 'study') {
  return { id, kind, scene, col, row, x: col * TILE, y: row * TILE,
    color, moving: false, facing: 'down', animTimer: 0, feedCooldown: 0 };
}

// 朝目标移动，到达（误差 < 0.5px）返回 true
export function moveTo(npc, x, y, speed, dt) {
  const dx = x - npc.x, dy = y - npc.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.5) { npc.x = x; npc.y = y; npc.moving = false; return true; }
  const step = Math.min(speed * dt, dist);
  npc.x += dx / dist * step;
  npc.y += dy / dist * step;
  npc.moving = true;
  npc.facing = Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? 'down' : 'up') : (dx > 0 ? 'right' : 'left');
  return step >= dist;
}

// 通用像素人绘制（小蠹鱼除外，她有自己的奶牛形象）；left/right 用侧帧，left 翻转
export function drawPerson(ctx, npc) {
  let frameName, flip = false;
  if (npc.facing === 'left' || npc.facing === 'right') {
    frameName = npc.moving ? (Math.floor(npc.animTimer / 0.2) % 2 ? 'side1' : 'side2') : 'side1';
    flip = npc.facing === 'left';
  } else {
    const frame = npc.moving ? (Math.floor(npc.animTimer / 0.2) % 2 ? 'down1' : 'down2') : 'down1';
    frameName = npc.facing === 'up' && npc.moving ? 'up1' : frame;
  }
  drawSprite(ctx, PLAYER_FRAMES[frameName], COLORS[npc.color], npc.x, npc.y, flip, 1.5);
  if (!npc.moving && (npc.kind === 'study' || npc.phase === 'study')) { // 坐着读书：书页翻动
    ctx.fillStyle = '#e8dcc8'; ctx.fillRect(npc.x + 3, npc.y + 10, 10, 4);
    ctx.fillStyle = Math.floor(npc.animTimer / 1.3) % 2 ? '#8595a7' : '#a59070';
    ctx.fillRect(npc.x + 8, npc.y + 10, 1, 4);
  }
}
