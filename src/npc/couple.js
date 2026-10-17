// 前庭情侣：常驻、结伴散步；男生主动靠近，亲昵后可能立刻再次拥抱。
import { TILE } from '../map.js';
import TILES from '../data/maps/tiles.js';
import { student, moveTo } from './shared.js';

const WALK_GAP = 32;
const ACTIONS = {
  hug: { gap: 16, heartInterval: 0.8 },
  kiss: { gap: 19, heartInterval: 0.45 },
  deepKiss: { gap: 17, heartInterval: 0.35 },
};
const LAWN_STAGES = {
  lawnSit: { duration: 1.6, next: 'lawnLap' },
  lawnLap: { duration: 2.2, next: 'lawnHold' },
  lawnHold: { duration: 2.8, next: 'lawnHoldTight', hearts: 1.2 },
  lawnHoldTight: { duration: 14, next: 'lawnRise', hearts: 0.9 },
  lawnRise: { duration: 1.6, next: null },
};

export function createCouple(mapRows) {
  const girl = student('couple-a', 'outside', 19, 28, 'red', 'couple');
  const boy = student('couple-b', 'outside', 21, 28, 'green', 'couple');
  girl.feedCooldown = 8;
  boy.feedCooldown = 11;
  return { members: [girl, boy], mapRows, phase: 'wander', route: [], timer: 0,
    heartTimer: 0, action: null };
}

function canStandTogether(mapRows, col, row) {
  if (row < 0 || row >= mapRows.length || col < 0 || col + 2 >= mapRows[0].length) return false;
  return [col, col + 1, col + 2].every(c => {
    const tile = TILES[mapRows[row][c]];
    return tile && !tile.solid;
  });
}

function isLawnSpot(mapRows, col, row) {
  // 组合坐姿有裙摆、弯曲的腿和双臂，周围需留出完整的草地空间。
  for (let r = row - 1; r <= row; r++) for (let c = col - 1; c <= col + 3; c++)
    if (TILES[mapRows[r]?.[c]]?.style !== 'grass') return false;
  return true;
}

// 在两人都可站立的地格上寻路，随机选择一处距离足够远的目的地。
function walkRoute(pair, rng, lawnOnly = false) {
  const [girl] = pair.members;
  const start = { col: Math.round(girl.x / TILE), row: Math.round(girl.y / TILE) };
  const key = (col, row) => `${col},${row}`;
  const seen = new Map([[key(start.col, start.row), null]]);
  const queue = [start];
  const far = [];
  for (let i = 0; i < queue.length; i++) {
    const point = queue[i];
    const distance = Math.abs(point.col - start.col) + Math.abs(point.row - start.row);
    if (lawnOnly ? distance > 0 && isLawnSpot(pair.mapRows, point.col, point.row) : distance >= 6) far.push(point);
    for (const [dc, dr] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const col = point.col + dc, row = point.row + dr;
      const nextKey = key(col, row);
      if (seen.has(nextKey) || !canStandTogether(pair.mapRows, col, row)) continue;
      seen.set(nextKey, point);
      queue.push({ col, row });
    }
  }
  if (!far.length) return [];
  const destination = far[Math.min(far.length - 1, Math.floor(rng() * far.length))];
  const route = [];
  for (let point = destination; point && (point.col !== start.col || point.row !== start.row);
    point = seen.get(key(point.col, point.row))) {
    route.unshift({ x: point.col * TILE, y: point.row * TILE });
  }
  return route;
}

function startWander(pair, rng) {
  pair.phase = 'wander';
  pair.action = null;
  pair.route = walkRoute(pair, rng);
  for (const member of pair.members) { member.action = null; member.moving = false; }
}

function startLawnWalk(pair, rng) {
  const route = walkRoute(pair, rng, true);
  if (!route.length) return false;
  pair.phase = 'seekLawn';
  pair.action = null;
  pair.route = route;
  for (const member of pair.members) { member.action = null; member.moving = false; }
  return true;
}

function startLawnPose(pair, phase, rng) {
  pair.phase = phase;
  pair.action = phase;
  pair.timer = LAWN_STAGES[phase].duration + (phase === 'lawnHoldTight' ? rng() * 18 : 0);
  pair.heartTimer = 0;
  for (const member of pair.members) { member.action = phase; member.moving = false; }
}

function startApproach(pair) {
  const [girl, boy] = pair.members;
  pair.phase = 'approach';
  pair.action = null;
  girl.facing = 'right'; girl.moving = false; girl.action = null;
  boy.facing = 'left'; boy.moving = true; boy.action = 'approach';
}

function duration(action, rng) {
  const long = rng() < 0.28;
  if (action === 'hug') return long ? 30 + rng() * 30 : 5 + rng() * 5;
  if (action === 'kiss') return long ? 20 + rng() * 20 : 4 + rng() * 6;
  return 8 + rng() * 18;
}

function startAction(pair, action, rng) {
  const [girl, boy] = pair.members;
  pair.phase = action;
  pair.action = action;
  pair.timer = duration(action, rng);
  pair.heartTimer = 0;
  girl.action = action; boy.action = action;
  girl.facing = 'right'; boy.facing = 'left';
  girl.moving = false; boy.moving = false;
}

function startRelease(pair) {
  const [girl, boy] = pair.members;
  pair.phase = 'release';
  pair.action = null;
  pair.timer = 2;
  girl.action = null; girl.moving = false;
  boy.action = 'release'; boy.moving = true;
}

export function updateCouple(world, dt, rng) {
  const events = [];
  const pair = world.couple;
  const [girl, boy] = pair.members;
  girl.animTimer += dt;
  boy.animTimer += dt;
  switch (pair.phase) {
    case 'wander':
    case 'seekLawn': {
      const seekingLawn = pair.phase === 'seekLawn';
      if (!pair.route.length) pair.route = walkRoute(pair, rng);
      const next = pair.route[0];
      if (!next) { pair.phase = 'pause'; pair.timer = 1 + rng() * 2; break; }
      const beforeX = girl.x, beforeY = girl.y;
      if (moveTo(girl, next.x, next.y, 20, dt)) pair.route.shift();
      boy.x += girl.x - beforeX;
      boy.y += girl.y - beforeY;
      boy.facing = girl.facing;
      boy.moving = girl.moving;
      if (!pair.route.length) {
        if (seekingLawn) {
          pair.phase = 'lawnApproach';
          girl.facing = 'right'; girl.moving = false;
          boy.facing = 'left'; boy.action = 'approach';
        } else {
          pair.phase = 'pause'; pair.timer = 1 + rng() * 2;
        }
      }
      break;
    }
    case 'pause':
      girl.moving = false; boy.moving = false;
      pair.timer -= dt;
      if (pair.timer <= 0) {
        const choice = rng();
        if (choice < 0.65) startApproach(pair);
        else if (choice >= 0.85 || !startLawnWalk(pair, rng)) startWander(pair, rng);
      }
      break;
    case 'lawnApproach':
      if (moveTo(boy, girl.x + 20, girl.y, 18, dt)) startLawnPose(pair, 'lawnSit', rng);
      break;
    case 'lawnSit':
    case 'lawnLap':
    case 'lawnHold':
    case 'lawnHoldTight':
    case 'lawnRise': {
      const stage = LAWN_STAGES[pair.phase];
      pair.timer -= dt;
      pair.heartTimer -= dt;
      if (stage.hearts && pair.heartTimer <= 0) {
        pair.heartTimer = stage.hearts;
        events.push({ type: 'cuddle-heart', x: (girl.x + boy.x) / 2 + 8, y: girl.y - 26 });
      }
      if (pair.timer <= 0) {
        if (stage.next) startLawnPose(pair, stage.next, rng);
        else { startRelease(pair); pair.phase = 'lawnSeparate'; }
      }
      break;
    }
    case 'approach':
      girl.moving = false;
      if (moveTo(boy, girl.x + ACTIONS.hug.gap, girl.y, 18, dt)) startAction(pair, 'hug', rng);
      break;
    case 'hug':
    case 'kiss':
    case 'deepKiss': {
      const spec = ACTIONS[pair.phase];
      // 接吻时男生再靠近，女生站在原地。
      moveTo(boy, girl.x + spec.gap, girl.y, 18, dt);
      boy.facing = 'left'; boy.moving = false;
      pair.timer -= dt;
      pair.heartTimer -= dt;
      if (pair.heartTimer <= 0) {
        pair.heartTimer = spec.heartInterval;
        events.push({ type: 'cuddle-heart', x: (girl.x + boy.x) / 2 + 8, y: girl.y - 38 });
      }
      if (pair.timer <= 0) {
        if (pair.phase === 'hug' && rng() < 0.7) startAction(pair, 'kiss', rng);
        else if (pair.phase === 'kiss' && rng() < 0.3) startAction(pair, 'deepKiss', rng);
        else startRelease(pair);
      }
      break;
    }
    case 'release':
    case 'lawnSeparate':
      girl.moving = false;
      pair.timer -= dt;
      if (moveTo(boy, girl.x + WALK_GAP, girl.y, 18, dt) && pair.timer <= 0) {
        if (pair.phase === 'release' && rng() < 0.7) startApproach(pair);
        else startWander(pair, rng);
      }
      break;
  }
  return events;
}
