# Agent 工作流

本项目使用 4 个 Agent + 1 个 Prompt 协作：

| 角色 | 文件 | 职责 | 工具 |
|------|------|------|------|
| **@PM** | `.github/agents/pm.agent.md` | 需求分析、设计文档、任务管理、进度追踪 | read, edit, search |
| **@Dev** | `.github/agents/dev.agent.md` | 实现 `src/` 下的 React + TS 代码 | read, edit, search, execute |
| **@Designer** | `.github/agents/designer.agent.md` | UI/UX 设计、CSS 美化、像素风资源 | read, edit, search |
| **@Content** | `.github/agents/content.agent.md` | 物品/装备/丹药/配方/妖兽数值设计、查漏补缺 | read, edit, search |
| **/ship** | `.github/prompts/ship.prompt.md` | Merge 检查清单 + Git 工作流 | read, edit, search, execute |

## 典型流程

**重要：任何 task 的实现都必须先由 @PM 产出 Design Spec，确认后再交给 @Dev 编码。禁止跳过设计直接写代码。**

```
用户: "实现战斗系统"
1. @PM  → 调研代码库 + 输出 Design Spec 到 docs/specs/ + 创建任务 + 更新 roadmap & progress
   ↓ 用户确认 spec 后
2. @Dev ║ @Designer  ← 并行消费同一份 spec（Dev 必须先检查 spec 是否存在）
3. /ship  → 检查清单 → commit → push → PR
```

### Git 规则

- **禁止直接 push 到 main**。所有代码必须通过创建分支 + PR 合并的方式进入 main。
- 分支命名：`feat/T0XXX-简要描述`、`fix/简要描述`、`chore/简要描述`
- PR 合并策略：squash merge

### 新会话恢复

```
用户: "我上次做到哪了" / "下一步做什么"
→ 读 docs/roadmap.md（任务列表 + 依赖图）+ docs/progress.md（当前可执行任务）
```

## 任务管理

- **`docs/roadmap.md`** 是任务的单一数据源（Single Source of Truth）
- 每个任务有唯一 ID（T0001–T9999，4 位编号，10000 个槽位），声明前置依赖和设计文档索引
- 每个任务对应 `docs/tasks/` 下独立文件，按状态归入 `done/` / `active/` / `todo/` 子目录
- 任务按分类分组，但任意分类可随时追加新任务
- `docs/progress.md` 是 roadmap 的视图：只列出当前可执行的任务和最近完成记录

### 任务完成时必须同步更新（每次 merge 前检查）

当一个任务完成并准备 merge 时，**必须**在同一个 commit 中完成以下更新：

1. **移动 task 文件**：`docs/tasks/todo/T0XXX-*.md` → `docs/tasks/done/T0XXX-*.md`，更新文件内状态为 ✅ + 关键文件 + 完成日期
2. **更新 `docs/roadmap.md`**：对应行状态改为 ✅，链接路径从 `tasks/todo/` 改为 `tasks/done/`
3. **更新 `docs/progress.md`**：
   - 从"当前可执行任务"表中移除已完成任务
   - 加入"最近完成"表（ID + 任务名 + 完成日期）
   - 检查是否有新任务的前置被满足，加入"当前可执行任务"表
4. **更新 `docs/test-guide.md`**：
   - 在对应分类下追加新功能的测试用例章节（至少 4 条用例）
   - 如涉及调试面板变更，同步更新「附录 A：调试面板功能清单」
   - 测试用例须覆盖：正常流程、边界条件、Debug 辅助验证
5. **更新调试面板**：如新功能引入了需要手动测试的数值/物品/状态，同步更新 `src/components/debug/` 下的调试面板代码，确保 Debug 模式可快速验证新功能

## 设计原则

- **UI 全中文**：所有面向玩家的文字必须使用中文，禁止出现英文属性名（如 atk → 攻击，hp → 体力，mp → 灵力，def → 防御，speed → 速度，critRate → 暴击，moveSpeed → 移速）
- **数据驱动**：所有游戏数值集中在 `src/data/` 下，逻辑层通过数据表驱动行为
- **系统 ≠ 内容**：系统是纯逻辑壳子（背包/炼丹/装备/商店/战斗…），所有具体内容（物品/丹药/装备/妖兽/功法/配方/商品…）通过 `registerDLC()` 挂载到全局注册表，核心包也是 DLC（namespace: `core`）。详见 `docs/roadmap.md` 扩展性约定
- **模块分离**：每个系统（属性/战斗/事件/炼丹/…）独立模块，通过 React 组件 + 自定义 Hook 暴露接口
- **文件拆分**：`src/game/` 和 `src/components/` 下的文件过大时应拆分为子文件或子目录；文件夹内文件过多时应按功能分组为子目录。具体阈值由开发者自行判断，保持单文件职责清晰、可读性好
- **组件最小化**：React 组件应尽可能小，禁止在一个 `return` 里写大段内联 JSX。重复出现的 UI 模式（折叠面板、标签栏、容量条、物品卡片等）必须抽成 `src/components/shared/` 下的独立组件复用；业务子组件按功能放入对应子目录（如 `inventory/`、`shop/`、`equipment/`）。常量（品质颜色、属性中文名等）统一放 `shared/constants.ts`，禁止在多个文件中重复定义
- **SVG/图片资源外置**：SVG、图片等静态资源禁止内联在 TSX 组件中，必须存放为独立文件（`public/avatars/`、`public/icons/` 等），组件通过 `<img src="...">` 引用。保持组件代码与视觉资源分离
- **纯前端**：零后端依赖，所有状态存 `localStorage`，可直接部署到 Azure Static Web Apps
- **React + TypeScript**：使用 React（Vite 构建）开发，使用 TypeScript，构建产物部署到 Azure SWA
- **渐进增强**：先跑通核心循环（修炼→战斗→突破），再叠加子系统
- **DLC 扩展性**：事件/物品/丹药/装备/妖兽/功法/配方/商品均通过 `registerDLC()` 注册到全局表；ID 用命名空间（`core:xxx` / `dlc-N:xxx`）；触发条件为谓词函数 `(player) => boolean`

---

# 项目文件结构（同步更新）

```text
xiuxian-game/
├── .github/
│   ├── copilot-instructions.md   # 本文件 — Agent 工作流 + 项目结构
│   ├── agents/
│   │   ├── pm.agent.md            #   PM：需求分析+设计+任务管理+进度
│   │   ├── dev.agent.md           #   前端开发，实现 src/ 下代码
│   │   └── designer.agent.md      #   UI/UX 设计师
│   └── prompts/
│       └── ship.prompt.md        #   合并检查清单 + Git 工作流
├── package.json                   # 项目依赖 & 脚本
├── tsconfig.json                  # TypeScript 配置
├── vite.config.ts                 # Vite 构建配置
├── vite-env.d.ts                  # Vite 环境类型声明
├── index.html                     # Vite 入口 HTML
├── README.md
├── docs/                          # 项目文档
│   ├── progress.md                #   实时进度看板（@Progress 维护）
│   ├── roadmap.md                 #   任务列表（DAG 依赖图 + DLC 规划 + 扩展性约定）
│   ├── test-guide.md              #   功能测试手册（每个功能的测试用例）
│   ├── tasks/                     #   每个任务的独立文件（T0001–T9999）
│   │   ├── done/                  #     已完成的任务
│   │   ├── active/                #     进行中的任务
│   │   └── todo/                  #     未开始的任务
│   ├── changelog.md               #   变更日志
│   └── specs/                     #   设计文档存放目录
│       ├── design-attribute-system.md
│       ├── design-novel-events.md
│       ├── T0029-breakthrough-tribulation.md
│       └── T0040-death-system.md
└── src/                           # React 源码
    ├── main.tsx                   #   React 入口（挂载 <App />）
    ├── App.tsx                    #   根组件（路由/界面切换）
    ├── App.css                    #   全局样式
    ├── components/                #   UI 组件（按功能分目录）
    │   ├── hud/                   #     常驻 HUD 组件
    │   │   ├── StatusBar.tsx      #       顶部状态栏
    │   │   └── GameLog.tsx        #       游戏日志面板
    │   ├── layout/                #     布局组件
    │   │   ├── GameLayout.tsx     #       三栏游戏布局
    │   │   ├── LeftPanel.tsx      #       左侧面板（头像+核心属性）
    │   │   └── RightPanel.tsx     #       右侧面板（功能面板容器）
    │   ├── panels/                #     可折叠面板组件
    │   │   ├── ActionPanel.tsx    #       操作按钮面板
    │   │   ├── StatusPanel.tsx    #       角色详细状态面板
    │   │   ├── InventoryPanel.tsx #       背包面板
    │   │   ├── AlchemyPanel.tsx   #       炼丹面板
    │   │   ├── EquipmentPanel.tsx #       装备面板
    │   │   ├── ShopPanel.tsx      #       商店面板
    │   │   ├── SmithingPanel.tsx  #       炼器面板
    │   │   ├── inventory/         #       背包子组件
    │   │   ├── shop/              #       商店子组件
    │   │   └── equipment/         #       装备子组件
    │   ├── screens/               #     全屏页面
    │   │   ├── StartScreen.tsx    #       开始界面
    │   │   └── GameOverScreen.tsx #       游戏结束画面
    │   ├── debug/                 #     调试面板及子组件
    │   │   ├── DebugPanel.tsx     #       调试面板入口
    │   │   ├── DebugStatsTab.tsx  #       数值修改标签页
    │   │   ├── DebugItemsTab.tsx  #       物品添加标签页
    │   │   └── DebugItemRow.tsx   #       物品行组件
    │   └── shared/                #     共享通用组件
    │       ├── index.ts           #       barrel re-export
    │       ├── constants.ts       #       品质颜色/属性中文名/图标常量
    │       ├── CollapsiblePanel.tsx #     可折叠面板
    │       ├── TabBar.tsx         #       标签栏
    │       ├── CapacityBar.tsx    #       容量/进度条
    │       ├── StatRow.tsx        #       属性行 + 灵根资质条
    │       ├── StatusItem.tsx     #       状态栏单项
    │       ├── CombatModal.tsx    #       战斗弹窗
    │       ├── DeathModal.tsx     #       死亡弹窗（T0040）
    │       └── FloatingPanel.tsx  #       浮动面板
    ├── game/                      #   游戏逻辑（纯 TS，不依赖 React）
    │   ├── types.ts               #     全局类型定义（DLC/装备/死亡等）
    │   ├── event-loader.ts        #     JSON 事件加载器（纯数据 → GameEvent）
    │   ├── item-loader.ts         #     JSON 物品加载器（纯数据 → ItemDef）
    │   ├── inventory.ts           #     背包系统（增删查用物品，容量管理）
    │   ├── data.ts                #     数据表（境界/妖兽/丹药/事件/…）
    │   ├── player.ts              #     玩家角色 & 属性系统
    │   ├── combat.ts              #     战斗系统入口
    │   ├── death.ts               #     死亡系统（T0040）
    │   ├── events.ts              #     事件内容注册（探索/奇遇/日常）
    │   ├── alchemy.ts             #     炼丹系统
    │   ├── equipment.ts           #     装备系统
    │   ├── shop.ts                #     商店系统
    │   ├── smithing.ts            #     炼器系统
    │   ├── technique.ts           #     功法系统
    │   ├── registry/              #     全局注册表（DLC 扩展核心）
    │   │   ├── index.ts           #       barrel re-export
    │   │   ├── stores.ts          #       注册表存储（Map）
    │   │   ├── dlc.ts             #       DLC 注册/注销
    │   │   └── queries.ts         #       注册表查询 API
    │   ├── player/                #     玩家子模块
    │   ├── combat/                #     战斗子模块
    │   ├── breakthrough/          #     突破子模块
    │   └── tribulation/           #     渡劫子模块
    ├── data/                      #   游戏数据（JSON/TS）
    │   ├── core-events.json       #     1036 个核心事件数据
    │   ├── core-items.json        #     核心物品定义（丹药/材料/杂物/护命道具）
    │   ├── core-equips.json       #     核心装备定义
    │   ├── core-recipes.json      #     炼丹配方
    │   ├── core-shop.json         #     商店商品
    │   ├── core-smithing.json     #     炼器配方
    │   ├── core-techniques.json   #     功法定义
    │   └── core-breakthrough.ts   #     突破需求 + 渡劫定义
    └── hooks/                     #   自定义 React Hooks
        ├── useGameEngine.ts       #     游戏引擎 Hook（状态管理 + 存档）
        ├── useCoreActions.ts      #     核心行为 Hook（修炼/战斗/探索/休息）
        ├── useSystemActions.ts    #     系统行为 Hook（使用物品/炼丹/装备/商店/突破等）
        ├── useGameLog.ts          #     日志管理 Hook
        └── useToast.ts            #     Toast 通知 Hook
```
