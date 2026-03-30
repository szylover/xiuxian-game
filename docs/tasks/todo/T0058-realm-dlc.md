# T0058 — 境界表 DLC 化

- **状态**: ⬜ 未开始
- **分类**: 进阶机制
- **前置**: —（注册表基础设施已就绪）
- **Spec**: [spec](../../specs/T0058-realm-dlc.md)

## 描述

将 `data.ts` 中硬编码的 `REALMS` 常量数组改为 DLC 注册制。当前 8 个境界（凡人→大乘）硬编码在代码中，被 13 处文件引用，是项目中最大的硬编码瓶颈。T0033（仙道飞升）等后续任务依赖此改造。

## 核心改动

1. 新增 `RealmDef` 类型 + `realmRegistry` / `realmIndexMap` 注册表
2. `DLCPack` 新增 `realms?: RealmDef[]` 字段
3. Core 境界数据迁移到 `src/data/core-realms.ts`，通过 core DLC 注册
4. 13 处 `REALMS[index]` 引用替换为 `getRealmByIndex(index)` 查询 API
5. 附带清理：删除废弃的 `PILLS` 常量（0 引用）

## 涉及文件

### 新增
- `src/data/core-realms.ts` — Core 境界数据

### 修改（19 个文件）
- `src/game/types.ts` — 新增 RealmDef + DLCPack.realms
- `src/game/data.ts` — 删 REALMS/PILLS/Realm 接口
- `src/game/registry/stores.ts` — 新增两张 Map
- `src/game/registry/dlc.ts` — 注册/注销 realms
- `src/game/registry/queries.ts` — 4 个查询函数
- `src/game/registry/index.ts` — re-export
- `src/game/events.ts` — core DLCPack 加 realms
- `src/game/player/create.ts` — getRealmByIndex(0)
- `src/game/player/stats.ts` — getRealmByIndex + RealmDef
- `src/game/breakthrough/status.ts` — getRealmByIndex + RealmDef
- `src/game/breakthrough/attempt.ts` — getRealmByIndex
- `src/game/tribulation/run.ts` — getRealmByIndex
- `src/game/death.ts` — getRealmByIndex
- `src/hooks/useGameEngine.ts` — getRealmByIndex
- `src/components/hud/StatusBar.tsx` — getRealmByIndex
- `src/components/layout/LeftPanel.tsx` — getRealmByIndex
- `src/components/shared/DeathModal.tsx` — getRealmByIndex
- `src/components/debug/DebugStatsTab.tsx` — getAllRealms()

## 依赖关系

- **前置**: 无
- **后续**: T0033（仙道飞升）
