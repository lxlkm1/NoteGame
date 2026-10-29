// zdw：偶尔出现的考研学生，往返图书馆，看到咪咪后会追赶并短暂抓起。
import { TILE } from '../map.js';
import defaultTiles from '../data/maps/tiles.js';
import * as Mimi from './mimi.js';

const DIRECTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const INTERACTIONS = new Set(['chase', 'grab', 'hold', 'release']);
const ENTRY = { x: 19 * TILE, y: 5 * TILE };
const EXIT = { x: 19 * TILE, y: 28 * TILE };
const SEAT = { x: 25 * TILE, y: 20 * TILE };
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const cell = (point) => ({ col: Math.floor((point.x + 8) / TILE), row: Math.floor((point.y + 8) / TILE) });

export function shouldAppear(sample) { return sample < 0.35; }

export function createZdw(maps, rng = Math.random) {
  const appears = shouldAppear(rng());
  return {
    id: 'zdw', name: 'zdw', kind: 'zdw', maps, tiles: maps.tiles || defaultTiles,
    col: 19, row: 27, x: 19 * TILE, y: 27 * TILE,
    scene: appears ? 'outside' : null, phase: appears ? 'outsideIn' : 'offscreen',
    facing: 'up', moving: false, animTimer: 0, feedCooldown: 0,
    stateTimer: 12, phaseTimer: 0, phaseDuration: 0, catchCooldown: 0,
    path: [], pathGoal: null, resumePhase: null,
    targetMimi: null, heldMimi: null, capturePoint: null, releasePoint: null,
  };
}

function walkable(npc, col, row) {
  const tile = npc.maps[npc.scene]?.map[row]?.[col];
  return !!tile && !!npc.tiles[tile] && !npc.tiles[tile].solid;
}

function route(npc, start, end) {
  const key = ({ col, row }) => `${col},${row}`;
  const startKey = key(start), endKey = key(end);
  const queue = [start], previous = new Map([[startKey, null]]);
  for (let i = 0; i < queue.length; i++) {
    const here = queue[i];
    if (key(here) === endKey) break;
    for (const [dx, dy] of DIRECTIONS) {
      const next = { col: here.col + dx, row: here.row + dy };
      if (!previous.has(key(next)) && walkable(npc, next.col, next.row)) {
        previous.set(key(next), key(here));
        queue.push(next);
      }
    }
  }
  if (!previous.has(endKey)) return [];
  const points = [];
  for (let current = endKey; current !== startKey; current = previous.get(current)) {
    const [col, row] = current.split(',').map(Number);
    points.unshift({ x: col * TILE, y: row * TILE });
  }
  return points;
}

function clearPath(npc) { npc.path = []; npc.pathGoal = null; }

function moveAlong(npc, target, speed, dt) {
  if (distance(npc, target) < 0.5) { npc.x = target.x; npc.y = target.y; return true; }
  const end = cell(target), goal = `${npc.scene}:${end.col},${end.row}`;
  if (npc.pathGoal !== goal) {
    // 目标换格时先走完当前直线段，避免从拐角斜穿树丛。
    const anchor = npc.path[0] || { x: cell(npc).col * TILE, y: cell(npc).row * TILE };
    npc.path = route(npc, cell(anchor), end);
    if (distance(npc, anchor) > 0.01) npc.path.unshift(anchor);
    npc.pathGoal = goal;
  }
  const next = npc.path[0];
  if (!next) return false;
  const dx = next.x - npc.x, dy = next.y - npc.y, length = Math.hypot(dx, dy);
  const step = Math.min(length, speed * dt);
  if (step >= length) {
    npc.x = next.x; npc.y = next.y; npc.path.shift();
  } else {
    npc.x += dx / length * step; npc.y += dy / length * step;
  }
  npc.moving = true;
  npc.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  if (distance(npc, target) < 0.5) { npc.x = target.x; npc.y = target.y; return true; }
  return false;
}

function clearSight(npc, target) {
  const steps = Math.max(1, Math.ceil(distance(npc, target) / 4));
  for (let i = 0; i <= steps; i++) {
    const sample = cell({ x: npc.x + (target.x - npc.x) * i / steps, y: npc.y + (target.y - npc.y) * i / steps });
    if (!walkable(npc, sample.col, sample.row)) return false;
  }
  return true;
}

function groundPoint(npc) {
  const { col, row } = cell(npc);
  const dx = npc.facing === 'left' ? -1 : 1;
  const hide = npc.heldMimi?.hide || npc.targetMimi?.hide;
  // 同侧优先：草丛占住同侧正格时，放草丛同侧角格外（保持抓起与放下同侧），都不行才落到身后
  for (const [x, y] of [[dx, 0], [dx, 1], [dx, -1], [-dx, 0], [0, 1], [0, -1], [0, 0]]) {
    if (hide && col + x === hide.col && row + y === hide.row) continue;
    if (walkable(npc, col + x, row + y)) return { x: (col + x) * TILE, y: (row + y) * TILE };
  }
  return npc.capturePoint || { x: npc.x, y: npc.y };
}

function phase(npc, name, duration) {
  npc.phase = name; npc.phaseDuration = duration; npc.phaseTimer = duration;
  npc.moving = false;
}

function finishInteraction(npc, rng) {
  if (npc.heldMimi) Mimi.release(npc.heldMimi, npc.releasePoint || groundPoint(npc));
  npc.heldMimi = null; npc.targetMimi = null;
  npc.capturePoint = null; npc.releasePoint = null;
  npc.phase = npc.resumePhase || 'outsideIn'; npc.resumePhase = null;
  npc.phaseTimer = 0; npc.phaseDuration = 0;
  npc.catchCooldown = 24 + rng() * 8;
  clearPath(npc);
}

function updateCommute(npc, dt, rng) {
  switch (npc.phase) {
    case 'outsideIn':
      if (moveAlong(npc, ENTRY, 28, dt)) {
        npc.scene = 'atrium'; npc.x = EXIT.x; npc.y = EXIT.y;
        npc.phase = 'atriumSeat'; clearPath(npc);
      }
      break;
    case 'atriumSeat':
      if (moveAlong(npc, SEAT, 24, dt)) {
        npc.phase = 'study'; npc.stateTimer = 24 + rng() * 16;
        npc.facing = 'down'; npc.moving = false; clearPath(npc);
      }
      break;
    case 'study':
      npc.stateTimer -= dt;
      if (npc.stateTimer <= 0) npc.phase = 'atriumOut';
      break;
    case 'atriumOut':
      if (moveAlong(npc, EXIT, 24, dt)) {
        npc.scene = 'outside'; npc.x = ENTRY.x; npc.y = ENTRY.y;
        npc.phase = 'outsideOut'; clearPath(npc);
      }
      break;
    case 'outsideOut':
      if (moveAlong(npc, EXIT, 28, dt)) {
        npc.scene = null; npc.phase = 'offscreen'; npc.stateTimer = 12;
        npc.moving = false; clearPath(npc);
      }
      break;
    case 'offscreen':
      npc.stateTimer -= dt;
      if (npc.stateTimer <= 0) {
        npc.stateTimer = 12;
        if (shouldAppear(rng())) {
          npc.scene = 'outside'; npc.x = 19 * TILE; npc.y = 27 * TILE;
          npc.phase = 'outsideIn'; npc.facing = 'up'; clearPath(npc);
        }
      }
      break;
  }
}

export function updateZdw(npc, dt, mimi = null, rng = Math.random) {
  npc.animTimer += dt; npc.moving = false;
  npc.catchCooldown = Math.max(0, npc.catchCooldown - dt);
  if (INTERACTIONS.has(npc.phase) && (npc.scene !== 'outside' || npc.targetMimi !== mimi)) {
    finishInteraction(npc, rng);
    return;
  }

  if (npc.scene === 'outside' && !INTERACTIONS.has(npc.phase) && npc.catchCooldown === 0 &&
      mimi && mimi.state !== 'hidden' && mimi.state !== 'held' && distance(npc, mimi) <= 128 && clearSight(npc, mimi)) {
    npc.resumePhase = npc.phase; npc.targetMimi = mimi;
    phase(npc, 'chase', 16); clearPath(npc);
  }

  if (npc.phase === 'chase') {
    npc.phaseTimer -= dt;
    if (mimi.state === 'held' || npc.phaseTimer <= 0) {
      finishInteraction(npc, rng);
    } else if (distance(npc, mimi) <= 12 && clearSight(npc, mimi)) {
      if (Mimi.capture(mimi, npc)) {
        npc.heldMimi = mimi;
        npc.capturePoint = { x: mimi.x, y: mimi.y };
        npc.facing = mimi.x < npc.x ? 'left' : 'right';
        npc.releasePoint = groundPoint(npc);
        if (Math.abs(npc.releasePoint.x - npc.x) > 8) npc.facing = npc.releasePoint.x < npc.x ? 'left' : 'right';
        phase(npc, 'grab', 0.55); clearPath(npc);
      } else finishInteraction(npc, rng);
    } else moveAlong(npc, mimi, 60, dt);
    return;
  }

  if (INTERACTIONS.has(npc.phase)) {
    npc.phaseTimer -= dt;
    if (npc.phaseTimer <= 0) {
      if (npc.phase === 'grab') phase(npc, 'hold', 2.4);
      else if (npc.phase === 'hold') phase(npc, 'release', 0.55);
      else finishInteraction(npc, rng);
    }
    return;
  }
  updateCommute(npc, dt, rng);
}
