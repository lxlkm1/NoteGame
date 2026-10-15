'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { TILE, MAP, parseMap, isSolidAtPx } = require('../js/map.js');

test('地图尺寸：30 行，每行 40 字符', () => {
  assert.equal(MAP.length, 30);
  for (const row of MAP) assert.equal(row.length, 40);
});

test('parseMap 返回网格且四角是墙', () => {
  const { rows, cols, grid } = parseMap();
  assert.equal(rows, 30);
  assert.equal(cols, 40);
  assert.equal(grid[0][0], '#');
  assert.equal(grid[29][39], '#');
});

test('碰撞：墙/书架/桌/螺旋楼梯/卫生间/大门不可通行，地板/棋盘/椅子可通行', () => {
  const solid = (c, r) => isSolidAtPx(c * TILE + 8, r * TILE + 8);
  assert.equal(solid(0, 0), true);    // 墙
  assert.equal(solid(3, 5), true);    // 书架
  assert.equal(solid(3, 10), true);   // 桌
  assert.equal(solid(12, 14), true);  // 螺旋楼梯
  assert.equal(solid(2, 1), true);    // 卫生间
  assert.equal(solid(19, 29), true);  // 大门
  assert.equal(solid(19, 27), false); // 地板（出生点）
  assert.equal(solid(19, 14), false); // 棋盘（可走）
  assert.equal(solid(1, 10), false);  // 椅子
});

test('越界坐标视为不可通行', () => {
  assert.equal(isSolidAtPx(-5, -5), true);
  assert.equal(isSolidAtPx(5000, 5000), true);
});

test('连通性：出生点到所有猫位邻域可达（BFS）', () => {
  const { grid } = parseMap();
  const walk = (c, r) => ' .cq'.includes(grid[r][c]); // 地板/椅子/棋盘可走
  const start = [19, 27];
  const seen = new Set([start.join(',')]);
  const queue = [start];
  while (queue.length) {
    const [c, r] = queue.shift();
    for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nc = c + dc, nr = r + dr;
      const key = nc + ',' + nr;
      if (nc < 0 || nr < 0 || nc >= 40 || nr >= 30) continue;
      if (!walk(nc, nr) || seen.has(key)) continue;
      seen.add(key);
      queue.push([nc, nr]);
    }
  }
  // 10 只猫各自位置（或邻域）可走格
  const catSpots = [
    [19, 14], [17, 12], [23, 16], // 雪球/团团/汤圆（棋盘上）
    [20, 25], [11, 15], [3, 7],   // 布丁（中庭）/煤球（楼梯旁）/墨墨（左上阅览室）
    [35, 12], [3, 16], [35, 21],  // 奶糖（右上）/芝麻（左下）/灰灰（右下）
    [19, 27],                     // 花卷（门口）
  ];
  for (const [c, r] of catSpots) {
    assert.equal(seen.has(c + ',' + r), true, `猫位 (${c},${r}) 不可达`);
  }
});
