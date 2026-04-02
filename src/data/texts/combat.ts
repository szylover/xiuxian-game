export const COMBAT_TEXTS = {
  encounter: (name: string, hp: number) => `⚔️ 遭遇 ${name}（${hp} HP）！`,
  techBonus: (parts: string[]) => `📖 功法加成：${parts.join(' ')}`,
  activateArt: (name: string, emoji: string, cn: string) => `✨ 激活神通：【${name}】（${emoji}${cn}系）`,
  physiqueBoost: (rate: number, bonus: number) => `💪 体修加持：体魄×${rate} = +${bonus} 攻击`,
  playerFirst: '你的脚力更快，获得先手！',
  monsterFirst: (name: string) => `${name} 先发制人！`,
  roundHeader: (n: number) => `── 第 ${n} 回合 ──`,
  artSingleHit: (name: string, emoji: string, cn: string, dmg: number, mpCost: number) =>
    `✨ 你施展【${name}】（${emoji} ${cn}系），造成 ${dmg} 点元素伤害！（灵力-${mpCost}）`,
  artMultiHit: (name: string, emoji: string, cn: string, count: number, dmg: number, mpCost: number) =>
    `✨ 你施展【${name}】（${emoji} ${cn}系），连击 ${count} 段，共造成 ${dmg} 点元素伤害！（灵力-${mpCost}）`,
  artHeal: (name: string, amt: number) => `💚 【${name}】恢复 ${amt} 点生命！`,
  artShield: (name: string, val: number, dur: number) => `🛡️ 你获得【${name}】护盾，每次受击减免 ${val} 点伤害（${dur}回合）`,
  debuffDef: (name: string, val: number, dur: number) => `🛡️ ${name} 防御降低 ${val}！（持续 ${dur} 回合）`,
  debuffAtk: (name: string, val: number, dur: number) => `⚡ ${name} 攻击降低 ${val}！（持续 ${dur} 回合）`,
  artDot: (name: string, val: number, dur: number) => `🔥 ${name} 被附加元素灼伤！每回合 ${val} 点伤害（持续 ${dur} 回合）`,
  skillSingleHit: (techName: string, skillName: string, dmg: number, mpCost: number) =>
    `⚔️ 你使出【${techName}·${skillName}】，造成 ${dmg} 点伤害！（灵力-${mpCost}）`,
  skillMultiHit: (techName: string, skillName: string, count: number, dmg: number, mpCost: number) =>
    `⚔️ 你使出【${techName}·${skillName}】，连斩 ${count} 次，造成 ${dmg} 点伤害！（灵力-${mpCost}）`,
  skillHeal: (name: string, amt: number) => `💚 ${name} 恢复 ${amt} 点生命！`,
  skillDebuffDef: (name: string, val: number, dur: number) => `🛡️ ${name} 防御降低 ${val}！（持续 ${dur} 回合）`,
  skillDebuffAtk: (name: string, val: number, dur: number) => `⚡ ${name} 攻击降低 ${val}！（持续 ${dur} 回合）`,
  skillDot: (name: string, val: number, dur: number) => `🔥 ${name} 被附加灼烧！每回合 ${val} 点伤害（持续 ${dur} 回合）`,
  shieldBlock: (name: string, amt: number) => `🛡️ 【${name}】护盾抵挡 ${amt} 点伤害！`,
  shieldExpire: (name: string) => `🛡️ 【${name}】护盾效果结束。`,
  dotTick: (name: string, val: number) => `🔥 ${name} 受到持续伤害 ${val} 点！`,
  timeout: '战斗超时，双方脱战。',
  bodyExpGain: (n: number) => `💪 获得体修修为 +${n}`,
  victory: (name: string) => `🎉 你击败了 ${name}！`,
  victoryRewards: (exp: number, gold: number) => `获得 ${exp} 修为，${gold} 灵石。`,
  skillUsage: (count: number, mp: number) => `📖 本场使用功法技能 ${count} 次，消耗灵力 ${mp} 点。`,
  artUsage: (count: number, mp: number) => `✨ 本场施展神通 ${count} 次，消耗灵力 ${mp} 点。`,
  defeat: (name: string) => `💀 你被 ${name} 击败了…`,
  defeatHp: '身受重伤，健康值大幅下降。',
  // damage.ts
  dodge: (name: string) => `${name} 闪避了攻击！`,
  crit: (attacker: string, defender: string, dmg: number) => `${attacker} 暴击！对 ${defender} 造成 ${dmg} 点伤害！`,
  normalHit: (attacker: string, defender: string, dmg: number) => `${attacker} 攻击 ${defender}，造成 ${dmg} 点伤害。`,
  // multi-hit per segment
  segDodge: (n: number) => `💨 第 ${n} 段被闪避！`,
  segCrit: (n: number, dmg: number) => `💥 第 ${n} 段暴击！造成 ${dmg} 点伤害！`,
  segHit: (n: number, dmg: number) => `第 ${n} 段命中，造成 ${dmg} 点伤害。`,
  // divine art multi-hit per segment
  artSegDodge: (n: number) => `💨 第 ${n} 段被闪避！`,
  artSegCrit: (n: number, dmg: number) => `💥 第 ${n} 段暴击！造成 ${dmg} 点元素伤害！`,
  artSegHit: (n: number, dmg: number) => `第 ${n} 段命中，造成 ${dmg} 点元素伤害。`,
  elementCounter: (atkEmoji: string, defEmoji: string, mult: number) => `${atkEmoji}克${defEmoji} 克制加成 ×${mult}`,
  // combat modal summary
  modalVictory: (name: string, details: string) => `⚔️ 击败 ${name}（${details}）`,
  modalDefeat: (name: string, details: string) => `💀 败于 ${name}（${details}）`,
  modalDraw: (name: string, details: string) => `⚔️ 与 ${name} 缠斗超时，双方脱战（${details}）`,
  // useCombatModal deathInfo fallback
  healthLoss: '-20健康',
  deathFallback: '战斗中身亡',
  // combat modal detail fragments
  detailExp:     (n: number) => `+${n}修为`,
  detailGold:    (n: number) => `+${n}灵石`,
  detailBodyExp: (n: number) => `+${n}体修`,
  detailLoot:    (items: string) => `获得: ${items}`,
  detailSaverBlocked: (name: string) => `${name}救回一命`,
  // tech bonus parts
  techBonusAtk:   (val: number) => `攻击+${val}`,
  techBonusDef:   (val: number) => `防御+${val}`,
  techBonusSpeed: (val: number) => `速度+${val}`,
  // useCoreActions.ts
  noStamina: '⚠️ 精力不足，请先休息！',
  safeZone: (emoji: string, name: string) => `🛡️ ${emoji} ${name}是安全区域，无法战斗。`,
  noMonster: '🔍 四周平静，没有发现妖兽。',
} as const;
