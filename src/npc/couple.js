// couple.js —— 小情侣：偶尔成对出现在前庭，散步到上方会停下拥抱或接吻，再继续离开
import { TILE } from '../map.js';
import { student } from './shared.js';

// 亲昵动作规格：站位中心距 / 冒爱心间隔 / 持续时长
const CUDDLE_ACTIONS = {
  hug:  { dist: 22, heartInterval: 0.8, duration: 4 },
  kiss: { dist: 20, heartInterval: 0.4, duration: 5 },
};

function createCouple() {
  const members = [student('couple-a', 'outside', 19, 28, 'red', 'couple'),
                   student('couple-b', 'outside', 20, 28, 'green', 'couple')];
  members[0].feedCooldown = 8;
  members[1].feedCooldown = 11;
  return { y: 28 * TILE, phase: 'up', members };
}

// 到达顶部 → 随机选拥抱或接吻，两人面对面贴近
function startCuddle(pair, rng) {
  pair.action = rng() < 0.5 ? 'hug' : 'kiss';
  const spec = CUDDLE_ACTIONS[pair.action];
  pair.phase = 'cuddle';
  pair.cuddleTimer = spec.duration;
  pair.heartTimer = 0; // 立刻冒第一颗爱心
  const [a, b] = pair.members;
  b.x = a.x + spec.dist;
  a.facing = 'right'; b.facing = 'left';
  a.action = pair.action; b.action = pair.action;
  a.moving = false; b.moving = false;
}

// 返回本帧产生的事件（cuddle-heart：在两人中间上方冒爱心）
export function updateCouple(world, dt, rng) {
  const events = [];
  if (!world.couple) {
    world.coupleTimer -= dt;
    if (world.coupleTimer <= 0) {
      if (rng() < 0.35) world.couple = createCouple();
      world.coupleTimer = 22 + rng() * 15;
    }
    return events;
  }
  const pair = world.couple;
  if (pair.phase === 'cuddle') {
    const spec = CUDDLE_ACTIONS[pair.action];
    for (const member of pair.members) member.animTimer += dt;
    pair.cuddleTimer -= dt;
    pair.heartTimer -= dt;
    if (pair.heartTimer <= 0) {
      pair.heartTimer = spec.heartInterval;
      const [a, b] = pair.members;
      events.push({ type: 'cuddle-heart', x: (a.x + b.x) / 2 + 8, y: pair.y - 22 });
    }
    if (pair.cuddleTimer <= 0) {
      pair.phase = 'down';
      for (const member of pair.members) member.action = null;
      pair.members[1].x = 20 * TILE; // 回到伴侣身侧
    }
    return events;
  }
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
    if (pair.phase === 'up') startCuddle(pair, rng);
    else world.couple = null;
  }
  return events;
}
