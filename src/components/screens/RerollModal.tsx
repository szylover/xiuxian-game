// ============================================================
// RerollModal.tsx — 随机角色浮动面板（T0063: 细粒度锁定）
// 复用 FloatingPanel 可拖拽窗口组件
// ============================================================

import { useState, useCallback } from 'react';
import type { PreviewRoll } from '../../game/player/create';
import { rollAptitudesWithSpiritRoots, rollInnateAttr, randInt } from '../../game/player/create';
import { rollSpiritRoots } from '../../game/spirit-root';
import type { Aptitudes } from '../../game/player/types';
import { SPIRIT_ROOT_CN, SPIRIT_ROOT_COLORS, SPIRIT_ROOT_ICONS, COMBO_CN, APTITUDE_CN } from '../shared/constants';
import FloatingPanel from '../shared/FloatingPanel';

// ── 可锁定属性 key ──
type LockableKey =
  | 'spiritRoots'
  | 'root:metal' | 'root:wood' | 'root:water' | 'root:fire' | 'root:earth'
  | 'luck' | 'comprehension' | 'charisma'
  | `apt:${keyof Aptitudes}`
  | 'mood' | 'health';

const MAX_LOCKS = 5;

const COMBO_COLORS: Record<string, string> = {
  none: '#9E9E9E', single: '#FFD700', dual: '#FF5722',
  triple: '#9C27B0', quad: '#4CAF50', penta: '#607D8B',
};

const MULT_MAP: Record<string, number> = {
  none: 0.1, single: 3.0, dual: 2.0, triple: 1.2, quad: 0.8, penta: 0.5,
};

const APTITUDE_GROUPS: { label: string; keys: (keyof Aptitudes)[] }[] = [
  { label: '元素', keys: ['fire', 'water', 'thunder', 'wind', 'earth', 'wood'] },
  { label: '武学', keys: ['blade', 'spear', 'sword', 'fist', 'palm', 'finger'] },
  { label: '功法', keys: ['alchemy', 'smithing', 'fengshui', 'mining'] },
];

interface RerollModalProps {
  preview: PreviewRoll;
  onConfirm: (roll: PreviewRoll) => void;
  onClose: () => void;
}

function rerollWithLocks(prev: PreviewRoll, locks: Set<LockableKey>): PreviewRoll {
  const newSpiritRoots = locks.has('spiritRoots')
    ? (() => {
        const roots = prev.spiritRoots.roots.map(r =>
          locks.has(`root:${r.type}` as LockableKey) ? r : { ...r, affinity: randInt(1, 100) }
        );
        return { ...prev.spiritRoots, roots };
      })()
    : (() => {
        const fresh = rollSpiritRoots();
        const roots = fresh.roots.map(r => {
          const prevRoot = prev.spiritRoots.roots.find(pr => pr.type === r.type);
          return locks.has(`root:${r.type}` as LockableKey) && prevRoot
            ? { ...r, affinity: prevRoot.affinity }
            : r;
        });
        return { ...fresh, roots };
      })();

  const luck          = locks.has('luck')          ? prev.luck          : rollInnateAttr();
  const comprehension = locks.has('comprehension') ? prev.comprehension : rollInnateAttr();
  const charisma      = locks.has('charisma')      ? prev.charisma      : rollInnateAttr();

  const aptitudes = { ...rollAptitudesWithSpiritRoots(newSpiritRoots) };
  for (const key of Object.keys(prev.aptitudes) as (keyof Aptitudes)[]) {
    if (locks.has(`apt:${key}` as LockableKey)) aptitudes[key] = prev.aptitudes[key];
  }

  const mood   = locks.has('mood')   ? prev.mood   : randInt(50, 90);
  const health = locks.has('health') ? prev.health  : randInt(80, 100);

  return { spiritRoots: newSpiritRoots, luck, comprehension, charisma, aptitudes, mood, health };
}

function valColor(v: number): string {
  return v >= 80 ? '#FFD700' : v >= 60 ? '#4CAF50' : v >= 40 ? '#2196F3' : '#9E9E9E';
}

function LockButton({ lockKey, locks, onToggle }: {
  lockKey: LockableKey;
  locks: Set<LockableKey>;
  onToggle: (k: LockableKey) => void;
}) {
  const isLocked = locks.has(lockKey);
  const canLock = isLocked || locks.size < MAX_LOCKS;
  return (
    <button
      className={`reroll-lock-btn ${isLocked ? 'reroll-lock-btn-locked' : ''}`}
      onClick={() => onToggle(lockKey)}
      disabled={!canLock}
      title={isLocked ? '点击解锁' : canLock ? '点击锁定' : '锁已用完'}
    >
      {isLocked ? '🔒' : '🔓'}
    </button>
  );
}

export default function RerollModal({ preview, onConfirm, onClose }: RerollModalProps) {
  const [local, setLocal] = useState<PreviewRoll>(() => ({ ...preview }));
  const [locks, setLocks] = useState<Set<LockableKey>>(new Set());

  const toggleLock = useCallback((key: LockableKey) => {
    setLocks(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else if (next.size < MAX_LOCKS) {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleReroll = () => {
    setLocal(prev => rerollWithLocks(prev, locks));
  };

  const { spiritRoots } = local;
  const comboColor = COMBO_COLORS[spiritRoots.combo] ?? '#fff';
  const comboCN = COMBO_CN[spiritRoots.combo] ?? spiritRoots.combo;
  const mult = MULT_MAP[spiritRoots.combo] ?? spiritRoots.cultivationMultiplier;

  return (
    <FloatingPanel title="随机属性" icon="🎲" onClose={onClose} width={420}>
      <div className="reroll-body">
        {/* ── 灵根 ── */}
        <div className="reroll-section">
          <div className="reroll-section-title">灵根</div>
          <div className="reroll-row reroll-row-combo">
            <span className="reroll-row-label">灵根组合</span>
            <span className="combo-badge-sm" style={{ color: comboColor, borderColor: comboColor }}>
              {comboCN}
            </span>
            <span className="reroll-mult">×{mult}</span>
            <LockButton lockKey="spiritRoots" locks={locks} onToggle={toggleLock} />
          </div>
          {spiritRoots.roots.length === 0 ? (
            <div className="reroll-row reroll-row-empty">
              <span />
              <span className="root-list-empty">无灵根之体</span>
            </div>
          ) : (
            spiritRoots.roots.map(root => (
              <div key={root.type} className="reroll-row">
                <span className="reroll-row-label">
                  <span className="root-icon-sm">{SPIRIT_ROOT_ICONS[root.type]}</span>
                  <span style={{ color: SPIRIT_ROOT_COLORS[root.type] }}>{SPIRIT_ROOT_CN[root.type]}灵根</span>
                </span>
                <div className="reroll-bar">
                  <div className="reroll-bar-fill" style={{ width: `${root.affinity}%`, backgroundColor: SPIRIT_ROOT_COLORS[root.type] }} />
                </div>
                <span className="reroll-val">{root.affinity}</span>
                <LockButton lockKey={`root:${root.type}` as LockableKey} locks={locks} onToggle={toggleLock} />
              </div>
            ))
          )}
        </div>

        {/* ── 先天属性 ── */}
        <div className="reroll-section">
          <div className="reroll-section-title">先天属性</div>
          {([['luck', '运气', local.luck], ['comprehension', '悟性', local.comprehension], ['charisma', '魅力', local.charisma]] as [LockableKey, string, number][]).map(([key, label, val]) => (
            <div key={key} className="reroll-row">
              <span className="reroll-row-label">{label}</span>
              <div className="reroll-bar">
                <div className="reroll-bar-fill" style={{ width: `${val}%`, backgroundColor: valColor(val) }} />
              </div>
              <span className="reroll-val" style={{ color: valColor(val) }}>{val}</span>
              <LockButton lockKey={key} locks={locks} onToggle={toggleLock} />
            </div>
          ))}
        </div>

        {/* ── 元素资质 ── */}
        <div className="reroll-section">
          <div className="reroll-section-title">元素资质</div>
          {APTITUDE_GROUPS.map(group => (
            <div key={group.label} className="reroll-apt-group">
              <div className="reroll-apt-group-label">{group.label}</div>
              <div className="reroll-apt-grid">
                {group.keys.map(key => {
                  const val = local.aptitudes[key];
                  return (
                    <div key={key} className="reroll-apt-cell">
                      <span className="reroll-apt-name">{APTITUDE_CN[key]}</span>
                      <div className="reroll-apt-bar">
                        <div className="reroll-apt-bar-fill" style={{ width: `${val}%`, backgroundColor: valColor(val) }} />
                      </div>
                      <span className="reroll-apt-val" style={{ color: valColor(val) }}>{val}</span>
                      <LockButton lockKey={`apt:${key}` as LockableKey} locks={locks} onToggle={toggleLock} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── 体质 ── */}
        <div className="reroll-section">
          <div className="reroll-section-title">体质</div>
          {([['mood', '心情', local.mood], ['health', '健康', local.health]] as [LockableKey, string, number][]).map(([key, label, val]) => (
            <div key={key} className="reroll-row">
              <span className="reroll-row-label">{label}</span>
              <div className="reroll-bar">
                <div className="reroll-bar-fill" style={{ width: `${val}%`, backgroundColor: valColor(val) }} />
              </div>
              <span className="reroll-val" style={{ color: valColor(val) }}>{val}</span>
              <LockButton lockKey={key} locks={locks} onToggle={toggleLock} />
            </div>
          ))}
        </div>
      </div>

      {/* ── 底部操作 ── */}
      <div className="reroll-footer">
        <div className="reroll-lock-counter">
          剩余锁：{Array.from({ length: MAX_LOCKS }, (_, i) => (
            <span key={i} className={i < MAX_LOCKS - locks.size ? 'lock-icon-avail' : 'lock-icon-used'}>🔒</span>
          ))}
        </div>
        <div className="reroll-actions">
          <button className="btn btn-secondary" onClick={handleReroll}>🎲 重新随机</button>
          <button className="btn btn-primary" onClick={() => onConfirm(local)}>✅ 确认选择</button>
        </div>
      </div>
    </FloatingPanel>
  );
}
