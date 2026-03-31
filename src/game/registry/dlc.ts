// ============================================================
// registry/dlc.ts — DLC 注册/注销（registerDLC / unregisterDLC）
// ============================================================

import type { DLCPack } from '../types';
import {
  dlcRegistry, eventRegistry, itemDefRegistry, recipeRegistry,
  equipRegistry, smithingRecipeRegistry, breakthroughReqRegistry, tribulationRegistry,
  techniqueRegistry, deathTriggerRegistry, lifeSaverRegistry, revivalRegistry,
  monsterRegistry, divineArtRegistry, achievementRegistry,
  bodyRealmRegistry, spiritRootBodyBonusRegistry,
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
  dlcRegistry.delete(packId);
}

export function getDLC(packId: string): DLCPack | undefined {
  return dlcRegistry.get(packId);
}

export function getAllDLCs(): DLCPack[] {
  return Array.from(dlcRegistry.values());
}
