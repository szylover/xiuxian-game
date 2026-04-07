// ============================================================
// registry/dlc.ts — DLC 注册/注销（registerDLC / unregisterDLC）
// ============================================================

import type { DLCPack } from '../types';
import {
  dlcRegistry, eventRegistry, itemDefRegistry, recipeRegistry,
  equipRegistry, smithingRecipeRegistry, breakthroughReqRegistry, tribulationRegistry,
  techniqueRegistry, deathTriggerRegistry, lifeSaverRegistry, revivalRegistry,
  monsterRegistry, divineArtRegistry, achievementRegistry,
  bodyRealmRegistry, spiritRootBodyBonusRegistry, realmRegistry, regionRegistry,
  bottleneckRegistry, npcRegistry, questChainRegistry, dialogueRegistry, idleChatRegistry,
  eventTemplateRegistry, variablePoolRegistry,
  equipTemplateRegistry, affixDefRegistry,
  monsterTemplateRegistry, mutationDefRegistry,
  techniqueTraitRegistry,
} from './stores';

export function registerDLC(pack: DLCPack): void {
  dlcRegistry.set(pack.id, pack);
  if (pack.events) for (const e of pack.events) eventRegistry.set(e.id, e);
  if (pack.items) for (const item of pack.items) itemDefRegistry.set(item.id, item);
  if (pack.recipes) for (const r of pack.recipes) recipeRegistry.set(r.id, r);
  if (pack.equips) for (const eq of pack.equips) equipRegistry.set(eq.id, eq);
  if (pack.smithingRecipes) for (const sr of pack.smithingRecipes) smithingRecipeRegistry.set(sr.id, sr);
  if (pack.breakthroughReqs) for (const br of pack.breakthroughReqs) breakthroughReqRegistry.set(br.fromRealmIndex, br);
  if (pack.tribulations) for (const t of pack.tribulations) tribulationRegistry.set(t.forRealmIndex, t);
  if (pack.techniques) for (const tech of pack.techniques) techniqueRegistry.set(tech.id, tech);
  if (pack.deathTriggers) for (const dt of pack.deathTriggers) deathTriggerRegistry.set(dt.id, dt);
  if (pack.lifeSavers) for (const ls of pack.lifeSavers) lifeSaverRegistry.set(ls.id, ls);
  if (pack.revivalMethods) for (const rm of pack.revivalMethods) revivalRegistry.set(rm.id, rm);
  if (pack.monsters) for (const m of pack.monsters) monsterRegistry.set(m.id, m);
  if (pack.divineArts) for (const da of pack.divineArts) divineArtRegistry.set(da.id, da);
  if (pack.achievements) for (const ach of pack.achievements) achievementRegistry.set(ach.id, ach);
  if (pack.bodyRealms) for (const br of pack.bodyRealms) bodyRealmRegistry.set(br.index, br);
  if (pack.spiritRootBodyBonuses) for (const sb of pack.spiritRootBodyBonuses) spiritRootBodyBonusRegistry.set(sb.rootType, sb);
  if (pack.realms) for (const r of pack.realms) realmRegistry.set(r.index, r);
  if (pack.regions) for (const rg of pack.regions) regionRegistry.set(rg.id, rg);
  if (pack.bottlenecks) for (const bn of pack.bottlenecks) bottleneckRegistry.set(bn.id, bn);
  if (pack.npcs) for (const npc of pack.npcs) npcRegistry.set(npc.id, npc);
  if (pack.questChains) for (const qc of pack.questChains) questChainRegistry.set(qc.id, qc);
  if (pack.dialogues) for (const d of pack.dialogues) dialogueRegistry.set(d.id, d);
  if (pack.idleChat) {
    for (const [personality, lines] of Object.entries(pack.idleChat)) {
      idleChatRegistry[personality] = [...(idleChatRegistry[personality] ?? []), ...lines];
    }
  }
  if (pack.eventTemplates) for (const t of pack.eventTemplates) eventTemplateRegistry.set(t.id, t);
  if (pack.variablePools) for (const vp of pack.variablePools) variablePoolRegistry.set(vp.id, vp);
  if (pack.equipBaseTemplates) for (const t of pack.equipBaseTemplates) equipTemplateRegistry.set(t.id, t);
  if (pack.affixDefs) for (const a of pack.affixDefs) affixDefRegistry.set(a.id, a);
  if (pack.monsterTemplates) for (const mt of pack.monsterTemplates) monsterTemplateRegistry.set(mt.id, mt);
  if (pack.mutations) for (const md of pack.mutations) mutationDefRegistry.set(md.id, md);
  if (pack.techniqueTraits) for (const tt of pack.techniqueTraits) techniqueTraitRegistry.set(tt.id, tt);
}

export function unregisterDLC(packId: string): void {
  const pack = dlcRegistry.get(packId);
  if (!pack) return;
  if (pack.events) for (const e of pack.events) eventRegistry.delete(e.id);
  if (pack.items) for (const item of pack.items) itemDefRegistry.delete(item.id);
  if (pack.recipes) for (const r of pack.recipes) recipeRegistry.delete(r.id);
  if (pack.equips) for (const eq of pack.equips) equipRegistry.delete(eq.id);
  if (pack.smithingRecipes) for (const sr of pack.smithingRecipes) smithingRecipeRegistry.delete(sr.id);
  if (pack.breakthroughReqs) for (const br of pack.breakthroughReqs) breakthroughReqRegistry.delete(br.fromRealmIndex);
  if (pack.tribulations) for (const t of pack.tribulations) tribulationRegistry.delete(t.forRealmIndex);
  if (pack.techniques) for (const tech of pack.techniques) techniqueRegistry.delete(tech.id);
  if (pack.deathTriggers) for (const dt of pack.deathTriggers) deathTriggerRegistry.delete(dt.id);
  if (pack.lifeSavers) for (const ls of pack.lifeSavers) lifeSaverRegistry.delete(ls.id);
  if (pack.revivalMethods) for (const rm of pack.revivalMethods) revivalRegistry.delete(rm.id);
  if (pack.monsters) for (const m of pack.monsters) monsterRegistry.delete(m.id);
  if (pack.divineArts) for (const da of pack.divineArts) divineArtRegistry.delete(da.id);
  if (pack.achievements) for (const ach of pack.achievements) achievementRegistry.delete(ach.id);
  if (pack.bodyRealms) for (const br of pack.bodyRealms) bodyRealmRegistry.delete(br.index);
  if (pack.spiritRootBodyBonuses) for (const sb of pack.spiritRootBodyBonuses) spiritRootBodyBonusRegistry.delete(sb.rootType);
  if (pack.realms) for (const r of pack.realms) realmRegistry.delete(r.index);
  if (pack.regions) for (const rg of pack.regions) regionRegistry.delete(rg.id);
  if (pack.bottlenecks) for (const bn of pack.bottlenecks) bottleneckRegistry.delete(bn.id);
  if (pack.npcs) for (const npc of pack.npcs) npcRegistry.delete(npc.id);
  if (pack.questChains) for (const qc of pack.questChains) questChainRegistry.delete(qc.id);
  if (pack.dialogues) for (const d of pack.dialogues) dialogueRegistry.delete(d.id);
  // Note: idleChat removal is approximate — shared pool entries are not individually tracked
  if (pack.eventTemplates) for (const t of pack.eventTemplates) eventTemplateRegistry.delete(t.id);
  if (pack.variablePools) for (const vp of pack.variablePools) variablePoolRegistry.delete(vp.id);
  if (pack.equipBaseTemplates) for (const t of pack.equipBaseTemplates) equipTemplateRegistry.delete(t.id);
  if (pack.affixDefs) for (const a of pack.affixDefs) affixDefRegistry.delete(a.id);
  if (pack.monsterTemplates) for (const mt of pack.monsterTemplates) monsterTemplateRegistry.delete(mt.id);
  if (pack.mutations) for (const md of pack.mutations) mutationDefRegistry.delete(md.id);
  if (pack.techniqueTraits) for (const tt of pack.techniqueTraits) techniqueTraitRegistry.delete(tt.id);
  dlcRegistry.delete(packId);
}

export function getDLC(packId: string): DLCPack | undefined {
  return dlcRegistry.get(packId);
}

export function getAllDLCs(): DLCPack[] {
  return Array.from(dlcRegistry.values());
}
