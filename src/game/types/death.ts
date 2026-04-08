import type { Player } from '../player';

// ── 死亡系统类型定义 ──

export type DeathSeverity = 'light' | 'moderate' | 'severe';

export interface DeathTriggerDef {
  id: string;                        // 'core:death_lifespan'
  name: string;                      // '寿元耗尽'
  description: string;               // '大限将至，油尽灯枯…'
  severity: DeathSeverity;           // 后果等级
  check: (p: Player) => boolean;     // 触发条件谓词
  canBeBlocked: boolean;             // 是否可被护命道具阻挡
  bypassRevival: boolean;            // 是否跳过复活判定
  priority: number;                  // 检查优先级（数值小的先检查）
}

export interface DeathPenaltyDef {
  severity: DeathSeverity;
  expLossRate: number;
  goldLossRate: number;
  inventoryLossCount: number;
  healthLoss: number;
  moodLoss: number;
  realmDrop: number;
  gameOver: boolean;
}

export interface LifeSaverDef {
  id: string;                        // 'core:saver_talisman'
  itemId: string;                    // 对应背包中的物品 ID
  name: string;
  description: string;
  priority: number;
  consumeOnUse: boolean;
  blockSeverities: DeathSeverity[];
  afterEffect?: (p: Player) => Player;
  condition?: (p: Player) => boolean;
}

export interface RevivalMethodDef {
  id: string;                        // 'core:revival_nine_turn_pill'
  name: string;
  description: string;
  type: 'item' | 'passive' | 'realm';
  itemId?: string;
  passiveId?: string;
  consumeOnUse: boolean;
  priority: number;
  condition?: (p: Player) => boolean;
  effect: (p: Player) => Player;
  penalty?: Partial<DeathPenaltyDef>;
}

export interface DeathSystemState {
  deathCount: number;
  lastDeathCause: string | null;
  revivalCount: number;
  lifeSaverTriggered: string[];
  isLooseImmortal: boolean;
}
