# T0064 瓶颈系统（Bottleneck System）

**状态**：📐 设计完成，待实现  
**类型**：feat  
**依赖**：T0029（突破系统）、T0017（功法系统）、T0059（体修系统）、T0007（事件引擎）  
**设计文档**：[T0064-bottleneck-system.md](../../specs/T0064-bottleneck-system.md)  
**预估工时**：3–5 天（A+B 子任务）；C 子任务依赖 T0025/T0057

---

## 目标

在境界突破和功法升级的关键节点设置"瓶颈"，玩家必须通过多种有趣方式（任务、战斗、论道、顿悟、坚韧修炼）打破瓶颈才能继续成长。  
系统完全数据驱动，`BottleneckDef` 通过 `registerDLC()` 注册，核心内容作为 `core` DLC 的一部分。

---

## 子任务

- [ ] **T0064-A**：核心数据结构 + 境界瓶颈（最小可玩）
  - 类型定义（`BottleneckDef`、`BottleneckUnlockMethod`、`BottleneckState`）
  - `bottleneckRegistry` + DLC 注册扩展
  - `src/game/bottleneck.ts` 核心逻辑（check / activate / unlock / tickPersistence / tryBattleUnlock）
  - `src/data/core-bottlenecks.ts`：金丹/元婴/化神 3 个境界瓶颈（战斗 + 坚韧修炼 2 种解锁方式）
  - `breakthrough/attempt.ts` 集成境界瓶颈检查
  - UI：修炼面板瓶颈提示条 + 基础详情弹窗（文字 + 坚韧进度条）
  - Debug 面板：激活/解锁瓶颈控件

- [ ] **T0064-B**：功法瓶颈 + 顿悟探索解锁
  - `TechniqueDef.levelBottlenecks` 字段 + `technique.ts` 修改
  - 体修瓶颈数据（玉髓→金刚、金刚→龙象）+ 体修突破路径集成
  - `tryEpiphanyUnlock()` 函数
  - `events.ts` 新增 `epiphany_bottleneck` 事件类型
  - `core-bottlenecks.ts` 补充：功法瓶颈数据 + 顿悟解锁方式
  - UI：完整解锁方式列表（含顿悟提示文字）

- [ ] **T0064-C**：论道 NPC + 瓶颈任务（⚠️ 依赖 T0025 + T0057）
  - NPC 对话追加「论道」选项
  - `tryDiscourseUnlock()` 函数
  - `tryQuestUnlock()` 函数（供任务链完成钩子调用）
  - `core-bottlenecks.ts` 补充：每个瓶颈追加 `discourse` 和 `quest` 解锁方式
  - UI：完整弹窗（5 种解锁方式全部可见）

---

## 关键文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/game/types.ts` | 修改 | 新增 `BottleneckDef`、`BottleneckUnlockMethod`、`BottleneckState`；`TechniqueDef` 追加 `levelBottlenecks?` |
| `src/game/bottleneck.ts` | 新增 | 瓶颈状态管理核心逻辑 |
| `src/data/core-bottlenecks.ts` | 新增 | 核心 DLC 瓶颈数据配置 |
| `src/game/registry.ts` | 修改 | 新增 `bottleneckRegistry`，`registerDLC()` 支持 `bottlenecks` 字段 |
| `src/game/breakthrough/attempt.ts` | 修改 | 突破前插入瓶颈检查（境界 + 体修） |
| `src/game/technique.ts` | 修改（T0064-B）| 功法升级时触发功法瓶颈 |
| `src/game/events.ts` | 修改（T0064-B）| 新增 `epiphany_bottleneck` 探索事件 |
| `src/hooks/useGameEngine.ts` | 修改 | 修炼 tick 累计坚韧进度；战斗胜利后调用 `tryBattleUnlock()` |
| `src/data/dlc-core.ts` | 修改 | 注册 `core-bottlenecks.ts` 到 `core` DLC pack |
| `src/components/panels/` | 修改 | 修炼面板：瓶颈提示条 + 详情弹窗 |

---

## 验收标准

1. 角色在金丹期突破被拦截，出现瓶颈提示
2. 修炼足够次数（坚韧修炼）后自动解锁，恢复突破能力
3. 击败指定 Boss 后战斗结算弹窗出现「瓶颈解除」提示
4. 功法升到瓶颈等级时无法继续升级（T0064-B）
5. 探索时有概率触发顿悟事件，解锁瓶颈（T0064-B）
6. 旧存档加载不报错，自动初始化 `player.systems.bottleneck`
7. DLC 未注册的境界无瓶颈，突破正常进行
