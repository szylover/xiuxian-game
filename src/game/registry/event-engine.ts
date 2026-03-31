// ============================================================
// registry/event-engine.ts — luck 驱动的加权随机事件引擎
// ============================================================

import type { Player } from '../player';
import type { GameEvent, EventCategory, EventTone } from '../types';
import { eventRegistry, triggeredOnce, cooldowns } from './stores';
import { getEventsByCategory } from './queries';

// ── 权重调整 ──

function adjustWeight(event: GameEvent, luck: number): number {
  const luckFactor = luck / 50;
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

function filterAvailable(events: GameEvent[], player: Player, regionTags?: string[]): GameEvent[] {
  return events.filter(e => {
    if (e.once && triggeredOnce.has(e.id)) return false;
    if (e.cooldown) {
      const lastAge = cooldowns.get(e.id);
      if (lastAge !== undefined && player.age - lastAge < e.cooldown) return false;
    }
    if (e.condition && !e.condition(player)) return false;
    // T0021: 区域标签匹配（无标签的事件在所有区域可触发）
    if (regionTags && e.regionTags?.length) {
      if (!e.regionTags.some(t => regionTags.includes(t))) return false;
    }
    return true;
  });
}

// ── 触发事件 ──

export interface EventResult {
  player: Player;
  message: string;
  eventId: string;
  tone: EventTone;
  category: EventCategory;
}

export function triggerEvent(category: EventCategory, player: Player, regionTags?: string[]): EventResult | null {
  const all = getEventsByCategory(category);
  const available = filterAvailable(all, player, regionTags);
  if (available.length === 0) return null;

  const weighted = available.map(e => ({ event: e, adjustedWeight: adjustWeight(e, player.luck) }));
  const picked = weightedPick(weighted);
  const event = picked.event;

  if (event.once) triggeredOnce.add(event.id);
  if (event.cooldown) cooldowns.set(event.id, player.age);

  const newPlayer = event.effect(player);
  const message = event.message(newPlayer);

  return { player: newPlayer, message, eventId: event.id, tone: event.tone, category: event.category };
}

// ── 运行时状态管理（存档相关）──

export interface EventRuntimeState {
  triggeredOnce: string[];
  cooldowns: [string, number][];
}

export function resetRuntimeState(): void { triggeredOnce.clear(); cooldowns.clear(); }

export function saveEventState(): EventRuntimeState {
  return { triggeredOnce: Array.from(triggeredOnce), cooldowns: Array.from(cooldowns.entries()) };
}

export function loadEventState(state: EventRuntimeState): void {
  resetRuntimeState();
  for (const id of state.triggeredOnce) triggeredOnce.add(id);
  for (const [id, age] of state.cooldowns) cooldowns.set(id, age);
}
