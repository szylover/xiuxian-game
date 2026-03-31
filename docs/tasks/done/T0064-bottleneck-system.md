# T0064 — 瓶颈系统（Bottleneck System）

- **类型**：feat
- **状态**：✅
- **Spec**：[docs/specs/T0064-bottleneck-system.md](../../specs/T0064-bottleneck-system.md)
- **创建日期**：2025-01-27
- **完成日期**：2026-03-31
- **前置任务**：T0002, T0004, T0029, T0007, T0017, T0058

---

## 任务描述

为修炼进度在关键境界节点和功法满级前引入**瓶颈状态**，玩家无法直接突破，需通过以下机制之一获得"机缘"解锁：

1. **战斗感悟**：与同级/高级妖兽战斗，有概率在胜利时触发
2. **灵光一闪**：探索时触发专属事件（`core:bottle_dawn_insight` 等）
3. **论道**：与高阶 NPC 交谈（T0025 后实现，当前预留 Hook）
4. **任务解锁**：特定任务链完成（T0057 后实现，当前预留 Hook）
5. **物品**：使用"顿悟石"直接解锁
6. **兜底**：积累 progress 到阈值，量变质变强制解锁

---

## 核心实现清单

- [x] Step 1-3：新建 `src/game/bottleneck/` 模块（types / engine / index）
- [x] Step 4-7：注册表 + DLCPack 扩展
- [x] Step 8-9：PlayerTracking 新字段 + createPlayer 初始化
- [x] Step 10-11：核心数据文件（境界瓶颈 × 4 + 事件 × 4）
- [x] Step 12-13：事件系统集成（注册 + 条件支持）
- [x] Step 14-16：突破/功法系统集成（拦截 + 解锁）
- [x] Step 17：useCoreActions 集成（修炼上限 + 战斗感悟）
- [x] Step 18-20：UI（StatusPanel 徽章 + BreakthroughPanel 详情 + 功法列表锁图标）
- [x] Step 21：存档向后兼容

---

## 关键文件清单

### 新建文件
- `src/game/bottleneck/types.ts` — 瓶颈类型定义（BottleneckDef / BottleneckState）
- `src/game/bottleneck/engine.ts` — 核心引擎（检测/解锁/积累逻辑）
- `src/game/bottleneck/index.ts` — 模块入口
- `src/game/bottleneck/registry.ts` — 瓶颈注册表
- `src/data/dlc/core-bottlenecks.ts` — 四大境界瓶颈 DLC 数据
- `src/data/dlc/core-bottleneck-events.ts` — 瓶颈解锁事件（灵光一闪 × 4）

### 修改文件
- `src/game/player/types.ts` — PlayerTracking 新增 bottlenecks 字段
- `src/game/player/createPlayer.ts` — 初始化 bottleneck 状态
- `src/game/player/Player.ts` — toJSON/fromJSON 向后兼容
- `src/game/dlc/types.ts` — DLCPack 新增 bottlenecks 字段
- `src/game/dlc/registry.ts` — 注册表支持瓶颈收集
- `src/game/events/engine.ts` — 事件条件支持 hasBottleneck/bottleneckUnlocked
- `src/game/breakthrough.ts` — 突破前检测瓶颈拦截
- `src/game/cultivation.ts` — 修炼上限检测
- `src/hooks/useCoreActions.ts` — 战斗感悟触发
- `src/components/panels/StatusPanel.tsx` — 境界行 🔒 徽章
- `src/components/panels/BreakthroughPanel.tsx` — 瓶颈详情 + 解锁条件 + 进度
- `src/components/debug/DebugPanel.tsx` — 瓶颈调试区块

---

## 验收标准

1. ✅ 修炼到 realmIndex=1 大圆满后，修为不再溢出，突破按钮被锁定
2. ✅ 战斗/探索事件可随机解锁瓶颈，解锁后突破按钮变金色
3. ✅ progress 积累满后强制解锁
4. ✅ Debug 面板可查看/重置/强制解锁瓶颈状态
5. ✅ 旧存档载入不报错（向后兼容）
