// ============================================================
// game/technique.ts — 功法系统逻辑
// 学习、修炼进度、激活、属性加成计算
// ============================================================

import type { Player } from './player';
import type { TechniqueDef, TechniqueStatBonus, TechniqueActiveSkill } from './types';
import type { TechniqueSlot } from './player/types';
import { getTechniqueDef, getAllTechniqueDefs } from './registry';
import { gainBodyRealmExp } from './body-cultivation';
import { checkBottleneck, activateBottleneck, ensureBottleneckState, getActiveBottlenecks, tickPersistenceCultivation } from './bottleneck';

// ── 功法类型 → 资质字段映射 ──
const TYPE_APTITUDE_MAP: Record<string, keyof Player['aptitudes']> = {
  sword:  'sword',
  blade:  'blade',
  fist:   'fist',
  palm:   'palm',
  finger: 'finger',
  spear:  'spear',
};

// ── 计算灵根对功法的有效最高等级（T0056）──
// 有 spiritRootElement 的功法：灵根亲和度越高，可修炼的上限越高
// - 无对应灵根：基础 maxLevel × 0.5（最少 1 级）
// - 亲和 1–49 ：× 1.0（基础上限）
// - 亲和 50–79：× 1.5（中等加成）
// - 亲和 80+  ：× 2.0（高亲和，双倍上限）
export function getEffectiveMaxLevel(player: Player, def: TechniqueDef): number {
  if (!def.spiritRootElement) return def.maxLevel;
  const matchRoot = player.spiritRoots?.roots.find(r => r.type === def.spiritRootElement);
  if (!matchRoot) return Math.max(1, Math.floor(def.maxLevel * 0.5));
  if (matchRoot.affinity >= 80) return def.maxLevel * 2;
  if (matchRoot.affinity >= 50) return Math.floor(def.maxLevel * 1.5);
  return def.maxLevel;
}

// ── 计算修炼速度（悟性 + 资质 + 灵根亲和度）──
export function calcTechniqueExpGain(player: Player, def: TechniqueDef): number {
  const aptKey = TYPE_APTITUDE_MAP[def.type] ?? 'sword';
  const aptitude = player.aptitudes[aptKey] ?? 50;
  // 基础：5 + 悟性/20 + 资质/10
  let gain = 5 + player.comprehension / 20 + aptitude / 10;

  // T0056：对应灵根亲和度加成（最高 ×2.0）
  if (def.spiritRootElement && player.spiritRoots) {
    const matchRoot = player.spiritRoots.roots.find(r => r.type === def.spiritRootElement);
    if (matchRoot) {
      gain *= (1 + matchRoot.affinity / 100);
    }
  }

  return Math.floor(gain);
}

// ── 学习功法 ──
export function learnTechnique(player: Player, techniqueId: string): { player: Player; message: string } {
  const def = getTechniqueDef(techniqueId);
  if (!def) return { player, message: `❌ 未知功法：${techniqueId}` };

  if (player.realmIndex < def.minRealm) {
    return { player, message: `❌ 境界不足，需达到更高境界才能修炼 ${def.name}` };
  }

  // T0056：检查灵根门槛
  if (def.requiredSpiritRoot) {
    const hasRoot = player.spiritRoots?.roots.some(r => r.type === def.requiredSpiritRoot);
    if (!hasRoot) {
      const rootCN: Record<string, string> = { fire: '火', water: '水', earth: '土', wood: '木', metal: '金' };
      return { player, message: `❌ 此功法需要【${rootCN[def.requiredSpiritRoot] ?? def.requiredSpiritRoot}灵根】才能习得` };
    }
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
  const effectiveMax = getEffectiveMaxLevel(player, def);
  if (slot.level >= effectiveMax) {
    if (effectiveMax < def.maxLevel * 2) {
      return { player, message: `⚠️ ${def.name} 已达灵根上限（${effectiveMax} 级），提升灵根亲和度可解锁更高等级` };
    }
    return { player, message: `⚠️ ${def.name} 已满级（${effectiveMax}）` };
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
  p.age = p.age + 1;
  p.gameMonth = newMonth;
  p.gameYear = newYear;

  const gain = calcTechniqueExpGain(p, def);
  let newExp = slot.exp + gain;
  let newLevel = slot.level;
  let levelUpMsg = '';

  // 检测升级（使用有效上限）
  let bottleneckMsg = '';
  while (newExp >= def.expPerLevel && newLevel < effectiveMax) {
    // T0064-B：检查功法瓶颈
    if (def.levelBottlenecks?.includes(newLevel + 1)) {
      p = ensureBottleneckState(p);
      const bnCheck = checkBottleneck(p, 'technique', newLevel + 1, def.id);
      if (bnCheck.blocked && bnCheck.bottleneckDef) {
        if (bnCheck.isNewlyActivated) {
          const act = activateBottleneck(p, bnCheck.bottleneckDef.id);
          p = act.player;
        }
        bottleneckMsg = ` 🚧 功法瓶颈：${bnCheck.bottleneckDef.name}`;
        break;
      }
    }
    newExp -= def.expPerLevel;
    newLevel++;
    levelUpMsg = ` 🎉 ${def.name} 升至 ${newLevel} 级！`;
  }

  // 检测本次新解锁的被动效果（T0019）
  let passiveUnlockMsg = '';
  if (def.passiveEffects && newLevel > slot.level) {
    const oldLevel = slot.level;
    const newlyUnlocked = def.passiveEffects.filter(
      pe => pe.minLevel > oldLevel && pe.minLevel <= newLevel
    );
    if (newlyUnlocked.length > 0) {
      passiveUnlockMsg = ' ✨ 解锁被动：' +
        newlyUnlocked.map(pe => `${pe.description}`).join('、');
    }
  }

  const newTechniques = [...p.techniques];
  newTechniques[idx] = { ...slot, level: newLevel, exp: newExp };
  p = { ...p, techniques: newTechniques };

  // T0059 体修修为（每条功法数据定义自己的 bodyExpRate，0 表示不给体修修为）
  let bodyExpMsg = '';
  if (def.bodyExpRate && def.bodyExpRate > 0) {
    const baseBodyExp = Math.floor(gain * def.bodyExpRate);
    const { player: p2, message: btMsg, actualGain } = gainBodyRealmExp(p, baseBodyExp);
    p = p2;
    if (actualGain > 0) {
      bodyExpMsg = ` 💪体修修为+${actualGain}`;
    }
    if (btMsg) bodyExpMsg += ` ${btMsg}`;
  }

  // T0064: 功法修炼也推进坚韧修炼进度
  p = ensureBottleneckState(p);
  let persistenceMsg = '';
  for (const { def: bnDef, entry } of getActiveBottlenecks(p)) {
    if (bnDef.unlockMethods.some(m => m.type === 'persistence')) {
      const tickResult = tickPersistenceCultivation(p, entry.bottleneckId);
      p = tickResult.player;
      if (tickResult.unlocked && tickResult.log) {
        persistenceMsg = ` ${tickResult.log}`;
      }
    }
  }

  return {
    player: p,
    message: `🧘 修炼 ${def.name}，熟练度 +${gain}（精力-${staminaCost} 灵力-${mpCost}）。${levelUpMsg}${passiveUnlockMsg}${bodyExpMsg}${bottleneckMsg}${persistenceMsg}`,
  };
}

// ── 激活/取消激活功法 ──
export function activateTechnique(player: Player, techniqueId: string): { player: Player; message: string } {
  const def = getTechniqueDef(techniqueId);
  if (!def) return { player, message: `❌ 未知功法` };

  const existing = player.techniques.find(t => t.techniqueId === techniqueId);
  if (!existing) return { player, message: `❌ 尚未学会 ${def.name}` };

  // 点击已激活的功法 = 取消激活
  if (player.activeTechniqueId === techniqueId) {
    return {
      player: { ...player, activeTechniqueId: null },
      message: `❎ 取消激活 ${def.name}`,
    };
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

// ── 获取所有已学功法的被动效果总加成（T0019）──
// 无论是否激活，只要已学且等级达到阈值就生效
export function getAllTechniquePassiveBonus(player: Player): TechniqueStatBonus {
  const bonus: TechniqueStatBonus = {};

  for (const slot of player.techniques) {
    const def = getTechniqueDef(slot.techniqueId);
    if (!def?.passiveEffects) continue;

    for (const pe of def.passiveEffects) {
      if (slot.level >= pe.minLevel) {
        if (pe.stat === 'critDmgMultiplier') {
          bonus.critDmgMultiplier = +((bonus.critDmgMultiplier ?? 0) + pe.value).toFixed(2);
        } else {
          (bonus[pe.stat] as number) = ((bonus[pe.stat] as number) ?? 0) + pe.value;
        }
      }
    }
  }

  return bonus;
}

// ── 获取可学功法列表（按境界过滤，排除已学）──
export function getLearnableTechniques(player: Player): TechniqueDef[] {
  const learned = new Set(player.techniques.map(t => t.techniqueId));
  return getAllTechniqueDefs().filter(
    def => player.realmIndex >= def.minRealm && !learned.has(def.id)
  );
}

// ── 获取当前激活功法的主动技能信息 ──
export function getActiveSkillInfo(player: Player): { def: TechniqueDef; slot: TechniqueSlot; skill: TechniqueActiveSkill } | null {
  if (!player.activeTechniqueId) return null;

  const slot = player.techniques.find(t => t.techniqueId === player.activeTechniqueId);
  if (!slot) return null;

  const def = getTechniqueDef(slot.techniqueId);
  if (!def || !def.activeSkill) return null;

  return { def, slot, skill: def.activeSkill };
}

// ── 计算资质加成系数（T0056：1.0~2.0）──
// 基础：资质（1.0~1.5） + 灵根亲和度（0~+0.5）= 最高 2.0x
// 当功法有 spiritRootElement 且玩家拥有对应灵根时，亲和度越高攻击越强
export function calcAptitudeBonus(player: Player, def: TechniqueDef): number {
  const aptKey = TYPE_APTITUDE_MAP[def.type] ?? 'sword';
  const aptitude = player.aptitudes[aptKey] ?? 0;
  let bonus = 1.0 + aptitude / 200;

  // T0056：灵根亲和度加成攻击强度（affinity/200 = 最高 +0.5）
  if (def.spiritRootElement && player.spiritRoots) {
    const matchRoot = player.spiritRoots.roots.find(r => r.type === def.spiritRootElement);
    if (matchRoot) {
      bonus += matchRoot.affinity / 200;
    }
  }

  return bonus;
}

