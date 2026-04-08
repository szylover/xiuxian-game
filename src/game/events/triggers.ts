// ============================================================
// events/triggers.ts — 探索/日常事件触发入口
// ============================================================

import type { Player } from '../player';
import { triggerEvent } from '../registry';
import { getCurrentRegion } from '../map';
import { triggerProceduralEvent } from '../procedural';

// ── 探索入口（T0021: 区域感知 + T0070: 程序化事件）──
export function triggerExploreEvent(player: Player): { player: Player; message: string } {
  const region = getCurrentRegion(player);
  const regionTags = region?.regionTags;

  // 10% 概率触发奇遇代替普通探索
  if (Math.random() < 0.10) {
    const adventure = triggerEvent('adventure', player, regionTags);
    if (adventure) {
      return { player: adventure.player, message: adventure.message };
    }
  }

  // 20% 概率触发程序化事件（T0070）
  if (Math.random() < 0.20) {
    const procResult = triggerProceduralEvent(player, 'explore', regionTags);
    if (procResult) {
      return { player: procResult.player, message: procResult.message };
    }
  }

  const result = triggerEvent('explore', player, regionTags);
  if (!result) {
    return { player, message: '🚶 四处探索了一番，未发现什么特别的东西。' };
  }
  return { player: result.player, message: result.message };
}

// ── 日常事件入口（T0070: 程序化日常事件）──
export function triggerDailyEvent(player: Player): { player: Player; message: string } | null {
  // 15% 概率触发程序化日常事件
  if (Math.random() < 0.15) {
    const procResult = triggerProceduralEvent(player, 'daily');
    if (procResult) {
      return { player: procResult.player, message: procResult.message };
    }
  }

  const result = triggerEvent('daily', player);
  if (!result || !result.message) return null;
  return { player: result.player, message: result.message };
}
