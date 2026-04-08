// ── 区域定义（T0021）──

export interface RegionDef {
  id: string;                     // 命名空间 ID，如 'core:qingyun_town'
  name: string;                   // 显示名称
  emoji: string;                  // 显示用 emoji
  description: string;            // 区域描述
  minRealm: number;               // 最低进入境界（realmIndex）
  regionTags: string[];           // 区域标签，用于筛选事件/妖兽/商品
  travelCostBase: number;         // 基础移动精力消耗
  travelTimeMonths: number;       // 移动耗时（月数）
  parentId?: string;              // 父区域 ID（树状结构，无则为根节点）
  isContainer?: boolean;          // 容器节点（世界/大陆），不可移动到，仅分组
  safeZone?: boolean;             // 安全区：无法触发战斗
  explorationBonus?: number;      // 探索事件额外权重加成（0~1）
  combatBonus?: number;           // 战斗经验加成（0~1）
  shopDiscount?: number;          // 商店折扣加成（0~1）
  connections?: string[];         // 可直接移动到的相邻区域 ID 列表（预留）
  lootTable?: Array<{ itemId: string; chance: number }>;  // T0022 区域专属掉落表
}

export interface MapSystemState {
  currentRegionId: string;
  unlockedRegions: string[];
  travelCount: number;
}
