'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { TILE, ATRIUM_MAP, ROOM_MAPS, parseMap, isSolidAtPx, isDoorAt } = require('../js/map.js');

test('中庭地图尺寸：30 行，每行 39 字符', () => {
  assert.equal(ATRIUM_MAP.length, 30);
  for (const row of ATRIUM_MAP) assert.equal(row.length, 39);
});

test('房间地图尺寸一致', () => {
  const reading = ROOM_MAPS.reading;
  assert.equal(reading.length, 30);
  for (const row of reading) assert.equal(row.length, 39);
  const toilet = ROOM_MAPS.toilet;
  assert.equal(toilet.length, 30);
  for (const row of toilet) assert.equal(row.length, 39);
});

test('parseMap 返回网格且四角是墙', () => {
  const { rows, cols, grid } = parseMap(ATRIUM_MAP);
  assert.equal(rows, 30);
  assert.equal(cols, 39);
  assert.equal(grid[0][0], '#');
  assert.equal(grid[29][38], '#');
});

test('中庭碰撞：墙/大门不可通行，棋盘/凳子/大门M可通行', () => {
  const solid = (c, r) => isSolidAtPx(c * TILE + 8, r * TILE + 8, ATRIUM_MAP);
  assert.equal(solid(0, 0), true);    // 外墙
  assert.equal(solid(4, 3), true);    // 左内墙
  assert.equal(solid(19, 29), true);  // 大门D
  assert.equal(solid(19, 27), false); // 棋盘（出生点）
  assert.equal(solid(19, 14), false); // 棋盘（可走）
  assert.equal(solid(7, 7), false);   // 棋子凳子（可走）
  assert.equal(solid(4, 8), false);   // 大门M（可走）
});

test('房间碰撞：书架/桌子/洁具不可通行，出口门可通行', () => {
  const reading = ROOM_MAPS.reading;
  const toilet = ROOM_MAPS.toilet;
  assert.equal(isSolidAtPx(2 * TILE + 8, 3 * TILE + 8, reading), true);   // 书架
  assert.equal(isSolidAtPx(4 * TILE + 8, 10 * TILE + 8, reading), true);  // 桌子
  assert.equal(isSolidAtPx(20 * TILE + 8, 29 * TILE + 8, reading), false); // 出口门（col 20-21）
  assert.equal(isSolidAtPx(2 * TILE + 8, 5 * TILE + 8, toilet), true);    // 洁具
  assert.equal(isSolidAtPx(20 * TILE + 8, 29 * TILE + 8, toilet), false); // 出口门
});

test('门检测：中庭大门M → 房间类型，房间门m → exit', () => {
  assert.equal(isDoorAt(4 * TILE + 8, 8 * TILE + 8, ATRIUM_MAP), true);   // 左上大门（卫生间）
  assert.equal(isDoorAt(4 * TILE + 8, 21 * TILE + 8, ATRIUM_MAP), true);  // 左下大门（阅览室）
  assert.equal(isDoorAt(19 * TILE + 8, 27 * TILE + 8, ATRIUM_MAP), false); // 棋盘不是门
  assert.equal(isDoorAt(20 * TILE + 8, 29 * TILE + 8, ROOM_MAPS.reading), true); // 房间出口（col 20）
});

test('越界坐标视为不可通行', () => {
  assert.equal(isSolidAtPx(-5, -5, ATRIUM_MAP), true);
  assert.equal(isSolidAtPx(5000, 5000, ATRIUM_MAP), true);
});

test('连通性：中庭出生点到所有猫位可达（BFS）', () => {
  const { grid } = parseMap(ATRIUM_MAP);
  const walk = (c, r) => ' .cqz'.includes(grid[r][c]); // 地板/椅子/棋盘/凳子可走
  const start = [19, 27];
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
  // 10 只猫各自位置（39列，棋盘 col 7-36）
  const catSpots = [
    [19, 14], [16, 12], [22, 15], // 棋盘上猫
    [20, 24], [6, 16], [5, 8],    // 大厅猫
    [19, 16], [35, 20], [35, 6],  // 其他猫
    [19, 27],                     // 门口猫
  ];
  for (const [c, r] of catSpots) {
    assert.equal(seen.has(c + ',' + r), true, `猫位 (${c},${r}) 不可达`);
  }
});
