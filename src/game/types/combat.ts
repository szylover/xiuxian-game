import type { ElementType } from './common';

// ── 妖兽定义（DLC 化） ──

export interface MonsterDef {
  id: string;                // 命名空间 ID，如 'core:wild_wolf'
  name: string;
  emoji: string;             // 显示用 emoji，如 '🐺'
  realmIndex: number;
  hp: number;
  atk: number;
  def: number;
  speed: number;
  moveSpeed: number;
  critRate: number;
  critResist: number;
  critDmgMultiplier?: number;
  expReward: number;
  goldReward: number;
  element?: ElementType;                            // 怪物元素属性
  elementResists?: Partial<Record<ElementType, number>>; // 各系元素抗性 0~1（减免比例）
  regionTags?: string[];                             // T0021 区域标签（空/未设置 = 全区域通用）
}
