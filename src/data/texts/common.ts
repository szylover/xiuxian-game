// 通用映射
export const ATTR_NAMES: Record<string, string> = {
  atk: '攻击', def: '防御', speed: '速度', hp: '体力', mp: '灵力',
  critRate: '暴击', critResist: '护心', moveSpeed: '移速',
};

export const QUALITY_NAMES: Record<string, string> = {
  excellent: '✨极品',
  good: '🌟良品',
  normal: '普通',
};

export const REALM_NAMES = ['凡人','炼气','筑基','金丹','元婴','化神','渡劫','大乘'];

export const SLOT_NAMES: Record<string, string> = {
  weapon: '武器',
  helmet: '头盔',
  armor: '衣甲',
  boots: '靴子',
  accessory1: '饰品一',
  accessory2: '饰品二',
};

export const ELEMENT_CN: Record<string, string> = {
  fire: '火', water: '水', thunder: '雷', wind: '风', earth: '土', wood: '木', metal: '金',
};

export const SPIRIT_ROOT_CN: Record<string, string> = {
  metal: '金', wood: '木', water: '水', fire: '火', earth: '土',
};

export const COMBO_CN: Record<string, string> = {
  none: '无灵根', single: '单灵根', dual: '双灵根',
  triple: '三灵根', quad: '四灵根', penta: '五灵根',
};

export const APTITUDE_CN: Record<string, string> = {
  alchemy: '炼丹', smithing: '炼器', fengshui: '风水', mining: '采矿',
  blade: '刀法', spear: '枪法', sword: '剑法', fist: '拳法', palm: '掌法', finger: '指法',
  fire: '火系', water: '水系', thunder: '雷系', wind: '风系', earth: '土系', wood: '木系',
};
