import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { removeToast } from '../../store/slices/uiSlice';
import { clsx } from 'clsx';

const TOAST_DURATION = 5000;

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: 'bg-white border-l-4 border-emerald-500',
  error: 'bg-white border-l-4 border-red-500',
  warning: 'bg-white border-l-4 border-amber-500',
  info: 'bg-white border-l-4 border-blue-500',
};

const iconStyles = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
};

export function ToastContainer(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector((state) => state.ui.toasts);

  useEffect(() => {
    if (toasts.length === 0) return;
    const latest = toasts[toasts.length - 1];
    if (!latest) return;
    const timer = setTimeout(() => dispatch(removeToast(latest.id)), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [toasts, dispatch]);

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={clsx(
              'flex items-start gap-3 p-4 rounded-md shadow-lg',
              styles[toast.type],
            )}
            role="alert"
          >
            <Icon className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', iconStyles[toast.type])} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
              {toast.message && (
                <p className="text-sm text-gray-600 mt-0.5">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => dispatch(removeToast(toast.id))}
              className="p-0.5 hover:bg-gray-100 rounded transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
