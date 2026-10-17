// duyu.js —— 小蠹鱼：阅览室备战建模比赛的网友，打字累了会起来走动
import { TILE } from '../map.js';
import { drawDuyuCow } from '../sprites.js';
import { student, moveTo } from './shared.js';

export function createDuyu(maps, rng = Math.random) {
  const duyu = student('duyu', 'reading', maps.reading.duyu.col, maps.reading.duyu.row, 'brown', 'duyu');
  duyu.name = '小蠹鱼';
  duyu.laptop = { x: maps.reading.duyu.laptopCol * TILE, y: maps.reading.duyu.laptopRow * TILE };
  duyu.dialogueTimer = 0;
  duyu.playerNear = false;
  duyu.facing = 'right';
  duyu.phase = 'typing';
  duyu.phaseTimer = 18 + rng() * 10;
  duyu.walkRoute = maps.reading.duyu.walkRoute.map(point => ({ x: point.col * TILE, y: point.row * TILE }));
  duyu.walkIndex = 0;
  return duyu;
}

export function updateDuyu(duyu, dt, rng) {
  duyu.animTimer += dt;
  if (duyu.phase === 'typing') {
    duyu.moving = false;
    duyu.facing = 'right';
    duyu.phaseTimer -= dt;
    if (duyu.phaseTimer <= 0) { duyu.phase = 'walking'; duyu.walkIndex = 0; }
    return;
  }
  const target = duyu.walkRoute[duyu.walkIndex];
  if (moveTo(duyu, target.x, target.y, 24, dt)) {
    duyu.walkIndex++;
    if (duyu.walkIndex >= duyu.walkRoute.length) {
      duyu.phase = 'typing';
      duyu.phaseTimer = 18 + rng() * 10;
      duyu.moving = false;
      duyu.facing = 'right';
    }
  }
}

// 玩家靠近时触发对话气泡（「建模比赛好累」）
export function updateDuyuDialogue(world, player, scene, dt) {
  const duyu = world.duyu;
  if (scene !== 'reading') {
    duyu.playerNear = false;
    duyu.dialogueTimer = 0;
    return;
  }
  const distance = Math.hypot(player.x - duyu.x, player.y - duyu.y);
  if (distance <= 48 && !duyu.playerNear) {
    duyu.playerNear = true;
    duyu.dialogueTimer = 3.5;
  } else if (distance > 56) {
    duyu.playerNear = false;
  }
  duyu.dialogueTimer = Math.max(0, duyu.dialogueTimer - dt);
}

// 笔记本电脑 + 奶牛形象的小蠹鱼
export function drawDuyu(ctx, duyu) {
  const x = duyu.laptop.x, y = duyu.laptop.y;
  ctx.fillStyle = '#343b4b'; ctx.fillRect(x + 2, y + 3, 12, 9);
  ctx.fillStyle = '#8baac0'; ctx.fillRect(x + 3, y + 4, 10, 7);
  ctx.fillStyle = '#d8d7c9'; ctx.fillRect(x + 1, y + 12, 14, 2);
  if (duyu.phase === 'typing') {
    ctx.fillStyle = '#f6e7ad';
    ctx.fillRect(x + 4 + Math.floor(duyu.animTimer * 2) % 6, y + 6, 1, 3);
  }
  drawDuyuCow(ctx, duyu.x, duyu.y, duyu.phase === 'typing'
    ? (Math.floor(duyu.animTimer / 0.18) % 2 ? 'typing2' : 'typing1')
    : (Math.floor(duyu.animTimer / 0.2) % 2 ? 'walk2' : 'walk1'));
}
