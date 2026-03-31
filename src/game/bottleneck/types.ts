// ============================================================
// game/bottleneck/types.ts — 瓶颈系统类型定义（T0064）
// ============================================================

/** 解锁方式定义 */
export interface UnlockMethodDef {
  id: string;                        // 'combat' | 'explore_insight' | 'quest' | 'discuss' | 'item'
  type: 'combat' | 'explore' | 'quest' | 'discuss' | 'item';
  description: string;               // 展示给玩家的提示，如 "在生死战斗中感悟"
  triggerProbability?: number;       // 每次触发动作时随机概率（0-1），如战斗 0.04
  requiredProgress?: number;         // 需要先积累多少 progress 值才可解锁
  condition?: string;                // 条件标识符（引擎侧翻译为谓词）
}

/** 瓶颈定义（数据驱动） */
export interface BottleneckDef {
  id: string;                        // 'core:bottle_realm_1' / 'core:bottle_technique_basic_sword'
  type: 'realm' | 'technique';
  // ── 对于境界瓶颈 ──
  blockedAtRealmIndex?: number;      // 玩家处于该境界大圆满时触发（exp >= realm.expReq * 0.9）
  // ── 对于功法瓶颈 ──
  blockedTechniqueId?: string;       // 目标功法 ID
  blockedAtLevel?: number;           // 功法升至此等级时触发（0 = effectiveMax）
  // ── 描述 ──
  name: string;                      // '炼气大圆满瓶颈'
  description: string;               // 叙事描述，展示在 UI 中
  // ── 解锁逻辑 ──
  unlockMethods: UnlockMethodDef[];  // 至少 1 种，玩家完成任意一种即可解锁
  // ── 积累机制 ──
  progressPerAction: Partial<Record<UnlockMethodDef['type'], number>>; // 每次对应行动增加的 progress
  unlockProgressThreshold: number;   // progress 积累到此值时，强制解锁（兜底）
}

/** 单个激活中的瓶颈运行时状态 */
export interface ActiveBottleneck {
  defId: string;                          // 对应 BottleneckDef.id
  enteredAt: number;                      // 进入瓶颈时的 gameYear（用于超时强制解锁）
  progress: number;                       // 当前积累进度（0 → unlockProgressThreshold）
  methodProgress: Record<string, number>; // 按 UnlockMethodDef.id 分别记录进度
  unlocked: boolean;                      // true = 已获得机缘，可突破；false = 仍被封堵
  unlockedBy: string | null;              // 解锁时记录是哪种 type 触发的
}

/** 存入 player.systems.bottleneck 的完整状态 */
export interface BottleneckSystemState {
  activeBottlenecks: ActiveBottleneck[];  // 当前激活的瓶颈列表（通常 1 条）
  resolvedBottlenecks: string[];          // 已解决的 defId 列表（防止重复触发）
}
