// ============================================================
// GameLog.jsx — 游戏日志面板
// ============================================================

export default function GameLog({ logs }) {
  return (
    <div className="game-log">
      <h3>📜 日志</h3>
      <div className="log-list">
        {logs.length === 0 && <p className="log-empty">暂无日志…</p>}
        {logs.map((entry) => (
          <div key={entry.id} className="log-entry">
            {entry.text}
          </div>
        ))}
      </div>
    </div>
  );
}
