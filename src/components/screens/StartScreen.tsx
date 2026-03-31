// ============================================================
// StartScreen.tsx — 开始界面（T0063: 基本信息 + 随机角色弹窗）
// ============================================================

import { useState } from 'react';
import type { CreatePlayerOptions } from '../../game/player';
import { rollPreview } from '../../game/player/create';
import type { PreviewRoll } from '../../game/player/create';
import RerollModal from './RerollModal';

interface StartScreenProps {
  onNewGame: (options: CreatePlayerOptions) => void;
  onLoadGame: () => void;
  hasSave: boolean;
  dataReady: boolean;
  dataError?: boolean;
}

export default function StartScreen({ onNewGame, onLoadGame, hasSave, dataReady, dataError }: StartScreenProps) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [appearance, setAppearance] = useState(0);
  const [preview, setPreview] = useState<PreviewRoll>(() => rollPreview());
  const [showReroll, setShowReroll] = useState(false);

  const handleGenderChange = (g: 'male' | 'female') => {
    setGender(g);
    setAppearance(0);
  };

  const handleConfirm = () => {
    const finalName = name.trim() || '无名散修';
    onNewGame({ name: finalName, gender, appearance, preview });
  };

  return (
    <div className="start-screen">
      <h1 className="game-title">🏔️ 修仙之路</h1>
      <p className="subtitle">踏入修仙世界，逆天改命</p>

      <div className="start-form start-form-centered">
        {/* ── 基本信息 ── */}
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

        {/* ── 随机角色入口 ── */}
        <button className="btn btn-reroll" onClick={() => setShowReroll(true)}>
          🎲 随机属性
        </button>
      </div>

      {/* ── 操作按钮 ── */}
      <div className="form-actions create-char-actions">
        <button className="btn btn-primary" onClick={handleConfirm} disabled={!dataReady}>
          {dataError ? '⚠️ 数据加载失败' : dataReady ? '✨ 开始修炼' : '⏳ 加载中…'}
        </button>
        {hasSave && (
          <button className="btn btn-secondary" onClick={onLoadGame} disabled={!dataReady}>
            继续修炼
          </button>
        )}
      </div>

      {/* ── 随机角色浮动面板 ── */}
      {showReroll && (
        <RerollModal
          preview={preview}
          onConfirm={roll => { setPreview(roll); setShowReroll(false); }}
          onClose={() => setShowReroll(false)}
        />
      )}
    </div>
  );
}
