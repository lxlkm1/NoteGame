// audio.js —— 程序化 Web Audio：事件音效 + 卡农 BGM（纯合成，零音频文件）
const Sound = (() => {
  'use strict';

  // ============ 纯逻辑（Node 可直接 require 测试；顶层无 DOM/无 AudioContext） ============

  // 音名 → 频率：A4=440，十二平均律，支持 'F#5' 这类带升号的写法
  function noteFreq(name) {
    const m = /^([A-Ga-g])([#b]?)(\d)$/.exec(name);
    if (!m) throw new Error('非法音名: ' + name);
    const semis = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    let midi = (parseInt(m[3], 10) + 1) * 12 + semis[m[1].toUpperCase()];
    if (m[2] === '#') midi += 1;
    else if (m[2] === 'b') midi -= 1;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // 10 只猫专属嗓音基频（Hz），key = 猫 id（对应 js/cats.js 的 CAT_DEFS）
  const CAT_VOICES = {
    xueqiu: 760,   // 雪球（窗台·白）
    tuantuan: 600, // 团团（橘猫）
    tangyuan: 720, // 汤圆（白灰）
    buding: 620,   // 布丁（黄猫）
    meiqiu: 470,   // 煤球（黑白）
    momo: 450,     // 墨墨（书架深处·黑）
    naitang: 660,  // 奶糖（奶牛）
    zhima: 700,    // 芝麻（三花）
    huihui: 540,   // 灰灰（借阅台·灰）
    huajuan: 680,  // 花卷（门边·橘白）
  };

  // 卡农和弦进行：D → A → Bm → F#m → G → D → G → A（每和弦 2s，一轮 16s）
  // arp 为每和弦 8 个八分音符（0.25s/个）的琶音音名序列，全部是 D 大调音
  const CANON_PROGRESSION = [
    { name: 'D',   bass: 'D2',  arp: ['D4','F#4','A4','F#4','A4','F#4','D4','F#4'] },
    { name: 'A',   bass: 'A2',  arp: ['A3','C#4','E4','C#4','E4','C#4','A3','C#4'] },
    { name: 'Bm',  bass: 'B2',  arp: ['B3','D4','F#4','D4','F#4','D4','B3','D4'] },
    { name: 'F#m', bass: 'F#2', arp: ['F#3','A3','C#4','A3','C#4','A3','F#3','A3'] },
    { name: 'G',   bass: 'G2',  arp: ['G3','B3','D4','B3','D4','B3','G3','B3'] },
    { name: 'D',   bass: 'D2',  arp: ['D4','F#4','A4','F#4','A4','F#4','D4','F#4'] },
    { name: 'G',   bass: 'G2',  arp: ['G3','B3','D4','B3','D4','B3','G3','B3'] },
    { name: 'A',   bass: 'A2',  arp: ['A3','C#4','E4','C#4','E4','C#4','A3','C#4'] },
  ];

  // 卡农主题旋律（D 大调，公有领域）：16 个四分音符（0.5s/个）= 8s = 4 小节；
  // 重复一次覆盖整轮 8 小节（16s），共 32 个旋律音。全部音名均在 D 大调内。
  const CANON_MELODY = [
    'F#5','E5','D5','C#5','B4','A4','B4','C#5',
    'D5','C#5','B4','A4','G4','F#4','G4','E4',
    'F#5','E5','D5','C#5','B4','A4','B4','C#5',
    'D5','C#5','B4','A4','G4','F#4','G4','E4',
  ];

  // 各层增益（音效总线 1.0，主增益 0.9；BGM 总线另有 0.18）
  const LAYER_GAIN = { bass: 0.10, arpeggio: 0.14, melody: 0.16 };
  const LAYER_ORDER = ['bass', 'arpeggio', 'melody'];

  // 确定性函数：返回一轮 16s 的三层音符事件时间轴
  // 事件 = { t(秒,0..16), freq(Hz), dur(秒), layer, gain }
  function canonBar() {
    const events = [];
    CANON_PROGRESSION.forEach((chord, bar) => {
      const barT = bar * 2;
      events.push({ t: barT, freq: noteFreq(chord.bass), dur: 2, layer: 'bass', gain: LAYER_GAIN.bass });
      for (let i = 0; i < 8; i++) {
        events.push({ t: barT + i * 0.25, freq: noteFreq(chord.arp[i]), dur: 0.25, layer: 'arpeggio', gain: LAYER_GAIN.arpeggio });
      }
    });
    CANON_MELODY.forEach((name, i) => {
      events.push({ t: i * 0.5, freq: noteFreq(name), dur: 0.5, layer: 'melody', gain: LAYER_GAIN.melody });
    });
    events.sort((a, b) => a.t - b.t || LAYER_ORDER.indexOf(a.layer) - LAYER_ORDER.indexOf(b.layer));
    return events;
  }

  // ---- 静音状态机（纯逻辑，Node 可测） ----
  let muted = false;
  function isMuted() { return muted; }
  function toggleMute() {
    muted = !muted;
    applyMute();
    return muted;
  }
  function setMuted(v) { // 测试/初始化用：直接设静音态
    muted = !!v;
    applyMute();
    return muted;
  }

  // ============ 浏览器合成引擎（AudioContext 仅在 init() 内创建） ============
  let ctx = null;          // AudioContext
  let masterGain = null;   // 主增益（默认 0.9，静音 0）
  let sfxGain = null;      // 音效总线
  let bgmGain = null;      // BGM 总线（→ 低通 → master + 延迟）
  let bgmTimer = null;     // 前瞻调度器 setInterval 句柄
  let bgmRunning = false;
  let bgmEvents = null;    // canonBar() 的一轮完整时间轴
  let bgmCycleStart = 0;   // 当前循环的音频起始时刻
  let nextIndex = 0;       // 下一个要排入的绝对事件索引
  let scheduledCount = 0;  // 已调度的音符总数（测试/调试探针）

  function applyMute() {
    if (!ctx || !masterGain) return;
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setValueAtTime(muted ? 0 : 0.9, ctx.currentTime);
  }

  function init() {
    if (ctx) return; // 幂等：只在首次手势时创建一次
    const AC = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) || null;
    if (!AC) return; // 环境不支持 Web Audio（如 Node）则静默跳过
    ctx = new AC();

    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 0.9;
    masterGain.connect(ctx.destination);

    // BGM 总线：低通滤波 + 延迟回声（八音盒质感）
    bgmGain = ctx.createGain();
    bgmGain.gain.value = 0.18;
    const bgmFilter = ctx.createBiquadFilter();
    bgmFilter.type = 'lowpass';
    bgmFilter.frequency.value = 2500;
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.28;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.25;
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    bgmGain.connect(bgmFilter);
    bgmFilter.connect(masterGain);   // 干声
    bgmFilter.connect(delay);        // → 延迟
    delay.connect(feedback);
    feedback.connect(delay);         // 反馈环
    delay.connect(wet);
    wet.connect(masterGain);         // 湿声

    // 音效总线（不经 BGM 低通/延迟）
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 1.0;
    sfxGain.connect(masterGain);
  }

  // 一次性音效振荡器：osc + gain 包络，播完 stop 自动断开，无节点泄漏
  function sfx({ wave, freq, sweepTo, dur, peak, attack, filter }) {
    const when = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = wave || 'sine';
    osc.frequency.setValueAtTime(freq, when);
    if (sweepTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(sweepTo, 1), when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak, when + (attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    if (filter != null) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filter;
      osc.connect(f); f.connect(g);
    } else {
      osc.connect(g);
    }
    g.connect(sfxGain);
    osc.start(when);
    osc.stop(when + dur + 0.05);
    scheduledCount++;
  }

  function playDish() {
    sfx({ wave: 'triangle', freq: 180, sweepTo: 120, dur: 0.06, peak: 0.20 });
  }

  function playMeow(cat) {
    const f0 = CAT_VOICES[cat.id] || 520;
    const when = ctx.currentTime;
    const dur = 0.18;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    // 音高包络 ×1.0 → ×1.5 → ×0.8
    osc.frequency.setValueAtTime(f0, when);
    osc.frequency.linearRampToValueAtTime(f0 * 1.5, when + 0.06);
    osc.frequency.linearRampToValueAtTime(f0 * 0.8, when + dur);
    // 6Hz 颤音 ±3%
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 6;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = f0 * 0.03;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.25, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g); g.connect(sfxGain);
    osc.start(when); osc.stop(when + dur + 0.05);
    lfo.start(when); lfo.stop(when + dur + 0.05);
    scheduledCount++;
  }

  function playFollow() {
    ['D5','F#5','A5'].forEach((name, i) => {
      const t = ctx.currentTime + i * 0.15;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = noteFreq(name);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(g); g.connect(sfxGain);
      osc.start(t); osc.stop(t + 0.4);
      scheduledCount++;
    });
  }

  function playPurr() {
    sfx({ wave: 'sawtooth', freq: 55, dur: 2.0, peak: 0.06, attack: 0.1, filter: 200 });
  }

  function play(name, opts) {
    if (muted) return false;   // 静音 → 不产生任何输出
    if (!ctx) return false;    // 未初始化（非浏览器 / 尚无用户手势）→ 不产生输出
    switch (name) {
      case 'dish':   playDish(); return true;
      case 'meow': {
        const cat = opts && opts.cat;
        if (!cat || !cat.id) return false;
        playMeow(cat);
        return true;
      }
      case 'follow': playFollow(); return true;
      case 'purr':   playPurr(); return true;
      default: return false;
    }
  }

  // ---- 卡农 BGM：前瞻调度器（setInterval 25ms，每次向前排 100ms） ----
  function bgmNote(ev, when) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = ev.freq;
    const g = ctx.createGain();
    const attack = 0.008, decay = 1.4, release = 0.3;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(ev.gain, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
    osc.connect(g);
    g.connect(bgmGain);
    osc.start(when);
    osc.stop(when + attack + decay + release);
    scheduledCount++;
  }

  function scheduleBgm() {
    if (!bgmRunning || !ctx) return;
    const horizon = ctx.currentTime + 0.1; // 100ms 前瞻
    while (true) {
      const ev = bgmEvents[nextIndex % bgmEvents.length];
      const cycle = Math.floor(nextIndex / bgmEvents.length);
      const absTime = bgmCycleStart + cycle * 16 + ev.t;
      if (absTime > horizon) break;
      bgmNote(ev, absTime);
      nextIndex++;
    }
  }

  function startBgm() {
    if (!ctx || bgmTimer) return;
    bgmEvents = canonBar();
    bgmCycleStart = ctx.currentTime + 0.05;
    nextIndex = 0;
    bgmRunning = true;
    bgmTimer = setInterval(scheduleBgm, 25);
    scheduleBgm();
  }

  function stopBgm() {
    bgmRunning = false;
    if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
    nextIndex = 0;
  }

  // 调试/测试探针：Playwright 用 page.evaluate 读音频图状态
  function _debug() {
    return {
      inited: !!ctx,
      muted,
      masterGain: masterGain ? masterGain.gain.value : null,
      bgmRunning,
      scheduled: scheduledCount,
    };
  }

  return {
    noteFreq, CAT_VOICES, CANON_PROGRESSION, CANON_MELODY, canonBar,
    isMuted, toggleMute, setMuted,
    init, play, startBgm, stopBgm, _debug,
  };
})();

if (typeof module !== 'undefined') module.exports = Sound;
