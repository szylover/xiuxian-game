# 设计文档：境界表 DLC 化

- **任务**: T0058
- **日期**: 2026-03-30
- **状态**: 📐 设计完成

## 概述

将 `src/game/data.ts` 中硬编码的 `REALMS` 常量数组改为 DLC 注册制，使 DLC 可以新增自定义境界（如仙道飞升的"仙人/金仙/大罗"等）。这是目前项目中最大的硬编码瓶颈——T0033（仙道飞升）等后续任务依赖此改造。

## 一、现状分析

### 1.1 当前数据结构

`data.ts` 中的 `Realm` 接口：

```ts
interface Realm {
  name: string;
  index: number;
  expReq: number;
  lifespanBonus: number;
  hpBase / mpBase / atkBase / defBase / speedBase / mentalBase
}
```

硬编码了 8 个境界（index 0–7）：凡人→炼气→筑基→金丹→元婴→化神→渡劫→大乘。

### 1.2 所有引用点（13 处）

| 文件 | 用法 | 访问模式 |
|------|------|----------|
| `player/create.ts` | `REALMS[0]` 取初始境界属性 | 下标 |
| `player/stats.ts` | `REALMS[player.realmIndex]` 刷新属性 | 下标 |
| `player/stats.ts` | `getRealmInfo()` / `getNextRealm()` | 下标 |
| `breakthrough/status.ts` | 取境界名、`typeof REALMS[number]` 类型 | 下标+类型 |
| `breakthrough/attempt.ts` | 突破成功后取新境界 | 下标 |
| `tribulation/run.ts` | 渡劫成功/失败取境界名、寿限加成 | 下标 |
| `death.ts` | 境界跌落后取名称 | 下标 |
| `useGameEngine.ts` | 读档/死亡日志取境界名 | 下标 |
| `StatusBar.tsx` | 显示境界名 | 下标 |
| `LeftPanel.tsx` | 显示境界名 | 下标 |
| `DeathModal.tsx` | 显示境界名 | 下标 |
| `DebugStatsTab.tsx` | `REALMS.map()` 渲染境界选择器 | 遍历 |

## 二、设计方案

### 2.1 RealmDef 类型

在 `types.ts` 中新增：

```ts
export interface RealmDef {
  id: string;             // 'core:mortal', 'dlc-immortal:xianren'
  name: string;           // '凡人'
  index: number;          // 全局排序索引（严格递增）
  expReq: number;
  lifespanBonus: number;
  hpBase: number;
  mpBase: number;
  atkBase: number;
  defBase: number;
  speedBase: number;
  mentalBase: number;
}
```

### 2.2 注册表

`stores.ts` 新增：

```ts
export const realmRegistry = new Map<string, RealmDef>();    // key = id
export const realmIndexMap = new Map<number, RealmDef>();     // key = index
```

两张 Map：`realmRegistry`（按 id，用于 DLC 注销）、`realmIndexMap`（按 index，O(1) 下标查询替代数组）。

### 2.3 DLCPack 扩展

```ts
export interface DLCPack {
  // ...现有字段...
  realms?: RealmDef[];
}
```

### 2.4 注册/注销

`dlc.ts`：

```ts
// register
if (pack.realms) {
  for (const realm of pack.realms) {
    if (realmIndexMap.has(realm.index)) {
      console.warn(`[DLC] Realm index ${realm.index} conflict: '${realm.id}' vs '${realmIndexMap.get(realm.index)!.id}'`);
    }
    realmRegistry.set(realm.id, realm);
    realmIndexMap.set(realm.index, realm);
  }
}

// unregister
if (pack.realms) {
  for (const realm of pack.realms) {
    realmRegistry.delete(realm.id);
    realmIndexMap.delete(realm.index);
  }
}
```

### 2.5 查询 API

`queries.ts` 新增：

```ts
export function getRealmByIndex(index: number): RealmDef | undefined {
  return realmIndexMap.get(index);
}

export function getRealmDef(id: string): RealmDef | undefined {
  return realmRegistry.get(id);
}

export function getAllRealms(): RealmDef[] {
  return Array.from(realmRegistry.values()).sort((a, b) => a.index - b.index);
}

export function getMaxRealmIndex(): number {
  return Math.max(...Array.from(realmIndexMap.keys()));
}
```

### 2.6 境界排序规则

- Core 占 index 0–7（凡人→大乘），**永远不变**
- DLC 在末尾追加（如仙道 8–11），**禁止插入中间**
- 注册时检测 index 冲突并 warn
- 这确保老存档的 `realmIndex` 数值不变，100% 向后兼容

## 三、迁移方案

### 3.1 Core 境界数据

新增 `src/data/core-realms.ts`：

```ts
import type { RealmDef } from '../game/types';

export const CORE_REALMS: RealmDef[] = [
  { id: 'core:mortal',   name: '凡人', index: 0, expReq: 0,      lifespanBonus: 0,    hpBase: 100,   mpBase: 30,    atkBase: 8,    defBase: 3,    speedBase: 8,   mentalBase: 20   },
  { id: 'core:lianqi',   name: '炼气', index: 1, expReq: 100,    lifespanBonus: 50,   hpBase: 200,   mpBase: 60,    atkBase: 15,   defBase: 8,    speedBase: 12,  mentalBase: 40   },
  { id: 'core:zhuji',    name: '筑基', index: 2, expReq: 500,    lifespanBonus: 100,  hpBase: 500,   mpBase: 150,   atkBase: 35,   defBase: 20,   speedBase: 18,  mentalBase: 80   },
  { id: 'core:jindan',   name: '金丹', index: 3, expReq: 2000,   lifespanBonus: 200,  hpBase: 1200,  mpBase: 400,   atkBase: 80,   defBase: 45,   speedBase: 25,  mentalBase: 150  },
  { id: 'core:yuanying', name: '元婴', index: 4, expReq: 8000,   lifespanBonus: 500,  hpBase: 3000,  mpBase: 1000,  atkBase: 180,  defBase: 100,  speedBase: 35,  mentalBase: 300  },
  { id: 'core:huashen',  name: '化神', index: 5, expReq: 30000,  lifespanBonus: 1000, hpBase: 7000,  mpBase: 2500,  atkBase: 400,  defBase: 220,  speedBase: 50,  mentalBase: 600  },
  { id: 'core:dujie',    name: '渡劫', index: 6, expReq: 100000, lifespanBonus: 2000, hpBase: 15000, mpBase: 5000,  atkBase: 900,  defBase: 500,  speedBase: 70,  mentalBase: 1200 },
  { id: 'core:dacheng',  name: '大乘', index: 7, expReq: 500000, lifespanBonus: 5000, hpBase: 35000, mpBase: 12000, atkBase: 2000, defBase: 1100, speedBase: 100, mentalBase: 2500 },
];
```

### 3.2 注册入口

在 core DLCPack 中加入 `realms: CORE_REALMS`。

### 3.3 引用替换清单（直接替换方案）

| 文件 | 改动 |
|------|------|
| `data.ts` | 删除 `Realm` 接口 + `REALMS` 常量 + `PILLS`（废弃） |
| `types.ts` | 新增 `RealmDef`；`DLCPack` 加 `realms` |
| `registry/stores.ts` | 新增 `realmRegistry` + `realmIndexMap` |
| `registry/dlc.ts` | 注册/注销 `realms` |
| `registry/queries.ts` | 新增 4 个查询函数 |
| `registry/index.ts` | re-export |
| `data/core-realms.ts` | **新增** Core 境界数据 |
| `events.ts` | core DLCPack 加 `realms` |
| `player/create.ts` | `REALMS[0]` → `getRealmByIndex(0)!` |
| `player/stats.ts` | `REALMS[...]` → `getRealmByIndex(...)`；`Realm` → `RealmDef` |
| `breakthrough/status.ts` | `REALMS` → `getRealmByIndex`；`typeof REALMS[number]` → `RealmDef` |
| `breakthrough/attempt.ts` | `REALMS[...]` → `getRealmByIndex(...)!` |
| `tribulation/run.ts` | `REALMS[...]` → `getRealmByIndex(...)!` |
| `death.ts` | `REALMS[...]` → `getRealmByIndex(...)!` |
| `useGameEngine.ts` | `REALMS[...]` → `getRealmByIndex(...)!` |
| `StatusBar.tsx` | `REALMS[...]` → `getRealmByIndex(...)!` |
| `LeftPanel.tsx` | `REALMS[...]` → `getRealmByIndex(...)!` |
| `DeathModal.tsx` | `REALMS[...]` → `getRealmByIndex(...)` |
| `DebugStatsTab.tsx` | `REALMS.map()` → `getAllRealms().map()` |

## 四、存档兼容性

- `player.realmIndex` 值不变（Core 的 index 0–7 永远固定）
- 老存档加载后 `getRealmByIndex(realmIndex)` 返回正确境界
- **零迁移成本**

## 五、附带清理

| 项目 | 处理 | 理由 |
|------|------|------|
| `PILLS` 常量 | **删除** | 0 引用，已被 core-items.json DLC 化替代 |
| `Pill` / `PillEffect` 接口 | **删除** | 仅被 PILLS 使用 |
| `ACTION_COSTS` | **保留** | 属于系统规则而非内容，不需要 DLC 化 |

## 六、验证方式

1. 新建角色 → 初始"凡人"，属性与改造前一致
2. 修炼突破到"炼气" → 境界名、属性、寿限加成正确
3. Debug 面板切换境界（凡人→大乘） → 全部 8 个正常
4. 加载老存档 → 境界和属性不变
5. 死亡/渡劫境界跌落 → 日志中境界名正确

## 七、依赖关系

- **前置**: 无（注册表基础设施已就绪）
- **后续**: T0033 仙道飞升（可通过 DLC 追加仙道境界）
