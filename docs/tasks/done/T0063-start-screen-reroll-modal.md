# T0063 — 开始界面改版：随机角色弹窗

| 字段 | 值 |
|------|------|
| ID | T0063 |
| 类型 | feat |
| 状态 | ✅ 已完成 |
| 完成日期 | 2026-03-31 |
| 前置 | T0056 |
| Spec | [T0063-start-screen-reroll-modal.md](../../specs/T0063-start-screen-reroll-modal.md) |

## 描述

将 StartScreen 右侧的大面积天赋属性展示移入"随机角色"弹窗，主页只保留基本信息 + 随机按钮 + 天赋摘要。弹窗内支持每个属性独立锁定（5 把锁），替换原来的 4 分类粗粒度锁。

## 关键文件

- `src/components/screens/RerollModal.tsx` — 随机角色弹窗组件
- `src/components/screens/StartScreen.tsx` — 重构为居中单栏布局
- `src/App.css` — 弹窗样式 + 新布局样式

## 交付物

- [x] 重构 `StartScreen.tsx`：移除右侧天赋区域，新增"随机角色"按钮和天赋摘要
- [x] 新增 `RerollModal.tsx`：随机角色弹窗，支持细粒度锁定
- [x] 更新 `App.css`：弹窗样式 + 主页布局调整
- [x] 更新 `docs/test-guide.md`：追加测试用例
- [x] 更新 `src/data/changelog.ts`：追加版本条目
