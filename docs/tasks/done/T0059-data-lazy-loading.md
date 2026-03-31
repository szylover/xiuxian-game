# T0059 — 数据懒加载 & Bundle 分割

**类型**: feat  
**状态**: ✅ 已完成  
**创建日期**: 2025-01-27  
**完成日期**: 2026-03-30  
**Spec**: [docs/specs/T0059-data-lazy-loading.md](../../specs/T0059-data-lazy-loading.md)

## 背景

随着内容包（CP-01~CP-05）加入，游戏数据量将从当前 ~420KB 增长至 2MB+。  
当前所有 JSON 数据通过静态 import 打入单一 bundle，无法利用浏览器缓存分离，  
也无法实现启动速度优化。

## 目标

- **Phase 1**：Vite Manual Chunks — 拆分 vendor / game-data / logic，分离缓存 ✅
- **Phase 2**：异步数据注册 — StartScreen 立即渲染，数据后台加载（< 500ms 完成） ✅
- **Phase 3**（规划）：DLC 内容包按需动态加载

## 关键文件

- `vite.config.ts` — manualChunks 配置
- `src/game/events.ts` — async registerCoreEvents + 动态 import
- `src/hooks/useGameEngine.ts` — dataReady / dataError 状态 + useEffect 加载
- `src/App.tsx` — 传递 dataReady/dataError 给 StartScreen
- `src/components/screens/StartScreen.tsx` — loading/error 状态禁用按钮

## 构建产出

- `vendor.[hash].js` 189 kB — React，永久缓存
- `game-data.[hash].js` 307 kB — 数据，独立缓存
- `index.[hash].js` 128 kB — 逻辑，日常更新

## 前置任务

无
