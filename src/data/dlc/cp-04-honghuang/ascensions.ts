import { loadAscensionDefsFromJson, type JsonAscensionDef } from '../../../game/ascension-loader';
import rawData from './ascensions.json';

export const CP04_ASCENSIONS = loadAscensionDefsFromJson(rawData as JsonAscensionDef[]);
