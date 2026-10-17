// 情侣独立原生像素画：女生 40×48、男生 40×42。字符对应调色板颜色。
export const COUPLE_PALETTES = {
  girl: {
    H: '#443440', F: '#614853', L: '#2c2935', h: '#86646b',
    S: '#efd0ba', s: '#dcb099', R: '#dfa3a0', E: '#483943',
    W: '#fbf5e9', w: '#ddd6cb', d: '#c7bfba', A: '#9bb0b9',
    C: '#e8ddd4', c: '#bdafa8', P: '#766a78', B: '#554954',
  },
  boy: {
    Y: '#d9ac38', y: '#f9d65b', h: '#876027', Z: '#fff099',
    S: '#ebc4a5', s: '#cfa184', E: '#2e292b', R: '#a67569',
    C: '#30323d', c: '#5c6070', J: '#1f222e', V: '#885276',
    L: '#c5c4c8', P: '#424450', B: '#24252d', W: '#ddd7cf',
  },
};

function canvas(width, height) {
  const pixels = Array.from({ length: height }, () => Array(width).fill('.'));
  const rect = (key, x, y, w, h) => {
    for (let row = Math.max(0, y); row < Math.min(height, y + h); row++)
      for (let col = Math.max(0, x); col < Math.min(width, x + w); col++) pixels[row][col] = key;
  };
  const oval = (key, cx, cy, rx, ry) => {
    for (let row = Math.max(0, Math.floor(cy - ry)); row <= Math.min(height - 1, Math.ceil(cy + ry)); row++)
      for (let col = Math.max(0, Math.floor(cx - rx)); col <= Math.min(width - 1, Math.ceil(cx + rx)); col++)
        if (((col - cx) / rx) ** 2 + ((row - cy) / ry) ** 2 <= 1) pixels[row][col] = key;
  };
  return { rect, oval, result: () => pixels.map(row => row.join('')) };
}

function girlFrame(pose) {
  const p = canvas(40, 48);
  const side = ['side1', 'side2', 'hug', 'kiss', 'deepKiss'].includes(pose);
  const up = pose.startsWith('up');
  const step = pose.endsWith('2');
  // 修长的腿与白裙：裙摆是最醒目的大块颜色。
  p.rect('S', step ? 14 : 15, 41, 3, 5);
  p.rect('S', step ? 25 : 24, 41, 3, 5);
  p.rect('B', step ? 13 : 14, 46, 5, 2);
  p.rect('B', step ? 24 : 23, 46, 5, 2);
  p.oval('w', 20, 38, 12, 6);
  p.oval('W', 20, 37, 11, 6);
  p.rect('w', 10, 40, 20, 2);
  p.rect('W', 9, 41, 22, 1);
  p.rect('d', 10, 43, 20, 1);
  p.oval('W', 20, 29, 7, 7);
  p.rect('w', 14, 33, 2, 5);
  p.rect('C', 17, 23, 6, 2); // 米色小翻领
  p.rect('A', 19, 25, 2, 2); // 淡蓝色领结
  p.rect('s', 18, 21, 4, 3);
  p.oval('S', 12, 30, 2, 5);
  p.oval('S', 28, 30, 2, 5);
  p.rect('W', 12, 26, 3, 6);
  p.rect('W', 26, 26, 3, 6);
  if (up) {
    p.oval('L', 20, 13, 10, 12);
    p.oval('H', 20, 11, 9, 9);
    p.rect('F', 13, 8, 14, 2);
    p.rect('h', 17, 5, 6, 1);
    p.rect('L', 10, 18, 3, 8);
  } else if (side) {
    const lean = pose === 'kiss' ? 1 : pose === 'deepKiss' ? 2 : 0;
    p.oval('L', 18 + lean, 14, 10, 12);
    p.oval('H', 20 + lean, 10, 9, 8);
    p.oval('S', 23 + lean, 16, 6, 6);
    p.rect('F', 22 + lean, 7, 7, 3);
    p.rect('F', 26 + lean, 10, 3, 2);
    p.rect('h', 16 + lean, 5, 6, 1);
    p.rect('E', 27 + lean, 16, 1, 1);
    p.rect('R', 25 + lean, 19, 2, 1);
    p.rect('L', 10 + lean, 15, 3, 11);
    p.rect('A', 12 + lean, 19, 2, 2); // 发夹
    if (pose === 'hug') p.rect('S', 27, 28, 9, 2);
    if (pose === 'kiss' || pose === 'deepKiss') p.rect('R', 29 + lean, 19, 2, 1);
  } else {
    p.oval('L', 20, 14, 10, 12);
    p.oval('H', 20, 10, 10, 8);
    p.oval('S', 20, 16, 7, 6);
    p.rect('F', 13, 8, 14, 3);
    p.rect('F', 14, 11, 4, 2);
    p.rect('F', 22, 11, 4, 2);
    p.rect('h', 17, 5, 6, 1);
    p.rect('A', 10, 12, 3, 2);
    p.rect('E', 16, 17, 1, 1);
    p.rect('E', 24, 17, 1, 1);
    p.rect('R', 13, 19, 2, 1);
    p.rect('R', 25, 19, 2, 1);
    p.rect('s', 19, 21, 2, 1);
    p.rect('L', 10, 15, 3, 11);
    p.rect('L', 28, 15, 3, 11);
  }
  return p.result();
}

function boyFrame(pose) {
  const p = canvas(40, 42);
  const side = ['side1', 'side2', 'approach', 'hug', 'kiss', 'deepKiss', 'release'].includes(pose);
  const up = pose.startsWith('up');
  const step = pose.endsWith('2');
  // 非主流宽外套、紫色内衬、银链和磨损的宽裤脚。
  p.rect('P', step ? 12 : 11, 34, 6, 6);
  p.rect('P', step ? 27 : 25, 34, 6, 6);
  p.rect('W', 13, 37, 3, 1);
  p.rect('W', 27, 36, 3, 1);
  p.rect('B', step ? 10 : 9, 39, 9, 3);
  p.rect('B', step ? 26 : 25, 39, 9, 3);
  p.oval('J', 20, 28, 12, 8);
  p.rect('C', 9, 24, 22, 10);
  p.rect('V', 17, 25, 7, 8);
  p.rect('J', 12, 25, 5, 10);
  p.rect('J', 24, 25, 5, 10);
  p.rect('c', 10, 26, 2, 7);
  p.rect('c', 29, 26, 2, 7);
  p.rect('L', 19, 31, 5, 1);
  p.rect('L', 22, 32, 1, 2);
  p.oval('S', 8, 32, 2, 3);
  p.oval('S', 32, 32, 2, 3);
  if (up) {
    p.oval('h', 20, 15, 11, 9);
    p.oval('Y', 20, 13, 10, 8);
    p.rect('Y', 25, 5, 4, 6);
    p.rect('Y', 13, 6, 3, 5);
    p.rect('y', 15, 7, 6, 2);
    p.rect('Z', 22, 6, 3, 1);
    p.rect('h', 10, 19, 4, 3);
  } else if (side) {
    const lean = pose === 'kiss' ? -1 : pose === 'deepKiss' ? -2 : 0;
    p.oval('h', 20 + lean, 15, 11, 9);
    p.oval('Y', 20 + lean, 12, 11, 8);
    p.oval('S', 15 + lean, 18, 6, 5);
    p.rect('Y', 8 + lean, 11, 9, 3);
    p.rect('Y', 16 + lean, 4, 4, 7);
    p.rect('Y', 27 + lean, 7, 4, 5);
    p.rect('y', 10 + lean, 8, 6, 2);
    p.rect('Z', 22 + lean, 6, 4, 1);
    p.rect('E', 10 + lean, 17, 7, 1);
    p.rect('E', 12 + lean, 18, 4, 1);
    p.rect('E', 13 + lean, 20, 2, 1);
    p.rect('R', 10 + lean, 23, 3, 1);
    p.rect('L', 10 + lean, 23, 1, 2); // 耳钉
    if (pose === 'approach') { p.rect('S', 3, 27, 10, 2); p.rect('s', 3, 28, 3, 1); }
    if (pose === 'hug') { p.rect('S', 1, 28, 14, 3); p.rect('s', 1, 30, 4, 1); }
    if (pose === 'kiss') p.rect('S', 7, 24, 3, 1);
    if (pose === 'deepKiss') { p.rect('R', 7 + lean, 23, 3, 1); p.rect('S', 6, 25, 2, 1); }
    if (pose === 'release') { p.rect('S', 8, 32, 3, 5); p.rect('s', 8, 36, 3, 1); }
  } else {
    p.oval('h', 20, 14, 11, 9);
    p.oval('S', 20, 18, 7, 6);
    p.oval('Y', 20, 11, 11, 7);
    p.rect('Y', 13, 4, 4, 7);
    p.rect('Y', 23, 3, 5, 8);
    p.rect('Y', 8, 13, 6, 3);
    p.rect('Y', 29, 10, 4, 4);
    p.rect('y', 11, 8, 7, 2);
    p.rect('Z', 23, 6, 4, 1);
    p.rect('E', 12, 17, 6, 1);
    p.rect('E', 14, 18, 4, 1);
    p.rect('E', 23, 18, 4, 1);
    p.rect('E', 25, 17, 6, 1);
    p.rect('E', 15, 20, 2, 1);
    p.rect('E', 25, 20, 2, 1);
    p.rect('R', 20, 23, 4, 1);
    p.rect('L', 11, 22, 1, 2);
  }
  return p.result();
}

const girlPoses = ['down1', 'down2', 'up1', 'up2', 'side1', 'side2', 'hug', 'kiss', 'deepKiss'];
const boyPoses = [...girlPoses, 'approach', 'release'];
export const COUPLE_FRAMES = {
  girl: Object.fromEntries(girlPoses.map(pose => [pose, girlFrame(pose)])),
  boy: Object.fromEntries(boyPoses.map(pose => [pose, boyFrame(pose)])),
};
