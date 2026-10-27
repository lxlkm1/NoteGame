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

test('位置参数只影响使用该参数的风格（去噪后 seed 不再属于任何风格）', () => {
  const base = tileKey('.', 0, 0, tiles, {});
  assert.notEqual(tileKey('.', 1, 0, tiles, {}), base, 'floor parity 变化');
  assert.notEqual(tileKey('B', 1, 0, tiles, {}), tileKey('B', 0, 0, tiles, {}), 'bookshelf book 变化');
  assert.equal(tileKey('g', 6, 0, tiles, {}), tileKey('g', 0, 0, tiles, {}), 'grass seed 已移除（列+6 不再改变 key）');
});

test('door 的 m 与 D 画法不同，key 必须区分', () => {
  assert.notEqual(tileKey('m', 0, 0, tiles, {}), tileKey('D', 0, 0, tiles, {}));
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

test('chessSeat 画面只由棋字决定：parity/seed/book 归 0，同字任意位置同 key', () => {
  const sceneData = { chessSeats: { '0,0': '車', '5,8': '車', '3,2': '馬' } };
  assert.equal(tileKey('z', 0, 0, tiles, sceneData), 'chessSeat|z|0|0|0|0|車');
  assert.equal(tileKey('z', 5, 8, tiles, sceneData), 'chessSeat|z|0|0|0|0|車', '同字不同位置（parity=1,seed=3,book=1 全变）仍同 key');
  assert.notEqual(tileKey('z', 3, 2, tiles, sceneData), tileKey('z', 0, 0, tiles, sceneData), '不同字不同 key');
});

test('墙/外墙/门等画面固定：任意位置同 key', () => {
  assert.equal(tileKey('#', 0, 0, tiles, {}), tileKey('#', 7, 9, tiles, {}));
  assert.equal(tileKey('F', 3, 2, tiles, {}), tileKey('F', 4, 5, tiles, {}), 'facade 亮窗位置不再进 key（窗户是覆盖层）');
  assert.equal(tileKey('m', 0, 0, tiles, {}), tileKey('m', 11, 13, tiles, {}));
  assert.notEqual(tileKey('m', 0, 0, tiles, {}), tileKey('D', 0, 0, tiles, {}), 'm 与 D 画法不同仍需区分');
});

test('草地家族/石板路/桌椅底色固定：parity 不再进 key（floor/chessFloor 保留）', () => {
  for (const ch of ['g', 't', 's', 'l', 'b', 'p', 'T', 'c']) {
    assert.equal(tileKey(ch, 0, 0, tiles, {}), tileKey(ch, 1, 0, tiles, {}), `${ch} parity 已移除`);
  }
  assert.notEqual(tileKey('.', 0, 0, tiles, {}), tileKey('.', 1, 0, tiles, {}), 'floor parity 保留');
  assert.notEqual(tileKey('q', 0, 0, tiles, {}), tileKey('q', 1, 0, tiles, {}), 'chessFloor parity 保留');
  assert.notEqual(tileKey('B', 0, 0, tiles, {}), tileKey('B', 1, 0, tiles, {}), 'bookshelf book 保留');
});
