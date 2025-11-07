import React, { useState } from 'react';
import { X, Edit, Trash2, Check, Clock, Calendar, AlertTriangle, ListTodo, CornerDownRight } from 'lucide-react';
import { useModal } from '../hooks/useModal';
import { AgendaItem } from './types';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ConfirmationModal from '../components/ConfirmationModal';
import PostponeModal from './PostponeModal';

interface TaskDetailModalProps {
  isOpen: boolean;
  item: AgendaItem | null;
  onClose: () => void;
  onEdit: (item: AgendaItem) => void;
  onDelete: (id: string, title: string) => void;
  onToggleCompletion: (id: string) => void;
  onPostpone: (id: string, newDate: Date) => void;
}

const urgencyConfig = {
    Urgente: { color: 'text-red-600', border: 'border-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
    Normal: { color: 'text-amber-600', border: 'border-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    Leve: { color: 'text-blue-600', border: 'border-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
};

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  item,
  onClose,
  onEdit,
  onDelete,
  onToggleCompletion,
  onPostpone,
}) => {
  const { modalRef } = useModal({ isOpen, onClose });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPostponeModal, setShowPostponeModal] = useState(false);

  if (!isOpen || !item) return null;

  const config = urgencyConfig[item.urgency];
  const isOverdue = item.dueDate && isPast(item.dueDate) && !isToday(item.dueDate);
  
  const dateDisplay = item.dueDate 
    ? isToday(item.dueDate) 
      ? 'Hoje' 
      : format(item.dueDate, 'dd/MM/yyyy', { locale: ptBR })
    : 'Sem Data';
    
  const timeDisplay = item.dueTime ? `às ${item.dueTime}` : '';
  
  const handleConfirmDelete = () => {
    onDelete(item.id, item.title);
    setShowDeleteConfirm(false);
    onClose();
  };
  
  const handlePostponeSubmit = (newDate: Date) => {
    onPostpone(item.id, newDate);
    setShowPostponeModal(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4 border-b pb-3 border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <ListTodo className={`h-6 w-6 mr-3 flex-shrink-0 ${config.color}`} />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Detalhes da Tarefa
                </h3>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Status e Urgência */}
            <div className={`p-4 rounded-lg mb-4 border-l-4 ${config.border} ${config.bg}`}>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Urgência</p>
                <p className={`text-lg font-bold ${config.color}`}>{item.urgency}</p>
                
                <div className="mt-2 flex items-center gap-2 text-sm">
                    {item.isCompleted ? (
                        <span className="badge badge-success">
                            <Check className="h-3 w-3 mr-1" /> Concluída
                        </span>
                    ) : isOverdue ? (
                        <span className="badge badge-danger">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Atrasada
                        </span>
                    ) : (
                        <span className="badge badge-warning">
                            <Clock className="h-3 w-3 mr-1" /> Pendente
                        </span>
                    )}
                </div>
            </div>

            {/* Título e Descrição */}
            <div className="space-y-4 mb-6">
                <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{item.title}</p>
                
                {item.description && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{item.description}</p>
                    </div>
                )}
                
                {/* Data e Hora */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{dateDisplay}</span>
                    </div>
                    {item.dueTime && (
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">{timeDisplay}</span>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Ações */}
            <div className="space-y-3">
                {!item.isCompleted && (
                    <button
                        type="button"
                        onClick={() => {
                            onToggleCompletion(item.id);
                            onClose();
                        }}
                        className="btn-success w-full justify-center"
                    >
                        <Check className="h-5 w-5" /> Marcar como Concluída
                    </button>
                )}
                
                <div className="grid grid-cols-3 gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            onEdit(item);
                            onClose(); // Fecha o modal de detalhes para abrir o de formulário
                        }}
                        className="btn-secondary justify-center"
                    >
                        <Edit className="h-4 w-4" /> Editar
                    </button>
                    
                    <button
                        type="button"
                        onClick={() => setShowPostponeModal(true)}
                        className="btn-secondary justify-center"
                        disabled={item.isCompleted}
                    >
                        <CornerDownRight className="h-4 w-4" /> Adiar
                    </button>
                    
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="btn-danger justify-center"
                    >
                        <Trash2 className="h-4 w-4" /> Excluir
                    </button>
                </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de Confirmação de Exclusão */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir Tarefa"
        message={`Tem certeza que deseja excluir a tarefa "${item.title}"?`}
        confirmText="Excluir Permanentemente"
        variant="danger"
      />
      
      {/* Modal de Adiar */}
      <PostponeModal
        isOpen={showPostponeModal}
        currentDate={item.dueDate}
        onClose={() => setShowPostponeModal(false)}
        onConfirm={handlePostponeSubmit}
      />
    </>
  );
};

export default TaskDetailModal;