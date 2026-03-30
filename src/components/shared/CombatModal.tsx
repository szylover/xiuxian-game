// ============================================================
// CombatModal.tsx — 两阶段战斗结果弹窗（T0044）
// Phase 1: 按回合逐组显示 → Phase 2: 战利品展示
// ============================================================

import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import type { CombatModalState } from '../../hooks/useGameEngine';

interface CombatModalProps {
  state: CombatModalState;
  onNext: () => void;   // battle → loot
  onClose: () => void;  // 关闭弹窗
}

/** 将日志按回合分组：以 "── 第 X 回合 ──" 为分界线 */
function groupByRound(logs: string[]): string[][] {
  const groups: string[][] = [];
  let current: string[] = [];
  for (const line of logs) {
    if (/^── 第 \d+ 回合 ──$/.test(line)) {
      if (current.length > 0) groups.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

/** 富文本渲染：给日志中的关键词上色 */
function renderLogLine(line: string, monsterName: string): ReactNode {
  // 数字（伤害/恢复量）高亮
  // 玩家名"你"用蓝绿色，怪物名用橙红色
  // 技能名【xxx】用金色
  const parts: ReactNode[] = [];
  // 用正则拆分出需要高亮的部分
  const regex = /(你|【[^】]+】|\d+ 点伤害|\d+ 点生命|暴击|闪避|先手|击败|灵力-\d+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const escaped = monsterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const fullRegex = new RegExp(`(${escaped}|你|【[^】]+】|\\d+ 点伤害|\\d+ 点生命|暴击！|闪避|先手|击败|灵力-\\d+|防御降低 \\d+|攻击降低 \\d+|灼烧伤害 \\d+)`, 'g');

  while ((match = fullRegex.exec(line)) !== null) {
    // text before match
    if (match.index > lastIndex) {
      parts.push(<span key={`t${lastIndex}`} className="cl-text">{line.slice(lastIndex, match.index)}</span>);
    }
    const word = match[1];
    let cls = 'cl-text';
    if (word === '你') {
      cls = 'cl-player';
    } else if (word === monsterName) {
      cls = 'cl-monster';
    } else if (word.startsWith('【')) {
      cls = 'cl-skill';
    } else if (/\d+ 点伤害/.test(word)) {
      cls = 'cl-damage';
    } else if (/\d+ 点生命/.test(word)) {
      cls = 'cl-heal';
    } else if (word === '暴击！') {
      cls = 'cl-crit';
    } else if (word === '闪避') {
      cls = 'cl-dodge';
    } else if (word === '先手' || word === '击败') {
      cls = 'cl-info';
    } else if (/灵力-\d+/.test(word)) {
      cls = 'cl-mp';
    } else if (/防御降低|攻击降低|灼烧伤害/.test(word)) {
      cls = 'cl-debuff';
    }
    parts.push(<span key={`m${match.index}`} className={cls}>{word}</span>);
    lastIndex = match.index + word.length;
  }
  if (lastIndex < line.length) {
    parts.push(<span key={`e${lastIndex}`} className="cl-text">{line.slice(lastIndex)}</span>);
  }
  return parts.length > 0 ? <>{parts}</> : line;
}

const ROUND_INTERVAL = 800; // 每回合间隔 ms

export default function CombatModal({ state, onNext, onClose }: CombatModalProps) {
  const { phase, monsterName, result, loot } = state;
  const rounds = useMemo(() => groupByRound(result.logs), [result.logs]);
  const [visibleRounds, setVisibleRounds] = useState(0);
  const [allRevealed, setAllRevealed] = useState(false);
  const timerRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
          <div className="combat-modal-header">⚔️ 战斗 — {monsterName}</div>
          <div className="combat-modal-body" ref={scrollRef}>
            {rounds.slice(0, visibleRounds).map((group, gi) => (
              <div key={gi} className="combat-round-block combat-log-appear">
                {group.map((line, li) => {
                  const isRoundHeader = /^── 第 \d+ 回合 ──$/.test(line);
                  return (
                    <div key={li} className={isRoundHeader ? 'combat-round-header' : 'combat-modal-log-line'}>
                      {isRoundHeader ? line : renderLogLine(line, monsterName)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="combat-modal-footer">
            {!allRevealed ? (
              <button className="btn combat-modal-btn" onClick={skipAnimation}>跳过 ▶▶</button>
            ) : result.winner === 'monster' ? (
              <button className="btn combat-modal-btn" onClick={onClose}>确认</button>
            ) : (
              <button className="btn combat-modal-btn" onClick={onNext}>查看战利品 ▶</button>
            )}
          </div>
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
