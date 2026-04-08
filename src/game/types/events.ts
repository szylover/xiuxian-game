import type { Player } from '../player';

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
  regionTags?: string[];                   // T0021 区域标签（空/未设置 = 全区域通用）
}
