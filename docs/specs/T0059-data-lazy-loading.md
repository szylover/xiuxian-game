# 设计文档：数据懒加载 & Bundle 分割
任务：T0059  
日期：2025-01-27

## 概述

随着内容包（CP-01~CP-05）不断加入，游戏数据量将从当前 ~420KB 增长至 2MB+。
由于所有 JSON 文件都是**静态 import**（`events.ts` 顶层 import），Vite 会将它们全部打入主 bundle。
本任务通过**两阶段改造**解决此问题：

- **Phase 1（Vite 分块）**：零代码改动，拆分 bundle → 分离缓存，5 分钟完成  
- **Phase 2（异步注册）**：将数据注册改为动态 import，让 StartScreen 立即渲染，数据后台加载

---

## 数据结构

无新增类型。仅新增一个模块级状态标记：

```ts
// src/game/registry/stores.ts 新增
export let isDataReady = false;
export function markDataReady() { isDataReady = true; }
```

`useGameEngine.ts` 新增 React state：

```ts
const [dataLoading, setDataLoading] = useState(true);
```

---

## 游戏逻辑方案（@Dev）

### Phase 1：Vite Manual Chunks（零风险，立即执行）

#### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `vite.config.ts` | 添加 `build.rollupOptions.output.manualChunks` | 拆分 vendor / data / logic 三个 chunk |

**具体改动（vite.config.ts）：**

```ts
// 伪代码，说明意图——@Dev 实现
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks: {
          // React 单独 chunk：版本不变时用户永不重新下载
          'vendor': ['react', 'react-dom'],
          // 所有 core 数据单独 chunk：只有数据变更时才重下载
          'game-data': [
            'src/data/core-events.json',
            'src/data/core-items.json',
            'src/data/core-equips.json',
            'src/data/core-recipes.json',
            'src/data/core-smithing.json',
            'src/data/core-techniques.json',
            'src/data/core-shop.json',
          ],
        },
      },
    },
  },
});
```

**效果：**
- `vendor.[hash].js`：React，版本不变 → 浏览器永久缓存
- `game-data.[hash].js`：所有 JSON，只改数据时才失效
- `index.[hash].js`：游戏逻辑 + 组件，迭代最频繁

> ⚠️ Phase 1 **不改变加载时序**，三个 chunk 仍然都在启动时同步加载。
> 核心收益是**缓存分离**，减少重复下载。

---

### Phase 2：异步数据注册（可选，独立 PR）

将 `events.ts` 的数据注册从「模块导入时同步执行」改为「显式调用的异步函数」。

#### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/events.ts` | 将 `registerDLC(...)` 调用包裹进 `export async function initCoreData()` | 触发动态 import，数据不再打入主 chunk |
| `src/game/registry/stores.ts` | 新增 `isDataReady` flag + `markDataReady()` | 让 hooks 感知初始化状态 |
| `src/hooks/useGameEngine.ts` | 启动时调用 `initCoreData()`，管理 `dataLoading` state | 驱动 UI loading 状态 |
| `src/App.tsx` | 将 `dataLoading` 传给 `StartScreen` | 让开始界面显示加载中 |
| `src/components/screens/StartScreen.tsx` | 接收 `dataLoading` prop，"新游戏"/"读档"按钮在加载完成前 disabled | 防止数据未就绪时进入游戏 |

#### events.ts 改造方案（伪代码）

```ts
// 改造前（同步，打入主 bundle）
import coreEventsJson from '../data/core-events.json';
import coreItemsJson  from '../data/core-items.json';
// ... 其余 import ...
registerDLC({ ...pack, events, items, ... });  // 模块加载时立即执行

// 改造后（异步，数据独立 chunk）
export async function initCoreData(): Promise<void> {
  const [
    { default: coreEventsJson },
    { default: coreItemsJson },
    // ... 其余动态 import ...
  ] = await Promise.all([
    import('../data/core-events.json'),
    import('../data/core-items.json'),
    // ...
  ]);
  // 同样的 loader 处理逻辑
  const events = loadEvents(coreEventsJson);
  // ...
  registerDLC({ ...pack, events, items, ... });
  markDataReady();
}
```

#### useGameEngine.ts 改造方案（伪代码）

```ts
const [dataLoading, setDataLoading] = useState(true);

useEffect(() => {
  initCoreData().then(() => {
    setDataLoading(false);
    // 如有存档，触发 loadSave()
  });
}, []);

// 向上返回 dataLoading
return { ..., dataLoading };
```

#### 加载时序对比

```
【改造前】
浏览器下载 index.js (含所有 JSON) → 解析 750KB → React 渲染 StartScreen

【改造后】
浏览器下载 index.js (~200KB)
→ React 立刻渲染 StartScreen（"加载中..."按钮 disabled）
→ 异步下载 game-data.js (~120KB minified)
→ initCoreData() 完成 → 按钮变为可用
```

---

### Phase 3：未来 DLC 按需加载（规划，不在本任务实现）

当 CP-01 等内容包开发时，每个 DLC 应作为独立的动态 chunk：

```ts
// DLC 加载器（未来 T0057/T0058 实现时添加）
async function loadContentPack(packId: 'cp-01' | 'cp-02' | ...) {
  const { default: pack } = await import(`../data/${packId}/index.json`);
  registerDLC(pack);
}
```

这样玩家激活某内容包时才下载对应数据，不激活永不下载。

---

## UI 方案（@Designer）

### Phase 1

无 UI 变化。

### Phase 2

#### StartScreen 加载状态

| 元素 | 位置 | 内容 |
|------|------|------|
| 按钮状态 | StartScreen 的「新游戏」「读档」按钮 | `dataLoading=true` 时 `disabled`，附加 `opacity-50 cursor-wait` 样式 |
| 提示文字 | 按钮下方或按钮内 | `dataLoading=true` 时显示细小灰字「游戏数据加载中…」或按钮内 spinner |

#### 交互说明

- 加载期间（通常 < 200ms 本地，< 500ms 网络慢）按钮不可点击
- 加载完成后按钮瞬间变为可用，无动画跳变（`transition-opacity`）
- 不显示全屏 loading 遮罩 — 游戏标题和背景立即可见，体验更好

---

## 验证方式

### Phase 1 验证

1. 运行 `npm run build`
2. 检查 `build/` 目录，确认存在三个 JS 文件：
   - `vendor-[hash].js`（约 150KB）
   - `game-data-[hash].js`（约 100-150KB minified）
   - `index-[hash].js`（游戏逻辑，应 < 200KB）
3. 修改 `core-events.json` 任意字段，重新 build，验证只有 `game-data` hash 改变，`vendor` hash 不变
4. 运行 `npm run preview`，游戏功能正常

### Phase 2 验证

1. 打开 Chrome DevTools → Network → 勾选 "Slow 3G"
2. 刷新页面，观察 StartScreen 渲染时序：
   - ✅ 游戏标题/界面立即出现（不等 game-data.js 下载）
   - ✅ 「新游戏」按钮初始为 disabled 状态
   - ✅ game-data.js 下载完成后按钮变为可用
3. 点击「新游戏」→ 游戏正常开始，所有事件/物品/功法可用
4. 点击「读档」→ 存档正常加载

### 测试用例

| 场景 | 预期结果 |
|------|---------|
| 正常构建 | 生成 3 个 chunk，无编译错误 |
| 只改 core-events.json，重新 build | 只有 game-data chunk hash 变化 |
| 慢网络下刷新页面 | StartScreen 立即渲染，按钮 disabled 直到数据就绪 |
| 数据加载完成后点击新游戏 | 游戏正常运行，所有注册表有数据 |
| 数据加载完成后点击读档 | 存档正常恢复 |
| 刷新后立即疯狂点击按钮 | 按钮 disabled 期间点击无效，不崩溃 |

---

## 调试面板需求

无需更新 Debug 面板。

可选：在 Debug 面板的现有信息区域新增一行只读状态：

```
数据状态: ● 已就绪  （isDataReady = true 时显示绿点）
```

---

## 依赖关系

- **前置任务**：无（独立改进，可随时实现）
- **后续任务**：
  - T0057（任务链）、T0058（境界 DLC 化）实现时，参考 Phase 3 方案为各 DLC 添加动态 chunk
  - CP-01~05 内容包实现时，每个包作为独立 async chunk 加载

---

## 实施步骤清单

### Phase 1（推荐立即执行，~30 分钟）

- [ ] 修改 `vite.config.ts`：添加 `manualChunks`，将 react/react-dom 归入 `vendor`，将 7 个 JSON 文件归入 `game-data`
- [ ] `npm run build` 验证产出 3 个 chunk
- [ ] `npm run preview` 验证功能无回归

### Phase 2（可在 Phase 1 之后独立 PR，~3 小时）

- [ ] `src/game/registry/stores.ts`：新增 `isDataReady` + `markDataReady()`
- [ ] `src/game/events.ts`：将顶层 import + registerDLC 调用包裹进 `export async function initCoreData()`，内部改用 `Promise.all([import(...)])`
- [ ] `src/hooks/useGameEngine.ts`：新增 `dataLoading` state，在 `useEffect` 中调用 `initCoreData()`，完成后 `setDataLoading(false)`
- [ ] `src/App.tsx`：将 `dataLoading` 传入 `StartScreen`
- [ ] `src/components/screens/StartScreen.tsx`：按钮在 `dataLoading=true` 时 disabled，显示加载提示
- [ ] 慢网络测试，验证时序正确
- [ ] 验证存档读取/新游戏流程无回归

### Phase 3（未来随 DLC 实现）

- [ ] 为每个 CP/EXP 包创建独立数据入口文件
- [ ] 编写 `loadContentPack(packId)` 异步加载器
- [ ] 在 DLC 激活 UI 中调用加载器
