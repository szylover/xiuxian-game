# Agent 工作流

本项目使用 3 个 Agent + 1 个 Prompt 协作：

| 角色 | 文件 | 职责 | 工具 |
|------|------|------|------|
| **@PM** | `.github/agents/pm.agent.md` | 需求分析、设计文档、任务管理、进度追踪 | read, edit, search |
| **@Dev** | `.github/agents/dev.agent.md` | 实现 `src/` 下的 React + TS 代码 | read, edit, search, execute |
| **@Designer** | `.github/agents/designer.agent.md` | UI/UX 设计、CSS 美化、像素风资源 | read, edit, search |
| **/ship** | `.github/prompts/ship.prompt.md` | Merge 检查清单 + Git 工作流 | read, edit, search, execute |

## 典型流程

```
用户: "实现战斗系统"
1. @PM  → 输出 Design Spec + 创建任务 + 更新 roadmap & progress
2. @Dev ║ @Designer  ← 并行消费同一份 spec
3. /ship  → 检查清单 → commit → push → PR
```

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

## 设计原则

- **数据驱动**：所有游戏数值集中在 `src/data/` 下，逻辑层通过数据表驱动行为
- **系统 ≠ 内容**：系统是纯逻辑壳子（背包/炼丹/装备/商店/战斗…），所有具体内容（物品/丹药/装备/妖兽/功法/配方/商品…）通过 `registerDLC()` 挂载到全局注册表，核心包也是 DLC（namespace: `core`）。详见 `docs/roadmap.md` 扩展性约定
- **模块分离**：每个系统（属性/战斗/事件/炼丹/…）独立模块，通过 React 组件 + 自定义 Hook 暴露接口
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
│   ├── tasks/                     #   每个任务的独立文件（T0001–T9999）
│   │   ├── done/                  #     已完成的任务
│   │   ├── active/                #     进行中的任务
│   │   └── todo/                  #     未开始的任务
│   ├── changelog.md               #   变更日志
│   └── specs/                     #   设计文档存放目录
│       ├── design-attribute-system.md
│       ├── design-novel-events.md
│       └── G-1-breakthrough-tribulation.md
└── src/                           # React 源码
    ├── main.tsx                   #   React 入口（挂载 <App />）
    ├── App.tsx                    #   根组件（路由/界面切换）
    ├── App.css                    #   全局样式
    ├── components/                #   UI 组件
    │   ├── StatusBar.tsx          #     顶部状态栏
    │   ├── GameLog.tsx            #     游戏日志面板
    │   ├── ActionPanel.tsx        #     操作按钮面板
    │   ├── InventoryPanel.tsx     #     背包面板（分类标签 + 物品列表）
    │   ├── StartScreen.tsx        #     开始界面
    │   └── StatusPanel.tsx        #     角色详细状态面板
    ├── game/                      #   游戏逻辑（纯 TS，不依赖 React）
    │   ├── registry.ts            #     全局注册表（事件/物品/妖兽 DLC 扩展核心）
    │   ├── event-loader.ts        #     JSON 事件加载器（纯数据 → GameEvent）
    │   ├── item-loader.ts         #     JSON 物品加载器（纯数据 → ItemDef）
    │   ├── inventory.ts           #     背包系统（增删查用物品，容量管理）
    │   ├── data.ts                #     数据表（境界/妖兽/丹药/事件/…）
    │   ├── player.ts              #     玩家角色 & 属性系统
    │   ├── combat.ts              #     战斗系统
    │   └── events.ts              #     事件内容注册（探索/奇遇/日常）
    ├── data/                      #   游戏数据（JSON）
    │   ├── core-events.json       #     1036 个核心事件数据
    │   └── core-items.json        #     核心物品定义（丹药/材料/杂物）
    └── hooks/                     #   自定义 React Hooks
        ├── useGameEngine.ts       #     游戏引擎 Hook（状态管理 + 存档）
        └── useGameLog.ts          #     日志管理 Hook
```
