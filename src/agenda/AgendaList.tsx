import React, { useMemo, useState } from 'react';
import { format, isToday, isPast, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Clock, AlertTriangle, Calendar, MoreVertical, Trash2, Edit, Plus } from 'lucide-react';
import { useAgenda } from './AgendaContext';
import { AgendaItem, initialAgendaItem } from './types';

interface AgendaListProps {
  onEdit: (item: AgendaItem) => void;
  onDelete: (id: string, title: string) => void;
}

const AgendaList: React.FC<AgendaListProps> = ({ onEdit, onDelete }) => {
  const { items, toggleCompletion, addItem } = useAgenda();
  const [filterUrgency, setFilterUrgency] = useState<'Todos' | AgendaItem['urgency']>('Todos');
  const [quickTitle, setQuickTitle] = useState('');

  const urgencyOrder = useMemo(() => ({ Urgente: 1, Normal: 2, Leve: 3 }), []);
  
  const urgencyConfig = useMemo(() => ({
    Urgente: { color: 'bg-red-600', text: 'text-red-600', border: 'border-red-600' },
    Normal: { color: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-600' },
    Leve: { color: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600' },
  }), []);

  const sortedItems = useMemo(() => {
    // 1. Filtra itens não concluídos
    let activeItems = items.filter(item => !item.isCompleted);
    
    // 2. Filtra por Urgência
    if (filterUrgency !== 'Todos') {
        activeItems = activeItems.filter(item => item.urgency === filterUrgency);
    }
    
    const itemsWithDate = activeItems.filter(item => item.dueDate);
    const itemsWithoutDate = activeItems.filter(item => !item.dueDate);

    // Ordena itens com data: Atrasados > Hoje > Futuros (por data)
    itemsWithDate.sort((a, b) => {
      const dateA = a.dueDate!;
      const dateB = b.dueDate!;
      
      // Prioriza Atrasados
      const isPastA = isPast(dateA) && !isToday(dateA);
      const isPastB = isPast(dateB) && !isToday(dateB);
      if (isPastA && !isPastB) return -1;
      if (!isPastA && isPastB) return 1;
      
      // Ordena por data (mais antiga primeiro)
      const dateComparison = dateA.getTime() - dateB.getTime();
      if (dateComparison !== 0) return dateComparison;
      
      // Desempate por Urgência
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
    
    // Ordena itens sem data por urgência (Urgente > Normal > Leve)
    itemsWithoutDate.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    return {
      overdue: itemsWithDate.filter(item => isPast(item.dueDate!) && !isToday(item.dueDate!)),
      today: itemsWithDate.filter(item => isToday(item.dueDate!)),
      future: itemsWithDate.filter(item => isFuture(item.dueDate!) && !isToday(item.dueDate!)),
      noDate: itemsWithoutDate,
      completed: items.filter(i => i.isCompleted).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    };
  }, [items, filterUrgency, urgencyOrder]);
  
  const handleQuickAdd = (e: React.FormEvent) => {
      e.preventDefault();
      if (!quickTitle.trim()) return;
      
      addItem({
          ...initialAgendaItem,
          title: quickTitle.trim(),
          urgency: 'Normal', // Padrão para Normal
      });
      setQuickTitle('');
  };

  const renderItem = (item: AgendaItem) => {
    const isOverdue = item.dueDate && isPast(item.dueDate) && !isToday(item.dueDate);
    const config = urgencyConfig[item.urgency];
    
    const dateDisplay = item.dueDate 
      ? isToday(item.dueDate) 
        ? 'Hoje' 
        : format(item.dueDate, 'dd MMM', { locale: ptBR })
      : 'Sem Data';
      
    const dateColor = isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400';
    
    return (
      <div key={item.id} className="group flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        
        {/* Checkbox e Título */}
        <div className="flex items-center flex-1 min-w-0">
          <button 
            onClick={() => toggleCompletion(item.id)}
            className={`h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors mr-3 ${
              item.isCompleted 
                ? 'bg-green-500 border-green-500 text-white' 
                : `${config.border} text-transparent hover:bg-gray-200 dark:hover:bg-gray-600`
            }`}
            title="Marcar como concluído"
          >
            <Check className="h-4 w-4" />
          </button>
          <span className={`text-sm font-medium truncate ${item.isCompleted ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
            {item.title}
          </span>
        </div>
        
        {/* Data e Ações */}
        <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
          
          {/* Data/Hora */}
          <div className={`text-xs font-medium ${dateColor} flex items-center space-x-1`}>
            {item.dueTime && <Clock className="h-3 w-3" />}
            <span>{dateDisplay}</span>
            {item.dueTime && <span>{item.dueTime}</span>}
          </div>
          
          {/* Urgência (Badge AT) */}
          <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
            config.color
          }`} title={`Urgência: ${item.urgency}`}>
            {item.urgency.substring(0, 1).toUpperCase()}
          </span>
          
          {/* Menu de Ações (Corrigido: hidden group-hover:block) */}
          <div className="relative">
            <button className="btn-ghost p-1 rounded-full text-gray-400 hover:text-gray-700">
              <MoreVertical className="h-4 w-4" />
            </button>
            <div className="absolute right-0 top-full mt-1 z-10 hidden group-hover:block card w-32 p-1">
              <button 
                onClick={() => onEdit(item)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                <Edit className="h-4 w-4" /> Editar
              </button>
              <button 
                onClick={() => onDelete(item.id, item.title)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              >
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (title: string, items: AgendaItem[], isOverdue = false) => {
    if (items.length === 0) return null;
    
    const total = items.length;
    const completed = items.filter(i => i.isCompleted).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
      <div className="space-y-2">
        <h4 className={`text-sm font-semibold uppercase tracking-wider ${isOverdue ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>
          {title} ({total})
        </h4>
        {isOverdue && (
            <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                Atenção: {total} tarefas atrasadas.
            </div>
        )}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {items.map(renderItem)}
        </div>
        
        {/* Barra de Progresso (Apenas para Hoje) */}
        {title === 'Hoje' && (
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 pt-2">
                <div className="flex-1 h-1 bg-gray-200 rounded-full">
                    <div className="h-1 bg-green-500 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                <span>{progress}% concluído</span>
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
        {/* Filtro de Urgência */}
        <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar por Urgência:</label>
            <select
                value={filterUrgency}
                onChange={(e) => setFilterUrgency(e.target.value as 'Todos' | AgendaItem['urgency'])}
                className="input-field w-36 h-10 text-sm"
            >
                <option value="Todos">Todos</option>
                <option value="Urgente">Urgente</option>
                <option value="Normal">Normal</option>
                <option value="Leve">Leve</option>
            </select>
        </div>
        
        {/* Input de Criação Rápida */}
        <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
            <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Adicionar nova tarefa rápida (padrão: Normal)"
                className="input-field flex-1"
            />
            <button type="submit" className="btn-primary px-4 py-2" disabled={!quickTitle.trim()}>
                <Plus className="h-5 w-5" />
            </button>
        </form>

      {renderSection('Atrasadas', sortedItems.overdue, true)}
      {renderSection('Hoje', sortedItems.today)}
      {renderSection('Próximos Compromissos', sortedItems.future)}
      {renderSection('Tarefas Sem Data', sortedItems.noDate)}
      
      {sortedItems.completed.length > 0 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Concluídas</h4>
              <div className="space-y-1">
                  {sortedItems.completed.map(renderItem)}
              </div>
          </div>
      )}
      
      {items.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Calendar className="h-8 w-8 mx-auto mb-3" />
              Nenhum item na agenda. Adicione uma tarefa ou compromisso!
          </div>
      )}
    </div>
  );
};

export default AgendaList;