// ============================================================
// player/utils.ts — 玩家相关工具函数
// ============================================================

/**
 * T0067: 将月份数转换为"X岁Y月"格式字符串
 * @param months 年龄（整数月）
 * @returns 格式化字符串，例如"16岁"、"16岁3月"
 */
export function formatAge(months: number): string {
  const years = Math.floor(months / 12);
  const m = months % 12;
  return m === 0 ? `${years}岁` : `${years}岁${m}月`;
}
