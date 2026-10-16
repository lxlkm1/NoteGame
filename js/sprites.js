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

  // 小蠹鱼：参考图中的浅棕外套、深棕斑块和黑色眼罩。
  const DUYU_FRAME = [
    '................',
    '.....HHHHHH.....',
    '....HHHHHHHH....',
    '....HHHHHHHH....',
    '....HSSSSSSH....',
    '....SMMMMMMS....',
    '....SSESSESS....',
    '.....SSSSSS.....',
    '....CCCCCCCC....',
    '...CCCCPPCCCC...',
    '..SCCPPCCCCCCS..',
    '..SCCCCCCPPCCS..',
    '....CCCPPPCC....',
    '....DDDDDDDD....',
    '....DDD..DDD....',
    '....BBB..BBB....',
  ];
  const DUYU_PALETTE = {
    H: '#3a2d2c', S: '#e9bd9a', M: '#22232b', E: '#282127',
    C: '#c8b69d', P: '#6d4f3c', D: '#4a5268', B: '#333039',
  };

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
    drawSprite, PLAYER_FRAMES, PALETTE_PLAYER, DUYU_FRAME, DUYU_PALETTE,
    CAT_FRAMES, MIMI_FRAMES, DISH, PALETTE_DISH, HEART,
  };
})();

if (typeof module !== 'undefined') module.exports = Sprites;
