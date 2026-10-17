'use strict';
import test from 'node:test';
import assert from 'node:assert';
import { createCats, updateCat, feed } from '../../src/npc/cats.js';
import { CAT_DEFS } from '../../src/data/cats.js';
import outside from '../../src/data/maps/outside.js';
import tiles from '../../src/data/maps/tiles.js';
import { isSolidAtPx } from '../../src/map.js';

test('十只普通猫出生在前庭的可走位置', () => {
  const expected = [
    [19, 12], [19, 23], [7, 11], [31, 11], [3, 18],
    [35, 18], [13, 24], [25, 24], [7, 27], [31, 27],
  ];
  assert.deepEqual(CAT_DEFS.map(({ col, row }) => [col, row]), expected);
  for (const [col, row] of expected) {
    assert.equal(tiles[outside.map[row][col]].solid, false, `${col},${row} 不可走`);
  }
});

test('普通猫在室外活动时不会穿过树丛', () => {
  const cat = createCats()[0];
  cat.x = 13 * 16; cat.y = 16 * 16;
  cat.targetX = 10 * 16; cat.targetY = 15 * 16;
  cat.stateTimer = 100;
  cat.pauseTimer = 0;
  for (let i = 0; i < 200; i++) {
    updateCat(cat, 0.05, null, outside.map, tiles);
    assert.equal(isSolidAtPx(cat.x + 8, cat.y + 15, outside.map, tiles), false);
  }
});

test('普通猫被玩家带到树丛另一侧后能绕路回家', () => {
  const cat = createCats()[2]; // 汤圆，家在左上草地
  cat.x = 13 * 16; cat.y = 18 * 16;
  cat.state = 'return';
  for (let i = 0; i < 2000 && cat.state === 'return'; i++) {
    updateCat(cat, 0.05, null, outside.map, tiles);
    assert.equal(isSolidAtPx(cat.x + 8, cat.y + 15, outside.map, tiles), false);
  }
  assert.equal(cat.state, 'nap');
  assert.ok(Math.hypot(cat.x - cat.homeX, cat.y - cat.homeY) < 1);
});

test('恰好 10 只猫，每只字段齐全、调色板五色俱全', () => {
  assert.equal(CAT_DEFS.length, 10);
  const names = new Set();
  for (const d of CAT_DEFS) {
    assert.ok(d.id && d.name && d.persona, `${d.id} 文案缺失`);
    assert.equal(typeof d.col, 'number');
    assert.equal(typeof d.row, 'number');
    for (const k of ['A', 'B', 'C', 'E', 'W']) assert.ok(d.palette[k], `${d.name} 缺色 ${k}`);
    names.add(d.name);
  }
  assert.equal(names.size, 10, '猫名重复');
});

test('createCats 初始为 wander 且好感 0、坐标 = 格×16', () => {
  const cats = createCats();
  assert.equal(cats.length, 10);
  for (const c of cats) {
    assert.equal(c.state, 'wander');
    assert.equal(c.hearts, 0);
    assert.equal(c.x, c.homeX);
  }
});

test('wander 计时结束会切换到 nap，nap 结束回到 wander', () => {
  const cat = createCats()[0];
  cat.stateTimer = 0.01;
  updateCat(cat, 0.02); // 耗尽计时
  assert.equal(cat.state, 'nap');
  cat.stateTimer = 0.01;
  updateCat(cat, 0.02);
  assert.equal(cat.state, 'wander');
});

test('wander 走向目标点且不超出领地半径 + 8px 容差', () => {
  const cat = createCats()[0];
  const r = (cat.def.radius || 24) + 8;
  for (let i = 0; i < 600; i++) updateCat(cat, 0.016); // 模拟 10 秒
  assert.ok(Math.abs(cat.x - cat.homeX) <= r + 16, `x 越界: ${cat.x}`);
  assert.ok(Math.abs(cat.y - cat.homeY) <= r + 16, `y 越界: ${cat.y}`);
});

test('闲逛到达目标后站立停顿（wander 期间 pauseTimer > 0）', () => {
  const cat = createCats()[0];
  let observedPause = false;
  for (let i = 0; i < 1200; i++) { // 模拟约 19 秒
    updateCat(cat, 0.016);
    if (cat.state === 'wander' && cat.pauseTimer > 0) observedPause = true;
  }
  assert.ok(observedPause, 'wander 期间应出现站立停顿（pauseTimer > 0）');
});

test('feed 叫醒睡着的猫并走向食物；吃完好感 +1', () => {
  const cat = createCats()[0];
  cat.state = 'nap';
  feed(cat, cat.x + 20, cat.y);
  assert.equal(cat.state, 'gotoFood');
  // 200 帧 = 3.2s：走 20px(≈1.2s) + 吃 1.6s，且吃完后 2s 内不会切 nap
  for (let i = 0; i < 200; i++) updateCat(cat, 0.016);
  assert.equal(cat.state, 'wander');
  assert.equal(cat.hearts, 1);
});

test('学生投喂时猫会进食，但不增加玩家好感或触发跟随', () => {
  const cat = createCats()[0];
  assert.equal(feed(cat, cat.x, cat.y, 'npc'), true);
  for (let i = 0; i < 100; i++) updateCat(cat, 0.05);
  assert.equal(cat.hearts, 0);
  assert.equal(cat.hasMet, false);
  assert.notEqual(cat.state, 'follow');
});

test('好感度上限 5，超出不再增加', () => {
  const cat = createCats()[0];
  cat.hearts = 5;
  feed(cat, cat.x, cat.y);
  for (let i = 0; i < 200; i++) updateCat(cat, 0.016);
  assert.equal(cat.hearts, 5);
});

test('feed 对已在 gotoFood/eat 的猫返回 false 且状态与目标不变；新投喂返回 true 并进入 gotoFood', () => {
  const cat = createCats()[0];
  cat.state = 'gotoFood';
  cat.dishX = 100; cat.dishY = 100;
  assert.equal(feed(cat, 50, 60), false, 'gotoFood 中的猫应拒绝重复投喂');
  assert.equal(cat.state, 'gotoFood');
  assert.equal(cat.dishX, 100);
  assert.equal(cat.dishY, 100);

  const cat2 = createCats()[0];
  cat2.state = 'eat';
  assert.equal(feed(cat2, 50, 60), false, 'eat 中的猫应拒绝重复投喂');
  assert.equal(cat2.state, 'eat');

  const cat3 = createCats()[0];
  assert.equal(feed(cat3, 50, 60), true, '新投喂应被接受');
  assert.equal(cat3.state, 'gotoFood');
  assert.equal(cat3.dishX, 50);
  assert.equal(cat3.dishY, 60);
});

test('follow 状态：仍在接近玩家时 moving=true，到达 24px 停步距离后 moving=false', () => {
  const cat = createCats()[0];
  cat.state = 'follow';
  cat.followTimer = 10;
  const player = { x: cat.x + 40, y: cat.y };
  updateCat(cat, 0.016, player);
  assert.equal(cat.moving, true, '仍在接近玩家时应 moving=true');

  cat.x = player.x + 10; // 进入 24px 停步距离
  cat.y = player.y;
  updateCat(cat, 0.016, player);
  assert.equal(cat.moving, false, '到达停步距离后应 moving=false');
});

test('喂满 5 心后吃完进入 follow，计时结束 return，到家 nap', () => {
  const cat = createCats()[0];
  cat.hearts = 4;
  const player = { x: cat.x + 30, y: cat.y };
  feed(cat, cat.x + 5, cat.y);
  for (let i = 0; i < 300; i++) updateCat(cat, 0.016); // 4.8s：走完 + 吃完，follow 8s 未到
  assert.equal(cat.hearts, 5);
  assert.equal(cat.state, 'follow');
  cat.followTimer = 0.01;
  updateCat(cat, 0.02, player);
  assert.equal(cat.state, 'return');
  for (let i = 0; i < 100; i++) updateCat(cat, 0.016, player); // 1.6s：走回家（约 0.3s）后仍在打盹（nap 最短 5s）
  assert.equal(cat.state, 'nap');
});
