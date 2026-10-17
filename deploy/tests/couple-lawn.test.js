import test from 'node:test';
import assert from 'node:assert/strict';
import outside from '../../src/data/maps/outside.js';
import tiles from '../../src/data/maps/tiles.js';
import { createCouple, updateCouple } from '../../src/npc/couple.js';

const lawnPhases = ['lawnSit', 'lawnLap', 'lawnHold', 'lawnHoldTight', 'lawnRise'];
const tick = (world, count = 1) => {
  for (let i = 0; i < count; i++) updateCouple(world, 0.1, () => 0.75);
};

test('情侣随机走到空旷草坪，依次坐下、坐腿上、收拢双臂，最后起身散步', () => {
  const world = { couple: createCouple(outside.map) };
  const pair = world.couple;
  pair.phase = 'pause'; pair.timer = 0;
  tick(world);
  assert.equal(pair.phase, 'seekLawn');
  assert.ok(pair.route.length > 0);
  const phases = [];
  let seatedPosition;
  for (let i = 0; i < 2400; i++) {
    tick(world);
    const [girl, boy] = pair.members;
    for (const member of pair.members) {
      const tile = outside.map[Math.floor((member.y + 15) / 16)]?.[Math.floor((member.x + 8) / 16)];
      assert.ok(tile && !tiles[tile].solid, '去草坪途中不应穿过障碍');
    }
    if (lawnPhases.includes(pair.phase)) {
      if (phases.at(-1) !== pair.phase) phases.push(pair.phase);
      assert.equal(girl.action, pair.phase);
      assert.equal(boy.action, pair.phase);
      assert.equal(girl.moving, false);
      assert.equal(boy.moving, false);
      const position = pair.members.map(({ x, y }) => ({ x, y }));
      if (!seatedPosition) {
        seatedPosition = position;
        const col = Math.round(girl.x / 16), row = Math.round(girl.y / 16);
        for (let r = row - 1; r <= row; r++) for (let c = col - 1; c <= col + 3; c++)
          assert.equal(outside.map[r]?.[c], 'g', '坐姿周围应有足够草坪空间');
      }
      assert.deepEqual(position, seatedPosition, '坐着时两人不应继续漂移');
    }
    if (phases.length && pair.phase === 'wander') {
      assert.deepEqual(phases, lawnPhases);
      assert.equal(boy.x - girl.x, 32);
      assert.equal(girl.action, null);
      assert.equal(boy.action, null);
      const before = girl.x + girl.y;
      tick(world, 5);
      assert.notEqual(girl.x + girl.y, before, '起身后应恢复散步');
      return;
    }
  }
  assert.fail(`草坪动作没有正常结束：${phases.join(',')} / ${pair.phase}`);
});

test('地图没有草坪时继续散步，不坐在石板路上或卡住', () => {
  const map = outside.map.map(row => row.replaceAll('g', 'p'));
  const world = { couple: createCouple(map) };
  world.couple.phase = 'pause'; world.couple.timer = 0;
  tick(world);
  assert.equal(world.couple.phase, 'wander');
  const positions = new Set();
  for (let i = 0; i < 600; i++) {
    tick(world);
    assert.ok(!lawnPhases.includes(world.couple.phase));
    positions.add(Math.round(world.couple.members[0].x));
  }
  assert.ok(positions.size > 10);
});

test('普通随机散步可以自然触发草坪坐姿', () => {
  const world = { couple: createCouple(outside.map) };
  for (let i = 0; i < 2400; i++) {
    tick(world);
    if (world.couple.phase === 'lawnSit') return;
  }
  assert.fail('随机停留没有触发草坪行为');
});
