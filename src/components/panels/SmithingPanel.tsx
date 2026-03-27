// ============================================================
// SmithingPanel.tsx — 炼器面板（T0016）
// 炼器配方列表 + 材料需求 + 成功率 + 炼器按钮
// ============================================================

import type { Player } from '../../game/player';
import type { SmithingRecipeDef } from '../../game/registry';
import { getAllSmithingRecipes, getItemDef, getEquipDef } from '../../game/registry';
import { canSmith, calcSmithingSuccessRate } from '../../game/smithing';
import { getItemCount } from '../../game/inventory';
import { CollapsiblePanel, CapacityBar } from '../shared';

interface SmithingPanelProps {
  player: Player;
  isOpen: boolean;
  onToggle: () => void;
  onSmith: (recipeId: string) => void;
}

function SmithingCard({ recipe, player, onSmith }: { recipe: SmithingRecipeDef; player: Player; onSmith: (id: string) => void }) {
  const craftable = canSmith(player, recipe.id);
  const successRate = calcSmithingSuccessRate(player, recipe);
  const outputDef = getItemDef(recipe.outputItemId) ?? getEquipDef(recipe.outputItemId);

  return (
    <div className={`recipe-card ${craftable ? '' : 'recipe-disabled'}`} style={{ borderLeftColor: '#FF9800' }}>
      <div className="recipe-header">
        <span className="recipe-name" style={{ color: '#FFB74D' }}>{recipe.name}</span>
        <span className="recipe-rate">{(successRate * 100).toFixed(0)}%</span>
      </div>
      <div className="recipe-desc">{recipe.description}</div>
      <div className="recipe-materials">
        {recipe.inputs.map(input => {
          const def = getItemDef(input.itemId);
          const have = getItemCount(player, input.itemId);
          const enough = have >= input.count;
          return (
            <span key={input.itemId} className={`recipe-mat ${enough ? '' : 'mat-missing'}`}>
              {def?.name ?? input.itemId} {have}/{input.count}
            </span>
          );
        })}
        <span className={`recipe-mat ${player.gold >= recipe.goldCost ? '' : 'mat-missing'}`}>
          💰{player.gold}/{recipe.goldCost}
        </span>
      </div>
      <div className="recipe-footer">
        <span className="recipe-output" style={{ color: '#FFB74D' }}>→ {outputDef?.name ?? recipe.outputItemId}</span>
        <span className="recipe-cost">🧠{recipe.mentalCost}</span>
        <button
          className="btn btn-smith"
          disabled={!craftable}
          onClick={() => onSmith(recipe.id)}
        >
          炼器
        </button>
      </div>
    </div>
  );
}

export default function SmithingPanel({ player, isOpen, onToggle, onSmith }: SmithingPanelProps) {
  if (!player) return null;

  const recipes = getAllSmithingRecipes().filter(r => player.realmIndex >= r.minRealm);

  return (
    <CollapsiblePanel
      className="smithing-panel"
      isOpen={isOpen}
      onToggle={onToggle}
      openLabel="⚒️ 收起炼器"
      closedLabel={`⚒️ 炼器 (🧠${player.mentalPower}/${player.maxMentalPower})`}
    >
      <div className="alchemy-content">
        <div className="alchemy-mental">
          <CapacityBar
            current={player.mentalPower}
            max={player.maxMentalPower}
            label="念力"
            color="#FF9800"
          />
        </div>
        <div className="recipe-list">
          {recipes.length === 0 ? (
            <div className="inventory-empty">暂无可用炼器配方…</div>
          ) : (
            recipes.map(r => (
              <SmithingCard key={r.id} recipe={r} player={player} onSmith={onSmith} />
            ))
          )}
        </div>
      </div>
    </CollapsiblePanel>
  );
}
