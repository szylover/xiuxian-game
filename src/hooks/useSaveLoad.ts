// ============================================================
// useSaveLoad.ts — 存档读写 + 向后兼容处理
// T0038: 多存档槽位支持
// ============================================================

import type { Player, Aptitudes } from '../game/player';
import { getSpiritRootGrade } from '../game/player';
import type { PlayerSpiritRoots, SpiritRootType, SpiritRootCombo } from '../game/spirit-root';

export const SAVE_KEY = 'xiuxian_save';
export const SAVE_SLOT_COUNT = 5;

/** 存档槽 key：slot 0 复用原始 key 保持向后兼容 */
export function getSlotKey(slotIndex: number): string {
  return slotIndex === 0 ? 'xiuxian_save' : `xiuxian_save_${slotIndex}`;
}

/** 存档槽预览信息（不含完整 Player 数据） */
export interface SaveSlotPreview {
  slotIndex: number;
  isEmpty: boolean;
  name?: string;
  realmIndex?: number;
  age?: number;
  gameYear?: number;
  gameMonth?: number;
  savedAt?: number;
}

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

/** 向后兼容修复（从旧存档补全缺失字段） */
function applyCompatFixes(p: Player): Player {
  if (!Array.isArray(p.inventory)) p.inventory = [];
  if (!p.inventoryCapacity) p.inventoryCapacity = 20 + (p.realmIndex || 0) * 5;
  if (!p.equipped) p.equipped = { weapon: null, helmet: null, armor: null, boots: null, accessory1: null, accessory2: null };
  if (!p.avatar) p.avatar = 'default';
  if (!Array.isArray(p.techniques)) p.techniques = [];
  if (p.activeTechniqueId === undefined) p.activeTechniqueId = null;
  // T0067: age/lifespan 月份化迁移（旧存档 age 为浮点年，需转换为整数月）
  const saveData = p as Player & { _ageInMonths?: boolean };
  if (!saveData._ageInMonths) {
    p.age = Math.round(p.age * 12);
    if (p.lifespan !== Infinity) {
      p.lifespan = Math.round(p.lifespan * 12);
    }
  }
  // T0042: 历法向后兼容（age 此时已是月份）
  if (!p.gameYear) {
    const elapsedMonths = p.age - 192; // 192 = 16 * 12，起始年龄
    p.gameYear = Math.max(1, Math.floor(elapsedMonths / 12) + 1);
    p.gameMonth = Math.max(1, Math.min(12, (elapsedMonths % 12) + 1));
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
  // T0070: 程序化事件系统向后兼容
  if (!p.systems['procedural']) {
    p.systems['procedural'] = {
      masterSeed: (Math.random() * 0xFFFFFFFF) >>> 0,
      eventCounter: 0,
    };
  }
  return p;
}

/** 列出所有存档槽预览 */
export function listSaveSlots(): SaveSlotPreview[] {
  return Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => {
    const raw = localStorage.getItem(getSlotKey(i));
    if (!raw) return { slotIndex: i, isEmpty: true };
    try {
      const data = JSON.parse(raw) as Player & { _savedAt?: number };
      // 基本字段校验，确保是有效存档
      if (!data.name || data.realmIndex === undefined || typeof data.age !== 'number') {
        return { slotIndex: i, isEmpty: true };
      }
      return {
        slotIndex: i,
        isEmpty: false,
        name: data.name,
        realmIndex: data.realmIndex,
        age: data.age,
        gameYear: data.gameYear,
        gameMonth: data.gameMonth,
        savedAt: data._savedAt,
      };
    } catch {
      return { slotIndex: i, isEmpty: true };
    }
  });
}

/** 从指定槽位加载存档 */
export function loadSaveSlot(slotIndex: number): Player | null {
  try {
    const raw = localStorage.getItem(getSlotKey(slotIndex));
    if (!raw) return null;
    const p = JSON.parse(raw) as Player;
    return applyCompatFixes(p);
  } catch { return null; }
}

/** 向指定槽位写入存档 */
export function writeSaveSlot(slotIndex: number, player: Player): void {
  const data = { ...player, _savedAt: Date.now(), _ageInMonths: true };
  localStorage.setItem(getSlotKey(slotIndex), JSON.stringify(data));
}

/** 删除指定槽位 */
export function deleteSaveSlot(slotIndex: number): void {
  localStorage.removeItem(getSlotKey(slotIndex));
}

/** 获取导出用 JSON 字符串 */
export function getSaveSlotExportData(slotIndex: number): string | null {
  return localStorage.getItem(getSlotKey(slotIndex));
}

/** 从 JSON 字符串导入到指定槽位，返回加载的 Player 或 null */
export function importSaveSlot(slotIndex: number, json: string): Player | null {
  try {
    const p = JSON.parse(json) as Player;
    if (!p.name || p.realmIndex === undefined) return null; // 基本校验
    writeSaveSlot(slotIndex, p);
    return loadSaveSlot(slotIndex);
  } catch { return null; }
}

// ── 向后兼容别名（旧代码照常工作）──

export function loadSave(): Player | null {
  return loadSaveSlot(0);
}

export function writeSave(player: Player): void {
  writeSaveSlot(0, player);
}
