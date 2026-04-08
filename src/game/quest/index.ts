// ============================================================
// quest/index.ts — barrel re-export
// 保持外部 import path 兼容：import { ... } from '../game/quest'
// ============================================================

// state
export { getQuestState, setQuestState } from './state';

// queries
export {
  getAvailableQuests,
  getActiveQuests,
  getCompletedQuests,
  getDiscoveredQuests,
  getQuestsForNpc,
  getTrackedQuestInfo,
} from './queries';

// operations
export {
  acceptQuest,
  abandonQuest,
  deliverQuestItem,
  turnInQuest,
  setTrackedQuest,
} from './operations';

// objectives
export { tickQuestObjectives, checkQuestTimeouts } from './objectives';

// discovery
export { discoverQuest, checkQuestDiscovery } from './discovery';

// debug
export {
  forceDiscoverQuest,
  forceAcceptQuest,
  forceCompleteStep,
  forceCompleteQuest,
  resetQuest,
  clearAllQuestData,
} from './debug';
