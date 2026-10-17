import test from 'node:test';
import assert from 'node:assert/strict';
import { COUPLE_LAWN_FRAMES, COUPLE_LAWN_PALETTE } from '../../src/data/couple-lawn-sprites.js';
import { drawCouple } from '../../src/npc/couple-render.js';

const poses = ['lawnSit', 'lawnLap', 'lawnHold', 'lawnHoldTight', 'lawnRise'];

test('草坪动作帧完整且每种动作有独立姿态和合法配色', () => {
  const frames = new Set();
  for (const pose of poses) {
    const frame = COUPLE_LAWN_FRAMES[pose];
    assert.equal(frame.length, 56);
    for (const row of frame) {
      assert.equal(row.length, 64);
      for (const key of row) assert.ok(key === '.' || COUPLE_LAWN_PALETTE[key], `${pose} 未定义颜色 ${key}`);
    }
    frames.add(frame.join(''));
  }
  assert.equal(frames.size, poses.length);
});

test('坐姿组合只绘制一次，固定男生地面锚点且不镜像', () => {
  const originalDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {} }) }) };
  try {
    for (const action of poses) {
      const draws = [];
      const ctx = { drawImage: (...args) => draws.push(args) };
      const girl = { id: 'couple-a', x: 100, y: 200, action, facing: 'right' };
      const boy = { id: 'couple-b', x: 120, y: 200, action, facing: 'left' };
      drawCouple(ctx, girl);
      assert.equal(draws.length, 0, '女生不应再单独叠加站立帧');
      drawCouple(ctx, boy);
      assert.equal(draws.length, 1);
      assert.equal(draws[0][0].width, 64);
      assert.equal(draws[0][0].height, 56);
      assert.equal(draws[0][1] + 40, boy.x + 8);
      assert.equal(draws[0][2] + 56, boy.y + 16);
      assert.equal(ctx.imageSmoothingEnabled, false);
    }
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
