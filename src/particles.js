// particles.js —— 爱心与文字粒子：{x, y, vx, vy, life, ttl, kind, text?}
import { drawSprite } from './sprites.js';
import { HEART } from './data/sprites.js';

export function spawnHearts(particles, x, y) {
  for (let i = 0; i < 5; i++) {
    particles.push({
      x: x + (Math.random() * 16 - 8), y: y - 4,
      vx: Math.random() * 8 - 4, vy: -18 - Math.random() * 10,
      life: 0, ttl: 1 + Math.random() * 0.5, kind: 'heart',
    });
  }
}

export function spawnText(particles, x, y, text) {
  particles.push({ x, y, vx: 0, vy: -10, life: 0, ttl: 1.4, kind: 'text', text });
}

export function drawParticles(ctx, particles, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += dt;
    if (p.life > p.ttl) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    const alpha = 1 - p.life / p.ttl;
    ctx.globalAlpha = alpha;
    if (p.kind === 'heart') {
      drawSprite(ctx, HEART, { A: '#ef6a8a' }, p.x, p.y);
    } else {
      ctx.fillStyle = '#f5d7e0';
      ctx.font = '8px monospace';
      ctx.fillText(p.text, p.x - 6, p.y);
    }
    ctx.globalAlpha = 1;
  }
}
