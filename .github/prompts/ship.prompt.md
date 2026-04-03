---
description: "Merge checklist + git workflow. Use when user says 提交/commit/push/PR/merge/发布/ship."
mode: "agent"
tools: [read, edit, search, execute]
---

执行修仙小游戏项目的完整合并前检查清单和 Git 工作流。

## 前置：判断变更类型

- **纯文档变更**（`docs/`、`.github/` 下的 spec/task/roadmap 等）→ 分支前缀 `chore/`
- **代码变更**（`src/`）→ 分支前缀 `feat/` 或 `fix/`
- **文档与代码禁止混在同一个 PR**。如果当前分支同时有 docs/ 和 src/ 改动，必须拆成两个分支分别提交。

## 步骤

### 1. 验证构建

```bash
npx tsc --noEmit && npx vite build
```

必须无报错。

### 2. 检查清单 — 逐项检查，有问题则修复

- [ ] **关闭 GitHub Issue**：通过 `gh issue close <number> --reason completed` 关闭对应 Issue，或在 PR body 中写 `Closes #N` 让合并时自动关闭
- [ ] **`docs/roadmap.md`**：完成的任务状态改为 ✅（仅改状态图标，不需要改链接）
- [ ] **`docs/test-guide.md`**：追加新功能测试用例章节（≥4 条），如涉及 Debug 面板变更则同步更新「附录 A：调试面板功能清单」
- [ ] **调试面板**：如新功能引入了需要手动测试的数值/物品/状态，`src/components/debug/` 已同步更新
- [ ] **`src/data/changelog.ts`**：在 `CHANGELOG` 数组顶部追加本次版本条目，同步更新 `CURRENT_VERSION`。格式：
  ```ts
  {
    version: '1.x.y',
    date: 'YYYY-MM-DD',
    title: '版本标题',
    items: ['变更描述…'],
  }
  ```
- [ ] **`.github/copilot-instructions.md`** 项目目录树 — 如果目录结构变了就更新
- [ ] **`staticwebapp.config.json`** — 如有需要则更新

### 3. Git 工作流（禁止直接 push 到 main，必须走 PR）

```bash
# 确保在正确的功能分支上（不是 main）
git branch  # 确认当前分支

# 如果还在 main 上，先创建分支
git checkout -b feat/T0XXX-简要描述

# 提交
git add -A
git commit -m "feat(T0XXX): 简要描述

- 改动要点 1
- 改动要点 2

Closes #Issue编号"

# 推送并创建 PR
git push -u origin <分支名>
gh pr create --base main --head <分支名> --title "feat(T0XXX): 简要描述" --body "改动要点"
```

分支命名规范：
- `feat/T0XXX-简要描述` — 新功能
- `fix/简要描述` — 修复
- `chore/简要描述` — 文档/配置/重构

### 4. 合并（如果用户说了合并/merge）

```bash
gh pr merge <编号> --squash --delete-branch
git checkout main && git pull
```

### 5. 输出

给用户 PR 链接 + 简要变更总结。
