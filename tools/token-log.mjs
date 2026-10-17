// token-log.mjs —— 增量统计本项目 Claude Code 会话的 token 消耗，追加到 docs/token-log.md
// 用法：
//   node tools/token-log.mjs --task "任务名"   任务完成时记录（归入该任务）
//   node tools/token-log.mjs                   无任务名记录（SessionEnd hook 兜底，记为「未归属」）
// 原理：Claude Code 把每次会话写在 ~/.claude/projects/<项目路径slug>/*.jsonl，
// 每条 assistant 消息带 message.usage（四类 token）和 message.model。
// 本脚本记住每个文件已解析的字节偏移（docs/token-log.state.json），只统计新增部分。
import { readFileSync, writeFileSync, appendFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const slug = projectDir.replace(/[^a-zA-Z0-9]/g, '-'); // Claude Code 的目录命名规则
const sessionsDir = join(homedir(), '.claude', 'projects', slug);
const logFile = join(projectDir, 'docs', 'token-log.md');
const stateFile = join(projectDir, 'docs', 'token-log.state.json');

const taskArg = process.argv.find((a) => a.startsWith('--task='));
const taskIdx = process.argv.indexOf('--task');
const taskName = (taskArg ? taskArg.slice('--task='.length) : taskIdx >= 0 ? process.argv[taskIdx + 1] : '') || '（未归属）';

const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : { offsets: {} };

// ---- 增量读取所有会话文件，汇总新增用量 ----
const byModel = new Map(); // model -> {input, output, cacheWrite, cacheRead}
let latestMode = null;
let t0 = null, t1 = null;

for (const file of readdirSync(sessionsDir).filter((f) => f.endsWith('.jsonl'))) {
  const full = join(sessionsDir, file);
  const offset = state.offsets[file] || 0;
  const size = statSync(full).size;
  if (size <= offset) continue;
  const chunk = readFileSync(full).subarray(offset, size).toString('utf8');
  const lastNl = chunk.lastIndexOf('\n');
  if (lastNl < 0) continue; // 没有完整行（可能正在写入），下次再读
  const processed = chunk.slice(0, lastNl + 1);
  // 偏移必须按字节记录：含中文时字符数 ≠ 字节数，直接存 lastNl 会导致下次重复统计
  state.offsets[file] = offset + Buffer.byteLength(processed, 'utf8');
  for (const line of processed.split('\n')) {
    if (!line.includes('"usage"') && !line.includes('permissionMode')) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (obj.permissionMode) latestMode = obj.permissionMode;
    const usage = obj.message && obj.message.usage;
    if (!usage) continue;
    const model = obj.message.model || 'unknown';
    if (model === '<synthetic>') continue; // Claude Code 的占位消息，无真实消耗
    if (!byModel.has(model)) byModel.set(model, { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 });
    const acc = byModel.get(model);
    acc.input += usage.input_tokens || 0;
    acc.output += usage.output_tokens || 0;
    acc.cacheWrite += usage.cache_creation_input_tokens || 0;
    acc.cacheRead += usage.cache_read_input_tokens || 0;
    if (obj.timestamp) {
      if (!t0 || obj.timestamp < t0) t0 = obj.timestamp;
      if (!t1 || obj.timestamp > t1) t1 = obj.timestamp;
    }
  }
}

writeFileSync(stateFile, JSON.stringify(state, null, 2));

if (byModel.size === 0) {
  console.log('token-log: 无新增用量，跳过记录。');
  process.exit(0);
}

// ---- 追加记录 ----
if (!existsSync(logFile)) {
  writeFileSync(logFile, [
    '# Token 消耗记录',
    '',
    '由 `tools/token-log.mjs` 自动生成：任务完成时以 `--task` 记录归属；会话结束时由 SessionEnd hook 兜底记录「（未归属）」。',
    '',
    '| 记录时间 | 任务 | 模型 | 模式 | 输入 | 输出 | 缓存写 | 缓存读 |',
    '| --- | --- | --- | --- | ---: | ---: | ---: | ---: |',
    '',
  ].join('\n'));
}

const now = new Date().toLocaleString('zh-CN', { hour12: false });
const safeTask = taskName.replace(/[|\n\r]/g, ' ');
for (const [model, u] of byModel) {
  appendFileSync(logFile,
    `| ${now} | ${safeTask} | ${model} | ${latestMode || '—'} | ${u.input} | ${u.output} | ${u.cacheWrite} | ${u.cacheRead} |\n`);
  console.log(`token-log: ${safeTask} [${model}] 输入 ${u.input} / 输出 ${u.output} / 缓存写 ${u.cacheWrite} / 缓存读 ${u.cacheRead}` +
    (t0 ? `（${t0.slice(0, 16)} ~ ${t1.slice(0, 16)}）` : ''));
}
