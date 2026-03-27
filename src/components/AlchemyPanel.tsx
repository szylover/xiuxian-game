// ============================================================
// AlchemyPanel.tsx — 炼丹面板（T0013）
// 配方列表 + 材料需求 + 成功率 + 炼丹按钮
// ============================================================

import type { Player } from '../game/player';
import { getAllRecipes, getItemDef } from '../game/registry';
import type { RecipeDef } from '../game/registry';
import { canCraft, calcSuccessRate } from '../game/alchemy';
import { getItemCount } from '../game/inventory';

interface AlchemyPanelProps {
  player: Player;
  isOpen: boolean;
  onToggle: () => void;
  onCraft: (recipeId: string) => void;
}

function RecipeCard({ recipe, player, onCraft }: { recipe: RecipeDef; player: Player; onCraft: (id: string) => void }) {
  const craftable = canCraft(player, recipe.id);
  const successRate = calcSuccessRate(player, recipe);
  const outputDef = getItemDef(recipe.outputItemId);

  return (
    <div className={`recipe-card ${craftable ? '' : 'recipe-disabled'}`}>
      <div className="recipe-header">
        <span className="recipe-name">{recipe.name}</span>
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
      </div>
      <div className="recipe-footer">
        <span className="recipe-output">→ {outputDef?.name ?? recipe.outputItemId} ×{recipe.outputCount}</span>
        <span className="recipe-cost">🧠{recipe.mentalCost}</span>
        <button
          className="btn btn-craft"
          disabled={!craftable}
          onClick={() => onCraft(recipe.id)}
        >
          炼丹
        </button>
      </div>
    </div>
  );
}

export default function AlchemyPanel({ player, isOpen, onToggle, onCraft }: AlchemyPanelProps) {
  if (!player) return null;

  const recipes = getAllRecipes().filter(r => player.realmIndex >= r.minRealm);

  return (
    <div className="alchemy-panel">
      <button className="panel-toggle" onClick={onToggle}>
        {isOpen ? '🔥 收起炼丹' : `🔥 炼丹 (🧠${player.mentalPower}/${player.maxMentalPower})`}
      </button>

      {isOpen && (
        <div className="alchemy-content">
          <div className="alchemy-mental">
            <span>念力 {player.mentalPower}/{player.maxMentalPower}</span>
            <div className="capacity-bar">
              <div
                className="capacity-bar-fill"
                style={{
                  width: `${(player.mentalPower / player.maxMentalPower) * 100}%`,
                  background: '#9C27B0',
                }}
              />
            </div>
          </div>
          <div className="recipe-list">
            {recipes.length === 0 ? (
              <div className="inventory-empty">暂无可用配方…</div>
            ) : (
              recipes.map(r => (
                <RecipeCard key={r.id} recipe={r} player={player} onCraft={onCraft} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
