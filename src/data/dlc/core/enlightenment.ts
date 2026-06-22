import type { EnlightenmentInsightDef } from '../../../game/types';

export const CORE_ENLIGHTENMENT_INSIGHTS: EnlightenmentInsightDef[] = [
  {
    id: 'core:clear_stream_mind',
    name: '清流观心',
    description: '观万念如溪，修炼时更易入定。',
    route: 'righteous',
    requiredInsight: 1,
    effect: { cultivationSpeedBonus: 0.06, breakthroughRateBonus: 0.01 },
  },
  {
    id: 'core:heaven_mind',
    name: '天心一线',
    description: '得天心垂照，悟性与天赋树相互贯通。',
    route: 'righteous',
    requiredInsight: 2,
    effect: { breakthroughRateBonus: 0.03, statBonuses: { comprehension: 3 } },
  },
  {
    id: 'core:blood_shadow_flash',
    name: '血影一瞬',
    description: '以杀伐照见本我，顿悟爆发更猛烈。',
    route: 'evil',
    requiredInsight: 1,
    effect: { cultivationSpeedBonus: 0.04, statBonuses: { atk: 3 }, statMultipliers: { critDmgMultiplier: 0.04 } },
  },
  {
    id: 'core:demon_heart_edge',
    name: '魔心锋芒',
    description: '魔念凝锋，突破时敢向天争。',
    route: 'evil',
    requiredInsight: 2,
    effect: { breakthroughRateBonus: 0.04, statBonuses: { critRate: 1 } },
  },
  {
    id: 'core:yin_yang_balance',
    name: '阴阳守中',
    description: '守中抱一，正邪之间亦可成道。',
    route: 'neutral',
    requiredInsight: 1,
    effect: { cultivationSpeedBonus: 0.04, breakthroughRateBonus: 0.02, statBonuses: { def: 2 } },
  },
  {
    id: 'core:first_spark',
    name: '灵光初现',
    description: '第一次捕捉大道微光，诸法皆可稍进。',
    route: 'any',
    requiredInsight: 1,
    effect: { cultivationSpeedBonus: 0.03, statBonuses: { comprehension: 2 } },
  },
];
