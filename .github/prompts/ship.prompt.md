---
description: "Merge checklist + git workflow. Use when user says 提交/commit/push/PR/merge/发布/ship."
mode: "agent"
tools: [read, edit, search, execute]
---

执行修仙小游戏项目的完整合并前检查清单和 Git 工作流。

## 步骤

1. **验证**：`npm run build` 必须通过，无报错
2. **检查清单** — 逐项检查，有问题则修复：
   - [ ] **任务文件**：完成的任务从 `docs/tasks/todo/` 移到 `docs/tasks/done/`，更新文件内状态为 ✅ + 关键文件 + 完成日期
   - [ ] **`docs/roadmap.md`**：完成的任务状态改为 ✅，链接路径从 `tasks/todo/` 改为 `tasks/done/`
   - [ ] **`docs/progress.md`**：移除已完成任务，加入最近完成表，检查新解锁的可执行任务
   - [ ] `docs/changelog.md` — 如果功能/行为有变化，追加今天的条目
   - [ ] `.github/copilot-instructions.md` 项目目录树 — 如果目录结构变了就更新
   - [ ] `staticwebapp.config.json` — 如有需要则更新
3. **Git 工作流**：
   - 从 `main` 创建分支：`stage-N/简要描述`
   - `git add -A && git commit -m "stage N: 简要描述"`
   - `git push -u origin <分支名>`
   - `gh pr create --base main --head <分支名> --title "同提交信息" --body "改动要点"`
4. **如果用户还说了合并**：`gh pr merge <编号> --squash --delete-branch`
5. **输出**：给用户 PR 链接
