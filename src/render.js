// render.js —— 渲染编排：场景贴图、角色按 y 排序、碗碟、名牌气泡、门提示、粒子
import * as Cats from './cats.js';
import * as NPCs from './npcs.js';
import * as Mimi from './mimi.js';
import * as Bowls from './bowls.js';
import * as Sprites from './sprites.js';
import { ART_SCALE, TILE } from './map.js';
import TILES from './maps/tiles.js';
import { mobileLayout, mobileZoom } from './viewport.js';
import { drawPlayer } from './player.js';
import { drawParticles } from './particles.js';
import { nearestFeedableCat, doorAtPlayer } from './interact.js';
import { scenes } from './scenes.js';

function drawDishes(ctx, G) {
  for (const bowl of G.bowls) {
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
  for (const d of G.dishes) {
    Sprites.drawSprite(ctx, Sprites.DISH, Sprites.PALETTE_DISH, d.x, d.y);
  }
}

function drawCatOverlay(ctx, G) { // 气泡提示 + 名牌 + 心条
  const target = nearestFeedableCat(G.cats, G.player);
  for (const cat of G.cats) {
    const near = Math.hypot(cat.x + 8 - (G.player.x + 8), cat.y + 8 - (G.player.y + 8)) < 64;
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
      Sprites.drawSprite(ctx, Sprites.HEART, { A: i < cat.hearts ? '#ef6a8a' : '#4a4453' }, cat.x - 12 + i * 8, cat.y - 8);
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

function drawDoorHint(ctx, G) { // 站在门前提示进出
  const door = doorAtPlayer(G);
  if (!door) return;
  const action = mobileLayout.matches ? '交互' : 'E';
  const label = door.to === 'atrium' ? (G.scene === 'outside' ? `${action} 进馆` : `${action} 出门`) :
                door.to === 'outside' ? `${action} 出馆` : `${action} 进入`;
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1a181f';
  ctx.fillText(label, G.player.x + 8, G.player.y - 6);
  ctx.fillStyle = '#f5f2ec';
  ctx.fillText(label, G.player.x + 8, G.player.y - 7);
  ctx.textAlign = 'left';
}

export function render(canvas, ctx, G, dt) {
  const scale = ART_SCALE * (mobileLayout.matches ? mobileZoom : 1);
  const viewW = canvas.width / scale;
  const viewH = canvas.height / scale;
  const worldW = G.currentMap[0].length * TILE;
  const worldH = G.currentMap.length * TILE;
  const cameraX = mobileLayout.matches ? Math.max(0, Math.min(worldW - viewW, G.player.x + 8 - viewW / 2)) : 0;
  const cameraY = mobileLayout.matches ? Math.max(0, Math.min(worldH - viewH, G.player.y + 8 - viewH / 2)) : 0;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, viewW, viewH);
  ctx.translate(-cameraX, -cameraY);
  ctx.drawImage(scenes[G.scene].canvas, 0, 0, worldW, worldH);
  if (G.scene === 'outside') {
    drawDishes(ctx, G);
    for (const cat of G.cats) { // 猫转向玩家：仅 idle（wander 且未移动）时生效
      const idle = cat.state === 'wander' &&
        (cat.pauseTimer > 0 || Math.hypot(cat.targetX - cat.x, cat.targetY - cat.y) <= 2);
      const near = Math.hypot(cat.x + 8 - (G.player.x + 8), cat.y + 8 - (G.player.y + 8)) < 56;
      cat.facePlayer = idle && near;
    }
    const actors = [...G.cats.map((c) => ({ y: c.y, draw: () => Cats.drawCat(ctx, c, Sprites.drawSprite, Sprites.CAT_FRAMES, G.player) })),
                    { y: G.player.y, draw: () => drawPlayer(ctx, G.player) }];
    for (const npc of NPCs.visible(G.npcs, G.scene)) {
      actors.push({ y: npc.y, draw: () => NPCs.draw(ctx, npc, Sprites.drawSprite, Sprites) });
    }
    if (G.mimi && G.mimi.state !== 'hidden') {
      actors.push({ y: G.mimi.y, draw: () => Cats.drawCat(ctx, G.mimi, Sprites.drawSprite, Sprites.MIMI_FRAMES, G.player) });
    }
    actors.sort((a, b) => a.y - b.y);
    if (G.mimi && G.mimi.food) Sprites.drawSprite(ctx, Sprites.DISH, Sprites.PALETTE_DISH, G.mimi.food.x, G.mimi.food.y);
    for (const actor of actors) actor.draw();
    drawCatOverlay(ctx, G);
    if (G.mimi && G.mimi.state !== 'hidden' && Math.hypot(G.player.x - G.mimi.x, G.player.y - G.mimi.y) < 112) {
      ctx.fillStyle = '#f5f2ec'; ctx.font = '8px monospace';
      ctx.fillText('咪咪', G.mimi.x, G.mimi.y - 7);
    }
    if (Mimi.canOfferFood(G.mimi, G.player, G.currentMap, TILES)) {
      ctx.fillStyle = '#f5f2ec'; ctx.font = '8px monospace';
      ctx.fillText(`${mobileLayout.matches ? '交互' : 'E'} 放食物`, G.player.x - 8, G.player.y - 7);
    }
    if (Bowls.nearestEmpty(G.bowls, G.player)) {
      ctx.fillStyle = '#f5f2ec'; ctx.font = '8px monospace';
      ctx.fillText(`${mobileLayout.matches ? '交互' : 'E'} 碗里放粮`, G.player.x - 8, G.player.y - 15);
    }
  } else {
    const actors = NPCs.visible(G.npcs, G.scene).map(npc =>
      ({ y: npc.y, draw: () => NPCs.draw(ctx, npc, Sprites.drawSprite, Sprites) }));
    actors.push({ y: G.player.y, draw: () => drawPlayer(ctx, G.player) });
    actors.sort((a, b) => a.y - b.y);
    for (const actor of actors) actor.draw();
    if (G.scene === 'reading' && G.npcs.duyu.dialogueTimer > 0) {
      const x = G.npcs.duyu.x - 6, y = G.npcs.duyu.y - 28;
      ctx.fillStyle = '#302c36'; ctx.fillRect(x - 2, y - 2, 104, 17);
      ctx.fillStyle = '#f5f2ec'; ctx.fillRect(x, y, 100, 13);
      ctx.fillStyle = '#302c36'; ctx.font = '8px monospace';
      ctx.fillText('小蠹鱼：建模比赛好累', x + 3, y + 9);
    }
  }
  drawDoorHint(ctx, G);
  drawParticles(ctx, G.particles, dt);
}
