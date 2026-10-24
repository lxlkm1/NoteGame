'use strict';
import test from 'node:test';
import assert from 'node:assert';
import { tileKey } from '../../src/tile-key.js';
import tiles from '../../src/data/maps/tiles.js';

test('key 确定性：同参数同 key', () => {
  assert.equal(tileKey('.', 3, 4, tiles, {}), tileKey('.', 3, 4, tiles, {}));
});

test('key 以 66 为周期重复（标定地图 66×66 因此穷尽全部组合）', () => {
  for (const ch of ['.', 'g', 'B', '#', 'q']) {
    assert.equal(tileKey(ch, 5, 7, tiles, {}), tileKey(ch, 5 + 66, 7, tiles, {}), `${ch} 列周期`);
    assert.equal(tileKey(ch, 5, 7, tiles, {}), tileKey(ch, 5, 7 + 66, tiles, {}), `${ch} 行周期`);
  }
});

test('位置参数变化会改变 key（同字符不同位置的画面可能不同）', () => {
  const base = tileKey('.', 0, 0, tiles, {});
  assert.notEqual(tileKey('.', 1, 0, tiles, {}), base, 'parity 变化');
  assert.notEqual(tileKey('.', 6, 0, tiles, {}), base, '仅 seed 变化（列+6 保持 parity/book 不变）');
});

test('door 的 m 与 D 画法不同，key 必须区分', () => {
  assert.notEqual(tileKey('m', 0, 0, tiles, {}), tileKey('D', 0, 0, tiles, {}));
});

test('facade 亮窗只在 row===2 且 col%6===3，key 必须区分', () => {
  assert.notEqual(tileKey('F', 3, 2, tiles, {}), tileKey('F', 3, 3, tiles, {}));
  assert.notEqual(tileKey('F', 3, 2, tiles, {}), tileKey('F', 4, 2, tiles, {}));
});

test('chessSeat 的字进入 key', () => {
  const a = tileKey('z', 0, 0, tiles, { chessSeats: { '0,0': '車' } });
  const b = tileKey('z', 0, 0, tiles, { chessSeats: { '0,0': '馬' } });
  const c = tileKey('z', 0, 0, tiles, {});
  assert.notEqual(a, b);
  assert.notEqual(a, c);
});

test('未知字符按地板处理（与 drawTile 防呆一致）', () => {
  assert.ok(tileKey('~', 0, 0, tiles, {}).startsWith('floor|'));
});
