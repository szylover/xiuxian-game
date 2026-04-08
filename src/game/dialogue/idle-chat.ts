// ============================================================
// dialogue/idle-chat.ts — 闲聊 / 随机 NPC 对话
// ============================================================

import type { NpcPersonality } from '../types';
import { getIdleChatPool } from '../registry';

export function getIdleChat(npcId: string, personality: NpcPersonality): string {
  const pool = getIdleChatPool();
  const lines = pool[personality];
  if (lines && lines.length > 0) {
    return lines[Math.floor(Math.random() * lines.length)];
  }
  // 兜底
  const fallback = ['「你好。」', '「今日天气不错。」', '「修行之路不易啊。」'];
  return fallback[Math.floor(Math.random() * fallback.length)];
}
