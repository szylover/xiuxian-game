// ============================================================
// SaveManagerPanel.tsx — 多存档管理面板 (T0038)
// ============================================================

import { useState, useRef } from 'react';
import type { SaveSlotPreview } from '../../hooks/useSaveLoad';
import { getSaveSlotExportData, importSaveSlot, deleteSaveSlot, listSaveSlots } from '../../hooks/useSaveLoad';
import { REALMS } from '../../game/data';

interface SaveManagerPanelProps {
  onNewGame: (slotIndex: number) => void;
  onLoadGame: (slotIndex: number) => void;
  dataReady: boolean;
  dataError?: boolean;
}

export default function SaveManagerPanel({ onNewGame, onLoadGame, dataReady, dataError }: SaveManagerPanelProps) {
  const [slots, setSlots] = useState<SaveSlotPreview[]>(() => listSaveSlots());
  const [pendingDeleteSlot, setPendingDeleteSlot] = useState<number | null>(null);
  const [importingSlot, setImportingSlot] = useState<number | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshSlots = () => setSlots(listSaveSlots());

  const handleExport = (slotIndex: number) => {
    const data = getSaveSlotExportData(slotIndex);
    if (!data) return;
    const slot = slots[slotIndex];
    const filename = `xiuxian_save_${slotIndex + 1}_${slot.name ?? 'save'}.json`;
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = (slotIndex: number) => {
    setImportingSlot(slotIndex);
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || importingSlot === null) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const json = ev.target?.result as string;
      const result = importSaveSlot(importingSlot, json);
      if (result) {
        refreshSlots();
        setImportError(null);
      } else {
        setImportError('存档文件无效，导入失败');
      }
      setImportingSlot(null);
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-imported
    e.target.value = '';
  };

  const handleDeleteConfirm = () => {
    if (pendingDeleteSlot === null) return;
    deleteSaveSlot(pendingDeleteSlot);
    refreshSlots();
    setPendingDeleteSlot(null);
  };

  const formatDate = (ts?: number) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const getRealmName = (realmIndex?: number) => {
    if (realmIndex === undefined) return '未知';
    return REALMS[realmIndex]?.name ?? '未知';
  };

  return (
    <div className="save-manager">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {importError && (
        <div className="save-import-error">{importError}</div>
      )}

      <div className="save-slot-list">
        {slots.map((slot) => (
          <div key={slot.slotIndex} className={`save-slot-card ${slot.isEmpty ? 'save-slot-empty' : 'save-slot-occupied'}`}>
            <div className="save-slot-header">
              <span className="save-slot-index">存档 {slot.slotIndex + 1}</span>
              {!slot.isEmpty && slot.savedAt && (
                <span className="save-slot-date">{formatDate(slot.savedAt)}</span>
              )}
            </div>

            {slot.isEmpty ? (
              <div className="save-slot-preview save-slot-preview-empty">
                <span className="save-slot-empty-text">— 空存档槽 —</span>
              </div>
            ) : (
              <div className="save-slot-preview">
                <span className="save-slot-name">{slot.name}</span>
                <span className="save-slot-realm">【{getRealmName(slot.realmIndex)}】</span>
                <span className="save-slot-age">{Math.floor((slot.age ?? 0) / 12)} 岁</span>
                {slot.gameYear !== undefined && (
                  <span className="save-slot-year">第 {slot.gameYear} 年</span>
                )}
              </div>
            )}

            <div className="save-slot-actions">
              {slot.isEmpty ? (
                <>
                  <button
                    className="btn btn-primary save-slot-btn"
                    onClick={() => onNewGame(slot.slotIndex)}
                    disabled={!dataReady}
                  >
                    {dataError ? '⚠️ 数据异常' : dataReady ? '＋ 新建' : '⏳ 加载中'}
                  </button>
                  <button
                    className="btn btn-secondary save-slot-btn"
                    onClick={() => handleImportClick(slot.slotIndex)}
                    disabled={!dataReady}
                  >
                    📥 导入
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-primary save-slot-btn"
                    onClick={() => onLoadGame(slot.slotIndex)}
                    disabled={!dataReady}
                  >
                    {dataReady ? '▶ 载入' : '⏳ 加载中'}
                  </button>
                  <button
                    className="btn btn-secondary save-slot-btn"
                    onClick={() => handleExport(slot.slotIndex)}
                  >
                    📤 导出
                  </button>
                  <button
                    className="btn btn-secondary save-slot-btn"
                    onClick={() => handleImportClick(slot.slotIndex)}
                    disabled={!dataReady}
                  >
                    📥 导入
                  </button>
                  <button
                    className="btn btn-danger save-slot-btn"
                    onClick={() => setPendingDeleteSlot(slot.slotIndex)}
                  >
                    🗑️ 删除
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 删除确认弹窗 */}
      {pendingDeleteSlot !== null && (
        <div className="save-delete-overlay" onClick={() => setPendingDeleteSlot(null)}>
          <div className="save-delete-modal" onClick={e => e.stopPropagation()}>
            <div className="save-delete-title">⚠️ 确认删除</div>
            <div className="save-delete-body">
              确定要删除存档 {pendingDeleteSlot + 1} 的数据吗？<br />
              <strong>{slots[pendingDeleteSlot]?.name}</strong> 的修仙历程将永久消失。
            </div>
            <div className="save-delete-actions">
              <button className="btn btn-danger" onClick={handleDeleteConfirm}>确认删除</button>
              <button className="btn btn-secondary" onClick={() => setPendingDeleteSlot(null)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
