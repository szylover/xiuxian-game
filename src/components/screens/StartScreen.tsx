// ============================================================
// StartScreen.tsx — 开始界面（T0038: 多存档 + T0063: 基本信息 + 随机角色弹窗）
// ============================================================

import { useState } from 'react';
import type { CreatePlayerOptions } from '../../game/player';
import { rollPreview } from '../../game/player/create';
import type { PreviewRoll } from '../../game/player/create';
import { ALL_DLCS } from '../../data/dlc';
import RerollModal from './RerollModal';
import SaveManagerPanel from './SaveManagerPanel';

interface StartScreenProps {
  onNewGame: (options: CreatePlayerOptions & { slotIndex?: number }) => void;
  onLoadGame: (slotIndex: number) => void;
  dataReady: boolean;
  dataError?: boolean;
}

export default function StartScreen({ onNewGame, onLoadGame, dataReady, dataError }: StartScreenProps) {
  const [view, setView] = useState<'slots' | 'create'>('slots');
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [appearance, setAppearance] = useState(0);
  const [preview, setPreview] = useState<PreviewRoll>(() => rollPreview());
  const [showReroll, setShowReroll] = useState(false);
  const [enabledDLCs, setEnabledDLCs] = useState<Set<string>>(() =>
    new Set(ALL_DLCS.filter(d => d.required).map(d => d.id))
  );

  const toggleDLC = (id: string) => {
    setEnabledDLCs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const optionalDLCs = ALL_DLCS.filter(d => !d.required);

  const handleGenderChange = (g: 'male' | 'female') => {
    setGender(g);
    setAppearance(0);
  };

  const handleConfirm = () => {
    const finalName = name.trim() || '无名散修';
    onNewGame({ name: finalName, gender, appearance, preview, slotIndex: selectedSlot });
  };

  const handleNewGameSlot = (slotIndex: number) => {
    setSelectedSlot(slotIndex);
    setView('create');
  };

  if (view === 'create') {
    return (
      <div className="start-screen">
        <h1 className="game-title">🏔️ 修仙之路</h1>
        <p className="subtitle">踏入修仙世界，逆天改命</p>

        <div className="start-form start-form-centered">
          <div className="save-slot-indicator">存档槽 {selectedSlot + 1}</div>

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

          {/* ── DLC 内容包选择 ── */}
          {optionalDLCs.length > 0 && (
            <div className="dlc-selector">
              <div className="dlc-selector-title">📦 内容包</div>
              {optionalDLCs.map(dlc => (
                <label key={dlc.id} className="dlc-option">
                  <input
                    type="checkbox"
                    checked={enabledDLCs.has(dlc.id)}
                    onChange={() => toggleDLC(dlc.id)}
                  />
                  <span className="dlc-option-name">{dlc.name}</span>
                  <span className="dlc-option-desc">{dlc.description}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* ── 操作按钮 ── */}
        <div className="form-actions create-char-actions">
          <button className="btn btn-primary" onClick={handleConfirm} disabled={!dataReady}>
            {dataError ? '⚠️ 数据加载失败' : dataReady ? '✨ 开始修炼' : '⏳ 加载中…'}
          </button>
          <button className="btn btn-secondary" onClick={() => setView('slots')}>
            ← 返回
          </button>
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

  return (
    <div className="start-screen">
      <h1 className="game-title">🏔️ 修仙之路</h1>
      <p className="subtitle">踏入修仙世界，逆天改命</p>
      <SaveManagerPanel
        onNewGame={handleNewGameSlot}
        onLoadGame={onLoadGame}
        dataReady={dataReady}
        dataError={dataError}
      />
    </div>
  );
}
