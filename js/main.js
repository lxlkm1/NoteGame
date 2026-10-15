// main.js —— 游戏循环 + 键盘输入 + 人物
(function () {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const { TILE, isSolidAtPx, buildMapCanvas } = MapKit;
  const { drawSprite, PLAYER_FRAMES, PALETTE_PLAYER } = Sprites;

  const SPEED = 70;          // px/s
  const mapCanvas = buildMapCanvas();

  // ---- 键盘 ----
  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    keys.add(e.key.toLowerCase());
    if (['arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  // ---- 人物 ----
  const player = {
    x: 10 * TILE, y: 18 * TILE, // 出生点：门内
    dir: 'up',
    moving: false,
    animTimer: 0,
  };

  function playerSolid(x, y) { // 脚部碰撞盒 (x+3, y+12, 10, 4)
    const l = x + 3, t = y + 12, r = l + 9, b = t + 3;
    return isSolidAtPx(l, t) || isSolidAtPx(r, t) ||
           isSolidAtPx(l, b) || isSolidAtPx(r, b);
  }

  function updatePlayer(dt) {
    let dx = 0, dy = 0;
    if (keys.has('w') || keys.has('arrowup'))    { dy -= 1; player.dir = 'up'; }
    if (keys.has('s') || keys.has('arrowdown'))  { dy += 1; player.dir = 'down'; }
    if (keys.has('a') || keys.has('arrowleft'))  { dx -= 1; player.dir = 'left'; }
    if (keys.has('d') || keys.has('arrowright')) { dx += 1; player.dir = 'right'; }
    player.moving = dx !== 0 || dy !== 0;
    if (!player.moving) { player.animTimer = 0; return; }

    const len = Math.hypot(dx, dy);
    const mx = (dx / len) * SPEED * dt;
    const my = (dy / len) * SPEED * dt;
    if (!playerSolid(player.x + mx, player.y)) player.x += mx; // 分轴：先 x 后 y
    if (!playerSolid(player.x, player.y + my)) player.y += my;
    player.x = Math.max(0, Math.min(480 - 16, player.x));
    player.y = Math.max(0, Math.min(320 - 16, player.y));
    player.animTimer += dt;
  }

  // 帧选择统一入口：静止=帧1，移动=0.15s 两帧交替；left/right 共用 side 帧，left 绘制时翻转
  function frameKey() {
    const f = player.moving ? (Math.floor(player.animTimer / 0.15) % 2) + 1 : 1;
    const base = (player.dir === 'left' || player.dir === 'right') ? 'side' : player.dir;
    return base + f;
  }

  function drawPlayer() {
    drawSprite(ctx, PLAYER_FRAMES[frameKey()], PALETTE_PLAYER,
               player.x, player.y, player.dir === 'left');
  }

  const cats = Cats.createCats();

  // ---- 循环 ----
  let lastT = 0;
  function loop(t) {
    const dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;
    updatePlayer(dt);
    for (const cat of cats) Cats.updateCat(cat, dt);
    render();
    requestAnimationFrame(loop);
  }

  function render() {
    ctx.drawImage(mapCanvas, 0, 0);
    const actors = [...cats.map((c) => ({ y: c.y, draw: () => Cats.drawCat(ctx, c, drawSprite, Sprites.CAT_FRAMES) })),
                    { y: player.y, draw: drawPlayer }];
    actors.sort((a, b) => a.y - b.y);
    for (const a of actors) a.draw();
  }

  requestAnimationFrame((t) => { lastT = t; requestAnimationFrame(loop); });
})();
