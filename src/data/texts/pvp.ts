export const PVP_TEXTS = {
  panel: {
    intro: '问道台可挑战天机榜修士。胜者声名上扬，败者需静养一月后再战。',
    title: '问道台',
    rating: (rating: number) => `声名评分：${rating}`,
    record: (wins: number, losses: number) => `战绩：${wins} 胜 / ${losses} 负`,
    cooldown: (months: number) => `尚需静养 ${months} 月`,
    ready: '可发起挑战',
    opponentTitle: '可挑战修士',
    historyTitle: '最近战报',
    noOpponents: '暂无适合挑战的榜上修士。',
    noHistory: '尚无问道战报。',
    challenge: '挑战',
    rank: (rank: number) => `第 ${rank} 名`,
    power: (score: number) => `战力 ${score}`,
    reward: (exp: number, gold: number) => `奖励：修为 ${exp}、灵石 ${gold}`,
    lastResult: (name: string, result: string) => `${name}：${result}`,
  },
  logs: {
    cooldown: (months: number) => `⚠️ 问道台需静养 ${months} 月后方可再战。`,
    invalidOpponent: '⚠️ 未找到可挑战的榜上修士。',
    start: (name: string, rank: number) => `⚔️ 你登上问道台，向第 ${rank} 名 ${name} 发起切磋！`,
    victory: (name: string, exp: number, gold: number, rank: number | null) =>
      `🏆 你胜过 ${name}，获得 ${exp} 修为、${gold} 灵石，当前名次${rank ? `第 ${rank} 名` : '暂未入榜'}。`,
    defeat: (name: string) => `💢 你败于 ${name}，问道台声名受挫。`,
    draw: (name: string) => `🤝 你与 ${name} 战至难分胜负。`,
  },
  resultWin: '胜',
  resultLoss: '负',
  resultDraw: '平',
} as const;

