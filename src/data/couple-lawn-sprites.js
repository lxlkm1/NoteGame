import { COUPLE_FRAMES, COUPLE_PALETTES } from './couple-sprites.js';

// 两人的坐姿共用一张画布，远臂先画在女生背后，近臂再环过腰前。
export const COUPLE_LAWN_ANCHOR = { x: 40, y: 56 };

const boyKeys = {
  Y: 'Y', y: 'y', h: 'q', Z: 'Z', S: 'T', s: 't', E: 'e',
  R: 'r', M: 'm', C: 'U', c: 'u', J: 'J', V: 'V',
  L: 'l', P: 'p', B: 'b', W: 'v',
};

export const COUPLE_LAWN_PALETTE = {
  ...COUPLE_PALETTES.girl,
  ...Object.fromEntries(Object.entries(boyKeys).map(([key, mapped]) => [mapped, COUPLE_PALETTES.boy[key]])),
  Q: '#e67d89', // 抱紧时加深的脸红
};

function canvas() {
  const pixels = Array.from({ length: 56 }, () => Array(64).fill('.'));
  const dot = (key, x, y) => {
    if (x >= 0 && x < 64 && y >= 0 && y < 56) pixels[y][x] = key;
  };
  const rect = (key, x, y, width, height) => {
    for (let row = y; row < y + height; row++)
      for (let col = x; col < x + width; col++) dot(key, col, row);
  };
  const oval = (key, cx, cy, rx, ry) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) dot(key, x, y);
  };
  const line = (key, points, width) => {
    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let step = 0; step <= steps; step++) {
        const t = steps ? step / steps : 0;
        const x = Math.round(x0 + (x1 - x0) * t);
        const y = Math.round(y0 + (y1 - y0) * t);
        if (width === 0) dot(key, x, y);
        else oval(key, x, y, width, width);
      }
    }
  };
  const stamp = (frame, dx, dy, fromRow = 0, toRow = frame.length, keys = null) => {
    for (let y = fromRow; y < toRow; y++)
      for (let x = 0; x < frame[y].length; x++)
        if (frame[y][x] !== '.') dot(keys ? keys[frame[y][x]] : frame[y][x], x + dx, y + dy);
  };
  return { rect, oval, line, stamp, result: () => pixels.map(row => row.join('')) };
}

function seatedBoy(p) {
  // 弯膝的裤腿压在草坪上，鞋底与画布脚点相接。
  p.oval('b', 37, 51, 13, 4);
  p.oval('p', 37, 49, 12, 4);
  p.oval('b', 51, 52, 9, 3);
  p.oval('p', 49, 49, 9, 4);
  p.rect('u', 32, 48, 8, 1);
  p.rect('v', 33, 49, 3, 1);
  p.rect('b', 26, 52, 9, 4);
  p.rect('b', 52, 52, 10, 4);
  p.rect('u', 54, 53, 4, 1);

  p.oval('J', 45, 41, 10, 9);
  p.rect('U', 36, 36, 18, 10);
  p.rect('V', 39, 37, 8, 9);
  p.rect('J', 36, 37, 4, 11);
  p.rect('J', 47, 36, 5, 12);
  p.rect('u', 51, 38, 2, 8);
  p.rect('l', 42, 46, 5, 1);
  p.rect('l', 46, 47, 1, 2);
  // 黄发、侧脸和耳钉沿用原像素比例；男生看向坐在身前的女生。
  p.stamp(COUPLE_FRAMES.boy.side1, 27, 17, 3, 26, boyKeys);
}

function seatedGirl(p, tight) {
  const dx = tight ? 4 : 3;
  // 女生侧坐在大腿上，膝盖与鞋尖朝左，白裙铺在弯曲的腿上。
  p.line('s', [[26 + dx, 49], [19 + dx, 53], [13 + dx, 53]], 2);
  p.line('S', [[26 + dx, 48], [19 + dx, 52], [13 + dx, 52]], 1);
  p.rect('B', 8 + dx, 52, 7, 3);
  p.rect('P', 9 + dx, 52, 3, 1);
  p.line('s', [[31 + dx, 49], [25 + dx, 54], [20 + dx, 54]], 2);
  p.line('S', [[31 + dx, 49], [25 + dx, 53], [20 + dx, 53]], 1);
  p.rect('B', 15 + dx, 53, 7, 3);

  // 臀部高于男生坐在地上的裤腿，脚仍向草坪垂下，读起来是坐在腿上。
  const base = p;
  p = {
    rect: (key, x, y, w, h) => base.rect(key, x, y - 2, w, h),
    oval: (key, x, y, rx, ry) => base.oval(key, x, y - 2, rx, ry),
    line: (key, points, width) => base.line(key, points.map(([x, y]) => [x, y - 2]), width),
    stamp: (frame, x, y, from, to) => base.stamp(frame, x, y - 2, from, to),
  };

  p.oval('d', 29 + dx, 48, 13, 5);
  p.oval('w', 29 + dx, 47, 13, 5);
  p.oval('W', 29 + dx, 46, 12, 5);
  p.rect('w', 19 + dx, 49, 15, 1);
  p.rect('d', 20 + dx, 51, 15, 1);
  p.line('w', [[23 + dx, 43], [20 + dx, 47]], 0);
  p.line('w', [[30 + dx, 43], [33 + dx, 48]], 0);
  p.oval('w', 30 + dx, 41, 7, 7);
  p.oval('W', 29 + dx, 40, 6, 7);
  p.rect('s', 26 + dx, 35, 4, 3);
  p.rect('C', 26 + dx, 37, 6, 2);
  p.rect('A', 28 + dx, 39, 2, 2);

  // 缩小后的刘海、小猫发饰和侧发直接取自已有角色。
  p.stamp(COUPLE_FRAMES.girl.down1, 7 + dx, 15, 4, 26);
  // 眼睛略低，手放在膝上，脸红随着收紧拥抱而增强。
  p.rect('S', 24 + dx, 33, 1, 1);
  p.rect('S', 30 + dx, 33, 1, 1);
  p.rect('E', 24 + dx, 34, 2, 1);
  p.rect('E', 30 + dx, 34, 2, 1);
  p.rect(tight ? 'Q' : 'R', 22 + dx, 35, 3, tight ? 2 : 1);
  p.rect(tight ? 'Q' : 'R', 30 + dx, 35, 3, tight ? 2 : 1);
  p.rect('M', 27 + dx, 37, 1, 1);
  p.line('w', [[23 + dx, 40], [21 + dx, 44]], 2);
  p.line('W', [[23 + dx, 40], [22 + dx, 44]], 1);
  p.line('S', [[22 + dx, 44], [24 + dx, 48]], 1);
  p.line('w', [[34 + dx, 40], [34 + dx, 44]], 2);
  p.line('W', [[34 + dx, 40], [33 + dx, 44]], 1);
  p.line('S', [[33 + dx, 44], [28 + dx, 49]], 1);
}

function farEmbracingArm(p, tight) {
  // 远臂沿背后绕向远侧肩头；袖子和手掌都先画，随后由女生遮挡。
  const points = tight
    ? [[43, 37], [34, 36], [27, 38]]
    : [[43, 38], [33, 38], [26, 40]];
  p.line('J', points, 2);
  p.line('U', points, 1);
  p.oval('T', tight ? 27 : 26, tight ? 38 : 40, 2, 1);
}

function nearEmbracingArm(p, tight) {
  // 画面前方只有这一条近臂，从肩膀连续弯至腰前；抱紧时肘部向内收。
  const points = tight
    ? [[51, 38], [48, 42], [39, 44], [30, 42]]
    : [[53, 39], [52, 45], [42, 47], [31, 44]];
  p.line('J', points, 2);
  p.line('U', points, 1);
  p.line('u', tight ? [[46, 43], [39, 44], [33, 43]] : [[49, 46], [42, 47], [35, 45]], 0);
  const handX = tight ? 28 : 29;
  const handY = tight ? 42 : 44;
  p.oval('t', handX, handY, 3, 1);
  p.rect('T', handX - 2, handY - 1, 5, 2);
}

function lawnFrame(pose) {
  const p = canvas();
  if (pose === 'lawnRise') {
    p.stamp(COUPLE_FRAMES.boy.release, 20, 14, 0, 42, boyKeys);
    p.stamp(COUPLE_FRAMES.girl.down1, 0, 8);
    p.rect('R', 14, 28, 3, 1);
    p.rect('R', 23, 28, 3, 1);
    return p.result();
  }

  seatedBoy(p);
  if (pose === 'lawnSit') {
    p.line('J', [[53, 39], [56, 45], [57, 51]], 2);
    p.line('U', [[53, 39], [56, 45], [57, 51]], 1);
    p.oval('T', 57, 52, 3, 2); // 手撑地，先坐稳。
    p.line('U', [[36, 40], [31, 45]], 2);
    p.oval('T', 30, 46, 3, 2);
    p.stamp(COUPLE_FRAMES.girl.down1, 0, 8);
    return p.result();
  }

  const tight = pose === 'lawnHoldTight';
  farEmbracingArm(p, tight);
  seatedGirl(p, tight);
  if (pose === 'lawnLap') {
    p.line('J', [[53, 39], [56, 45], [57, 50]], 2);
    p.line('U', [[53, 39], [56, 45], [57, 50]], 1);
    p.oval('T', 57, 51, 3, 2);
  } else {
    nearEmbracingArm(p, tight);
  }
  // 女生自己的双手始终留在膝头，动作读起来更安静、羞涩。
  const dx = tight ? 4 : 3;
  p.oval('s', 23 + dx, 47, 2, 1);
  p.rect('S', 21 + dx, 46, 4, 1);
  p.oval('s', 27 + dx, 48, 2, 1);
  p.rect('S', 25 + dx, 47, 4, 1);
  return p.result();
}

export const COUPLE_LAWN_FRAMES = Object.fromEntries(
  ['lawnSit', 'lawnLap', 'lawnHold', 'lawnHoldTight', 'lawnRise'].map(pose => [pose, lawnFrame(pose)]),
);
