---
description: "Merge checklist + git workflow. Use when user says 提交/commit/push/PR/merge/发布/ship."
mode: "agent"
tools: [read, edit, search, execute]
---

执行修仙小游戏项目的完整合并前检查清单和 Git 工作流。

## 步骤

1. **验证**：`npm run build` 必须通过，无报错
2. **检查清单** — 逐项检查，有问题则修复：
   - [ ] `docs/changelog.md` — 如果功能/行为有变化，追加今天的条目
   - [ ] `docs/roadmap.md` — 如果某阶段完成，更新状态标记（✅）
   - [ ] `docs/progress.md` — 把已完成阶段移到「已完成」表，设置下一阶段的任务拆解
   - [ ] `.github/copilot-instructions.md` 项目目录树 — 如果目录结构变了就更新
   - [ ] `staticwebapp.config.json` — 如有需要则更新，确认 `navigationFallback` 指向 `index.html`
3. **Git 工作流**：
   - 从 `main` 创建分支：`stage-N/简要描述`
   - `git add -A && git commit -m "stage N: 简要描述"`
   - `git push -u origin <分支名>`
   - `gh pr create --base main --head <分支名> --title "同提交信息" --body "改动要点"`
4. **如果用户还说了合并**：`gh pr merge <编号> --squash --delete-branch`
5. **输出**：给用户 PR 链接
