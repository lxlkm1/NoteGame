// 图书馆学生与前庭访客：场景位置、进出馆、小情侣及偶尔投喂猫粮
const NPCs = (() => {
  'use strict';
  const TILE = 16;
  const COLORS = {
    blue:  { H: '#322d39', S: '#eac39f', E: '#312929', C: '#5681a7', P: '#48536d', B: '#333039' },
    green: { H: '#483830', S: '#f0cba7', E: '#312929', C: '#689274', P: '#4c5869', B: '#333039' },
    red:   { H: '#392f36', S: '#e9b996', E: '#312929', C: '#af6676', P: '#4c5368', B: '#333039' },
    brown: { H: '#343039', S: '#e6bd9c', E: '#312929', C: '#9b775b', P: '#4c5368', B: '#333039' },
  };

  function student(id, scene, col, row, color, kind = 'study') {
    return { id, kind, scene, col, row, x: col * TILE, y: row * TILE,
      color, moving: false, facing: 'down', animTimer: 0, feedCooldown: 0 };
  }

  function create(maps, rng = Math.random) {
    const study = [];
    for (const scene of ['reading', 'atrium']) {
      maps[scene].students.forEach((seat, i) => study.push(student(`${scene}-${i}`, scene, seat.col, seat.row, seat.color)));
    }
    const duyu = student('duyu', 'reading', maps.reading.duyu.col, maps.reading.duyu.row, 'brown', 'duyu');
    duyu.name = '小蠹鱼';
    duyu.laptop = { x: maps.reading.duyu.laptopCol * TILE, y: maps.reading.duyu.laptopRow * TILE };
    duyu.dialogueTimer = 0;
    duyu.playerNear = false;
    study.push(duyu);
    const inbound = student('inbound', 'outside', 19, 27, 'blue', 'student');
    inbound.phase = 'outsideIn'; inbound.feedCooldown = 6 + rng() * 8;
    const outbound = student('outbound', 'atrium', 20, 20, 'brown', 'student');
    outbound.phase = 'atriumOut'; outbound.feedCooldown = 6 + rng() * 8;
    return { study, duyu, commuters: [inbound, outbound], couple: null, coupleTimer: 18 };
  }

  function updateDuyuDialogue(world, player, scene, dt) {
    const duyu = world.duyu;
    if (scene !== 'reading') {
      duyu.playerNear = false;
      duyu.dialogueTimer = 0;
      return;
    }
    const distance = Math.hypot(player.x - duyu.x, player.y - duyu.y);
    if (distance <= 48 && !duyu.playerNear) {
      duyu.playerNear = true;
      duyu.dialogueTimer = 3.5;
    } else if (distance > 56) {
      duyu.playerNear = false;
    }
    duyu.dialogueTimer = Math.max(0, duyu.dialogueTimer - dt);
  }

  function moveTo(npc, x, y, speed, dt) {
    const dx = x - npc.x, dy = y - npc.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.5) { npc.x = x; npc.y = y; npc.moving = false; return true; }
    const step = Math.min(speed * dt, dist);
    npc.x += dx / dist * step;
    npc.y += dy / dist * step;
    npc.moving = true;
    npc.facing = Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? 'down' : 'up') : 'side';
    return step >= dist;
  }

  function updateCommuter(npc, dt) {
    npc.animTimer += dt;
    switch (npc.phase) {
      case 'outsideIn':
        if (moveTo(npc, npc.x, 5 * TILE, 24, dt)) {
          npc.scene = 'atrium'; npc.x = npc.col * TILE; npc.y = 28 * TILE;
          npc.phase = 'atriumSeat';
        }
        break;
      case 'atriumSeat':
        if (moveTo(npc, npc.x, 20 * TILE, 24, dt)) {
          npc.phase = 'study'; npc.stateTimer = 18;
        }
        break;
      case 'study':
        npc.moving = false;
        npc.stateTimer -= dt;
        if (npc.stateTimer <= 0) npc.phase = 'atriumOut';
        break;
      case 'atriumOut':
        if (moveTo(npc, npc.x, 28 * TILE, 24, dt)) {
          npc.scene = 'outside'; npc.x = npc.col * TILE; npc.y = 5 * TILE;
          npc.phase = 'outsideOut';
        }
        break;
      case 'outsideOut':
        if (moveTo(npc, npc.x, 28 * TILE, 24, dt)) {
          npc.scene = null; npc.phase = 'offscreen'; npc.stateTimer = 8;
        }
        break;
      case 'offscreen':
        npc.stateTimer -= dt;
        if (npc.stateTimer <= 0) {
          npc.scene = 'outside'; npc.x = npc.col * TILE; npc.y = 28 * TILE;
          npc.phase = 'outsideIn';
        }
        break;
    }
  }

  function createCouple() {
    const members = [student('couple-a', 'outside', 19, 28, 'red', 'couple'),
                     student('couple-b', 'outside', 20, 28, 'green', 'couple')];
    members[0].feedCooldown = 8;
    members[1].feedCooldown = 11;
    return { y: 28 * TILE, phase: 'up', members };
  }

  function updateCouple(world, dt, rng) {
    if (!world.couple) {
      world.coupleTimer -= dt;
      if (world.coupleTimer <= 0) {
        if (rng() < 0.35) world.couple = createCouple();
        world.coupleTimer = 22 + rng() * 15;
      }
      return;
    }
    const pair = world.couple;
    const target = pair.phase === 'up' ? 10 * TILE : 28 * TILE;
    const delta = Math.sign(target - pair.y) * Math.min(20 * dt, Math.abs(target - pair.y));
    pair.y += delta;
    for (const member of pair.members) {
      member.y = pair.y;
      member.moving = true;
      member.facing = pair.phase === 'up' ? 'up' : 'down';
      member.animTimer += dt;
    }
    if (Math.abs(pair.y - target) < 0.5) {
      if (pair.phase === 'up') pair.phase = 'down';
      else world.couple = null;
    }
  }

  function visible(world, scene) {
    const people = world.study.filter(npc => npc.scene === scene);
    people.push(...world.commuters.filter(npc => npc.scene === scene));
    if (scene === 'outside' && world.couple) people.push(...world.couple.members);
    return people;
  }

  function update(world, dt, cats = [], rng = Math.random) {
    for (const npc of world.study) npc.animTimer += dt;
    for (const npc of world.commuters) updateCommuter(npc, dt);
    updateCouple(world, dt, rng);
    const events = [];
    const reserved = new Set();
    for (const npc of visible(world, 'outside')) {
      if (npc.kind === 'study') continue;
      npc.feedCooldown = Math.max(0, npc.feedCooldown - dt);
      if (npc.feedCooldown > 0) continue;
      let nearest = null, best = 40;
      for (const cat of cats) {
        if (reserved.has(cat) || !['wander', 'nap'].includes(cat.state)) continue;
        const d = Math.hypot(cat.x - npc.x, cat.y - npc.y);
        if (d < best) { nearest = cat; best = d; }
      }
      if (!nearest) continue;
      if (rng() < (npc.kind === 'couple' ? 0.2 : 0.3)) {
        events.push({ type: 'feed', npcId: npc.id, cat: nearest, x: nearest.x, y: nearest.y });
        reserved.add(nearest);
        npc.feedCooldown = 15 + rng() * 10;
      } else {
        npc.feedCooldown = 5 + rng() * 5;
      }
    }
    return events;
  }

  function draw(ctx, npc, drawSprite, sprites) {
    if (npc.kind === 'duyu') {
      const x = npc.laptop.x, y = npc.laptop.y;
      ctx.fillStyle = '#343b4b'; ctx.fillRect(x + 2, y + 3, 12, 9);
      ctx.fillStyle = '#8baac0'; ctx.fillRect(x + 3, y + 4, 10, 7);
      ctx.fillStyle = '#d8d7c9'; ctx.fillRect(x + 1, y + 12, 14, 2);
      drawSprite(ctx, sprites.DUYU_FRAME, sprites.DUYU_PALETTE, npc.x, npc.y, false, 1.5);
      return;
    }
    const frame = npc.moving ? (Math.floor(npc.animTimer / 0.2) % 2 ? 'down1' : 'down2') : 'down1';
    const frameName = npc.facing === 'up' && npc.moving ? 'up1' : frame;
    drawSprite(ctx, sprites.PLAYER_FRAMES[frameName], COLORS[npc.color], npc.x, npc.y, false, 1.5);
    if (!npc.moving && (npc.kind === 'study' || npc.phase === 'study')) {
      ctx.fillStyle = '#e8dcc8'; ctx.fillRect(npc.x + 3, npc.y + 10, 10, 4);
      ctx.fillStyle = Math.floor(npc.animTimer / 1.3) % 2 ? '#8595a7' : '#a59070';
      ctx.fillRect(npc.x + 8, npc.y + 10, 1, 4);
    }
  }

  return { create, update, updateDuyuDialogue, visible, draw };
})();

if (typeof module !== 'undefined') module.exports = NPCs;
