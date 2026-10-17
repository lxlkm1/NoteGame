// 前庭左右各一个可投粮的碗，每次进入前庭随机选取安全位置。
const SPOTS = [
  [{ col: 13, row: 12 }, { col: 14, row: 17 }, { col: 13, row: 23 }],
  [{ col: 25, row: 12 }, { col: 24, row: 17 }, { col: 25, row: 23 }],
];
function create(rng = Math.random) {
  return SPOTS.map(side => {
    const spot = side[Math.min(side.length - 1, Math.floor(rng() * side.length))];
    return { x: spot.col * 16, y: spot.row * 16, filled: false };
  });
}
function nearestEmpty(bowls, player) {
  return bowls.find(bowl => !bowl.filled && Math.hypot(bowl.x - player.x, bowl.y - player.y) <= 24) || null;
}
export { create, nearestEmpty };
