import type { Player } from '../player';

// ── 瓶颈系统类型定义（T0064）──

export type BottleneckUnlockMethod =
  | { type: 'quest';       questId: string }
  | { type: 'combat';      monsterId: string; minRealmIndex?: number }
  | { type: 'discourse';   npcId: string; cost: { itemId: string; count: number }[] }
  | { type: 'epiphany';    locationTag: string; baseChance: number }
  | { type: 'persistence'; cultivationCount: number }
  | { type: 'overflow' };

export interface BottleneckDef {
  id: string;
  targetType: 'realm' | 'technique' | 'body_realm';
  fromRealmIndex?: number;
  fromBodyRealmIndex?: number;
  techniqueId?: string;
  atLevel?: number;
  name: string;
  description: string;
  hint: string;
  unlockMethods: BottleneckUnlockMethod[];

  /** 修为溢出比例，达到下一境界 expReq * overflowRatio 时自动消除。
   *  仅对 realm / body_realm 类型生效。默认 1.5。设为 0 或 Infinity 可禁用。 */
  overflowRatio?: number;
  unlockBonus?: {
    expBonus?: number;
    statBonus?: Partial<Record<'atk' | 'def' | 'comprehension' | 'luck', number>>;
    items?: { itemId: string; count: number }[];
  };
  condition?: (player: Player) => boolean;
}

export interface BottleneckState {
  active: Record<string, {
    bottleneckId: string;
    activatedAt: number;
    progress: {
      persistenceCultivationCount?: number;
    };
  }>;
  unlocked: Record<string, {
    bottleneckId: string;
    unlockedAt: number;
    method: BottleneckUnlockMethod['type'];
  }>;
}
