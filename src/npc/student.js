// student.js —— 同学：馆内座位学习的学生 + 通勤进出馆的学生
import { TILE } from '../map.js';
import { student, moveTo } from './shared.js';

// 座位学生：从场景配置读取学习座位
export function createStudyStudents(maps) {
  const study = [];
  for (const scene of ['reading', 'atrium']) {
    maps[scene].students.forEach((seat, i) => study.push(student(`${scene}-${i}`, scene, seat.col, seat.row, seat.color)));
  }
  return study;
}

// 通勤学生：一个进馆学习再走，一个出馆，循环往复
export function createCommuters(rng = Math.random) {
  const inbound = student('inbound', 'outside', 19, 27, 'blue', 'student');
  inbound.phase = 'outsideIn'; inbound.feedCooldown = 6 + rng() * 8;
  const outbound = student('outbound', 'atrium', 20, 20, 'brown', 'student');
  outbound.phase = 'atriumOut'; outbound.feedCooldown = 6 + rng() * 8;
  return [inbound, outbound];
}

export function updateCommuter(npc, dt) {
  npc.animTimer += dt;
  switch (npc.phase) {
    case 'outsideIn':
      if (moveTo(npc, npc.x, 5 * TILE, 24, dt)) {
        npc.scene = 'atrium'; npc.x = npc.col * TILE; npc.y = 28 * TILE;
        npc.phase = 'atriumSeat';
      }
      break;
    case 'atriumSeat':
      if (moveTo(npc, npc.x, 20 * TILE, 24, dt)) {
        npc.phase = 'study'; npc.stateTimer = 18;
      }
      break;
    case 'study':
      npc.moving = false;
      npc.stateTimer -= dt;
      if (npc.stateTimer <= 0) npc.phase = 'atriumOut';
      break;
    case 'atriumOut':
      if (moveTo(npc, npc.x, 28 * TILE, 24, dt)) {
        npc.scene = 'outside'; npc.x = npc.col * TILE; npc.y = 5 * TILE;
        npc.phase = 'outsideOut';
      }
      break;
    case 'outsideOut':
      if (moveTo(npc, npc.x, 28 * TILE, 24, dt)) {
        npc.scene = null; npc.phase = 'offscreen'; npc.stateTimer = 8;
      }
      break;
    case 'offscreen':
      npc.stateTimer -= dt;
      if (npc.stateTimer <= 0) {
        npc.scene = 'outside'; npc.x = npc.col * TILE; npc.y = 28 * TILE;
        npc.phase = 'outsideIn';
      }
      break;
  }
}
