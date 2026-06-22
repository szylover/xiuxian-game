import type { TribulationDef } from '../../../game/registry';
import { loadBreakthroughReqsFromJson, type JsonBreakthroughReq, type JsonTribulation } from '../../../game/breakthrough-loader';
import rawData from './breakthrough.json';

const { breakthroughReqs, tribulations } = rawData as {
  breakthroughReqs: JsonBreakthroughReq[];
  tribulations: JsonTribulation[];
};

export const CP03_BREAKTHROUGH_REQS = loadBreakthroughReqsFromJson(breakthroughReqs);
export const CP03_TRIBULATIONS: TribulationDef[] = tribulations as TribulationDef[];
