'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { CAT_DEFS, createCats, updateCat, feed } = require('../js/cats.js');

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

test('好感度上限 5，超出不再增加', () => {
  const cat = createCats()[0];
  cat.hearts = 5;
  feed(cat, cat.x, cat.y);
  for (let i = 0; i < 200; i++) updateCat(cat, 0.016);
  assert.equal(cat.hearts, 5);
});
