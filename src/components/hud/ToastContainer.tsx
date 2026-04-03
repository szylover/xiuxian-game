// ============================================================
// hud/ToastContainer.tsx — 单条消息条（替代多条 Toast 气泡）
// ============================================================

import type { ToastMessage } from '../../hooks/useToast';
import { LOG_COLORS } from '../../hooks/useGameLog';
import './ToastContainer.css';

interface ToastBarProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export default function ToastContainer({ toast, onDismiss }: ToastBarProps) {
  if (!toast) return null;

  return (
    <div
      className={`toast-bar ${toast.fading ? 'toast-fade-out' : 'toast-fade-in'}`}
      style={{ '--toast-border-color': LOG_COLORS[toast.category] || LOG_COLORS.default } as React.CSSProperties}
      onClick={onDismiss}
    >
      {toast.text}
    </div>
  );
}
