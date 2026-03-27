// ============================================================
// registry.ts — 全局注册表（事件/妖兽/物品 DLC 扩展核心）
// B-1: 所有内容通过 DLC 包注册，基础版也是 DLC（namespace: core）
// ID 命名空间：核心 core:xxx，DLC 用 dlc-N:xxx
// ============================================================

import type { Player } from './player';

// ── 事件类型定义 ──

export type EventCategory = 'explore' | 'adventure' | 'daily';
export type EventTone = 'good' | 'bad' | 'neutral';

export interface GameEvent {
  id: string;                              // 命名空间 ID，如 core:find_ore
  category: EventCategory;                 // 事件分类
  tone: EventTone;                         // 好/坏/中性（影响 luck 权重）
  name: string;                            // 显示名称
  weight: number;                          // 基础权重
  condition?: (p: Player) => boolean;      // 触发条件谓词（默认 always true）
  effect: (p: Player) => Player;           // 效果：返回新 Player
  message: (p: Player) => string;          // 日志消息（可动态生成）
  once?: boolean;                          // 是否只触发一次
  cooldown?: number;                       // 冷却（年）：触发后多久不再出现
}

// ── DLC 包定义 ──

export interface DLCPack {
  id: string;                              // DLC 标识，如 'core', 'dlc-1'
  name: string;                            // 显示名称
  description: string;                     // 简介
  version: string;                         // 版本号
  events: GameEvent[];                     // 该 DLC 提供的事件
}

// ── 注册表存储 ──

const dlcRegistry = new Map<string, DLCPack>();       // DLC 包注册表
const eventRegistry = new Map<string, GameEvent>();
const triggeredOnce = new Set<string>();              // 已触发的 once 事件
const cooldowns = new Map<string, number>();           // eventId → 上次触发时的 age

// ── DLC 包注册 API（统一入口）──

export function registerDLC(pack: DLCPack): void {
  dlcRegistry.set(pack.id, pack);
  for (const e of pack.events) {
    eventRegistry.set(e.id, e);
  }
}

export function unregisterDLC(packId: string): void {
  const pack = dlcRegistry.get(packId);
  if (!pack) return;
  for (const e of pack.events) {
    eventRegistry.delete(e.id);
  }
  dlcRegistry.delete(packId);
}

export function getDLC(packId: string): DLCPack | undefined {
  return dlcRegistry.get(packId);
}

export function getAllDLCs(): DLCPack[] {
  return Array.from(dlcRegistry.values());
}

// ── 单事件注册（向后兼容，DLC 推荐用 registerDLC）──

export function registerEvent(event: GameEvent): void {
  eventRegistry.set(event.id, event);
}

export function registerEvents(events: GameEvent[]): void {
  for (const e of events) {
    eventRegistry.set(e.id, e);
  }
}

// ── 查询 ──

export function getEventsByCategory(category: EventCategory): GameEvent[] {
  return Array.from(eventRegistry.values()).filter(e => e.category === category);
}

export function getEvent(id: string): GameEvent | undefined {
  return eventRegistry.get(id);
}

// ── luck 驱动的加权随机引擎 ──

function adjustWeight(event: GameEvent, luck: number): number {
  const luckFactor = luck / 50; // luck=50 → factor=1（中性）
  switch (event.tone) {
    case 'good':    return event.weight * (0.5 + luckFactor * 0.5);
    case 'bad':     return event.weight * (1.5 - luckFactor * 0.5);
    case 'neutral': return event.weight;
  }
}

function weightedPick<T extends { adjustedWeight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.adjustedWeight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.adjustedWeight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

// ── 筛选可触发的事件 ──

function filterAvailable(events: GameEvent[], player: Player): GameEvent[] {
  return events.filter(e => {
    // once 检查
    if (e.once && triggeredOnce.has(e.id)) return false;
    // 冷却检查
    if (e.cooldown) {
      const lastAge = cooldowns.get(e.id);
      if (lastAge !== undefined && player.age - lastAge < e.cooldown) return false;
    }
    // 条件谓词
    if (e.condition && !e.condition(player)) return false;
    return true;
  });
}

// ── 触发事件（通用入口）──

export interface EventResult {
  player: Player;
  message: string;
  eventId: string;
  tone: EventTone;
  category: EventCategory;
}

export function triggerEvent(category: EventCategory, player: Player): EventResult | null {
  const all = getEventsByCategory(category);
  const available = filterAvailable(all, player);
  if (available.length === 0) return null;

  const weighted = available.map(e => ({
    event: e,
    adjustedWeight: adjustWeight(e, player.luck),
  }));

  const picked = weightedPick(weighted);
  const event = picked.event;

  // 记录 once / cooldown
  if (event.once) triggeredOnce.add(event.id);
  if (event.cooldown) cooldowns.set(event.id, player.age);

  const newPlayer = event.effect(player);
  const message = event.message(newPlayer);

  return {
    player: newPlayer,
    message,
    eventId: event.id,
    tone: event.tone,
    category: event.category,
  };
}

// ── 存档恢复：重置运行时状态（DLC 重新注册后调用）──

export function resetRuntimeState(): void {
  triggeredOnce.clear();
  cooldowns.clear();
}

// ── 存档序列化/反序列化运行时状态 ──

export interface EventRuntimeState {
  triggeredOnce: string[];
  cooldowns: [string, number][];
}

export function saveEventState(): EventRuntimeState {
  return {
    triggeredOnce: Array.from(triggeredOnce),
    cooldowns: Array.from(cooldowns.entries()),
  };
}

export function loadEventState(state: EventRuntimeState): void {
  resetRuntimeState();
  for (const id of state.triggeredOnce) triggeredOnce.add(id);
  for (const [id, age] of state.cooldowns) cooldowns.set(id, age);
}
