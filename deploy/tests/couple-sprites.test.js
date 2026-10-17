import test from 'node:test';
import assert from 'node:assert/strict';
import { COUPLE_FRAMES, COUPLE_PALETTES } from '../../src/data/couple-sprites.js';
import { selectCoupleFrame, couplePlacement } from '../../src/npc/couple-render.js';

const names = ['down1', 'down2', 'up1', 'up2', 'side1', 'side2', 'hug', 'kiss'];

test('女生 32×36、男生 32×32，所有动作帧尺寸一致', () => {
  for (const person of ['girl', 'boy']) {
    const height = person === 'girl' ? 36 : 32;
    for (const name of names) {
      const frame = COUPLE_FRAMES[person][name];
      assert.equal(frame.length, height, `${person}/${name} 行数`);
      for (const row of frame) {
        assert.equal(row.length, 32, `${person}/${name} 列数`);
        for (const pixel of row) {
          assert.ok(pixel === '.' || COUPLE_PALETTES[person][pixel], `${person}/${name} 未定义颜色 ${pixel}`);
        }
      }
    }
  }
});

test('两人的脚落在同一地面，女生头顶高于男生', () => {
  const girl = couplePlacement({ id: 'couple-a', x: 100, y: 200 });
  const boy = couplePlacement({ id: 'couple-b', x: 100, y: 200 });
  assert.equal(girl.x + girl.width / 2, 108);
  assert.equal(boy.x + boy.width / 2, 108);
  assert.equal(girl.y + girl.height, 216);
  assert.equal(boy.y + boy.height, 216);
  assert.ok(girl.y < boy.y);
});

test('正面帧保留刘海、裙子和黄发特征', () => {
  const girl = COUPLE_FRAMES.girl.down1.join('');
  const boy = COUPLE_FRAMES.boy.down1.join('');
  assert.ok(girl.includes('F'), '女生刘海');
  assert.ok(girl.includes('D'), '女生裙子');
  assert.ok(boy.includes('Y'), '男生黄发');
});

test('两人行走时选用各自的正面与侧面帧', () => {
  assert.deepEqual(selectCoupleFrame({ id: 'couple-a', facing: 'down', moving: false, animTimer: 0 }),
    { person: 'girl', name: 'down1', flip: false });
  assert.deepEqual(selectCoupleFrame({ id: 'couple-b', facing: 'up', moving: true, animTimer: 0.3 }),
    { person: 'boy', name: 'up2', flip: false });
  assert.deepEqual(selectCoupleFrame({ id: 'couple-a', facing: 'left', moving: true, animTimer: 0.3 }),
    { person: 'girl', name: 'side2', flip: true });
  assert.deepEqual(selectCoupleFrame({ id: 'couple-b', facing: 'right', moving: false, animTimer: 0 }),
    { person: 'boy', name: 'side1', flip: true });
});

test('拥抱与接吻显示不同专用姿态', () => {
  for (const action of ['hug', 'kiss']) {
    assert.equal(selectCoupleFrame({ id: 'couple-a', action, facing: 'right', moving: false }).name, action);
    assert.equal(selectCoupleFrame({ id: 'couple-b', action, facing: 'left', moving: false }).name, action);
  }
});
