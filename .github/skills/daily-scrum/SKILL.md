---
name: daily-scrum
description: "Daily scrum: sync docs, audit issues, fix inconsistencies, update roadmap & copilot-instructions. Use when: daily scrum, 每日站会, 同步文档, sync docs, 过一遍, audit issues, 检查状态, 巡检, standup, 对齐, 刷新状态."
argument-hint: '可选：指定范围，如 issues-only / roadmap-only / full（默认 full）'
---

# Daily Scrum — 文档与 Issue 状态巡检同步

自动化"每日站会"流程：扫描 GitHub Issues、roadmap、specs、copilot-instructions.md，找出所有不一致并修复。

## When to Use

- 用户说"daily scrum"、"每日站会"、"过一遍"、"同步文档"、"检查状态"
- 合并若干 PR 后，需要批量同步各处文档
- 新会话开始时，用于恢复上下文并确认项目状态一致

## Procedure

### 1. 收集数据（并行执行）

同时执行以下操作：

1. **读取 roadmap** — `docs/roadmap.md`，解析每个任务的 ID、状态（✅/📐/🔨/⬜/❌）、前置依赖、Issue 链接、Spec 链接
2. **查询所有 GitHub Issues** — 使用 `gh issue list --state all --limit 300 --json number,title,state,stateReason,labels` 获取全量 Issue
3. **列举 spec 文件** — `docs/specs/*.md`，得到所有已有的 Design Spec 文件名列表
4. **检查实际代码结构** — `find src/game src/components src/hooks src/data -maxdepth 2 -type f,d`，得到当前代码文件/目录清单

### 2. 交叉审计（找出不一致）

对比以上 4 个数据源，逐条检查以下规则：

#### 2.1 Issue 状态 vs Roadmap 状态

| Issue 状态 | Roadmap 状态 | 判定 |
|-----------|-------------|------|
| CLOSED (COMPLETED) | ✅ | ✅ 正常 |
| CLOSED (COMPLETED) | ⬜/📐/🔨 | ❌ roadmap 需更新为 ✅ |
| CLOSED (NOT_PLANNED) | ✅ | ❌ roadmap 应标 ❌ 取消 |
| OPEN | ✅ | ❌ Issue 应关闭 |
| OPEN | ⬜/📐 | ✅ 正常 |

#### 2.2 Spec 文件 vs Roadmap Spec 列

- spec 文件存在但 roadmap 中该任务 Spec 列为 `—` → 需补 spec 链接 + 状态改 📐
- roadmap Spec 列有链接但文件不存在 → 提醒（可能被删除或移动）

#### 2.3 Roadmap 缺失条目

- GitHub Issue 存在但 roadmap 中无对应行 → 需新增行
- roadmap 中有行但无 Issue 链接 → 需补链接

#### 2.4 copilot-instructions.md 文件结构

- 对比 `src/` 实际文件/目录与 copilot-instructions.md 中的「项目文件结构」段落
- 列出：新增了但未记录的文件/目录、已删除但仍列在文档中的条目

### 3. 生成巡检报告

输出结构化的巡检结果：

```markdown
## 🔍 Daily Scrum 巡检报告

### Issues 状态检查
| Issue | 标题 | Issue 状态 | Roadmap 状态 | 操作 |
|-------|------|-----------|-------------|------|
| #XXX | ... | CLOSED | ⬜ | 更新 roadmap → ✅ |
| #YYY | ... | OPEN | ✅ | 关闭 Issue |

### Spec 同步检查
| 任务 | 有 Spec 文件 | Roadmap 标记 | 操作 |
|------|-------------|-------------|------|
| T00XX | ✅ 存在 | — | 补链接 + 状态 → 📐 |

### Roadmap 缺失条目
| Issue | 标题 | 分类 | 操作 |
|-------|------|------|------|
| #XXX | ... | ... | 新增 roadmap 行 |

### 文件结构变更
| 路径 | 状态 | 操作 |
|------|------|------|
| src/game/xxx.ts | 新增未记录 | 补到 copilot-instructions.md |
| src/game/yyy.ts | 已记录但不存在 | 从文档中移除 |

### ✅ 无异常项
（如果某个检查类别完全通过，显示此行）
```

### 4. 确认后执行修复

将报告展示给用户，**等待用户确认后**再执行修复操作。

修复操作包括：

1. **更新 `docs/roadmap.md`** — 修正状态、补 spec 链接、补 Issue 链接、新增缺失行
2. **更新 `.github/copilot-instructions.md`** — 同步文件结构段落
3. **关闭已完成的 Issues** — `gh issue close <number> --reason completed --comment "..."`
4. **创建 chore 分支 + PR** — 分支名 `chore/daily-scrum-sync`，纯文档变更

### 5. 提交规范

- 分支：`chore/daily-scrum-sync`（如已存在则加日期后缀 `chore/daily-scrum-YYYY-MM-DD`）
- Commit message 格式：
  ```
  chore: daily scrum 文档同步

  roadmap.md:
  - [列出所有 roadmap 变更]

  copilot-instructions.md:
  - [列出所有文件结构变更]

  Issues:
  - [列出所有关闭的 Issue]
  ```
- PR title: `chore: daily scrum 文档同步`
- PR body: 完整巡检报告
- **不合并**，等用户本地测试后决定

## 注意事项

- 此 skill 只做**文档和 Issue 同步**，不修改 `src/` 下的代码
- 遵守项目规则：文档变更和代码变更**必须在不同分支/PR**
- 如果发现 roadmap 中有 🔨（开发中）状态但无活跃分支，在报告中提醒但不自动修改
- 所有 Issue 关闭操作需附带说明 comment
