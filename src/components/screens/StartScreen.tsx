// ============================================================
// StartScreen.tsx — 开始界面（单页建角色：基本信息 + 天赋预览）
// ============================================================

import { useState } from 'react';
import type { CreatePlayerOptions } from '../../game/player';
import { rollPreview, rollAptitudesWithSpiritRoots, rollInnateAttr, randInt } from '../../game/player/create';
import { rollSpiritRoots } from '../../game/spirit-root';
import type { PreviewRoll } from '../../game/player/create';
import type { Aptitudes } from '../../game/player/types';
import { SPIRIT_ROOT_CN, SPIRIT_ROOT_COLORS, SPIRIT_ROOT_ICONS, COMBO_CN, APTITUDE_CN } from '../shared/constants';

interface StartScreenProps {
  onNewGame: (options: CreatePlayerOptions) => void;
  onLoadGame: () => void;
  hasSave: boolean;
}

const COMBO_COLORS: Record<string, string> = {
  none:   '#9E9E9E',
  single: '#FFD700',
  dual:   '#FF5722',
  triple: '#9C27B0',
  quad:   '#4CAF50',
  penta:  '#607D8B',
};

const MULT_MAP: Record<string, number> = {
  none: 0.1, single: 3.0, dual: 2.0, triple: 1.2, quad: 0.8, penta: 0.5,
};

type CreationSlot = 'spiritRoots' | 'innateStats' | 'aptitudes' | 'constitution';
const TOTAL_LOCKS = 3;

function InnateBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? '#FFD700' : value >= 60 ? '#4CAF50' : value >= 40 ? '#2196F3' : '#9E9E9E';
  return (
    <div className="innate-row">
      <span className="innate-label">{label}</span>
      <div className="innate-bar">
        <div className="innate-fill" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="innate-val">{value}</span>
    </div>
  );
}

const APTITUDE_GROUPS: { label: string; keys: (keyof Aptitudes)[] }[] = [
  { label: '元素', keys: ['fire', 'water', 'thunder', 'wind', 'earth', 'wood'] },
  { label: '武学', keys: ['blade', 'spear', 'sword', 'fist', 'palm', 'finger'] },
  { label: '功法', keys: ['alchemy', 'smithing', 'fengshui', 'mining'] },
];

function AptitudeGrid({ aptitudes }: { aptitudes: Aptitudes }) {
  return (
    <div className="aptitude-groups">
      {APTITUDE_GROUPS.map(group => (
        <div key={group.label} className="aptitude-group">
          <div className="aptitude-group-label">{group.label}</div>
          <div className="aptitude-grid">
            {group.keys.map(key => {
              const val = aptitudes[key];
              const color = val >= 80 ? '#FFD700' : val >= 60 ? '#4CAF50' : val >= 40 ? '#2196F3' : '#9E9E9E';
              return (
                <div key={key} className="aptitude-cell">
                  <span className="aptitude-name">{APTITUDE_CN[key]}</span>
                  <div className="aptitude-bar">
                    <div className="aptitude-fill" style={{ width: `${val}%`, backgroundColor: color }} />
                  </div>
                  <span className="aptitude-val" style={{ color }}>{val}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function SlotHeader({
  title, slot, lockedSlots, onToggle,
}: {
  title: string;
  slot: CreationSlot;
  lockedSlots: Set<CreationSlot>;
  onToggle: (slot: CreationSlot) => void;
}) {
  const isLocked = lockedSlots.has(slot);
  const canLock = isLocked || lockedSlots.size < TOTAL_LOCKS;
  return (
    <div className="slot-header">
      <span className="slot-title">{title}</span>
      <button
        className={`lock-btn ${isLocked ? 'lock-btn-locked' : 'lock-btn-unlocked'}`}
        onClick={() => onToggle(slot)}
        disabled={!canLock}
        title={isLocked ? '点击解锁' : canLock ? '点击锁定' : '锁已用完'}
      >
        {isLocked ? '🔒' : '🔓'}
      </button>
    </div>
  );
}

export default function StartScreen({ onNewGame, onLoadGame, hasSave }: StartScreenProps) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [appearance, setAppearance] = useState(0);
  const [preview, setPreview] = useState<PreviewRoll>(() => rollPreview());
  const [lockedSlots, setLockedSlots] = useState<Set<CreationSlot>>(new Set());

  const locksUsed = lockedSlots.size;
  const locksRemaining = TOTAL_LOCKS - locksUsed;

  const toggleLock = (slot: CreationSlot) => {
    setLockedSlots(prev => {
      const next = new Set(prev);
      if (next.has(slot)) {
        next.delete(slot);
      } else if (next.size < TOTAL_LOCKS) {
        next.add(slot);
      }
      return next;
    });
  };

  const handleGenderChange = (g: 'male' | 'female') => {
    setGender(g);
    setAppearance(0);
  };

  const handleReroll = () => {
    setPreview(prev => {
      const newSpiritRoots = lockedSlots.has('spiritRoots') ? prev.spiritRoots : rollSpiritRoots();
      const newAptitudes = lockedSlots.has('aptitudes')
        ? prev.aptitudes
        : rollAptitudesWithSpiritRoots(newSpiritRoots);
      return {
        spiritRoots: newSpiritRoots,
        luck:          lockedSlots.has('innateStats')  ? prev.luck          : rollInnateAttr(),
        comprehension: lockedSlots.has('innateStats')  ? prev.comprehension : rollInnateAttr(),
        charisma:      lockedSlots.has('innateStats')  ? prev.charisma      : rollInnateAttr(),
        aptitudes:     newAptitudes,
        mood:          lockedSlots.has('constitution') ? prev.mood          : randInt(50, 90),
        health:        lockedSlots.has('constitution') ? prev.health        : randInt(80, 100),
      };
    });
  };

  const handleConfirm = () => {
    const finalName = name.trim() || '无名散修';
    onNewGame({ name: finalName, gender, appearance, preview });
  };

  const { spiritRoots } = preview;
  const comboColor = COMBO_COLORS[spiritRoots.combo] ?? '#fff';
  const comboCN = COMBO_CN[spiritRoots.combo] ?? spiritRoots.combo;
  const mult = MULT_MAP[spiritRoots.combo] ?? spiritRoots.cultivationMultiplier;

  return (
    <div className="start-screen">
      <h1 className="game-title">🏔️ 修仙之路</h1>
      <p className="subtitle">踏入修仙世界，逆天改命</p>

      <div className="start-form create-char-form">
        {/* ── 基本信息 ── */}
        <div className="create-char-left">
          <div className="form-row">
            <label>道号：</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="留空则为无名散修"
              maxLength={10}
            />
          </div>
          <div className="form-row gender-row">
            <label>性别：</label>
            <div className="gender-btns">
              <button
                className={`btn ${gender === 'male' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleGenderChange('male')}
              >♂ 男修</button>
              <button
                className={`btn ${gender === 'female' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleGenderChange('female')}
              >♀ 女修</button>
            </div>
          </div>
          <div className="form-row avatar-row">
            <label>外貌：</label>
            <div className="avatar-selector">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className={`avatar-option ${appearance === i ? 'selected' : ''}`}
                  onClick={() => setAppearance(i)}
                >
                  <img
                    src={`/avatars/${gender}-${i}.svg`}
                    onError={e => { (e.target as HTMLImageElement).src = '/avatars/default.svg'; }}
                    alt={`头像${i + 1}`}
                    width={60}
                    height={60}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── 锁资源指示 ── */}
          <div className="lock-counter">
            <span className="lock-counter-label">剩余锁：</span>
            {Array.from({ length: TOTAL_LOCKS }, (_, i) => (
              <span key={i} className={i < locksRemaining ? 'lock-icon-avail' : 'lock-icon-used'}>🔒</span>
            ))}
          </div>
        </div>

        {/* ── 天赋预览 ── */}
        <div className="create-char-right">
          <div className="talent-section-title">✨ 角色天赋</div>

          {/* 灵根 */}
          <div className="innate-attrs">
            <SlotHeader title="灵根" slot="spiritRoots" lockedSlots={lockedSlots} onToggle={toggleLock} />
            <div className="spirit-root-display-inline">
              <div className="combo-badge" style={{ color: comboColor, borderColor: comboColor }}>
                {comboCN}
              </div>
              <div className="cultivation-mult">修炼速度 ×{mult}</div>
              {spiritRoots.roots.length === 0 ? (
                <div className="root-list-empty">无灵根之体</div>
              ) : (
                <div className="root-list">
                  {spiritRoots.roots.map(root => (
                    <div
                      key={root.type}
                      className="root-item"
                      style={{ borderColor: SPIRIT_ROOT_COLORS[root.type] }}
                    >
                      <span className="root-icon">{SPIRIT_ROOT_ICONS[root.type]}</span>
                      <span className="root-name" style={{ color: SPIRIT_ROOT_COLORS[root.type] }}>
                        {SPIRIT_ROOT_CN[root.type]}灵根
                      </span>
                      <div className="root-affinity-bar">
                        <div
                          className="root-affinity-fill"
                          style={{ width: `${root.affinity}%`, backgroundColor: SPIRIT_ROOT_COLORS[root.type] }}
                        />
                      </div>
                      <span className="root-affinity-val">亲和度 {root.affinity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 先天属性 */}
          <div className="innate-attrs">
            <SlotHeader title="先天属性" slot="innateStats" lockedSlots={lockedSlots} onToggle={toggleLock} />
            <InnateBar label="运气" value={preview.luck} />
            <InnateBar label="悟性" value={preview.comprehension} />
            <InnateBar label="魅力" value={preview.charisma} />
          </div>

          {/* 元素资质 */}
          <div className="innate-attrs">
            <SlotHeader title="元素资质" slot="aptitudes" lockedSlots={lockedSlots} onToggle={toggleLock} />
            <AptitudeGrid aptitudes={preview.aptitudes} />
          </div>

          {/* 体质 */}
          <div className="innate-attrs">
            <SlotHeader title="体质" slot="constitution" lockedSlots={lockedSlots} onToggle={toggleLock} />
            <InnateBar label="心情" value={preview.mood} />
            <InnateBar label="健康" value={preview.health} />
          </div>
        </div>
      </div>

      {/* ── 操作按钮 ── */}
      <div className="form-actions create-char-actions">
        <button className="btn btn-secondary" onClick={handleReroll}>
          🎲 重新随机
        </button>
        <button className="btn btn-primary" onClick={handleConfirm}>
          ✨ 开始修炼
        </button>
      </div>

      {hasSave && (
        <button className="btn btn-secondary" onClick={onLoadGame}>
          继续修炼
        </button>
      )}
    </div>
  );
}

