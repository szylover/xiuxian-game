// ============================================================
// hooks/useChronicle.ts — 修仙履历 React Hook（T0068）
// 管理跨局永久履历的读写，提供给 useGameEngine 集成
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Player } from '../game/player';
import {
  loadChronicle, saveChronicle, clearChronicle,
  createIncarnation, finalizeIncarnation,
  addChronicleEvent, updateCurrentSnapshot,
  incrementDeathCount, incrementReviveCount,
} from '../game/chronicle';
import type {
  CultivationChronicle, ChronicleEvent, ChronicleEventType,
} from '../game/chronicle';

export function useChronicle() {
  const [chronicle, setChronicle] = useState<CultivationChronicle>(() => loadChronicle());
  const chronicleRef = useRef(chronicle);

  // 保持 ref 同步
  useEffect(() => {
    chronicleRef.current = chronicle;
  }, [chronicle]);

  // 持久化
  const persist = useCallback((c: CultivationChronicle) => {
    setChronicle(c);
    saveChronicle(c);
  }, []);

  /** 开始新轮回 */
  const startNewIncarnation = useCallback((player: Player) => {
    const c = createIncarnation(player, chronicleRef.current);
    persist(c);
  }, [persist]);

  /** 归档当前轮回（死亡/飞升） */
  const finalizeCurrentIncarnation = useCallback((player: Player, outcome: 'died' | 'ascended') => {
    const c = finalizeIncarnation(chronicleRef.current, player, outcome);
    persist(c);
  }, [persist]);

  /** 添加关键事件 */
  const addEvent = useCallback((event: ChronicleEvent) => {
    const c = addChronicleEvent(chronicleRef.current, event);
    persist(c);
  }, [persist]);

  /** 快捷：通过类型+描述+当前 player 构建事件 */
  const recordEvent = useCallback((
    type: ChronicleEventType,
    player: Player,
    description: string,
    meta?: Record<string, unknown>,
  ) => {
    addEvent({
      type,
      year: player.gameYear,
      month: player.gameMonth,
      description,
      meta,
    });
  }, [addEvent]);

  /** 更新当前轮回快照（境界/经验等） */
  const syncSnapshot = useCallback((player: Player) => {
    const c = updateCurrentSnapshot(chronicleRef.current, player);
    persist(c);
  }, [persist]);

  /** 增加死亡计数 */
  const recordDeath = useCallback(() => {
    const c = incrementDeathCount(chronicleRef.current);
    persist(c);
  }, [persist]);

  /** 增加复活计数 */
  const recordRevive = useCallback(() => {
    const c = incrementReviveCount(chronicleRef.current);
    persist(c);
  }, [persist]);

  /** 清空所有履历 */
  const resetChronicle = useCallback(() => {
    clearChronicle();
    setChronicle(loadChronicle());
  }, []);

  return {
    chronicle,
    startNewIncarnation,
    finalizeCurrentIncarnation,
    addEvent,
    recordEvent,
    syncSnapshot,
    recordDeath,
    recordRevive,
    resetChronicle,
  };
}
