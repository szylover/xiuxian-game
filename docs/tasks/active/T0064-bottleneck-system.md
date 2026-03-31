# T0064 — 瓶颈系统（Bottleneck System）

- **类型**：feat
- **状态**：active 🔨
- **Spec**：[docs/specs/T0064-bottleneck-system.md](../../specs/T0064-bottleneck-system.md)
- **创建日期**：2025-01-27
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

- [ ] Step 1-3：新建 `src/game/bottleneck/` 模块（types / engine / index）
- [ ] Step 4-7：注册表 + DLCPack 扩展
- [ ] Step 8-9：PlayerTracking 新字段 + createPlayer 初始化
- [ ] Step 10-11：核心数据文件（境界瓶颈 × 4 + 事件 × 4）
- [ ] Step 12-13：事件系统集成（注册 + 条件支持）
- [ ] Step 14-16：突破/功法系统集成（拦截 + 解锁）
- [ ] Step 17：useCoreActions 集成（修炼上限 + 战斗感悟）
- [ ] Step 18-20：UI（StatusPanel 徽章 + BreakthroughPanel 详情 + 功法列表锁图标）
- [ ] Step 21：存档向后兼容

---

## 验收标准

1. 修炼到 realmIndex=1 大圆满后，修为不再溢出，突破按钮被锁定
2. 战斗/探索事件可随机解锁瓶颈，解锁后突破按钮变金色
3. progress 积累满后强制解锁
4. Debug 面板可查看/重置/强制解锁瓶颈状态
5. 旧存档载入不报错（向后兼容）
