// player.js —— 玩家：移动、脚部碰撞、动画帧、绘制
import { TILE, isSolidAtPx } from './map.js';
import TILES from './data/maps/tiles.js';
import { drawSprite } from './sprites.js';
import { PLAYER_FRAMES, PALETTE_PLAYER } from './data/sprites.js';

const SPEED = 70;          // px/s

export function createPlayer(spawn) { // 出生点读配置：大门口内侧
  return {
    x: spawn.col * TILE,
    y: spawn.row * TILE,
    dir: 'up',
    moving: false,
    animTimer: 0,
  };
}

export function playerSolid(x, y, currentMap) { // 脚部碰撞盒 (x+3, y+12, 10, 4)
  const l = x + 3, t = y + 12, r = l + 9, b = t + 3;
  return isSolidAtPx(l, t, currentMap, TILES) || isSolidAtPx(r, t, currentMap, TILES) ||
         isSolidAtPx(l, b, currentMap, TILES) || isSolidAtPx(r, b, currentMap, TILES);
}

export function updatePlayer(player, dt, keys, currentMap) {
  let dx = 0, dy = 0;
  if (keys.has('w') || keys.has('arrowup'))    { dy -= 1; player.dir = 'up'; }
  if (keys.has('s') || keys.has('arrowdown'))  { dy += 1; player.dir = 'down'; }
  if (keys.has('a') || keys.has('arrowleft'))  { dx -= 1; player.dir = 'left'; }
  if (keys.has('d') || keys.has('arrowright')) { dx += 1; player.dir = 'right'; }
  player.moving = dx !== 0 || dy !== 0;
  if (!player.moving) { player.animTimer = 0; return; }

  const len = Math.hypot(dx, dy);
  const mx = (dx / len) * SPEED * dt;
  const my = (dy / len) * SPEED * dt;
  if (!playerSolid(player.x + mx, player.y, currentMap)) player.x += mx; // 分轴：先 x 后 y
  if (!playerSolid(player.x, player.y + my, currentMap)) player.y += my;
  player.x = Math.max(0, Math.min(currentMap[0].length * TILE - 16, player.x));
  player.y = Math.max(0, Math.min(currentMap.length * TILE - 16, player.y));
  player.animTimer += dt;
}

// 帧选择统一入口：静止=帧1，移动=0.15s 两帧交替；left/right 共用 side 帧，left 绘制时翻转
function frameKey(player) {
  const f = player.moving ? (Math.floor(player.animTimer / 0.15) % 2) + 1 : 1;
  const base = (player.dir === 'left' || player.dir === 'right') ? 'side' : player.dir;
  return base + f;
}

export function drawPlayer(ctx, player) {
  drawSprite(ctx, PLAYER_FRAMES[frameKey(player)], PALETTE_PLAYER,
             player.x, player.y, player.dir === 'left', 1.5);
}
