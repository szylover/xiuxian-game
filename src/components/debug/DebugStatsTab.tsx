// ============================================================
// debug/DebugStatsTab.tsx — 调试面板「数值」标签页
// 多栏布局 + 分组 + 战斗追踪
// ============================================================

import type { Player } from '../../game/player';
import { REALMS } from '../../game/data';
import { getAllBodyRealmDefs, getAllRegions } from '../../game/registry';
import { getMapState } from '../../game/map';

// 可编辑数值行
function StatEditor({ label, value, deltas, onChange }: { label: string; value: number; deltas: number[]; onChange: (v: number) => void }) {
  return (
    <div className="debug-row">
      <span className="debug-label">{label}: <strong>{value}</strong></span>
      <div className="debug-btns">
        {deltas.map(d => (
          <button key={d} className="btn debug-btn" onClick={() => onChange(value + d)}>+{d}</button>
        ))}
        <input
          type="number"
          className="debug-input-sm"
          placeholder="="
          onKeyDown={e => { if (e.key === 'Enter') onChange(Number((e.target as HTMLInputElement).value) || 0); }}
          onBlur={e => { const v = Number(e.target.value); if (v || v === 0) onChange(v); }}
        />
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.7rem', color: '#888', marginTop: 6, marginBottom: 2, fontWeight: 'bold', borderBottom: '1px solid #333', paddingBottom: 2 }}>{children}</div>;
}

const RESOURCE_FIELDS = [
  { label: '💰 灵石', key: 'gold', deltas: [100, 1000, 10000] },
  { label: '📈 修为', key: 'exp', deltas: [500, 5000, 50000] },
  { label: '📈 体修修为', key: 'bodyRealmExp', deltas: [100, 1000, 10000] },
];

const VITAL_FIELDS = [
  { label: '❤️ 体力', key: 'hp', deltas: [100, 500] },
  { label: '❤️ 上限', key: 'maxHp', deltas: [100, 500] },
  { label: '🔮 灵力', key: 'mp', deltas: [50, 200] },
  { label: '🔮 上限', key: 'maxMp', deltas: [50, 200] },
  { label: '⚡ 精力', key: 'stamina', deltas: [30, 100] },
  { label: '⭐ 上限', key: 'maxStamina', deltas: [30, 100] },
  { label: '🧠 念力', key: 'mentalPower', deltas: [20, 100] },
  { label: '😊 心情', key: 'mood', deltas: [20, 50] },
  { label: '💚 健康', key: 'health', deltas: [20, 50] },
];

const COMBAT_FIELDS = [
  { label: '🗡️ 攻击', key: 'atk', deltas: [10, 50, 200] },
  { label: '🛡️ 防御', key: 'def', deltas: [10, 50, 200] },
  { label: '👟 速度', key: 'speed', deltas: [5, 20] },
  { label: '💨 移速', key: 'moveSpeed', deltas: [5, 20] },
  { label: '💥 暴击', key: 'critRate', deltas: [5, 10] },
  { label: '🛑 暴抗', key: 'critResist', deltas: [5, 10] },
];

const OTHER_FIELDS = [
  { label: '🍀 幸运', key: 'luck', deltas: [10, 30] },
  { label: '🧠 悟性', key: 'comprehension', deltas: [10, 30] },
  { label: '💫 魅力', key: 'charisma', deltas: [10, 30] },
  { label: '📅 年龄', key: 'age', deltas: [120, 600] },
  { label: '📅 寿限', key: 'lifespan', deltas: [1200, 6000, 24000] },
  { label: '🎒 背包', key: 'inventoryCapacity', deltas: [5, 20, 50] },
  { label: '💪 体魄', key: 'physique', deltas: [50, 200, 1000] },
  { label: '💪 上限', key: 'maxPhysique', deltas: [100, 500] },
  { label: '🛡️ 减伤%', key: 'physiqueDmgReduce', deltas: [5, 10] },
];

interface DebugStatsTabProps {
  player: Player;
  onSetStat: (key: string, value: number) => void;
  onFullRestore: () => void;
  onDebugTravel?: (regionId: string) => void;
  onSetTracking?: (key: string, value: number) => void;
}

export default function DebugStatsTab({ player, onSetStat, onFullRestore, onDebugTravel, onSetTracking }: DebugStatsTabProps) {
  const btnStyle = { padding: '2px 6px', fontSize: '0.7rem' } as const;
  const tinyBtnStyle = { padding: '1px 4px', fontSize: '0.65rem' } as const;

  return (
    <div className="debug-stats">
      {/* ── 快捷控制区 ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginBottom: 4 }}>
        <span className="debug-label" style={{ fontSize: '0.7rem', width: '100%' }}>🏔️ 境界</span>
        {REALMS.map((r, i) => (
          <button key={i} className={`btn debug-btn ${player.realmIndex === i ? 'debug-active' : ''}`}
            onClick={() => onSetStat('realmIndex', i)} style={btnStyle}>{r.name}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginBottom: 4 }}>
        <span className="debug-label" style={{ fontSize: '0.7rem', width: '100%' }}>💪 体修境界</span>
        {getAllBodyRealmDefs().map((r) => (
          <button key={r.index} className={`btn debug-btn ${player.bodyRealmIndex === r.index ? 'debug-active' : ''}`}
            onClick={() => onSetStat('bodyRealmIndex', r.index)} style={btnStyle}>{r.name}</button>
        ))}
      </div>

      {onDebugTravel && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginBottom: 4 }}>
          <span className="debug-label" style={{ fontSize: '0.7rem', width: '100%' }}>📍 当前区域</span>
          {getAllRegions().sort((a, b) => a.minRealm - b.minRealm).map((r) => {
            const isCurrent = getMapState(player).currentRegionId === r.id;
            return (
              <button key={r.id} className={`btn debug-btn ${isCurrent ? 'debug-active' : ''}`}
                onClick={() => onDebugTravel(r.id)} style={btnStyle}>{r.emoji} {r.name}</button>
            );
          })}
        </div>
      )}

      <div className="debug-row">
        <button className="btn debug-btn debug-full" onClick={onFullRestore}>🌟 全满</button>
      </div>

      {/* ── 战斗追踪 ── */}
      <div style={{ border: '1px solid #444', borderRadius: 4, padding: '6px 8px', margin: '4px 0', fontSize: '0.73rem' }}>
        <span className="debug-label" style={{ fontWeight: 'bold', fontSize: '0.7rem' }}>⚔️ 战斗追踪</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <span style={{ color: '#aaa', fontSize: '0.7rem' }}>击杀: <strong style={{ color: '#fff' }}>{player.tracking.killCount}</strong></span>
            {[10, 50].map(d => (
              <button key={d} className="btn debug-btn" style={tinyBtnStyle}
                onClick={() => onSetTracking?.('killCount', player.tracking.killCount + d)}>+{d}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <span style={{ color: '#aaa', fontSize: '0.7rem' }}>Boss: <strong style={{ color: '#fff' }}>{player.tracking.bossKillCount}</strong></span>
            {[5, 10].map(d => (
              <button key={d} className="btn debug-btn" style={tinyBtnStyle}
                onClick={() => onSetTracking?.('bossKillCount', player.tracking.bossKillCount + d)}>+{d}</button>
            ))}
          </div>
          <div style={{ color: '#777', fontSize: '0.65rem' }}>连续修炼: {player.tracking.consecutiveCultivates}</div>
          <div style={{ color: '#777', fontSize: '0.65rem' }}>突破失败: {player.tracking.consecutiveBreakthroughFails}</div>
        </div>
      </div>

      {/* ── 分组数值 ── */}
      <SectionTitle>💎 资源与修为</SectionTitle>
      {RESOURCE_FIELDS.map(f => <StatEditor key={f.key} label={f.label} value={(player as unknown as Record<string, number>)[f.key] ?? 0} deltas={f.deltas} onChange={v => onSetStat(f.key, v)} />)}

      <SectionTitle>❤️ 生命与状态</SectionTitle>
      {VITAL_FIELDS.map(f => <StatEditor key={f.key} label={f.label} value={(player as unknown as Record<string, number>)[f.key] ?? 0} deltas={f.deltas} onChange={v => onSetStat(f.key, v)} />)}

      <SectionTitle>⚔️ 战斗属性</SectionTitle>
      {COMBAT_FIELDS.map(f => <StatEditor key={f.key} label={f.label} value={(player as unknown as Record<string, number>)[f.key] ?? 0} deltas={f.deltas} onChange={v => onSetStat(f.key, v)} />)}

      <SectionTitle>📋 其他属性</SectionTitle>
      {OTHER_FIELDS.map(f => <StatEditor key={f.key} label={f.label} value={(player as unknown as Record<string, number>)[f.key] ?? 0} deltas={f.deltas} onChange={v => onSetStat(f.key, v)} />)}
    </div>
  );
}
