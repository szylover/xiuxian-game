# T0068 — 修仙履历系统（Cultivation Chronicle）

- **状态**: 📐 设计完成，待实现
- **分类**: 进阶机制 + 界面与体验
- **前置**: T0029 ✅, T0040 ✅, T0031 ✅, T0042 ✅, T0038 ✅
- **Spec**: [T0068-cultivation-chronicle.md](../../specs/T0068-cultivation-chronicle.md)

## 背景

玩家希望"整个修仙履历也要保存"——即每次轮回（从开始游戏到死亡/飞升）的关键经历都被永久记录，
不随存档删除或新游戏重置消失，支持回顾历代分身的修炼足迹。

## 核心设计

- 独立 localStorage key `xiuxian_chronicle`，与存档系统完全分离
- 每次轮回（`IncarnationRecord`）记录：轮回编号、角色名、最终境界、年龄、关键事件时间线
- 关键事件精选（上限 60 条/轮回），超限时丢弃普通事件保留关键事件
- 历史轮回上限 30 条（超限删最旧）

## 需新增文件

| 文件 | 说明 |
|------|------|
| `src/game/chronicle.ts` | 履历核心逻辑（纯函数） |
| `src/hooks/useChronicle.ts` | React Hook |
| `src/components/panels/ChroniclePanel.tsx` | 履历面板 UI |

## 需修改文件

| 文件 | 改动 |
|------|------|
| `src/hooks/useGameEngine.ts` | 新游戏/死亡触发轮回归档 |
| `src/game/breakthrough/attempt.ts` | 突破成功写 realm_breakthrough 事件 |
| `src/game/death.ts` | severe 死亡写 death 事件 |
| `src/components/hud/HudLayout.tsx` | 增加「📜 履历」入口 |

## 验收标准

- [ ] localStorage 中出现 `xiuxian_chronicle`，新游戏后 current.incarnationNo 自增
- [ ] 境界突破后 current.events 含 realm_breakthrough 事件
- [ ] severe 死亡后轮回归入 incarnations，current === null
- [ ] 刷新页面后履历数据持久存在
- [ ] 删除存档后履历不消失（独立 key）
- [ ] 履历面板可打开并显示历史轮回列表 + 时间线事件
- [ ] Debug 面板有「履历调试」分区
