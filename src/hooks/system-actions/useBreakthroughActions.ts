import { useCallback } from 'react';
import { attemptBreakthrough as attemptBreakthroughFn } from '../../game/breakthrough';
import { runTribulation as runTribulationFn } from '../../game/tribulation';
import { attemptAscension, applyAscensionSuccess, applyAscensionFailure } from '../../game/ascension';
import { checkQuestDiscovery } from '../../game/quest';
import { getTribulationById, getRealmDef } from '../../game/registry';
import { REALMS } from '../../game/data';
import { UI_LABELS } from '../../data/texts/ui-labels';
import { BREAKTHROUGH_TEXTS } from '../../data/texts/breakthrough';
import { ASCENSION_TEXTS } from '../../data/texts/ascension';
import type { SystemActionContext } from './types';

export function useBreakthroughActions({ player, addLog, setPlayer, setGameOver, setGameOverReason, chronicleHooks }: Pick<SystemActionContext, 'player' | 'addLog' | 'setPlayer' | 'setGameOver' | 'setGameOverReason' | 'chronicleHooks'>) {
  const breakthrough = useCallback(() => {
    if (!player) return;

    const btResult = attemptBreakthroughFn(player);
    let finalPlayer = btResult.player;
    const allLogs = [...btResult.logs];

    if (btResult.triggerTribulation) {
      const tribResult = runTribulationFn(finalPlayer);
      finalPlayer = tribResult.player;
      allLogs.push(...tribResult.logs);

      if (!tribResult.success && finalPlayer.hp <= 0) {
        setGameOver(true);
        setGameOverReason(UI_LABELS.tribulationGameOver);
        // T0068: 渡劫失败
        chronicleHooks?.recordEvent('tribulation_fail', finalPlayer, '渡劫失败，形神俱灭');
      } else if (tribResult.success) {
        // T0068: 渡劫成功
        chronicleHooks?.recordEvent('tribulation_pass', finalPlayer, '渡劫成功');
      }
    }

    setPlayer(finalPlayer);
    for (const log of allLogs) {
      addLog(log, btResult.blockedByBottleneck ? 'adventure' : 'system');
    }
    // T0067: 突破成功后检查可发现的任务
    if (btResult.success) {
      // T0068: 记录境界突破事件
      const realmName = REALMS[finalPlayer.realmIndex]?.name ?? '???';
      chronicleHooks?.recordEvent('realm_breakthrough', finalPlayer, `突破至${realmName}期`, {
        realmName, realmIndex: finalPlayer.realmIndex,
      });
      chronicleHooks?.syncSnapshot(finalPlayer);
      setPlayer(prev => {
        if (!prev) return prev;
        const questDiscover = checkQuestDiscovery(prev, { type: 'reach_realm', realmIndex: prev.realmIndex });
        for (const log of questDiscover.logs) addLog(log, 'system');
        return questDiscover.player;
      });
    }
    // 突破失败额外提示
    if (!btResult.success && !btResult.triggerTribulation) {
      if (btResult.blockedByBottleneck) {
        addLog(BREAKTHROUGH_TEXTS.bottleneckHint, 'system');
      }
    }
  }, [player, addLog, setPlayer, setGameOver, setGameOverReason, chronicleHooks]);

  const ascend = useCallback(() => {
    if (!player) return;

    const ascResult = attemptAscension(player);
    let finalPlayer = ascResult.player;
    const allLogs = [...ascResult.logs];

    if (ascResult.triggerTribulation && ascResult.tribulationId) {
      // 飞升天劫：通过 tribulationId 查找天劫定义并执行
      const tribDef = getTribulationById(ascResult.tribulationId);
      if (tribDef) {
        const tribResult = runTribulationFn(finalPlayer);
        finalPlayer = tribResult.player;
        allLogs.push(...tribResult.logs);

        if (!tribResult.success) {
          // 飞升天劫失败
          const failResult = applyAscensionFailure(finalPlayer, ascResult.ascDef!);
          finalPlayer = failResult.player;
          allLogs.push(...failResult.logs);

          if (finalPlayer.hp <= 0) {
            setGameOver(true);
            setGameOverReason(ASCENSION_TEXTS.annihilated);
            chronicleHooks?.recordEvent('ascension_fail', finalPlayer,
              ASCENSION_TEXTS.chronicleAscensionFail(REALMS[player.realmIndex]?.name ?? '???'));
          } else {
            chronicleHooks?.recordEvent('ascension_fail', finalPlayer,
              ASCENSION_TEXTS.chronicleAscensionFail(REALMS[player.realmIndex]?.name ?? '???'));
          }
        } else {
          // 天劫通过 → 完成飞升
          const successResult = applyAscensionSuccess(finalPlayer, ascResult.ascDef!);
          finalPlayer = successResult.player;
          allLogs.push(...successResult.logs);

          const fromRealm = REALMS[player.realmIndex]?.name ?? '???';
          const toRealm = getRealmDef(ascResult.ascDef!.toRealmIndex)?.name ?? '???';
          chronicleHooks?.recordEvent('ascension_success', finalPlayer,
            ASCENSION_TEXTS.chronicleAscension(fromRealm, toRealm),
            { fromRealmIndex: player.realmIndex, toRealmIndex: ascResult.ascDef!.toRealmIndex });
          chronicleHooks?.syncSnapshot(finalPlayer);
        }
      }
    } else if (ascResult.success) {
      // 无天劫直接成功
      const fromRealm = REALMS[player.realmIndex]?.name ?? '???';
      const toRealm = getRealmDef(ascResult.ascDef!.toRealmIndex)?.name ?? '???';
      chronicleHooks?.recordEvent('ascension_success', finalPlayer,
        ASCENSION_TEXTS.chronicleAscension(fromRealm, toRealm),
        { fromRealmIndex: player.realmIndex, toRealmIndex: ascResult.ascDef!.toRealmIndex });
      chronicleHooks?.syncSnapshot(finalPlayer);
    }

    setPlayer(finalPlayer);
    for (const log of allLogs) {
      addLog(log, 'system');
    }
  }, [player, addLog, setPlayer, setGameOver, setGameOverReason, chronicleHooks]);

  return { breakthrough, ascend };
}
