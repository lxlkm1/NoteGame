// audio.js —— 音效与 BGM（音效用 Web Audio 合成，BGM 用 <audio> 标签）
const Sound = (() => {
  'use strict';

  // ---- 音高换算（A4 = 440Hz，十二平均律） ----
  const semis = {C:0, 'C#':1, D:2, 'D#':3, E:4, F:5, 'F#':6, G:7, 'G#':8, A:9, 'A#':10, B:11};
  function noteFreq(name) {
    const m = name.match(/^([A-G]#?)(\d)$/);
    if (!m) return 440;
    const midi = (parseInt(m[2], 10) + 1) * 12 + semis[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // ---- 10 只猫的专属嗓音（基频 Hz） ----
  const CAT_VOICES = {
    momo: 450, meiqiu: 470, huihui: 540, tuantuan: 600, buding: 620,
    naitang: 660, huajuan: 680, zhima: 700, tangyuan: 720, xueqiu: 760,
  };

  // ---- 静音状态机 ----
  let muted = false;
  function isMuted() { return muted; }
  function toggleMute() {
    muted = !muted;
    applyMute();
    return muted;
  }
  function setMuted(v) {
    muted = !!v;
    applyMute();
    return muted;
  }

  // ---- 浏览器合成引擎（AudioContext 用于音效，<audio> 用于 BGM） ----
  let ctx = null, masterGain = null, sfxGain = null, bgmAudio = null;
  const BGM_TRACKS = { indoor: 'assent/canon.mp3', outside: 'assent/Annies Wonderland.mp3' };
  let bgmTrack = 'indoor';

  function applyMute() {
    if (ctx && masterGain) {
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setValueAtTime(muted ? 0 : 0.9, ctx.currentTime);
    }
    if (bgmAudio) {
      bgmAudio.muted = muted;
    }
  }

  function init() {
    if (ctx || bgmAudio) return; // 幂等
    bgmAudio = document.getElementById('bgm');
    if (bgmAudio) {
      bgmAudio.volume = 0.3;
      bgmAudio.muted = muted;
    }
    const AC = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) || null;
    if (!AC) return;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 0.9;
    masterGain.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 1.0;
    sfxGain.connect(masterGain);
  }

  function setBgmTrack(sceneName) {
    const next = sceneName === 'outside' ? 'outside' : 'indoor';
    if (bgmTrack === next) return;
    bgmTrack = next;
    if (!bgmAudio) return;
    const wasPlaying = !bgmAudio.paused;
    bgmAudio.src = BGM_TRACKS[next];
    bgmAudio.currentTime = 0;
    bgmAudio.muted = muted;
    if (wasPlaying) bgmAudio.play().catch(e => console.warn('BGM autoplay blocked:', e));
  }

  function startBgm() {
    if (bgmAudio && !bgmAudio.paused) return; // 已在播放
    if (bgmAudio) {
      bgmAudio.play().catch(e => console.warn('BGM autoplay blocked:', e));
    }
  }

  function stopBgm() {
    if (bgmAudio) {
      bgmAudio.pause();
      bgmAudio.currentTime = 0;
    }
  }

  // ---- 音效合成帮手 ----
  function sfx({ wave, freq, sweepTo, dur, peak, attack, filter }) {
    if (!ctx) return;
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
  }

  function playDish() {
    sfx({ wave: 'triangle', freq: 180, sweepTo: 120, dur: 0.06, peak: 0.20 });
  }

  function playMeow(cat) {
    if (!ctx) return;
    const f0 = CAT_VOICES[cat.id] || 520;
    const when = ctx.currentTime;
    const dur = 0.18;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f0, when);
    osc.frequency.linearRampToValueAtTime(f0 * 1.5, when + 0.06);
    osc.frequency.linearRampToValueAtTime(f0 * 0.8, when + dur);
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
  }

  function playFollow() {
    if (!ctx) return;
    ['D5','F#5','A5'].forEach((name, i) => {
      const t = ctx.currentTime + i * 0.15;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = noteFreq(name);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(g); g.connect(sfxGain);
      osc.start(t); osc.stop(t + 0.16);
    });
  }

  function playPurr() {
    sfx({ wave: 'sawtooth', freq: 55, dur: 2, peak: 0.06, filter: 200 });
  }

  function play(name, opts) {
    if (muted || !ctx) return false;
    switch (name) {
      case 'dish':   playDish(); return true;
      case 'meow':   if (!opts || !opts.cat || !opts.cat.id) return false; playMeow(opts.cat); return true;
      case 'follow': playFollow(); return true;
      case 'purr':   playPurr(); return true;
      default: return false;
    }
  }

  function _debug() {
    return {
      inited: !!ctx,
      muted,
      masterGain: masterGain ? masterGain.gain.value : null,
      bgmPlaying: bgmAudio ? !bgmAudio.paused : false,
    };
  }

  return { noteFreq, CAT_VOICES, init, play, startBgm, stopBgm, setBgmTrack, toggleMute, setMuted, isMuted, _debug };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Sound;
