// ============================================================
// types.ts — 游戏核心类型定义
// 所有 DLC 扩展系统的接口/类型集中在此，供各模块引用
// ============================================================

import type { Player } from './player';

// ── 物品类型定义 ──

export type ItemCategory = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material' | 'technique' | 'misc';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface ItemDef {
  id: string;                              // 命名空间 ID，如 core:hp_pill
  name: string;                            // 显示名称
  category: ItemCategory;                  // 物品分类
  rarity: ItemRarity;                      // 品质
  description: string;                     // 描述
  stackable: boolean;                      // 是否可堆叠
  maxStack: number;                        // 最大堆叠数
  usable: boolean;                         // 是否可使用（消耗品）
  effect?: (p: Player) => Player;          // 使用效果
  effectMessage?: string;                  // 使用后日志消息
  sellPrice: number;                       // 售卖价格（灵石）
}

// ── 炼丹配方定义 ──

export type RecipeQuality = 'normal' | 'good' | 'excellent';

// ── 装备定义 ──

export type EquipSlot = 'weapon' | 'helmet' | 'armor' | 'boots' | 'accessory1' | 'accessory2';

export interface EquipStatBonus {
  atk?: number;
  def?: number;
  speed?: number;
  hp?: number;
  mp?: number;
  critRate?: number;
  critResist?: number;
  moveSpeed?: number;
}

export interface EquipDef {
  id: string;                              // 命名空间 ID，如 core:iron_sword
  name: string;                            // 显示名称
  slot: EquipSlot;                         // 装备槽位
  rarity: ItemRarity;                      // 品质
  description: string;                     // 描述
  stats: EquipStatBonus;                   // 属性加成
  minRealm: number;                        // 最低佩戴境界
  sellPrice: number;                       // 售卖价格
}

export interface RecipeDef {
  id: string;                              // 命名空间 ID，如 core:recipe_hp_pill
  name: string;                            // 配方名称
  description: string;                     // 描述
  inputs: { itemId: string; count: number }[]; // 输入材料
  outputItemId: string;                    // 产出物品 ID
  outputCount: number;                     // 基础产出数量
  baseSuccessRate: number;                 // 基础成功率 (0~1)
  mentalCost: number;                      // 念力消耗
  minRealm: number;                        // 最低境界要求
  qualityBonusMultipliers: Record<RecipeQuality, number>; // 品质倍率
}

// ── 炼器配方定义 ──

export interface SmithingRecipeDef {
  id: string;                              // 命名空间 ID，如 core:smith_iron_sword
  name: string;                            // 配方名称
  description: string;                     // 描述
  inputs: { itemId: string; count: number }[]; // 输入材料
  goldCost: number;                        // 灵石消耗
  outputItemId: string;                    // 产出装备 ID
  baseSuccessRate: number;                 // 基础成功率 (0~1)
  mentalCost: number;                      // 念力消耗
  minRealm: number;                        // 最低境界要求
}

// ── 突破需求定义 ──

export interface BreakthroughItemCost {
  itemId: string;
  count: number;
}

export interface BreakthroughCondition {
  id: string;
  description: string;
  check: (p: Player) => boolean;
}

export interface BreakthroughReqDef {
  id: string;
  fromRealmIndex: number;
  toRealmIndex: number;
  itemCosts: BreakthroughItemCost[];
  conditions: BreakthroughCondition[];
  requiresTribulation: boolean;
  baseSuccessRate?: number;
  failurePenalty?: {
    expLossRate?: number;
    moodLoss?: number;
    healthLoss?: number;
  };
  description?: string;
}

// ── 天劫定义 ──

export interface TribulationWave {
  name: string;
  hp: number;
  atk: number;
  def: number;
  speed: number;
  specialEffect?: {
    type: 'dot' | 'debuff_def' | 'debuff_atk' | 'heal_block';
    value: number;
    description: string;
  };
}

export interface TribulationDef {
  id: string;
  name: string;
  description: string;
  forRealmIndex: number;
  waves: TribulationWave[];
  rewards: {
    bonusExp: number;
    items: Array<{ itemId: string; count: number }>;
  };
  failureType: 'realm_drop' | 'become_loose_immortal' | 'death';
  failureDescription: string;
}

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
  events?: GameEvent[];                    // 该 DLC 提供的事件
  items?: ItemDef[];                       // 该 DLC 提供的物品定义
  recipes?: RecipeDef[];                   // 该 DLC 提供的炼丹配方
  equips?: EquipDef[];                     // 该 DLC 提供的装备定义
  smithingRecipes?: SmithingRecipeDef[];   // 该 DLC 提供的炼器配方
  breakthroughReqs?: BreakthroughReqDef[]; // 该 DLC 提供的突破需求
  tribulations?: TribulationDef[];         // 该 DLC 提供的天劫定义
}
