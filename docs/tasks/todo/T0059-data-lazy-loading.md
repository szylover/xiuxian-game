# T0059 — 数据懒加载 & Bundle 分割

**类型**: feat  
**状态**: 📐 设计完成，待实现  
**创建日期**: 2025-01-27  
**Spec**: [docs/specs/T0059-data-lazy-loading.md](../../specs/T0059-data-lazy-loading.md)

## 背景

随着内容包（CP-01~CP-05）加入，游戏数据量将从当前 ~420KB 增长至 2MB+。  
当前所有 JSON 数据通过静态 import 打入单一 bundle，无法利用浏览器缓存分离，  
也无法实现启动速度优化。

## 目标

- **Phase 1**：Vite Manual Chunks — 拆分 vendor / game-data / logic，分离缓存
- **Phase 2**：异步数据注册 — StartScreen 立即渲染，数据后台加载（< 500ms 完成）
- **Phase 3**（规划）：DLC 内容包按需动态加载

## 影响文件

### Phase 1
- `vite.config.ts`

### Phase 2
- `src/game/registry/stores.ts`
- `src/game/events.ts`
- `src/hooks/useGameEngine.ts`
- `src/App.tsx`
- `src/components/screens/StartScreen.tsx`

## 前置任务

无

## 验收标准

- Phase 1: `npm run build` 产出 3 个 chunk，只改数据时只有 game-data chunk hash 变化
- Phase 2: 慢网络下 StartScreen 立即可见，按钮在数据就绪前 disabled
