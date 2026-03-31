// ============================================================
// data.ts — 游戏数据表（境界 / 妖兽 / 丹药 / 常量）
// 所有游戏数值集中管理，逻辑层通过数据表驱动行为
// ============================================================

// ── 类型定义 ──

// T0058: Realm 保留为向后兼容别名，实际类型为 RealmDef（定义在 types.ts）
import type { RealmDef } from './types';
export type Realm = RealmDef;

import { getAllRealmDefs, getRealmDef } from './registry/queries';

export interface ActionCost {
  stamina: number;
  time: number;      // 单位：月（1 月 = 1/12 年）
}

// Monster 保留为向后兼容别名，实际定义已迁移到 types.ts（MonsterDef）
export type Monster = import('./types').MonsterDef;

export interface PillEffect {
  hp?: number;
  mp?: number;
  stamina?: number;
  exp?: number;
  mood?: number;
  health?: number;
}

export interface Pill {
  id: string;
  name: string;
  effect: PillEffect;
  desc: string;
}

// ── 境界表（T0058: DLC 化，从注册表动态读取）──
// 核心境界数据在 src/data/core-realms.ts，通过 registerDLC() 注册。
// REALMS 保留为向后兼容的访问器，所有旧代码 REALMS[index] 照常工作。
// DLC 追加新境界后，REALMS 会自动包含新境界。

/** @deprecated 直接使用 getRealmDef(index) 或 getAllRealmDefs() 代替 */
export function getRealms(): RealmDef[] {
  return getAllRealmDefs();
}

// 向后兼容：大部分旧代码使用 REALMS[index] 访问
// 使用 Proxy 让 REALMS 表现为数组但从注册表读数据
const REALMS_PROXY_HANDLER: ProxyHandler<RealmDef[]> = {
  get(_, prop) {
    // 数字索引：从注册表读
    if (typeof prop === 'string' && /^\d+$/.test(prop)) {
      return getRealmDef(Number(prop));
    }
    // .length
    if (prop === 'length') {
      const all = getAllRealmDefs();
      return all.length > 0 ? all[all.length - 1].index + 1 : 0;
    }
    // .map / .filter / .forEach / Symbol.iterator 等数组方法
    const arr = getAllRealmDefs();
    const val = (arr as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof val === 'function') {
      return (val as Function).bind(arr);
    }
    return val;
  },
};

export const REALMS = new Proxy([] as RealmDef[], REALMS_PROXY_HANDLER);

// ── 操作消耗 & 时间推进（time 单位：月） ──
export const ACTION_COSTS: Record<string, ActionCost> = {
  cultivate: { stamina: 10, time: 1 },
  explore:   { stamina: 15, time: 1 },
  combat:    { stamina: 20, time: 1 },
  alchemy:   { stamina: 10, time: 1 },
  rest:      { stamina: 0,  time: 1 },
};

// ── 月份名称 ──
export const MONTH_NAMES = [
  '一月','二月','三月','四月','五月','六月',
  '七月','八月','九月','十月','十一月','十二月',
];

// ── 丹药表 ──
export const PILLS: Pill[] = [
  { id: 'hp_pill',      name: '回血丹',   effect: { hp: 50 },          desc: '恢复 50 HP' },
  { id: 'mp_pill',      name: '回灵丹',   effect: { mp: 30 },          desc: '恢复 30 MP' },
  { id: 'stamina_pill', name: '聚气丹',   effect: { stamina: 30 },     desc: '恢复 30 精力' },
  { id: 'exp_pill',     name: '筑基丹',   effect: { exp: 50 },         desc: '获得 50 修为' },
  { id: 'mood_pill',    name: '静心丹',   effect: { mood: 20 },        desc: '心情 +20' },
  { id: 'health_pill',  name: '养生丹',   effect: { health: 20 },      desc: '健康 +20' },
];

// ── 修炼基础经验 ──
export const BASE_CULTIVATE_EXP: number = 10;

// ── 突破成功率公式参数 ──
export const BREAKTHROUGH_BASE_RATE = 0.5; // 基础 50%
export const BREAKTHROUGH_COMP_BONUS = 0.003; // 每点悟性 +0.3%
export const BREAKTHROUGH_LUCK_BONUS = 0.002; // 每点幸运 +0.2%
export const BREAKTHROUGH_FAIL_EXP_LOSS = 0.1; // 失败损失 10% 修为

// ── 道号列表（随机取）──
export const RANDOM_NAMES: string[] = [
  '无名散修', '青云子', '玄灵', '紫霄', '太虚道人',
  '碧落', '沧海客', '明月仙', '孤鸿', '凌云',
  '幽兰', '寒霜', '落尘', '清风', '素心',
];
