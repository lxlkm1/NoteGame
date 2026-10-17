// 情侣独立原生像素画：女生 40×48、男生 40×42。字符对应调色板颜色。
export const COUPLE_PALETTES = {
  girl: {
    H: '#443440', F: '#614853', L: '#2c2935', h: '#86646b',
    S: '#efd0ba', s: '#dcb099', R: '#dfa3a0', M: '#b97578', E: '#483943',
    W: '#fbf5e9', w: '#ddd6cb', d: '#c7bfba', A: '#9bb0b9',
    C: '#e8ddd4', c: '#bdafa8', P: '#766a78', B: '#554954',
    K: '#fff5e9', k: '#dc96a6', N: '#57404a',
  },
  boy: {
    Y: '#d9ac38', y: '#f9d65b', h: '#876027', Z: '#fff099',
    S: '#ebc4a5', s: '#cfa184', E: '#2e292b', R: '#a67569', M: '#9d635d',
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
  const shiftUp = amount => {
    for (let row = 0; row < height; row++) pixels[row] = pixels[row + amount] || Array(width).fill('.');
  };
  return { rect, oval, shiftUp, result: () => pixels.map(row => row.join('')) };
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
  const catClip = (x, y) => {
    p.rect('K', x, y, 1, 2); p.rect('K', x + 4, y, 1, 2); // 小猫尖耳
    p.rect('K', x, y + 1, 5, 3);
    p.rect('K', x + 1, y + 4, 3, 1);
    p.rect('N', x + 1, y + 2, 1, 1); p.rect('N', x + 3, y + 2, 1, 1);
    p.rect('k', x + 2, y + 3, 1, 1);
  };
  if (up) {
    p.oval('L', 20, 15, 8, 10);
    p.oval('H', 20, 11, 8, 7);
    p.rect('F', 14, 8, 12, 2);
    p.rect('h', 18, 5, 4, 1);
    p.rect('L', 12, 18, 2, 7);
    catClip(23, 9);
  } else if (side) {
    const lean = pose === 'kiss' ? 1 : pose === 'deepKiss' ? 2 : 0;
    p.oval('L', 19 + lean, 15, 8, 10);
    p.oval('H', 20 + lean, 11, 8, 7);
    p.oval('S', 23 + lean, 18, 5, 6);
    p.rect('F', 21 + lean, 8, 7, 3);
    p.rect('F', 25 + lean, 11, 2, 2);
    p.rect('h', 18 + lean, 5, 4, 1);
    p.rect('E', 26 + lean, 17, 1, 1);
    p.rect('R', 26 + lean, 21, 2, 1);
    p.rect('L', 11 + lean, 17, 2, 8);
    p.rect('A', 12 + lean, 19, 2, 2); // 发夹
    catClip(12 + lean, 9);
    if (pose === 'kiss') p.rect('M', 28, 22, 2, 1);
    if (pose === 'deepKiss') p.rect('M', 29, 22, 2, 1);
  } else {
    p.oval('L', 20, 15, 8, 10);
    p.oval('H', 20, 11, 8, 7);
    p.oval('S', 20, 17, 6, 6);
    p.rect('F', 14, 8, 12, 3);
    p.rect('F', 15, 11, 3, 2);
    p.rect('F', 22, 11, 3, 2);
    p.rect('h', 18, 5, 4, 1);
    p.rect('A', 12, 13, 2, 2);
    p.rect('E', 17, 18, 1, 1);
    p.rect('E', 23, 18, 1, 1);
    p.rect('R', 14, 20, 2, 1);
    p.rect('R', 24, 20, 2, 1);
    p.rect('s', 19, 22, 2, 1);
    p.rect('L', 12, 17, 2, 8);
    p.rect('L', 26, 17, 2, 8);
    catClip(11, 9);
  }
  return p.result();
}

function boyFrame(pose) {
  const p = canvas(40, 42);
  const side = ['side1', 'side2', 'approach', 'hug', 'kiss', 'deepKiss', 'release'].includes(pose);
  const up = pose.startsWith('up');
  const step = pose.endsWith('2');
  const tiptoe = pose === 'kiss' || pose === 'deepKiss';
  // 非主流宽外套、紫色内衬、银链和磨损的宽裤脚。
  p.rect('P', step ? 12 : 11, 34, 6, 6);
  p.rect('P', step ? 27 : 25, 34, 6, 6);
  p.rect('W', 13, 37, 3, 1);
  p.rect('W', 27, 36, 3, 1);
  if (!tiptoe) {
    p.rect('B', step ? 10 : 9, 39, 9, 3);
    p.rect('B', step ? 26 : 25, 39, 9, 3);
  }
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
    const lean = pose === 'kiss' ? -1 : pose === 'deepKiss' ? -2 : pose === 'hug' ? 2 : 0;
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
    p.rect('R', 10 + lean, 22, 2, 1);
    p.rect('L', 10 + lean, 23, 1, 2); // 耳钉
    if (pose === 'approach') { p.rect('S', 3, 27, 10, 2); p.rect('s', 3, 28, 3, 1); }
    if (pose === 'hug' || pose === 'kiss' || pose === 'deepKiss') {
      p.rect('c', 6, 26, 10, 4); // 前臂搭住肩膀
      p.rect('S', 0, 27, 9, 3);
      p.rect('s', 0, 29, 3, 1);
      if (pose === 'hug') {
        p.rect('c', 8, 32, 8, 4); // 另一只手臂揽住腰部
        p.rect('S', 0, 33, 10, 3);
        p.rect('s', 0, 35, 3, 1);
      }
    }
    if (pose === 'kiss') p.rect('M', 9, 19, 2, 1);
    if (pose === 'deepKiss') p.rect('M', 12, 19, 2, 1);
    if (pose === 'release') {
      p.rect('c', 6, 29, 4, 7); // 松手后手臂垂下
      p.rect('S', 7, 35, 3, 4);
      p.rect('s', 7, 38, 3, 1);
    }
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
  if (tiptoe) {
    p.shiftUp(3); // 踮脚时从头到躯干一起升高，嘴部仍与女生对齐。
    p.rect('P', 12, 35, 4, 3); p.rect('P', 27, 35, 4, 3);
    p.rect('B', 13, 37, 5, 2); p.rect('B', 10, 39, 5, 1); p.rect('B', 8, 40, 4, 2);
    p.rect('B', 27, 37, 5, 2); p.rect('B', 25, 39, 5, 1); p.rect('B', 23, 40, 4, 2);
  }
  return p.result();
}

const girlPoses = ['down1', 'down2', 'up1', 'up2', 'side1', 'side2', 'hug', 'kiss', 'deepKiss'];
const boyPoses = [...girlPoses, 'approach', 'release'];
export const COUPLE_FRAMES = {
  girl: Object.fromEntries(girlPoses.map(pose => [pose, girlFrame(pose)])),
  boy: Object.fromEntries(boyPoses.map(pose => [pose, boyFrame(pose)])),
};
