// ============================================================
// system-actions/index.ts — 系统行为 Hook 组合入口
// 将各子系统 Hook 组合为统一的 useSystemActions 返回值
// ============================================================

import { useCallback } from 'react';
import type { Player } from '../../game/player';
import type { LogCategory } from '../useGameLog';
import type { SystemActionDeps } from './types';
import { useInventoryActions } from './useInventoryActions';
import { useAlchemyActions } from './useAlchemyActions';
import { useEquipmentActions } from './useEquipmentActions';
import { useShopActions } from './useShopActions';
import { useSmithingActions } from './useSmithingActions';
import { useBreakthroughActions } from './useBreakthroughActions';
import { useTechniqueActions } from './useTechniqueActions';
import { useDivineArtsActions } from './useDivineArtsActions';
import { useMapActions } from './useMapActions';
import { useBodyCultivationActions } from './useBodyCultivationActions';
import { useNpcActions } from './useNpcActions';
import { useQuestActions } from './useQuestActions';
import { useDialogueActions } from './useDialogueActions';
import { useTalentTreeActions } from './useTalentTreeActions';

export type { SystemActionDeps, ChronicleHooks } from './types';

export function useSystemActions(deps: SystemActionDeps) {
  const { player, addLog, setPlayer, chronicleHooks } = deps;

  // ── 通用模式：执行操作 → 更新 player → 写日志 ──
  const execAction = useCallback(
    (action: (p: Player) => { player: Player; message: string }, category: LogCategory = 'system') => {
      let msg = '';
      setPlayer(prev => {
        if (!prev) return prev;
        const result = action(prev);
        msg = result.message;
        return result.player;
      });
      if (msg) addLog(msg, category);
    },
    [addLog, setPlayer],
  );

  const ctx = { ...deps, execAction };

  const inventoryActions = useInventoryActions(ctx);
  const alchemyActions = useAlchemyActions(ctx);
  const equipmentActions = useEquipmentActions(ctx);
  const shopActions = useShopActions(ctx);
  const smithingActions = useSmithingActions(ctx);
  const breakthroughActions = useBreakthroughActions(ctx);
  const techniqueActions = useTechniqueActions(ctx);
  const divineArtsActions = useDivineArtsActions(ctx);
  const mapActions = useMapActions(ctx);
  const bodyCultivationActions = useBodyCultivationActions(ctx);
  const npcActions = useNpcActions(ctx);
  const questActions = useQuestActions(ctx);
  const dialogueActions = useDialogueActions(ctx);
  const talentTreeActions = useTalentTreeActions(ctx);

  return {
    ...inventoryActions,
    ...alchemyActions,
    ...equipmentActions,
    ...shopActions,
    ...smithingActions,
    ...breakthroughActions,
    ...techniqueActions,
    ...divineArtsActions,
    ...mapActions,
    ...bodyCultivationActions,
    ...npcActions,
    ...questActions,
    ...dialogueActions,
    ...talentTreeActions,
  };
}
