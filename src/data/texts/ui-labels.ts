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
  gameOverTitle: '游戏结束',
  restartButton: '重新开始',
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
    talent:     { title: '命格天赋', icon: '🌌' },
    enlightenment: { title: '悟道顿悟', icon: '🧠' },
    heartDemon: { title: '心魔', icon: '🖤' },
    pvp: { title: '问道台', icon: '🥋' },
    sect:        { title: '门派宗门', icon: '🏯' },
    crafting:    { title: '炼制', icon: '🔥' },
    equipment:   { title: '装备', icon: '⚔️' },
    achievement: { title: '成就', icon: '🏆' },
    map:         { title: '世界地图', icon: '🗺️' },
    npc:         { title: 'NPC', icon: '👥' },
    companion:   { title: '道侣双修', icon: '☯️' },
    quest:       { title: '任务', icon: '📜' },
    bounty:      { title: '历练悬赏', icon: '🏷️' },
    secretRealm: { title: '秘境', icon: '🌙' },
    chronicle:   { title: '修仙履历', icon: '📋' },
    ranking:     { title: '榜单', icon: '🏅' },
    status:      { title: '详细属性', icon: '📋' },
  } as Record<string, { title: string; icon: string }>,

  // ── 面板分组 ──
  panelGroups: {
    economy:     '📦 物品经济',
    cultivation: '⚔️ 修行',
    achievement: '🏆 成就',
    world:       '🌍 世界',
    sect:        '🏯 门派',
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
  mainMenuTitle: '返回主菜单',
  mainMenuButton: '🏠 主菜单',
  exitConfirmTitle: '🏠 返回主菜单',
  exitConfirmBody: '当前进度已自动存档，确定要返回主菜单吗？',
  exitConfirmOk: '确认返回',
  exitConfirmCancel: '继续修炼',
  debugBountyRealm: {
    title: '🏷️ 悬赏 / 秘境',
    bountyReputation: (value: number) => `悬赏声望: ${value}`,
    realmCooldowns: (value: number) => `秘境冷却: ${value}`,
    addBountyReputation: '悬赏声望 +20',
    clearRealmCooldown: '清空秘境冷却',
  },
} as const;
