import React, { useMemo } from 'react';
import { X, Calendar, Clock, Check, Edit, Plus } from 'lucide-react';
import { useModal } from '../hooks/useModal';
import { AgendaItem } from './types';
import { format, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarDayModalProps {
  isOpen: boolean;
  date: Date | null;
  items: AgendaItem[];
  onClose: () => void;
  onEdit: (item: AgendaItem) => void;
  onToggleCompletion: (id: string) => void;
  onAdd: (date: Date) => void; // NOVO: Handler para adicionar item
}

const urgencyConfig = {
    Urgente: { color: 'text-red-600', border: 'border-red-600', bg: 'bg-red-100 dark:bg-red-900/50' },
    Normal: { color: 'text-amber-600', border: 'border-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    Leve: { color: 'text-blue-600', border: 'border-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
};

const CalendarDayModal: React.FC<CalendarDayModalProps> = ({
  isOpen,
  date,
  items,
  onClose,
  onEdit,
  onToggleCompletion,
  onAdd, // NOVO
}) => {
  const { modalRef } = useModal({ isOpen, onClose });

  const itemsForDay = useMemo(() => {
    if (!date) return [];
    return items
      .filter(item => item.dueDate && isSameDay(item.dueDate, date))
      .sort((a, b) => {
        // Ordena por hora, depois por urgência
        if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime);
        if (a.dueTime) return -1;
        if (b.dueTime) return 1;
        const urgencyOrder = { Urgente: 1, Normal: 2, Leve: 3 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      });
  }, [date, items]);

  if (!isOpen || !date) return null;
  
  const dateDisplay = isToday(date) ? 'Hoje' : format(date, 'EEEE, dd/MM/yyyy', { locale: ptBR });

  const renderItem = (item: AgendaItem) => {
    const config = urgencyConfig[item.urgency];
    
    return (
      <div key={item.id} className={`p-3 rounded-lg transition-colors border ${item.isCompleted ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button 
                onClick={() => onToggleCompletion(item.id)}
                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    item.isCompleted 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : `${config.border} text-transparent hover:bg-gray-200 dark:hover:bg-gray-600`
                }`}
                title="Marcar/Desmarcar"
            >
                <Check className="h-3 w-3" />
            </button>
            <span className={`text-sm font-medium truncate ${item.isCompleted ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
              {item.title}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {item.dueTime && (
                <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {item.dueTime}
                </span>
            )}
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit(item);
                }} 
                className="text-blue-500 hover:text-blue-700 p-1" 
                title="Editar"
            >
                <Edit className="h-4 w-4" />
            </button>
          </div>
        </div>
        {item.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-7 whitespace-pre-wrap">{item.description}</p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4 border-b pb-3 border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 mr-3 flex-shrink-0 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Compromissos do Dia
              </h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{dateDisplay}</h4>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {itemsForDay.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Nenhum compromisso agendado.
              </div>
            ) : (
              itemsForDay.map(renderItem)
            )}
          </div>
          
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700 mt-6 flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">
                Fechar
            </button>
            <button 
                onClick={() => onAdd(date)} 
                className="btn-primary flex-1"
            >
                <Plus className="h-5 w-5 mr-1" /> Adicionar Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarDayModal;