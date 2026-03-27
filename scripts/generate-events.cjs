// ============================================================
// generate-events.js — 生成 1000 个修仙随机事件到 JSON
// 使用: node scripts/generate-events.js
// 输出: src/data/core-events.json
// ============================================================

const fs = require('fs');
const path = require('path');

// ── 随机工具 ──
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ── 事件模板库 ──

const LOCATIONS = [
  '深山老林', '荒凉古道', '溪流旁', '瀑布后的洞穴', '枯井底部',
  '断崖边', '迷雾森林', '竹海深处', '古寺废墟', '地下暗河',
  '火山口', '冰川裂谷', '沙漠绿洲', '海边礁石', '云海之上',
  '灵脉交汇处', '古阵遗址', '废弃矿洞', '荒废药园', '枯木林',
  '月光湖畔', '星辰崖', '风暴峡谷', '雷池边', '幽冥谷',
  '碧波潭', '紫竹林', '落英坡', '苍穹峰', '九曲桥',
  '忘忧崖', '通天阶', '百花谷', '万妖岭', '青云山脚',
  '玄天洞', '烈阳荒原', '寒霜原野', '金光大道', '暗影密林',
  '灵草坪', '仙鹤池', '龙骨沟', '凤栖梧', '麒麟崖',
  '桃花源', '蓬莱浅滩', '昆仑山道', '须弥洞天', '混沌边缘',
];

const NPCS = [
  '一位白发老者', '一个神秘少年', '一位云游散修', '一个受伤的修士',
  '一位卖符的道人', '一个采药的小童', '一位隐世高人', '一个落魄书生',
  '一位女修', '一个行脚商人', '一位剑修', '一个炼丹师',
  '一位阵法师', '一个驯兽师', '一位铸器大师', '一个算命先生',
  '一位老药农', '一个巡山弟子', '一位长老模样的人', '一个孤独的渔翁',
  '一位蒙面人', '一个挑担货郎', '一位道姑', '一个和尚',
  '一位琴师', '一个画师', '一位棋手', '一个醉汉',
];

const BEASTS = [
  '一只灵狐', '一条蟒蛇', '一头铁背熊', '一只赤焰鹰',
  '一只紫眸狼', '一头金角鹿', '一只玄冰蝎', '一条银鳞蛟',
  '一只噬魂蝠', '一头碧眼虎', '一只七彩蝶', '一条火蜥蜴',
  '一只墨玉蚕', '一头青铜牛', '一只风翼雀', '一条地龙',
  '一只云雾豹', '一头岩石龟', '一只幽灵蛇', '一只血色蚁王',
  '一只九尾猫', '一头雷角兽', '一只冰晶蜘蛛', '一只炎凤雏',
];

const ITEMS_FOUND = [
  '一株千年灵芝', '一块精铁矿石', '一瓶品质不错的丹药', '一本残破的功法',
  '一把生锈的剑', '一枚古老的玉佩', '一颗发光的灵石', '一张泛黄的地图',
  '一个密封的玉瓶', '一块刻满符文的石板', '一颗五色灵珠', '一根仙藤',
  '一朵冰灵花', '一块天外陨铁', '一枚储物戒指', '一本阵法图解',
  '一串佛珠', '一面铜镜', '一只玉簪', '一块兽骨',
  '一坛老酒', '一幅山水画', '一枚令牌', '一块血玉',
];

const WEATHER = [
  '灵气潮汐涌动', '天降甘露', '紫气东来', '金光普照',
  '雷暴肆虐', '阴雨绵绵', '狂风呼啸', '大雾弥漫',
  '星光璀璨', '晚霞如火', '朝阳初升', '月圆之夜',
  '花开满山', '落叶纷飞', '霜降大地', '冰雪消融',
];

const FEELINGS = [
  '心旷神怡', '若有所悟', '精神一振', '略感疲惫',
  '心生警惕', '百感交集', '意气风发', '心如止水',
  '热血沸腾', '沉思良久', '感慨万千', '怅然若失',
];

// ── 效果组合 ──

const GOOD_EFFECTS = [
  { effects: { gold: 5 }, desc: '灵石 +5' },
  { effects: { gold: 10 }, desc: '灵石 +10' },
  { effects: { gold: 15 }, desc: '灵石 +15' },
  { effects: { gold: 20 }, desc: '灵石 +20' },
  { effects: { gold: 30 }, desc: '灵石 +30' },
  { effects: { gold: 50 }, desc: '灵石 +50' },
  { effects: { exp: 5 }, desc: '修为 +5' },
  { effects: { exp: 10 }, desc: '修为 +10' },
  { effects: { exp: 15 }, desc: '修为 +15' },
  { effects: { exp: 20 }, desc: '修为 +20' },
  { effects: { exp: 30 }, desc: '修为 +30' },
  { effects: { exp: 50 }, desc: '修为 +50' },
  { effects: { exp: 80 }, desc: '修为 +80' },
  { effects: { hp: 20 }, desc: 'HP +20' },
  { effects: { hp: 50 }, desc: 'HP +50' },
  { effects: { mp: 15 }, desc: '灵力 +15' },
  { effects: { mp: 30 }, desc: '灵力 +30' },
  { effects: { mood: 5 }, desc: '心情 +5' },
  { effects: { mood: 10 }, desc: '心情 +10' },
  { effects: { mood: 15 }, desc: '心情 +15' },
  { effects: { health: 5 }, desc: '健康 +5' },
  { effects: { health: 10 }, desc: '健康 +10' },
  { effects: { stamina: 10 }, desc: '精力 +10' },
  { effects: { stamina: 20 }, desc: '精力 +20' },
  { effects: { gold: 10, exp: 10 }, desc: '灵石 +10，修为 +10' },
  { effects: { exp: 15, mood: 5 }, desc: '修为 +15，心情 +5' },
  { effects: { hp: 30, mp: 20 }, desc: 'HP +30，灵力 +20' },
  { effects: { gold: 5, health: 5 }, desc: '灵石 +5，健康 +5' },
  { effects: { exp: 20, hp: 20 }, desc: '修为 +20，HP +20' },
  { effects: { gold: 20, mood: 10 }, desc: '灵石 +20，心情 +10' },
];

const BAD_EFFECTS = [
  { effects: { hp: -10 }, desc: 'HP -10' },
  { effects: { hp: -20 }, desc: 'HP -20' },
  { effects: { hp: -30 }, desc: 'HP -30' },
  { effects: { hp: -50 }, desc: 'HP -50' },
  { effects: { mp: -10 }, desc: '灵力 -10' },
  { effects: { mp: -20 }, desc: '灵力 -20' },
  { effects: { mood: -5 }, desc: '心情 -5' },
  { effects: { mood: -10 }, desc: '心情 -10' },
  { effects: { mood: -15 }, desc: '心情 -15' },
  { effects: { mood: -20 }, desc: '心情 -20' },
  { effects: { health: -5 }, desc: '健康 -5' },
  { effects: { health: -10 }, desc: '健康 -10' },
  { effects: { stamina: -5 }, desc: '精力 -5' },
  { effects: { stamina: -10 }, desc: '精力 -10' },
  { effects: { gold: -5 }, desc: '灵石 -5' },
  { effects: { gold: -10 }, desc: '灵石 -10' },
  { effects: { gold: -15 }, desc: '灵石 -15' },
  { effects: { hp: -15, mood: -5 }, desc: 'HP -15，心情 -5' },
  { effects: { hp: -20, health: -5 }, desc: 'HP -20，健康 -5' },
  { effects: { mood: -10, stamina: -5 }, desc: '心情 -10，精力 -5' },
  { effects: { health: -5, mp: -10 }, desc: '健康 -5，灵力 -10' },
  { effects: { gold: -10, mood: -5 }, desc: '灵石 -10，心情 -5' },
];

const NEUTRAL_EFFECTS = [
  { effects: {}, desc: '' },
  { effects: { mood: 3 }, desc: '心情 +3' },
  { effects: { mood: -3 }, desc: '心情 -3' },
  { effects: { exp: 3 }, desc: '修为 +3' },
  { effects: { exp: 5 }, desc: '修为 +5' },
  { effects: { exp: 5, mood: -3 }, desc: '修为 +5, 心情 -3' },
  { effects: { gold: 3 }, desc: '灵石 +3' },
  { effects: { hp: 10, mood: -5 }, desc: 'HP +10，心情 -5' },
];

// ── 条件模板 ──

const CONDITIONS = [
  null,
  null,
  null, // 大部分无条件
  null,
  null,
  { minRealm: 1 },
  { minRealm: 2 },
  { minRealm: 3 },
  { maxMood: 50 },
  { minMood: 60 },
  { minLuck: 40 },
  { minComprehension: 40 },
  { minCharisma: 40 },
  { minGold: 10 },
  { minGold: 20 },
  { maxHealth: 70 },
  { minHealth: 50 },
];

// ── 探索事件模板 ──

function genExploreGood(idx) {
  const templates = [
    () => {
      const loc = pick(LOCATIONS);
      const item = pick(ITEMS_FOUND);
      const eff = pick(GOOD_EFFECTS);
      return { name: `${loc}寻宝`, msg: `🔍 在${loc}探索时，发现了${item}。${eff.desc}。`, ...eff };
    },
    () => {
      const npc = pick(NPCS);
      const eff = pick(GOOD_EFFECTS);
      return { name: `偶遇${npc.slice(2)}`, msg: `🤝 路上偶遇${npc}，${pick(['交谈甚欢', '得到指点', '互换心得', '获得馈赠'])}。${eff.desc}。`, ...eff };
    },
    () => {
      const loc = pick(LOCATIONS);
      const eff = pick(GOOD_EFFECTS);
      return { name: `${loc}修炼`, msg: `🧘 在${loc}找到一处适合修炼的地方，${pick(FEELINGS)}。${eff.desc}。`, ...eff };
    },
    () => {
      const item = pick(ITEMS_FOUND);
      const eff = pick(GOOD_EFFECTS);
      return { name: `意外收获`, msg: `🎁 无意间在路边发现${item}，${pick(['大喜过望', '喜出望外', '欣喜不已'])}。${eff.desc}。`, ...eff };
    },
    () => {
      const beast = pick(BEASTS);
      const eff = pick(GOOD_EFFECTS);
      return { name: `灵兽馈赠`, msg: `🐾 遇到${beast}，它似乎对你很亲近，${pick(['叼来一株灵草', '引路到一处宝地', '留下一颗灵珠'])}。${eff.desc}。`, ...eff };
    },
    () => {
      const loc = pick(LOCATIONS);
      const eff = pick(GOOD_EFFECTS);
      return { name: `灵脉发现`, msg: `💎 在${loc}感应到地下灵脉波动，挖掘后${pick(['收获颇丰', '有所收获', '略有斩获'])}。${eff.desc}。`, ...eff };
    },
  ];
  return pick(templates)();
}

function genExploreBad(idx) {
  const templates = [
    () => {
      const beast = pick(BEASTS);
      const eff = pick(BAD_EFFECTS);
      return { name: `遭遇${beast.slice(2)}`, msg: `🐺 在探索中遭遇${beast}的袭击！${pick(['措手不及', '仓促应战', '险些丧命'])}。${eff.desc}。`, ...eff };
    },
    () => {
      const loc = pick(LOCATIONS);
      const eff = pick(BAD_EFFECTS);
      return { name: `${loc}遇险`, msg: `⚠️ 在${loc}遭遇危险，${pick(['踩入陷阱', '跌落悬崖', '中了毒', '被落石砸中'])}。${eff.desc}。`, ...eff };
    },
    () => {
      const eff = pick(BAD_EFFECTS);
      return { name: `劫匪拦路`, msg: `🗡️ 路遇${pick(['一伙劫匪', '散修劫道', '妖修拦路', '邪修埋伏'])}，${pick(['被迫交出财物', '苦战后脱身', '受伤逃脱'])}。${eff.desc}。`, ...eff };
    },
    () => {
      const eff = pick(BAD_EFFECTS);
      return { name: `邪气侵体`, msg: `☠️ ${pick(['误入瘴气区', '踏入邪阵范围', '吸入毒雾', '触碰诅咒之物'])}，${pick(['邪气侵体', '毒素入侵', '灵力紊乱'])}。${eff.desc}。`, ...eff };
    },
    () => {
      const eff = pick(BAD_EFFECTS);
      return { name: `心魔侵扰`, msg: `👿 修行中${pick(['心境动摇', '旧事涌来', '噩梦缠身', '走火入魔'])}，${pick(['心魔趁虚而入', '精神受创', '难以平复'])}。${eff.desc}。`, ...eff };
    },
  ];
  return pick(templates)();
}

function genExploreNeutral(idx) {
  const templates = [
    () => {
      const loc = pick(LOCATIONS);
      const eff = pick(NEUTRAL_EFFECTS);
      return { name: `${loc}漫步`, msg: `🚶 在${loc}闲逛了一圈，${pick(['一无所获', '略有感触', '消磨了时光', '偶有所得'])}。${eff.desc ? eff.desc + '。' : ''}`, ...eff };
    },
    () => {
      const eff = pick(NEUTRAL_EFFECTS);
      return { name: `奇异景观`, msg: `🏔️ 途经${pick(LOCATIONS)}，看到${pick(['壮丽山河', '奇花异草', '古怪岩石', '灵兽嬉戏'])}，${pick(FEELINGS)}。${eff.desc ? eff.desc + '。' : ''}`, ...eff };
    },
    () => {
      const npc = pick(NPCS);
      const eff = pick(NEUTRAL_EFFECTS);
      return { name: `路遇行人`, msg: `👤 路上碰到${npc}，${pick(['点头致意后各走各路', '简单交谈几句', '擦肩而过', '互相打量一番'])}。${eff.desc ? eff.desc + '。' : ''}`, ...eff };
    },
  ];
  return pick(templates)();
}

// ── 奇遇事件模板 ──

function genAdventure(idx) {
  const templates = [
    () => {
      const loc = pick(LOCATIONS);
      const effects = { exp: randInt(80, 300), gold: randInt(30, 100) };
      return { name: `${loc}传承`, msg: `🏛️ 【奇遇】在${loc}发现一处${pick(['上古修士洞府', '远古遗迹', '仙人隐居之所', '先贤藏经阁'])}！获得传承。修为 +${effects.exp}，灵石 +${effects.gold}。`, effects, tone: 'good', once: true, condition: { minRealm: randInt(0, 3) } };
    },
    () => {
      const npc = pick(NPCS);
      const exp = randInt(50, 200);
      return { name: `高人指路`, msg: `✨ 【奇遇】${npc}${pick(['展露真身', '以真面目示人', '现出本体'])}，竟是${pick(['渡劫期大能', '上界谪仙', '远古传承者'])}！指点迷津。修为 +${exp}。`, effects: { exp }, tone: 'good', once: true, condition: { minRealm: randInt(1, 3), minComprehension: randInt(30, 60) } };
    },
    () => {
      const loc = pick(LOCATIONS);
      const effects = { exp: randInt(50, 150), hp: -randInt(10, 30) };
      return { name: `秘境探险`, msg: `🌀 【奇遇】在${loc}发现${pick(['空间裂缝', '次元通道', '秘境入口', '结界缺口'])}，闯入后${pick(['历经磨难', '九死一生', '险象环生'])}。修为 +${effects.exp}，HP ${effects.hp}。`, effects, tone: 'neutral', cooldown: randInt(2, 5) };
    },
    () => {
      const beast = pick(BEASTS);
      const gold = randInt(50, 200);
      return { name: `灵兽契约`, msg: `🐾 【奇遇】遇到${beast}，${pick(['以诚心打动', '结为契约', '互生好感'])}，${pick(['它赠予你一件宝物', '引你至宝藏所在', '协助你修炼'])}。灵石 +${gold}。`, effects: { gold }, tone: 'good', once: true };
    },
    () => {
      const effects = { exp: randInt(100, 500) };
      return { name: `天降机缘`, msg: `☄️ 【奇遇】${pick(['天空裂开一道口子', '天降异宝', '一道金光从天而降', '紫雷贯地'])}，${pick(['蕴含无上法意', '携带远古传承', '暗含造化'])}！修为 +${effects.exp}。`, effects, tone: 'good', cooldown: randInt(5, 15) };
    },
    () => {
      const effects = { exp: randInt(30, 100), mood: -randInt(5, 15), hp: -randInt(10, 40) };
      return { name: `劫难降临`, msg: `⚡ 【奇遇】${pick(['天劫余威降临', '感应到远方渡劫波动', '意外牵引到劫云', '因果纠缠触发小天劫'])}！${pick(['身受重伤但有所悟', '九死一生获得顿悟', '险死还生'])}。修为 +${Math.abs(effects.exp)}，HP ${effects.hp}，心情 ${effects.mood}。`, effects, tone: 'bad', cooldown: randInt(5, 10), condition: { minRealm: 2 } };
    },
    () => {
      const effects = { hp: randInt(50, 200), mp: randInt(20, 80), mood: randInt(10, 20), health: randInt(5, 15) };
      return { name: `仙泉沐浴`, msg: `🌊 【奇遇】在${pick(LOCATIONS)}发现${pick(['仙灵泉眼', '太乙精泉', '九天玄水', '生死泉'])}，沐浴后${pick(['脱胎换骨', '焕然一新', '精气神大涨'])}！HP +${effects.hp}，灵力 +${effects.mp}，心情 +${effects.mood}，健康 +${effects.health}。`, effects, tone: 'good', once: true, condition: { minRealm: 1 } };
    },
  ];
  return pick(templates)();
}

// ── 日常事件模板 ──

function genDaily(idx) {
  const templates = [
    () => {
      const weather = pick(WEATHER);
      const effects = Math.random() > 0.5 ? { exp: randInt(3, 10), mood: randInt(2, 5) } : { mood: -randInt(3, 8) };
      const isGood = effects.mood > 0 || effects.exp > 0;
      const desc = Object.entries(effects).map(([k, v]) => {
        const names = { exp: '修为', mood: '心情', hp: 'HP', mp: '灵力', gold: '灵石', health: '健康', stamina: '精力' };
        return `${names[k] || k} ${v > 0 ? '+' : ''}${v}`;
      }).join('，');
      return { name: weather, msg: `${isGood ? '🌤️' : '🌧️'} 今日${weather}，${pick(['修炼受到影响', '有所感触', '心境波动'])}。${desc}。`, effects, tone: isGood ? 'good' : 'bad' };
    },
    () => {
      const effects = {};
      return { name: '平静一日', msg: '', effects, tone: 'neutral' };
    },
    () => {
      const npc = pick(NPCS);
      const eff = Math.random() > 0.3
        ? { effects: { exp: randInt(5, 15), gold: randInt(3, 10) }, tone: 'good' }
        : { effects: { mood: -randInt(3, 8) }, tone: 'bad' };
      return { name: `来客`, msg: eff.tone === 'good'
        ? `📨 ${npc}来访，${pick(['切磋道法', '交换灵材', '传授心得', '赠送礼物'])}。${Object.entries(eff.effects).map(([k, v]) => `${({exp:'修为',gold:'灵石',mood:'心情'})[k]||k} +${v}`).join('，')}。`
        : `😤 ${npc}来访，${pick(['言语冲撞', '结果不欢而散', '引发不快'])}。心情 ${eff.effects.mood}。`,
        ...eff };
    },
    () => {
      const effects = { stamina: randInt(5, 15) };
      return { name: '好眠', msg: `😴 昨夜睡得格外香甜，精力 +${effects.stamina}。`, effects, tone: 'good' };
    },
    () => {
      const effects = { mood: -randInt(5, 12), stamina: -randInt(3, 8) };
      return { name: '失眠', msg: `😰 辗转反侧难以入眠，心情 ${effects.mood}，精力 ${effects.stamina}。`, effects, tone: 'bad', condition: { maxMood: 60 } };
    },
    () => {
      const effects = { exp: randInt(5, 20) };
      return { name: '灵感一闪', msg: `💡 ${pick(['洗漱时', '散步时', '用餐时', '发呆时'])}突然${pick(['灵光一闪', '顿悟一丝法意', '想通一个修炼瓶颈', '领悟一段心法'])}。修为 +${effects.exp}。`, effects, tone: 'good', condition: { minComprehension: randInt(30, 60) } };
    },
  ];
  return pick(templates)();
}

// ── 生成主逻辑 ──

const events = [];
const usedIds = new Set();

function makeId(category, idx) {
  return `core:${category}_${String(idx).padStart(4, '0')}`;
}

// 500 探索事件
for (let i = 0; i < 500; i++) {
  const roll = Math.random();
  let data, tone;
  if (roll < 0.45) {
    data = genExploreGood(i);
    tone = 'good';
  } else if (roll < 0.75) {
    data = genExploreBad(i);
    tone = 'bad';
  } else {
    data = genExploreNeutral(i);
    tone = 'neutral';
  }

  events.push({
    id: makeId('explore', i),
    category: 'explore',
    tone: data.tone || tone,
    name: data.name,
    weight: randInt(3, 20),
    effects: data.effects,
    message: data.msg,
    condition: data.condition || pick(CONDITIONS),
    once: data.once || false,
    cooldown: data.cooldown || 0,
  });
}

// 300 奇遇事件
for (let i = 0; i < 300; i++) {
  const data = genAdventure(i);
  events.push({
    id: makeId('adventure', i),
    category: 'adventure',
    tone: data.tone || 'good',
    name: data.name,
    weight: randInt(1, 5),
    effects: data.effects,
    message: data.msg,
    condition: data.condition || pick(CONDITIONS),
    once: data.once || false,
    cooldown: data.cooldown || randInt(2, 8),
  });
}

// 200 日常事件
for (let i = 0; i < 200; i++) {
  const data = genDaily(i);
  events.push({
    id: makeId('daily', i),
    category: 'daily',
    tone: data.tone || 'neutral',
    name: data.name,
    weight: data.name === '平静一日' ? 40 : randInt(3, 15),
    effects: data.effects,
    message: data.msg,
    condition: data.condition || pick(CONDITIONS),
    once: false,
    cooldown: 0,
  });
}

// ── 输出 ──

const outDir = path.join(__dirname, '..', 'src', 'data');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, 'core-events.json');
fs.writeFileSync(outPath, JSON.stringify(events, null, 2), 'utf-8');

console.log(`✅ 生成 ${events.length} 个事件 → ${outPath}`);
console.log(`   探索: ${events.filter(e => e.category === 'explore').length}`);
console.log(`   奇遇: ${events.filter(e => e.category === 'adventure').length}`);
console.log(`   日常: ${events.filter(e => e.category === 'daily').length}`);
