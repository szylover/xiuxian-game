// ============================================================
// data/core-body-config.ts — 体修核心数据（T0059）
// 数据已迁移至 core-body-config.json，此文件为薄壳 loader。
// 调数值请直接修改 core-body-config.json，无需改动 TS 代码。
// ============================================================

import type { BodyRealmDef, SpiritRootBodyBonus } from '../game/types';
import rawData from './core-body-config.json';

export const CORE_BODY_REALMS: BodyRealmDef[] = rawData.bodyRealms as BodyRealmDef[];
export const CORE_SPIRIT_ROOT_BODY_BONUSES: SpiritRootBodyBonus[] = rawData.spiritRootBodyBonuses as SpiritRootBodyBonus[];
