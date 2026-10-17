'use strict';
const test = require('node:test');
const assert = require('node:assert');
const Mimi = require('../../src/mimi.js');
const outside = require('../../src/maps/outside.js');
const tiles = require('../../src/maps/tiles.js');

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

test('空闲一段时间后咪咪会高速乱跑，并保持在可走位置', () => {
  const mimi = Mimi.create(site);
  mimi.frenzyTimer = 0.01;
  let sawFrenzy = false;
  for (let i = 0; i < 500; i++) {
    Mimi.update(mimi, 0.05, player(30, 18), outside.map, tiles, () => 0.4);
    sawFrenzy ||= mimi.state === 'frenzy';
    const ch = outside.map[Math.floor((mimi.y + 8) / 16)][Math.floor((mimi.x + 8) / 16)];
    assert.equal(tiles[ch].solid, false);
    if (sawFrenzy && mimi.state === 'waiting') break;
  }
  assert.equal(sawFrenzy, true);
  assert.equal(mimi.state, 'waiting');
});

test('碗里有粮时咪咪立刻赶来，即使玩家在碗旁也会吃', () => {
  const mimi = Mimi.create(site);
  const bowl = { x: 14 * 16, y: 17 * 16, filled: true };
  assert.equal(Mimi.offerBowlFood(mimi, bowl), true);
  assert.equal(mimi.state, 'approaching');
  for (let i = 0; i < 300 && bowl.filled; i++) {
    Mimi.update(mimi, 0.05, player(14, 17), outside.map, tiles, () => 0.5);
  }
  assert.equal(bowl.filled, false);
  assert.equal(mimi.hearts, 1);
  assert.equal(mimi.hasMet, true);
});

test('碗中已有猫粮时，咪咪会主动发现并优先赶去', () => {
  const mimi = Mimi.create(site);
  const bowl = { x: 14 * 16, y: 17 * 16, filled: true };
  Mimi.update(mimi, 0.05, player(14, 17), outside.map, tiles, () => 0.5, [bowl]);
  assert.equal(mimi.state, 'approaching');
  assert.equal(mimi.food.bowl, bowl);
});
