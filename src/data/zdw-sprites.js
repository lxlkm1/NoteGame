// zdw：32×40 原生像素，青年学生的地中海发型、帆布背包与考研资料。
export const ZDW_PALETTE = {
  H: '#35302e', h: '#55463b', S: '#eac09d', s: '#c99478', L: '#f5d1ad',
  E: '#34343b', C: '#426a62', c: '#63867a', D: '#304b48', W: '#ece7d7',
  P: '#3b465c', p: '#556078', B: '#2b303c', T: '#9e7956', t: '#c2a17a',
  K: '#6a503e', Q: '#567c9b', q: '#b6cbd5', R: '#a97462',
};

function canvas(width, height) {
  const pixels = Array.from({ length: height }, () => Array(width).fill('.'));
  const rect = (key, x, y, w, h) => {
    for (let row = Math.max(0, y); row < Math.min(height, y + h); row++)
      for (let col = Math.max(0, x); col < Math.min(width, x + w); col++) pixels[row][col] = key;
  };
  const oval = (key, cx, cy, rx, ry) => {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++)
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) pixels[y][x] = key;
  };
  return { rect, oval, result: () => pixels.map(row => row.join('')) };
}

function studentFrame(pose) {
  const p = canvas(32, 40);
  const side = pose.startsWith('side') || pose === 'study' || pose === 'reach';
  const back = pose.startsWith('up');
  const step = pose.endsWith('2');
  const reaching = pose === 'reach';

  // 窄肩、长裤和白底运动鞋；脚底始终在第 39 行。
  p.rect('P', step ? 10 : 11, 28, 5, step ? 9 : 10);
  p.rect('P', step ? 20 : 19, 28, 5, 10);
  p.rect('p', step ? 11 : 12, 29, 1, 7);
  p.rect('B', step ? 9 : 10, step ? 36 : 37, 7, 2);
  p.rect('W', step ? 9 : 10, step ? 38 : 39, 7, 1);
  p.rect('B', step ? 20 : 19, 37, 7, 2);
  p.rect('W', step ? 20 : 19, 39, 7, 1);

  // 远臂先画，再用外套遮挡；交互姿态只由渲染器补一条近侧手臂。
  if (!side) {
    p.rect('D', 7, 18, 4, 10); p.rect('S', 8, 28, 3, 4);
    p.rect('C', 23, 18, 3, 11); p.rect('S', 23, 28, 3, 4);
  }
  p.oval('D', 17, 20, 8, 6);
  p.rect('C', 10, 18, 14, 12);
  p.rect('D', 10, 29, 14, 2);
  p.rect('c', 12, 18, 2, 10);
  p.rect('W', 15, 15, 5, 7);
  p.rect('D', 16, 22, 1, 8);
  p.rect('W', 17, 23, 1, 1); p.rect('W', 17, 27, 1, 1);
  p.rect('s', 15, 12, 5, 4);
  p.rect('S', 16, 13, 3, 3);

  if (side) {
    // 背包的浅色翻盖和装在侧袋里的复习册。
    p.rect('K', 4, 17, 8, 14); p.rect('T', 5, 18, 6, 12);
    p.rect('t', 5, 18, 6, 3); p.rect('K', 6, 24, 4, 1);
    p.rect('K', 10, 15, 2, 13); p.rect('t', 10, 16, 1, 10);
    p.rect('Q', 5, 15, 4, 7); p.rect('W', 6, 14, 3, 5);
    p.rect('q', 6, 16, 2, 1);
  } else if (back) {
    p.rect('K', 10, 17, 14, 13); p.rect('T', 11, 18, 12, 11);
    p.rect('t', 11, 18, 12, 3); p.rect('K', 13, 24, 8, 4);
    p.rect('T', 14, 25, 6, 2); p.rect('W', 16, 21, 2, 1);
    p.rect('K', 9, 16, 2, 10); p.rect('K', 23, 16, 2, 10);
  } else {
    p.rect('K', 10, 16, 2, 13); p.rect('t', 10, 18, 1, 9);
    p.rect('K', 22, 16, 2, 8);
    p.rect('Q', 19, 22, 6, 10); p.rect('W', 20, 23, 4, 1);
    p.rect('q', 20, 25, 3, 1); p.rect('S', 22, 28, 4, 3);
  }

  // 头顶明显露出肤色，深色头发仅沿两侧和后脑成半圈。
  p.oval('s', side ? 18 : 17, 8, 7, 7);
  p.oval('S', side ? 18 : 17, 7, 6, 6);
  p.rect('L', side ? 16 : 14, 2, 6, 2);
  if (back) {
    p.rect('H', 10, 5, 2, 7); p.rect('H', 22, 5, 2, 7);
    p.rect('H', 11, 10, 12, 3); p.rect('h', 12, 10, 10, 1);
    p.rect('S', 13, 5, 8, 4);
  } else if (side) {
    p.rect('H', 11, 5, 3, 7); p.rect('h', 11, 5, 2, 3);
    p.rect('H', 13, 10, 3, 3); p.rect('S', 14, 9, 2, 3);
    p.rect('s', 15, 10, 1, 1); // 耳朵
    p.rect('E', 19, 7, 6, 1); p.rect('E', 20, 8, 1, 2);
    p.rect('E', 23, 8, 1, 2); p.rect('E', 21, 10, 3, 1);
    p.rect('S', 24, 10, 2, 2); p.rect('R', 22, 13, 2, 1);
  } else {
    p.rect('H', 10, 5, 2, 6); p.rect('H', 22, 5, 2, 6);
    p.rect('h', 10, 5, 1, 3); p.rect('h', 23, 5, 1, 3);
    p.rect('E', 12, 7, 10, 1); p.rect('E', 12, 8, 1, 2);
    p.rect('E', 16, 8, 2, 1); p.rect('E', 21, 8, 1, 2);
    p.rect('E', 13, 10, 3, 1); p.rect('E', 18, 10, 3, 1);
    p.rect('s', 17, 10, 1, 2); p.rect('R', 16, 13, 3, 1);
  }

  if (side && !reaching) {
    p.rect('D', 19, 18, 4, 8); p.rect('c', 20, 19, 2, 6);
    p.rect('S', 20, 26, 3, 5);
    if (pose === 'study') {
      // 打开的复习书：书脊、分开的两页和小行文字。
      p.rect('Q', 16, 23, 15, 7); p.rect('W', 17, 23, 6, 5);
      p.rect('W', 24, 22, 6, 6); p.rect('K', 23, 23, 1, 6);
      p.rect('q', 18, 24, 4, 1); p.rect('q', 18, 26, 3, 1);
      p.rect('q', 25, 24, 4, 1); p.rect('q', 25, 26, 3, 1);
      p.rect('S', 17, 28, 4, 2); p.rect('S', 28, 27, 3, 2);
    } else {
      p.rect('Q', 20, 27, 6, 6); p.rect('W', 21, 28, 4, 1);
      p.rect('S', 20, 26, 3, 3);
    }
  }
  return p.result();
}

export const ZDW_FRAMES = Object.fromEntries(
  ['down1', 'down2', 'up1', 'up2', 'side1', 'side2', 'study', 'reach']
    .map(pose => [pose, studentFrame(pose)]),
);

// 后爪在 (4, 1)，头位于下方；另一条后腿和两条前腿都自然垂落。
// 黑头、金眼、白胸和鼻边黑斑与咪咪原有的奶牛花纹一致。
export const ZDW_MIMI_PALETTE = {
  B: '#25252d', b: '#46454b', W: '#f5f1e8', w: '#d8d4cb',
  C: '#bd8590', E: '#312c31', G: '#d9b94e',
};
export const ZDW_MIMI_FRAME = [
  '....WW..........',
  '....WW..........',
  '....WW..........',
  '....WW....WW....',
  '....WWW...WW....',
  '....BWWWWWWB....',
  '...BBWWWWWBBB...',
  '..BBBBWWWWBBBB..',
  '..BBBBWWWWBBBB..',
  '..BBBBWWWWBBBBB.',
  '..BBBBWWWWBBBB.B',
  '...BBBWWWWBBB..B',
  '...BWWWWWWWWB..B',
  '...WWBBBBBBWW..B',
  '...WWBBBBBBWW.BB',
  '...WBBBBBBBBW.B.',
  '...BBBBWWBBBB...',
  '..BBBWWEBBWWBB..',
  '..BBWWWEEWWWBB..',
  '..BBBWWWWWWBBB..',
  '..BBGBBWWBBGBB..',
  '..BBBBBBBBBBBB..',
  '...BCB....BCB...',
  '...BB......BB...',
];
export const ZDW_MIMI_PAW = { x: 4, y: 1 };
