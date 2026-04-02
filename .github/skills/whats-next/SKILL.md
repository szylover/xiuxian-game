---
name: whats-next
description: "Suggest what to work on next by combining roadmap and GitHub Issues. Use when: 现在有啥能做的, what's next, 下一步, 能做什么, suggest tasks, what can I do, 接下来做什么, next task, 做什么好, available tasks, todo, 待办."
argument-hint: '可选：指定关注的分类，如 核心循环/事件系统/物品与经济/UI体验/DLC 等'
---

# What's Next — 综合建议下一步任务

根据项目 roadmap 和 GitHub Issues 的实时状态，给用户推荐当前可以做的任务。

## When to Use

- 用户问"现在有啥能做的"、"下一步做什么"、"接下来做什么"
- 用户想了解项目当前进度和可执行任务
- 新会话恢复上下文，需要知道做到哪了

## Procedure

### 1. 收集数据

同时执行以下操作：

1. **读取 roadmap** — 读取 `docs/roadmap.md`，解析所有任务的状态（✅/📐/🔨/⬜）、前置依赖、分类
2. **查询 GitHub Open Issues** — 使用 GitHub CLI 或 GitHub PR 扩展搜索 `repo:szylover/xiuxian-game is:issue is:open`，获取所有 open 状态的 issue

### 2. 分析可执行任务

对每个状态为 ⬜（未开始）或 📐（设计完成）的任务，检查：

- **前置依赖是否全部完成**（状态为 ✅）— 只推荐前置全部完成的任务
- **是否有对应的 GitHub Issue 且仍处于 open 状态**
- **是否已有 Design Spec**（检查 `docs/specs/` 下是否存在对应文件）

### 3. 分类整理

将可执行任务按以下维度分类展示：

#### 优先级排序规则

1. 📐 **设计已完成、待实现** — 最高优先级，可以直接交给 @Dev
2. ⬜ **前置全部完成、无 Spec** — 需要先由 @PM 产出 Design Spec
3. ⬜ **前置部分完成** — 暂时不可执行，但可以提前设计

#### 如果用户指定了分类

只展示该分类下的任务（核心循环/事件系统/物品与经济/功法与技能/世界与地图/社交与NPC/进阶机制/界面与体验/部署与体验/DLC）。

### 4. 输出格式

```markdown
## 📊 项目进度概览

- 总任务数：XX
- 已完成：XX (XX%)
- 进行中：XX
- 未开始：XX

## 🚀 现在可以做的

### 可直接实现（有 Spec）

| ID | 任务 | 分类 | Spec | Issue |
|----|------|------|------|-------|
| ... | ... | ... | [link] | [#N] |

### 需要先设计（无 Spec，前置已满足）

| ID | 任务 | 分类 | 前置 | Issue |
|----|------|------|------|-------|
| ... | ... | ... | ... | [#N] |

## ⏳ 即将解锁（差 1-2 个前置）

| ID | 任务 | 缺少的前置 | Issue |
|----|------|-----------|-------|
| ... | ... | ... | [#N] |

## 💡 建议

根据依赖图和项目阶段，推荐 1-3 个最值得优先做的任务，并说明理由。
```

### 5. 额外检查

- 如果有 GitHub Issue 标记为 open 但 roadmap 中已标 ✅，提醒用户关闭 issue
- 如果有 roadmap 中标 🔨 但没有对应的活跃分支，提醒用户确认状态
- 如果用户指定了关注分类，额外展示该分类的依赖链路图
