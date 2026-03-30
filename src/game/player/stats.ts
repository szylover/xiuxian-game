// ============================================================
// player/stats.ts — 属性刷新 + 灵根品级 + 境界查询
// ============================================================

import { REALMS } from '../data';
import { getEquipDef } from '../registry';
import { getAllTechniquePassiveBonus } from '../technique';
import { getAchievementRecalcBonus } from '../achievement/engine';
import type { EquipStatBonus } from '../registry';
import type { Player, Aptitudes, SpiritRootGrade } from './types';

// ── 灵根品级评定 ──

export function getSpiritRootGrade(aptitudes: Aptitudes): SpiritRootGrade {
  const roots = [aptitudes.fire, aptitudes.water, aptitudes.thunder, aptitudes.wind, aptitudes.earth, aptitudes.wood];
  const avg = roots.reduce((s, v) => s + v, 0) / 6;

  const high = roots.filter(v => v > 90);
  const low = roots.filter(v => v < 30);
  if (high.length === 1 && low.length === 5) return { grade: '单灵根', multiplier: 3.0, color: '#FFD700' };
  if (avg > 85) return { grade: '天灵根', multiplier: 2.0, color: '#FFD700' };
  if (avg > 65) return { grade: '异灵根', multiplier: 1.5, color: '#9C27B0' };
  if (avg > 40) return { grade: '灵根',   multiplier: 1.0, color: '#4CAF50' };
  if (avg > 20) return { grade: '杂灵根', multiplier: 0.7, color: '#FF9800' };
  return { grade: '废灵根', multiplier: 0.4, color: '#9E9E9E' };
}

// ── 根据境界刷新派生属性（含装备加成）──

export function recalcStats(player: Player): Player {
  const realm = REALMS[player.realmIndex];
  if (!realm) return player;

  const p = { ...player };
  p.maxStamina = 100 + realm.index * 10;
  p.inventoryCapacity = 20 + realm.index * 5;
  p.maxHp = realm.hpBase;
  p.maxMp = realm.mpBase;
  p.maxMentalPower = realm.mentalBase;
  p.atk = realm.atkBase;
  p.def = realm.defBase;
  p.speed = realm.speedBase;

  // 装备属性加成
  if (p.equipped) {
    const slots = Object.values(p.equipped).filter(Boolean) as string[];
    for (const equipId of slots) {
      const def = getEquipDef(equipId);
      if (def) {
        const s: EquipStatBonus = def.stats;
        if (s.atk) p.atk += s.atk;
        if (s.def) p.def += s.def;
        if (s.speed) p.speed += s.speed;
        if (s.hp) p.maxHp += s.hp;
        if (s.mp) p.maxMp += s.mp;
        if (s.critRate) p.critRate += s.critRate;
        if (s.critResist) p.critResist += s.critResist;
        if (s.moveSpeed) p.moveSpeed += s.moveSpeed;
      }
    }
  }

  // 功法被动加成（T0019）——所有已学功法已解锁被动永久叠加，与激活状态无关
  const passiveBonus = getAllTechniquePassiveBonus(p);
  if (passiveBonus.atk)               p.atk += passiveBonus.atk;
  if (passiveBonus.def)               p.def += passiveBonus.def;
  if (passiveBonus.speed)             p.speed += passiveBonus.speed;
  if (passiveBonus.hp)                p.maxHp += passiveBonus.hp;
  if (passiveBonus.mp)                p.maxMp += passiveBonus.mp;
  if (passiveBonus.critRate)          p.critRate += passiveBonus.critRate;
  if (passiveBonus.critDmgMultiplier) p.critDmgMultiplier += passiveBonus.critDmgMultiplier;

  // 成就永久加成（T0031）——recalcStats 型
  const achBonus = getAchievementRecalcBonus(p);
  if (achBonus.atk)               p.atk += achBonus.atk;
  if (achBonus.def)               p.def += achBonus.def;
  if (achBonus.speed)             p.speed += achBonus.speed;
  if (achBonus.hp)                p.maxHp += achBonus.hp;
  if (achBonus.mp)                p.maxMp += achBonus.mp;
  if (achBonus.mentalPower)       p.maxMentalPower += achBonus.mentalPower;
  if (achBonus.critRate)          p.critRate += achBonus.critRate;
  if (achBonus.critDmgMultiplier) p.critDmgMultiplier += achBonus.critDmgMultiplier;
  if (achBonus.critResist)        p.critResist += achBonus.critResist;
  if (achBonus.moveSpeed)         p.moveSpeed += achBonus.moveSpeed;

  p.hp = Math.min(p.hp, p.maxHp);
  p.mp = Math.min(p.mp, p.maxMp);
  p.stamina = Math.min(p.stamina, p.maxStamina);
  p.mentalPower = Math.min(p.mentalPower, p.maxMentalPower);
  return p;
}

// ── 境界查询 ──

export function getRealmInfo(player: Player) { return REALMS[player.realmIndex] || REALMS[0]; }
export function getNextRealm(player: Player) { return REALMS[player.realmIndex + 1] || null; }
