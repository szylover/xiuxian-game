# Roadmap — 修仙小游戏

> 从最小可玩原型到完整修仙世界的阶段规划。
> 每个 Milestone 拆分为独立文件，详见 `docs/roadmap/` 目录。
> 小说奇遇事件（DLC）将在基础壳子完成后按"一本小说一个 Milestone"的方式追加。

---

## 总览

| Milestone | 主题 | Stage 数 | 文件 | 状态 |
|-----------|------|----------|------|------|
| A | 核心循环 | 6 | [milestone-a.md](roadmap/milestone-a.md) | ✅ |
| B | 随机事件引擎 | 5 | [milestone-b.md](roadmap/milestone-b.md) | ✅ |
| C | 物品与经济 | 5 | [milestone-c.md](roadmap/milestone-c.md) | ⬜ |
| D | 功法与技能 | 4 | [milestone-d.md](roadmap/milestone-d.md) | ⬜ |
| E | 世界与地图 | 4 | [milestone-e.md](roadmap/milestone-e.md) | ⬜ |
| F | 社交与NPC | 4 | [milestone-f.md](roadmap/milestone-f.md) | ⬜ |
| G | 进阶机制 | 6 | [milestone-g.md](roadmap/milestone-g.md) | ⬜ |
| H | 部署与体验优化 | 5 | [milestone-h.md](roadmap/milestone-h.md) | ⬜ |
| **合计** | | **39** | | |

## DLC 规划（基础壳子完成后追加）

> 小说奇遇事件以 DLC 形式加入，一本小说 = 一个 Milestone。
> 设计文档见 `docs/specs/design-novel-events.md`。
> 所有系统在设计时须预留**事件注册、被动注册、物品注册**扩展点，方便 DLC 插入。

| DLC | 小说流派 | 内容示例 | 状态 |
|-----|----------|----------|------|
| DLC-1 | 凡人流 | 《凡人修仙传》相关奇遇 | ⬜ |
| DLC-2 | 系统流 | 修仙模拟器 / 签到系统 | ⬜ |
| DLC-3 | 苟道流 | 《仙逆》《一念永恒》相关奇遇 | ⬜ |
| DLC-4 | 无限流 | 无限恐怖 / 副本闯关 | ⬜ |
| DLC-5 | 洪荒流 | 《佛本是道》/ 准圣→圣人 | ⬜ |

## 扩展性约定

为支持后续 DLC 热插拔，核心系统设计须遵循：

1. **数据注册制**：事件 / 物品 / 功法等均通过 `register()` 注册到全局表，DLC 只需调用注册函数
2. **ID 命名空间**：核心用 `core:xxx`，DLC 用 `dlc-N:xxx`，避免冲突
3. **条件谓词**：事件触发条件为函数 `(player) => boolean`，DLC 可自定义任意条件
4. **Player 扩展字段**：`player.systems` / `player.passives` / `player.items` 使用 `Record<string, unknown>` 动态扩展
