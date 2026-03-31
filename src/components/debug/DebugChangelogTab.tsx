// ============================================================
// DebugChangelogTab.tsx — 更新日志标签页
// 展示版本历史，方便 Debug 账号追踪部署版本
// ============================================================

import { CHANGELOG, CURRENT_VERSION } from '../../data/changelog';

export default function DebugChangelogTab() {
  return (
    <div className="debug-stats">
      <div className="debug-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem', marginBottom: '0.4rem' }}>
        <span className="debug-label" style={{ fontWeight: 'bold' }}>📋 当前版本</span>
        <span style={{ fontSize: '0.85rem', color: '#4CAF50', fontFamily: 'monospace', fontWeight: 'bold' }}>
          v{CURRENT_VERSION}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '400px', overflowY: 'auto' }}>
        {CHANGELOG.map((entry) => (
          <div
            key={entry.version}
            style={{
              border: '1px solid #333',
              borderRadius: '4px',
              padding: '0.4rem 0.6rem',
              backgroundColor: entry.version === CURRENT_VERSION ? 'rgba(76,175,80,0.08)' : 'transparent',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.8rem', color: entry.version === CURRENT_VERSION ? '#4CAF50' : '#aaa', fontFamily: 'monospace', fontWeight: 'bold' }}>
                v{entry.version}
                {entry.version === CURRENT_VERSION && (
                  <span style={{ fontSize: '0.68rem', color: '#81C784', marginLeft: '0.4rem' }}>← 当前</span>
                )}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#666' }}>{entry.date}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#ccc', marginBottom: '0.2rem' }}>{entry.title}</div>
            <ul style={{ margin: 0, paddingLeft: '1rem', listStyle: 'disc' }}>
              {entry.items.map((item, i) => (
                <li key={i} style={{ fontSize: '0.72rem', color: '#888', lineHeight: '1.5' }}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
