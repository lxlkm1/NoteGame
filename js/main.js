// main.js —— 游戏循环 + 输入 + 人物 + 投喂交互
(function () {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  let lastT = 0;

  function loop(t) {
    const dt = Math.min((t - lastT) / 1000, 0.05); // 秒，上限防跳帧
    lastT = t;
    update(dt, t / 1000);
    render(t / 1000);
    requestAnimationFrame(loop);
  }

  function update(dt) { /* Task 3+: 人物/猫/粒子 */ }

  function render(now) {
    ctx.fillStyle = '#2b2633';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // 临时验证：屏幕中央呼吸色块，证明循环活着（Task 3 移除）
    const s = 20 + Math.sin(now * 2) * 6;
    ctx.fillStyle = '#ef9f4d';
    ctx.fillRect(240 - s / 2, 160 - s / 2, s, s);
  }

  requestAnimationFrame((t) => { lastT = t; requestAnimationFrame(loop); });
})();
