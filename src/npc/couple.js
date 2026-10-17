// couple.js —— 小情侣：偶尔成对出现在前庭，一起散步后离开
import { TILE } from '../map.js';
import { student } from './shared.js';

function createCouple() {
  const members = [student('couple-a', 'outside', 19, 28, 'red', 'couple'),
                   student('couple-b', 'outside', 20, 28, 'green', 'couple')];
  members[0].feedCooldown = 8;
  members[1].feedCooldown = 11;
  return { y: 28 * TILE, phase: 'up', members };
}

export function updateCouple(world, dt, rng) {
  if (!world.couple) {
    world.coupleTimer -= dt;
    if (world.coupleTimer <= 0) {
      if (rng() < 0.35) world.couple = createCouple();
      world.coupleTimer = 22 + rng() * 15;
    }
    return;
  }
  const pair = world.couple;
  const target = pair.phase === 'up' ? 10 * TILE : 28 * TILE;
  const delta = Math.sign(target - pair.y) * Math.min(20 * dt, Math.abs(target - pair.y));
  pair.y += delta;
  for (const member of pair.members) {
    member.y = pair.y;
    member.moving = true;
    member.facing = pair.phase === 'up' ? 'up' : 'down';
    member.animTimer += dt;
  }
  if (Math.abs(pair.y - target) < 0.5) {
    if (pair.phase === 'up') pair.phase = 'down';
    else world.couple = null;
  }
}
