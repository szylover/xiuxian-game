// ============================================================
// data/core-bottlenecks.ts — 核心瓶颈数据（T0064）
// 数据已迁移至 core-bottlenecks.json，此文件为薄壳 loader。
// 调数值请直接修改 core-bottlenecks.json，无需改动 TS 代码。
// ============================================================

import type { BottleneckDef } from '../../../game/types';
import rawData from './bottlenecks.json';

export const CORE_BOTTLENECKS: BottleneckDef[] = rawData as BottleneckDef[];
