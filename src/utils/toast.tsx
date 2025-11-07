import toast, { Toast } from 'react-hot-toast';
import ToastContent from '../components/ToastContent';

// Define o número máximo de toasts visíveis (excluindo os persistentes como 'loading')
const MAX_VISIBLE_TOASTS = 3;

// Função auxiliar para renderizar o toast customizado
const renderCustomToast = (message: string, type: 'success' | 'error' | 'loading' | 'info', duration?: number) => {
  
  // CORREÇÃO: Tipagem explícita para Toast[]
  const allToasts = (toast as any).toasts as Toast[] || [];
  
  // 1. Verifica os toasts visíveis que NÃO são de loading (duração infinita)
  const visibleToasts = allToasts.filter((t: Toast) => t.visible && t.duration !== Infinity);
  
  // 2. Se o limite for atingido, dispensa o mais antigo
  if (visibleToasts.length >= MAX_VISIBLE_TOASTS) {
    // Ordena pelo tempo de criação (o menor é o mais antigo)
    const oldestToast = visibleToasts.sort((a: Toast, b: Toast) => a.createdAt - b.createdAt)[0];
    if (oldestToast) {
      toast.dismiss(oldestToast.id);
    }
  }
  
  // Determina a duração final (Infinity para loading)
  const finalDuration = type === 'loading' ? Infinity : (duration !== undefined ? duration : 5000);
  
  // 3. Mostra o novo toast
  return toast.custom((t) => (
    <ToastContent t={t} message={message} type={type} />
  ), {
    duration: finalDuration,
    // Usamos a posição padrão, mas o estilo é definido no ToastContent
    style: { padding: 0, background: 'transparent', boxShadow: 'none' },
  });
};

export const showSuccess = (message: string) => {
  return renderCustomToast(message, 'success');
};

export const showError = (message: string) => {
  return renderCustomToast(message, 'error');
};

export const showLoading = (message: string) => {
  // O toast de loading é persistente (duration: Infinity) até ser dispensado via dismissToast
  return renderCustomToast(message, 'loading', Infinity);
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};