// 情侣专用 24×24 原生像素画。每个字符对应调色板中的一种颜色。
export const COUPLE_PALETTES = {
  girl: {
    H: '#53383e', F: '#70454a', L: '#362a32', S: '#edc0a6', s: '#dba58f',
    E: '#352b32', R: '#d98683', C: '#b96c83', c: '#e7a1ad', D: '#a95372',
    d: '#d67f99', P: '#564a60', B: '#443947', W: '#fff0dc',
  },
  boy: {
    Y: '#e6ba50', y: '#f8da79', h: '#a47b33', S: '#ebc4a2', s: '#d9a888',
    E: '#3c302b', C: '#7195a0', c: '#a1bac0', D: '#517282', P: '#3d5670',
    B: '#393b47', W: '#faf2dc',
  },
};

function canvas() {
  const pixels = Array.from({ length: 24 }, () => Array(24).fill('.'));
  const rect = (key, x, y, w, h) => {
    for (let row = Math.max(0, y); row < Math.min(24, y + h); row++)
      for (let col = Math.max(0, x); col < Math.min(24, x + w); col++) pixels[row][col] = key;
  };
  const oval = (key, cx, cy, rx, ry) => {
    for (let row = Math.max(0, Math.floor(cy - ry)); row <= Math.min(23, Math.ceil(cy + ry)); row++)
      for (let col = Math.max(0, Math.floor(cx - rx)); col <= Math.min(23, Math.ceil(cx + rx)); col++)
        if (((col - cx) / rx) ** 2 + ((row - cy) / ry) ** 2 <= 1) pixels[row][col] = key;
  };
  return { rect, oval, result: () => pixels.map(row => row.join('')) };
}

function girlFrame(pose) {
  const p = canvas();
  const side = ['side1', 'side2', 'hug', 'kiss'].includes(pose);
  const up = pose.startsWith('up');
  const step = pose.endsWith('2');
  // 双腿和圆润裙摆先画，手臂最后盖在衣身上。
  p.rect('S', step ? 8 : 9, 20, 3, 3);
  p.rect('S', step ? 15 : 14, 20, 3, 3);
  p.rect('B', step ? 7 : 9, 22, 4, 2);
  p.rect('B', step ? 15 : 14, 22, 4, 2);
  p.oval('D', 12, 18, 8, 4);
  p.rect('d', 6, 18, 12, 1);
  p.rect('D', 5, 20, 14, 1);
  p.oval('C', 12, 14, 6, 4);
  p.rect('c', 9, 12, 6, 1);
  p.oval('S', 5, 15, 2, 3);
  p.oval('S', 19, 15, 2, 3);
  if (up) {
    p.oval('L', 12, 7, 7, 6);
    p.oval('H', 12, 6, 6, 5);
    p.rect('F', 7, 9, 10, 1);
  } else if (side) {
    p.oval('L', 11, 7, 7, 6);
    p.oval('H', 12, 6, 6, 5);
    p.oval('S', pose === 'kiss' ? 15 : 14, 8, 5, 4);
    p.rect('F', 14, 4, 4, 3);
    p.rect('F', 16, 6, 3, 1);
    p.rect('E', 17, 8, 1, 1);
    p.rect('R', 15, 10, 2, 1);
    p.rect('L', 5, 8, 3, 7);
    if (pose === 'hug') { p.rect('S', 16, 14, 7, 2); p.rect('s', 20, 15, 3, 1); }
    if (pose === 'kiss') p.rect('S', 19, 10, 2, 1);
  } else {
    p.oval('L', 12, 8, 7, 7);
    p.oval('H', 12, 6, 7, 5);
    p.oval('S', 12, 8, 5, 4);
    p.rect('F', 7, 5, 10, 2);
    p.rect('F', 8, 7, 3, 1);
    p.rect('F', 13, 7, 3, 1);
    p.rect('E', 9, 9, 1, 1);
    p.rect('E', 14, 9, 1, 1);
    p.rect('R', 7, 10, 2, 1);
    p.rect('R', 15, 10, 2, 1);
    p.rect('s', 11, 11, 2, 1);
    p.rect('L', 5, 7, 2, 7);
    p.rect('L', 17, 7, 2, 7);
  }
  return p.result();
}

function boyFrame(pose) {
  const p = canvas();
  const side = ['side1', 'side2', 'hug', 'kiss'].includes(pose);
  const up = pose.startsWith('up');
  const step = pose.endsWith('2');
  p.rect('S', step ? 8 : 9, 19, 4, 4);
  p.rect('S', step ? 15 : 14, 19, 4, 4);
  p.rect('B', step ? 7 : 8, 22, 5, 2);
  p.rect('B', step ? 15 : 14, 22, 5, 2);
  p.rect('P', 7, 17, 10, 4);
  p.rect('D', 6, 18, 12, 1);
  p.oval('C', 12, 14, 7, 5);
  p.rect('c', 9, 12, 6, 1);
  p.oval('S', 4, 15, 2, 3);
  p.oval('S', 20, 15, 2, 3);
  if (up) {
    p.oval('h', 12, 7, 7, 5);
    p.oval('Y', 12, 6, 6, 4);
    p.rect('y', 9, 4, 7, 1);
  } else if (side) {
    p.oval('h', 12, 7, 7, 5);
    p.oval('Y', 12, 5, 7, 4);
    p.oval('S', pose === 'kiss' ? 8 : 9, 8, 4, 3);
    p.rect('y', 5, 5, 7, 2);
    p.rect('Y', 6, 7, 2, 1);
    p.rect('E', 7, 9, 1, 1);
    if (pose === 'hug') { p.rect('S', 1, 14, 8, 2); p.rect('s', 1, 15, 3, 1); }
    if (pose === 'kiss') p.rect('S', 3, 10, 2, 1);
  } else {
    p.oval('h', 12, 6, 7, 5);
    p.oval('S', 12, 8, 5, 4);
    p.oval('Y', 12, 4, 7, 3);
    p.rect('y', 8, 2, 8, 1);
    p.rect('Y', 6, 5, 12, 2);
    p.rect('Y', 6, 7, 4, 1);
    p.rect('E', 9, 9, 1, 1);
    p.rect('E', 14, 9, 1, 1);
    p.rect('s', 11, 11, 2, 1);
  }
  return p.result();
}

const poses = ['down1', 'down2', 'up1', 'up2', 'side1', 'side2', 'hug', 'kiss'];
export const COUPLE_FRAMES = {
  girl: Object.fromEntries(poses.map(pose => [pose, girlFrame(pose)])),
  boy: Object.fromEntries(poses.map(pose => [pose, boyFrame(pose)])),
};
