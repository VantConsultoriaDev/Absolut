import React from 'react';
import toast, { Toast } from 'react-hot-toast';
import { X, CheckCircle, AlertTriangle, Loader2, Info } from 'lucide-react';

interface ToastContentProps {
  t: Toast;
  message: string;
  type: 'success' | 'error' | 'loading' | 'info';
}

const iconMap = {
  success: CheckCircle,
  error: AlertTriangle,
  loading: Loader2,
  info: Info,
};

const colorMap = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  loading: 'text-blue-500',
  info: 'text-gray-500',
};

const ToastContent: React.FC<ToastContentProps> = ({ t, message, type }) => {
  const IconComponent = iconMap[type];
  const iconColor = colorMap[type];
  const isDark = document.documentElement.classList.contains('dark');

  return (
    <div
      className={`flex items-center justify-between w-full p-3 rounded-lg shadow-lg transition-all duration-300 ${
        isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'
      }`}
      style={{ opacity: t.visible ? 1 : 0, transform: `translateY(${t.visible ? 0 : t.position?.includes('top') ? -40 : 40}px)` }}
    >
      <div className="flex items-center flex-1">
        <IconComponent className={`h-5 w-5 mr-3 flex-shrink-0 ${iconColor} ${type === 'loading' ? 'animate-spin' : ''}`} />
        <span className="text-sm font-medium text-slate-900 dark:text-slate-50 break-words pr-2">
          {message}
        </span>
      </div>
      <button
        onClick={() => toast.dismiss(t.id)}
        className="ml-4 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
        aria-label="Fechar notificação"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ToastContent;