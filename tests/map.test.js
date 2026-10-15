'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { TILE, MAP, parseMap, isSolidAtPx } = require('../js/map.js');

test('地图尺寸：20 行，每行 30 字符', () => {
  assert.equal(MAP.length, 20);
  for (const row of MAP) assert.equal(row.length, 30);
});

test('parseMap 返回网格且四角是墙', () => {
  const { rows, cols, grid } = parseMap();
  assert.equal(rows, 20);
  assert.equal(cols, 30);
  assert.equal(grid[0][0], '#');
  assert.equal(grid[19][29], '#');
});

test('碰撞：墙/书架/桌/窗台/绿植/借阅台不可通行，地板/椅子可通行', () => {
  const solid = (c, r) => isSolidAtPx(c * TILE + 8, r * TILE + 8);
  assert.equal(solid(0, 0), true);   // 墙
  assert.equal(solid(3, 3), true);   // 书架
  assert.equal(solid(13, 11), true); // 桌
  assert.equal(solid(3, 1), true);   // 窗台
  assert.equal(solid(20, 1), true);  // 绿植（窗边 col20）
  assert.equal(solid(24, 15), true); // 借阅台
  assert.equal(solid(15, 19), true); // 门
  assert.equal(solid(10, 18), false); // 地板（出生点）
  assert.equal(solid(14, 10), false); // 椅子
});

test('越界坐标视为不可通行', () => {
  assert.equal(isSolidAtPx(-5, -5), true);
  assert.equal(isSolidAtPx(5000, 5000), true);
});

test('连通性：出生点到所有猫位邻域可达（BFS）', () => {
  const { grid } = parseMap();
  const walk = (c, r) => ' .c'.includes(grid[r][c]);
  const start = [10, 18];
  const seen = new Set([start.join(',')]);
  const queue = [start];
  while (queue.length) {
    const [c, r] = queue.shift();
    for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nc = c + dc, nr = r + dr;
      const key = nc + ',' + nr;
      if (nc < 0 || nr < 0 || nc >= 30 || nr >= 20) continue;
      if (!walk(nc, nr) || seen.has(key)) continue;
      seen.add(key);
      queue.push([nc, nr]);
    }
  }
  // 10 只猫各自邻域至少一个可走格
  const catSpots = [
    [3, 2], [11, 2], [15, 2],   // 雪球/团团/汤圆（窗台下）
    [18, 2], [4, 2], [8, 6],    // 布丁/煤球/墨墨
    [14, 10], [22, 2], [24, 14],// 奶糖(桌旁椅子)/芝麻/灰灰
    [15, 17],                   // 花卷（门边）
  ];
  for (const [c, r] of catSpots) {
    assert.equal(seen.has(c + ',' + r), true, `猫位 (${c},${r}) 不可达`);
  }
});
