// ============================================================
// shared/index.ts — 共享组件 barrel re-export
// ============================================================

export { default as CollapsiblePanel } from './CollapsiblePanel';
export { default as CapacityBar } from './CapacityBar';
export { default as TabBar } from './TabBar';
export { default as StatusItem } from './StatusItem';
export { default as FloatingPanel } from './FloatingPanel';
export { default as CombatModal } from './CombatModal';
export { default as DeathModal } from './DeathModal';
export { StatRow, AptitudeBar } from './StatRow';
export {
  RARITY_COLORS, RARITY_LABELS, STAT_CN, STAT_COLORS,
  SLOT_ICONS, CATEGORY_TABS, statsCN,
  SPIRIT_ROOT_CN, SPIRIT_ROOT_COLORS, SPIRIT_ROOT_ICONS, COMBO_CN,
  NPC_RELATION_CN, NPC_RELATION_COLORS, NPC_RELATION_EMOJI, NPC_PERSONALITY_CN,
} from './constants';
