// ============================================================
// events.ts — 事件内容注册（探索/奇遇/日常）
// 所有事件数据存储在 JSON 中，此文件只负责加载和注册
// ============================================================

import type { Player } from './player';
import { registerDLC, triggerEvent } from './registry';
import { loadEventsFromJson } from './event-loader';
import type { JsonEvent } from './event-loader';
import coreEventsJson from '../data/core-events.json';

// ── 注册 core DLC（从 JSON 加载全部事件）──
export function registerCoreEvents(): void {
  const pack = loadEventsFromJson(coreEventsJson as JsonEvent[], {
    id: 'core',
    name: '基础事件包',
    description: '1036 个核心事件（探索/奇遇/日常）',
    version: '1.0.0',
  });
  registerDLC(pack);
}

// ── 探索入口 ──
export function triggerExploreEvent(player: Player): { player: Player; message: string } {
  // 10% 概率触发奇遇代替普通探索
  if (Math.random() < 0.10) {
    const adventure = triggerEvent('adventure', player);
    if (adventure) {
      return { player: adventure.player, message: adventure.message };
    }
  }

  const result = triggerEvent('explore', player);
  if (!result) {
    return { player, message: '🚶 四处探索了一番，未发现什么特别的东西。' };
  }
  return { player: result.player, message: result.message };
}

// ── 日常事件入口 ──
export function triggerDailyEvent(player: Player): { player: Player; message: string } | null {
  const result = triggerEvent('daily', player);
  if (!result || !result.message) return null;
  return { player: result.player, message: result.message };
}
