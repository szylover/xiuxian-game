// ============================================================
// texts/procedural.ts — 程序化事件系统文案（T0070）
// ============================================================

export const PROCEDURAL_TEXTS = {
  /** 探索无结果时的回退消息 */
  noEvent: '🚶 四处探索了一番，未发现什么特别的东西。',

  /** 调试面板标签 */
  debugTitle: '程序化事件',
  debugSeedLabel: '主种子',
  debugCounterLabel: '已生成事件数',
  debugTemplateCount: (n: number) => `已注册模板：${n}`,
  debugPoolCount: (n: number) => `已注册词库：${n}`,
  debugResetSeed: '重置种子',
  debugForceGenerate: '生成一个程序化事件',
  debugGenerateSuccess: (name: string) => `✅ 生成事件：${name}`,
  debugGenerateFail: '❌ 无法生成事件（无可用模板）',
} as const;
