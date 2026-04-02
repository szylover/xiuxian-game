// ============================================================
// useSaveLoad.ts — 存档读写 + 向后兼容处理
// 从 useGameEngine.ts 拆出的纯工具函数
// ============================================================

import type { Player, Aptitudes } from '../game/player';
import { getSpiritRootGrade } from '../game/player';
import type { PlayerSpiritRoots, SpiritRootType, SpiritRootCombo } from '../game/spirit-root';

export const SAVE_KEY = 'xiuxian_save';

/** T0056: 向后兼容——从旧资质推导灵根 */
function deriveCompatSpiritRoots(aptitudes: Aptitudes): PlayerSpiritRoots {
  const grade = getSpiritRootGrade(aptitudes);
  const gradeToCombo: Record<string, { combo: SpiritRootCombo; mult: number }> = {
    '单灵根': { combo: 'single', mult: 3.0 },
    '天灵根': { combo: 'dual',   mult: 2.0 },
    '异灵根': { combo: 'triple', mult: 1.2 },
    '灵根':   { combo: 'quad',   mult: 0.8 },
    '杂灵根': { combo: 'penta',  mult: 0.5 },
    '废灵根': { combo: 'none',   mult: 0.1 },
  };
  const mapping = gradeToCombo[grade.grade] ?? { combo: 'penta' as SpiritRootCombo, mult: 0.5 };
  const elementMap: Array<{ type: SpiritRootType; val: number }> = [
    { type: 'fire',  val: aptitudes.fire },
    { type: 'water', val: aptitudes.water },
    { type: 'earth', val: aptitudes.earth },
    { type: 'wood',  val: aptitudes.wood },
    { type: 'metal', val: (aptitudes.thunder + aptitudes.wind) / 2 },
  ];
  elementMap.sort((a, b) => b.val - a.val);
  const comboCount: Record<SpiritRootCombo, number> = { none: 0, single: 1, dual: 2, triple: 3, quad: 4, penta: 5 };
  const count = comboCount[mapping.combo];
  const roots = elementMap.slice(0, count).map(e => ({ type: e.type, affinity: Math.min(100, Math.round(e.val)) }));
  return { roots, combo: mapping.combo, cultivationMultiplier: mapping.mult };
}

export function loadSave(): Player | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Player;
    // 向后兼容：旧存档缺少 inventory/equipped 字段
    if (!Array.isArray(p.inventory)) p.inventory = [];
    if (!p.inventoryCapacity) p.inventoryCapacity = 20 + (p.realmIndex || 0) * 5;
    if (!p.equipped) p.equipped = { weapon: null, helmet: null, armor: null, boots: null, accessory1: null, accessory2: null };
    if (!p.avatar) p.avatar = 'default';
    if (!Array.isArray(p.techniques)) p.techniques = [];
    if (p.activeTechniqueId === undefined) p.activeTechniqueId = null;
    // T0042: 历法向后兼容
    if (!p.gameYear) {
      const elapsed = p.age - 16;
      p.gameYear = Math.max(1, Math.floor(elapsed) + 1);
      p.gameMonth = Math.max(1, Math.min(12, Math.floor((elapsed - Math.floor(elapsed)) * 12) + 1));
    }
    // T0040: tracking 向后兼容
    if (p.tracking) {
      if (p.tracking.lowMoodStreak === undefined) p.tracking.lowMoodStreak = 0;
      if (p.tracking.consecutiveBreakthroughFails === undefined) p.tracking.consecutiveBreakthroughFails = 0;
    }
    // T0056: 灵根 + 性别 + 外貌向后兼容
    if (!p.spiritRoots) {
      p.spiritRoots = deriveCompatSpiritRoots(p.aptitudes);
    }
    if (!p.gender) p.gender = 'male';
    if (p.appearance === undefined) p.appearance = 0;
    // T0031: achievement 向后兼容
    if (!p.systems) p.systems = {};
    if (!p.systems.achievement) {
      p.systems.achievement = { unlockedIds: [], pendingToast: [] };
    }
    // T0021: 地图系统向后兼容
    if (!p.systems['map']) {
      p.systems['map'] = {
        currentRegionId: 'core:qingyun_town',
        unlockedRegions: ['core:qingyun_town'],
        travelCount: 0,
      };
    }
    // T0064: 瓶颈系统向后兼容
    if (!p.systems['bottleneck']) {
      p.systems['bottleneck'] = { active: {}, unlocked: {} };
    }
    return p;
  } catch { return null; }
}

export function writeSave(player: Player): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(player));
}
