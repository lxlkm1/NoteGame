# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 工作规则

1. **先拆解，后动手**：当我提出一个功能想法时，不要直接实现。先把想法拆解成具体任务清单交给我审查，等我修改并确认后再开始行动。
2. **任务完成记 token**：每个任务经我确认完成后，运行 `node tools/token-log.mjs --task "任务名"` 记录本次消耗，并把输出的数字简要报给我。会话结束时 SessionEnd hook 会自动兜底记录「（未归属）」。
