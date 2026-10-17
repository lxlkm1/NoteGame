// index.js —— NPC 聚合与跨角色编排：组装角色表、逐帧更新、投喂事件、可见性与绘制分发
// 各角色实现：cats.js（普通猫）/ mimi.js（咪咪）/ student.js（同学）/ duyu.js（小蠹鱼）/ couple.js（情侣）
import { createStudyStudents, createCommuters, updateCommuter } from './student.js';
import { createDuyu, updateDuyu, updateDuyuDialogue, drawDuyu } from './duyu.js';
import { createCouple, updateCouple } from './couple.js';
import { drawPerson } from './shared.js';
import { drawCouple } from './couple-render.js';

function create(maps, rng = Math.random) {
  const study = createStudyStudents(maps);
  const duyu = createDuyu(maps, rng);
  study.push(duyu);
  return { study, duyu, commuters: createCommuters(rng), couple: createCouple(maps.outside.map) };
}

function visible(world, scene) {
  const people = world.study.filter(npc => npc.scene === scene);
  people.push(...world.commuters.filter(npc => npc.scene === scene));
  if (scene === 'outside' && world.couple) people.push(...world.couple.members);
  return people;
}

function update(world, dt, cats = [], rng = Math.random) {
  for (const npc of world.study) if (npc.kind !== 'duyu') npc.animTimer += dt;
  updateDuyu(world.duyu, dt, rng);
  for (const npc of world.commuters) updateCommuter(npc, dt);
  const events = updateCouple(world, dt, rng); // cuddle-heart：情侣亲昵时冒爱心
  // 室外的通勤学生与情侣偶尔投喂普通猫（不计入玩家进度）
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

function draw(ctx, npc) {
  if (npc.kind === 'duyu') { drawDuyu(ctx, npc); return; }
  if (npc.kind === 'couple') { drawCouple(ctx, npc); return; }
  drawPerson(ctx, npc);
}

export { create, update, updateDuyuDialogue, visible, draw };
