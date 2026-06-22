import type { Alignment } from '../../game/types';

export const ALIGNMENT_CN: Record<Alignment, string> = {
  righteous: '正道',
  neutral: '中立',
  evil: '邪道',
};

export const KARMA_TEXTS = {
  panel: {
    title: '正邪天平',
    intro: '正邪值会随功法、事件、对话与行事选择变化，并影响商店、NPC 与悟道路线。',
    value: (value: number) => `正邪值：${value > 0 ? '+' : ''}${value}`,
    alignment: (title: string, alignment: string) => `${title}（${alignment}）`,
    effectsTitle: '当前影响',
    righteousEffect: '正气护体：防御提升，正道缘法更稳。',
    evilEffect: '煞气加身：攻击与暴伤提升，邪道顿悟更烈。',
    neutralEffect: '中正平和：无被动偏向，进退皆可。',
    history: (gained: number, lost: number) => `累计行善 +${gained} / 入邪 ${lost}`,
  },
  logs: {
    changed: (delta: number, reason: string, value: number, title: string) =>
      `⚖️ 正邪值 ${delta >= 0 ? '+' : ''}${delta}（${reason}），当前 ${value >= 0 ? '+' : ''}${value}【${title}】`,
    decayed: (delta: number, value: number) =>
      `⚖️ 尘缘流转，正邪值 ${delta > 0 ? '-' : '+'}${Math.abs(delta)}，回归 ${value >= 0 ? '+' : ''}${value}`,
    techniqueGate: (alignment: string) => `此功法需${alignment}修士方可修炼。`,
    divineGate: (alignment: string) => `此神通需${alignment}修士方可参悟。`,
    shopGate: (alignment: string) => `此物只售予${alignment}修士。`,
  },
  reasons: {
    eventChoice: '事件抉择',
  },
  titles: {
    righteousMaster: '正道宗师',
    righteousExpert: '正道高手',
    righteousCultivator: '正道修士',
    neutral: '中立散修',
    evilCultivator: '邪道修士',
    evilExpert: '邪道强者',
    evilMaster: '魔道至尊',
  },
  debug: {
    title: '⚖️ 正邪调试',
    setRighteous: '设为正道',
    setNeutral: '归于中立',
    setEvil: '设为邪道',
  },
} as const;
