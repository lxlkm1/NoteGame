// viewport.js —— 画布尺寸、移动端缩放与全屏
import { ART_SCALE } from './map.js';

export const mobileLayout = window.matchMedia('(hover: none) and (pointer: coarse)');
export const mobileZoom = 2.5;

let canvas = null;
let ctx = null;

// 初始化画布并监听尺寸变化，返回 2d 上下文
export function initViewport(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  ctx.setTransform(ART_SCALE, 0, 0, ART_SCALE, 0, 0); // 世界坐标仍是 16px/格
  ctx.imageSmoothingEnabled = false;
  resizeViewport();
  window.addEventListener('resize', resizeViewport);
  window.visualViewport?.addEventListener('resize', resizeViewport);
  if (window.ResizeObserver) new ResizeObserver(resizeViewport).observe(canvas);
  return ctx;
}

export function resizeViewport() {
  if (mobileLayout.matches) {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * ART_SCALE));
    canvas.height = Math.max(1, Math.round(rect.height * ART_SCALE));
  } else {
    canvas.width = 1248;
    canvas.height = 960;
  }
  ctx.imageSmoothingEnabled = false;
}

// 全屏按钮 + 状态切换；进入全屏时尝试锁定横屏
export function initFullscreen() {
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
}
