// 咪咪：室外奶牛猫的警觉、躲藏与远距离投喂逻辑（不依赖 DOM）
const TILE = 16;
const FEAR_RANGE = 5 * TILE;
const FOOD_MIN = 6 * TILE;
const FOOD_MAX = 8 * TILE;
const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const PALETTE = { B: '#25252d', C: '#bd8590', E: '#312c31', G: '#d9b94e', W: '#f5f1e8' };

function shouldAppear(sample) { return sample < 0.4; }

function create(site, hearts = 0) {
  return {
    id: 'mimi', name: '咪咪', palette: PALETTE,
    x: site.spawn.col * TILE, y: site.spawn.row * TILE,
    spawn: site.spawn, hide: site.hide,
    state: 'waiting', stateTimer: 0, hearts, hasMet: hearts > 0,
    heldBy: null, fearTimer: 0,
    food: null, path: [], pathGoal: null,
    moving: false, dir: 1, walkTimer: 0, blinkTimer: 0, facePlayer: false,
    frenzyTimer: 18 + Math.random() * 12, frenzyTurns: 0, frenzyTarget: null,
  };
}

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function walkable(col, row, map, tiles) {
  const ch = map[row] && map[row][col];
  return !!(ch && tiles[ch] && !tiles[ch].solid);
}

function canOfferFood(mimi, player, map, tiles) {
  if (!mimi || mimi.food || mimi.state === 'eating' || mimi.state === 'held') return false;
  const d = distance(mimi, player);
  if (d < FOOD_MIN || d > FOOD_MAX) return false;
  const [dx, dy] = DIR[player.dir] || DIR.down;
  const col = Math.floor((player.x + 8) / TILE) + dx;
  const row = Math.floor((player.y + 8) / TILE) + dy;
  if (!walkable(col, row, map, tiles)) return false;
  return { x: col * TILE, y: row * TILE };
}

function offerFood(mimi, player, map, tiles) {
  const point = canOfferFood(mimi, player, map, tiles);
  if (!point) return false;
  mimi.food = point;
  return true;
}

function offerBowlFood(mimi, bowl) {
  if (!mimi || mimi.state === 'eating' || mimi.state === 'held') return false;
  mimi.food = { x: bowl.x, y: bowl.y, bowl };
  if (mimi.fearTimer > 0) return true;
  mimi.state = 'approaching';
  mimi.pathGoal = null;
  mimi.path = [];
  return true;
}

function route(startCol, startRow, endCol, endRow, map, tiles) {
  const start = `${startCol},${startRow}`;
  const goal = `${endCol},${endRow}`;
  const queue = [[startCol, startRow]];
  const previous = new Map([[start, null]]);
  for (let head = 0; head < queue.length; head++) {
    const [col, row] = queue[head];
    if (`${col},${row}` === goal) break;
    for (const [dx, dy] of Object.values(DIR)) {
      const nc = col + dx, nr = row + dy, key = `${nc},${nr}`;
      if (!previous.has(key) && walkable(nc, nr, map, tiles)) {
        previous.set(key, `${col},${row}`);
        queue.push([nc, nr]);
      }
    }
  }
  if (!previous.has(goal)) return [];
  const result = [];
  for (let key = goal; key !== start; key = previous.get(key)) {
    const [col, row] = key.split(',').map(Number);
    result.unshift({ x: col * TILE, y: row * TILE });
  }
  return result;
}

function moveTo(mimi, target, speed, dt, map, tiles) {
  if (distance(mimi, target) < 0.5) { mimi.moving = false; return true; }
  const goal = `${Math.floor((target.x + 8) / TILE)},${Math.floor((target.y + 8) / TILE)}`;
  if (mimi.pathGoal !== goal) {
    mimi.pathGoal = goal;
    mimi.path = route(Math.floor((mimi.x + 8) / TILE), Math.floor((mimi.y + 8) / TILE),
                      Math.floor((target.x + 8) / TILE), Math.floor((target.y + 8) / TILE), map, tiles);
  }
  const next = mimi.path[0];
  if (!next) return false;
  const dx = next.x - mimi.x, dy = next.y - mimi.y;
  const len = Math.hypot(dx, dy);
  const step = Math.min(speed * dt, len);
  if (step >= len) {
    mimi.x = next.x; mimi.y = next.y; mimi.path.shift();
  } else {
    mimi.x += dx / len * step; mimi.y += dy / len * step;
  }
  if (Math.abs(dx) > 0.5) mimi.dir = dx > 0 ? 1 : -1;
  mimi.walkTimer += dt;
  mimi.moving = true;
  return distance(mimi, target) < 0.5;
}

function flee(mimi) {
  mimi.state = 'fleeing';
  mimi.pathGoal = null;
  mimi.path = [];
}

// 被 zdw 抓住后，位置与猫的绘制由持有者管理，保留食物和好感。
function capture(mimi, holder) {
  if (!mimi || mimi.state === 'held') return false;
  mimi.heldBy = holder.id;
  mimi.state = 'held';
  mimi.stateTimer = 0;
  mimi.moving = false;
  mimi.facePlayer = false;
  mimi.path = []; mimi.pathGoal = null; mimi.frenzyTarget = null;
  return true;
}

function release(mimi, point) {
  if (!mimi || mimi.state !== 'held') return false;
  mimi.x = point.x; mimi.y = point.y;
  mimi.heldBy = null;
  mimi.fearTimer = 3;
  mimi.frenzyTimer = 18;
  flee(mimi);
  return true;
}

function retreat(mimi, dt, map, tiles) {
  if (moveTo(mimi, { x: mimi.hide.col * TILE, y: mimi.hide.row * TILE }, 48, dt, map, tiles)) {
    mimi.state = 'hidden';
    mimi.stateTimer = 7;
  }
}

function playerFarFromFood(mimi, player) {
  return mimi.food && distance(player, mimi.food) > FEAR_RANGE && distance(player, mimi) > FEAR_RANGE;
}

function update(mimi, dt, player, map, tiles, rng = Math.random, bowls = [], threat = null) {
  mimi.blinkTimer += dt;
  mimi.moving = false;
  if (mimi.state === 'held') return;
  mimi.fearTimer = Math.max(0, mimi.fearTimer - dt);
  if (threat?.scene === 'outside' && distance(mimi, threat) < 6 * TILE) mimi.fearTimer = 3;
  if (mimi.fearTimer > 0) {
    if (mimi.state !== 'hidden' && mimi.state !== 'fleeing') flee(mimi);
    if (mimi.state === 'fleeing') retreat(mimi, dt, map, tiles);
    return;
  }
  if (mimi.state !== 'eating' && !(mimi.food && mimi.food.bowl && mimi.food.bowl.filled)) {
    const fullBowl = bowls.find(bowl => bowl.filled);
    if (fullBowl) offerBowlFood(mimi, fullBowl);
  }
  const bowlFood = mimi.food && mimi.food.bowl && mimi.food.bowl.filled;
  if (bowlFood && mimi.state !== 'approaching' && mimi.state !== 'eating') {
    mimi.state = 'approaching'; mimi.pathGoal = null; mimi.path = [];
  }
  if (!bowlFood && mimi.state !== 'hidden' && mimi.state !== 'fleeing' && mimi.state !== 'frenzy' && distance(mimi, player) < FEAR_RANGE) flee(mimi);

  if (!mimi.food && ['waiting', 'hidden'].includes(mimi.state)) {
    mimi.frenzyTimer -= dt;
    if (mimi.frenzyTimer <= 0) {
      mimi.state = 'frenzy'; mimi.frenzyTurns = 5 + Math.floor(rng() * 4);
      mimi.frenzyTarget = null; mimi.pathGoal = null;
    }
  }

  if (mimi.state === 'fleeing') {
    retreat(mimi, dt, map, tiles);
  } else if (mimi.state === 'hidden') {
    if (playerFarFromFood(mimi, player)) {
      mimi.state = 'approaching'; mimi.pathGoal = null;
    } else {
      mimi.stateTimer -= dt;
      if (mimi.stateTimer <= 0 && distance(mimi, player) > 6 * TILE && !mimi.food) mimi.state = 'waiting';
    }
  } else if (mimi.state === 'waiting') {
    if (playerFarFromFood(mimi, player)) { mimi.state = 'approaching'; mimi.pathGoal = null; }
  } else if (mimi.state === 'approaching') {
    if ((bowlFood || playerFarFromFood(mimi, player)) && moveTo(mimi, mimi.food, bowlFood ? 64 : 28, dt, map, tiles)) {
      mimi.state = 'eating'; mimi.stateTimer = 1.6;
    }
  } else if (mimi.state === 'eating') {
    mimi.stateTimer -= dt;
    if (mimi.stateTimer <= 0) {
      mimi.hearts = Math.min(5, mimi.hearts + 1);
      mimi.hasMet = true;
      if (mimi.food && mimi.food.bowl) mimi.food.bowl.filled = false;
      mimi.food = null;
      flee(mimi);
    }
  } else if (mimi.state === 'frenzy') {
    if (!mimi.frenzyTarget) {
      const col = Math.floor((mimi.x + 8) / TILE);
      const row = Math.floor((mimi.y + 8) / TILE);
      const options = [];
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        if (Math.abs(dx) + Math.abs(dy) < 2 || !walkable(col + dx, row + dy, map, tiles)) continue;
        if (route(col, row, col + dx, row + dy, map, tiles).length) options.push({ x: (col + dx) * TILE, y: (row + dy) * TILE });
      }
      if (options.length) mimi.frenzyTarget = options[Math.floor(rng() * options.length)];
      else mimi.frenzyTurns = 0;
    }
    if (mimi.frenzyTarget && moveTo(mimi, mimi.frenzyTarget, 92, dt, map, tiles)) {
      mimi.frenzyTarget = null; mimi.frenzyTurns--;
    }
    if (mimi.frenzyTurns <= 0) {
      mimi.state = 'waiting'; mimi.frenzyTimer = 18 + rng() * 12;
    }
  }
}

export { shouldAppear, create, canOfferFood, offerFood, offerBowlFood, capture, release, update };
