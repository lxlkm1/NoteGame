// scenes.js —— 场景表（素材图组装）与进出房间
import { MAPS } from './data/maps/index.js';
import { buildSceneFromTiles } from './tile-render.js';
import { TILE } from './map.js';
import * as Sound from './audio.js';
import * as Bowls from './bowls.js';
import * as Mimi from './npc/mimi.js';

export const scenes = {}; // initScenes() 在资产加载后填充；import 方持有同一对象引用

export function initScenes() {
  for (const name of ['atrium', 'reading', 'toilet', 'outside']) {
    scenes[name] = { data: MAPS[name], canvas: buildSceneFromTiles(MAPS[name], MAPS.tiles) };
  }
}

// G：main.js 持有的游戏状态（player / scene / currentMap / atriumPos / bowls / mimi / mimiHearts / particles）
export function enterRoom(G, name) {
  G.atriumPos = { x: G.player.x, y: name === 'outside' ? (MAPS.atrium.map.length - 2) * TILE : G.player.y };
  G.scene = name;
  G.currentMap = scenes[name].data.map;
  const entry = scenes[name].data.entry;
  G.player.x = entry.col * TILE;
  G.player.y = entry.row * TILE;
  G.player.dir = 'down';
  if (name === 'outside') {
    G.bowls = Bowls.create();
    const site = Math.random() < 0.5 ? MAPS.outside.mimiSites.left : MAPS.outside.mimiSites.right;
    G.mimi = Mimi.shouldAppear(Math.random()) ? Mimi.create(site, G.mimiHearts) : null;
  }
  Sound.setBgmTrack(name);
  G.particles.length = 0;
}

export function exitRoom(G) {
  const cameFromOutside = G.scene === 'outside';
  G.scene = 'atrium';
  G.currentMap = scenes.atrium.data.map;
  G.player.x = G.atriumPos.x;
  G.player.y = G.atriumPos.y;
  if (cameFromOutside) G.player.dir = 'up';
  if (cameFromOutside) G.mimi = null;
  Sound.setBgmTrack('atrium');
  G.particles.length = 0;
}
