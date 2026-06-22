// ============================================================
// debug/DebugStatsTab.tsx — 调试面板「数值」标签页
// 多栏布局 + 分组 + 战斗追踪
// ============================================================

import type { Player } from '../../game/player';
import { REALMS } from '../../game/data';
import { getAllBodyRealmDefs, getAllRegions, getMaxRealmIndex, getAscensionForRealm } from '../../game/registry';
import { getMapState } from '../../game/map';
import { getAscensionState } from '../../game/ascension';
import { getDestinyTalentState } from '../../game/destiny';
import { getBountyState } from '../../game/bounty';
import { getSecretRealmState } from '../../game/secret-realm';
import { DESTINY_TEXTS, UI_LABELS } from '../../data/texts';
import './DebugStatsTab.css';

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
  return <div className="debug-section-heading">{children}</div>;
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
  return (
    <div className="debug-stats">
      {/* ── 快捷控制区 ── */}
      <div className="debug-realm-group">
        <span className="debug-label debug-realm-label">🏔️ 境界</span>
        {REALMS.map((r, i) => (
          <button key={i} className={`btn debug-btn debug-btn-sm ${player.realmIndex === i ? 'debug-active' : ''}`}
            onClick={() => onSetStat('realmIndex', i)}>{r.name}</button>
        ))}
      </div>

      <div className="debug-realm-group">
        <span className="debug-label debug-realm-label">💪 体修境界</span>
        {getAllBodyRealmDefs().map((r) => (
          <button key={r.index} className={`btn debug-btn debug-btn-sm ${player.bodyRealmIndex === r.index ? 'debug-active' : ''}`}
            onClick={() => onSetStat('bodyRealmIndex', r.index)}>{r.name}</button>
        ))}
      </div>

      {onDebugTravel && (
        <div className="debug-realm-group">
          <span className="debug-label debug-realm-label">📍 当前区域</span>
          {getAllRegions().sort((a, b) => a.minRealm - b.minRealm).map((r) => {
            const isCurrent = getMapState(player).currentRegionId === r.id;
            return (
              <button key={r.id} className={`btn debug-btn debug-btn-sm ${isCurrent ? 'debug-active' : ''}`}
                onClick={() => onDebugTravel(r.id)}>{r.emoji} {r.name}</button>
            );
          })}
        </div>
      )}

      <div className="debug-row">
        <button className="btn debug-btn debug-full" onClick={onFullRestore}>🌟 全满</button>
      </div>

      <div className="debug-tracker-box">
        <span className="debug-label debug-tracker-label">{UI_LABELS.debugBountyRealm.title}</span>
        <div className="debug-tracker-grid">
          <div className="debug-tracker-dim">{UI_LABELS.debugBountyRealm.bountyReputation(getBountyState(player).reputation)}</div>
          <div className="debug-tracker-dim">{UI_LABELS.debugBountyRealm.realmCooldowns(Object.keys(getSecretRealmState(player).cooldowns).length)}</div>
        </div>
        <div className="debug-btns debug-btns-wrap">
          <button className="btn debug-btn debug-btn-sm" onClick={() => onSetStat('__bountyReputation', getBountyState(player).reputation + 20)}>{UI_LABELS.debugBountyRealm.addBountyReputation}</button>
          <button className="btn debug-btn debug-btn-sm" onClick={() => onSetStat('__secretRealmClearCooldown', 1)}>{UI_LABELS.debugBountyRealm.clearRealmCooldown}</button>
        </div>
      </div>

      {/* ── T0033: 飞升调试 ── */}
      {(() => {
        const ascState = getAscensionState(player);
        const maxIdx = getMaxRealmIndex();
        const ascDef = getAscensionForRealm(player.realmIndex);
        return (
          <div className="debug-tracker-box">
            <span className="debug-label debug-tracker-label">✨ 飞升调试</span>
            <div className="debug-tracker-grid">
              <div className="debug-tracker-dim">阶层: {ascState.currentTier} | 已飞升: {ascState.hasAscended ? '是' : '否'} | 失败: {ascState.ascensionFailCount}</div>
            </div>
            <div className="debug-btns" style={{ marginTop: '4px' }}>
              {maxIdx >= 7 && (
                <button className="btn debug-btn debug-btn-sm" onClick={() => {
                  onSetStat('realmIndex', 7);
                  if (ascDef) onSetStat('exp', ascDef.minExp);
                }}>设为大乘满修为</button>
              )}
              <button className="btn debug-btn debug-btn-sm" onClick={() => {
                const death = (player.systems.death ?? {}) as Record<string, unknown>;
                const isLI = !death.isLooseImmortal;
                onSetStat('__toggleLooseImmortal' as string, isLI ? 1 : 0);
              }}>切换散仙: {((player.systems.death ?? {}) as { isLooseImmortal?: boolean }).isLooseImmortal ? '是' : '否'}</button>
            </div>
          </div>
        );
      })()}

      <div className="debug-tracker-box">
        <span className="debug-label debug-tracker-label">{DESTINY_TEXTS.debug.title}</span>
        <div className="debug-tracker-grid">
          {(() => {
            const state = getDestinyTalentState(player);
            return <div className="debug-tracker-dim">{DESTINY_TEXTS.debug.summary(state.talentPoints, state.unlockedNodeIds.length)}</div>;
          })()}
        </div>
        <div className="debug-btns debug-btns-wrap">
          <button className="btn debug-btn debug-btn-sm" onClick={() => onSetStat('__destinyAddPoint', 1)}>{DESTINY_TEXTS.debug.addPoint}</button>
          <button className="btn debug-btn debug-btn-sm" onClick={() => onSetStat('__destinyUnlockAll', 1)}>{DESTINY_TEXTS.debug.unlockAll}</button>
          <button className="btn debug-btn debug-btn-sm" onClick={() => onSetStat('__destinyReset', 1)}>{DESTINY_TEXTS.debug.reset}</button>
        </div>
      </div>

      {/* ── 战斗追踪 ── */}
      <div className="debug-tracker-box">
        <span className="debug-label debug-tracker-label">⚔️ 战斗追踪</span>
        <div className="debug-tracker-grid">
          <div className="debug-tracker-cell">
            <span className="debug-tracker-stat">击杀: <strong>{player.tracking.killCount}</strong></span>
            {[10, 50].map(d => (
              <button key={d} className="btn debug-btn debug-btn-tiny"
                onClick={() => onSetTracking?.('killCount', player.tracking.killCount + d)}>+{d}</button>
            ))}
          </div>
          <div className="debug-tracker-cell">
            <span className="debug-tracker-stat">Boss: <strong>{player.tracking.bossKillCount}</strong></span>
            {[5, 10].map(d => (
              <button key={d} className="btn debug-btn debug-btn-tiny"
                onClick={() => onSetTracking?.('bossKillCount', player.tracking.bossKillCount + d)}>+{d}</button>
            ))}
          </div>
          <div className="debug-tracker-dim">连续修炼: {player.tracking.consecutiveCultivates}</div>
          <div className="debug-tracker-dim">突破失败: {player.tracking.consecutiveBreakthroughFails}</div>
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
