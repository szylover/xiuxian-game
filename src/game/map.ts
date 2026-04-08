// ============================================================
// map.ts — 地图系统核心逻辑（T0021）
// 区域移动、解锁检查、消耗计算
// 所有区域数据通过 registerDLC 注册，系统层不硬编码具体区域
// ============================================================

import type { Player } from './player';
import type { RegionDef, MapSystemState } from './types';
import { getRegion, getAllRegions } from './registry';
import { MAP_TEXTS } from '../data/texts/map';

/** 动态获取默认起始区域 ID（优先 safeZone，否则取 minRealmIndex=0 的第一个） */
function getDefaultRegionId(): string {
  const all = getAllRegions();
  const safe = all.find(r => r.safeZone && r.minRealm === 0);
  if (safe) return safe.id;
  const starter = all.find(r => r.minRealm === 0);
  if (starter) return starter.id;
  return all[0]?.id ?? 'core:qingyun_town';
}

/**
 * 获取玩家最高修炼等级（取所有修炼路线中的最大值）
 * 目前考虑：气修（realmIndex）、体修（bodyRealmIndex）
 * 未来扩展新路线时在此函数追加即可
 */
export function getMaxCultivationLevel(player: Player): number {
  return Math.max(player.realmIndex, player.bodyRealmIndex ?? 0);
}

/** 获取地图系统状态（兼容旧存档） */
export function getMapState(player: Player): MapSystemState {
  const state = player.systems?.['map'] as MapSystemState | undefined;
  if (state) return state;
  const defaultId = getDefaultRegionId();
  return {
    currentRegionId: defaultId,
    unlockedRegions: [defaultId],
    travelCount: 0,
  };
}

/** 获取当前区域定义 */
export function getCurrentRegion(player: Player): RegionDef | undefined {
  const state = getMapState(player);
  return getRegion(state.currentRegionId);
}

/** 获取玩家已解锁的区域列表 */
export function getUnlockedRegions(player: Player): RegionDef[] {
  const state = getMapState(player);
  return state.unlockedRegions
    .map(id => getRegion(id))
    .filter((r): r is RegionDef => r !== undefined);
}

/** 刷新解锁区域（根据境界自动解锁满足条件的区域） */
export function refreshUnlockedRegions(player: Player): Player {
  const state = getMapState(player);
  const all = getAllRegions();
  const unlocked = new Set(state.unlockedRegions);
  const maxLevel = getMaxCultivationLevel(player);
  for (const region of all) {
    if (maxLevel >= region.minRealm) {
      unlocked.add(region.id);
    }
  }
  const newState: MapSystemState = { ...state, unlockedRegions: Array.from(unlocked) };
  return { ...player, systems: { ...player.systems, map: newState } };
}

/** 检查是否可进入某区域（任一修炼路线达标即可） */
export function checkRegionAccess(player: Player, regionId: string): { canEnter: boolean; reason?: string } {
  const region = getRegion(regionId);
  if (!region) return { canEnter: false, reason: MAP_TEXTS.regionNotExist };
  const maxLevel = getMaxCultivationLevel(player);
  if (maxLevel < region.minRealm) {
    return { canEnter: false, reason: MAP_TEXTS.levelInsufficient(region.minRealm) };
  }
  return { canEnter: true };
}

/** 计算移动精力消耗（受 speed + moveSpeed 影响） */
export function calcTravelCost(player: Player, region: RegionDef): number {
  if (region.travelCostBase <= 0) return 0;
  const speedFactor = 100 / (100 + player.speed * 0.5);
  const moveSpeedFactor = 100 / (100 + player.moveSpeed);
  return Math.max(1, Math.floor(region.travelCostBase * speedFactor * moveSpeedFactor));
}

/** 执行区域移动 */
export function travelTo(player: Player, regionId: string): { player: Player; message: string } {
  const region = getRegion(regionId);
  if (!region) return { player, message: MAP_TEXTS.regionNotFound };
  if (region.isContainer) return { player, message: MAP_TEXTS.containerRegion };

  const state = getMapState(player);
  if (state.currentRegionId === regionId) {
    return { player, message: MAP_TEXTS.alreadyHere(region.emoji, region.name) };
  }

  const access = checkRegionAccess(player, regionId);
  if (!access.canEnter) {
    return { player, message: MAP_TEXTS.accessDenied(region.emoji, region.name, access.reason ?? '') };
  }

  const cost = calcTravelCost(player, region);
  if (player.stamina < cost) {
    return { player, message: MAP_TEXTS.staminaInsufficient(cost, player.stamina) };
  }

  // 扣除精力，推进时间
  let newMonth = player.gameMonth + region.travelTimeMonths;
  let newYear = player.gameYear;
  if (newMonth > 12) {
    newYear += Math.floor((newMonth - 1) / 12);
    newMonth = ((newMonth - 1) % 12) + 1;
  }

  const newState: MapSystemState = {
    ...state,
    currentRegionId: regionId,
    travelCount: state.travelCount + 1,
  };

  const newPlayer: Player = {
    ...player,
    stamina: player.stamina - cost,
    age: player.age + region.travelTimeMonths,
    gameYear: newYear,
    gameMonth: newMonth,
    systems: { ...player.systems, map: newState },
  };

  return {
    player: newPlayer,
    message: MAP_TEXTS.arrived(region.emoji, region.name, cost),
  };
}

// ── T0069: 场景出口计算 ──

export interface SceneExit {
  region: RegionDef;
  direction: 'up' | 'down' | 'sibling';
  travelCost: number;
  canEnter: boolean;
  lockReason?: string;
}

/** 根据当前区域，计算可前往的相邻区域列表（父/子/兄弟） */
export function getSceneExits(player: Player): SceneExit[] {
  const state = getMapState(player);
  const current = getRegion(state.currentRegionId);
  if (!current) return [];

  const allRegions = getAllRegions();
  const exits: SceneExit[] = [];

  // 1. 父区域（⬆ 返回上级）
  if (current.parentId) {
    const parent = getRegion(current.parentId);
    if (parent && !parent.isContainer) {
      exits.push(buildExit(player, parent, 'up'));
    }
  }

  // 2. 子区域（⬇ 探索更深处）
  const children = allRegions
    .filter(r => r.parentId === current.id && !r.isContainer)
    .sort((a, b) => a.minRealm - b.minRealm);
  for (const child of children) {
    exits.push(buildExit(player, child, 'down'));
  }

  // 3. 兄弟区域（同级其他地点）
  if (current.parentId) {
    const siblings = allRegions
      .filter(r => r.parentId === current.parentId && r.id !== current.id && !r.isContainer)
      .sort((a, b) => a.minRealm - b.minRealm);
    for (const sib of siblings) {
      exits.push(buildExit(player, sib, 'sibling'));
    }
  }

  return exits;
}

function buildExit(player: Player, region: RegionDef, direction: SceneExit['direction']): SceneExit {
  const access = checkRegionAccess(player, region.id);
  return {
    region,
    direction,
    travelCost: calcTravelCost(player, region),
    canEnter: access.canEnter,
    lockReason: access.reason,
  };
}
