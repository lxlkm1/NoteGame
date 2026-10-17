// cats.js —— 前庭的 10 只普通猫：状态机（纯逻辑，无 DOM）+ 渲染
// 猫的定义数据在 src/data/cats.js
import { CAT_DEFS } from '../data/cats.js';

const TILE = 16;

const CAT_SPEED = 12; // px/s，慢悠悠

function createCats() {
  return CAT_DEFS.map((def) => ({
    def,
    id: def.id, name: def.name, persona: def.persona, palette: def.palette,
    homeX: def.col * TILE, homeY: def.row * TILE,
    x: def.col * TILE, y: def.row * TILE,
    state: 'wander', stateTimer: 2 + Math.random() * 4,
    targetX: def.col * TILE, targetY: def.row * TILE,
    dir: 1, walkTimer: 0, blinkTimer: Math.random() * 8, pauseTimer: 0, moving: false,
    hearts: 0,
    dishX: 0, dishY: 0,        // Task 5 使用
    followTimer: 0,            // Task 6 使用
    hasMet: false,             // Task 7 计数用
  }));
}

function canStand(x, y, mapRows, tiles) {
  if (!mapRows || !tiles) return true;
  for (const px of [x + 3, x + 12]) for (const py of [y + 12, y + 15]) {
    const row = Math.floor(py / TILE), col = Math.floor(px / TILE);
    const ch = mapRows[row] && mapRows[row][col];
    if (!ch || !tiles[ch] || tiles[ch].solid) return false;
  }
  return true;
}

function pickWanderTarget(cat, mapRows, tiles) {
  const r = cat.def.radius || 24;
  for (let i = 0; i < 12; i++) {
    let x, y;
    if (cat.def.bounds) {
      x = cat.def.bounds.x1 + Math.random() * (cat.def.bounds.x2 - cat.def.bounds.x1);
      y = cat.def.bounds.y1 + Math.random() * (cat.def.bounds.y2 - cat.def.bounds.y1);
    } else {
      x = cat.homeX + (Math.random() * 2 - 1) * r;
      y = cat.homeY + (Math.random() * 2 - 1) * r;
    }
    if (canStand(x, y, mapRows, tiles)) { cat.targetX = x; cat.targetY = y; return; }
  }
  cat.targetX = cat.homeX; cat.targetY = cat.homeY;
}

function moveToward(cat, tx, ty, speed, dt, mapRows, tiles) {
  const dx = tx - cat.x, dy = ty - cat.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true; // 到达
  const step = Math.min(speed * dt, dist);
  const nextX = cat.x + (dx / dist) * step;
  const nextY = cat.y + (dy / dist) * step;
  if (canStand(nextX, cat.y, mapRows, tiles)) cat.x = nextX;
  else cat.blocked = true;
  if (canStand(cat.x, nextY, mapRows, tiles)) cat.y = nextY;
  else cat.blocked = true;
  if (Math.abs(dx) > 1) cat.dir = dx > 0 ? 1 : -1;
  cat.walkTimer += dt;
  return false;
}

function findRoute(cat, tx, ty, mapRows, tiles) {
  const startCol = Math.floor((cat.x + 8) / TILE), startRow = Math.floor((cat.y + 8) / TILE);
  const endCol = Math.floor((tx + 8) / TILE), endRow = Math.floor((ty + 8) / TILE);
  const start = `${startCol},${startRow}`, goal = `${endCol},${endRow}`;
  const queue = [[startCol, startRow]], previous = new Map([[start, null]]);
  for (let head = 0; head < queue.length && !previous.has(goal); head++) {
    const [col, row] = queue[head];
    for (const [dx, dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
      const nc = col + dx, nr = row + dy, key = `${nc},${nr}`;
      if (!previous.has(key) && canStand(nc * TILE, nr * TILE, mapRows, tiles)) {
        previous.set(key, `${col},${row}`);
        queue.push([nc, nr]);
      }
    }
  }
  if (!previous.has(goal)) return null;
  const route = [];
  for (let key = goal; key !== start; key = previous.get(key)) {
    const [col, row] = key.split(',').map(Number);
    route.unshift({ x: col * TILE, y: row * TILE });
  }
  route.unshift({ x: startCol * TILE, y: startRow * TILE });
  route.push({ x: tx, y: ty });
  return route;
}

function moveByRoute(cat, tx, ty, speed, dt, mapRows, tiles) {
  if (!mapRows || !tiles) return moveToward(cat, tx, ty, speed, dt);
  const goal = `${tx},${ty}`;
  if (cat.routeGoal !== goal) {
    cat.routeGoal = goal;
    cat.route = findRoute(cat, tx, ty, mapRows, tiles);
  }
  if (!cat.route) { cat.blocked = true; return false; }
  while (cat.route.length && Math.hypot(cat.x - cat.route[0].x, cat.y - cat.route[0].y) < 1) cat.route.shift();
  if (!cat.route.length) return true;
  const next = cat.route[0];
  moveToward(cat, next.x, next.y, speed, dt, mapRows, tiles);
  if (cat.blocked) return false;
  if (Math.hypot(cat.x - next.x, cat.y - next.y) < 1) cat.route.shift();
  return cat.route.length === 0;
}

function updateCat(cat, dt, player, mapRows, tiles) {
  cat.stateTimer -= dt;
  cat.blinkTimer += dt;
  cat.moving = false;
  cat.blocked = false;
  switch (cat.state) {
    case 'wander': {
      if (cat.pauseTimer > 0) { // 站立片刻：只倒计时，不移动
        cat.pauseTimer -= dt;
        if (cat.pauseTimer <= 0) pickWanderTarget(cat, mapRows, tiles);
      } else {
        const arrived = moveToward(cat, cat.targetX, cat.targetY, CAT_SPEED, dt, mapRows, tiles);
        cat.moving = !arrived && !cat.blocked;
        if (arrived) cat.pauseTimer = 0.6 + Math.random() * 1.2; // 到达目标，停顿 0.6~1.8s
        if (cat.blocked) { cat.pauseTimer = 0.2; cat.moving = false; }
      }
      if (cat.stateTimer <= 0) { // 走累了，睡一觉
        cat.state = 'nap';
        cat.stateTimer = 4 + Math.random() * 4;
      }
      break;
    }
    case 'nap': {
      if (cat.stateTimer <= 0) { // 睡够了
        cat.state = 'wander';
        cat.stateTimer = 3 + Math.random() * 5;
        cat.pauseTimer = 0; // 清除入睡前的残留停顿，醒后立即走动
        pickWanderTarget(cat, mapRows, tiles);
      }
      break;
    }
    case 'gotoFood': {
      const arrived = moveByRoute(cat, cat.dishX, cat.dishY, CAT_SPEED * 1.5, dt, mapRows, tiles);
      cat.moving = !arrived && !cat.blocked;
      if (arrived) {
        cat.state = 'eat';
        cat.stateTimer = 1.6;
      }
      break;
    }
    case 'eat': {
      if (cat.stateTimer <= 0) {
        if (cat.foodSource === 'npc') {
          cat.foodSource = null;
          cat.state = 'wander';
          cat.stateTimer = 2 + Math.random() * 3;
          pickWanderTarget(cat, mapRows, tiles);
          break;
        }
        cat.hearts = Math.min(5, cat.hearts + 1);
        if (cat.hearts >= 5) {          // 心满意足 → 跟随
          cat.state = 'follow';
          cat.followTimer = 8;
        } else {
          cat.state = 'wander';
          cat.stateTimer = 2 + Math.random() * 3;
          pickWanderTarget(cat, mapRows, tiles);
        }
      }
      break;
    }
    case 'follow': {
      cat.followTimer -= dt;
      if (cat.followTimer <= 0) { cat.state = 'return'; cat.routeGoal = null; break; }
      if (!player) break;
      const d = Math.hypot(player.x - cat.x, player.y - cat.y);
      if (d > 24) cat.moving = !moveToward(cat, player.x, player.y, CAT_SPEED * 1.8, dt, mapRows, tiles) && !cat.blocked;
      break;
    }
    case 'return': {
      const arrived = moveByRoute(cat, cat.homeX, cat.homeY, CAT_SPEED * 1.5, dt, mapRows, tiles);
      cat.moving = !arrived && !cat.blocked;
      if (arrived) {
        cat.state = 'nap';
        cat.stateTimer = 5 + Math.random() * 3; // 心满意足地睡
      }
      break;
    }
  }
}

// ---- 渲染（只被 main.js 调用） ----
function catFrame(cat) {
  switch (cat.state) {
    case 'nap': return 'sleep';
    case 'eat': return 'eat';
    case 'eating': return 'eat'; // 室外咪咪复用吃饭帧
    default: {
      if (!cat.moving) return Math.floor(cat.blinkTimer / 1.6) % 5 === 4 ? 'idle2' : 'idle1';
      return Math.floor(cat.walkTimer / (cat.state === 'frenzy' ? 0.09 : 0.25)) % 2 === 0 ? 'walk1' : 'walk2';
    }
  }
}

function drawCat(ctx, cat, drawSprite, CAT_FRAMES, player) {
  const frame = CAT_FRAMES[catFrame(cat)];
  const flip = cat.facePlayer
    ? (player.x < cat.x)
    : (cat.dir < 0);
  drawSprite(ctx, frame, cat.palette, cat.x, cat.y, flip, 1.25);
}

function feed(cat, dishX, dishY, source = 'player') {
  if (cat.state === 'eat' || cat.state === 'gotoFood') return false; // 正在吃就不重复投
  cat.dishX = dishX;
  cat.dishY = dishY;
  cat.foodSource = source;
  cat.routeGoal = null;
  cat.state = 'gotoFood';
  return true;
}

export { createCats, updateCat, drawCat, feed };
