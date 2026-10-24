import test from 'node:test';
import assert from 'node:assert/strict';
import { createZdw, shouldAppear, updateZdw } from '../../src/npc/zdw.js';
import * as Mimi from '../../src/npc/mimi.js';
import { MAPS } from '../../src/data/maps/index.js';

const TILE = 16;
const fixed = () => 0.2;
const point = (col, row) => ({ x: col * TILE, y: row * TILE });
const isWalkable = (npc) => {
  if (!npc.scene) return;
  const col = Math.floor((npc.x + 8) / TILE);
  const row = Math.floor((npc.y + 8) / TILE);
  const tile = MAPS[npc.scene].map[row]?.[col];
  assert.ok(tile && !MAPS.tiles[tile].solid, `zdw 走入障碍：${npc.scene} ${col},${row}`);
};

function until(npc, mimi, predicate, seconds = 30) {
  for (let i = 0; i < seconds / 0.05 && !predicate(); i++) {
    updateZdw(npc, 0.05, mimi, fixed);
    isWalkable(npc);
  }
  assert.ok(predicate(), `没有到达预期状态，目前 ${npc.phase}`);
}

test('zdw 有 35% 初次出现概率，未出现时每 12 秒重新抽取', () => {
  assert.equal(shouldAppear(0), true);
  assert.equal(shouldAppear(0.3499), true);
  assert.equal(shouldAppear(0.35), false);
  assert.equal(shouldAppear(0.99), false);
  const visible = createZdw(MAPS, () => 0.34);
  assert.equal(visible.name, 'zdw');
  assert.equal(visible.scene, 'outside');
  assert.deepEqual({ x: visible.x, y: visible.y }, point(19, 27));
  const absent = createZdw(MAPS, () => 0.35);
  assert.equal(absent.scene, null);
  updateZdw(absent, 11.9, null, () => 0);
  assert.equal(absent.scene, null);
  updateZdw(absent, 0.2, null, () => 0.9);
  assert.equal(absent.scene, null);
  updateZdw(absent, 12, null, () => 0.1);
  assert.equal(absent.scene, 'outside');
  assert.equal(absent.phase, 'outsideIn');
});

test('zdw 沿真实地图进图书馆复习，再出馆并消失', () => {
  const npc = createZdw(MAPS, fixed);
  const phases = new Set();
  let studyTime = 0;
  for (let i = 0; i < 2000 && npc.scene !== null; i++) {
    if (npc.phase === 'study') studyTime += 0.05;
    updateZdw(npc, 0.05, null, fixed);
    if (npc.phase === 'study') assert.deepEqual({ x: npc.x, y: npc.y }, point(25, 20), '复习应坐在独立的空位');
    phases.add(npc.phase);
    isWalkable(npc);
  }
  for (const phase of ['atriumSeat', 'study', 'atriumOut', 'outsideOut', 'offscreen']) {
    assert.ok(phases.has(phase), `缺少通勤阶段：${phase}`);
  }
  assert.ok(studyTime >= 24 && studyTime <= 40);
  assert.equal(npc.scene, null);
});

for (const side of ['left', 'right']) {
  test(`zdw 追踪${side === 'left' ? '左' : '右'}侧咪咪，能从草丛抓起再放下`, () => {
    const npc = createZdw(MAPS, fixed);
    Object.assign(npc, point(19, 16));
    const mimi = Mimi.create(MAPS.outside.mimiSites[side], 3);
    const food = { ...point(19, 18) };
    mimi.food = food;
    updateZdw(npc, 0.05, mimi, fixed);
    assert.equal(npc.phase, 'chase');
    Object.assign(mimi, point(mimi.hide.col, mimi.hide.row), { state: 'hidden' });
    until(npc, mimi, () => npc.phase === 'grab');
    assert.equal(mimi.state, 'held');
    assert.equal(mimi.heldBy, 'zdw');
    assert.equal(npc.heldMimi, mimi);
    assert.ok(Math.hypot(npc.x - mimi.x, npc.y - mimi.y) <= 12);
    const captureSide = Math.sign(npc.capturePoint.x - npc.x);
    assert.equal(npc.facing, captureSide < 0 ? 'left' : 'right', '抓取时应朝向咪咪');
    assert.equal(Math.sign(npc.releasePoint.x - npc.x), captureSide, '抓取和放下应位于身体同侧');
    until(npc, mimi, () => npc.phase === 'hold');
    assert.ok(npc.phaseTimer >= 2.3);
    until(npc, mimi, () => npc.phase === 'release');
    assert.equal(mimi.state, 'held');
    until(npc, mimi, () => npc.phase === 'outsideIn');
    assert.equal(npc.heldMimi, null);
    assert.notEqual(mimi.state, 'held');
    assert.equal(mimi.hearts, 3);
    assert.equal(mimi.food, food);
    assert.ok(npc.catchCooldown >= 24);
    assert.ok(Math.hypot(mimi.x - mimi.hide.col * TILE, mimi.y - mimi.hide.row * TILE) >= TILE,
      '放下地点应离草丛至少一格，让咪咪先跑一段再躲藏');
    const tile = MAPS.outside.map[Math.floor((mimi.y + 8) / TILE)]?.[Math.floor((mimi.x + 8) / TILE)];
    assert.ok(tile && !MAPS.tiles[tile].solid);
    until(npc, mimi, () => npc.scene === 'atrium');
  });
}

test('与咪咪真实警觉逻辑配合，放下后可见逃跑，随后重新躲藏', () => {
  for (const side of ['left', 'right']) {
    const npc = createZdw(MAPS, fixed);
    Object.assign(npc, point(19, 16));
    const mimi = Mimi.create(MAPS.outside.mimiSites[side]);
    const player = { ...point(34, 28), dir: 'up' };
    const phases = new Set();
    let released = false, escaped = false, hidden = false;
    for (let i = 0; i < 500; i++) {
      const wasHeld = mimi.state === 'held';
      updateZdw(npc, 0.05, mimi, fixed);
      phases.add(npc.phase);
      if (wasHeld && mimi.state !== 'held') released = true;
      Mimi.update(mimi, 0.05, player, MAPS.outside.map, MAPS.tiles, fixed, [], npc);
      if (released && mimi.state === 'fleeing' && mimi.moving) escaped = true;
      if (released && mimi.state === 'hidden') { hidden = true; break; }
      isWalkable(npc);
    }
    assert.ok(phases.has('chase') && phases.has('grab') && phases.has('hold') && phases.has('release'));
    assert.ok(released && escaped && hidden, `${side} 侧放下后应先逃跑再藏起来`);
  }
});

test('未见过的隐藏咪咪不会凭空触发追逐', () => {
  const npc = createZdw(MAPS, fixed);
  Object.assign(npc, point(14, 15));
  const mimi = Mimi.create(MAPS.outside.mimiSites.left);
  Object.assign(mimi, point(13, 15), { state: 'hidden' });
  updateZdw(npc, 0.05, mimi, fixed);
  assert.equal(npc.phase, 'outsideIn');
});

test('树丛会挡住视线，已经看到的咪咪躲到障碍后方时沿可走路线追赶', () => {
  const npc = createZdw(MAPS, fixed);
  Object.assign(npc, point(10, 13));
  const mimi = Mimi.create(MAPS.outside.mimiSites.left);
  Object.assign(mimi, point(10, 16));
  updateZdw(npc, 0.05, mimi, fixed);
  assert.equal(npc.phase, 'outsideIn');
  Object.assign(npc, point(13, 13));
  Object.assign(mimi, point(13, 16));
  updateZdw(npc, 0.05, mimi, fixed);
  assert.equal(npc.phase, 'chase');
  Object.assign(mimi, point(10, 16), { state: 'hidden' });
  until(npc, mimi, () => npc.phase === 'grab');
  assert.ok(Math.hypot(npc.x - mimi.x, npc.y - mimi.y) <= 12);
});

test('室外退出或咪咪对象换新，会清除追逐和持有引用', () => {
  for (const replace of [false, true]) {
    const npc = createZdw(MAPS, fixed);
    Object.assign(npc, point(14, 16));
    const mimi = Mimi.create(MAPS.outside.mimiSites.left);
    until(npc, mimi, () => npc.phase === 'hold');
    const newMimi = replace ? Mimi.create(MAPS.outside.mimiSites.right) : null;
    updateZdw(npc, 0.05, newMimi, fixed);
    assert.equal(npc.phase, 'outsideIn');
    assert.equal(npc.heldMimi, null);
    assert.equal(npc.targetMimi, null);
    assert.notEqual(mimi.state, 'held');
    assert.ok(!newMimi || newMimi.state === 'waiting');
  }
  const npc = createZdw(MAPS, fixed);
  Object.assign(npc, point(19, 16));
  const mimi = Mimi.create(MAPS.outside.mimiSites.left);
  updateZdw(npc, 0.05, mimi, fixed);
  assert.equal(npc.phase, 'chase');
  updateZdw(npc, 0.05, null, fixed);
  assert.equal(npc.phase, 'outsideIn');
  assert.equal(npc.targetMimi, null);
});

test('放下咪咪后至少 24 秒内不连续抓取，并继续原来的出馆方向', () => {
  const npc = createZdw(MAPS, fixed);
  Object.assign(npc, point(14, 16), { phase: 'outsideOut' });
  const mimi = Mimi.create(MAPS.outside.mimiSites.left);
  until(npc, mimi, () => npc.phase === 'hold');
  until(npc, mimi, () => npc.phase === 'outsideOut');
  for (let i = 0; i < 200; i++) {
    Object.assign(mimi, { x: npc.x + 2, y: npc.y, state: 'waiting' });
    updateZdw(npc, 0.05, mimi, fixed);
    assert.ok(!['chase', 'grab', 'hold', 'release'].includes(npc.phase));
  }
  until(npc, null, () => npc.scene === null);
});
