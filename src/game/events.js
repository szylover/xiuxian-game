// ============================================================
// events.js — 随机事件引擎（基础版）
// 简单的探索随机事件，后续在 Milestone B 重构
// ============================================================

const EXPLORE_EVENTS = [
  { weight: 30, isGood: true,  name: '发现灵石矿',   effect: (p) => ({ ...p, gold: p.gold + 20 }),                     msg: '💎 探索中发现一处灵石矿脉，获得 20 灵石！' },
  { weight: 20, isGood: true,  name: '前辈指点',       effect: (p) => ({ ...p, exp: p.exp + 30 }),                       msg: '📖 偶遇一位隐世前辈，指点修炼，获得 30 修为！' },
  { weight: 15, isGood: true,  name: '发现丹药',       effect: (p) => ({ ...p, hp: Math.min(p.maxHp, p.hp + 50) }),      msg: '🧪 在山洞中发现一瓶丹药，恢复 50 HP！' },
  { weight: 10, isGood: true,  name: '灵泉',           effect: (p) => ({ ...p, mp: Math.min(p.maxMp, p.mp + 30), mood: Math.min(100, p.mood + 10) }), msg: '🌊 发现一处灵泉，恢复 30 MP，心情 +10！' },
  { weight: 15, isGood: false, name: '妖兽拦路',       effect: (p) => ({ ...p, hp: Math.max(0, p.hp - 30), health: Math.max(0, p.health - 5) }),   msg: '🐺 被妖兽偷袭！HP -30，健康 -5。' },
  { weight: 10, isGood: false, name: '迷失方向',       effect: (p) => ({ ...p, mood: Math.max(0, p.mood - 15) }),        msg: '🌫️ 在迷雾中迷失了方向，心情 -15。' },
];

// 按幸运值调整权重
function adjustWeights(luck, events) {
  const luckFactor = luck / 50;
  return events.map(e => ({
    ...e,
    weight: e.isGood
      ? e.weight * (0.5 + luckFactor * 0.5)
      : e.weight * (1.5 - luckFactor * 0.5),
  }));
}

// 加权随机选取
function weightedRandom(events) {
  const total = events.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const e of events) {
    roll -= e.weight;
    if (roll <= 0) return e;
  }
  return events[events.length - 1];
}

// ── 触发探索事件 ──
export function triggerExploreEvent(player) {
  const adjusted = adjustWeights(player.luck, EXPLORE_EVENTS);
  const event = weightedRandom(adjusted);
  const newPlayer = event.effect(player);
  return { player: newPlayer, message: event.msg };
}
