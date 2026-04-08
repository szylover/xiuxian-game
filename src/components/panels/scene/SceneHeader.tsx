// ============================================================
// SceneHeader.tsx — 区域标题栏（T0069）
// 展示当前区域名称、描述和标签
// ============================================================

import './SceneHeader.css';
import type { Player } from '../../../game/player';
import { getCurrentRegion } from '../../../game/map';

interface SceneHeaderProps {
  player: Player;
}

export default function SceneHeader({ player }: SceneHeaderProps) {
  const region = getCurrentRegion(player);
  console.log('[SceneHeader]', { region: region?.name ?? 'NULL', regionId: region?.id ?? 'NULL' });
  if (!region) return null;

  const tags: { icon: string; label: string; className: string }[] = [];
  if (region.safeZone) {
    tags.push({ icon: '🛡️', label: '安全区域', className: 'tag-safe' });
  } else {
    tags.push({ icon: '⚔️', label: '危险区域', className: 'tag-danger' });
  }
  if (region.explorationBonus) {
    tags.push({ icon: '🔍', label: `探索+${Math.round(region.explorationBonus * 100)}%`, className: 'tag-explore' });
  }
  if (region.combatBonus) {
    tags.push({ icon: '⚔️', label: `战斗经验+${Math.round(region.combatBonus * 100)}%`, className: 'tag-combat' });
  }
  if (region.shopDiscount) {
    tags.push({ icon: '🏪', label: `折扣${Math.round(region.shopDiscount * 100)}%`, className: 'tag-shop' });
  }

  return (
    <div className={`scene-header ${region.safeZone ? 'scene-header-safe' : 'scene-header-danger'}`}>
      <div className="scene-header-title">
        <span className="scene-header-deco">═══</span>
        <span className="scene-header-name">{region.emoji} {region.name}</span>
        <span className="scene-header-deco">═══</span>
      </div>
      <div className="scene-header-desc">{region.description}</div>
      {tags.length > 0 && (
        <div className="scene-header-tags">
          {tags.map((tag, i) => (
            <span key={i} className={`scene-tag ${tag.className}`}>
              {tag.icon} {tag.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
