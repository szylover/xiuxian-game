// ============================================================
// game/chronicle.ts — 修仙履历核心逻辑（T0068）
// 跨局永久存档的修炼历程记录系统
// 纯函数，无副作用（IO 通过 load/save 隔离）
// ============================================================

import type { Player } from './player';
import { REALMS } from './data';
import { getBodyRealmDef } from './registry/queries';

// ── 类型定义 ──

export type ChronicleEventType =
  | 'realm_breakthrough'
  | 'body_realm_breakthrough'
  | 'tribulation_pass'
  | 'tribulation_fail'
  | 'ascension_success'
  | 'ascension_fail'
  | 'death'
  | 'revival'
  | 'reincarnation'
  | 'first_boss_kill'
  | 'rare_item_obtained'
  | 'technique_acquired'
  | 'bottleneck_broken'
  | 'special_adventure'
  | 'achievement_unlocked'
  | 'npc_milestone'
  | 'game_over';

export interface ChronicleEvent {
  type: ChronicleEventType;
  year: number;
  month: number;
  description: string;
  meta?: Record<string, unknown>;
}

export interface IncarnationRecord {
  incarnationNo: number;
  characterName: string;
  characterGender: string;
  startedAt: number;
  endedAt: number | null;
  startGameYear: number;
  startGameMonth: number;
  endGameYear: number | null;
  endGameMonth: number | null;
  finalRealmIndex: number;
  finalBodyRealmIndex: number;
  finalRealmName: string;
  peakExp: number;
  finalAge: number;
  finalLifespan: number;
  totalKills: number;
  totalDeaths: number;
  totalRevives: number;
  outcome: 'died' | 'ascended' | 'active';
  events: ChronicleEvent[];
}

export interface CultivationChronicle {
  schemaVersion: number;
  nextIncarnationNo: number;
  incarnations: IncarnationRecord[];
  current: IncarnationRecord | null;
}

// ── 常量 ──

const STORAGE_KEY = 'xiuxian_chronicle';
const MAX_EVENTS = 60;
const MAX_INCARNATIONS = 30;
const CURRENT_SCHEMA = 1;

/** 事件是否为"关键"（超限丢弃时保留） */
const CRITICAL_TYPES: Set<ChronicleEventType> = new Set([
  'death', 'game_over', 'realm_breakthrough', 'tribulation_pass', 'tribulation_fail',
  'ascension_success', 'ascension_fail', 'reincarnation',
]);

// ── 空状态 ──

function emptyChronicle(): CultivationChronicle {
  return {
    schemaVersion: CURRENT_SCHEMA,
    nextIncarnationNo: 1,
    incarnations: [],
    current: null,
  };
}

// ── 存储 IO ──

export function loadChronicle(): CultivationChronicle {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyChronicle();
    const parsed = JSON.parse(raw);
    return migrateChronicle(parsed);
  } catch {
    return emptyChronicle();
  }
}

export function saveChronicle(chronicle: CultivationChronicle): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chronicle));
}

export function clearChronicle(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function migrateChronicle(raw: unknown): CultivationChronicle {
  if (!raw || typeof raw !== 'object') return emptyChronicle();
  const obj = raw as Partial<CultivationChronicle>;
  return {
    schemaVersion: CURRENT_SCHEMA,
    nextIncarnationNo: obj.nextIncarnationNo ?? 1,
    incarnations: Array.isArray(obj.incarnations) ? obj.incarnations : [],
    current: obj.current ?? null,
  };
}

// ── 轮回管理 ──

/** 开始新轮回 */
export function createIncarnation(player: Player, chronicle: CultivationChronicle): CultivationChronicle {
  // 若有未完结的轮回，强制归档
  let c = chronicle;
  if (c.current && c.current.outcome === 'active') {
    c = finalizeIncarnation(c, player, 'died');
  }

  const realmName = REALMS[player.realmIndex]?.name ?? '凡人';
  const record: IncarnationRecord = {
    incarnationNo: c.nextIncarnationNo,
    characterName: player.name,
    characterGender: player.gender,
    startedAt: Date.now(),
    endedAt: null,
    startGameYear: player.gameYear,
    startGameMonth: player.gameMonth,
    endGameYear: null,
    endGameMonth: null,
    finalRealmIndex: player.realmIndex,
    finalBodyRealmIndex: player.bodyRealmIndex,
    finalRealmName: realmName,
    peakExp: player.exp,
    finalAge: player.age,
    finalLifespan: player.lifespan,
    totalKills: player.tracking?.killCount ?? 0,
    totalDeaths: 0,
    totalRevives: 0,
    outcome: 'active',
    events: [],
  };

  return {
    ...c,
    nextIncarnationNo: c.nextIncarnationNo + 1,
    current: record,
  };
}

/** 归档当前轮回 */
export function finalizeIncarnation(
  chronicle: CultivationChronicle,
  player: Player,
  outcome: 'died' | 'ascended',
): CultivationChronicle {
  if (!chronicle.current) return chronicle;

  const realmName = REALMS[player.realmIndex]?.name ?? '凡人';
  const finalized: IncarnationRecord = {
    ...chronicle.current,
    endedAt: Date.now(),
    endGameYear: player.gameYear,
    endGameMonth: player.gameMonth,
    finalRealmIndex: player.realmIndex,
    finalBodyRealmIndex: player.bodyRealmIndex,
    finalRealmName: realmName,
    peakExp: Math.max(chronicle.current.peakExp, player.exp),
    finalAge: player.age,
    finalLifespan: player.lifespan,
    totalKills: player.tracking?.killCount ?? 0,
    outcome,
  };

  // 自动追加 game_over 事件
  const gameOverEvent: ChronicleEvent = {
    type: 'game_over',
    year: player.gameYear,
    month: player.gameMonth,
    description: outcome === 'died'
      ? `道消魂灭，${realmName}期，享年 ${Math.floor(player.age / 12)} 岁`
      : `羽化飞升，${realmName}期`,
  };
  finalized.events = addEventToList(finalized.events, gameOverEvent);

  // 追加到 incarnations（超 30 条删最旧）
  const incarnations = [...chronicle.incarnations, finalized];
  if (incarnations.length > MAX_INCARNATIONS) {
    incarnations.shift();
  }

  return {
    ...chronicle,
    incarnations,
    current: null,
  };
}

// ── 事件管理 ──

/** 向当前轮回添加关键事件 */
export function addChronicleEvent(
  chronicle: CultivationChronicle,
  event: ChronicleEvent,
): CultivationChronicle {
  if (!chronicle.current) return chronicle;

  return {
    ...chronicle,
    current: {
      ...chronicle.current,
      events: addEventToList(chronicle.current.events, event),
    },
  };
}

/** 更新当前轮回的快照数据（每次重要操作后调用） */
export function updateCurrentSnapshot(
  chronicle: CultivationChronicle,
  player: Player,
): CultivationChronicle {
  if (!chronicle.current) return chronicle;

  const realmName = REALMS[player.realmIndex]?.name ?? '凡人';
  return {
    ...chronicle,
    current: {
      ...chronicle.current,
      finalRealmIndex: player.realmIndex,
      finalBodyRealmIndex: player.bodyRealmIndex,
      finalRealmName: realmName,
      peakExp: Math.max(chronicle.current.peakExp, player.exp),
      finalAge: player.age,
      finalLifespan: player.lifespan,
      totalKills: player.tracking?.killCount ?? 0,
    },
  };
}

/** 增加死亡/复活计数 */
export function incrementDeathCount(chronicle: CultivationChronicle): CultivationChronicle {
  if (!chronicle.current) return chronicle;
  return {
    ...chronicle,
    current: { ...chronicle.current, totalDeaths: chronicle.current.totalDeaths + 1 },
  };
}

export function incrementReviveCount(chronicle: CultivationChronicle): CultivationChronicle {
  if (!chronicle.current) return chronicle;
  return {
    ...chronicle,
    current: { ...chronicle.current, totalRevives: chronicle.current.totalRevives + 1 },
  };
}

// ── 内部工具 ──

function addEventToList(events: ChronicleEvent[], event: ChronicleEvent): ChronicleEvent[] {
  const list = [...events, event];
  if (list.length <= MAX_EVENTS) return list;

  // 超限：丢弃最早的非关键事件
  const idx = list.findIndex(e => !CRITICAL_TYPES.has(e.type));
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    // 全是关键事件，丢弃最早的
    list.shift();
  }
  return list;
}

// ── 查询辅助 ──

/** 获取体修境界名 */
export function getBodyRealmName(index: number): string {
  return getBodyRealmDef(index)?.name ?? '凡躯';
}

