export const UI_LABELS = {
  // useGameEngine.ts
  newGame: (name: string) => `🌟 ${name} 踏上修仙之路！`,
  spiritRootGrade: (grade: string, mult: string) => `灵根：${grade}（修炼速度 ×${mult}）`,
  spiritRootDetails: (list: string) => `灵根详情：${list}`,
  playerStats: (luck: number, comp: number, charm: number) => `气运: ${luck} | 悟性: ${comp} | 魅力: ${charm}`,
  loadSuccess: (name: string, realm: string) => `📂 读取存档成功！${name}，${realm}期。`,
  lifespanDeath: (age: number) => `💀 寿元耗尽！享年 ${age} 岁。修仙之路到此为止…`,
  lifespanDeathReason: (age: number, realm: string) => `寿元耗尽，享年 ${age} 岁，${realm}期。`,
  gameOverFallback: '修仙之路到此为止…',
  deleteSave: '🗑️ 存档已删除。',
  achievementUnlock: (name: string, bonus: string) => `🏆 解锁成就：${name}${bonus}`,
  // useSystemActions.ts
  tribulationGameOver: '渡劫失败，形神俱灭！',
  bodyWeaponHint: (name: string, types: string) =>
    `⚠️ ${name} 为体修武器（${types}），激活对应功法后可获得体魄攻击加成！`,
  bodyWeaponMismatch: (name: string, types: string, activeName: string, activeType: string) =>
    `⚠️ ${name} 兼容功法类型【${types}】，当前激活的【${activeName}】（${activeType}）不匹配，体魄加成无法生效！`,

  // ── 面板标题 ──
  panels: {
    inventory:   { title: '背包', icon: '🎒' },
    shop:        { title: '商店', icon: '🏪' },
    technique:   { title: '功法', icon: '📖' },
    divine:      { title: '神通', icon: '✨' },
    crafting:    { title: '炼制', icon: '🔥' },
    equipment:   { title: '装备', icon: '⚔️' },
    achievement: { title: '成就', icon: '🏆' },
    map:         { title: '世界地图', icon: '🗺️' },
    npc:         { title: 'NPC', icon: '👥' },
    quest:       { title: '任务', icon: '📜' },
    status:      { title: '详细属性', icon: '📋' },
  } as Record<string, { title: string; icon: string }>,

  // ── 面板分组 ──
  panelGroups: {
    economy:     '📦 物品经济',
    cultivation: '⚔️ 修行',
    achievement: '🏆 成就',
    world:       '🌍 世界',
  },

  // ── 日志筛选标签 ──
  logFilters: {
    all:       '全部',
    combat:    '战斗',
    explore:   '探索',
    adventure: '奇遇',
    daily:     '日常',
    system:    '系统',
  },

  // ── 左面板属性标签 ──
  stats: {
    hp:       '❤️ 体力',
    mp:       '🔮 灵力',
    stamina:  '⚡ 精力',
    technique:'📖 功法',
    divine:   '✨ 神通',
    physique: '💪 体魄',
    lifespan: '📅 寿命',
    calendar: '🗓️ 历法',
    gold:     '💰 灵石',
    exp:      '📈 修为',
    bodyRealm:'💪 体修',
  },

  // ── 通用标签 ──
  bottleneck: '🚧 瓶颈',
  detailBtn:  '📋 详细属性',
  age: '岁',
  yearPrefix: '第',
  yearSuffix: '年',
} as const;
