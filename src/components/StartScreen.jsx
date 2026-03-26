// ============================================================
// StartScreen.jsx — 开始界面
// ============================================================

import { useState } from 'react';

export default function StartScreen({ onNewGame, onLoadGame, hasSave }) {
  const [name, setName] = useState('');

  const handleStart = () => {
    const finalName = name.trim() || '无名散修';
    onNewGame(finalName);
  };

  return (
    <div className="start-screen">
      <h1 className="game-title">🏔️ 修仙之路</h1>
      <p className="subtitle">踏入修仙世界，逆天改命</p>

      <div className="start-form">
        <label>道号：</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="请输入道号（留空随机）"
          maxLength={10}
          onKeyDown={(e) => e.key === 'Enter' && handleStart()}
        />
        <button className="btn btn-primary" onClick={handleStart}>
          开始修炼
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
