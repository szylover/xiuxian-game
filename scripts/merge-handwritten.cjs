// ============================================================
// merge-handwritten.cjs — 将手写事件转为 JSON 并合并到 core-events.json
// 使用: node scripts/merge-handwritten.cjs
// ============================================================

const fs = require('fs');
const path = require('path');

const HANDWRITTEN = [
  // ── 探索：好事件 ──
  { id: 'core:find_ore', category: 'explore', tone: 'good', name: '发现灵石矿', weight: 30, effects: { gold: 20 }, message: '💎 探索中发现一处灵石矿脉，获得 20 灵石！' },
  { id: 'core:elder_advice', category: 'explore', tone: 'good', name: '前辈指点', weight: 20, effects: { exp: 30 }, message: '📖 偶遇一位隐世前辈，指点修炼，获得 30 修为！' },
  { id: 'core:find_pill', category: 'explore', tone: 'good', name: '发现丹药', weight: 15, effects: { hp: 50 }, message: '🧪 在山洞中发现一瓶丹药，恢复 50 HP！' },
  { id: 'core:spirit_spring', category: 'explore', tone: 'good', name: '灵泉', weight: 10, effects: { mp: 30, mood: 10 }, message: '🌊 发现一处灵泉，恢复 30 MP，心情 +10！' },
  { id: 'core:herb_garden', category: 'explore', tone: 'good', name: '灵草园', weight: 12, effects: { gold: 10, health: 10 }, message: '🌿 发现一片灵草园，采集灵草，获得 10 灵石，健康 +10！' },
  { id: 'core:ancient_scroll', category: 'explore', tone: 'good', name: '残页古籍', weight: 8, effects: { exp: 50 }, message: '📜 在废墟中捡到一页古籍残页，参悟后获得 50 修为！' },
  { id: 'core:treasure_chest', category: 'explore', tone: 'good', name: '宝箱', weight: 6, effects: { gold: 50 }, message: '🎁 在隐蔽的树洞中发现一个宝箱，获得 50 灵石！' },
  { id: 'core:meditation_spot', category: 'explore', tone: 'good', name: '悟道福地', weight: 5, effects: { exp: 20, mood: 15 }, message: '🧘 找到一处灵气充沛的悟道福地，修为 +20，心情 +15！' },
  { id: 'core:friendly_cultivator', category: 'explore', tone: 'good', name: '同道交流', weight: 10, effects: { exp: 15, mood: 5 }, message: '🤝 偶遇一位友好散修，交流心得，修为 +15，心情 +5。' },
  { id: 'core:lucky_stone', category: 'explore', tone: 'good', name: '福缘石', weight: 3, effects: { gold: 30 }, message: '🍀 踢到一块散发柔光的石头，福缘降临！灵石 +30。', condition: { maxLuck: 79 } },
  { id: 'core:spirit_beast_cub', category: 'explore', tone: 'good', name: '灵兽幼崽', weight: 4, effects: { gold: 40, mood: 10 }, message: '🐾 发现一只走失的灵兽幼崽，送还后获得报酬 40 灵石，心情 +10。' },

  // ── 探索：坏事件 ──
  { id: 'core:ambush', category: 'explore', tone: 'bad', name: '妖兽拦路', weight: 15, effects: { hp: -30, health: -5 }, message: '🐺 被妖兽偷袭！HP -30，健康 -5。' },
  { id: 'core:lost', category: 'explore', tone: 'bad', name: '迷失方向', weight: 10, effects: { mood: -15 }, message: '🌫️ 在迷雾中迷失了方向，心情 -15。' },
  { id: 'core:trap', category: 'explore', tone: 'bad', name: '陷阱', weight: 8, effects: { hp: -20, stamina: -10 }, message: '⚠️ 踩中了猎人的陷阱！HP -20，精力 -10。' },
  { id: 'core:robbery', category: 'explore', tone: 'bad', name: '劫匪', weight: 6, effects: { gold: -15, mood: -10 }, message: '🗡️ 遭遇劫匪，被抢走 15 灵石！心情 -10。', condition: { minGold: 15 } },
  { id: 'core:miasma', category: 'explore', tone: 'bad', name: '瘴气', weight: 7, effects: { health: -10, mp: -15 }, message: '☠️ 误入瘴气弥漫的区域，健康 -10，灵力 -15。' },
  { id: 'core:inner_demon', category: 'explore', tone: 'bad', name: '心魔', weight: 4, effects: { mood: -20, mentalPower: -10 }, message: '👿 心境动摇，心魔趁虚而入！心情 -20，念力 -10。', condition: { maxMood: 39 } },
  { id: 'core:cursed_place', category: 'explore', tone: 'bad', name: '诅咒之地', weight: 3, effects: { hp: -40, mood: -10 }, message: '💀 闯入一处被诅咒的遗迹，邪气侵体！HP -40，心情 -10。' },

  // ── 探索：中性事件 ──
  { id: 'core:nothing', category: 'explore', tone: 'neutral', name: '一无所获', weight: 20, effects: {}, message: '🚶 四处探索了一番，未发现什么特别的东西。' },
  { id: 'core:strange_sight', category: 'explore', tone: 'neutral', name: '奇异景观', weight: 8, effects: { mood: 5 }, message: '🏔️ 看到了一处壮丽的奇异景观，略感心旷神怡。心情 +5。' },
  { id: 'core:old_battlefield', category: 'explore', tone: 'neutral', name: '古战场', weight: 5, effects: { exp: 10 }, message: '⚔️ 经过一处古修士的战场遗迹，感悟残留的法意，修为 +10。' },

  // ── 奇遇事件 ──
  { id: 'core:cave_inheritance', category: 'adventure', tone: 'good', name: '洞府传承', weight: 3, effects: { exp: 200, gold: 100 }, message: '🏛️ 【奇遇】发现一处上古修士的洞府！获得传承功法残篇，修为 +200，灵石 +100！', condition: { minRealm: 1 }, once: true },
  { id: 'core:immortal_gift', category: 'adventure', tone: 'good', name: '仙人赠法', weight: 2, effects: { exp: 500 }, message: '✨ 【奇遇】一位飘然而至的仙人见你悟性非凡，传你一段口诀！修为 +500！', condition: { minRealm: 2, minComprehension: 60 }, once: true },
  { id: 'core:reincarnation_pill', category: 'adventure', tone: 'good', name: '转生丹', weight: 1, effects: { lifespan: 100, health: '=100', mood: '=100', hp: 'max', mp: 'max', stamina: 'max' }, message: '🌅 【奇遇】在秘境深处发现一颗转生丹！寿限 +100，全属性恢复满值！', condition: { minRealm: 3 }, once: true },
  { id: 'core:ancient_formation', category: 'adventure', tone: 'good', name: '上古阵法', weight: 3, effects: { exp: 100, mp: 50 }, message: '🔮 【奇遇】意外触发一座上古传送阵，灵力灌体！修为 +100，灵力 +50。', condition: { minRealm: 1 }, cooldown: 5 },
  { id: 'core:fallen_star', category: 'adventure', tone: 'good', name: '陨星降临', weight: 2, effects: { gold: 80, exp: 80 }, message: '☄️ 【奇遇】天降陨星，其中蕴含灵材！灵石 +80，修为 +80。', cooldown: 10 },
  { id: 'core:secret_realm', category: 'adventure', tone: 'neutral', name: '秘境入口', weight: 4, effects: { exp: [50, 150], hp: -20 }, message: '🌀 【奇遇】发现秘境入口！闯入其中，虽受轻伤（HP -20），但获得了不少感悟。', cooldown: 3 },
  { id: 'core:heavenly_tribulation_preview', category: 'adventure', tone: 'bad', name: '天劫余威', weight: 2, effects: { hp: '*0.5', exp: 150, mood: -15 }, message: '⚡ 【奇遇】感应到远方一道天劫余威，劫雷余波击中你！HP 减半，但劫中有悟，修为 +150。', condition: { minRealm: 2 }, cooldown: 8 },

  // ── 日常事件 ──
  { id: 'core:market_discount', category: 'daily', tone: 'good', name: '集市折扣', weight: 15, effects: { gold: 5 }, message: '🏪 路过集市，有商人低价出售灵材，你趁机捡了个便宜。灵石 +5。' },
  { id: 'core:good_weather', category: 'daily', tone: 'good', name: '灵气潮汐', weight: 10, effects: { exp: 5, mood: 3 }, message: '🌤️ 今日灵气充沛，修炼格外顺畅。修为 +5，心情 +3。' },
  { id: 'core:bad_weather', category: 'daily', tone: 'bad', name: '灵气衰退', weight: 8, effects: { mood: -5 }, message: '🌧️ 今日灵气稀薄，修炼进展缓慢，心情 -5。' },
  { id: 'core:sect_invitation', category: 'daily', tone: 'good', name: '门派邀请', weight: 3, effects: { exp: 20, gold: 10 }, message: '📨 收到一封门派邀请函，前往交流，获得修为 +20，灵石 +10。', condition: { minRealm: 1, minCharisma: 40 } },
  { id: 'core:peaceful_day', category: 'daily', tone: 'neutral', name: '平静一天', weight: 40, effects: {}, message: '' },
  { id: 'core:nightmare', category: 'daily', tone: 'bad', name: '噩梦', weight: 5, effects: { mood: -8, stamina: -5 }, message: '😰 夜里噩梦连连，休息不好。心情 -8，精力 -5。', condition: { maxMood: 49 } },
  { id: 'core:meditation_insight', category: 'daily', tone: 'good', name: '静坐顿悟', weight: 5, effects: { exp: 15 }, message: '💡 静坐时灵光一闪，对修行有了新的领悟。修为 +15。', condition: { minComprehension: 50 } },
  { id: 'core:body_ache', category: 'daily', tone: 'bad', name: '旧伤复发', weight: 4, effects: { health: -5, hp: -10 }, message: '🤕 旧伤复发，隐隐作痛。健康 -5，HP -10。', condition: { maxHealth: 59 } },
];

// 读取已有的 1000 个 JSON 事件
const jsonPath = path.join(__dirname, '..', 'src', 'data', 'core-events.json');
const existing = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

// 手写事件放在前面
const merged = [...HANDWRITTEN, ...existing];

fs.writeFileSync(jsonPath, JSON.stringify(merged, null, 2), 'utf-8');

console.log(`✅ 合并完成：${HANDWRITTEN.length} 手写 + ${existing.length} 生成 = ${merged.length} 总事件`);
console.log(`   探索: ${merged.filter(e => e.category === 'explore').length}`);
console.log(`   奇遇: ${merged.filter(e => e.category === 'adventure').length}`);
console.log(`   日常: ${merged.filter(e => e.category === 'daily').length}`);
