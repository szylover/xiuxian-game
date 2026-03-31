# 气修境界数值调整指南（T0058）

> 本文档面向 @Content / @PM / 未来 Agent，说明如何**只改数据文件**来调整气修境界数值或通过 DLC 追加新境界。

---

## 架构概览

```
数据层（改这里）                    系统层（不要动）
─────────────────                ─────────────────
src/data/core-realms.ts          src/game/data.ts（REALMS 自动从注册表读）
  └─ CORE_REALMS                 src/game/player/stats.ts（recalcStats）
                                 src/game/breakthrough/
                                 所有 REALMS[index] 调用自动生效
```

所有境界通过 `registerDLC({ realms: [...] })` 注册到 `realmRegistry`。
旧代码中的 `REALMS[index]` 通过 Proxy 自动从注册表读取，无需修改。

---

## 1. 调整现有境界数值

**文件**：`src/data/core-realms.ts` → `CORE_REALMS` 数组

每个境界是一个 `RealmDef` 对象：

```typescript
{
  id: 'core:realm_golden_core',   // 唯一 ID（命名空间:名称）
  name: '金丹',                   // 显示名称（中文）
  index: 3,                       // 境界索引（从 0 开始，必须连续）
  expReq: 2000,                   // 突破到此境界所需修为
  lifespanBonus: 200,             // 达到此境界后寿命增加
  hpBase: 1200,                   // 基础 HP
  mpBase: 400,                    // 基础 MP（灵力）
  atkBase: 80,                    // 基础攻击
  defBase: 45,                    // 基础防御
  speedBase: 25,                  // 基础速度
  mentalBase: 150,                // 基础念力
}
```

### 当前 8 阶数值总览

| Index | 名称 | 修为要求 | 寿命+ | HP | MP | ATK | DEF | 速度 | 念力 |
|-------|------|---------|-------|-----|------|-----|-----|------|------|
| 0 | 凡人 | 0 | 0 | 100 | 30 | 8 | 3 | 8 | 20 |
| 1 | 炼气 | 100 | 50 | 200 | 60 | 15 | 8 | 12 | 40 |
| 2 | 筑基 | 500 | 100 | 500 | 150 | 35 | 20 | 18 | 80 |
| 3 | 金丹 | 2000 | 200 | 1200 | 400 | 80 | 45 | 25 | 150 |
| 4 | 元婴 | 8000 | 500 | 3000 | 1000 | 180 | 100 | 35 | 300 |
| 5 | 化神 | 30000 | 1000 | 7000 | 2500 | 400 | 220 | 50 | 600 |
| 6 | 渡劫 | 100000 | 2000 | 15000 | 5000 | 900 | 500 | 70 | 1200 |
| 7 | 大乘 | 500000 | 5000 | 35000 | 12000 | 2000 | 1100 | 100 | 2500 |

### 调整示例

**想让金丹更强**：改 `index: 3` 那条的数字即可。

**想降低炼气突破门槛**：把 `index: 1` 的 `expReq` 从 `100` 改为 `50`。

---

## 2. DLC 追加新境界（飞升）

在 DLC 数据文件中追加 `index: 8+` 的境界，通过 `registerDLC()` 注册即可：

```typescript
// 未来的飞升 DLC 示例
import type { RealmDef } from '../game/types';

export const ASCENSION_REALMS: RealmDef[] = [
  { id: 'asc:loose_immortal', name: '散仙', index: 8,  expReq: 1000000,  lifespanBonus: 10000, hpBase: 80000,  mpBase: 25000, atkBase: 4500,  defBase: 2500, speedBase: 140, mentalBase: 5000 },
  { id: 'asc:earth_immortal', name: '地仙', index: 9,  expReq: 3000000,  lifespanBonus: 50000, hpBase: 200000, mpBase: 60000, atkBase: 10000, defBase: 5500, speedBase: 200, mentalBase: 10000 },
  { id: 'asc:sky_immortal',   name: '天仙', index: 10, expReq: 10000000, lifespanBonus: Infinity, hpBase: 500000, mpBase: 150000, atkBase: 25000, defBase: 13000, speedBase: 300, mentalBase: 25000 },
  { id: 'asc:golden_immortal', name: '金仙', index: 11, expReq: 50000000, lifespanBonus: Infinity, hpBase: 1200000, mpBase: 400000, atkBase: 60000, defBase: 30000, speedBase: 500, mentalBase: 60000 },
];

// 在 DLC 注册时：
registerDLC({
  id: 'expansion-ascension',
  name: '仙道飞升',
  version: '1.0.0',
  description: '大乘之后的四阶仙道境界',
  realms: ASCENSION_REALMS,
  // 配套的突破需求、天劫、妖兽等
  breakthroughReqs: [...],
  tribulations: [...],
  monsters: [...],
});
```

注册后：
- `REALMS[8]` 自动返回散仙
- `getNextRealm(player)` 在大乘期会返回散仙
- 突破系统自动支持新境界（需配套 `breakthroughReqs`）
- 所有 UI 自动显示新境界名称

---

## 3. 系统如何使用境界数据

| 使用方 | 访问方式 | 说明 |
|--------|---------|------|
| `recalcStats()` | `REALMS[player.realmIndex]` | 读 hpBase/mpBase/atkBase 等基础属性 |
| `getNextRealm()` | `REALMS[realmIndex + 1]` | 判断下一个境界是否存在 |
| `breakthrough` | `REALMS[newIndex]` | 突破后读取新境界属性 |
| UI 组件 | `REALMS[realmIndex].name` | 显示境界名称 |
| `createPlayer()` | `REALMS[0]` | 初始化角色为凡人境界 |
| 死亡/渡劫 | `REALMS[realmIndex]` | 境界跌落时读取名称 |

所有这些都通过 Proxy 自动从注册表读取，**DLC 追加的境界自动生效**。

---

## 4. 快速检查清单

改完数值后确认以下几点：

- [ ] `index` 是否从 0 开始、连续递增（不能跳号）
- [ ] `expReq` 是否严格递增（低阶 < 高阶）
- [ ] 每个 `id` 是否唯一（命名空间:名称 格式）
- [ ] 数值增长是否合理（建议每阶 2-3 倍递增）
- [ ] DLC 新境界的 `index` 是否从核心包最大 index + 1 开始
- [ ] 若追加新境界，是否配套了 `breakthroughReqs` 和 `tribulations`
- [ ] 运行 `npx tsc --noEmit` 确认无语法错误

---

## 5. 与 T0059 体修系统的关系

气修境界（本文档）和体修境界（T0059）是**独立的两套注册表**：

| 系统 | 数据文件 | 注册表 | 字段 |
|------|---------|--------|------|
| 气修 | `src/data/core-realms.ts` | `realmRegistry` | `player.realmIndex` |
| 体修 | `src/data/core-body-config.ts` | `bodyRealmRegistry` | `player.bodyRealmIndex` |

两者互不影响，DLC 可以分别扩展。
