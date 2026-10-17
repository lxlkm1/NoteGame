// index.js —— 聚合图例与全部场景为 MAPS（等价于原来的全局 MAPS 命名空间）
import tiles from './tiles.js';
import atrium from './atrium.js';
import reading from './reading.js';
import toilet from './toilet.js';
import outside from './outside.js';

export const MAPS = { tiles, atrium, reading, toilet, outside };
