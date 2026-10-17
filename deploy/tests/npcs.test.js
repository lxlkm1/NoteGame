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

test('小情侣定时随机出现，最多一对，且会一起离开', () => {
  const world = NPCs.create(maps, () => 0.1);
  for (let i = 0; i < 25; i++) NPCs.update(world, 1, [], () => 0.1);
  assert.ok(world.couple);
  assert.equal(world.couple.members.length, 2);
  assert.equal(NPCs.visible(world, 'outside').filter(n => n.kind === 'couple').length, 2);
  for (let i = 0; i < 100; i++) NPCs.update(world, 1, [], () => 0.1);
  assert.ok(NPCs.visible(world, 'outside').filter(n => n.kind === 'couple').length <= 2);
  const empty = NPCs.create(maps, () => 0.9);
  for (let i = 0; i < 25; i++) NPCs.update(empty, 1, [], () => 0.9);
  assert.equal(empty.couple, null);
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

test('小情侣靠近猫时也可能投喂', () => {
  const world = NPCs.create(maps, () => 0.1);
  NPCs.update(world, 18, [], () => 0.1);
  const member = world.couple.members[0];
  member.feedCooldown = 0;
  const cat = { x: member.x, y: member.y, state: 'nap', id: 'xueqiu' };
  const events = NPCs.update(world, 0.05, [cat], () => 0.1);
  assert.equal(events.length, 1);
  assert.equal(events[0].npcId, member.id);
  assert.equal(events[0].cat, cat);
});

test('小情侣散步到顶部后停下拥抱：面对面、间距 10px、冒爱心、然后离开', () => {
  const world = NPCs.create(maps, () => 0.1); // rng 0.1：出现情侣，动作选 hug
  for (let i = 0; i < 25 && !world.couple; i++) NPCs.update(world, 1, [], () => 0.1);
  assert.ok(world.couple);
  for (let i = 0; i < 30 && world.couple.phase !== 'cuddle'; i++) NPCs.update(world, 1, [], () => 0.1);
  assert.equal(world.couple.phase, 'cuddle');
  assert.equal(world.couple.action, 'hug');
  const [a, b] = world.couple.members;
  assert.equal(a.facing, 'right');
  assert.equal(b.facing, 'left');
  assert.equal(b.x - a.x, 10);
  const events = NPCs.update(world, 1, [], () => 0.1); // cuddle 第一帧即冒爱心
  assert.ok(events.some(e => e.type === 'cuddle-heart'));
  for (let i = 0; i < 40 && world.couple; i++) NPCs.update(world, 1, [], () => 0.1);
  assert.equal(world.couple, null);
});

test('小情侣接吻比拥抱站得更近、爱心更密', () => {
  const world = NPCs.create(maps, () => 0.1);
  for (let i = 0; i < 25 && !world.couple; i++) NPCs.update(world, 1, [], () => 0.1);
  for (let i = 0; i < 30 && world.couple.phase !== 'cuddle'; i++) NPCs.update(world, 1, [], () => 0.9); // rng 0.9：动作选 kiss
  assert.equal(world.couple.action, 'kiss');
  assert.equal(world.couple.members[1].x - world.couple.members[0].x, 6);
  // 同样的步进节奏下，kiss 的爱心事件多于 hug（间隔 0.4s vs 0.8s）
  let kissHearts = 0;
  for (let i = 0; i < 4; i++) {
    kissHearts += NPCs.update(world, 0.5, [], () => 0.9).filter(e => e.type === 'cuddle-heart').length;
  }
  assert.ok(kissHearts >= 4, `kiss 爱心密度不足：${kissHearts}`);
});
