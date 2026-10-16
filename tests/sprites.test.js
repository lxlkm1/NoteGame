'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { PLAYER_FRAMES } = require('../js/sprites.js');

test('人物帧齐全且每帧 16 行 × 每行 16 字符', () => {
  for (const name of ['down1', 'down2', 'up1', 'up2', 'side1', 'side2']) {
    const f = PLAYER_FRAMES[name];
    assert.ok(f, `缺少帧 ${name}`);
    assert.equal(f.length, 16, `${name} 行数`);
    for (const line of f) assert.equal(line.length, 16, `${name} 某行长度`);
  }
});

const { CAT_FRAMES } = require('../js/sprites.js');

test('猫帧齐全且每帧 16x16', () => {
  for (const name of ['idle1', 'idle2', 'walk1', 'walk2', 'eat', 'sleep']) {
    const f = CAT_FRAMES[name];
    assert.ok(f, `缺少猫帧 ${name}`);
    assert.equal(f.length, 16, `${name} 行数`);
    for (const line of f) assert.equal(line.length, 16, `${name} 某行长度`);
  }
});

const { MIMI_FRAMES } = require('../js/sprites.js');

test('咪咪有独立的 16x16 帧及照片中的金眼、白口鼻和黑斑', () => {
  for (const name of ['idle1', 'idle2', 'walk1', 'walk2', 'eat', 'sleep']) {
    const frame = MIMI_FRAMES[name];
    assert.equal(frame.length, 16, `${name} 行数`);
    for (const line of frame) assert.equal(line.length, 16, `${name} 某行长度`);
    assert.notDeepEqual(frame, CAT_FRAMES[name]);
  }
  assert.ok(MIMI_FRAMES.idle1.join('').includes('G'));
  assert.ok(MIMI_FRAMES.idle1.join('').includes('WWWW'));
  assert.ok(MIMI_FRAMES.idle1.join('').includes('EBB'));
});

test('小蠹鱼的独立像素形象包含奶牛外套斑块和眼罩', () => {
  const { DUYU_FRAME, DUYU_PALETTE } = require('../js/sprites.js');
  assert.equal(DUYU_FRAME.length, 16);
  for (const row of DUYU_FRAME) assert.equal(row.length, 16);
  assert.ok(DUYU_FRAME.join('').includes('P'));
  assert.ok(DUYU_FRAME.join('').includes('M'));
  assert.ok(DUYU_PALETTE.P && DUYU_PALETTE.M);
});
