// ============================================================
// combat/CombatBattleLog.tsx — 中间日志区：回合分组 + 富文本渲染
// ============================================================

import type { ReactNode } from 'react';

/** 将日志按回合分组：以 "── 第 X 回合 ──" 为分界线 */
export function groupByRound(logs: string[]): string[][] {
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
export function renderLogLine(line: string, monsterName: string): ReactNode {
  const parts: ReactNode[] = [];
  const escaped = monsterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const fullRegex = new RegExp(
    `(${escaped}|你|【[^】]+】|\\d+ 点伤害|\\d+ 点生命|暴击！|闪避|先手|击败|灵力-\\d+|防御降低 \\d+|攻击降低 \\d+|灼烧伤害 \\d+)`,
    'g',
  );

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fullRegex.exec(line)) !== null) {
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

interface CombatBattleLogProps {
  rounds: string[][];
  visibleRounds: number;
  monsterName: string;
}

export default function CombatBattleLog({ rounds, visibleRounds, monsterName }: CombatBattleLogProps) {
  return (
    <>
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
    </>
  );
}
