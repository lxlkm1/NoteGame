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

test('小蠹鱼用 32px 牛形象，坐姿朝电脑，走动帧保留眼罩与粉鼻', () => {
  const { DUYU_COW_FRAMES, DUYU_COW_PALETTE } = require('../js/sprites.js');
  for (const name of ['typing1', 'typing2', 'walk1', 'walk2']) {
    const frame = DUYU_COW_FRAMES[name];
    assert.equal(frame.length, 32);
    for (const row of frame) assert.equal(row.length, 32);
    assert.ok(frame.join('').includes('M'));
    assert.ok(frame.join('').includes('P'));
  }
  assert.notDeepEqual(DUYU_COW_FRAMES.typing1, DUYU_COW_FRAMES.typing2);
  assert.ok(DUYU_COW_PALETTE.M && DUYU_COW_PALETTE.P);
});
