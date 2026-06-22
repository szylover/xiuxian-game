// ============================================================
// panels/TechniquePanel.tsx — 功法面板
// 已学功法列表 + 修炼 + 激活 + 可学功法
// ============================================================

import './TechniquePanel.css';
import type { Player } from '../../game/player';
import { getTechniqueDef } from '../../game/registry';
import type { TechniqueDef, PassiveEffect } from '../../game/registry';
import { getTechniqueInstance, getTechniqueTraitDef } from '../../game/registry';
import { getLearnableTechniques, calcTechniqueExpGain, getEffectiveMaxLevel, calcAptitudeBonus } from '../../game/technique';
import { RARITY_COLORS, SPIRIT_ROOT_CN, SPIRIT_ROOT_COLORS, SPIRIT_ROOT_ICONS } from '../shared';
import type { TechniqueRarity } from '../../game/registry';
import { TECHNIQUE_QUALITY_CONFIG } from '../../game/procedural';
import { useState } from 'react';
import { getAlignment } from '../../game/karma';
import { ALIGNMENT_CN, KARMA_TEXTS } from '../../data/texts';

const TECHNIQUE_TYPE_CN: Record<string, string> = {
  sword: '剑法', blade: '刀法', fist: '拳法',
  palm: '掌法', finger: '指法', spear: '枪法',
};

interface TechniquePanelProps {
  player: Player;
  onLearn: (techniqueId: string) => void;
  onPractice: (techniqueId: string) => void;
  onActivate: (techniqueId: string) => void;
}

// ── 灵根标签（用于功法卡片）──
function SpiritRootTag({ rootType, affinity }: { rootType: string; affinity?: number }) {
  const color = SPIRIT_ROOT_COLORS[rootType] ?? '#9E9E9E';
  const icon  = SPIRIT_ROOT_ICONS[rootType]  ?? '🔮';
  const cn    = SPIRIT_ROOT_CN[rootType]     ?? rootType;
  return (
    <span
      className="technique-root-tag"
      style={{ '--root-tag-color': color } as React.CSSProperties}
      title={affinity !== undefined ? `${cn}灵根 亲和度 ${affinity}` : `${cn}灵根`}
    >
      {icon} {cn}
      {affinity !== undefined && <span className="technique-root-affinity"> {affinity}</span>}
    </span>
  );
}

export default function TechniquePanel({ player, onLearn, onPractice, onActivate }: TechniquePanelProps) {
  const [filterAvailable, setFilterAvailable] = useState(false);
  const learnable = getLearnableTechniques(player);
  const learnableIds = new Set(learnable.map(d => d.id));

  // 过滤可学功法：开启时只显示满足条件的
  const displayLearnable = filterAvailable
    ? learnable.filter(def => {
        const hasRequired = !def.requiredSpiritRoot
          || player.spiritRoots?.roots.some(r => r.type === def.requiredSpiritRoot);
        const alignmentReady = !def.requiredAlignment || getAlignment(player.karma ?? 0) === def.requiredAlignment;
        return hasRequired && alignmentReady;
      })
    : learnable;

  return (
    <div className="technique-panel">
      {/* 过滤开关 */}
      <div className="technique-filter-bar">
        <button
          className={`btn btn-technique-filter ${filterAvailable ? 'btn-technique-activate' : 'btn-technique'}`}
          onClick={() => setFilterAvailable(!filterAvailable)}
        >
          {filterAvailable ? '✅ 只看可学' : '👁️ 全部'}
        </button>
      </div>

      {/* 已学功法 */}
      <div className="technique-section-title">📖 已学功法</div>
      {player.techniques.length === 0 ? (
        <div className="inventory-empty">尚未习得任何功法…</div>
      ) : (
        <div className="technique-list">
          {player.techniques.map(slot => {
            const def = getTechniqueDef(slot.techniqueId);
            if (!def) return null;
            const isActive = player.activeTechniqueId === slot.techniqueId;
            const effectiveMax = getEffectiveMaxLevel(player, def);
            const isMaxLevel = slot.level >= effectiveMax;
            const expGain = calcTechniqueExpGain(player, def);
            // 计算被动解锁角标
            const totalPassives = def.passiveEffects?.length ?? 0;
            const unlockedPassives = def.passiveEffects?.filter(pe => slot.level >= pe.minLevel).length ?? 0;
            // 灵根匹配信息
            const matchRoot = def.spiritRootElement
              ? player.spiritRoots?.roots.find(r => r.type === def.spiritRootElement)
              : undefined;
            // T0073: 词条实例品质
            const techInstance = slot.instanceId ? getTechniqueInstance(slot.instanceId) : undefined;
            const qualityCfg = techInstance
              ? TECHNIQUE_QUALITY_CONFIG.find(c => c.rarity === techInstance.qualityOverride)
              : undefined;
            const rootBoostText = matchRoot
              ? `×${(1 + matchRoot.affinity / 100).toFixed(1)}`
              : undefined;
            // 技能攻击强度加成（资质 + 灵根亲和度的综合系数）
            const atkBonus = calcAptitudeBonus(player, def);
            const atkBonusText = (atkBonus > 1.01 && def.activeSkill)
              ? `×${atkBonus.toFixed(2)}`
              : undefined;
            return (
              <div
                key={slot.techniqueId}
                className={`technique-card technique-card-colored ${isActive ? 'technique-active' : ''}`}
                style={{ '--card-accent-color': RARITY_COLORS[def.rarity as TechniqueRarity] || '#9E9E9E' } as React.CSSProperties}
              >
                <div className="technique-header">
                  <span className="technique-name">
                    {def.name}
                  </span>
                  {qualityCfg && (
                    <span className="technique-quality-badge" title={`${qualityCfg.displayName}品质，附带 ${techInstance?.traits.length ?? 0} 条词条`}>
                      {qualityCfg.displayName}
                    </span>
                  )}
                  <span className="technique-type">{TECHNIQUE_TYPE_CN[def.type] ?? def.type}</span>
                  {def.spiritRootElement && (
                    <SpiritRootTag
                      rootType={def.spiritRootElement}
                      affinity={matchRoot?.affinity}
                    />
                  )}
                  {totalPassives > 0 && (
                    <span
                      className="technique-passive-badge"
                      title={`已解锁 ${unlockedPassives}/${totalPassives} 条被动`}
                    >
                      ✨{unlockedPassives}/{totalPassives}
                    </span>
                  )}
                </div>
                <div className="technique-level">
                  Lv.{slot.level}/{effectiveMax}
                  {effectiveMax !== def.maxLevel && (
                    <span className="technique-max-bonus" title={`灵根亲和度提升了上限（基础 ${def.maxLevel}）`}>
                      {' '}⬆{effectiveMax}
                    </span>
                  )}
                  {!isMaxLevel && (
                    <span className="technique-exp"> ({slot.exp}/{def.expPerLevel})</span>
                  )}
                  {rootBoostText && (
                    <span className="technique-root-speed" title="灵根亲和度修炼加速">
                      {' '}⚡{rootBoostText}速
                    </span>
                  )}
                  {atkBonusText && (
                    <span className="technique-atk-bonus" title="技能攻击强度（资质 + 灵根亲和度综合系数）">
                      {' '}⚔️{atkBonusText}攻
                    </span>
                  )}
                  {isActive && <span className="technique-active-badge">⚔️ 激活</span>}
                </div>
                {!isMaxLevel && (
                  <div className="technique-progress">
                    <div
                      className="technique-progress-fill"
                      style={{ '--progress-pct': `${(slot.exp / def.expPerLevel) * 100}%` } as React.CSSProperties}
                    />
                  </div>
                )}
                <div className="technique-desc">{def.description}</div>
                <div className="technique-bonus">
                  每级：{formatBonus(def)}
                </div>
                {/* 被动效果区块（T0019）*/}
                {def.passiveEffects && def.passiveEffects.length > 0 && (
                  <div className="technique-passive-section">
                    <div className="technique-passive-title">✨ 熟练被动</div>
                    {def.passiveEffects.map((pe, i) => (
                      <PassiveEffectRow
                        key={i}
                        pe={pe}
                        currentLevel={slot.level}
                      />
                    ))}
                  </div>
                )}
                {/* 词条区块（T0073）*/}
                <TraitSection instanceId={slot.instanceId} />
                <div className="technique-actions">
                  {!isMaxLevel && (
                    <button className="btn btn-technique" onClick={() => onPractice(slot.techniqueId)}>
                      🧘 修炼 (+{expGain})
                    </button>
                  )}
                  {!isActive && (
                    <button className="btn btn-technique-activate" onClick={() => onActivate(slot.techniqueId)}>
                      ⚔️ 激活
                    </button>
                  )}
                  {isActive && (
                    <button className="btn btn-technique" onClick={() => onActivate(slot.techniqueId)}>
                      ❎ 取消激活
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 可学功法 */}
      {displayLearnable.length > 0 && (
        <>
          <div className="technique-section-title technique-section-title-spaced">📚 可学功法{filterAvailable ? '（已筛选）' : ''}</div>
          <div className="technique-list">
            {displayLearnable.map(def => {
              const effectiveMax = getEffectiveMaxLevel(player, def);
              const matchRoot = def.spiritRootElement
                ? player.spiritRoots?.roots.find(r => r.type === def.spiritRootElement)
                : undefined;
              const hasRequired = !def.requiredSpiritRoot
                || player.spiritRoots?.roots.some(r => r.type === def.requiredSpiritRoot);
              const alignmentReady = !def.requiredAlignment || getAlignment(player.karma ?? 0) === def.requiredAlignment;
              const canLearn = hasRequired && alignmentReady;
              return (
                <div
                  key={def.id}
                  className={`technique-card technique-card-colored technique-learnable ${!canLearn ? 'technique-locked' : ''}`}
                  style={{ '--card-accent-color': RARITY_COLORS[def.rarity as TechniqueRarity] || '#9E9E9E' } as React.CSSProperties}
                >
                  <div className="technique-header">
                    <span className="technique-name">
                      {def.name}
                    </span>
                    <span className="technique-type">{TECHNIQUE_TYPE_CN[def.type] ?? def.type}</span>
                    {def.spiritRootElement && (
                      <SpiritRootTag
                        rootType={def.spiritRootElement}
                        affinity={matchRoot?.affinity}
                      />
                    )}
                    {(def.passiveEffects?.length ?? 0) > 0 && (
                      <span className="technique-passive-badge" title="含被动效果">
                        ✨{def.passiveEffects?.length}
                      </span>
                    )}
                  </div>
                  {/* 灵根门槛提示 */}
                  {def.requiredSpiritRoot && (
                    <div className={`technique-root-req ${hasRequired ? 'technique-root-met' : 'technique-root-unmet'}`}>
                      {hasRequired ? '✅' : '🔒'} 需要{SPIRIT_ROOT_ICONS[def.requiredSpiritRoot]}{SPIRIT_ROOT_CN[def.requiredSpiritRoot]}灵根
                    </div>
                  )}
                  {def.requiredAlignment && (
                    <div className={`technique-root-req ${alignmentReady ? 'technique-root-met' : 'technique-root-unmet'}`}>
                      {alignmentReady ? '✅' : '🔒'} {KARMA_TEXTS.logs.techniqueGate(ALIGNMENT_CN[def.requiredAlignment])}
                    </div>
                  )}
                  <div className="technique-desc">{def.description}</div>
                  <div className="technique-bonus">
                    每级：{formatBonus(def)} ・ 最大 Lv.{effectiveMax}
                    {effectiveMax !== def.maxLevel && (
                      <span className="technique-max-bonus" title={`灵根亲和度可进一步提升上限，基础 ${def.maxLevel}`}> (基础{def.maxLevel})</span>
                    )}
                  </div>
                  {/* 可学功法也显示被动预览 */}
                  {def.passiveEffects && def.passiveEffects.length > 0 && (
                    <div className="technique-passive-section">
                      <div className="technique-passive-title">✨ 熟练被动（预览）</div>
                      {def.passiveEffects.map((pe, i) => (
                        <PassiveEffectRow key={i} pe={pe} currentLevel={0} />
                      ))}
                    </div>
                  )}
                  <button
                    className="btn btn-technique-learn"
                    onClick={() => onLearn(def.id)}
                    disabled={!canLearn}
                    title={!canLearn ? (def.requiredAlignment && !alignmentReady ? KARMA_TEXTS.logs.techniqueGate(ALIGNMENT_CN[def.requiredAlignment]) : `需要${SPIRIT_ROOT_CN[def.requiredSpiritRoot!]}灵根才能学习`) : undefined}
                  >
                    {canLearn ? '📖 学习' : '🔒 条件不足'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── 单条被动效果行 ──
function PassiveEffectRow({ pe, currentLevel }: { pe: PassiveEffect; currentLevel: number }) {
  const unlocked = currentLevel >= pe.minLevel;
  return (
    <div
      className={`technique-passive-row ${unlocked ? 'technique-passive-unlocked' : 'technique-passive-locked'}`}
      title={unlocked ? '已生效，当前叠加到属性中' : `还差 ${pe.minLevel - currentLevel} 级解锁`}
    >
      <span className="technique-passive-icon">{unlocked ? '●' : '○'}</span>
      <span className="technique-passive-level">Lv{pe.minLevel}</span>
      <span className="technique-passive-desc">{pe.description}</span>
      {!unlocked && (
        <span className="technique-passive-hint">（需 Lv{pe.minLevel}）</span>
      )}
    </div>
  );
}

function formatBonus(def: TechniqueDef): string {
  const b = def.statBonusPerLevel;
  const parts: string[] = [];
  if (b.atk) parts.push(`攻击+${b.atk}`);
  if (b.def) parts.push(`防御+${b.def}`);
  if (b.speed) parts.push(`速度+${b.speed}`);
  if (b.critRate) parts.push(`暴击+${b.critRate}%`);
  if (b.critDmgMultiplier) parts.push(`暴伤+${(b.critDmgMultiplier * 100).toFixed(0)}%`);
  if (b.hp) parts.push(`体力+${b.hp}`);
  if (b.mp) parts.push(`灵力+${b.mp}`);
  return parts.join(' ') || '无';
}

// ── 词条展示区块（T0073）──
const TIER_ICONS: Record<string, string> = { minor: '◇', major: '◆', legendary: '★' };
const TIER_COLORS: Record<string, string> = { minor: 'var(--color-quality-common)', major: 'var(--color-quality-rare)', legendary: 'var(--color-quality-legendary)' };

function TraitSection({ instanceId }: { instanceId?: string }) {
  if (!instanceId) return null;
  const instance = getTechniqueInstance(instanceId);
  if (!instance || instance.traits.length === 0) return null;

  return (
    <div className="technique-trait-section">
      <div className="technique-trait-title">🎲 词条</div>
      {instance.traits.map((slot, i) => {
        const traitDef = getTechniqueTraitDef(slot.traitId);
        const name = traitDef?.name ?? slot.traitId;
        const desc = traitDef?.description.replace('{value}', String(slot.finalValue)) ?? `${slot.stat} +${slot.finalValue}`;
        return (
          <div
            key={i}
            className="technique-trait-row"
            style={{ '--trait-color': TIER_COLORS[slot.tier] ?? TIER_COLORS.minor } as React.CSSProperties}
            title={desc}
          >
            <span className="technique-trait-icon">{TIER_ICONS[slot.tier] ?? '◇'}</span>
            <span className="technique-trait-name">{name}</span>
            <span className="technique-trait-value">{desc}</span>
          </div>
        );
      })}
    </div>
  );
}
