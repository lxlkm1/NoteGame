'use strict';
const test = require('node:test');
const assert = require('node:assert');
const Mimi = require('../js/mimi.js');
const outside = require('../maps/outside.js');
const tiles = require('../maps/tiles.js');

const site = outside.mimiSites.left;
const player = (col, row, dir = 'left') => ({ x: col * 16, y: row * 16, dir });

test('咪咪每次进室外有 40% 出现概率，站点左右对称且可行走', () => {
  assert.equal(Mimi.shouldAppear(0.39), true);
  assert.equal(Mimi.shouldAppear(0.40), false);
  for (const side of ['left', 'right']) {
    const p = outside.mimiSites[side];
    for (const point of [p.spawn, p.hide]) {
      assert.equal(tiles[outside.map[point.row][point.col]].solid, false);
    }
  }
});

test('只能从 6–8 格外放一份食物，落点必须可走', () => {
  const mimi = Mimi.create(site);
  assert.equal(Mimi.offerFood(mimi, player(15, 18), outside.map, tiles), false);
  assert.equal(Mimi.offerFood(mimi, player(19, 18), outside.map, tiles), true);
  assert.deepEqual(mimi.food, { x: 18 * 16, y: 18 * 16 });
  assert.equal(Mimi.offerFood(mimi, player(19, 18), outside.map, tiles), false);
});

test('人靠近时咪咪逃到树丛边并藏起来，不穿过障碍', () => {
  const mimi = Mimi.create(site);
  const near = player(14, 18);
  for (let i = 0; i < 300; i++) {
    Mimi.update(mimi, 0.05, near, outside.map, tiles);
    const ch = outside.map[Math.floor((mimi.y + 8) / 16)][Math.floor((mimi.x + 8) / 16)];
    assert.equal(tiles[ch].solid, false);
    if (mimi.state === 'hidden') break;
  }
  assert.equal(mimi.state, 'hidden');
  assert.equal(mimi.x, site.hide.col * 16);
  assert.equal(mimi.y, site.hide.row * 16);
});

test('玩家退远后咪咪吃掉食物，好感增加且首次计入进度', () => {
  const mimi = Mimi.create(site);
  assert.equal(Mimi.offerFood(mimi, player(19, 18), outside.map, tiles), true);
  for (let i = 0; i < 80; i++) Mimi.update(mimi, 0.05, player(19, 18), outside.map, tiles);
  assert.equal(mimi.hearts, 0);
  for (let i = 0; i < 500 && mimi.hearts === 0; i++) Mimi.update(mimi, 0.05, player(25, 18), outside.map, tiles);
  assert.equal(mimi.hearts, 1);
  assert.equal(mimi.hasMet, true);
  assert.equal(mimi.food, null);
});

test('躲在树丛的咪咪也会在玩家退远后出来吃食物', () => {
  const mimi = Mimi.create(site);
  for (let i = 0; i < 300 && mimi.state !== 'hidden'; i++) {
    Mimi.update(mimi, 0.05, player(14, 18), outside.map, tiles);
  }
  assert.equal(mimi.state, 'hidden');
  assert.equal(Mimi.offerFood(mimi, player(19, 15, 'right'), outside.map, tiles), true);
  for (let i = 0; i < 600 && !mimi.hasMet; i++) {
    Mimi.update(mimi, 0.05, player(25, 17), outside.map, tiles);
  }
  assert.equal(mimi.hasMet, true);
});
