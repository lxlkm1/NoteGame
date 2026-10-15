// sprites.js —— 像素矩阵资源库：drawSprite + 人物帧（Task 4 加猫帧）
const Sprites = (() => {
  'use strict';

  function drawSprite(ctx, matrix, palette, x, y, flip) {
    for (let row = 0; row < matrix.length; row++) {
      const line = matrix[row];
      for (let col = 0; col < line.length; col++) {
        const ch = line[flip ? line.length - 1 - col : col];
        const color = palette[ch];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x) + col, Math.round(y) + row, 1, 1);
      }
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

  return { drawSprite, PLAYER_FRAMES, PALETTE_PLAYER };
})();

if (typeof module !== 'undefined') module.exports = Sprites;
