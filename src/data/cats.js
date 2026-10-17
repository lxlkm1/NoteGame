// cats.js —— 前庭 10 只普通猫的定义（纯数据，状态机在 src/npc/cats.js）
// 位置 = 格坐标(可小数) × 16。radius 为可选显式闲逛半径（像素），否则用 home ± 默认范围
export const CAT_DEFS = [
  { id: 'xueqiu',   name: '雪球', persona: '在石板路上晒太阳', col: 19, row: 12, palette: { A: '#f5f2ec', B: '#d8d2c6', C: '#e890a8', E: '#4a4a55', W: '#f5f2ec' } },
  { id: 'tuantuan', name: '团团', persona: '守着前庭的小路',   col: 19, row: 23, palette: { A: '#ef9f4d', B: '#d97f2e', C: '#e890a8', E: '#4a3a2b', W: '#f5ecd9' } },
  { id: 'tangyuan', name: '汤圆', persona: '在左边草地散步',   col: 7, row: 11, palette: { A: '#f5f2ec', B: '#9aa0ab', C: '#e890a8', E: '#4a4a55', W: '#f5f2ec' } },
  { id: 'buding',   name: '布丁', persona: '喜欢右边的草地',   col: 31, row: 11, radius: 32, palette: { A: '#f2c14e', B: '#d9a32e', C: '#e890a8', E: '#4a3a2b', W: '#faf3dd' } },
  { id: 'meiqiu',   name: '煤球', persona: '躲在左侧绿地',     col: 3, row: 18, palette: { A: '#3d3a45', B: '#2b2933', C: '#e890a8', E: '#c9c4d4', W: '#f5f2ec' } },
  { id: 'momo',     name: '墨墨', persona: '右侧绿地的大人物', col: 35, row: 18, radius: 16, palette: { A: '#423e4a', B: '#302d38', C: '#e890a8', E: '#d4b95e', W: '#5a5566' } },
  { id: 'naitang',  name: '奶糖', persona: '路灯旁的小奶猫',   col: 13, row: 24, radius: 10, palette: { A: '#f5f2ec', B: '#3d3a45', C: '#e890a8', E: '#4a4a55', W: '#f5f2ec' } },
  { id: 'zhima',    name: '芝麻', persona: '前庭巡逻员',       col: 25, row: 24, radius: 10, palette: { A: '#ef9f4d', B: '#3d3a45', C: '#e890a8', E: '#4a3a2b', W: '#f5f2ec' } },
  { id: 'huihui',   name: '灰灰', persona: '左侧树丛的监工',   col: 7, row: 27, radius: 10, palette: { A: '#9aa0ab', B: '#7d828d', C: '#e890a8', E: '#4a4a55', W: '#e8e4dc' } },
  { id: 'huajuan',  name: '花卷', persona: '在前庭等你很久了', col: 31, row: 27, radius: 10, palette: { A: '#ef9f4d', B: '#f5f2ec', C: '#e890a8', E: '#4a3a2b', W: '#faf3dd' } },
];
