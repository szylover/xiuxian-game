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
  /** 异步加载函数，调用后数据注册到全局注册表 */
  loader: () => Promise<void>;
}

/** 所有可用 DLC 包的元信息列表（按加载顺序排列） */
export const ALL_DLCS: DLCMeta[] = [
  {
    ...CORE_DLC_META,
    loader: async () => {
      const { registerCoreEvents } = await import('../../game/events');
      await registerCoreEvents();
    },
  },
  {
    id: 'cp-01', name: '凡人修仙', description: '致敬凡人流 — 新增功法·物品·妖兽·NPC·任务链',
    version: '0.1.0', type: 'content-pack', required: false,
    loader: async () => {
      const { registerCP01 } = await import('./cp-01-fanren/loader');
      await registerCP01();
    },
  },
  {
    id: 'cp-02', name: '苟道求真', description: '苟道流 — 新增谨慎生存主题事件·物品·妖兽·功法·任务链',
    version: '1.0.0', type: 'content-pack', required: false,
    loader: async () => {
      const { registerCP02 } = await import('./cp-02-goudao/loader');
      await registerCP02();
    },
  },
  {
    id: 'cp-03', name: '仙道飞升', description: '仙界/飞升主题 — 新增仙道境界·事件·物品·妖兽·功法·任务链',
    version: '1.0.0', type: 'content-pack', required: false,
    loader: async () => {
      const { registerCP03 } = await import('./cp-03-xiandao/loader');
      await registerCP03();
    },
  },
  {
    id: 'cp-04', name: '洪荒天地', description: '洪荒流主题 — 新增洪荒境界·事件·物品·妖兽·任务链',
    version: '1.0.0', type: 'content-pack', required: false,
    loader: async () => {
      const { registerCP04 } = await import('./cp-04-honghuang/loader');
      await registerCP04();
    },
  },
  {
    id: 'cp-05', name: '魔道逆天', description: '魔道流主题 — 新增魔道事件·物品·妖兽·功法·任务链',
    version: '1.0.0', type: 'content-pack', required: false,
    loader: async () => {
      const { registerCP05 } = await import('./cp-05-modao/loader');
      await registerCP05();
    },
  },
];

/** 获取默认启用的 DLC ID 列表（默认勾选 core） */
export function getDefaultEnabledDLCs(): string[] {
  return ['core'];
}

/** 按 ID 列表加载 DLC */
export async function loadDLCs(dlcIds: string[]): Promise<void> {
  const { clearAllRegistries } = await import('../../game/registry/stores');
  const { clearShopGoods } = await import('../../game/shop');
  clearAllRegistries();
  clearShopGoods();
  for (const id of dlcIds) {
    const meta = ALL_DLCS.find(d => d.id === id);
    if (meta?.loader) await meta.loader();
  }
}
