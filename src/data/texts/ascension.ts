// ============================================================
// data/texts/ascension.ts — 飞升系统文案（T0033）
// ============================================================

export const ASCENSION_TEXTS = {
  // 飞升按钮
  ascendButton: '飞升',
  ascendButtonTooltip: '突破凡界极限，飞升仙界',

  // 条件检查
  expInsufficient: (required: number, current: number) =>
    `修为不足，飞升需要 ${required} 修为（当前 ${current}）`,
  materialInsufficient: (name: string, need: number, have: number) =>
    `飞升材料不足：${name} 需要 ${need}，当前 ${have}`,
  conditionNotMet: (desc: string) => `飞升条件未满足：${desc}`,
  looseImmortalBlocked: '散仙之身无法正常飞升，需寻求特殊契机',

  // 飞升过程
  consumeItem: (name: string, count: number) =>
    `消耗 ${name} ×${count}`,
  tribulationRequired: '天道感应，飞升天劫降临！',
  ascensionBegin: (name: string) =>
    `天地法则共鸣，${name} 开始飞升…`,

  // 成功
  success: (realmName: string) =>
    `✨ 飞升成功！踏入${realmName}，超脱凡尘！`,
  successBonus: (lifespanBonus: number) =>
    `寿元大增 +${lifespanBonus} 月`,
  rewardItem: (name: string, count: number) =>
    `飞升奖励：获得 ${name} ×${count}`,

  // 失败
  failed: (desc: string) => `飞升失败！${desc}`,
  realmDrop: (realmName: string) =>
    `飞升天劫失败，跌落至${realmName}`,
  looseImmortal: '飞升天劫失败，化为散仙…修仙之路另辟蹊径',
  annihilated: '飞升天劫失败，形神俱灭！',

  // 巅峰提示
  peakReached: '已达当前天地法则极限',

  // 修仙履历
  chronicleAscension: (fromRealm: string, toRealm: string) =>
    `突破凡界极限，从${fromRealm}飞升至${toRealm}，踏入仙道`,
  chronicleAscensionFail: (realmName: string) =>
    `飞升天劫失败于${realmName}期`,

  // 阶层标签
  tierLabel: (tier: string) => {
    if (tier === 'immortal') return '仙';
    if (tier === 'primordial') return '洪荒';
    return '';
  },
};
