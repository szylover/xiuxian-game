// ============================================================
// data/core-realms.ts — 气修境界定义（T0058）
// 数据已迁移至 core-realms.json，此文件为薄壳 loader。
// 调数值请直接修改 core-realms.json，无需改动 TS 代码。
// DLC 可追加更高境界（如散仙→金仙），index 从 8 开始。
// ============================================================

import type { RealmDef } from '../../../game/types';
import rawData from './realms.json';

export const CORE_REALMS: RealmDef[] = rawData as RealmDef[];
