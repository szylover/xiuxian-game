// ============================================================
// shared/TabBar.tsx — 标签切换栏
// 用于背包分类、商店买卖、调试面板等场景
// ============================================================

import './TabBar.css';

interface Tab<T extends string> {
  key: T;
  label: string;
  icon?: string;
}

interface TabBarProps<T extends string> {
  tabs: Tab<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  className?: string;
  tabClassName?: string;
  extra?: React.ReactNode;
}

export default function TabBar<T extends string>({
  tabs,
  activeKey,
  onChange,
  className = 'inventory-tabs',
  tabClassName = 'inventory-tab',
  extra,
}: TabBarProps<T>) {
  return (
    <div className={className}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={`${tabClassName} ${activeKey === tab.key ? 'active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.icon && `${tab.icon} `}{tab.label}
        </button>
      ))}
      {extra}
    </div>
  );
}
