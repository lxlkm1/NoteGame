// 情侣独立原生像素画：女生 32×36、男生 32×32。字符对应调色板颜色。
export const COUPLE_PALETTES = {
  girl: {
    H: '#47303a', F: '#67414a', L: '#2c2631', h: '#865b60',
    S: '#f0c5ab', s: '#dba88f', R: '#dc8f91', E: '#382d32', W: '#fff3df',
    C: '#c97991', c: '#e5a9b8', D: '#ad5978', d: '#db839e',
    P: '#65566b', B: '#493d4a',
  },
  boy: {
    Y: '#d8aa3a', y: '#f6d45f', h: '#8b622a', Z: '#fff09a',
    S: '#eac19e', s: '#cf9e7e', E: '#342b2a', R: '#a96b63',
    C: '#3d404a', c: '#686b72', J: '#252932', W: '#e2d5ba',
    P: '#4d4a54', B: '#292a31',
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
  const p = canvas(32, 36);
  const side = ['side1', 'side2', 'hug', 'kiss'].includes(pose);
  const up = pose.startsWith('up');
  const step = pose.endsWith('2');
  // 收窄上身与裙摆，拉长腿，脚底始终在第 36 行。
  p.rect('S', step ? 11 : 12, 29, 3, 5);
  p.rect('S', step ? 20 : 19, 29, 3, 5);
  p.rect('B', step ? 10 : 11, 34, 5, 2);
  p.rect('B', step ? 19 : 18, 34, 5, 2);
  p.oval('D', 16, 26, 9, 5);
  p.rect('d', 10, 27, 12, 1);
  p.rect('D', 8, 29, 16, 1);
  p.oval('C', 16, 20, 6, 5);
  p.rect('c', 13, 17, 6, 1);
  p.rect('s', 14, 16, 4, 2);
  p.oval('S', 9, 21, 2, 4);
  p.oval('S', 23, 21, 2, 4);
  if (up) {
    p.oval('L', 16, 10, 8, 9);
    p.oval('H', 16, 9, 7, 7);
    p.rect('F', 11, 6, 10, 2);
    p.rect('h', 13, 5, 5, 1);
    p.rect('L', 9, 15, 3, 5);
  } else if (side) {
    const lean = pose === 'kiss' ? 2 : 0;
    p.oval('L', 15 + lean, 10, 8, 9);
    p.oval('H', 16 + lean, 8, 7, 6);
    p.oval('S', 19 + lean, 12, 5, 5);
    p.rect('F', 19 + lean, 5, 5, 3);
    p.rect('F', 22 + lean, 8, 3, 2);
    p.rect('h', 14 + lean, 4, 6, 1);
    p.rect('E', 22 + lean, 12, 1, 2);
    p.rect('R', 20 + lean, 15, 2, 1);
    p.rect('L', 8 + lean, 11, 3, 10);
    if (pose === 'hug') { p.rect('S', 22, 20, 8, 2); p.rect('s', 28, 21, 2, 1); }
    if (pose === 'kiss') p.rect('S', 25, 15, 2, 1);
  } else {
    p.oval('L', 16, 11, 8, 9);
    p.oval('H', 16, 8, 8, 6);
    p.oval('S', 16, 12, 6, 5);
    p.rect('F', 10, 6, 12, 2);
    p.rect('F', 11, 8, 4, 2);
    p.rect('F', 18, 8, 3, 2);
    p.rect('h', 13, 4, 6, 1);
    p.rect('E', 12, 13, 1, 1);
    p.rect('E', 20, 13, 1, 1);
    p.rect('R', 10, 15, 2, 1);
    p.rect('R', 21, 15, 2, 1);
    p.rect('s', 15, 16, 2, 1);
    p.rect('L', 8, 12, 2, 8);
    p.rect('L', 23, 12, 2, 8);
  }
  return p.result();
}

function boyFrame(pose) {
  const p = canvas(32, 32);
  const side = ['side1', 'side2', 'hug', 'kiss'].includes(pose);
  const up = pose.startsWith('up');
  const step = pose.endsWith('2');
  // 宽松外套、插兜与外八站姿；头顶比女生低四个地图像素。
  p.rect('P', step ? 10 : 9, 25, 5, 5);
  p.rect('P', step ? 21 : 19, 25, 5, 5);
  p.rect('B', step ? 8 : 7, 29, 8, 3);
  p.rect('B', step ? 20 : 19, 29, 8, 3);
  p.oval('J', 16, 20, 10, 6);
  p.rect('C', 8, 17, 16, 7);
  p.rect('J', 14, 17, 4, 8);
  p.rect('c', 10, 18, 2, 5);
  p.rect('c', 21, 18, 2, 5);
  p.oval('S', 7, 22, 2, 3);
  p.oval('S', 25, 22, 2, 3);
  if (up) {
    p.oval('h', 16, 10, 9, 7);
    p.oval('Y', 16, 9, 8, 6);
    p.rect('y', 11, 4, 5, 2);
    p.rect('Y', 20, 3, 3, 4);
    p.rect('Y', 22, 6, 4, 2);
    p.rect('Z', 18, 5, 3, 1);
    p.rect('h', 9, 14, 3, 2);
  } else if (side) {
    const lean = pose === 'kiss' ? -1 : 0;
    p.oval('h', 16 + lean, 10, 9, 7);
    p.oval('Y', 16 + lean, 8, 9, 6);
    p.oval('S', 12 + lean, 13, 5, 4);
    p.rect('Y', 6 + lean, 7, 8, 3);
    p.rect('y', 7 + lean, 5, 5, 2);
    p.rect('Y', 14 + lean, 2, 3, 4);
    p.rect('Y', 22 + lean, 5, 4, 2);
    p.rect('Z', 12 + lean, 4, 4, 1);
    p.rect('E', 7 + lean, 11, 6, 1); // 压低的眉毛
    p.rect('E', 8 + lean, 12, 4, 1);
    p.rect('E', 9 + lean, 13, 2, 1);
    p.rect('R', 8 + lean, 16, 3, 1);
    if (pose === 'hug') { p.rect('S', 1, 21, 8, 2); p.rect('s', 1, 22, 3, 1); }
    if (pose === 'kiss') p.rect('S', 5, 16, 2, 1);
  } else {
    p.oval('h', 16, 10, 9, 7);
    p.oval('S', 16, 13, 6, 5);
    p.oval('Y', 16, 7, 9, 5);
    p.rect('Y', 11, 2, 3, 5);
    p.rect('Y', 19, 1, 4, 6);
    p.rect('y', 8, 5, 6, 2);
    p.rect('Y', 7, 9, 5, 2);
    p.rect('Y', 22, 6, 5, 3);
    p.rect('Z', 17, 3, 5, 1);
    p.rect('E', 9, 11, 5, 1);
    p.rect('E', 11, 12, 4, 1);
    p.rect('E', 19, 12, 4, 1);
    p.rect('E', 21, 11, 5, 1);
    p.rect('E', 11, 13, 2, 1);
    p.rect('E', 20, 13, 2, 1);
    p.rect('s', 15, 15, 3, 1);
    p.rect('R', 16, 17, 3, 1); // 紧抿的嘴
  }
  return p.result();
}

const poses = ['down1', 'down2', 'up1', 'up2', 'side1', 'side2', 'hug', 'kiss'];
export const COUPLE_FRAMES = {
  girl: Object.fromEntries(poses.map(pose => [pose, girlFrame(pose)])),
  boy: Object.fromEntries(poses.map(pose => [pose, boyFrame(pose)])),
};
