'use strict';
// 配置体检：用户改错 maps/ 配置时测试立刻报警，不用开浏览器
import test from 'node:test';
import assert from 'node:assert';
import tiles from '../../src/data/maps/tiles.js';
import atrium from '../../src/data/maps/atrium.js';
import reading from '../../src/data/maps/reading.js';
import toilet from '../../src/data/maps/toilet.js';
import outside from '../../src/data/maps/outside.js';

const SCENES = { atrium, reading, toilet, outside };

test('中庭南门通室外，室外入口通中庭且落点可走', () => {
  assert.equal(tiles[atrium.map[29][19]].portal, 'outside');
  assert.equal(tiles[outside.map[4][19]].portal, 'atrium');
  assert.equal(outside.map.length, 30);
  assert.equal(outside.map[0].length, 39);
  assert.equal(outside.entry.col, 19);
  assert.equal(outside.entry.row, 6);
  assert.equal(tiles[outside.map[outside.entry.row][outside.entry.col]].solid, false);
});

test('配置体检 1：每个场景 map 行宽一致', () => {
  for (const [name, scene] of Object.entries(SCENES)) {
    const cols = scene.map[0].length;
    for (let r = 0; r < scene.map.length; r++) {
      assert.equal(scene.map[r].length, cols, `${name} 第 ${r} 行宽度 ${scene.map[r].length} ≠ ${cols}`);
    }
  }
});

test('配置体检 2：地图里每个符号都在 tiles 有定义', () => {
  for (const [name, scene] of Object.entries(SCENES)) {
    for (let r = 0; r < scene.map.length; r++) {
      for (let c = 0; c < scene.map[r].length; c++) {
        const ch = scene.map[r][c];
        assert.ok(tiles[ch], `${name} (${c},${r}) 符号 ${JSON.stringify(ch)} 未在 tiles 定义`);
      }
    }
  }
});

test('配置体检 3：tiles 里每个 portal 目的地都是已知场景名', () => {
  for (const [ch, t] of Object.entries(tiles)) {
    if (t.portal) {
      assert.ok(SCENES[t.portal], `符号 ${JSON.stringify(ch)} 的 portal 指向未知场景 ${JSON.stringify(t.portal)}`);
    }
  }
});

test('配置体检 4：每张地图里出现的 portal 符号目的地均为已知场景', () => {
  for (const [name, scene] of Object.entries(SCENES)) {
    for (let r = 0; r < scene.map.length; r++) {
      for (let c = 0; c < scene.map[r].length; c++) {
        const t = tiles[scene.map[r][c]];
        if (t && t.portal) {
          assert.ok(SCENES[t.portal], `${name} (${c},${r}) 的 ${scene.map[r][c]} 门指向未知场景 ${JSON.stringify(t.portal)}`);
        }
      }
    }
  }
});

test('配置体检 5：spawn/entry 落在非 solid 格', () => {
  for (const [name, scene] of Object.entries(SCENES)) {
    const pt = scene.spawn || scene.entry;
    assert.ok(pt, `${name} 缺少 spawn/entry`);
    const ch = scene.map[pt.row][pt.col];
    assert.ok(tiles[ch] && !tiles[ch].solid,
      `${name} 落点 (${pt.col},${pt.row}) 符号 ${JSON.stringify(ch)} 是 solid`);
  }
});

test('配置体检 6：chessSeats 的 key 都是 z 格，数量与地图 z 字符数一致（32）', () => {
  let zCount = 0;
  for (const row of atrium.map) for (const ch of row) if (ch === 'z') zCount++;
  const keys = Object.keys(atrium.chessSeats);
  for (const key of keys) {
    const [c, r] = key.split(',').map(Number);
    assert.equal(atrium.map[r] && atrium.map[r][c], 'z', `chessSeats key ${key} 不是 z 格`);
  }
  assert.equal(keys.length, zCount, `chessSeats ${keys.length} 个 ≠ 地图 z 字符 ${zCount} 个`);
  assert.equal(zCount, 32);
});
