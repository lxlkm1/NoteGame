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

test('接吻时两人的嘴在同一位置', () => {
  for (const [pose, gap] of [['kiss', 19], ['deepKiss', 17]]) {
    const girl = couplePlacement({ id: 'couple-a', x: 100, y: 200 });
    const boy = couplePlacement({ id: 'couple-b', x: 100 + gap, y: 200 });
    const mouth = (person, placement) => {
      const frame = COUPLE_FRAMES[person][pose];
      const points = frame.flatMap((row, y) => [...row].flatMap((pixel, x) => pixel === 'M' ? [{ x: placement.x + x, y: placement.y + y }] : []));
      assert.ok(points.length, `${person}/${pose} 缺少嘴部`);
      assert.ok(points.some(({ x, y }) => {
        const localX = x - placement.x, localY = y - placement.y;
        return [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => frame[localY + dy]?.[localX + dx] === 'S');
      }), `${person}/${pose} 嘴部脱离脸部轮廓`);
      return points[0];
    };
    const a = mouth('girl', girl), b = mouth('boy', boy);
    assert.ok(Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1, `${pose} 嘴部未对齐: ${JSON.stringify({ a, b })}`);
  }
});

test('女生头部收窄，男生松手后手臂明显下垂', () => {
  const headWidth = Math.max(...COUPLE_FRAMES.girl.down1.slice(5, 22).map(row => [...row.slice(6, 34)].filter(pixel => 'LHSFhAsRE'.includes(pixel)).length));
  assert.ok(headWidth <= 18, `女生头部过宽: ${headWidth}`);
  const raised = COUPLE_FRAMES.boy.hug.slice(30, 35).flatMap(row => [...row.slice(0, 8)]).filter(pixel => pixel === 'S').length;
  const lowered = COUPLE_FRAMES.boy.release.slice(30, 35).flatMap(row => [...row.slice(0, 8)]).filter(pixel => pixel === 'S').length;
  assert.ok(raised >= lowered + 12, `拥抱与松手的手臂不够分明: ${raised}/${lowered}`);
});

test('小猫发饰在女生每个方向和亲昵姿态都可见', () => {
  for (const pose of names) {
    const head = COUPLE_FRAMES.girl[pose].slice(6, 17).join('');
    assert.ok((head.match(/K/g) || []).length >= 12, `${pose} 缺少小猫脸`);
    assert.ok(head.includes('k') && head.includes('N'), `${pose} 缺少猫鼻或眼睛`);
  }
});

test('男生接吻时踮脚，鞋跟离地而脚尖仍触地', () => {
  for (const pose of ['kiss', 'deepKiss']) {
    const frame = COUPLE_FRAMES.boy[pose];
    const firstHairRow = rows => rows.findIndex(row => row.includes('Y'));
    assert.ok(firstHairRow(frame) <= firstHairRow(COUPLE_FRAMES.boy.hug) - 2, `${pose} 身体没有随着踮脚升高`);
    const ground = frame[41];
    const heels = frame.slice(37, 40).join('');
    assert.ok((ground.match(/B/g) || []).length <= 8, `${pose} 鞋底仍然平放`);
    assert.ok((ground.match(/B/g) || []).length >= 2, `${pose} 脚尖没有落地`);
    assert.ok((heels.match(/B/g) || []).length >= 6, `${pose} 鞋跟没有抬起`);
  }
});

test('站立环抱的远臂被女生身体遮住，近臂绕腰且没有多余下垂手掌', () => {
  const girl = COUPLE_FRAMES.girl.hug, boy = COUPLE_FRAMES.boy.hug;
  const colorAt = (x, y) => COUPLE_PALETTES.boy[boy[y - 6]?.[x - 16]] || COUPLE_PALETTES.girl[girl[y]?.[x]];
  assert.equal(colorAt(20, 33), COUPLE_PALETTES.girl.W, '上半身不能再被第二条前景臂横穿');
  assert.equal(colorAt(20, 39), COUPLE_PALETTES.boy.S, '近侧手臂应环过腰前');
  for (let y = 26; y < 36; y++) for (let x = 14; x < 26; x++) {
    if ('WwC'.includes(COUPLE_FRAMES.girl.side1[y][x]))
      assert.equal(girl[y][x], COUPLE_FRAMES.girl.side1[y][x], '远臂必须位于女生衣服后面');
  }
  for (const pose of ['hug', 'kiss', 'deepKiss']) {
    const danglingHand = COUPLE_FRAMES.boy[pose].slice(26, 36).map(row => row.slice(31, 35)).join('');
    assert.ok(!danglingHand.includes('S'), `${pose} 不应保留第三只下垂的手`);
  }
  assert.equal(COUPLE_FRAMES.girl.hug[28].slice(31, 37).includes('S'), false, '女生应保持较安静的站姿');
});
