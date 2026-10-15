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

  // ---- 音频：首次按键懒初始化 BGM + M 键静音 ----
  let audioInited = false;
  function updateSoundIcon() {
    document.getElementById('sound').textContent = Sound.isMuted() ? '🔇' : '🔊';
  }
  function initAudio() {
    if (audioInited) return;
    Sound.init();
    Sound.startBgm();
    audioInited = true;
    updateSoundIcon();
  }
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return; // 忽略系统自动重复，避免 M 键长按导致静音反复切换
    const k = e.key.toLowerCase();
    if (k === 'm') {
      if (!audioInited) { Sound.init(); Sound.startBgm(); audioInited = true; }
      Sound.toggleMute();
      updateSoundIcon();
      return;
    }
    initAudio();
  });

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

  const FEED_RANGE = 40;
  const dishes = [];   // {x, y}
  const particles = []; // {x, y, vx, vy, life, ttl, kind, text?}

  function spawnHearts(x, y) {
    for (let i = 0; i < 5; i++) {
      particles.push({
        x: x + (Math.random() * 16 - 8), y: y - 4,
        vx: Math.random() * 8 - 4, vy: -18 - Math.random() * 10,
        life: 0, ttl: 1 + Math.random() * 0.5, kind: 'heart',
      });
    }
  }

  function spawnText(x, y, text) {
    particles.push({ x, y, vx: 0, vy: -10, life: 0, ttl: 1.4, kind: 'text', text });
  }

  function nearestFeedableCat() {
    let best = null, bestD = FEED_RANGE;
    for (const cat of cats) {
      const d = Math.hypot(cat.x + 8 - (player.x + 8), cat.y + 8 - (player.y + 8));
      if (d < bestD) { best = cat; bestD = d; }
    }
    return best;
  }

  function updateProgress() { // 撸猫进度：统计已投喂过的不同猫
    const met = cats.filter((c) => c.hasMet).length;
    document.getElementById('progress').textContent = `撸猫 ${met} / 10`;
  }

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'e') return;
    const cat = nearestFeedableCat();
    if (!cat) return;
    // 碟落在猫与玩家之间、猫身前 14px
    const dx = player.x - cat.x, dy = player.y - cat.y;
    const len = Math.hypot(dx, dy) || 1;
    const dishX = cat.x + (dx / len) * 14, dishY = cat.y + (dy / len) * 14 + 4;
    if (Cats.feed(cat, dishX, dishY)) { dishes.push({ x: dishX, y: dishY }); Sound.play('dish'); }
    cat.hasMet = true;
    updateProgress();
  });

  // ---- 循环 ----
  let lastT = 0;
  function loop(t) {
    const dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;
    updatePlayer(dt);
    for (const cat of cats) {
      const before = cat.hearts;
      const beforeState = cat.state;
      Cats.updateCat(cat, dt, player);
      if (cat.hearts > before) { // 刚吃完一口
        spawnHearts(cat.x + 8, cat.y);
        spawnText(cat.x + 8, cat.y - 10, '喵♪');
        Sound.play('meow', { cat });
      }
      if (beforeState === 'eat' && cat.state === 'follow') { // 满心跟随边沿
        Sound.play('follow');
      }
      if (beforeState === 'eat' && (cat.state === 'follow' || cat.state === 'wander')) { // 吃完撤碟（无论是否满心）
        if (dishes.length) dishes.shift();
      }
      if (beforeState !== 'nap' && cat.state === 'nap') { // 进入打盹边沿 → 呼噜
        Sound.play('purr');
      }
      if (cat.state === 'nap' && Math.random() < dt * 0.5) { // 睡觉偶尔冒 Z
        spawnText(cat.x + 14, cat.y - 2, 'z');
      }
    }
    render(dt);
    requestAnimationFrame(loop);
  }

  function drawDishes() {
    for (const d of dishes) {
      drawSprite(ctx, Sprites.DISH, Sprites.PALETTE_DISH, d.x, d.y);
    }
  }

  function drawParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life > p.ttl) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const alpha = 1 - p.life / p.ttl;
      ctx.globalAlpha = alpha;
      if (p.kind === 'heart') {
        drawSprite(ctx, Sprites.HEART, { A: '#ef6a8a' }, p.x, p.y);
      } else {
        ctx.fillStyle = '#f5d7e0';
        ctx.font = '8px monospace';
        ctx.fillText(p.text, p.x - 6, p.y);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawCatOverlay() { // 气泡提示 + 名牌 + 心条
    const target = nearestFeedableCat();
    for (const cat of cats) {
      const near = Math.hypot(cat.x + 8 - (player.x + 8), cat.y + 8 - (player.y + 8)) < 64;
      if (!near) continue;
      // 名牌
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1a181f';
      ctx.fillText(cat.name, cat.x + 8, cat.y - 10);
      ctx.fillStyle = '#f5f2ec';
      ctx.fillText(cat.name, cat.x + 8, cat.y - 11);
      // 5 心条
      for (let i = 0; i < 5; i++) {
        drawSprite(ctx, Sprites.HEART, { A: i < cat.hearts ? '#ef6a8a' : '#4a4453' }, cat.x - 12 + i * 8, cat.y - 8);
      }
      ctx.textAlign = 'left';
    }
    if (target) { // 「E 投喂」气泡
      const bx = target.x + 4, by = target.y - 22;
      ctx.fillStyle = '#f5f2ec';
      ctx.fillRect(bx, by, 10, 10);
      ctx.fillStyle = '#1a181f';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('E', bx + 3, by + 8);
    }
  }

  function render(dt) {
    ctx.drawImage(mapCanvas, 0, 0);
    drawDishes();
    for (const cat of cats) { // 猫转向玩家：仅 idle（wander 且未移动）时生效
      const idle = cat.state === 'wander' &&
        (cat.pauseTimer > 0 || Math.hypot(cat.targetX - cat.x, cat.targetY - cat.y) <= 2);
      const near = Math.hypot(cat.x + 8 - (player.x + 8), cat.y + 8 - (player.y + 8)) < 56;
      cat.facePlayer = idle && near;
    }
    const actors = [...cats.map((c) => ({ y: c.y, draw: () => Cats.drawCat(ctx, c, drawSprite, Sprites.CAT_FRAMES, player) })),
                    { y: player.y, draw: drawPlayer }];
    actors.sort((a, b) => a.y - b.y);
    for (const a of actors) a.draw();
    drawCatOverlay();
    drawParticles(dt);
  }

  requestAnimationFrame((t) => { lastT = t; requestAnimationFrame(loop); });
})();
