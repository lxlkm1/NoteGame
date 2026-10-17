// main.js —— 入口：创建游戏状态 G、接线输入与音频、跑游戏循环
import { MAPS } from './data/maps/index.js';
import TILES from './data/maps/tiles.js';
import { TILE } from './map.js';
import * as Cats from './npc/cats.js';
import * as NPCs from './npc/index.js';
import * as Mimi from './npc/mimi.js';
import * as Sound from './audio.js';
import { initViewport, initFullscreen, mobileLayout } from './viewport.js';
import { keys, initKeyboard, bindTouchControls } from './input.js';
import { createPlayer, updatePlayer } from './player.js';
import { scenes } from './scenes.js';
import { interact, updateProgress } from './interact.js';
import { spawnHearts, spawnText } from './particles.js';
import { render } from './render.js';

const canvas = document.getElementById('game');
const ctx = initViewport(canvas);

// ---- 游戏状态（各模块通过 G 读写） ----
const G = {
  scene: 'atrium',
  currentMap: scenes.atrium.data.map,
  atriumPos: { x: MAPS.atrium.spawn.col * TILE, y: MAPS.atrium.spawn.row * TILE },
  player: createPlayer(MAPS.atrium.spawn),
  cats: Cats.createCats(), // 普通猫固定生活在室外
  npcs: NPCs.create(MAPS),
  mimi: null,
  mimiHearts: 0,
  mimiMet: false,
  bowls: [],
  dishes: [],   // {catId, x, y}
  particles: [], // 见 particles.js
};

// ---- 音频：首次按键/触摸懒初始化 BGM + M 键与按钮静音 ----
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

initKeyboard((e) => {
  if (e.repeat) return; // 忽略系统自动重复，避免 M 键长按导致静音反复切换
  const k = e.key.toLowerCase();
  if (k === 'm') {
    if (!audioInited) { Sound.init(); Sound.startBgm(); audioInited = true; }
    Sound.toggleMute();
    updateSoundIcon();
    return;
  }
  if (k === 'e') interact(G);
  initAudio();
});
bindTouchControls({ onInteract: () => interact(G), onGesture: initAudio });
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
initFullscreen();

// ---- 循环 ----
let lastT = 0;
function loop(t) {
  const dt = Math.min((t - lastT) / 1000, 0.05);
  lastT = t;
  updatePlayer(G.player, dt, keys, G.currentMap);
  NPCs.updateDuyuDialogue(G.npcs, G.player, G.scene, dt);
  for (const event of NPCs.update(G.npcs, dt, G.scene === 'outside' ? G.cats : [])) {
    if (event.type === 'feed' && Cats.feed(event.cat, event.x, event.y, 'npc')) {
      G.dishes.push({ catId: event.cat.id, x: event.x, y: event.y });
      Sound.play('dish');
    }
  }
  if (G.scene === 'outside') {
    for (const cat of G.cats) {
      const before = cat.hearts;
      const beforeState = cat.state;
      Cats.updateCat(cat, dt, G.player, G.currentMap, TILES);
      if (cat.hearts > before) { // 刚吃完一口
        spawnHearts(G.particles, cat.x + 8, cat.y);
        spawnText(G.particles, cat.x + 8, cat.y - 10, '喵♪');
        Sound.play('meow', { cat });
      }
      if (beforeState === 'eat' && cat.state === 'follow') { // 满心跟随边沿
        Sound.play('follow');
      }
      if (beforeState === 'eat' && (cat.state === 'follow' || cat.state === 'wander')) { // 吃完撤碟（无论是否满心）
        const dishIndex = G.dishes.findIndex(dish => dish.catId === cat.id);
        if (dishIndex >= 0) G.dishes.splice(dishIndex, 1);
      }
      if (beforeState !== 'nap' && cat.state === 'nap') { // 进入打盹边沿 → 呼噜
        Sound.play('purr');
      }
      if (cat.state === 'nap' && Math.random() < dt * 0.5) { // 睡觉偶尔冒 Z
        spawnText(G.particles, cat.x + 14, cat.y - 2, 'z');
      }
    }
    if (G.mimi) {
      const before = G.mimi.hearts;
      Mimi.update(G.mimi, dt, G.player, G.currentMap, TILES, Math.random, G.bowls);
      if (G.mimi.hearts > before) {
        G.mimiHearts = G.mimi.hearts;
        G.mimiMet = true;
        spawnHearts(G.particles, G.mimi.x + 8, G.mimi.y);
        Sound.play('meow', { cat: G.mimi });
        updateProgress(G);
      }
    }
  }
  render(canvas, ctx, G, dt);
  requestAnimationFrame(loop);
}

requestAnimationFrame((t) => { lastT = t; requestAnimationFrame(loop); });
