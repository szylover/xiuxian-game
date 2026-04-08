import type { BodyRealmDef, SpiritRootBodyBonus } from '../../../game/types';
import rawData from './body-config.json';

const data = rawData as { bodyRealms: BodyRealmDef[]; spiritRootBodyBonuses: SpiritRootBodyBonus[] };

export const CP01_BODY_REALMS: BodyRealmDef[] = data.bodyRealms;
export const CP01_SPIRIT_ROOT_BODY_BONUSES: SpiritRootBodyBonus[] = data.spiritRootBodyBonuses;
