# 体修系统数值调整指南（T0059）

> 本文档面向 @Content / @PM / 未来 Agent，说明如何**只改数据文件**来调整体修系统数值，无需修改任何系统代码。

---

## 架构概览

```
数据层（改这里）                    系统层（不要动）
─────────────────                ─────────────────
src/data/core-body-config.ts     src/game/body-cultivation.ts
  ├─ CORE_BODY_REALMS            src/game/player/stats.ts
  └─ CORE_SPIRIT_ROOT_BONUSES    src/game/combat/damage.ts

src/data/core-techniques.json    src/game/technique.ts
  └─ 每条功法的 bodyExpRate
```

所有数值通过 `registerDLC()` 注册到全局注册表，系统代码只读注册表。

---

## 1. 调整体修境界数值

**文件**：`src/data/core-body-config.ts` → `CORE_BODY_REALMS` 数组

每个境界是一个 `BodyRealmDef` 对象：

```typescript
{
  id: 'core:body_iron',        // 唯一 ID（命名空间:名称）
  name: '铁骨',                // 显示名称（中文）
  index: 2,                    // 境界索引（0=凡躯，依次递增）
  maxPhysique: 400,            // 该境界的体魄上限
  expReq: 500,                 // 从上一阶突破到此阶所需体修修为
  physiqueDmgReduce: 5,        // 该境界提供的减伤百分比（上限 50）
  hpBonus: 150,                // 额外 HP 加成
  atkBonus: 15,                // 额外攻击加成
  defBonus: 15,                // 额外防御加成
  description: '骨骼坚硬如铁，拳力大增。',
}
```

### 当前 7 阶数值总览

| Index | 名称 | 体魄上限 | 修为要求 | 减伤% | HP+ | ATK+ | DEF+ |
|-------|------|---------|---------|------|-----|------|------|
| 0 | 凡躯 | 50 | 0 | 0 | 0 | 0 | 0 |
| 1 | 铜皮 | 150 | 100 | 2 | 50 | 5 | 5 |
| 2 | 铁骨 | 400 | 500 | 5 | 150 | 15 | 15 |
| 3 | 玉髓 | 1000 | 2000 | 10 | 400 | 40 | 35 |
| 4 | 金刚 | 2500 | 8000 | 18 | 1000 | 90 | 80 |
| 5 | 龙象 | 6000 | 30000 | 28 | 2500 | 200 | 180 |
| 6 | 不灭 | 15000 | 100000 | 40 | 6000 | 450 | 400 |

### 调整示例

**想让铁骨更强**：改 `index: 2` 那条的数字即可。

**想加第 8 阶**：在数组末尾追加 `{ ..., index: 7, ... }`。

**突破条件**：
- `bodyRealmExp >= nextRealm.expReq`（体修修为达标）
- `physique >= maxPhysique * 0.8`（体魄值至少 80% 满）

---

## 2. 调整灵根对体修的影响

**文件**：`src/data/core-body-config.ts` → `CORE_SPIRIT_ROOT_BODY_BONUSES` 数组

每条是一个 `SpiritRootBodyBonus` 对象：

```typescript
{
  rootType: 'metal',             // 灵根类型：metal/wood/water/fire/earth
  bodyExpMultiplier: 1.3,        // 体修修为获取倍率（1.3 = +30%）
  physiqueRegenRate: 1.0,        // 体魄恢复速率倍率（1.0 = 无加成）
  dmgReduceBonus: 0,             // 额外减伤%（叠加到体修境界减伤上）
  hpBonusRate: 0,                // HP 加成比例（0.15 = +15%）
}
```

> **注意**：所有灵根加成都按**亲和度加权**。亲和度 50 的金灵根只给 `0.3 × 50/100 = 15%` 修为加成，而不是完整 30%。

### 当前灵根加成

| 灵根 | 修为倍率 | 恢复速率 | 额外减伤 | HP加成 | 设计意图 |
|------|---------|---------|---------|--------|---------|
| 金 metal | ×1.3 | — | — | — | 金主锐利坚韧，加速体修 |
| 火 fire | ×1.2 | — | — | — | 火锻肉身 |
| 土 earth | ×1.1 | ×1.3 | +2% | — | 厚重防御型 |
| 水 water | — | ×1.2 | — | +5% | 生机恢复 |
| 木 wood | — | ×1.1 | — | +15% | HP 成长型 |

### 调整示例

**想让水灵根也给体修修为**：给 `rootType: 'water'` 加上 `bodyExpMultiplier: 1.15` 即可。

**想删除木灵根的 HP 加成**：把 `hpBonusRate` 改为 `0` 或删掉该字段。

---

## 3. 调整功法的体修修为系数

**文件**：`src/data/core-techniques.json`

每条功法中的 `bodyExpRate` 字段决定修炼该功法时获得多少体修修为：

```json
{
  "id": "core:basic_fist",
  "type": "fist",
  "bodyExpRate": 1.0,    // ← 这个字段
  ...
}
```

**公式**：`体修修为 = floor(功法熟练度增长 × bodyExpRate × 灵根修为倍率)`

### 当前功法体修系数

| 功法类型 | bodyExpRate | 设计意图 |
|---------|-----------|---------|
| fist 拳法 | **1.0** | 纯肉身锤炼，体修主力 |
| finger 指法 | **0.8** | 指力修炼 |
| palm 掌法 | **0.6** | 半气半体 |
| blade 刀法 | **0.4** | 刚猛有体修成分 |
| spear 枪法 | **0.3** | 偏技巧+力量 |
| sword 剑法 | **0.2** | 最偏气修，体修最少 |

### 调整示例

**想让剑法完全不给体修修为**：把对应功法的 `bodyExpRate` 改为 `0`。

**某个特定功法是体修专属**：给它 `bodyExpRate: 1.5`（比拳法还高）。

**注意**：`bodyExpRate` 是每条功法独立的，同类型不同功法可以有不同值。JSON 里改了就生效。

---

## 4. DLC 扩展体修内容

未来 DLC 可以通过 `registerDLC()` 挂载自己的体修数据，无需改核心代码：

```typescript
registerDLC({
  id: 'dlc-body-master',
  name: '体修大师扩展包',
  version: '1.0.0',
  description: '新增 3 个高阶体修境界 + 调整灵根加成',

  // 新增/覆盖体修境界（按 index 注册，相同 index 会覆盖核心包）
  bodyRealms: [
    { id: 'dlc:body_sage', name: '圣体', index: 7, ... },
    { id: 'dlc:body_chaos', name: '混沌', index: 8, ... },
  ],

  // 新增/覆盖灵根加成（按 rootType 注册，相同 rootType 覆盖）
  spiritRootBodyBonuses: [
    { rootType: 'metal', bodyExpMultiplier: 1.5 },  // 覆盖核心包金灵根
  ],

  // 新功法自带 bodyExpRate
  techniques: [
    { id: 'dlc:chaos_fist', type: 'fist', bodyExpRate: 1.5, ... },
  ],

  // 体修武器（带 techType + physiqueBonusRate）
  equips: [
    {
      id: 'dlc:dragon_gauntlet',
      slot: 'weapon',
      techType: ['fist'],              // 兼容拳法
      physiqueBonusRate: 0.08,         // 体魄×8% 追加攻击
      stats: { atk: 30, physique: 200, physiqueDmgReduce: 3 },
      ...
    },
  ],
});
```

---

## 5. 快速检查清单

改完数值后确认以下几点：

- [ ] `physiqueDmgReduce` 总和是否可能超过 50（系统有 cap，但数据应合理）
- [ ] 境界 `index` 是否连续（0,1,2,3...），不能跳号
- [ ] `expReq` 是否递增（低阶 < 高阶）
- [ ] `bodyExpRate` 在 0~2 范围内（0=不给体修修为，>1=超强体修功法）
- [ ] 灵根倍率是否合理（建议单项不超过 ×1.5，避免叠加后过强）
- [ ] 运行 `npx tsc --noEmit` 确认 TS 数据文件无语法错误

---

## 6. 关键系统逻辑（只读，不要改）

| 文件 | 功能 | 读取的数据 |
|------|------|-----------|
| `src/game/body-cultivation.ts` | 突破判定、属性计算、灵根加成 | bodyRealmRegistry, spiritRootBodyBonusRegistry |
| `src/game/player/stats.ts` | recalcStats 叠加体修属性 | 调用 getBodyRealmBonus() |
| `src/game/combat/damage.ts` | 第 5 层减伤 | 读 defender.physiqueDmgReduce |
| `src/game/combat/run.ts` | 武器匹配 + 战斗体修修为 | 读 EquipDef.techType/physiqueBonusRate |
| `src/game/technique.ts` | 修炼时给体修修为 | 读 TechniqueDef.bodyExpRate |
