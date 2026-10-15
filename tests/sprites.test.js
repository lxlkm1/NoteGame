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
