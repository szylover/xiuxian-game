# Agent 工作流

本项目使用 4 个 Agent + 1 个 Prompt 协作：

| 角色 | 文件 | 职责 | 工具 |
|------|------|------|------|
| **@Architect** | `.github/agents/architect.agent.md` | 设计系统、输出 Design Spec（只读） | read, search |
| **@Dev** | `.github/agents/dev.agent.md` | 实现 `src/` 下的 React + TS 代码 | read, edit, search, execute |
| **@Designer** | `.github/agents/designer.agent.md` | UI/UX 设计、CSS 美化、像素风资源 | read, edit, search |
| **@Progress** | `.github/agents/progress.agent.md` | 维护进度看板 `docs/progress.md` | read, edit, search |
| **/ship** | `.github/prompts/ship.prompt.md` | Merge 检查清单 + Git 工作流 | read, edit, search, execute |

## 典型流程

```
用户: "实现战斗系统"
1. @Architect  → 输出 Design Spec → 更新 progress.md
2. @Dev ║ @Designer  ← 并行消费同一份 spec → 各自更新 progress.md
3. /ship  → 检查清单（含 progress.md）→ commit → push → PR
```

### 新会话恢复

```
用户: "我上次做到哪了" / "下一步做什么"
→ 读 docs/progress.md → 快速定位当前状态
```

## 设计原则

- **数据驱动**：所有游戏数值集中在 `src/data/` 下，逻辑层通过数据表驱动行为
- **模块分离**：每个系统（属性/战斗/事件/炼丹/…）独立模块，通过 React 组件 + 自定义 Hook 暴露接口
- **纯前端**：零后端依赖，所有状态存 `localStorage`，可直接部署到 Azure Static Web Apps
- **React + TypeScript**：使用 React（Vite 构建）开发，使用 TypeScript，构建产物部署到 Azure SWA
- **渐进增强**：先跑通核心循环（修炼→战斗→突破），再叠加子系统
- **DLC 扩展性**：事件/物品/功法均通过 `register()` 注册到全局表；ID 用命名空间（`core:xxx` / `dlc-N:xxx`）；触发条件为谓词函数 `(player) => boolean`

---

# 项目文件结构（同步更新）

```text
xiuxian-game/
├── .github/
│   ├── copilot-instructions.md   # 本文件 — Agent 工作流 + 项目结构
│   ├── agents/
│   │   ├── architect.agent.md    #   只读架构师，输出设计文档
│   │   ├── dev.agent.md          #   前端开发，实现 src/ 下代码
│   │   ├── designer.agent.md     #   UI/UX 设计师
│   │   └── progress.agent.md     #   进度看板维护（docs/progress.md）
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
│   ├── roadmap.md                 #   路线图索引（总览 + DLC 规划 + 扩展性约定）
│   ├── roadmap/                   #   各 Milestone 详细路线图
│   │   ├── milestone-a.md         #     A: 核心循环 ✅
│   │   ├── milestone-b.md         #     B: 随机事件引擎
│   │   ├── milestone-c.md         #     C: 物品与经济
│   │   ├── milestone-d.md         #     D: 功法与技能
│   │   ├── milestone-e.md         #     E: 世界与地图
│   │   ├── milestone-f.md         #     F: 社交与NPC
│   │   ├── milestone-g.md         #     G: 进阶机制
│   │   └── milestone-h.md         #     H: 部署与体验优化
│   ├── changelog.md               #   变更日志
│   └── specs/                     #   设计文档存放目录
        ├── design-attribute-system.md  # 属性系统设计文档
        └── design-novel-events.md      # 小说奇遇事件设计文档（5类14个）
└── src/                           # React 源码
    ├── main.tsx                   #   React 入口（挂载 <App />）
    ├── App.tsx                    #   根组件（路由/界面切换）
    ├── App.css                    #   全局样式
    ├── components/                #   UI 组件
    │   ├── StatusBar.tsx          #     顶部状态栏
    │   ├── GameLog.tsx            #     游戏日志面板
    │   ├── ActionPanel.tsx        #     操作按钮面板
    │   ├── StartScreen.tsx        #     开始界面
    │   └── StatusPanel.tsx        #     角色详细状态面板
    ├── game/                      #   游戏逻辑（纯 TS，不依赖 React）
    │   ├── data.ts                #     数据表（境界/妖兽/丹药/事件/…）
    │   ├── player.ts              #     玩家角色 & 属性系统
    │   ├── combat.ts              #     战斗系统
    │   └── events.ts              #     随机事件引擎
    └── hooks/                     #   自定义 React Hooks
        ├── useGameEngine.ts       #     游戏引擎 Hook（状态管理 + 存档）
        └── useGameLog.ts          #     日志管理 Hook
```
