// audio.js —— 音频数据：BGM 音轨路径 + 猫咪嗓音基频（纯数据，机制在 src/audio.js）

// BGM 音轨：场景 → mp3 路径（相对 index.html）；加曲子 = 在这里加一行
export const BGM_TRACKS = { indoor: 'src/assent/canon.mp3', outside: 'src/assent/Annies Wonderland.mp3' };

// 10 只猫的专属嗓音（基频 Hz，key = 猫 id，对应 src/npc/cats.js）
export const CAT_VOICES = {
  momo: 450, meiqiu: 470, huihui: 540, tuantuan: 600, buding: 620,
  naitang: 660, huajuan: 680, zhima: 700, tangyuan: 720, xueqiu: 760,
};
