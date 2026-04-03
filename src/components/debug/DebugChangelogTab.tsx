// ============================================================
// DebugChangelogTab.tsx — 更新日志标签页
// 展示版本历史，方便 Debug 账号追踪部署版本
// ============================================================

import { CHANGELOG, CURRENT_VERSION } from '../../data/changelog';
import './DebugChangelogTab.css';

export default function DebugChangelogTab() {
  return (
    <div className="debug-stats">
      <div className="debug-row debug-changelog-header">
        <span className="debug-label debug-changelog-header-label">📋 当前版本</span>
        <span className="debug-changelog-current-ver">
          v{CURRENT_VERSION}
        </span>
      </div>

      <div className="debug-changelog-list">
        {CHANGELOG.map((entry) => (
          <div
            key={entry.version}
            className={`debug-changelog-entry${entry.version === CURRENT_VERSION ? ' debug-changelog-entry--current' : ''}`}
          >
            <div className="debug-changelog-entry-top">
              <span className={`debug-changelog-ver${entry.version === CURRENT_VERSION ? ' debug-changelog-ver--current' : ''}`}>
                v{entry.version}
                {entry.version === CURRENT_VERSION && (
                  <span className="debug-changelog-badge">← 当前</span>
                )}
              </span>
              <span className="debug-changelog-date">{entry.date}</span>
            </div>
            <div className="debug-changelog-title">{entry.title}</div>
            <ul className="debug-changelog-items-list">
              {entry.items.map((item, i) => (
                <li key={i} className="debug-changelog-item">{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
