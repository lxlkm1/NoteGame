// input.js —— 键盘按键集合 + 触屏方向键与交互按钮
export const keys = new Set();

// 键盘：维护 keys 集合；onKeyDown 回调处理单发按键（交互、静音等）
export function initKeyboard(onKeyDown) {
  window.addEventListener('keydown', (e) => {
    keys.add(e.key.toLowerCase());
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) e.preventDefault();
    onKeyDown?.(e);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
}

// 触屏：方向键写入 keys 集合，「交互」按钮等价于按 E；onGesture 用于解锁音频
export function bindTouchControls({ onInteract, onGesture }) {
  for (const button of document.querySelectorAll('#dpad [data-key]')) {
    const key = button.dataset.key;
    button.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      button.setPointerCapture(e.pointerId);
      keys.add(key);
      button.classList.add('pressed');
      onGesture?.();
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
    onGesture?.();
    onInteract?.();
  });
}
