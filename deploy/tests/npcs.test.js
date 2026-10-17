'use strict';
import test from 'node:test';
import assert from 'node:assert';
import * as NPCs from '../../src/npc/index.js';
import atrium from '../../src/data/maps/atrium.js';
import reading from '../../src/data/maps/reading.js';
import outside from '../../src/data/maps/outside.js';
import tiles from '../../src/data/maps/tiles.js';

const maps = { atrium, reading, outside };

test('阅览室四名学生、中庭两名学生都坐在可走座位上', () => {
  const world = NPCs.create(maps, () => 0.1);
  assert.equal(world.study.filter(n => n.scene === 'reading' && n.kind === 'study').length, 4);
  assert.equal(world.study.filter(n => n.scene === 'atrium').length, 2);
  for (const npc of world.study.filter(n => n.kind === 'study')) {
    const ch = maps[npc.scene].map[npc.row][npc.col];
    assert.equal(ch, npc.scene === 'reading' ? 'c' : 'z');
    assert.equal(tiles[ch].solid, false);
  }
});

test('小蠹鱼固定在阅览室可走座位，电脑放在邻桌', () => {
  const world = NPCs.create(maps, () => 0.1);
  const duyu = world.duyu;
  assert.equal(duyu.name, '小蠹鱼');
  assert.equal(duyu.scene, 'reading');
  assert.equal(reading.map[duyu.row][duyu.col], 'c');
  assert.equal(reading.map[duyu.laptop.y / 16][duyu.laptop.x / 16], 'T');
  assert.ok(NPCs.visible(world, 'reading').includes(duyu));
  assert.equal(duyu.facing, 'right');
  assert.equal(duyu.phase, 'typing');
  for (const point of duyu.walkRoute) {
    const ch = reading.map[point.y / 16][point.x / 16];
    assert.equal(tiles[ch].solid, false);
  }
});

test('小蠹鱼敲电脑一段时间后会沿可走路线散步，再回座位', () => {
  const world = NPCs.create(maps, () => 0);
  const duyu = world.duyu;
  const home = { x: duyu.x, y: duyu.y };
  let walked = false;
  for (let i = 0; i < 500; i++) {
    NPCs.update(world, 0.1, [], () => 0.9);
    if (duyu.phase === 'walking') walked = true;
    if (walked && duyu.phase === 'typing') break;
  }
  assert.equal(walked, true);
  assert.equal(duyu.phase, 'typing');
  assert.equal(duyu.x, home.x);
  assert.equal(duyu.y, home.y);
  assert.equal(duyu.facing, 'right');
});

test('小蠹鱼的对话只在靠近时触发，走远后可以重新触发', () => {
  const world = NPCs.create(maps, () => 0.1);
  const near = { x: world.duyu.x, y: world.duyu.y };
  const far = { x: near.x + 100, y: near.y };
  NPCs.updateDuyuDialogue(world, near, 'reading', 0.1);
  assert.ok(world.duyu.dialogueTimer > 3);
  NPCs.updateDuyuDialogue(world, near, 'reading', 4);
  assert.equal(world.duyu.dialogueTimer, 0);
  NPCs.updateDuyuDialogue(world, near, 'reading', 0.1);
  assert.equal(world.duyu.dialogueTimer, 0);
  NPCs.updateDuyuDialogue(world, far, 'reading', 0.1);
  NPCs.updateDuyuDialogue(world, near, 'reading', 0.1);
  assert.ok(world.duyu.dialogueTimer > 3);
});

test('进出馆学生跨越前门，在中庭和前庭之间切换场景', () => {
  const world = NPCs.create(maps, () => 0.1);
  const inbound = world.commuters[0];
  const outbound = world.commuters[1];
  assert.equal(inbound.scene, 'outside');
  assert.equal(outbound.scene, 'atrium');
  for (let i = 0; i < 400; i++) NPCs.update(world, 0.1, [], () => 0.9);
  assert.equal(inbound.scene, 'atrium');
  assert.equal(outbound.scene, 'outside');
});

test('情侣在前庭必定出现且始终只有一对', () => {
  for (const chance of [0, 0.5, 0.99]) {
    const world = NPCs.create(maps, () => chance);
    assert.ok(world.couple);
    assert.equal(world.couple.members.length, 2);
    assert.equal(NPCs.visible(world, 'outside').filter(n => n.kind === 'couple').length, 2);
    for (let i = 0; i < 500; i++) NPCs.update(world, 0.1, [], () => chance);
    assert.ok(world.couple);
    assert.equal(NPCs.visible(world, 'outside').filter(n => n.kind === 'couple').length, 2);
  }
});

test('情侣在前庭随机散步，两人脚下始终是可走地块', () => {
  const world = NPCs.create(maps, () => 0.9);
  const visited = new Set();
  for (let i = 0; i < 1000; i++) {
    NPCs.update(world, 0.1, [], () => 0.9);
    const [girl, boy] = world.couple.members;
    visited.add(`${Math.round(girl.x)},${Math.round(girl.y)}`);
    for (const member of [girl, boy]) {
      const col = Math.floor((member.x + 8) / 16);
      const row = Math.floor((member.y + 15) / 16);
      const tile = outside.map[row]?.[col];
      assert.ok(tile && !tiles[tile].solid, `${member.id} 走进障碍 ${col},${row}`);
    }
  }
  assert.ok(visited.size > 20, `散步位置太少：${visited.size}`);
});

test('不同随机值会选择不同的散步目的地', () => {
  const left = NPCs.create(maps, () => 0.1);
  const right = NPCs.create(maps, () => 0.9);
  NPCs.update(left, 0.1, [], () => 0.1);
  NPCs.update(right, 0.1, [], () => 0.9);
  assert.notDeepEqual(left.couple.route.at(-1), right.couple.route.at(-1));
});

test('室外学生接近猫时按概率提出一次投喂，冷却阻止连续投喂', () => {
  const world = NPCs.create(maps, () => 0.1);
  const npc = world.commuters[0];
  npc.x = 19 * 16; npc.y = 12 * 16;
  npc.feedCooldown = 0;
  const cat = { x: npc.x, y: npc.y, state: 'wander', id: 'xueqiu' };
  const first = NPCs.update(world, 0.05, [cat], () => 0.1);
  assert.equal(first.filter(e => e.type === 'feed').length, 1);
  const second = NPCs.update(world, 0.05, [cat], () => 0.1);
  assert.equal(second.filter(e => e.type === 'feed').length, 0);
});

test('情侣靠近猫时仍可投喂', () => {
  const world = NPCs.create(maps, () => 0.1);
  const member = world.couple.members[0];
  member.feedCooldown = 0;
  const cat = { x: member.x, y: member.y, state: 'nap', id: 'xueqiu' };
  const events = NPCs.update(world, 0.05, [cat], () => 0.1);
  assert.equal(events.filter(e => e.type === 'feed').length, 1);
  assert.equal(events.find(e => e.type === 'feed').npcId, member.id);
});

test('女生停下后男生主动靠近，并能连续拥抱、接吻、深吻、松手再靠近', () => {
  const world = NPCs.create(maps, () => 0.1);
  let sawApproach = false, sawHug = false, sawKiss = false;
  let sawDeepKiss = false, sawRelease = false, sawSecondApproach = false;
  let firstApproachX = null;
  for (let i = 0; i < 3000; i++) {
    const pair = world.couple;
    const [girl, boy] = pair.members;
    const before = { girlX: girl.x, girlY: girl.y, boyX: boy.x };
    const events = NPCs.update(world, 0.1, [], () => 0.1);
    if (pair.phase === 'approach') {
      if (sawRelease) sawSecondApproach = true;
      else sawApproach = true;
      if (firstApproachX === null) firstApproachX = before.boyX;
      if (before.girlX === girl.x && before.girlY === girl.y)
        assert.ok(boy.x <= firstApproachX, '男生应主动向女生靠近');
    }
    if (pair.phase === 'hug') {
      sawHug = true;
      assert.equal(girl.action, 'hug');
      assert.equal(boy.action, 'hug');
      assert.ok(pair.timer >= 0);
      assert.ok(events.every(e => e.type !== 'cuddle-heart' || e.y < girl.y - 25));
    }
    if (pair.phase === 'kiss') sawKiss = true;
    if (pair.phase === 'deepKiss') sawDeepKiss = true;
    if (pair.phase === 'release') sawRelease = true;
    if (sawSecondApproach) break;
  }
  assert.ok(sawApproach && sawHug && sawKiss && sawDeepKiss && sawRelease && sawSecondApproach);
  assert.ok(world.couple);
});

test('拥抱可以持续较长时间，女生在亲昵阶段保持原地', () => {
  const world = NPCs.create(maps, () => 0);
  for (let i = 0; i < 2000 && world.couple.phase !== 'hug'; i++) NPCs.update(world, 0.1, [], () => 0);
  assert.equal(world.couple.phase, 'hug');
  const girl = world.couple.members[0];
  const start = { x: girl.x, y: girl.y };
  for (let i = 0; i < 150; i++) NPCs.update(world, 0.1, [], () => 0);
  assert.equal(world.couple.phase, 'hug');
  assert.deepEqual({ x: girl.x, y: girl.y }, start);
});

test('接吻也可能持续较长时间，然后才转入下一动作', () => {
  const world = NPCs.create(maps, () => 0.1);
  for (let i = 0; i < 3000 && world.couple.phase !== 'kiss'; i++) NPCs.update(world, 0.1, [], () => 0.1);
  assert.equal(world.couple.phase, 'kiss');
  for (let i = 0; i < 150; i++) NPCs.update(world, 0.1, [], () => 0.1);
  assert.equal(world.couple.phase, 'kiss');
});
