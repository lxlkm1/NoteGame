// sprites.js —— 像素矩阵资源库：drawSprite + 人物帧（Task 4 加猫帧）
const Sprites = (() => {
  'use strict';

  const spriteCache = new WeakMap();

  function tint(hex, amount) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
    const parts = [1, 3, 5].map(i => Math.max(0, Math.min(255, parseInt(hex.slice(i, i + 2), 16) + amount)));
    return `#${parts.map(n => n.toString(16).padStart(2, '0')).join('')}`;
  }

  function detailedSprite(matrix, palette) {
    let variants = spriteCache.get(matrix);
    if (!variants) { variants = new Map(); spriteCache.set(matrix, variants); }
    const key = JSON.stringify(palette);
    if (variants.has(key)) return variants.get(key);
    const width = matrix[0].length, height = matrix.length;
    const sprite = document.createElement('canvas');
    sprite.width = width * 2; sprite.height = height * 2;
    const pen = sprite.getContext('2d');
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const ch = matrix[row][col], color = palette[ch];
        if (!color) continue;
        const x = col * 2, y = row * 2;
        pen.fillStyle = color; pen.fillRect(x, y, 2, 2);
        // 32px 精灵的单像素高光、暗边和织物颗粒。
        if (row === 0 || matrix[row - 1][col] !== ch) {
          pen.fillStyle = tint(color, 22); pen.fillRect(x, y, 2, 1);
        }
        if (row === height - 1 || matrix[row + 1][col] !== ch) {
          pen.fillStyle = tint(color, -20); pen.fillRect(x + 1, y + 1, 1, 1);
        }
        if ((col * 7 + row * 11) % 9 === 0 && row > 0 && matrix[row - 1][col] === ch) {
          pen.fillStyle = tint(color, 12); pen.fillRect(x, y, 1, 1);
        }
      }
    }
    variants.set(key, sprite);
    return sprite;
  }

  function drawSprite(ctx, matrix, palette, x, y, flip, scale = 1) {
    const sprite = detailedSprite(matrix, palette);
    ctx.imageSmoothingEnabled = false;
    const width = matrix[0].length * scale, height = matrix.length * scale;
    const drawX = Math.round(x - (width - matrix[0].length) / 2);
    const drawY = Math.round(y - (height - matrix.length));
    if (flip) {
      ctx.save();
      ctx.translate(drawX + width, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, 0, 0, width, height);
      ctx.restore();
    } else {
      ctx.drawImage(sprite, drawX, drawY, width, height);
    }
  }

  // 人物 16x16。H 发 S 肤 E 眼 C 衣 P 裤 B 鞋 | . 透明
  const PLAYER_FRAMES = {
    down1: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....HSSSSSSH....',
      '....SSESSESS....',
      '....SSSSSSSS....',
      '.....SSSSSS.....',
      '....CCCCCCCC....',
      '...CCCCCCCCCC...',
      '..SCCCCCCCCCCS..',
      '..SCCCCCCCCCCS..',
      '....PPPPPPPP....',
      '....PPP..PPP....',
      '....PPP..PPP....',
      '....BBB..BBB....',
    ],
    down2: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....HSSSSSSH....',
      '....SSESSESS....',
      '....SSSSSSSS....',
      '.....SSSSSS.....',
      '....CCCCCCCC....',
      '...CCCCCCCCCC...',
      '..SCCCCCCCCCCS..',
      '..SCCCCCCCCCCS..',
      '....PPPPPPPP....',
      '....PPP..PPP....',
      '....BBB..PPP....',
      '.........BBB....',
    ],
    up1: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '.....HHHHHH.....',
      '....CCCCCCCC....',
      '...CCCCCCCCCC...',
      '..SCCCCCCCCCCS..',
      '..SCCCCCCCCCCS..',
      '....PPPPPPPP....',
      '....PPP..PPP....',
      '....PPP..PPP....',
      '....BBB..BBB....',
    ],
    up2: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '.....HHHHHH.....',
      '....CCCCCCCC....',
      '...CCCCCCCCCC...',
      '..SCCCCCCCCCCS..',
      '..SCCCCCCCCCCS..',
      '....PPPPPPPP....',
      '....PPP..PPP....',
      '....BBB..PPP....',
      '.........BBB....',
    ],
    side1: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....HHHHSSSS....',
      '....HHHSSESS....',
      '....HHSSSSSS....',
      '.....HSSSSS.....',
      '....CCCCCCCC....',
      '...CCCCCCCCCC...',
      '...CCCCCCCCCS...',
      '...CCCCCCCCCC...',
      '....PPPPPPPP....',
      '....PPP.PPPP....',
      '....PPP.PPPP....',
      '....BBB.BBBB....',
    ],
    side2: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....HHHHSSSS....',
      '....HHHSSESS....',
      '....HHSSSSSS....',
      '.....HSSSSS.....',
      '....CCCCCCCC....',
      '...CCCCCCCCCC...',
      '...CCCCCCCCCS...',
      '...CCCCCCCCCC...',
      '....PPPPPPPP....',
      '.....PP..PPP....',
      '.....PP..PPP....',
      '.....BB..BBB....',
    ],
  };

  const PALETTE_PLAYER = {
    H: '#3d3040', S: '#f0c8a0', E: '#3a2b26',
    C: '#c25b4e', P: '#4e5a74', B: '#3a3542',
  };

  // 参考照片里的牛：小角、外张的耳朵、黑眼罩、大白眼、粉鼻和棕色斑块。
  const DUYU_COW_PALETTE = {
    O: '#382c2d', T: '#ceb99c', L: '#eadbc1', B: '#775440',
    M: '#22242b', W: '#f4efe5', K: '#2c2526', P: '#d99189',
    N: '#8b514f', H: '#493939', E: '#b8796b',
  };

  function cowFrame(pose) {
    const pixels = Array.from({ length: 32 }, () => Array(32).fill('.'));
    const rect = (ch, x, y, w, h) => {
      for (let row = Math.max(0, y); row < Math.min(32, y + h); row++)
        for (let col = Math.max(0, x); col < Math.min(32, x + w); col++) pixels[row][col] = ch;
    };
    const oval = (ch, cx, cy, rx, ry) => {
      for (let row = 0; row < 32; row++) for (let col = 0; col < 32; col++)
        if (((col - cx) / rx) ** 2 + ((row - cy) / ry) ** 2 <= 1) pixels[row][col] = ch;
    };
    const typing = pose.startsWith('typing');
    if (typing) {
      // 身体侧对电脑；右侧粉鼻和前蹄贴近键盘。
      oval('O', 14, 19, 12, 11); oval('T', 14, 18, 11, 10);
      oval('B', 8, 20, 5, 7); oval('B', 17, 24, 4, 3);
      rect('O', 4, 25, 5, 5); rect('H', 5, 28, 5, 3);
      rect('O', 18, 25, 5, 5); rect('H', 19, 28, 5, 3);
      rect('B', 6, 4, 4, 6); rect('T', 7, 3, 3, 6);
      rect('B', 20, 2, 4, 7); rect('T', 21, 2, 3, 6);
      oval('O', 15, 8, 14, 8); oval('E', 4, 8, 4, 3);
      oval('T', 19, 11, 11, 9); oval('L', 21, 8, 7, 4);
      rect('M', 17, 9, 13, 6); oval('W', 23, 11, 4, 4);
      rect('K', 25, 11, 2, 2);
      oval('P', 27, 18, 5, 4); rect('N', 29, 17, 2, 2);
      rect('T', pose === 'typing1' ? 23 : 25, 23, 6, 3);
      rect('H', pose === 'typing1' ? 27 : 28, 24, 3, 2);
    } else {
      // 走动时转向前方，完整展示照片中圆润的奶牛外形。
      oval('O', 16, 20, 13, 11); oval('T', 16, 19, 12, 10);
      oval('B', 8, 21, 4, 6); oval('B', 21, 23, 5, 4);
      rect('O', 6, 25, 6, 5); rect('H', 7, pose === 'walk1' ? 29 : 28, 5, 3);
      rect('O', 21, 25, 6, 5); rect('H', 22, pose === 'walk1' ? 28 : 29, 5, 3);
      rect('B', 8, 1, 4, 8); rect('T', 9, 1, 3, 7);
      rect('B', 21, 1, 4, 8); rect('T', 21, 1, 3, 7);
      oval('O', 4, 10, 5, 4); oval('E', 4, 10, 4, 3);
      oval('O', 28, 10, 5, 4); oval('E', 28, 10, 4, 3);
      oval('O', 16, 11, 12, 9); oval('T', 16, 11, 11, 8);
      rect('M', 6, 9, 20, 6);
      oval('W', 11, 11, 4, 4); oval('W', 21, 11, 4, 4);
      rect('K', 12, 11, 2, 2); rect('K', 20, 11, 2, 2);
      oval('P', 16, 18, 8, 5);
      rect('N', 12, 17, 2, 2); rect('N', 20, 17, 2, 2);
      rect('T', 3, 17, 4, 9); rect('H', 3, 25, 4, 3);
      rect('T', 25, 17, 4, 9); rect('H', 25, 25, 4, 3);
    }
    return pixels.map(row => row.join(''));
  }

  const DUYU_COW_FRAMES = {
    typing1: cowFrame('typing1'), typing2: cowFrame('typing2'),
    walk1: cowFrame('walk1'), walk2: cowFrame('walk2'),
  };

  function drawDuyuCow(ctx, x, y, pose) {
    const sprite = detailedSprite(DUYU_COW_FRAMES[pose], DUYU_COW_PALETTE);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, Math.round(x) - 4, Math.round(y) - 8, 24, 24);
  }

  // 猫 16x16。A 主体 B 斑纹 C 耳内/鼻 E 眼 W 白围兜 | . 透明
  const CAT_FRAMES = {
    idle1: [ // 坐姿正面
      '................',
      '................',
      '..A..........A..',
      '..AC........CA..',
      '..AAA......AAA..',
      '..AAAAAAAAAAAA..',
      '.AAAAAAAAAAAAAA.',
      '.AAEAAAAAAAAEAA.',
      '.AAAAAAAAAAAAAA.',
      '.AAAAAACCAAAAAA.',
      '.AAAWWWWWWWWAAA.',
      '..AAWWWWWWWWAA..',
      '..AAWWWWWWWWAA..',
      '..AAAWWWWWWAAA..',
      '...AAAAAAAAAA...',
      '....AA....AA....',
    ],
    idle2: [ // 眨眼
      '................',
      '................',
      '..A..........A..',
      '..AC........CA..',
      '..AAA......AAA..',
      '..AAAAAAAAAAAA..',
      '.AAAAAAAAAAAAAA.',
      '.AAAAAAAAAAAAAA.',
      '.AAAAAAAAAAAAAA.',
      '.AAAAAACCAAAAAA.',
      '.AAAWWWWWWWWAAA.',
      '..AAWWWWWWWWAA..',
      '..AAWWWWWWWWAA..',
      '..AAAWWWWWWAAA..',
      '...AAAAAAAAAA...',
      '....AA....AA....',
    ],
    walk1: [ // 侧面朝右
      '................',
      '................',
      '...........A..A.',
      '...........ACACA',
      '..........AAAAAA',
      '..........AEAAAA',
      '..........AAAAAC',
      '.A........AAAAAA',
      '.A.AAAAAAAAAAAAA',
      '..AAAAAAAAAAAAAA',
      '..AAAAAAAAAAAAAA',
      '...AAAAAAAAAAAAA',
      '....AA.....AAA..',
      '....AA.....AAA..',
      '....A......A....',
      '................',
    ],
    walk2: [
      '................',
      '................',
      '...........A..A.',
      '...........ACACA',
      '..........AAAAAA',
      '..........AEAAAA',
      '..........AAAAAC',
      '.A........AAAAAA',
      '.A.AAAAAAAAAAAAA',
      '..AAAAAAAAAAAAAA',
      '..AAAAAAAAAAAAAA',
      '...AAAAAAAAAAAAA',
      '.....AA....AA...',
      '.....AA....AA...',
      '.....A......A...',
      '................',
    ],
    eat: [ // 低头吃
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '..A..........A..',
      '..AC........CA..',
      '..AAA......AAA..',
      '..AAAAAAAAAAAA..',
      '.AABBAAAAAABBAA.',
      '.AAAAAACCAAAAAA.',
      '.AAAWWWWWWWWAAA.',
      '..AAWWWWWWWWAA..',
      '..AAAWWWWWWAAA..',
      '...AA......AA...',
    ],
    sleep: [ // 蜷缩
      '................',
      '................',
      '................',
      '................',
      '................',
      '....AAAAAAAA....',
      '...AABBBBBBAA...',
      '..AABBAAAABBAA..',
      '..ABAAAAAAAABA..',
      '..ABAAEEEEAABA..',
      '..AAAAAAAAAAAA..',
      '..AAAAAAAAAAAA..',
      '...AABBBBBBAA...',
      '....AAAAAAAA....',
      '................',
      '................',
    ],
  };

  // 咪咪的独立像素帧：黑头、金眼、白口鼻、鼻下偏侧黑斑，黑背白胸白腿。
  const MIMI_FRAMES = {
    idle1: [
      '................',
      '................',
      '..B..........B..',
      '..BC........CB..',
      '..BBB......BBB..',
      '..BBBBBBBBBBBB..',
      '.BBBBBBBBBBBBBB.',
      '.BBGBBWWWWBBGBB.',
      '.BBBBWWWWWWBBBB.',
      '.BBBWWWEEWWWBBB.',
      '.BBWWWWEBBWWWBB.',
      '..BBWWWWWWWWBB..',
      '..BBBWWWWWWBBB..',
      '..BBBWWWWWWBBB..',
      '...BWWWWWWWWB...',
      '....WW....WW....',
    ],
    idle2: [
      '................',
      '................',
      '..B..........B..',
      '..BC........CB..',
      '..BBB......BBB..',
      '..BBBBBBBBBBBB..',
      '.BBBBBBBBBBBBBB.',
      '.BBBBBWWWWBBBBB.',
      '.BBBBWWWWWWBBBB.',
      '.BBBWWWEEWWWBBB.',
      '.BBWWWWEBBWWWBB.',
      '..BBWWWWWWWWBB..',
      '..BBBWWWWWWBBB..',
      '..BBBWWWWWWBBB..',
      '...BWWWWWWWWB...',
      '....WW....WW....',
    ],
    walk1: [
      '................',
      '................',
      '...........B..B.',
      '...........BCBCB',
      '..........BBBBBB',
      '..........BGGBBB',
      '..........BWWWEE',
      '.B........BWWEBB',
      '.B.BBBBBBBBBWWWW',
      '..BBBBBBBBBBBWWW',
      '..BBBBBBBBBWWWWW',
      '...BBBBBBBBWWWWW',
      '....WW.....WWW..',
      '....WW.....WWW..',
      '....W......W....',
      '................',
    ],
    walk2: [
      '................',
      '................',
      '...........B..B.',
      '...........BCBCB',
      '..........BBBBBB',
      '..........BGGBBB',
      '..........BWWWEE',
      '.B........BWWEBB',
      '.B.BBBBBBBBBWWWW',
      '..BBBBBBBBBBBWWW',
      '..BBBBBBBBBWWWWW',
      '...BBBBBBBBWWWWW',
      '.....WW....WW...',
      '.....WW....WW...',
      '.....W......W...',
      '................',
    ],
    eat: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '..B..........B..',
      '..BC........CB..',
      '..BBB......BBB..',
      '..BBBBBBBBBBBB..',
      '.BBGBBWWWWBBGBB.',
      '.BBBWWWEEWWWBBB.',
      '.BBWWWWEBBWWWBB.',
      '..BBWWWWWWWWBB..',
      '..BBBWWWWWWBBB..',
      '...BWW....WWB...',
    ],
    sleep: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '....BBBBBBBB....',
      '...BBBBBBBBBB...',
      '..BBBBBBBBBBBB..',
      '..BBBBBWWWWBBB..',
      '..BBBGWWEWWBBB..',
      '..BBBWWEBBWWBB..',
      '..BBBBWWWWBBBB..',
      '...BBBWWWWBBB...',
      '....BBWWWWBB....',
      '................',
      '................',
    ],
  };

  const DISH = [ // 猫粮碟 10x4。K 碟沿 F 碟面 a 粮粒
    '..KKKKKK..',
    '.KFFFFFFF.',
    '.FaFFFFaF.',
    '..KKKKKK..',
  ];
  const PALETTE_DISH = { K: '#4a5a74', F: '#a8c0d8', a: '#8a5c34' };

  const HEART = [ // 好感心 7x6
    '.AA.AA.',
    'AAAAAAA',
    'AAAAAAA',
    '.AAAAA.',
    '..AAA..',
    '...A...',
  ];
  return {
    drawSprite, PLAYER_FRAMES, PALETTE_PLAYER, DUYU_COW_FRAMES, DUYU_COW_PALETTE, drawDuyuCow,
    CAT_FRAMES, MIMI_FRAMES, DISH, PALETTE_DISH, HEART,
  };
})();

if (typeof module !== 'undefined') module.exports = Sprites;
