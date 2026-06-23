export const ONBOARDING_TEXTS = {
  storageKey: 'xiuxian_onboarding_seen',
  title: '初入仙途指引',
  subtitle: '三步掌握核心循环：修炼积累修为，探索或战斗获取资源，满足条件后突破境界。',
  skip: '跳过指引',
  previous: '上一步',
  next: '下一步',
  finish: '开始修炼',
  reopen: '新手指引',
  progress: (current: number, total: number) => `${current} / ${total}`,
  steps: [
    {
      icon: '🧘',
      title: '先修炼',
      target: '中央操作区',
      body: '点击「修炼」消耗精力获得修为；修为是突破境界的基础。',
    },
    {
      icon: '🔍',
      title: '再历练',
      target: '探索与战斗',
      body: '探索可触发事件和获得物品；离开安全区域后可战斗，胜利会得到经验、灵石与战利品。',
    },
    {
      icon: '🎆',
      title: '后突破',
      target: '突破按钮与右侧面板',
      body: '修为与材料满足后尝试突破；右侧面板可管理背包、功法、装备、任务和履历。',
    },
  ],
} as const;
