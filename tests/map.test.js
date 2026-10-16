'use strict';
const test = require('node:test');
const assert = require('node:assert');
const tiles = require('../maps/tiles.js');
const atrium = require('../maps/atrium.js');
const reading = require('../maps/reading.js');
const toilet = require('../maps/toilet.js');
const outside = require('../maps/outside.js');
const { CAT_DEFS } = require('../js/cats.js');
const { TILE, ART_SCALE, parseMap, isSolidAtPx, isDoorAt, doorDestAt } = require('../js/map.js');

test('绘制分辨率为每格 32 像素，碰撞格仍为 16 单位', () => {
  assert.equal(TILE, 16);
  assert.equal(TILE * ART_SCALE, 32);
});

const ATRIUM_MAP = atrium.map;

test('中庭地图尺寸：30 行，每行 39 字符', () => {
  assert.equal(ATRIUM_MAP.length, 30);
  for (const row of ATRIUM_MAP) assert.equal(row.length, 39);
});

test('房间地图尺寸一致', () => {
  assert.equal(reading.map.length, 30);
  for (const row of reading.map) assert.equal(row.length, 39);
  assert.equal(toilet.map.length, 30);
  for (const row of toilet.map) assert.equal(row.length, 39);
});

test('parseMap 返回网格且四角是墙', () => {
  const { rows, cols, grid } = parseMap(ATRIUM_MAP);
  assert.equal(rows, 30);
  assert.equal(cols, 39);
  assert.equal(grid[0][0], '#');
  assert.equal(grid[29][38], '#');
});

test('中庭碰撞：墙不可通行，棋盘/凳子/大门可通行', () => {
  const solid = (c, r) => isSolidAtPx(c * TILE + 8, r * TILE + 8, ATRIUM_MAP, tiles);
  assert.equal(solid(0, 0), true);    // 外墙
  assert.equal(solid(1, 3), true);    // 左墙
  assert.equal(solid(19, 29), false); // 室外入口 D
  assert.equal(solid(19, 27), false); // 棋盘（出生点）
  assert.equal(solid(19, 14), false); // 棋盘（可走）
  assert.equal(solid(7, 7), false);   // 棋子凳子（可走）
  assert.equal(solid(1, 8), false);   // 大门W（可走）
  assert.equal(solid(37, 21), false); // 大门M（可走）
});

test('房间碰撞：书架/桌子/洁具不可通行，出口门可通行', () => {
  assert.equal(isSolidAtPx(2 * TILE + 8, 3 * TILE + 8, reading.map, tiles), true);   // 书架
  assert.equal(isSolidAtPx(4 * TILE + 8, 10 * TILE + 8, reading.map, tiles), true);  // 桌子
  assert.equal(isSolidAtPx(18 * TILE + 8, 29 * TILE + 8, reading.map, tiles), false); // 出口门（col 18-19）
  assert.equal(isSolidAtPx(2 * TILE + 8, 5 * TILE + 8, toilet.map, tiles), true);    // 洁具
  assert.equal(isSolidAtPx(18 * TILE + 8, 29 * TILE + 8, toilet.map, tiles), false); // 出口门
});

test('门检测：portal 符号才是门，字符即目的地', () => {
  assert.equal(isDoorAt(1 * TILE + 8, 8 * TILE + 8, ATRIUM_MAP, tiles), true);   // 左上大门 W
  assert.equal(isDoorAt(37 * TILE + 8, 21 * TILE + 8, ATRIUM_MAP, tiles), true); // 右下大门 M
  assert.equal(isDoorAt(19 * TILE + 8, 27 * TILE + 8, ATRIUM_MAP, tiles), false); // 棋盘不是门
  assert.equal(isDoorAt(19 * TILE + 8, 29 * TILE + 8, ATRIUM_MAP, tiles), true);
  // 字符即目的地
  assert.equal(doorDestAt(1 * TILE + 8, 8 * TILE + 8, ATRIUM_MAP, tiles), 'toilet');
  assert.equal(doorDestAt(37 * TILE + 8, 21 * TILE + 8, ATRIUM_MAP, tiles), 'reading');
  assert.equal(doorDestAt(19 * TILE + 8, 29 * TILE + 8, ATRIUM_MAP, tiles), 'outside');
  assert.equal(doorDestAt(19 * TILE + 8, 4 * TILE + 8, outside.map, tiles), 'atrium');
  assert.equal(doorDestAt(18 * TILE + 8, 29 * TILE + 8, reading.map, tiles), 'atrium'); // 房间出口（col 18）
  assert.equal(doorDestAt(19 * TILE + 8, 27 * TILE + 8, ATRIUM_MAP, tiles), null);
});

test('室外碰撞：草地和石板可走，树、长椅、路灯与外墙挡路', () => {
  const solid = (c, r) => isSolidAtPx(c * TILE + 8, r * TILE + 8, outside.map, tiles);
  assert.equal(solid(19, 6), false);
  assert.equal(solid(3, 9), false);
  assert.equal(solid(5, 10), true);
  assert.equal(solid(13, 10), true);
  assert.equal(solid(7, 13), true);
  assert.equal(solid(10, 15), true); // 树丛
  assert.equal(solid(3, 2), true);
});

test('越界坐标视为不可通行', () => {
  assert.equal(isSolidAtPx(-5, -5, ATRIUM_MAP, tiles), true);
  assert.equal(isSolidAtPx(5000, 5000, ATRIUM_MAP, tiles), true);
});

test('连通性：前庭入口到十只普通猫的出生点可达（BFS）', () => {
  const { grid } = parseMap(outside.map);
  const walk = (c, r) => { // 按 tiles 语义：非 solid 且非门（门另一头是别的场景）
    const t = tiles[grid[r][c]];
    return t && !t.solid && !t.portal;
  };
  const start = [outside.entry.col, outside.entry.row];
  const seen = new Set([start.join(',')]);
  const queue = [start];
  while (queue.length) {
    const [c, r] = queue.shift();
    for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nc = c + dc, nr = r + dr;
      const key = nc + ',' + nr;
      if (nc < 0 || nr < 0 || nc >= 39 || nr >= 30) continue;
      if (!walk(nc, nr) || seen.has(key)) continue;
      seen.add(key);
      queue.push([nc, nr]);
    }
  }
  for (const { col: c, row: r } of CAT_DEFS) {
    assert.equal(seen.has(c + ',' + r), true, `猫位 (${c},${r}) 不可达`);
  }
});
