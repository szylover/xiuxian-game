// ============================================================
// dlc/core/manifest.ts — 基础内容包元信息（必选，始终加载）
// ============================================================

export const CORE_DLC_META = {
  id: 'core',
  name: '基础内容包',
  description: '核心事件 · 物品 · 功法 · 装备 · 妖兽 · 境界 · 区域 · NPC · 任务',
  version: '2.0.0',
  type: 'core' as const,
  required: true,
};
