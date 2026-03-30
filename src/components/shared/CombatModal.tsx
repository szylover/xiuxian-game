// ============================================================
// CombatModal.tsx — 两阶段战斗结果弹窗（T0046 重做）
// Phase 1: 可视化对阵区 + 逐回合日志 → Phase 2: 战利品展示
// ============================================================

import { useState, useEffect, useRef, useMemo } from 'react';
import type { CombatModalState } from '../../hooks/useGameEngine';
import { groupByRound } from './combat/CombatBattleLog';
import CombatHeader from './combat/CombatHeader';
import CombatBattleLog from './combat/CombatBattleLog';
import CombatFooter from './combat/CombatFooter';

interface CombatModalProps {
  state: CombatModalState;
  onNext: () => void;   // battle → loot
  onClose: () => void;  // 关闭弹窗
}

const ROUND_INTERVAL = 800; // 每回合间隔 ms

export default function CombatModal({ state, onNext, onClose }: CombatModalProps) {
  const {
    phase, monsterName, monsterEmoji, result, loot,
    playerAvatar, playerName, playerRealmIndex, playerMaxHp, playerMaxMp, monsterMaxHp, snapshots,
  } = state;

  const rounds = useMemo(() => groupByRound(result.logs), [result.logs]);
  const [visibleRounds, setVisibleRounds] = useState(0);
  const [allRevealed, setAllRevealed] = useState(false);
  const timerRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 当前对应的快照索引：visibleRounds 对应第 visibleRounds 回合末（round=0 为初始）
  const snapshotIndex = Math.min(visibleRounds, snapshots.length - 1);

  // 读取玩家当前境界（用于头像边框颜色）
  // playerRealmIndex 已从 CombatModalState 传入

  // 逐回合显示
  useEffect(() => {
    if (phase !== 'battle') return;
    setVisibleRounds(0);
    setAllRevealed(false);

    let count = 0;
    timerRef.current = window.setInterval(() => {
      count++;
      setVisibleRounds(count);
      if (count >= rounds.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setAllRevealed(true);
      }
    }, ROUND_INTERVAL);

    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [phase, rounds.length]);

  // 自动滚动到最新回合
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleRounds]);

  // 跳过动画
  const skipAnimation = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setVisibleRounds(rounds.length);
    setAllRevealed(true);
  };

  if (phase === 'battle') {
    return (
      <div className="combat-modal-overlay">
        <div className="combat-modal combat-modal-fixed">
          {/* 标题栏 */}
          <div className="combat-modal-header">⚔️ 战斗</div>

          {/* 对阵区 */}
          <CombatHeader
            playerName={playerName}
            playerAvatar={playerAvatar}
            playerRealmIndex={playerRealmIndex}
            playerMaxHp={playerMaxHp}
            playerMaxMp={playerMaxMp}
            monsterName={monsterName}
            monsterEmoji={monsterEmoji}
            monsterMaxHp={monsterMaxHp}
            snapshots={snapshots}
            currentRound={snapshotIndex}
            winner={allRevealed ? result.winner : undefined}
          />

          {/* 日志区 */}
          <div className="combat-modal-body" ref={scrollRef}>
            <CombatBattleLog
              rounds={rounds}
              visibleRounds={visibleRounds}
              monsterName={monsterName}
            />
          </div>

          {/* 底部按钮 */}
          <CombatFooter
            allRevealed={allRevealed}
            winner={result.winner}
            onSkip={skipAnimation}
            onNext={onNext}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  // Phase 2: loot
  return (
    <div className="combat-modal-overlay">
      <div className="combat-modal">
        <div className="combat-modal-header">
          {result.winner === 'player' ? '🎉 胜利！' : '⚔️ 脱战'}
        </div>
        <div className="combat-modal-body combat-modal-loot">
          <div className="combat-modal-loot-row">
            <span className="combat-modal-loot-icon">📖</span>
            <span>修为</span>
            <span className="combat-modal-loot-amount">+{result.expGained}</span>
          </div>
          <div className="combat-modal-loot-row">
            <span className="combat-modal-loot-icon">💰</span>
            <span>灵石</span>
            <span className="combat-modal-loot-amount">+{result.goldGained}</span>
          </div>
          {loot.length > 0 ? (
            loot.map((item, i) => (
              <div key={i} className="combat-modal-loot-row" style={{ animationDelay: `${(i + 2) * 0.05}s` }}>
                <span className="combat-modal-loot-icon">{item.icon}</span>
                <span>{item.name}</span>
                <span className="combat-modal-loot-amount">×{item.amount}</span>
              </div>
            ))
          ) : (
            <div className="combat-modal-no-loot">无额外掉落</div>
          )}
        </div>
        <div className="combat-modal-footer">
          <button className="btn combat-modal-btn" onClick={onClose}>确认</button>
        </div>
      </div>
    </div>
  );
}

