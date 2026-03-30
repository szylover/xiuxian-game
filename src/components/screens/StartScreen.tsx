// ============================================================
// StartScreen.tsx — 开始界面（T0056: 三步建角色）
// ============================================================

import { useState } from 'react';
import type { CreatePlayerOptions } from '../../game/player';
import { rollSpiritRoots } from '../../game/spirit-root';
import type { PlayerSpiritRoots } from '../../game/spirit-root';
import { SPIRIT_ROOT_CN, SPIRIT_ROOT_COLORS, SPIRIT_ROOT_ICONS, COMBO_CN } from '../shared/constants';

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

export default function StartScreen({ onNewGame, onLoadGame, hasSave }: StartScreenProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [appearance, setAppearance] = useState(0);
  const [spiritRoots, setSpiritRoots] = useState<PlayerSpiritRoots>(() => rollSpiritRoots());
  const [freeRerolls, setFreeRerolls] = useState(3);

  const handleGenderChange = (g: 'male' | 'female') => {
    setGender(g);
    setAppearance(0);
  };

  const handleReroll = () => {
    if (freeRerolls > 0) {
      setSpiritRoots(rollSpiritRoots());
      setFreeRerolls(prev => prev - 1);
    }
  };

  const handleConfirm = () => {
    const finalName = name.trim() || '无名散修';
    onNewGame({ name: finalName, gender, appearance, spiritRoots });
  };

  // ── 第一步：基本信息 ──
  if (step === 1) {
    return (
      <div className="start-screen">
        <h1 className="game-title">🏔️ 修仙之路</h1>
        <p className="subtitle">踏入修仙世界，逆天改命</p>
        <div className="start-form">
          <div className="form-row">
            <label>道号：</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="请输入道号（留空随机）"
              maxLength={10}
              onKeyDown={e => e.key === 'Enter' && setStep(2)}
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
          <button className="btn btn-primary" onClick={() => setStep(2)}>
            下一步：测算灵根 →
          </button>
          {hasSave && (
            <button className="btn btn-secondary" onClick={onLoadGame}>
              继续修炼
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── 第二步：灵根测算结果 ──
  const comboColor = COMBO_COLORS[spiritRoots.combo] ?? '#fff';
  const comboCN = COMBO_CN[spiritRoots.combo] ?? spiritRoots.combo;
  const mult = MULT_MAP[spiritRoots.combo] ?? spiritRoots.cultivationMultiplier;

  return (
    <div className="start-screen">
      <h1 className="game-title">🏔️ 修仙之路</h1>
      <p className="subtitle">灵根测算结果</p>
      <div className="start-form spirit-result">
        {/* 角色预览 */}
        <div className="char-preview">
          <img
            src={`/avatars/${gender}-${appearance}.svg`}
            onError={e => { (e.target as HTMLImageElement).src = '/avatars/default.svg'; }}
            alt="头像"
            width={80}
            height={80}
            className="preview-avatar"
          />
          <div className="char-name">
            {name.trim() || '无名散修'} · {gender === 'male' ? '男修' : '女修'}
          </div>
        </div>

        {/* 灵根展示 */}
        <div className="spirit-root-display">
          <div className="combo-badge" style={{ color: comboColor, borderColor: comboColor }}>
            {comboCN}
          </div>
          <div className="cultivation-mult">修炼速度 ×{mult}</div>

          {spiritRoots.roots.length === 0 ? (
            <div className="root-list-empty">
              无灵根之体，走上体修之路亦未尝不可…
            </div>
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
                      style={{
                        width: `${root.affinity}%`,
                        backgroundColor: SPIRIT_ROOT_COLORS[root.type],
                      }}
                    />
                  </div>
                  <span className="root-affinity-val">亲和度 {root.affinity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 重掷区 */}
        <div className="reroll-area">
          {freeRerolls > 0 ? (
            <button className="btn btn-secondary" onClick={handleReroll}>
              🎲 重新随机（剩余 {freeRerolls} 次）
            </button>
          ) : (
            <div className="no-reroll">免费重随次数已用尽</div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={() => setStep(1)}>
            ← 返回
          </button>
          <button className="btn btn-primary" onClick={handleConfirm}>
            ✨ 开始修炼
          </button>
        </div>
      </div>
    </div>
  );
}

