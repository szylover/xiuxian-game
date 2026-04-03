// ============================================================
// dlc/index.ts — DLC 包注册表
// 列出所有可用 DLC，供开始界面勾选挂载
// ============================================================

import { CORE_DLC_META } from './core/manifest';

export interface DLCMeta {
  id: string;
  name: string;
  description: string;
  version: string;
  type: 'core' | 'content-pack' | 'expansion';
  required: boolean;
}

/** 所有可用 DLC 包的元信息列表（按加载顺序排列） */
export const ALL_DLCS: DLCMeta[] = [
  CORE_DLC_META,
  // 新 DLC 在此追加，如:
  // { id: 'cp-01', name: '凡人修仙', description: '...', version: '1.0.0', type: 'content-pack', required: false },
];

/** 获取默认启用的 DLC ID 列表 */
export function getDefaultEnabledDLCs(): string[] {
  return ALL_DLCS.filter(d => d.required).map(d => d.id);
}
