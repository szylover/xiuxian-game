#!/usr/bin/env python3
"""
根据事件的 name 和 message 内容自动打 regionTags 标签。
用法: python scripts/tag-events-region.py > src/data/core-events-tagged.json
  或: python scripts/tag-events-region.py --inplace  直接覆写 core-events.json
"""

import json
import sys
import os

INPUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'core-events.json')

# ── 关键词 → regionTags 映射 ──
# 每条规则: (关键词列表, 对应的 regionTags)
# 匹配逻辑: name 或 message 中包含任一关键词 → 合并对应 tags
KEYWORD_RULES: list[tuple[list[str], list[str]]] = [
    # 灵药谷 — 草药、灵药、采药、炼丹相关
    (
        ['草药', '灵草', '灵药', '药草', '采药', '药材', '药田', '药园',
         '灵芝', '参', '花圃', '灵花', '药圃', '炼丹', '丹炉', '丹方',
         '灵泉', '泉水', '清泉', '花海', '花丛', '灵植'],
        ['valley', 'herb'],
    ),
    # 妖兽山 / 荒野 — 妖兽、野兽、特定兽名
    (
        ['妖兽', '野兽', '兽', '狼', '蛇', '虎', '熊', '鹰', '蝎', '蜘蛛',
         '猿', '狮', '猪', '牛', '豹', '鼠', '蟒', '蜂', '蚁', '犀',
         '鹤', '雕', '猫', '犬', '龟', '鳄', '蜥', '蝠',
         '铁背', '赤焰', '九尾', '青鳞', '雷翼', '血角',
         '咆哮', '兽吼', '兽潮', '围攻'],
        ['mountain', 'wilderness'],
    ),
    # 荒原 — 矿石、荒漠、废墟
    (
        ['矿', '铁', '采矿', '矿脉', '矿石', '金属', '锻造',
         '荒原', '荒漠', '沙漠', '戈壁', '废墟', '枯骨', '黄沙',
         '寒霜', '冰原', '冻土'],
        ['wasteland', 'wilderness'],
    ),
    # 城镇 — 商人、集市、坊市
    (
        ['城镇', '商人', '集市', '坊市', '市集', '摊贩', '店铺', '客栈',
         '酒楼', '茶馆', '掌柜', '铺子', '买卖', '行商', '货郎',
         '折扣', '打折'],
        ['town', 'city'],
    ),
    # 秘境 — 古迹、遗迹、秘境、宝藏
    (
        ['古迹', '遗迹', '秘境', '宝藏', '禁地', '封印', '阵法', '结界',
         '洞府', '传承', '古墓', '地宫', '石室', '密室', '暗道',
         '残页', '古籍', '古卷', '秘典', '秘卷'],
        ['mystic', 'dangerous'],
    ),
    # 仙都 / 高阶 — 仙、飞升、天劫、神
    (
        ['仙人', '仙', '飞升', '天劫', '神', '天道', '大道', '天命',
         '圣地', '仙宫', '天宫', '神殿', '仙府', '仙山'],
        ['celestial', 'mystic'],
    ),
    # 山林 — 森林、山洞、深山
    (
        ['森林', '山洞', '山林', '深山', '老林', '树林', '林中', '丛林',
         '山谷', '峡谷', '悬崖', '断崖', '峭壁', '山崖', '崖边',
         '瀑布', '溪流', '河畔', '湖边', '湖畔',
         '迷雾', '雾', '青云山'],
        ['mountain', 'valley'],
    ),
]


def compute_tags(name: str, message: str) -> list[str] | None:
    """根据 name + message 的文本匹配关键词，返回去重后的 regionTags，无匹配返回 None。"""
    text = name + message
    tags: set[str] = set()
    for keywords, region_tags in KEYWORD_RULES:
        if any(kw in text for kw in keywords):
            tags.update(region_tags)
    return sorted(tags) if tags else None


def main():
    inplace = '--inplace' in sys.argv

    with open(INPUT_PATH, 'r', encoding='utf-8') as f:
        events = json.load(f)

    tagged_count = 0
    for ev in events:
        result = compute_tags(ev.get('name', ''), ev.get('message', ''))
        if result:
            ev['regionTags'] = result
            tagged_count += 1
        # 未匹配的保持无 regionTags（全区域通用）

    output = json.dumps(events, ensure_ascii=False, indent=2) + '\n'

    if inplace:
        with open(INPUT_PATH, 'w', encoding='utf-8') as f:
            f.write(output)
        print(f'已覆写 {INPUT_PATH}，共 {len(events)} 个事件，{tagged_count} 个打了标签。',
              file=sys.stderr)
    else:
        sys.stdout.write(output)
        print(f'\n共 {len(events)} 个事件，{tagged_count} 个打了标签。', file=sys.stderr)


if __name__ == '__main__':
    main()
