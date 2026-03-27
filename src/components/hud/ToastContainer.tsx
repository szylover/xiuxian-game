// ============================================================
// hud/ToastContainer.tsx — Toast 气泡容器
// ============================================================

import type { ToastMessage } from '../../hooks/useToast';
import { LOG_COLORS } from '../../hooks/useGameLog';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast-item ${toast.fading ? 'toast-fade-out' : 'toast-fade-in'}`}
          style={{ borderLeftColor: LOG_COLORS[toast.category] || LOG_COLORS.default }}
          onClick={() => onDismiss(toast.id)}
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
