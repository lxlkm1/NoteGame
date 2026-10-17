// interact.js —— E 键交互：进出房间、碗里放粮、投喂猫、给咪咪放食物
import * as Cats from './npc/cats.js';
import * as Mimi from './npc/mimi.js';
import * as Bowls from './bowls.js';
import * as Sound from './audio.js';
import { doorDestAt } from './map.js';
import TILES from './data/maps/tiles.js';
import { playerSolid } from './player.js';
import { enterRoom, exitRoom } from './scenes.js';

const FEED_RANGE = 40;

export function nearestFeedableCat(cats, player) {
  let best = null, bestD = FEED_RANGE;
  for (const cat of cats) {
    if (cat.state === 'gotoFood' || cat.state === 'eat') continue;
    const d = Math.hypot(cat.x + 8 - (player.x + 8), cat.y + 8 - (player.y + 8));
    if (d < bestD) { best = cat; bestD = d; }
  }
  return best;
}

export function updateProgress(G) { // 撸猫进度：统计已投喂过的不同猫
  const met = G.cats.filter((c) => c.hasMet).length + Number(G.mimiMet);
  document.getElementById('progress').textContent = `撸猫 ${met} / 11`;
}

export function doorAtPlayer(G) { // 玩家脚部中心所在格的字符即目的地（tiles portal），返回 { to } 或 null
  const dest = doorDestAt(G.player.x + 8, G.player.y + 15, G.currentMap, TILES);
  return dest ? { to: dest } : null;
}

export function interact(G) {
  const door = doorAtPlayer(G);
  if (door) {
    if (door.to === 'atrium') { exitRoom(G); return; }
    enterRoom(G, door.to);
    return;
  }
  if (G.scene === 'outside') {
    const bowl = Bowls.nearestEmpty(G.bowls, G.player);
    if (bowl) {
      bowl.filled = true;
      if (G.mimi) Mimi.offerBowlFood(G.mimi, bowl);
      Sound.play('dish');
      return;
    }
    const cat = nearestFeedableCat(G.cats, G.player);
    if (cat) {
      const dx = G.player.x - cat.x, dy = G.player.y - cat.y;
      const len = Math.hypot(dx, dy) || 1;
      let dishX = cat.x + (dx / len) * 14;
      let dishY = cat.y + (dy / len) * 14 + 4;
      if (playerSolid(dishX, dishY, G.currentMap)) { dishX = cat.x; dishY = cat.y; }
      if (Cats.feed(cat, dishX, dishY)) {
        G.dishes.push({ catId: cat.id, x: dishX, y: dishY });
        Sound.play('dish');
        cat.hasMet = true;
        updateProgress(G);
      }
      return;
    }
    if (Mimi.offerFood(G.mimi, G.player, G.currentMap, TILES)) Sound.play('dish');
  }
  return;
}
