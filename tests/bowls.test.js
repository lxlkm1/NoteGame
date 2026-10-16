'use strict';
const test = require('node:test');
const assert = require('node:assert');
const Bowls = require('../js/bowls.js');
const outside = require('../maps/outside.js');
const tiles = require('../maps/tiles.js');

test('前庭每次生成左右两个位置随机且可走的碗', () => {
  const a = Bowls.create(() => 0);
  const b = Bowls.create(() => 0.99);
  assert.equal(a.length, 2);
  assert.ok(a[0].x < 16 * 16 && a[1].x > 22 * 16);
  assert.notDeepEqual(a, b);
  for (const bowl of [...a, ...b]) {
    const ch = outside.map[bowl.y / 16][bowl.x / 16];
    assert.equal(tiles[ch].solid, false);
  }
});

test('玩家只能给身旁空碗放粮', () => {
  const bowls = Bowls.create(() => 0);
  const player = { x: bowls[0].x, y: bowls[0].y };
  assert.equal(Bowls.nearestEmpty(bowls, player), bowls[0]);
  bowls[0].filled = true;
  assert.equal(Bowls.nearestEmpty(bowls, player), null);
});
