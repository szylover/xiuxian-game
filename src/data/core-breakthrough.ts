// ============================================================
// core-breakthrough.ts — 核心突破需求 + 天劫定义（薄壳 loader）
// 数据已迁移至 core-breakthrough.json，此文件为薄壳 loader。
// 调数值请直接修改 core-breakthrough.json，无需改动 TS 代码。
// 条件使用声明式 DSL，由 breakthrough-loader.ts 编译为谓词函数。
// ============================================================

import type { TribulationDef } from '../game/registry';
import { loadBreakthroughReqsFromJson, type JsonBreakthroughReq, type JsonTribulation } from '../game/breakthrough-loader';
import rawData from './core-breakthrough.json';

const { breakthroughReqs, tribulations } = rawData as {
  breakthroughReqs: JsonBreakthroughReq[];
  tribulations: JsonTribulation[];
};

export const CORE_BREAKTHROUGH_REQS = loadBreakthroughReqsFromJson(breakthroughReqs);
export const CORE_TRIBULATIONS: TribulationDef[] = tribulations as TribulationDef[];
