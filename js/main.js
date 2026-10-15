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

  const mapCanvas = MapKit.buildMapCanvas();

  function render(now) {
    ctx.drawImage(mapCanvas, 0, 0);
  }

  requestAnimationFrame((t) => { lastT = t; requestAnimationFrame(loop); });
})();
