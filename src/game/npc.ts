// ============================================================
// npc.ts — NPC 系统核心逻辑（T0025）
// 状态读写、好感度变化、区域 NPC 查询、年度衰减
// ============================================================

import type { Player } from './player';
import type { NpcDef, NpcRelation, NpcRelationLevel, NpcSystemState } from './types';
import type { Combatant } from './combat/types';
import { getAllNpcDefs, getNpcDef, getItemDef } from './registry';
import { getCurrentRegion, getMaxCultivationLevel } from './map';
import { hasItem, removeItem } from './inventory';

// ── 默认状态 ──

/** 赠礼 CD：3 个月（age 单位为月） */
export const GIFT_CD = 3;

const DEFAULT_NPC_STATE: NpcSystemState = {
  relations: {},
  discoveredNpcs: [],
  lastGiftAge: {},
};

/** 读取 NPC 系统状态（兼容旧存档） */
export function getNpcState(player: Player): NpcSystemState {
  const s = player.systems['npc'];
  if (!s || typeof s !== 'object') return { ...DEFAULT_NPC_STATE, relations: {}, discoveredNpcs: [], lastGiftAge: {} };
  const state = s as Partial<NpcSystemState> & { lastGiftYear?: Record<string, number> };
  return {
    relations: state.relations ?? {},
    discoveredNpcs: Array.isArray(state.discoveredNpcs) ? state.discoveredNpcs : [],
    // 兼容旧存档 lastGiftYear → lastGiftAge
    lastGiftAge: state.lastGiftAge ?? state.lastGiftYear ?? {},
  };
}

/** 写回 NPC 系统状态 */
function setNpcState(player: Player, state: NpcSystemState): Player {
  return { ...player, systems: { ...player.systems, npc: state } };
}

// ── 关系等级映射 ──

export function calcRelationLevel(affinity: number): NpcRelationLevel {
  if (affinity < -50) return 'hostile';
  if (affinity < -10) return 'cold';
  if (affinity < 10)  return 'stranger';
  if (affinity < 30)  return 'acquaintance';
  if (affinity < 60)  return 'friend';
  if (affinity < 90)  return 'close_friend';
  return 'soulmate';
}

/** 获取某 NPC 的关系（不存在时返回默认 stranger） */
export function getRelation(player: Player, npcId: string): NpcRelation {
  const state = getNpcState(player);
  const rel = state.relations[npcId];
  if (rel) return rel;
  return {
    npcId,
    affinity: 0,
    met: false,
    metAt: 0,
    interactionCount: 0,
    lastInteractionYear: 0,
    relationLevel: 'stranger',
    flags: {},
  };
}

// ── 好感度修改 ──

export function changeAffinity(
  player: Player, npcId: string, delta: number, _reason: string,
): { player: Player; message: string; newLevel?: NpcRelationLevel } {
  const npcDef = getNpcDef(npcId);
  if (!npcDef) return { player, message: '❌ 未找到该 NPC。' };

  const state = getNpcState(player);
  const rel = state.relations[npcId] ?? getRelation(player, npcId);
  const maxAffinity = npcDef.maxAffinity ?? 100;
  const oldLevel = rel.relationLevel;
  const newAffinity = Math.max(-100, Math.min(maxAffinity, rel.affinity + delta));
  const newLevel = calcRelationLevel(newAffinity);

  const updatedRel: NpcRelation = {
    ...rel,
    affinity: newAffinity,
    relationLevel: newLevel,
    interactionCount: rel.interactionCount + 1,
    lastInteractionYear: player.gameYear,
  };

  const newState: NpcSystemState = {
    ...state,
    relations: { ...state.relations, [npcId]: updatedRel },
  };

  const sign = delta >= 0 ? '+' : '';
  let msg = `${npcDef.emoji} ${npcDef.name} 好感度 ${sign}${delta}（${newAffinity}）`;
  if (oldLevel !== newLevel) {
    msg += ` → 关系变为【${RELATION_CN[newLevel]}】`;
  }

  return {
    player: setNpcState(player, newState),
    message: msg,
    newLevel: oldLevel !== newLevel ? newLevel : undefined,
  };
}

// ── 邂逅 NPC ──

export function meetNpc(
  player: Player, npcId: string,
): { player: Player; message: string } {
  const npcDef = getNpcDef(npcId);
  if (!npcDef) return { player, message: '❌ 未找到该 NPC。' };

  const state = getNpcState(player);
  const existing = state.relations[npcId];
  if (existing?.met) {
    return { player, message: `${npcDef.emoji} ${npcDef.name}：老朋友，又见面了。` };
  }

  const initialAffinity = 5;
  const newRel: NpcRelation = {
    npcId,
    affinity: initialAffinity,
    met: true,
    metAt: player.gameYear,
    interactionCount: 1,
    lastInteractionYear: player.gameYear,
    relationLevel: calcRelationLevel(initialAffinity),
    flags: {},
  };

  const discovered = state.discoveredNpcs.includes(npcId)
    ? state.discoveredNpcs
    : [...state.discoveredNpcs, npcId];

  const newState: NpcSystemState = {
    ...state,
    relations: { ...state.relations, [npcId]: newRel },
    discoveredNpcs: discovered,
  };

  return {
    player: setNpcState(player, newState),
    message: `✨ 邂逅了${npcDef.emoji} ${npcDef.name}（${npcDef.title ?? ''}）！好感度 +5`,
  };
}

// ── 赠礼 ──

export function giveGift(
  player: Player, npcId: string, itemId: string,
): { player: Player; message: string; affinityChange: number } {
  const npcDef = getNpcDef(npcId);
  if (!npcDef) return { player, message: '❌ 未找到该 NPC。', affinityChange: 0 };

  const state = getNpcState(player);
  const rel = state.relations[npcId];
  if (!rel?.met) return { player, message: '❌ 尚未邂逅此 NPC。', affinityChange: 0 };

  // 赠礼 CD：3 个月
  const lastAge = state.lastGiftAge[npcId] ?? -Infinity;
  const remaining = (lastAge + GIFT_CD) - player.age;
  if (remaining > 0) {
    return { player, message: `❌ 赠礼尚在冷却中，还需等待约 ${remaining} 个月。`, affinityChange: 0 };
  }

  if (!hasItem(player, itemId, 1)) {
    return { player, message: '❌ 背包中没有此物品。', affinityChange: 0 };
  }

  const itemDef = getItemDef(itemId);
  const itemName = itemDef?.name ?? itemId;

  // 判断喜好
  const prefs = npcDef.giftPreferences;
  let base: number;
  let reaction: string;
  if (prefs?.loved.includes(itemId)) {
    base = 15 + Math.floor(Math.random() * 11); // 15~25
    reaction = '爱不释手';
  } else if (prefs?.liked.includes(itemId)) {
    base = 5 + Math.floor(Math.random() * 6);   // 5~10
    reaction = '欣然接受';
  } else if (prefs?.disliked.includes(itemId)) {
    base = -(5 + Math.floor(Math.random() * 6)); // -10~-5
    reaction = '面露不悦';
  } else {
    base = 2 + Math.floor(Math.random() * 4);    // 2~5 默认
    reaction = '收下了';
  }

  // 好感度 = base × (1 + charisma/200)，负面不受魅力加成
  const delta = base > 0
    ? Math.round(base * (1 + player.charisma / 200))
    : base;

  let p = removeItem(player, itemId, 1);

  const newLastGiftAge = { ...state.lastGiftAge, [npcId]: player.age };
  p = setNpcState(p, { ...getNpcState(p), lastGiftAge: newLastGiftAge });

  const result = changeAffinity(p, npcId, delta, 'gift');
  const msg = `🎁 向${npcDef.emoji} ${npcDef.name}赠送了【${itemName}】，${npcDef.name}${reaction}。${result.message}`;

  return {
    player: result.player,
    message: msg,
    affinityChange: delta,
  };
}

// ── 区域 NPC 查询 ──

export function getNpcsInRegion(player: Player): NpcDef[] {
  const region = getCurrentRegion(player);
  if (!region) return [];
  const all = getAllNpcDefs();
  const maxLevel = getMaxCultivationLevel(player);

  return all.filter(npc => {
    if (npc.minRealm && maxLevel < npc.minRealm) return false;
    if (npc.condition && !npc.condition(player)) return false;
    if (npc.homeRegionId) return npc.homeRegionId === region.id;
    if (!npc.regionTags.length) return true;
    return npc.regionTags.some(tag => region.regionTags.includes(tag));
  });
}

// ── 年度好感度衰减 ──

export function tickAffinityDecay(player: Player): Player {
  const state = getNpcState(player);
  const newRelations = { ...state.relations };
  let changed = false;

  for (const [npcId, rel] of Object.entries(newRelations)) {
    const def = getNpcDef(npcId);
    const decayRate = def?.affinityDecayRate ?? 0;
    if (decayRate <= 0) continue;
    if (rel.affinity <= 0) continue; // 不让衰减到更低的负值

    const newAffinity = Math.max(0, rel.affinity - decayRate);
    newRelations[npcId] = {
      ...rel,
      affinity: newAffinity,
      relationLevel: calcRelationLevel(newAffinity),
    };
    changed = true;
  }

  if (!changed) return player;
  return setNpcState(player, { ...state, relations: newRelations });
}

// ── NPC → 战斗参与者 ──

export function npcToCombatant(npc: NpcDef): Combatant {
  return {
    name: npc.name,
    hp: npc.hp,
    atk: npc.atk,
    def: npc.def,
    speed: npc.speed,
    moveSpeed: 0,
    critRate: npc.critRate,
    critDmgMultiplier: npc.critDmgMultiplier,
    critResist: npc.critResist,
  };
}

// ── 关系等级中文映射（供 UI 使用）──

export const RELATION_CN: Record<NpcRelationLevel, string> = {
  hostile:      '敌对',
  cold:         '冷淡',
  stranger:     '陌生',
  acquaintance: '相识',
  friend:       '友好',
  close_friend: '至交',
  soulmate:     '知己',
};

export const RELATION_COLORS: Record<NpcRelationLevel, string> = {
  hostile:      '#F44336',
  cold:         '#9E9E9E',
  stranger:     '#FFFFFF',
  acquaintance: '#FFEB3B',
  friend:       '#4CAF50',
  close_friend: '#2196F3',
  soulmate:     '#E91E63',
};

export const RELATION_EMOJI: Record<NpcRelationLevel, string> = {
  hostile:      '💢',
  cold:         '🥶',
  stranger:     '🤍',
  acquaintance: '💛',
  friend:       '💚',
  close_friend: '💙',
  soulmate:     '❤️',
};

export const PERSONALITY_CN: Record<string, string> = {
  gentle:       '温和',
  cold:         '冷漠',
  hot_tempered: '暴躁',
  cunning:      '狡猾',
  righteous:    '正义',
  mysterious:   '神秘',
};
