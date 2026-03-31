// ============================================================
// panels/DivineArtsPanel.tsx — 神通面板
// 已学神通 + 可学神通 + 当前激活标记
// ============================================================

import type { Player } from '../../game/player';
import type { DivineArtDef } from '../../game/types';
import { getAllDivineArtDefs } from '../../game/registry';
import {
  getDivineArtsState,
  ELEMENT_EMOJI,
  ELEMENT_CN,
  ELEMENT_COLOR,
} from '../../game/divine-arts';
import { REALMS } from '../../game/data';

interface DivineArtsPanelProps {
  player: Player;
  onLearn: (artId: string) => void;
  onActivate: (artId: string) => void;
}

export default function DivineArtsPanel({ player, onLearn, onActivate }: DivineArtsPanelProps) {
  const state = getDivineArtsState(player);
  const learnedIds = new Set(state.learned.map(s => s.artId));
  const allDefs = getAllDivineArtDefs();

  const learnedArts = allDefs.filter(d => learnedIds.has(d.id));
  const unlearnedArts = allDefs.filter(d => !learnedIds.has(d.id));

  const activeArtId = state.activeArtId;
  const activeArtDef = activeArtId ? allDefs.find(d => d.id === activeArtId) : null;

  return (
    <div className="technique-panel">
      {/* 当前激活神通 */}
      <div className="divine-active-header">
        <span className="divine-active-label">当前激活：</span>
        {activeArtDef ? (
          <span
            className="divine-active-name"
            style={{ color: ELEMENT_COLOR[activeArtDef.element] }}
          >
            {ELEMENT_EMOJI[activeArtDef.element]} 【{activeArtDef.name}】
            <span className="divine-active-element">
              {ELEMENT_CN[activeArtDef.element]}系
            </span>
          </span>
        ) : (
          <span className="divine-active-none">无（请激活一个神通）</span>
        )}
      </div>

      {/* 已学神通 */}
      <div className="technique-section-title">
        🌟 已学神通（{learnedArts.length}/{allDefs.length}）
      </div>
      {learnedArts.length === 0 ? (
        <div className="inventory-empty">尚未习得任何神通…</div>
      ) : (
        <div className="technique-list">
          {learnedArts.map(def => {
            const isActive = activeArtId === def.id;
            const aptitude = (player.aptitudes as unknown as Record<string, number>)[def.element] ?? 0;
            return (
              <DivineArtCard
                key={def.id}
                def={def}
                isActive={isActive}
                aptitude={aptitude}
                canActivate={!isActive}
                onActivate={() => onActivate(def.id)}
              />
            );
          })}
        </div>
      )}

      {/* 可学 / 锁定神通 */}
      {unlearnedArts.length > 0 && (
        <>
          <div className="technique-section-title" style={{ marginTop: '0.6rem' }}>
            📚 可学神通
          </div>
          <div className="technique-list">
            {unlearnedArts.map(def => {
              const check = checkLearnCondition(player, def);
              const aptitude = (player.aptitudes as unknown as Record<string, number>)[def.element] ?? 0;
              return (
                <UnlearnedDivineArtCard
                  key={def.id}
                  def={def}
                  aptitude={aptitude}
                  canLearn={check.canLearn}
                  reason={check.reason}
                  onLearn={() => onLearn(def.id)}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── 已学神通卡片 ──

interface DivineArtCardProps {
  def: DivineArtDef;
  isActive: boolean;
  aptitude: number;
  canActivate: boolean;
  onActivate: () => void;
}

function DivineArtCard({ def, isActive, aptitude, canActivate, onActivate }: DivineArtCardProps) {
  const color = ELEMENT_COLOR[def.element];
  const emoji = ELEMENT_EMOJI[def.element];
  const cn = ELEMENT_CN[def.element];

  return (
    <div
      className={`technique-card ${isActive ? 'technique-active' : ''}`}
      style={{ borderLeftColor: color }}
    >
      <div className="technique-header">
        <span className="technique-name" style={{ color }}>
          {emoji} {def.name}
        </span>
        <span className="technique-type" style={{ color }}>{cn}系</span>
        {isActive && <span className="technique-active-badge">✨ 已激活</span>}
      </div>
      <div className="technique-level">
        <span style={{ color: '#aaa' }}>
          MP: {def.mpCost} · CD: {def.cooldown}回合 · 触发率: {Math.round(def.triggerRate * 100)}%
        </span>
      </div>
      <div className="divine-aptitude-row">
        <span style={{ color: '#9E9E9E', fontSize: '0.78rem' }}>
          {cn}灵根资质：
          <strong style={{ color }}>{aptitude}</strong>
          {' '}（加成 ×{calcDisplayPower(aptitude, def).toFixed(2)}）
        </span>
      </div>
      <div className="technique-desc">{def.description}</div>
      {def.effects && def.effects.length > 0 && (
        <div className="divine-effects">
          {def.effects.map((eff, i) => (
            <span key={i} className="divine-effect-tag">
              {formatEffect(eff)}
            </span>
          ))}
        </div>
      )}
      <div className="technique-actions">
        {canActivate && (
          <button className="btn btn-technique-activate" onClick={onActivate}>
            ⚡ 激活
          </button>
        )}
      </div>
    </div>
  );
}

// ── 未学神通卡片 ──

interface UnlearnedDivineArtCardProps {
  def: DivineArtDef;
  aptitude: number;
  canLearn: boolean;
  reason: string;
  onLearn: () => void;
}

function UnlearnedDivineArtCard({ def, aptitude, canLearn, reason, onLearn }: UnlearnedDivineArtCardProps) {
  const color = canLearn ? ELEMENT_COLOR[def.element] : '#757575';
  const emoji = ELEMENT_EMOJI[def.element];
  const cn = ELEMENT_CN[def.element];

  return (
    <div
      className="technique-card technique-learnable"
      style={{ borderLeftColor: color, opacity: canLearn ? 1 : 0.7 }}
    >
      <div className="technique-header">
        <span className="technique-name" style={{ color }}>
          {emoji} {def.name}
        </span>
        <span className="technique-type" style={{ color: canLearn ? color : '#757575' }}>{cn}系</span>
      </div>
      <div className="technique-level">
        <span style={{ color: '#aaa' }}>
          MP: {def.mpCost} · CD: {def.cooldown}回合 · 触发率: {Math.round(def.triggerRate * 100)}%
        </span>
      </div>
      <div className="divine-aptitude-row">
        <span style={{ color: '#9E9E9E', fontSize: '0.78rem' }}>
          {cn}灵根资质：<strong style={{ color: aptitude >= def.minAptitude ? '#4CAF50' : '#e74c3c' }}>{aptitude}</strong>
          / 需要 {def.minAptitude} · 境界需求：{REALMS[def.minRealm]?.name ?? def.minRealm}期
        </span>
      </div>
      <div className="technique-desc">{def.description}</div>
      {def.effects && def.effects.length > 0 && (
        <div className="divine-effects">
          {def.effects.map((eff, i) => (
            <span key={i} className="divine-effect-tag" style={{ opacity: 0.6 }}>
              {formatEffect(eff)}
            </span>
          ))}
        </div>
      )}
      <div className="technique-actions">
        <button
          className={`btn ${canLearn ? 'btn-technique-learn' : 'btn-disabled'}`}
          onClick={canLearn ? onLearn : undefined}
          disabled={!canLearn}
          title={canLearn ? `学习 ${def.name}` : reason}
        >
          {canLearn ? '📖 学习' : `🔒 ${reason}`}
        </button>
      </div>
    </div>
  );
}

// ── 辅助函数 ──

function checkLearnCondition(player: Player, def: DivineArtDef): { canLearn: boolean; reason: string } {
  if (player.realmIndex < def.minRealm) {
    const realmName = REALMS[def.minRealm]?.name ?? `境界${def.minRealm}`;
    return { canLearn: false, reason: `${realmName}境界不足` };
  }
  const aptitude = (player.aptitudes as unknown as Record<string, number>)[def.element] ?? 0;
  if (aptitude < def.minAptitude) {
    const cn = ELEMENT_CN[def.element];
    return { canLearn: false, reason: `${cn}灵根不足（${aptitude}/${def.minAptitude}）` };
  }
  return { canLearn: true, reason: '' };
}

function calcDisplayPower(aptitude: number, def: DivineArtDef): number {
  return 1.0 + Math.max(0, aptitude - 30) / 140 * def.aptitudeScaling;
}

function formatEffect(eff: import('../../game/types').DivineArtSkillEffect): string {
  switch (eff.type) {
    case 'dot':        return `灼烧 ${eff.value}/${eff.duration}回合`;
    case 'debuff_def': return `破防 -${eff.value}/${eff.duration}回合`;
    case 'debuff_atk': return `削攻 -${eff.value}/${eff.duration}回合`;
    case 'heal_self':  return `回复 +${eff.value}`;
    case 'shield_self':return `护盾 ${eff.value}/${eff.duration}回合`;
    default:           return '';
  }
}
