// ============================================================
// dialogue/effects.ts — 对话效果执行
// ============================================================

import type { Player } from '../player';
import type { DialogueEffect } from '../types';
import { getNpcDef, getItemDef } from '../registry';
import { changeAffinity, getNpcState } from '../npc';
import { addItem, removeItem } from '../inventory';
import { DIALOGUE_TEXTS } from '../../data/texts/dialogue';
import { getDialogueState, setDialogueState } from './state';
import { changeKarma } from '../karma';

export function applyDialogueEffect(
  player: Player, npcId: string, effect: DialogueEffect,
): { player: Player; logs: string[] } {
  let p = player;
  const logs: string[] = [];
  const npcDef = getNpcDef(npcId);
  const npcName = npcDef?.name ?? '???';

  // 好感度变化
  if (effect.affinityChange) {
    const result = changeAffinity(p, npcId, effect.affinityChange, 'dialogue');
    p = result.player;
    if (effect.affinityChange > 0) {
      logs.push(DIALOGUE_TEXTS.affinityUp(npcName, effect.affinityChange));
    } else {
      logs.push(DIALOGUE_TEXTS.affinityDown(npcName, effect.affinityChange));
    }
  }

  // 赠送物品
  if (effect.giveItems) {
    for (const { itemId, count } of effect.giveItems) {
      const { player: p2 } = addItem(p, itemId, count);
      p = p2;
      const itemDef = getItemDef(itemId);
      logs.push(DIALOGUE_TEXTS.receivedItem(itemDef?.name ?? itemId, count));
    }
  }

  // 消耗物品
  if (effect.takeItems) {
    for (const { itemId, count } of effect.takeItems) {
      p = removeItem(p, itemId, count);
      const itemDef = getItemDef(itemId);
      logs.push(DIALOGUE_TEXTS.lostItem(itemDef?.name ?? itemId, count));
    }
  }

  // 灵石变化
  if (effect.goldChange) {
    p = { ...p, gold: Math.max(0, p.gold + effect.goldChange) };
    logs.push(DIALOGUE_TEXTS.goldChange(effect.goldChange));
  }

  // 修为变化
  if (effect.expChange) {
    p = { ...p, exp: Math.max(0, p.exp + effect.expChange) };
    logs.push(effect.expChange > 0 ? `修为 +${effect.expChange}` : `修为 ${effect.expChange}`);
  }

  if (effect.karmaChange) {
    const result = changeKarma(p, effect.karmaChange, DIALOGUE_TEXTS.karmaReason);
    p = result.player;
    logs.push(...result.logs);
  }

  // 属性加成
  if (effect.statBonus) {
    const bonus: Partial<Player> = {};
    for (const [key, value] of Object.entries(effect.statBonus)) {
      if (value && key in p) {
        (bonus as Record<string, number>)[key] = (p[key as keyof Player] as number) + value;
      }
    }
    p = { ...p, ...bonus };
  }

  // 设置 NPC flags
  if (effect.setNpcFlag) {
    const npcState = getNpcState(p);
    const rel = npcState.relations[npcId];
    if (rel) {
      const updatedRel = { ...rel, flags: { ...rel.flags, [effect.setNpcFlag.key]: effect.setNpcFlag.value } };
      p = { ...p, systems: { ...p.systems, npc: { ...npcState, relations: { ...npcState.relations, [npcId]: updatedRel } } } };
    }
  }

  // 设置对话 flags
  if (effect.setDialogueFlag) {
    const dlgState = getDialogueState(p);
    p = setDialogueState(p, {
      ...dlgState,
      flags: { ...dlgState.flags, [effect.setDialogueFlag.key]: effect.setDialogueFlag.value },
    });
  }

  // 解锁对话链（从 triggeredOnce 中移除，或不做特殊处理——只要满足条件即可触发）
  // unlockDialogueId 的语义：将某条对话链从冷却中解除
  if (effect.unlockDialogueId) {
    const dlgState = getDialogueState(p);
    const { [effect.unlockDialogueId]: _, ...restCooldowns } = dlgState.lastTriggerAge;
    p = setDialogueState(p, { ...dlgState, lastTriggerAge: restCooldowns });
  }

  return { player: p, logs };
}
