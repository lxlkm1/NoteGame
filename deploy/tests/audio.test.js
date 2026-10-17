'use strict';
const test = require('node:test');
const assert = require('node:assert');
const {
  noteFreq, CAT_VOICES,
  isMuted, toggleMute, setMuted, play, init, startBgm, setBgmTrack,
} = require('../../src/audio.js');

test('切换室外曲目并返回馆内时保留静音状态', async () => {
  const audio = {
    src: 'src/assent/canon.mp3', paused: true, muted: false, currentTime: 25,
    volume: 1, play() { this.paused = false; return Promise.resolve(); },
    pause() { this.paused = true; },
  };
  global.document = { getElementById: () => audio };
  init(); startBgm(); setMuted(true);
  setBgmTrack('outside');
  assert.match(audio.src, /Annies Wonderland\.mp3$/);
  assert.equal(audio.paused, false);
  assert.equal(audio.currentTime, 0);
  assert.equal(audio.muted, true);
  setBgmTrack('atrium');
  assert.match(audio.src, /canon\.mp3$/);
  assert.equal(audio.paused, false);
  setMuted(false);
  delete global.document;
});

test('noteFreq：A4=440，C5≈523.25，F#5≈739.99', () => {
  assert.equal(noteFreq('A4'), 440);
  assert.ok(Math.abs(noteFreq('C5') - 523.25) < 0.01, `C5=${noteFreq('C5')}`);
  assert.ok(Math.abs(noteFreq('F#5') - 739.99) < 0.01, `F#5=${noteFreq('F#5')}`);
});

test('CAT_VOICES：10 只猫齐全、基频互异、均在 400–800Hz', () => {
  const ids = Object.keys(CAT_VOICES);
  assert.equal(ids.length, 10);
  assert.deepEqual(
    ids.slice().sort(),
    ['buding','huajuan','huihui','meiqiu','momo','naitang','tangyuan','tuantuan','xueqiu','zhima'].slice().sort()
  );
  const values = ids.map((id) => CAT_VOICES[id]);
  assert.equal(new Set(values).size, 10, '基频重复');
  for (const v of values) assert.ok(v >= 400 && v <= 800, `${v} 超出 400–800`);
});

test('静音状态机：默认非静音，toggle 反转', () => {
  setMuted(false);
  assert.equal(isMuted(), false);
  assert.equal(toggleMute(), true);
  assert.equal(isMuted(), true);
  assert.equal(toggleMute(), false);
  assert.equal(isMuted(), false);
});

test('play() 静音时不产生输出（返回 false）', () => {
  setMuted(true);
  assert.equal(play('dish'), false);
  assert.equal(play('meow', { cat: { id: 'momo' } }), false);
  assert.equal(play('follow'), false);
  assert.equal(play('purr'), false);
  assert.equal(play('不存在的音效'), false);
  setMuted(false);
});

test('未初始化（无 AudioContext，Node 环境）时 play() 返回 false', () => {
  setMuted(false);
  assert.equal(isMuted(), false);
  assert.equal(play('dish'), false); // 无 ctx → 无输出
});
