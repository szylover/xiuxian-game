# 变更日志

## 2026-03-27

### 路线图拆分 & DLC 扩展性规划
- `docs/roadmap.md` 精简为索引文件（总览 + DLC 规划 + 扩展性约定）
- 新增 `docs/roadmap/milestone-{a~h}.md`，每个 Milestone 独立文件
- 小说奇遇事件从 Milestone B 移出，改为 DLC 形式（一本小说 = 一个 Milestone）
- `copilot-instructions.md` 新增 DLC 扩展性设计原则和 roadmap 目录结构

### TypeScript 迁移
- **全量迁移**：项目从 React + JavaScript 迁移至 React + TypeScript
- 添加 `tsconfig.json`、`vite-env.d.ts`
- 所有 `.jsx`→`.tsx`、`.js`→`.ts`（含 `vite.config.ts`）
- 游戏逻辑层完整类型定义：`Player`、`Aptitudes`、`Realm`、`Monster`、`CombatResult` 等接口
- React 组件全部添加 Props 接口
- 新增 dev 依赖：`typescript`、`@types/react`、`@types/react-dom`
- 构建脚本更新为 `tsc && vite build`
- `copilot-instructions.md` 同步更新文件结构

## 2026-03-26

### Milestone A: 核心循环实现
- **项目搭建**：Vite + React 项目初始化（`package.json`, `vite.config.js`, `index.html`）
- **A-1 属性系统**：`src/game/player.js` — 四类属性（基础/战斗/先天/资质），资质品级加权生成，灵根品级评定
- **A-1 数据表**：`src/game/data.js` — 8 境界、10 妖兽、6 丹药、操作消耗/时间表
- **A-2 修炼系统**：悟性/灵根/心情三重乘数影响经验获取，精力消耗限制操作
- **A-3 战斗系统 v2**：`src/game/combat.js` — 减防→暴击→闪避伤害公式，speed 先手规则
- **A-4 境界突破**：悟性+幸运影响成功率，失败损失 10% 修为
- **A-5 寿命系统**：操作推进时间，寿元耗尽→游戏结束
- **A-6 状态面板 v2**：四栏属性展示 + 进度条可视化
- **存档系统**：localStorage 自动存档/读档
- **随机事件**：`src/game/events.js` — 6 个探索事件（luck 加权）

### 项目初始化
- 创建项目骨架：`src/index.html`, `style.css`, `main.js`, `game/*.js`
- 配置 Azure Static Web Apps：`staticwebapp.config.json`
- Agent 工作流搭建：4 个 Agent（`@Architect`、`@Dev`、`@Designer`、`@Progress`）+ 1 个 Prompt（`/ship`）
- 文档体系：`docs/roadmap.md`（37 阶段路线图）、`docs/progress.md`（进度看板）、`docs/changelog.md`（变更日志）
- 属性系统设计文档：`docs/specs/design-attribute-system.md`（四类属性完整设计）
- 小说奇遇事件设计文档：`docs/specs/design-novel-events.md`（5 大分类 14 个小说事件，含数据结构草案 + 完成度跟踪表）
