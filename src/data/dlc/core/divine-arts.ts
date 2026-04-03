// ============================================================
// data/core-divine-arts.ts — 六系神通数据（DLC 核心包）
// 数据已迁移至 core-divine-arts.json，此文件为薄壳 loader。
// 调数值请直接修改 core-divine-arts.json，无需改动 TS 代码。
// ============================================================

import type { DivineArtDef } from '../../../game/types';
import rawData from './divine-arts.json';

export const CORE_DIVINE_ARTS: DivineArtDef[] = rawData as DivineArtDef[];
