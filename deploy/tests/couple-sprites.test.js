import test from 'node:test';
import assert from 'node:assert/strict';
import { COUPLE_FRAMES, COUPLE_PALETTES } from '../../src/data/couple-sprites.js';
import { selectCoupleFrame, couplePlacement } from '../../src/npc/couple-render.js';

const names = ['down1', 'down2', 'up1', 'up2', 'side1', 'side2', 'hug', 'kiss', 'deepKiss'];

test('女生 40×48、男生 40×42，所有动作帧尺寸一致', () => {
  for (const person of ['girl', 'boy']) {
    const height = person === 'girl' ? 48 : 42;
    for (const name of person === 'boy' ? [...names, 'approach', 'release'] : names) {
      const frame = COUPLE_FRAMES[person][name];
      assert.equal(frame.length, height, `${person}/${name} 行数`);
      for (const row of frame) {
        assert.equal(row.length, 40, `${person}/${name} 列数`);
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

test('女生白裙占主要面积并保留刘海，男生有黄发与非主流配饰', () => {
  const girl = COUPLE_FRAMES.girl.down1.join('');
  const boy = COUPLE_FRAMES.boy.down1.join('');
  assert.ok(girl.includes('F'), '女生刘海');
  assert.ok((girl.match(/[Ww]/g) || []).length > 100, '女生白裙面积');
  assert.ok(boy.includes('Y'), '男生黄发');
  assert.ok(boy.includes('V') && boy.includes('L'), '男生非主流配饰');
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

test('靠近、拥抱、接吻、深吻和松手显示各自姿态', () => {
  for (const action of ['hug', 'kiss', 'deepKiss']) {
    assert.equal(selectCoupleFrame({ id: 'couple-a', action, facing: 'right', moving: false }).name, action);
    assert.equal(selectCoupleFrame({ id: 'couple-b', action, facing: 'left', moving: false }).name, action);
  }
  for (const action of ['approach', 'release'])
    assert.equal(selectCoupleFrame({ id: 'couple-b', action, facing: 'left', moving: false }).name, action);
});
