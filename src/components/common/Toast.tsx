// Toast Notification Component
import { useToastStore } from '../../store';
import './Toast.css';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type}`}
          role="alert"
          style={{ '--duration': `${toast.duration ?? 5000}ms` } as React.CSSProperties}
        >
          <div className="toast__progress-inward"></div>
          <div className="toast__icon">{getIcon(toast.type)}</div>
          <div className="toast__content">
            {toast.type === 'alert' && <div className="toast__alert-title">SERVICE ALERT</div>}
            {toast.type === 'success' && <div className="toast__alert-title">TRANSFER COMPLETE</div>}
            {toast.type === 'error' && <div className="toast__alert-title">TRANSFER FAILED</div>}
            {toast.type === 'lock' && <div className="toast__alert-title">ITEM LOCKED</div>}
            {toast.type === 'unlock' && <div className="toast__alert-title">ITEM UNLOCKED</div>}
            <p className="toast__message">{toast.message}</p>
          </div>
          <button
            className="toast__close"
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

function getIcon(type: string) {
  switch (type) {
    case 'success':
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );
    case 'error':
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      );
    case 'warning':
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      );
    case 'alert':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle cx="12" cy="12" r="10" fill="#dc2626" />
          <path d="M12 7v6M12 16h.01" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'lock':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      );
    case 'unlock':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 019.9-1" />
        </svg>
      );
    case 'info':
    default:
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      );
  }
}

// Hook to easily show toasts
export function useToast() {
  const addToast = useToastStore((state) => state.addToast);

  return {
    success: (message: string) => addToast({ type: 'success', message }),
    error: (message: string) => addToast({ type: 'error', message }),
    warning: (message: string) => addToast({ type: 'warning', message }),
    info: (message: string) => addToast({ type: 'info', message }),
    alert: (message: string) => addToast({ type: 'alert', message }),
  };
}
