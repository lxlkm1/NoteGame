import test from 'node:test';
import assert from 'node:assert/strict';
import { ZDW_FRAMES, ZDW_PALETTE, ZDW_MIMI_FRAME, ZDW_MIMI_PALETTE } from '../../src/data/zdw-sprites.js';
import { zdwPlacement, zdwCapturePose, selectZdwFrame } from '../../src/npc/zdw-render.js';

test('zdw 全方向帧与倒提咪咪帧均有完整的像素尺寸和调色板', () => {
  for (const [name, frame] of Object.entries(ZDW_FRAMES)) {
    assert.equal(frame.length, 40, `${name} 高度`);
    for (const row of frame) {
      assert.equal(row.length, 32, `${name} 宽度`);
      for (const key of row) assert.ok(key === '.' || ZDW_PALETTE[key], `${name}: ${key}`);
    }
  }
  assert.equal(ZDW_MIMI_FRAME.length, 24);
  for (const row of ZDW_MIMI_FRAME) {
    assert.equal(row.length, 16);
    for (const key of row) assert.ok(key === '.' || ZDW_MIMI_PALETTE[key]);
  }
});

test('zdw 正面背面都保留明显的头顶肤色和两侧深发', () => {
  for (const name of ['down1', 'up1']) {
    const frame = ZDW_FRAMES[name];
    assert.ok(frame[3].slice(14, 20).split('').every(key => 'SL'.includes(key)), `${name} 秃顶`);
    assert.equal(frame[6][10], name === 'down1' ? 'h' : 'H');
    assert.equal(frame[6][22], 'H');
  }
});

test('zdw 普通行走、读书和抓取使用对应独立帧，脚底与游戏地面一致', () => {
  assert.deepEqual(selectZdwFrame({ facing: 'left', moving: true, animTimer: 0.2 }), { name: 'side2', flip: true });
  assert.deepEqual(selectZdwFrame({ facing: 'up', moving: false }), { name: 'up1', flip: false });
  assert.equal(selectZdwFrame({ phase: 'study' }).name, 'study');
  for (const phase of ['grab', 'hold', 'release']) assert.equal(selectZdwFrame({ phase }).name, 'reach');
  const placement = zdwPlacement({ x: 100, y: 200 });
  assert.equal(placement.x + 16, 108);
  assert.equal(placement.y + 40, 216);
});

test('举起和放下连续衔接持猫姿势，放下地面坐标参与手部定位', () => {
  const npc = { x: 100, y: 200, facing: 'right', phaseDuration: 0.55, capturePoint: { x: 116, y: 200 }, releasePoint: { x: 116, y: 216 } };
  const lifted = zdwCapturePose({ ...npc, phase: 'grab', phaseTimer: 0 });
  const held = zdwCapturePose({ ...npc, phase: 'hold', phaseTimer: 1 });
  const lowerStart = zdwCapturePose({ ...npc, phase: 'release', phaseTimer: 0.55 });
  assert.deepEqual(lifted, held);
  assert.deepEqual(lowerStart, held);
  const ground = zdwCapturePose({ ...npc, phase: 'release', phaseTimer: 0 });
  const placement = zdwPlacement(npc);
  assert.equal(ground.hand.y + placement.y, npc.releasePoint.y + 12);
  assert.equal(ground.angle, -Math.PI / 2);
  const mirror = zdwCapturePose({ ...npc, facing: 'left', phase: 'release', phaseTimer: 0 });
  assert.equal(placement.x + 32 - mirror.hand.x, npc.releasePoint.x + 14);
});
