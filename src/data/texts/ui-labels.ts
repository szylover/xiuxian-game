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
} as const;
