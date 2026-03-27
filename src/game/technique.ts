// ============================================================
// game/technique.ts — 功法系统逻辑
// 学习、修炼进度、激活、属性加成计算
// ============================================================

import type { Player } from './player';
import type { TechniqueDef, TechniqueStatBonus } from './types';
import type { TechniqueSlot } from './player/types';
import { getTechniqueDef, getAllTechniqueDefs } from './registry';

// ── 功法类型 → 资质字段映射 ──
const TYPE_APTITUDE_MAP: Record<string, keyof Player['aptitudes']> = {
  sword:  'sword',
  blade:  'blade',
  fist:   'fist',
  palm:   'palm',
  finger: 'finger',
  spear:  'spear',
};

// ── 计算修炼速度（悟性 + 资质 → 每次修炼获得的熟练度）──
export function calcTechniqueExpGain(player: Player, def: TechniqueDef): number {
  const aptKey = TYPE_APTITUDE_MAP[def.type] ?? 'sword';
  const aptitude = player.aptitudes[aptKey] ?? 50;
  // 基础 5 + 悟性/20 + 资质/10
  return Math.floor(5 + player.comprehension / 20 + aptitude / 10);
}

// ── 学习功法 ──
export function learnTechnique(player: Player, techniqueId: string): { player: Player; message: string } {
  const def = getTechniqueDef(techniqueId);
  if (!def) return { player, message: `❌ 未知功法：${techniqueId}` };

  if (player.realmIndex < def.minRealm) {
    return { player, message: `❌ 境界不足，需达到更高境界才能修炼 ${def.name}` };
  }

  const existing = player.techniques.find(t => t.techniqueId === techniqueId);
  if (existing) {
    return { player, message: `⚠️ 已经学会了 ${def.name}` };
  }

  const newSlot: TechniqueSlot = { techniqueId, level: 1, exp: 0 };
  const p = {
    ...player,
    techniques: [...player.techniques, newSlot],
    // 如果没有激活功法，自动激活
    activeTechniqueId: player.activeTechniqueId ?? techniqueId,
  };

  return { player: p, message: `📖 习得功法 ${def.name}！` };
}

// ── 修炼功法（增加熟练度，可能升级）──
export function practiceTechnique(player: Player, techniqueId: string): { player: Player; message: string } {
  const def = getTechniqueDef(techniqueId);
  if (!def) return { player, message: `❌ 未知功法` };

  const idx = player.techniques.findIndex(t => t.techniqueId === techniqueId);
  if (idx === -1) return { player, message: `❌ 尚未学会 ${def.name}` };

  const slot = player.techniques[idx];
  if (slot.level >= def.maxLevel) {
    return { player, message: `⚠️ ${def.name} 已满级（${def.maxLevel}）` };
  }

  // 消耗精力 + 灵力
  const staminaCost = 10;
  const mpCost = 5;
  if (player.stamina < staminaCost) {
    return { player, message: `⚠️ 精力不足，无法修炼功法（需 ${staminaCost}）` };
  }

  let p = { ...player, stamina: player.stamina - staminaCost, mp: Math.max(0, player.mp - mpCost) };

  // 消耗 1 个月时间
  let newMonth = p.gameMonth + 1;
  let newYear = p.gameYear;
  if (newMonth > 12) {
    newYear += Math.floor((newMonth - 1) / 12);
    newMonth = ((newMonth - 1) % 12) + 1;
  }
  p.age = p.age + 1 / 12;
  p.gameMonth = newMonth;
  p.gameYear = newYear;

  const gain = calcTechniqueExpGain(p, def);
  let newExp = slot.exp + gain;
  let newLevel = slot.level;
  let levelUpMsg = '';

  // 检测升级
  while (newExp >= def.expPerLevel && newLevel < def.maxLevel) {
    newExp -= def.expPerLevel;
    newLevel++;
    levelUpMsg = ` 🎉 ${def.name} 升至 ${newLevel} 级！`;
  }

  const newTechniques = [...p.techniques];
  newTechniques[idx] = { ...slot, level: newLevel, exp: newExp };

  return {
    player: { ...p, techniques: newTechniques },
    message: `🧘 修炼 ${def.name}，熟练度 +${gain}（精力-${staminaCost} 灵力-${mpCost}）。${levelUpMsg}`,
  };
}

// ── 激活功法 ──
export function activateTechnique(player: Player, techniqueId: string): { player: Player; message: string } {
  const def = getTechniqueDef(techniqueId);
  if (!def) return { player, message: `❌ 未知功法` };

  const existing = player.techniques.find(t => t.techniqueId === techniqueId);
  if (!existing) return { player, message: `❌ 尚未学会 ${def.name}` };

  if (player.activeTechniqueId === techniqueId) {
    return { player, message: `⚠️ ${def.name} 已经是当前功法` };
  }

  return {
    player: { ...player, activeTechniqueId: techniqueId },
    message: `⚔️ 切换功法为 ${def.name}`,
  };
}

// ── 获取当前激活功法提供的属性加成 ──
export function getActiveTechniqueBonus(player: Player): TechniqueStatBonus {
  if (!player.activeTechniqueId) return {};

  const slot = player.techniques.find(t => t.techniqueId === player.activeTechniqueId);
  if (!slot) return {};

  const def = getTechniqueDef(slot.techniqueId);
  if (!def) return {};

  const bonus: TechniqueStatBonus = {};
  const b = def.statBonusPerLevel;
  const lvl = slot.level;

  if (b.atk) bonus.atk = Math.floor(b.atk * lvl);
  if (b.def) bonus.def = Math.floor(b.def * lvl);
  if (b.speed) bonus.speed = Math.floor(b.speed * lvl);
  if (b.critRate) bonus.critRate = Math.floor(b.critRate * lvl);
  if (b.critDmgMultiplier) bonus.critDmgMultiplier = +(b.critDmgMultiplier * lvl).toFixed(2);
  if (b.hp) bonus.hp = Math.floor(b.hp * lvl);
  if (b.mp) bonus.mp = Math.floor(b.mp * lvl);

  return bonus;
}

// ── 获取可学功法列表（按境界过滤，排除已学）──
export function getLearnableTechniques(player: Player): TechniqueDef[] {
  const learned = new Set(player.techniques.map(t => t.techniqueId));
  return getAllTechniqueDefs().filter(
    def => player.realmIndex >= def.minRealm && !learned.has(def.id)
  );
}
