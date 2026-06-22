// ============================================================
// registry/queries.ts — 注册表查询 API
// ============================================================

import type { ItemCategory, GameEvent, EventCategory, MonsterDef, ElementType, DivineArtDef, BodyRealmDef, SpiritRootBodyBonus, RealmDef, RegionDef, BottleneckDef, NpcDef, NpcRole, NpcDisposition, QuestChainDef, QuestChainCategory, DialogueChainDef, EventTemplate, VariablePool, EquipBaseTemplate, AffixDef, AffixPosition, EquipSlot, GeneratedEquipInstance, MonsterTemplate, MutationDef, MutationType, TechniqueTraitDef, TechniqueTraitTier, TechniqueInstance, AscensionDef, RankingDimensionDef, RankingBoardKind, DestinyDef, TalentDef, TalentTreeNodeDef, BountyTemplateDef, SecretRealmDef, EnlightenmentInsightDef } from '../types';
import type { SpiritRootType } from '../spirit-root';
import type { AchievementDef } from '../achievement/types';
import {
  eventRegistry, itemDefRegistry, recipeRegistry,
  equipRegistry, smithingRecipeRegistry, breakthroughReqRegistry, tribulationRegistry,
  techniqueRegistry, deathTriggerRegistry, lifeSaverRegistry, revivalRegistry,
  monsterRegistry, divineArtRegistry, achievementRegistry,
  bodyRealmRegistry, spiritRootBodyBonusRegistry, realmRegistry, regionRegistry,
  bottleneckRegistry, npcRegistry, questChainRegistry, dialogueRegistry, idleChatRegistry,
  eventTemplateRegistry, variablePoolRegistry,
  equipTemplateRegistry, affixDefRegistry, generatedEquipRegistry,
  monsterTemplateRegistry, mutationDefRegistry,
  techniqueTraitRegistry, techniqueInstanceRegistry,
  ascensionRegistry, rankingDimensionRegistry,
  destinyRegistry, talentRegistry, talentTreeNodeRegistry,
  bountyTemplateRegistry, secretRealmRegistry, enlightenmentInsightRegistry,
} from './stores';

// ── 事件 ──

export function registerEvent(event: GameEvent): void { eventRegistry.set(event.id, event); }
export function registerEvents(events: GameEvent[]): void { for (const e of events) eventRegistry.set(e.id, e); }
export function getEvent(id: string): GameEvent | undefined { return eventRegistry.get(id); }
export function getEventsByCategory(category: EventCategory): GameEvent[] {
  return Array.from(eventRegistry.values()).filter(e => e.category === category);
}

// ── 物品 ──

export function getItemDef(id: string) {
  const staticDef = itemDefRegistry.get(id);
  if (staticDef) return staticDef;
  // T0071: 程序化装备也可作为物品查询
  if (id.startsWith('proc-equip:')) {
    const inst = generatedEquipRegistry.get(id);
    if (inst) {
      const template = equipTemplateRegistry.get(inst.baseTemplateId);
      if (template) {
        const tier = getQualityTier(inst.quality);
        return {
          id: inst.instanceId,
          name: inst.finalName,
          category: template.slot === 'weapon' ? 'weapon' : template.slot === 'accessory1' || template.slot === 'accessory2' ? 'accessory' : 'armor',
          rarity: tier.rarity,
          description: inst.description,
          stackable: false,
          maxStack: 1,
          usable: false,
          sellPrice: inst.finalSellPrice,
        } as import('../types').ItemDef;
      }
    }
  }
  return undefined;
}
export function getItemDefsByCategory(category: ItemCategory) {
  return Array.from(itemDefRegistry.values()).filter(i => i.category === category);
}
export function getAllItemDefs() { return Array.from(itemDefRegistry.values()); }

// ── 配方 ──

export function getRecipe(id: string) { return recipeRegistry.get(id); }
export function getAllRecipes() { return Array.from(recipeRegistry.values()); }

// ── 装备 ──

export function getEquipDef(id: string) {
  const staticDef = equipRegistry.get(id);
  if (staticDef) return staticDef;
  // T0071: 回退查询程序化生成的装备
  const inst = generatedEquipRegistry.get(id);
  if (inst) {
    const template = equipTemplateRegistry.get(inst.baseTemplateId);
    if (template) {
      return instanceToEquipDef(inst, template);
    }
  }
  return undefined;
}
export function getAllEquipDefs() { return Array.from(equipRegistry.values()); }

// ── 炼器配方 ──

export function getSmithingRecipe(id: string) { return smithingRecipeRegistry.get(id); }
export function getAllSmithingRecipes() { return Array.from(smithingRecipeRegistry.values()); }

// ── 突破 + 天劫 ──

export function getBreakthroughReq(fromRealmIndex: number) { return breakthroughReqRegistry.get(fromRealmIndex); }
export function getTribulationDef(forRealmIndex: number) { return tribulationRegistry.get(forRealmIndex); }
export function getTribulationById(id: string): import('../types').TribulationDef | undefined {
  for (const t of tribulationRegistry.values()) { if (t.id === id) return t; }
  return undefined;
}

// ── 功法 ──

export function getTechniqueDef(id: string) { return techniqueRegistry.get(id); }
export function getAllTechniqueDefs() { return Array.from(techniqueRegistry.values()); }

// ── 死亡系统 ──

export function getDeathTrigger(id: string) { return deathTriggerRegistry.get(id); }
export function getAllDeathTriggers() { return Array.from(deathTriggerRegistry.values()); }
export function getLifeSaver(id: string) { return lifeSaverRegistry.get(id); }
export function getAllLifeSavers() { return Array.from(lifeSaverRegistry.values()); }
export function getRevivalMethod(id: string) { return revivalRegistry.get(id); }
export function getAllRevivalMethods() { return Array.from(revivalRegistry.values()); }

// ── 妖兽 ──

export function getMonster(id: string): MonsterDef | undefined { return monsterRegistry.get(id); }
export function getAllMonsters(): MonsterDef[] { return Array.from(monsterRegistry.values()); }
export function getMonstersByRealm(realmIndex: number): MonsterDef[] {
  return Array.from(monsterRegistry.values()).filter(m => m.realmIndex === realmIndex);
}

// ── 神通 ──

export function getDivineArtDef(id: string): DivineArtDef | undefined { return divineArtRegistry.get(id); }
export function getAllDivineArtDefs(): DivineArtDef[] { return Array.from(divineArtRegistry.values()); }
export function getDivineArtsByElement(element: ElementType): DivineArtDef[] {
  return Array.from(divineArtRegistry.values()).filter(a => a.element === element);
}

// ── 成就 ──

export function getAchievement(id: string): AchievementDef | undefined { return achievementRegistry.get(id); }
export function getAllAchievementDefs(): AchievementDef[] { return Array.from(achievementRegistry.values()); }

// ── 体修境界（T0059）──

export function getBodyRealmDef(index: number): BodyRealmDef | undefined { return bodyRealmRegistry.get(index); }
export function getAllBodyRealmDefs(): BodyRealmDef[] { return Array.from(bodyRealmRegistry.values()).sort((a, b) => a.index - b.index); }

// ── 灵根体修加成（T0059）──

export function getSpiritRootBodyBonus(rootType: SpiritRootType): SpiritRootBodyBonus | undefined { return spiritRootBodyBonusRegistry.get(rootType); }
export function getAllSpiritRootBodyBonuses(): SpiritRootBodyBonus[] { return Array.from(spiritRootBodyBonusRegistry.values()); }

// ── 气修境界（T0058）──

export function getRealmDef(index: number): RealmDef | undefined { return realmRegistry.get(index); }
export function getAllRealmDefs(): RealmDef[] { return Array.from(realmRegistry.values()).sort((a, b) => a.index - b.index); }
export function getMaxRealmIndex(): number {
  let max = -1;
  for (const key of realmRegistry.keys()) { if (key > max) max = key; }
  return max;
}

// ── 区域（T0021）──

export function getRegion(id: string): RegionDef | undefined { return regionRegistry.get(id); }
export function getAllRegions(): RegionDef[] { return Array.from(regionRegistry.values()); }

// ── 瓶颈（T0064）──

export function getBottleneckDef(id: string): BottleneckDef | undefined { return bottleneckRegistry.get(id); }
export function getAllBottleneckDefs(): BottleneckDef[] { return Array.from(bottleneckRegistry.values()); }
export function getBottlenecksForRealm(fromRealmIndex: number): BottleneckDef[] {
  return Array.from(bottleneckRegistry.values()).filter(b => b.targetType === 'realm' && b.fromRealmIndex === fromRealmIndex);
}
export function getBottlenecksForBodyRealm(fromBodyRealmIndex: number): BottleneckDef[] {
  return Array.from(bottleneckRegistry.values()).filter(b => b.targetType === 'body_realm' && b.fromBodyRealmIndex === fromBodyRealmIndex);
}
export function getBottlenecksForTechnique(techniqueId: string, level: number): BottleneckDef[] {
  return Array.from(bottleneckRegistry.values()).filter(b => b.targetType === 'technique' && b.techniqueId === techniqueId && b.atLevel === level);
}

// ── NPC（T0025）──

export function getNpcDef(id: string): NpcDef | undefined { return npcRegistry.get(id); }
export function getAllNpcDefs(): NpcDef[] { return Array.from(npcRegistry.values()); }
export function getNpcsByRegionTags(tags: string[]): NpcDef[] {
  return Array.from(npcRegistry.values()).filter(npc => {
    if (npc.homeRegionId) return false;
    if (!npc.regionTags.length) return true;
    return npc.regionTags.some(t => tags.includes(t));
  });
}
export function getNpcsByRole(role: NpcRole): NpcDef[] {
  return Array.from(npcRegistry.values()).filter(npc => npc.roles.includes(role));
}
export function getNpcsByDisposition(disposition: NpcDisposition): NpcDef[] {
  return Array.from(npcRegistry.values()).filter(npc => npc.disposition === disposition);
}

// ── 排名维度（#102 / #118）──

export function getRankingDimensionDef(id: string): RankingDimensionDef | undefined {
  return rankingDimensionRegistry.get(id);
}
export function getAllRankingDimensionDefs(): RankingDimensionDef[] {
  return Array.from(rankingDimensionRegistry.values()).sort((a, b) => a.order - b.order);
}
export function getRankingDimensionsByBoard(board: RankingBoardKind): RankingDimensionDef[] {
  return getAllRankingDimensionDefs().filter(def => def.board === board);
}

// ── 命格天赋（#110 / #215）──

export function getDestinyDef(id: string): DestinyDef | undefined { return destinyRegistry.get(id); }
export function getAllDestinyDefs(): DestinyDef[] { return Array.from(destinyRegistry.values()); }
export function getTalentDef(id: string): TalentDef | undefined { return talentRegistry.get(id); }
export function getAllTalentDefs(): TalentDef[] { return Array.from(talentRegistry.values()); }
export function getTalentTreeNodeDef(id: string): TalentTreeNodeDef | undefined { return talentTreeNodeRegistry.get(id); }
export function getAllTalentTreeNodeDefs(): TalentTreeNodeDef[] { return Array.from(talentTreeNodeRegistry.values()); }

// ── 历练悬赏（#117）──

export function getBountyTemplateDef(id: string): BountyTemplateDef | undefined { return bountyTemplateRegistry.get(id); }
export function getAllBountyTemplateDefs(): BountyTemplateDef[] { return Array.from(bountyTemplateRegistry.values()); }

// ── 秘境（#95）──

export function getSecretRealmDef(id: string): SecretRealmDef | undefined { return secretRealmRegistry.get(id); }
export function getAllSecretRealmDefs(): SecretRealmDef[] { return Array.from(secretRealmRegistry.values()); }

// ── 悟道顿悟（#112）──

export function getEnlightenmentInsightDef(id: string): EnlightenmentInsightDef | undefined { return enlightenmentInsightRegistry.get(id); }
export function getAllEnlightenmentInsightDefs(): EnlightenmentInsightDef[] {
  return Array.from(enlightenmentInsightRegistry.values()).sort((a, b) => a.requiredInsight - b.requiredInsight);
}

// ── 任务链（T0057）──

export function getQuestChainDef(id: string): QuestChainDef | undefined { return questChainRegistry.get(id); }
export function getAllQuestChainDefs(): QuestChainDef[] { return Array.from(questChainRegistry.values()); }
export function getQuestChainsByCategory(category: QuestChainCategory): QuestChainDef[] {
  return Array.from(questChainRegistry.values()).filter(q => q.category === category);
}

// ── 对话链（T0026）──

export function getDialogueDef(id: string): DialogueChainDef | undefined { return dialogueRegistry.get(id); }
export function getAllDialogueDefs(): DialogueChainDef[] { return Array.from(dialogueRegistry.values()); }
export function getDialoguesByNpc(npcId: string): DialogueChainDef[] {
  return Array.from(dialogueRegistry.values()).filter(d => d.npcId === npcId);
}
export function getIdleChatPool(): Record<string, string[]> { return idleChatRegistry; }

// ── 程序化事件模板（T0070）──

export function getEventTemplate(id: string): EventTemplate | undefined { return eventTemplateRegistry.get(id); }
export function getAllEventTemplates(): EventTemplate[] { return Array.from(eventTemplateRegistry.values()); }
export function getEventTemplatesByCategory(category: EventCategory): EventTemplate[] {
  return Array.from(eventTemplateRegistry.values()).filter(t => t.category === category);
}

// ── 变量词库（T0070）──

export function getVariablePool(id: string): VariablePool | undefined { return variablePoolRegistry.get(id); }
export function getAllVariablePools(): VariablePool[] { return Array.from(variablePoolRegistry.values()); }
export function getVariablePoolsByVariable(variable: string): VariablePool[] {
  return Array.from(variablePoolRegistry.values()).filter(p => p.variable === variable);
}

// ── 装备模板（T0071）──

export function getEquipTemplate(id: string): EquipBaseTemplate | undefined { return equipTemplateRegistry.get(id); }
export function getAllEquipTemplates(): EquipBaseTemplate[] { return Array.from(equipTemplateRegistry.values()); }
export function getEquipTemplatesBySlot(slot: EquipSlot): EquipBaseTemplate[] {
  return Array.from(equipTemplateRegistry.values()).filter(t => t.slot === slot);
}

// ── 词缀（T0071）──

export function getAffixDef(id: string): AffixDef | undefined { return affixDefRegistry.get(id); }
export function getAllAffixDefs(): AffixDef[] { return Array.from(affixDefRegistry.values()); }
export function getAffixesByPosition(position: AffixPosition): AffixDef[] {
  return Array.from(affixDefRegistry.values()).filter(a => a.position === position);
}

// ── 程序化装备实例（T0071）──

export function getGeneratedEquip(instanceId: string): GeneratedEquipInstance | undefined {
  return generatedEquipRegistry.get(instanceId);
}
export function registerGeneratedEquip(inst: GeneratedEquipInstance): void {
  generatedEquipRegistry.set(inst.instanceId, inst);
}
export function removeGeneratedEquip(instanceId: string): void {
  generatedEquipRegistry.delete(instanceId);
}
export function getAllGeneratedEquips(): GeneratedEquipInstance[] {
  return Array.from(generatedEquipRegistry.values());
}
export function clearAllGeneratedEquips(): void {
  generatedEquipRegistry.clear();
}

// ── T0071 辅助：实例 → EquipDef 桥接 ──

import type { EquipDef } from '../types';
import { getQualityTier } from '../procedural/rarity';

function instanceToEquipDef(inst: GeneratedEquipInstance, template: EquipBaseTemplate): EquipDef {
  const tier = getQualityTier(inst.quality);
  return {
    id: inst.instanceId,
    name: inst.finalName,
    slot: template.slot,
    rarity: tier.rarity,
    description: inst.description,
    stats: inst.finalStats,
    minRealm: template.minRealm,
    sellPrice: inst.finalSellPrice,
    techType: template.techType,
  };
}

// ── 妖兽模板（T0072）──

export function getMonsterTemplate(id: string): MonsterTemplate | undefined { return monsterTemplateRegistry.get(id); }
export function getAllMonsterTemplates(): MonsterTemplate[] { return Array.from(monsterTemplateRegistry.values()); }
export function getMonsterTemplatesByRealm(realmIndex: number): MonsterTemplate[] {
  return Array.from(monsterTemplateRegistry.values()).filter(t => {
    if (t.minRealm !== undefined && realmIndex < t.minRealm) return false;
    if (t.maxRealm !== undefined && realmIndex > t.maxRealm) return false;
    return true;
  });
}

// ── 变异定义（T0072）──

export function getMutationDef(id: string): MutationDef | undefined { return mutationDefRegistry.get(id); }
export function getAllMutationDefs(): MutationDef[] { return Array.from(mutationDefRegistry.values()); }
export function getMutationDefsByType(type: MutationType): MutationDef[] {
  return Array.from(mutationDefRegistry.values()).filter(m => m.type === type);
}

// ── 功法词条（T0073）──

export function getTechniqueTraitDef(id: string): TechniqueTraitDef | undefined { return techniqueTraitRegistry.get(id); }
export function getAllTechniqueTraitDefs(): TechniqueTraitDef[] { return Array.from(techniqueTraitRegistry.values()); }
export function getTechniqueTraitsByTier(tier: TechniqueTraitTier): TechniqueTraitDef[] {
  return Array.from(techniqueTraitRegistry.values()).filter(t => t.tier === tier);
}

// ── 功法词条实例（T0073）──

export function getTechniqueInstance(instanceId: string): TechniqueInstance | undefined {
  return techniqueInstanceRegistry.get(instanceId);
}
export function registerTechniqueInstance(inst: TechniqueInstance): void {
  techniqueInstanceRegistry.set(inst.instanceId, inst);
}
export function removeTechniqueInstance(instanceId: string): void {
  techniqueInstanceRegistry.delete(instanceId);
}
export function getAllTechniqueInstances(): TechniqueInstance[] {
  return Array.from(techniqueInstanceRegistry.values());
}
export function clearAllTechniqueInstances(): void {
  techniqueInstanceRegistry.clear();
}

// ── 飞升定义（T0033）──

export function getAscensionDef(id: string): AscensionDef | undefined { return ascensionRegistry.get(id); }
export function getAllAscensionDefs(): AscensionDef[] { return Array.from(ascensionRegistry.values()); }
export function getAscensionForRealm(fromRealmIndex: number): AscensionDef | undefined {
  for (const asc of ascensionRegistry.values()) {
    if (asc.fromRealmIndex === fromRealmIndex) return asc;
  }
  return undefined;
}
