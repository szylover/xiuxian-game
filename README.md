# 修仙小游戏 🏔️

一款网页版文字修仙模拟游戏，基于 React + JavaScript 开发，部署在 Azure Static Web Apps 上。

## 游戏特色

- **修炼体系**：炼气 → 筑基 → 金丹 → 元婴 → 化神 → 渡劫 → 大乘 → 飞升
- **战斗系统**：与妖兽、其他修士切磋
- **丹药炼制**：采集灵草，炼制丹药辅助修炼
- **随机事件**：奇遇、劫难、天降机缘

## 技术栈

- **框架**：React + JavaScript（Vite 构建）
- **部署**：Azure Static Web Apps
- **存储**：localStorage（纯前端，零后端）

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 部署

推送到 GitHub 后，Azure Static Web Apps 会通过 GitHub Actions 自动构建并部署 `dist/` 目录。

## 许可证

MIT
