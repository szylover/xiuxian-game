// ============================================================
// debug/DebugStatsTab.tsx — 调试面板「数值」标签页
// ============================================================

import type { Player } from '../../game/player';
import { REALMS } from '../../game/data';
import { getAllBodyRealmDefs, getAllRegions } from '../../game/registry';
import { getMapState } from '../../game/map';

// 可编辑数值行：显示当前值 + 快捷递增按钮
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

// 所有可编辑属性 + 快捷递增值
const STAT_FIELDS: { label: string; key: string; deltas: number[] }[] = [
  { label: '💰 灵石', key: 'gold', deltas: [100, 1000, 10000] },
  { label: '📈 修为', key: 'exp', deltas: [500, 5000, 50000] },
  { label: '❤️ 体力', key: 'hp', deltas: [100, 500] },
  { label: '❤️ 体力上限', key: 'maxHp', deltas: [100, 500] },
  { label: '🔮 灵力', key: 'mp', deltas: [50, 200] },
  { label: '🔮 灵力上限', key: 'maxMp', deltas: [50, 200] },
  { label: '⚡ 精力', key: 'stamina', deltas: [30, 100] },
  { label: '⭐ 精力上限', key: 'maxStamina', deltas: [30, 100] },
  { label: '🧠 念力', key: 'mentalPower', deltas: [20, 100] },
  { label: '🧠 念力上限', key: 'maxMentalPower', deltas: [20, 100] },
  { label: '😊 心情', key: 'mood', deltas: [20, 50] },
  { label: '💚 健康', key: 'health', deltas: [20, 50] },
  { label: '🗡️ 攻击', key: 'atk', deltas: [10, 50, 200] },
  { label: '🛡️ 防御', key: 'def', deltas: [10, 50, 200] },
  { label: '👟 速度', key: 'speed', deltas: [5, 20] },
  { label: '💨 移速', key: 'moveSpeed', deltas: [5, 20] },
  { label: '💥 暴击率', key: 'critRate', deltas: [5, 10] },
  { label: '🛑 暴击抗', key: 'critResist', deltas: [5, 10] },
  { label: '🍀 幸运', key: 'luck', deltas: [10, 30] },
  { label: '🧠 悟性', key: 'comprehension', deltas: [10, 30] },
  { label: '💫 魅力', key: 'charisma', deltas: [10, 30] },
  { label: '📅 年龄', key: 'age', deltas: [10, 50] },
  { label: '📅 寿限', key: 'lifespan', deltas: [100, 500, 2000] },
  { label: '🎒 背包容量', key: 'inventoryCapacity', deltas: [5, 20, 50] },
  // T0062 体修
  { label: '💪 体魄', key: 'physique', deltas: [50, 200, 1000] },
  { label: '💪 体魄上限', key: 'maxPhysique', deltas: [100, 500] },
  { label: '📈 体修修为', key: 'bodyRealmExp', deltas: [100, 1000, 10000] },
  { label: '🛡️ 体魄减伤%', key: 'physiqueDmgReduce', deltas: [5, 10] },
];

interface DebugStatsTabProps {
  player: Player;
  onSetStat: (key: string, value: number) => void;
  onFullRestore: () => void;
  onDebugTravel?: (regionId: string) => void;
}

export default function DebugStatsTab({ player, onSetStat, onFullRestore, onDebugTravel }: DebugStatsTabProps) {
  return (
    <div className="debug-stats">
      {/* 境界 */}
      <div className="debug-row">
        <span className="debug-label">🏔️ 境界</span>
        <div className="debug-btns">
          {REALMS.map((r, i) => (
            <button
              key={i}
              className={`btn debug-btn ${player.realmIndex === i ? 'debug-active' : ''}`}
              onClick={() => onSetStat('realmIndex', i)}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {/* 体修境界（T0062） */}
      <div className="debug-row">
        <span className="debug-label">💪 体修境界</span>
        <div className="debug-btns">
          {getAllBodyRealmDefs().map((r) => (
            <button
              key={r.index}
              className={`btn debug-btn ${player.bodyRealmIndex === r.index ? 'debug-active' : ''}`}
              onClick={() => onSetStat('bodyRealmIndex', r.index)}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {/* 区域传送（T0021） */}
      {onDebugTravel && (
        <div className="debug-row">
          <span className="debug-label">📍 当前区域</span>
          <div className="debug-btns">
            {getAllRegions().sort((a, b) => a.minRealm - b.minRealm).map((r) => {
              const mapState = getMapState(player);
              const isCurrent = mapState.currentRegionId === r.id;
              return (
                <button
                  key={r.id}
                  className={`btn debug-btn ${isCurrent ? 'debug-active' : ''}`}
                  onClick={() => onDebugTravel(r.id)}
                >
                  {r.emoji} {r.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 全满 */}
      <div className="debug-row">
        <button className="btn debug-btn debug-full" onClick={onFullRestore}>
          🌟 全满
        </button>
      </div>

      {/* 所有数值 */}
      {STAT_FIELDS.map(({ label, key, deltas }) => (
        <StatEditor
          key={key}
          label={label}
          value={(player as unknown as Record<string, number>)[key] ?? 0}
          deltas={deltas}
          onChange={v => onSetStat(key, v)}
        />
      ))}
    </div>
  );
}
