import React from 'react';
import { X, Bell, Clock, Calendar, Check } from 'lucide-react';
import { useModal } from '../hooks/useModal';
import { useAgenda } from './AgendaContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const NotificationModal: React.FC = () => {
  const { pendingNotifications, dismissNotification, updateItem } = useAgenda();
  const { modalRef } = useModal({ isOpen: pendingNotifications.length > 0, onClose: () => {} }); // Não fecha no clique fora

  if (pendingNotifications.length === 0) return null;
  
  // Exibe apenas a notificação mais urgente (a primeira da lista)
  const notification = pendingNotifications[0];
  
  const handleDismiss = () => {
      dismissNotification(notification.id);
  };
  
  const handleComplete = () => {
      updateItem(notification.id, { isCompleted: true });
      dismissNotification(notification.id);
  };
  
  const timeDisplay = notification.dueTime ? `às ${notification.dueTime}` : '';
  const dateDisplay = notification.dueDate ? format(notification.dueDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Sem Data';
  
  // CORREÇÃO: Usa fuchsia-600 para Urgente
  const urgencyColor = notification.urgency === 'Urgente' ? 'text-fuchsia-600' : notification.urgency === 'Normal' ? 'text-amber-600' : 'text-blue-600';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70]">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4 border-b pb-3 border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Bell className={`h-6 w-6 mr-3 flex-shrink-0 ${urgencyColor}`} />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Lembrete de Compromisso
              </h3>
            </div>
            <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-3 mb-6">
            <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{notification.title}</p>
            
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Data: <span className="font-medium">{dateDisplay}</span>
                </p>
                {notification.dueTime && (
                    <p className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        Hora: <span className="font-medium">{timeDisplay}</span>
                    </p>
                )}
                {notification.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 pt-2 whitespace-pre-wrap">{notification.description}</p>
                )}
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleDismiss}
              className="flex-1 btn-secondary"
            >
              Dispensar
            </button>
            <button
              onClick={handleComplete}
              className="flex-1 btn-success"
            >
              <Check className="h-5 w-5 mr-1" /> Concluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;