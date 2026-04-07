// ============================================================
// procedural/interpolate.ts — 模板字符串变量替换
// 供 T0070–T0073 共享使用
// ============================================================

/**
 * 将模板中的 `{varName}` 占位符替换为 vars 中的实际值。
 * 支持简单表达式：`{var*2}` → 将 var 的值乘以 2（仅限数值变量）。
 *
 * @param template 模板字符串，如 '在{location}发现{resource}'
 * @param vars     变量映射，如 { location: '山谷深处', resource: '灵石矿' }
 * @returns 替换后的字符串
 */
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (_match, expr: string) => {
    // 检查是否为乘法表达式：{var*N}
    const mulMatch = expr.match(/^(\w+)\*(\d+(?:\.\d+)?)$/);
    if (mulMatch) {
      const [, varName, multiplierStr] = mulMatch;
      const val = vars[varName];
      if (val !== undefined) {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          const result = Math.floor(num * parseFloat(multiplierStr));
          return String(result);
        }
      }
      return vars[varName] ?? `{${expr}}`;
    }

    // 普通变量替换
    return vars[expr] ?? `{${expr}}`;
  });
}
