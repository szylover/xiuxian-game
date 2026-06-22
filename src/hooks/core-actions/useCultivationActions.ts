import { useCallback, useRef } from 'react';
import type { Player } from '../../game/player';
import { getSpiritRootGrade } from '../../game/player';
import { ACTION_COSTS, BASE_CULTIVATE_EXP } from '../../game/data';
import { getTechniqueDef } from '../../game/registry';
import { gainBodyRealmExp } from '../../game/body-cultivation';
import { ensureBottleneckState, getActiveBottlenecks, tickPersistenceCultivation, tryOverflowUnlock } from '../../game/bottleneck';
import { tickQuestObjectives } from '../../game/quest';
import type { CoreActionDeps, LogQueue } from './types';
import type { LogCategory } from '../useGameLog';
import { COMBAT_TEXTS } from '../../data/texts/combat';
import { CULTIVATION_TEXTS } from '../../data/texts/cultivation';
import { playSound } from '../../game/audio';
import { ensureDestinyTalentState } from '../../game/destiny';
import { gainComprehension, getEnlightenmentEffects, tryTriggerEnlightenment } from '../../game/enlightenment';
import { changeKarma } from '../../game/karma';
import { getSectCultivationBonus } from '../../game/sect';
import { getDualCultivationBonus } from '../../game/npc';

export function useCultivationActions(
  deps: Pick<CoreActionDeps, 'addLog' | 'setPlayer' | 'advanceTime' | 'canAct'>,
  pendingRef: React.MutableRefObject<LogQueue>,
  flushLogs: () => void,
) {
  const { addLog, setPlayer, advanceTime, canAct } = deps;

  const queueLog = (msg: string, cat: LogCategory = 'default') => {
    pendingRef.current.msgs.push(msg);
    pendingRef.current.categories.push(cat);
  };

  const queueLogs = (msgs: string[], cat: LogCategory = 'default') => {
    for (const m of msgs) {
      pendingRef.current.msgs.push(m);
      pendingRef.current.categories.push(cat);
    }
  };

  const cultivate = useCallback(() => {
    if (!canAct('cultivate')) {
      addLog(COMBAT_TEXTS.noStamina, 'system');
      return;
    }
    pendingRef.current = { msgs: [], categories: [] };
    setPlayer(prev => {
      if (!prev) return prev;
      let p: Player = ensureDestinyTalentState({ ...prev });
      const cost = ACTION_COSTS.cultivate;
      p.stamina -= cost.stamina;

      const compBonus = 1 + p.comprehension / 50;
      const cultivationMult = p.spiritRoots?.cultivationMultiplier ?? getSpiritRootGrade(p.aptitudes).multiplier;
      const moodBonus = 0.5 + (p.mood / 100);
      const enlightenmentBonus = getEnlightenmentEffects(p).cultivationSpeedBonus ?? 0;
      const sectBonus = getSectCultivationBonus(p);
      const dualBonus = getDualCultivationBonus(p);
      const expGain = Math.floor(BASE_CULTIVATE_EXP * compBonus * cultivationMult * moodBonus * (1 + enlightenmentBonus + sectBonus + dualBonus));
      p.exp += expGain;

      // T0062 根据激活功法类型决定锄体/修炼模式
      const activeDef = p.activeTechniqueId ? getTechniqueDef(p.activeTechniqueId) : null;
      if (activeDef?.karmaShift) {
        const karmaResult = changeKarma(p, activeDef.karmaShift, activeDef.name);
        p = karmaResult.player;
        queueLogs(karmaResult.logs, 'system');
      }
      const bodyRate = activeDef?.bodyExpRate ?? 0;
      let bodyMsg = '';

      // 修炼时也恢复少量体魄（练功也锻炼身体）
      const physiqueGain = Math.floor(p.maxPhysique * (bodyRate >= 0.6 ? 0.08 : 0.03));
      if (physiqueGain > 0) {
        p.physique = Math.min(p.maxPhysique, p.physique + physiqueGain);
      }

      if (bodyRate > 0) {
        const baseBodyExp = Math.floor(expGain * bodyRate * 0.5);
        const { player: p2, message: btMsg, actualGain } = gainBodyRealmExp(p, baseBodyExp);
        p = p2;
        if (actualGain > 0) bodyMsg = ` ${CULTIVATION_TEXTS.bodyExpGain(actualGain)}`;
        if (btMsg) bodyMsg += ` ${btMsg}`;
      }

      const isBodyMode = bodyRate >= 0.8;
      p.tracking = { ...p.tracking, consecutiveCultivates: p.tracking.consecutiveCultivates + 1, consecutiveRests: 0 };

      // T0064: 坚韧修炼 tick — 每次修炼推进所有激活瓶颈的坚韧进度
      p = ensureBottleneckState(p);
      const activeBottlenecks = getActiveBottlenecks(p);
      for (const { def, entry } of activeBottlenecks) {
        if (def.unlockMethods.some(m => m.type === 'persistence')) {
          const tickResult = tickPersistenceCultivation(p, entry.bottleneckId);
          p = tickResult.player;
          if (tickResult.unlocked && tickResult.log) {
            queueLog(tickResult.log, 'system');
          }
        }
      }

      // T0064: 修为溢出自动消除瓶颈
      const overflowResult = tryOverflowUnlock(p);
      if (overflowResult.triggered) {
        p = overflowResult.player;
        queueLog(overflowResult.log, 'system');
      }

      // T0057: 修炼后推进任务目标
      const questResult = tickQuestObjectives(p, { type: 'cultivate' });
      p = questResult.player;
      queueLogs(questResult.logs, 'system');

      const enlightenmentGain = gainComprehension(p, Math.max(4, Math.floor(expGain / 10)));
      p = enlightenmentGain.player;

      const enlightenmentTrigger = tryTriggerEnlightenment(p, expGain);
      p = enlightenmentTrigger.player;

      p = advanceTime(p, 'cultivate');

      pendingRef.current = { msgs: [], categories: [] };
      queueLogs(enlightenmentGain.logs, 'system');
      queueLogs(enlightenmentTrigger.logs, 'adventure');
      if (isBodyMode) {
        queueLog(CULTIVATION_TEXTS.cultivateBody(expGain) + bodyMsg, 'system');
      } else {
        queueLog(CULTIVATION_TEXTS.cultivate(expGain, compBonus.toFixed(1), cultivationMult, moodBonus.toFixed(1)) + bodyMsg, 'system');
      }
      return p;
    });
    playSound('cultivateTick');
    setTimeout(flushLogs, 0);
  }, [canAct, advanceTime, addLog, setPlayer]);

  return { cultivate };
}
