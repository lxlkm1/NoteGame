// main.js —— 游戏循环 + 键盘输入 + 人物
(function () {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.setTransform(MapKit.ART_SCALE, 0, 0, MapKit.ART_SCALE, 0, 0); // 世界坐标仍是 16px/格
  ctx.imageSmoothingEnabled = false;
  const { TILE, isSolidAtPx, doorDestAt, buildCanvas } = MapKit;
  const { drawSprite, PLAYER_FRAMES, PALETTE_PLAYER } = Sprites;
  const TILES = MAPS.tiles;

  const SPEED = 70;          // px/s
  // 场景配置 + 预渲染画布
  const scenes = {
    atrium: { data: MAPS.atrium, canvas: buildCanvas(MAPS.atrium, TILES) },
    reading: { data: MAPS.reading, canvas: buildCanvas(MAPS.reading, TILES) },
    toilet: { data: MAPS.toilet, canvas: buildCanvas(MAPS.toilet, TILES) },
    outside: { data: MAPS.outside, canvas: buildCanvas(MAPS.outside, TILES) },
  };
  let scene = 'atrium';
  let currentMap = scenes.atrium.data.map;
  let atriumPos = { x: MAPS.atrium.spawn.col * TILE, y: MAPS.atrium.spawn.row * TILE };

  // ---- 键盘 ----
  const keys = new Set();
  const mobileLayout = window.matchMedia('(hover: none) and (pointer: coarse)');
  const mobileZoom = 2.5;
  function resizeViewport() {
    if (mobileLayout.matches) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * MapKit.ART_SCALE));
      canvas.height = Math.max(1, Math.round(rect.height * MapKit.ART_SCALE));
    } else {
      canvas.width = 1248;
      canvas.height = 960;
    }
    ctx.imageSmoothingEnabled = false;
  }
  resizeViewport();
  window.addEventListener('resize', resizeViewport);
  window.visualViewport?.addEventListener('resize', resizeViewport);
  if (window.ResizeObserver) new ResizeObserver(resizeViewport).observe(canvas);
  window.addEventListener('keydown', (e) => {
    keys.add(e.key.toLowerCase());
    if (['arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  // ---- 音频：首次按键懒初始化 BGM + M 键静音 ----
  let audioInited = false;
  function updateSoundIcon() {
    document.getElementById('sound').textContent = Sound.isMuted() ? '🔇 音乐' : '🔊 音乐';
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
    x: MAPS.atrium.spawn.col * TILE,
    y: MAPS.atrium.spawn.row * TILE, // 出生点读配置：大门口内侧
    dir: 'up',
    moving: false,
    animTimer: 0,
  };

  function playerSolid(x, y) { // 脚部碰撞盒 (x+3, y+12, 10, 4)
    const l = x + 3, t = y + 12, r = l + 9, b = t + 3;
    return isSolidAtPx(l, t, currentMap, TILES) || isSolidAtPx(r, t, currentMap, TILES) ||
           isSolidAtPx(l, b, currentMap, TILES) || isSolidAtPx(r, b, currentMap, TILES);
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
    player.x = Math.max(0, Math.min(currentMap[0].length * TILE - 16, player.x));
    player.y = Math.max(0, Math.min(currentMap.length * TILE - 16, player.y));
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
               player.x, player.y, player.dir === 'left', 1.5);
  }

  const cats = Cats.createCats(); // 普通猫固定生活在室外
  const npcs = NPCs.create(MAPS);
  let mimi = null;
  let mimiHearts = 0;
  let mimiMet = false;
  let bowls = [];

  const FEED_RANGE = 40;
  const dishes = [];   // {catId, x, y}
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
      if (cat.state === 'gotoFood' || cat.state === 'eat') continue;
      const d = Math.hypot(cat.x + 8 - (player.x + 8), cat.y + 8 - (player.y + 8));
      if (d < bestD) { best = cat; bestD = d; }
    }
    return best;
  }

  function updateProgress() { // 撸猫进度：统计已投喂过的不同猫
    const met = cats.filter((c) => c.hasMet).length + Number(mimiMet);
    document.getElementById('progress').textContent = `撸猫 ${met} / 11`;
  }

  function doorAtPlayer() { // 玩家脚部中心所在格的字符即目的地（tiles portal），返回 { to } 或 null
    const dest = doorDestAt(player.x + 8, player.y + 15, currentMap, TILES);
    return dest ? { to: dest } : null;
  }

  function enterRoom(name) {
    atriumPos = { x: player.x, y: name === 'outside' ? (MAPS.atrium.map.length - 2) * TILE : player.y };
    scene = name;
    currentMap = scenes[name].data.map;
    const entry = scenes[name].data.entry;
    player.x = entry.col * TILE;
    player.y = entry.row * TILE;
    player.dir = 'down';
    if (name === 'outside') {
      bowls = Bowls.create();
      const site = Math.random() < 0.5 ? MAPS.outside.mimiSites.left : MAPS.outside.mimiSites.right;
      mimi = Mimi.shouldAppear(Math.random()) ? Mimi.create(site, mimiHearts) : null;
    }
    Sound.setBgmTrack(name);
    particles.length = 0;
  }

  function exitRoom() {
    const cameFromOutside = scene === 'outside';
    scene = 'atrium';
    currentMap = scenes.atrium.data.map;
    player.x = atriumPos.x;
    player.y = atriumPos.y;
    if (cameFromOutside) player.dir = 'up';
    if (cameFromOutside) mimi = null;
    Sound.setBgmTrack('atrium');
    particles.length = 0;
  }

  function interact() {
    const door = doorAtPlayer();
    if (door) {
      if (door.to === 'atrium') { exitRoom(); return; }
      enterRoom(door.to);
      return;
    }
    if (scene === 'outside') {
      const bowl = Bowls.nearestEmpty(bowls, player);
      if (bowl) {
        bowl.filled = true;
        if (mimi) Mimi.offerBowlFood(mimi, bowl);
        Sound.play('dish');
        return;
      }
      const cat = nearestFeedableCat();
      if (cat) {
        const dx = player.x - cat.x, dy = player.y - cat.y;
        const len = Math.hypot(dx, dy) || 1;
        let dishX = cat.x + (dx / len) * 14;
        let dishY = cat.y + (dy / len) * 14 + 4;
        if (playerSolid(dishX, dishY)) { dishX = cat.x; dishY = cat.y; }
        if (Cats.feed(cat, dishX, dishY)) {
          dishes.push({ catId: cat.id, x: dishX, y: dishY });
          Sound.play('dish');
          cat.hasMet = true;
          updateProgress();
        }
        return;
      }
      if (Mimi.offerFood(mimi, player, currentMap, TILES)) Sound.play('dish');
    }
    return;
  }
  window.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'e' && !e.repeat) interact(); });
  for (const button of document.querySelectorAll('#dpad [data-key]')) {
    const key = button.dataset.key;
    button.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      button.setPointerCapture(e.pointerId);
      keys.add(key);
      button.classList.add('pressed');
      initAudio();
    });
    const release = (e) => {
      e.preventDefault();
      keys.delete(key);
      button.classList.remove('pressed');
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  }
  document.getElementById('interact').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    initAudio();
    interact();
  });
  document.getElementById('sound').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!audioInited) { initAudio(); return; }
    Sound.toggleMute();
    if (!Sound.isMuted()) Sound.startBgm();
    updateSoundIcon();
  });
  // iOS Safari may grant media playback only when the touch gesture finishes.
  document.addEventListener('touchend', () => {
    if (!mobileLayout.matches || Sound.isMuted()) return;
    if (!audioInited) initAudio();
    else Sound.startBgm();
  }, { passive: true });
  document.getElementById('fullscreen').addEventListener('click', async () => {
    const wrap = document.getElementById('game-wrap');
    const tip = document.getElementById('fullscreen-tip');
    tip.hidden = true;
    tip.textContent = '';
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (wrap.requestFullscreen) {
        await wrap.requestFullscreen();
        if (screen.orientation?.lock) {
          try { await screen.orientation.lock('landscape'); } catch (_) { /* 用户仍可手动横屏 */ }
        }
      }
      else tip.textContent = '此浏览器不支持网页全屏。可将 NoteGame 添加到手机主屏幕，再从主屏幕打开。';
    } catch (err) {
      tip.textContent = `全屏未开启（${err.name || '浏览器限制'}）。请直接在 Chrome 中打开游戏，再点全屏。`;
    }
    if (tip.textContent) tip.hidden = false;
    requestAnimationFrame(resizeViewport);
  });
  document.addEventListener('fullscreenchange', () => {
    document.getElementById('fullscreen').textContent = document.fullscreenElement ? '⛶ 退出全屏' : '⛶ 全屏';
    requestAnimationFrame(resizeViewport);
  });

  // ---- 循环 ----
  let lastT = 0;
  function loop(t) {
    const dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;
    updatePlayer(dt);
    NPCs.updateDuyuDialogue(npcs, player, scene, dt);
    for (const event of NPCs.update(npcs, dt, scene === 'outside' ? cats : [])) {
      if (event.type === 'feed' && Cats.feed(event.cat, event.x, event.y, 'npc')) {
        dishes.push({ catId: event.cat.id, x: event.x, y: event.y });
        Sound.play('dish');
      }
    }
    if (scene === 'outside') {
      for (const cat of cats) {
        const before = cat.hearts;
        const beforeState = cat.state;
        Cats.updateCat(cat, dt, player, currentMap, TILES);
        if (cat.hearts > before) { // 刚吃完一口
          spawnHearts(cat.x + 8, cat.y);
          spawnText(cat.x + 8, cat.y - 10, '喵♪');
          Sound.play('meow', { cat });
        }
        if (beforeState === 'eat' && cat.state === 'follow') { // 满心跟随边沿
          Sound.play('follow');
        }
        if (beforeState === 'eat' && (cat.state === 'follow' || cat.state === 'wander')) { // 吃完撤碟（无论是否满心）
          const dishIndex = dishes.findIndex(dish => dish.catId === cat.id);
          if (dishIndex >= 0) dishes.splice(dishIndex, 1);
        }
        if (beforeState !== 'nap' && cat.state === 'nap') { // 进入打盹边沿 → 呼噜
          Sound.play('purr');
        }
        if (cat.state === 'nap' && Math.random() < dt * 0.5) { // 睡觉偶尔冒 Z
          spawnText(cat.x + 14, cat.y - 2, 'z');
        }
      }
      if (mimi) {
        const before = mimi.hearts;
        Mimi.update(mimi, dt, player, currentMap, TILES, Math.random, bowls);
        if (mimi.hearts > before) {
          mimiHearts = mimi.hearts;
          mimiMet = true;
          spawnHearts(mimi.x + 8, mimi.y);
          Sound.play('meow', { cat: mimi });
          updateProgress();
        }
      }
    }
    render(dt);
    requestAnimationFrame(loop);
  }

  function drawDishes() {
    for (const bowl of bowls) {
      ctx.fillStyle = '#4a5a74';
      ctx.fillRect(bowl.x + 1, bowl.y + 8, 14, 6);
      ctx.fillStyle = bowl.filled ? '#8a5c34' : '#a8c0d8';
      ctx.fillRect(bowl.x + 3, bowl.y + 9, 10, 3);
      if (bowl.filled) {
        ctx.fillStyle = '#d5ad69';
        ctx.fillRect(bowl.x + 5, bowl.y + 9, 2, 2);
        ctx.fillRect(bowl.x + 10, bowl.y + 10, 2, 2);
      }
    }
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
      ctx.fillText(mobileLayout.matches ? '●' : 'E', bx + 3, by + 8);
    }
  }

  function render(dt) {
    const scale = MapKit.ART_SCALE * (mobileLayout.matches ? mobileZoom : 1);
    const viewW = canvas.width / scale;
    const viewH = canvas.height / scale;
    const worldW = currentMap[0].length * TILE;
    const worldH = currentMap.length * TILE;
    const cameraX = mobileLayout.matches ? Math.max(0, Math.min(worldW - viewW, player.x + 8 - viewW / 2)) : 0;
    const cameraY = mobileLayout.matches ? Math.max(0, Math.min(worldH - viewH, player.y + 8 - viewH / 2)) : 0;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, viewW, viewH);
    ctx.translate(-cameraX, -cameraY);
    ctx.drawImage(scenes[scene].canvas, 0, 0, worldW, worldH);
    if (scene === 'outside') {
      drawDishes();
      for (const cat of cats) { // 猫转向玩家：仅 idle（wander 且未移动）时生效
        const idle = cat.state === 'wander' &&
          (cat.pauseTimer > 0 || Math.hypot(cat.targetX - cat.x, cat.targetY - cat.y) <= 2);
        const near = Math.hypot(cat.x + 8 - (player.x + 8), cat.y + 8 - (player.y + 8)) < 56;
        cat.facePlayer = idle && near;
      }
      const actors = [...cats.map((c) => ({ y: c.y, draw: () => Cats.drawCat(ctx, c, drawSprite, Sprites.CAT_FRAMES, player) })),
                      { y: player.y, draw: drawPlayer }];
      for (const npc of NPCs.visible(npcs, scene)) {
        actors.push({ y: npc.y, draw: () => NPCs.draw(ctx, npc, drawSprite, Sprites) });
      }
      if (mimi && mimi.state !== 'hidden') {
        actors.push({ y: mimi.y, draw: () => Cats.drawCat(ctx, mimi, drawSprite, Sprites.MIMI_FRAMES, player) });
      }
      actors.sort((a, b) => a.y - b.y);
      if (mimi && mimi.food) drawSprite(ctx, Sprites.DISH, Sprites.PALETTE_DISH, mimi.food.x, mimi.food.y);
      for (const actor of actors) actor.draw();
      drawCatOverlay();
      if (mimi && mimi.state !== 'hidden' && Math.hypot(player.x - mimi.x, player.y - mimi.y) < 112) {
        ctx.fillStyle = '#f5f2ec'; ctx.font = '8px monospace';
        ctx.fillText('咪咪', mimi.x, mimi.y - 7);
      }
      if (Mimi.canOfferFood(mimi, player, currentMap, TILES)) {
        ctx.fillStyle = '#f5f2ec'; ctx.font = '8px monospace';
        ctx.fillText(`${mobileLayout.matches ? '交互' : 'E'} 放食物`, player.x - 8, player.y - 7);
      }
      if (Bowls.nearestEmpty(bowls, player)) {
        ctx.fillStyle = '#f5f2ec'; ctx.font = '8px monospace';
        ctx.fillText(`${mobileLayout.matches ? '交互' : 'E'} 碗里放粮`, player.x - 8, player.y - 15);
      }
    } else {
      const actors = NPCs.visible(npcs, scene).map(npc =>
        ({ y: npc.y, draw: () => NPCs.draw(ctx, npc, drawSprite, Sprites) }));
      actors.push({ y: player.y, draw: drawPlayer });
      actors.sort((a, b) => a.y - b.y);
      for (const actor of actors) actor.draw();
      if (scene === 'reading' && npcs.duyu.dialogueTimer > 0) {
        const x = npcs.duyu.x - 6, y = npcs.duyu.y - 28;
        ctx.fillStyle = '#302c36'; ctx.fillRect(x - 2, y - 2, 104, 17);
        ctx.fillStyle = '#f5f2ec'; ctx.fillRect(x, y, 100, 13);
        ctx.fillStyle = '#302c36'; ctx.font = '8px monospace';
        ctx.fillText('小蠹鱼：建模比赛好累', x + 3, y + 9);
      }
    }
    drawDoorHint();
    drawParticles(dt);
  }

  function drawDoorHint() { // 站在门前提示进出
    const door = doorAtPlayer();
    if (!door) return;
    const action = mobileLayout.matches ? '交互' : 'E';
    const label = door.to === 'atrium' ? (scene === 'outside' ? `${action} 进馆` : `${action} 出门`) :
                  door.to === 'outside' ? `${action} 出馆` : `${action} 进入`;
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1a181f';
    ctx.fillText(label, player.x + 8, player.y - 6);
    ctx.fillStyle = '#f5f2ec';
    ctx.fillText(label, player.x + 8, player.y - 7);
    ctx.textAlign = 'left';
  }

  requestAnimationFrame((t) => { lastT = t; requestAnimationFrame(loop); });
})();
