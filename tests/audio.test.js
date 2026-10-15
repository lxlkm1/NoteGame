'use strict';
const test = require('node:test');
const assert = require('node:assert');
const {
  noteFreq, CAT_VOICES, CANON_PROGRESSION, CANON_MELODY, canonBar,
  isMuted, toggleMute, setMuted, play,
} = require('../js/audio.js');

const pitchClass = (name) => name.replace(/[0-9]/g, '');

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

test('CANON_PROGRESSION：8 个和弦、顺序正确、和弦音正确', () => {
  assert.equal(CANON_PROGRESSION.length, 8);
  assert.deepEqual(CANON_PROGRESSION.map((c) => c.name), ['D','A','Bm','F#m','G','D','G','A']);
  const chordTones = {
    'D': new Set(['D','F#','A']),
    'A': new Set(['A','C#','E']),
    'Bm': new Set(['B','D','F#']),
    'F#m': new Set(['F#','A','C#']),
    'G': new Set(['G','B','D']),
  };
  const rootOf = { 'D': 'D', 'A': 'A', 'Bm': 'B', 'F#m': 'F#', 'G': 'G' };
  for (const c of CANON_PROGRESSION) {
    assert.equal(c.arp.length, 8, `${c.name} arp 长度`);
    for (const n of c.arp) assert.ok(chordTones[c.name].has(pitchClass(n)), `${c.name} 的 arp 音 ${n} 不是和弦音`);
    assert.equal(pitchClass(c.bass), rootOf[c.name], `${c.name} 的 bass ${c.bass} 不是根音`);
  }
});

test('旋律与琶音全部音都在 D 大调（D E F# G A B C#）内', () => {
  const dMajor = new Set(['D','E','F#','G','A','B','C#']);
  for (const n of CANON_MELODY) assert.ok(dMajor.has(pitchClass(n)), `旋律 ${n} 不在 D 大调`);
  for (const c of CANON_PROGRESSION) for (const n of c.arp) assert.ok(dMajor.has(pitchClass(n)), `${n} 不在 D 大调`);
});

test('canonBar：三层事件齐全、时间跨度 16s、频率为正、确定性', () => {
  const bar = canonBar();
  const count = { bass: 0, arpeggio: 0, melody: 0 };
  for (const ev of bar) count[ev.layer]++;
  assert.equal(count.bass, 8);
  assert.equal(count.arpeggio, 64);
  assert.ok(count.melody >= 16, `melody=${count.melody}`);
  for (const ev of bar) {
    assert.ok(ev.t >= 0 && ev.t < 16, `t 越界 ${ev.t}`);
    assert.ok(ev.freq > 0, `freq 非法 ${ev.freq}`);
    assert.ok(ev.dur > 0, `dur 非法 ${ev.dur}`);
  }
  for (let i = 1; i < bar.length; i++) assert.ok(bar[i].t >= bar[i-1].t, '时间轴未按 t 升序');
  assert.deepEqual(canonBar(), bar); // 确定性：两次调用结果一致
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
