# 音效与 BGM 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给已完成的像素图书馆游戏加入程序化 Web Audio 音效（投喂/猫叫/满心跟随/打盹）与卡农 BGM（D 大调固定循环），零音频文件、零依赖、零构建。

**Architecture:** 新增第 5 个 JS 文件 `js/audio.js`，遵循项目既有模块模式（IIFE + 全局 `const Sound` + 末尾 2 行 CJS 导出）。逻辑与合成分层：`noteFreq`/`CAT_VOICES`/`CANON_PROGRESSION`/`CANON_MELODY`/`canonBar()`/静音状态机是**纯逻辑**（顶层无 DOM/无 AudioContext，Node 可 `require` 直接单测）；`init()`/`play()`/`startBgm()` 是**浏览器合成引擎**（AudioContext 仅在 `init()` 内懒创建，一次性振荡器 + 前瞻调度器）。`main.js` 挂 7 个调用点，`index.html` 加一个 `<script>` 和一个 HUD `<span>`。

**Tech Stack:** HTML5 Canvas、原生 JavaScript（classic `<script>` 全局命名空间 + CJS 兼容导出）、Web Audio API（程序化合成）、Node 内置 `node:test`、Playwright（webapp-testing 技能，仅程序化验证，不看截图）。

## Global Constraints

- **零 npm 依赖、零构建**。不用 ES modules（`file://` 双击打开会被 CORS 拦截），用 classic `<script>` 顺序加载 + 全局命名空间，文件末尾 2 行 CJS 导出。加载顺序变为：`sprites.js → map.js → cats.js → audio.js → main.js`。
- `js/audio.js` 顶层**不得**引用 `document` / `window` / `AudioContext`（Node 兼容）；`AudioContext` 仅在 `init()` 函数内部创建。
- 游戏 UI 文案全部中文。
- 现有 17 个测试必须全部继续通过；测试命令统一为 `npm test`（= `node --test`，Node v24 下**不能**写 `node --test tests/` 目录参数）。新增 `tests/audio.test.js` 后总测试数 = 25。
- 静音：M 键切换（不做音量滑块）；HUD `#sound` span 显示 🔊/🔇；主增益 `masterGain` 默认 0.9，静音置 0（音效与 BGM 一起）。
- 事件音效**四类**：`dish` / `meow` / `follow` / `purr`（**无** `step`，已砍掉）。`meow` 必须传 `{ cat }`（按 `cat.id` 取专属嗓音）。
- BGM：D 大调卡农，和弦进行 D→A→Bm→F#m→G→D→G→A（每和弦 2s，一轮 16s），三层织体（低音 8 / 琶音 64 八分音符 / 旋律 ≥16），`canonBar()` 完全确定性（无随机数）。
- **温和调校原则（用户明示）**：整体音量低（BGM 总线 0.18 低于音效）、只用柔和波形（三角/正弦）、起音快衰减长（八音盒余韵）、不放强节奏——目标是"像远处角落的八音盒在慢慢转"。**不要让音效响亮或喧闹。**
- 每个任务完成即 `git commit`。

### 音色参数表（执行者不得自行发明数字，以下为唯一权威数值）

事件音效：

| 音效 | 波形 | 频率包络 | 时长 | 峰值增益 | 附加处理 |
|---|---|---|---|---|---|
| dish（放碟） | triangle | 180Hz → 120Hz 指数下滑 | 0.06s | 0.20 | attack 0.005s |
| meow（猫叫） | triangle | f0 → f0×1.5 → f0×0.8（线性），f0 = `CAT_VOICES[cat.id]` | 0.18s | 0.25 | 6Hz 正弦 LFO 颤音 ±3%；attack 0.02s |
| follow（满心） | triangle | D5 → F#5 → A5 三音符，各 0.15s | 0.45s | 0.22 | 每音衰减 0.35s |
| purr（打盹） | sawtooth | 55Hz 恒定 | 2.0s | 0.06 | 低通 200Hz；attack 0.1s |

BGM 三层（每音都经过：三角波 → BGM 总线 0.18 → 低通 2500Hz → master；另有延迟回声）：

| 层 | 波形 | 峰值增益 | 每音时长（时间轴 dur） | ADSR |
|---|---|---|---|---|
| bass（低音） | triangle | 0.10 | 2s | attack 0.008s / decay 1.4s / sustain 0 / release 0.3s |
| arpeggio（琶音） | triangle | 0.14 | 0.25s（八分音符） | 同上 |
| melody（旋律） | triangle | 0.16 | 0.5s（四分音符） | 同上 |

总线与全局：

| 参数 | 值 |
|---|---|
| `masterGain` | 0.9（静音 0） |
| `sfxGain`（音效总线） | 1.0 |
| `bgmGain`（BGM 总线） | 0.18 |
| BGM 低通截止频率 | 2500Hz |
| DelayNode 延迟时间 | 0.28s |
| DelayNode 反馈 | 0.25 |
| DelayNode wet | 0.3 |
| 前瞻调度器 | `setInterval` 25ms；每次向前排 100ms（`ctx.currentTime + 0.1`） |

每猫专属嗓音基频（Hz，key = 猫 id，对应 `js/cats.js` 的 `CAT_DEFS`）：

| id | 猫 | 基频 | id | 猫 | 基频 |
|---|---|---|---|---|---|
| momo | 墨墨 | 450 | xueqiu | 雪球 | 760 |
| meiqiu | 煤球 | 470 | tangyuan | 汤圆 | 720 |
| huihui | 灰灰 | 540 | huajuan | 花卷 | 680 |
| tuantuan | 团团 | 600 | zhima | 芝麻 | 700 |
| buding | 布丁 | 620 | naitang | 奶糖 | 660 |

---

### Task 1: `js/audio.js` 纯逻辑 + 完整合成引擎 + 单测（TDD）

**Files:**
- Create: `js/audio.js`
- Create: `tests/audio.test.js`

**Interfaces:**
- Consumes: 无（起点）
- Produces: 全局 `Sound`，字段（Task 2/3 依赖这些精确签名）：
  - `noteFreq(name)` → number（`'A4'`=440，支持 `'F#5'` 升号写法）
  - `CAT_VOICES` → `{ [catId]: number }`（10 只猫，400–800Hz）
  - `CANON_PROGRESSION` → `[{ name, bass, arp }]`（8 项，`arp` 为 8 个音名）
  - `CANON_MELODY` → `string[]`（32 个音名）
  - `canonBar()` → `[{ t, freq, dur, layer, gain }]`（一轮 16s，104 事件，按 `t` 升序，确定性）
  - `isMuted()` → boolean；`toggleMute()` → boolean（返回新状态）；`setMuted(v)` → boolean（测试/初始化用）
  - `init()` → void（懒创建 AudioContext，幂等）；`play(name, opts)` → boolean（调度成功 true / 静音或无 ctx 返回 false）；`startBgm()` / `stopBgm()` → void；`_debug()` → `{ inited, muted, masterGain, bgmRunning, scheduled }`（Playwright 探针）

- [ ] **Step 1: 写失败测试 `tests/audio.test.js`**

```js
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /home/lxl/Desktop/work/vibe-game && npm test`
Expected: 新增 8 个测试全部 FAIL（`Cannot find module '../js/audio.js'`）

- [ ] **Step 3: 实现 `js/audio.js`（完整文件，含纯逻辑 + 合成引擎）**

```js
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /home/lxl/Desktop/work/vibe-game && npm test`
Expected: 全部 PASS（原 17 + 新增 8 = 25）。若 `canonBar` 确定性断言失败，检查是否误用了随机数；若 `noteFreq` 失败，核对 `semis` 映射与 midi 公式。

- [ ] **Step 5: Commit**

```bash
cd /home/lxl/Desktop/work/vibe-game
git add js/audio.js tests/audio.test.js
git commit -m "feat: 程序化音效核心（noteFreq + 10 猫嗓音 + 卡农进行/旋律 + canonBar + 静音状态机 + 合成引擎）"
```

---

### Task 2: 接线（index.html + main.js）+ Playwright 程序化验证

**Files:**
- Modify: `index.html`（加 `<script src="js/audio.js">` + HUD `#sound` span）
- Modify: `js/main.js`（挂 7 个调用点 + M 键监听 + HUD 符号更新）

**Interfaces:**
- Consumes: 全局 `Sound`（Task 1）：`Sound.init()` / `Sound.startBgm()` / `Sound.toggleMute()` / `Sound.isMuted()` / `Sound.play(name, opts)`
- Produces: 浏览器内首次按键即出 BGM、M 键静音、四个事件音效在对应挂钩点触发。

- [ ] **Step 1: 改 `index.html`（脚本标签 + HUD 符号）**

脚本加载顺序加 `audio.js`（cats 之后、main 之前）：

```html
<script src="js/sprites.js"></script>
<script src="js/map.js"></script>
<script src="js/cats.js"></script>
<script src="js/audio.js"></script>
<script src="js/main.js"></script>
```

HUD 行追加静音符号 span：

```html
<div id="hud">📚 图书馆的猫 <span class="hint">WASD / 方向键移动</span> <span id="progress" class="hint">撸猫 0 / 10</span> <span id="sound" class="hint">🔊</span></div>
```

- [ ] **Step 2: `js/main.js` 加音频懒初始化 + M 键监听**

在 `window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));`（第 18 行）之后插入：

```js

  // ---- 音频：首次按键懒初始化 BGM + M 键静音 ----
  let audioInited = false;
  function updateSoundIcon() {
    document.getElementById('sound').textContent = Sound.isMuted() ? '🔇' : '🔊';
  }
  function initAudio() {
    if (audioInited) return;
    Sound.init();
    Sound.startBgm();
    audioInited = true;
    updateSoundIcon();
  }
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'm') {
      if (!audioInited) { Sound.init(); Sound.startBgm(); audioInited = true; }
      Sound.toggleMute();
      updateSoundIcon();
      return;
    }
    initAudio();
  });
```

- [ ] **Step 3: `js/main.js` 挂 4 个事件音效调用点**

（逐个精确替换；`cat` 与 `beforeState` 变量在各自上下文中已存在。）

1. dish（第 107 行附近）：

```js
    if (Cats.feed(cat, dishX, dishY)) { dishes.push({ x: dishX, y: dishY }); Sound.play('dish'); }
```

2. meow（第 122–125 行 `if (cat.hearts > before)` 块内加一行）：

```js
      if (cat.hearts > before) { // 刚吃完一口
        spawnHearts(cat.x + 8, cat.y);
        spawnText(cat.x + 8, cat.y - 10, '喵♪');
        Sound.play('meow', { cat });
      }
```

3. follow（在第 126 行撤碟判断**之前**插入满心边沿检测）：

```js
      if (beforeState === 'eat' && cat.state === 'follow') { // 满心跟随边沿
        Sound.play('follow');
      }
      if (beforeState === 'eat' && (cat.state === 'follow' || cat.state === 'wander')) { // 吃完撤碟（无论是否满心）
        if (dishes.length) dishes.shift();
      }
```

4. purr（在第 129 行 Zzz 判断**之前**插入进入打盹边沿检测）：

```js
      if (beforeState !== 'nap' && cat.state === 'nap') { // 进入打盹边沿 → 呼噜
        Sound.play('purr');
      }
      if (cat.state === 'nap' && Math.random() < dt * 0.5) { // 睡觉偶尔冒 Z
        spawnText(cat.x + 14, cat.y - 2, 'z');
      }
```

- [ ] **Step 4: 运行测试确认既有逻辑未破坏**

Run: `cd /home/lxl/Desktop/work/vibe-game && npm test`
Expected: 25/25 PASS（audio.js 是新增文件，main.js 改动不影响 Node 单测）。

- [ ] **Step 5: Playwright 程序化验证（不看截图，只读音频图）**

用 webapp-testing 技能启动 Chromium 并执行以下脚本（探针用**裸名 `Sound`**，非 `window.Sound`——因为 classic `<script>` 顶层 `const` 是全局词法绑定，不挂到 `window` 上）。若首次手势未触发 AudioContext（无头浏览器自动播放策略），改用启动参数 `--autoplay-policy=no-user-gesture-required` 再跑。

```js
// 通过 webapp-testing 技能环境执行
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file:///home/lxl/Desktop/work/vibe-game/index.html');
  const state = () => page.evaluate(() => Sound._debug());

  console.log('初始 inited:', (await state()).inited);                 // 期望 false

  await page.keyboard.press('w'); // 首次手势
  await page.waitForTimeout(200);
  const afterKey = await state();
  console.log('首次按键后:', afterKey);                                 // inited=true, masterGain≈0.9, bgmRunning=true

  const sched1 = afterKey.scheduled;
  await page.waitForTimeout(500);
  const sched2 = (await state()).scheduled;
  console.log('BGM 节点增长:', sched1, '->', sched2, sched2 > sched1 ? 'OK' : 'FAIL');

  await page.keyboard.press('m');
  await page.waitForTimeout(50);
  const m1 = await state();
  const icon1 = await page.evaluate(() => document.getElementById('sound').textContent);
  console.log('静音:', m1.muted, 'masterGain=', m1.masterGain, 'icon=', icon1); // true, 0, '🔇'

  await page.keyboard.press('m');
  await page.waitForTimeout(50);
  const m2 = await state();
  console.log('恢复:', m2.muted, 'masterGain=', m2.masterGain);          // false, ≈0.9

  const before = (await state()).scheduled;
  await page.evaluate(() => Sound.play('dish'));
  const after = (await state()).scheduled;
  console.log('SFX 调度:', after > before ? 'OK' : 'FAIL');

  await browser.close();
})();
```

Expected（全部 OK）：
- `初始 inited: false`（懒初始化，页面加载时无 AudioContext）
- `首次按键后`：`inited: true`、`masterGain: 0.9`、`bgmRunning: true`
- `BGM 节点增长: OK`（scheduled 随时间增长，前瞻调度器在工作）
- `静音: true, 0, '🔇'`；`恢复: false, ≈0.9`
- `SFX 调度: OK`

- [ ] **Step 6: Commit**

```bash
cd /home/lxl/Desktop/work/vibe-game
git add index.html js/main.js
git commit -m "feat: 音效接线（首次按键懒初始化 BGM + M 键静音 + 四类事件音效挂钩 + HUD 符号）"
```

---

### Task 3: 调校打磨 + README 更新 + 用户试听（最终验收）

**Files:**
- Modify: `README.md`
- Modify: `js/audio.js`（仅当用户试听反馈要求时，按上方「音色参数表」精确改数字）

**Interfaces:**
- Consumes: Task 2 全部
- Produces: v1.1 成品。

- [ ] **Step 1: 更新 `README.md`**

在「玩法」列表加一行，并扩充「技术说明」。完整 `README.md` 如下：

```markdown
# 📚 图书馆喂猫 · Library Cats

一个像素风治愈小游戏：在一间夜晚的图书馆里闲逛，找到 10 只猫，投喂它们。

## 玩法

- **WASD / 方向键** 移动
- 走近猫咪，按 **E** 投喂
- 每只猫有 5 颗心的好感度；喂满后它会开心地跟着你走一段
- 首次按键自动响起卡农 BGM；按 **M** 静音 / 恢复（HUD 显示 🔊/🔇）
- 没有目标，没有结局。猫开心，你开心。

## 运行

直接双击 `index.html` 即可（无需安装任何东西）。

或者起个本地服务：

```bash
python3 -m http.server 8137
# 打开 http://localhost:8137
```

## 技术说明

纯 HTML + Canvas + 原生 JavaScript，零依赖零构建。
音效与 BGM 全部由 Web Audio API 程序化合成（零音频文件）：
投喂/猫叫/满心跟随/打盹四类事件音效 + 卡农 D 大调循环 BGM，10 只猫各有专属嗓音基频。
`npm test` 跑单元测试（地图碰撞 / 精灵尺寸 / 猫状态机 / 音频纯逻辑）。

## 截图

见 `docs/screenshots/`。
```

- [ ] **Step 2: 全部测试回归**

Run: `cd /home/lxl/Desktop/work/vibe-game && npm test`
Expected: 25/25 PASS。

- [ ] **Step 3: 用户试听（人工最终验收，本任务不可跳过的显式步骤）**

请**用户本人**亲自玩并听声音，重点确认：
1. 是否"温和"——BGM 像远处八音盒，不吵不闹；
2. 每只猫的猫叫是否可辨、不刺耳；
3. 静音（M）是否立即生效、恢复是否自然；
4. 打盹呼噜是否足够轻、不突兀。

记录反馈：小的音量/音色调整**只改「音色参数表」里对应的那一个数字**（例如 BGM 太响 → 把 `bgmGain.gain.value` 从 0.18 降到 0.12；猫叫太尖 → 把 meow 峰值从 0.25 降到 0.20），改完 `npm test` 回归并让用户再听；大的改动（如换曲、变奏）记入后续迭代，不在本期做。

- [ ] **Step 4: Commit**

```bash
cd /home/lxl/Desktop/work/vibe-game
git add README.md js/audio.js
git commit -m "docs: README 补音效说明；按试听反馈微调音色（如有）"
```

---

## 计划自审记录

- **Spec 覆盖**：§3.1 四类音效（dish/meow/follow/purr）→ Task 1 `play()` + Task 2 挂钩；§3.2 每猫嗓音 → Task 1 `CAT_VOICES`；§3.3 卡农三层织体/和弦/确定性 → Task 1 `CANON_PROGRESSION`/`CANON_MELODY`/`canonBar()`；§3.4 静音状态机/masterGain → Task 1 静音状态机 + `applyMute()`；§4.1 文件与接口 → Task 1 `Sound` 接口；§4.2 合成要点（一次性振荡器/前瞻调度器/顶层零 DOM/确定性）→ Task 1 全部落实；§4.3 单测 + Playwright + 人工试听 → Task 1 单测 / Task 2 Playwright / Task 3 试听；§4.4 兼容（17 测试继续通过/file:// 可玩/main.js 只挂 7 点）→ 各任务验证步骤；§5 边界（无音量滑块/无变奏/无脚步/无素材）→ 均未纳入 ✓
- **已知取舍 / 需向执行者说明的 spec 歧义与解决**：
  1. **旋律节奏未指定**：设计文档只给了 16 音主题与"extended to cover 8 bars"，未指定扩展的节奏与音区。**解决**：旋律按四分音符（0.5s/音），16 音主题 = 4 小节（8s），重复一次 = 32 个旋律音覆盖 8 小节（16s），满足"≥16 音"。
  2. **BGM 各层音区未指定**：bass 用八度 2（D2~A2），琶音用八度 3–4，旋律用八度 4–5（八音盒音域）。已在 `CANON_PROGRESSION`/`CANON_MELODY` 写死音名。
  3. **follow 挂钩行号**：设计文档写"L126"实为撤碟判断行；满心跟随边沿需 `beforeState === 'eat' && cat.state === 'follow'`，已拆分出独立检测（Task 2 Step 3 第 3 点）。
- **占位符扫描**：无 TBD/TODO/占位。Task 1 的 `js/audio.js` 一次性给出完整实现（纯逻辑 + 合成引擎全量），Task 2/3 无"类似 Task N"式省略。
- **类型一致**：`play(name, opts)` 返回 boolean（静音或无 ctx 返回 false）在 Task 1 定义、Task 2/3 直接消费；`_debug()` 返回字段（`inited/muted/masterGain/bgmRunning/scheduled`）在 Task 1 定义、Task 2 Playwright 探针按此读取；`canonBar()` 事件字段 `{ t, freq, dur, layer, gain }` 在 Task 1 定义、测试与调度器（`bgmNote` 读 `ev.freq`/`ev.gain`）一致。
- **数字核验**：noteFreq(A4)=440、C5≈523.25、F#5≈739.99 ✓；D 大调音（D E F# G A B C#）逐一核对旋律与琶音 ✓；和弦音 D=[D,F#,A]、A=[A,C#,E]、Bm=[B,D,F#]、F#m=[F#,A,C#]、G=[G,B,D] 与 arp/bass 一致 ✓。
