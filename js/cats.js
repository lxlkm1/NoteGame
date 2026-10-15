// cats.js —— 10 只猫：数据 + 状态机（纯逻辑，无 DOM）+ 渲染
const Cats = (() => {
  'use strict';
  const TILE = 16;

  // 位置 = 格坐标(可小数) × 16。bounds 为可选显式闲逛矩形（像素），否则用 home ± radius
  const CAT_DEFS = [
    { id: 'xueqiu',   name: '雪球', persona: '窗台晒太阳专业户', col: 3,    row: 1,    palette: { A: '#f5f2ec', B: '#d8d2c6', C: '#e890a8', E: '#4a4a55', W: '#f5f2ec' } },
    { id: 'tuantuan', name: '团团', persona: '晒着太阳流口水',   col: 11,   row: 1,    palette: { A: '#ef9f4d', B: '#d97f2e', C: '#e890a8', E: '#4a3a2b', W: '#f5ecd9' } },
    { id: 'tangyuan', name: '汤圆', persona: '在看窗外的鸽子',   col: 15,   row: 1,    palette: { A: '#f5f2ec', B: '#9aa0ab', C: '#e890a8', E: '#4a4a55', W: '#f5f2ec' } },
    { id: 'buding',   name: '布丁', persona: '整个图书馆都是我家', col: 18, row: 2, radius: 48, bounds: { x1: 13 * 16, y1: 24, x2: 27 * 16, y2: 56 }, palette: { A: '#f2c14e', B: '#d9a32e', C: '#e890a8', E: '#4a3a2b', W: '#faf3dd' } },
    { id: 'meiqiu',   name: '煤球', persona: '书架顶观察员',     col: 4,    row: 2,    palette: { A: '#3d3a45', B: '#2b2933', C: '#e890a8', E: '#c9c4d4', W: '#f5f2ec' } },
    { id: 'momo',     name: '墨墨', persona: '书架深处的大人物', col: 7.5,  row: 6, radius: 16, palette: { A: '#423e4a', B: '#302d38', C: '#e890a8', E: '#d4b95e', W: '#5a5566' } },
    { id: 'naitang',  name: '奶糖', persona: '占领了整张桌子',   col: 14.5, row: 11.5, radius: 10, palette: { A: '#f5f2ec', B: '#3d3a45', C: '#e890a8', E: '#4a4a55', W: '#f5f2ec' } },
    { id: 'zhima',    name: '芝麻', persona: '绿植是我的',       col: 22,   row: 2,    palette: { A: '#ef9f4d', B: '#3d3a45', C: '#e890a8', E: '#4a3a2b', W: '#f5f2ec' } },
    { id: 'huihui',   name: '灰灰', persona: '借阅台监工',       col: 24,   row: 14, radius: 16, palette: { A: '#9aa0ab', B: '#7d828d', C: '#e890a8', E: '#4a4a55', W: '#e8e4dc' } },
    { id: 'huajuan',  name: '花卷', persona: '在门口等你很久了', col: 15,   row: 18, radius: 20, palette: { A: '#ef9f4d', B: '#f5f2ec', C: '#e890a8', E: '#4a3a2b', W: '#faf3dd' } },
  ];

  const CAT_SPEED = 12; // px/s，慢悠悠

  function createCats() {
    return CAT_DEFS.map((def) => ({
      def,
      id: def.id, name: def.name, persona: def.persona, palette: def.palette,
      homeX: def.col * TILE, homeY: def.row * TILE,
      x: def.col * TILE, y: def.row * TILE,
      state: 'wander', stateTimer: 2 + Math.random() * 4,
      targetX: def.col * TILE, targetY: def.row * TILE,
      dir: 1, walkTimer: 0, blinkTimer: Math.random() * 8, pauseTimer: 0, moving: false,
      hearts: 0,
      dishX: 0, dishY: 0,        // Task 5 使用
      followTimer: 0,            // Task 6 使用
      hasMet: false,             // Task 7 计数用
    }));
  }

  function pickWanderTarget(cat) {
    const r = cat.def.radius || 24;
    if (cat.def.bounds) {
      cat.targetX = cat.def.bounds.x1 + Math.random() * (cat.def.bounds.x2 - cat.def.bounds.x1);
      cat.targetY = cat.def.bounds.y1 + Math.random() * (cat.def.bounds.y2 - cat.def.bounds.y1);
    } else {
      cat.targetX = cat.homeX + (Math.random() * 2 - 1) * r;
      cat.targetY = cat.homeY + (Math.random() * 2 - 1) * r;
    }
  }

  function moveToward(cat, tx, ty, speed, dt) {
    const dx = tx - cat.x, dy = ty - cat.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return true; // 到达
    const step = Math.min(speed * dt, dist);
    cat.x += (dx / dist) * step;
    cat.y += (dy / dist) * step;
    if (Math.abs(dx) > 1) cat.dir = dx > 0 ? 1 : -1;
    cat.walkTimer += dt;
    return false;
  }

  function updateCat(cat, dt, player) {
    cat.stateTimer -= dt;
    cat.blinkTimer += dt;
    cat.moving = false;
    switch (cat.state) {
      case 'wander': {
        if (cat.pauseTimer > 0) { // 站立片刻：只倒计时，不移动
          cat.pauseTimer -= dt;
          if (cat.pauseTimer <= 0) pickWanderTarget(cat);
        } else {
          const arrived = moveToward(cat, cat.targetX, cat.targetY, CAT_SPEED, dt);
          cat.moving = !arrived;
          if (arrived) cat.pauseTimer = 0.6 + Math.random() * 1.2; // 到达目标，停顿 0.6~1.8s
        }
        if (cat.stateTimer <= 0) { // 走累了，睡一觉
          cat.state = 'nap';
          cat.stateTimer = 4 + Math.random() * 4;
        }
        break;
      }
      case 'nap': {
        if (cat.stateTimer <= 0) { // 睡够了
          cat.state = 'wander';
          cat.stateTimer = 3 + Math.random() * 5;
          cat.pauseTimer = 0; // 清除入睡前的残留停顿，醒后立即走动
          pickWanderTarget(cat);
        }
        break;
      }
      case 'gotoFood': {
        const arrived = moveToward(cat, cat.dishX, cat.dishY, CAT_SPEED * 1.5, dt);
        cat.moving = !arrived;
        if (arrived) {
          cat.state = 'eat';
          cat.stateTimer = 1.6;
        }
        break;
      }
      case 'eat': {
        if (cat.stateTimer <= 0) {
          cat.hearts = Math.min(5, cat.hearts + 1);
          if (cat.hearts >= 5) {          // 心满意足 → 跟随
            cat.state = 'follow';
            cat.followTimer = 8;
          } else {
            cat.state = 'wander';
            cat.stateTimer = 2 + Math.random() * 3;
            pickWanderTarget(cat);
          }
        }
        break;
      }
      case 'follow': {
        cat.followTimer -= dt;
        if (cat.followTimer <= 0) { cat.state = 'return'; break; }
        if (!player) break;
        const d = Math.hypot(player.x - cat.x, player.y - cat.y);
        if (d > 24) cat.moving = !moveToward(cat, player.x, player.y, CAT_SPEED * 1.8, dt);
        break;
      }
      case 'return': {
        const arrived = moveToward(cat, cat.homeX, cat.homeY, CAT_SPEED * 1.5, dt);
        cat.moving = !arrived;
        if (arrived) {
          cat.state = 'nap';
          cat.stateTimer = 5 + Math.random() * 3; // 心满意足地睡
        }
        break;
      }
    }
  }

  // ---- 渲染（只被 main.js 调用） ----
  function catFrame(cat) {
    switch (cat.state) {
      case 'nap': return 'sleep';
      case 'eat': return 'eat';
      default: {
        if (!cat.moving) return Math.floor(cat.blinkTimer / 1.6) % 5 === 4 ? 'idle2' : 'idle1';
        return Math.floor(cat.walkTimer / 0.25) % 2 === 0 ? 'walk1' : 'walk2';
      }
    }
  }

  function drawCat(ctx, cat, drawSprite, CAT_FRAMES, player) {
    const frame = CAT_FRAMES[catFrame(cat)];
    const flip = cat.facePlayer
      ? (player.x < cat.x)
      : (cat.dir < 0);
    drawSprite(ctx, frame, cat.palette, cat.x, cat.y, flip);
  }

  function feed(cat, dishX, dishY) {
    if (cat.state === 'eat' || cat.state === 'gotoFood') return false; // 正在吃就不重复投
    cat.dishX = dishX;
    cat.dishY = dishY;
    cat.state = 'gotoFood';
    return true;
  }

  return { CAT_DEFS, createCats, updateCat, drawCat, feed };
})();

if (typeof module !== 'undefined') module.exports = Cats;
