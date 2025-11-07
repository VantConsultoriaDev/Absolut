import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, Calendar } from 'lucide-react';
import { useModal } from '../hooks/useModal';
import { AgendaItem, initialAgendaItem } from './types';
import { format, isValid } from 'date-fns';
import ConfirmationModal from '../components/ConfirmationModal';

interface AgendaFormModalProps {
  isOpen: boolean;
  editingItem: AgendaItem | null;
  onClose: () => void;
  onSubmit: (data: Omit<AgendaItem, 'id' | 'createdAt' | 'updatedAt' | 'isCompleted'>) => void;
}

const AgendaFormModal: React.FC<AgendaFormModalProps> = ({ isOpen, editingItem, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<Omit<AgendaItem, 'id' | 'createdAt' | 'updatedAt' | 'isCompleted'>>(initialAgendaItem);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const { modalRef } = useModal({ isOpen, onClose: () => {
      if (hasChanges) {
          setShowConfirm(true);
      } else {
          onClose();
      }
  }});

  // Inicializa o formulário com os dados de edição ou dados iniciais
  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setFormData({
          title: editingItem.title,
          description: editingItem.description || '',
          urgency: editingItem.urgency,
          // Converte Date para string YYYY-MM-DD para o input type="date"
          dueDate: editingItem.dueDate,
          dueTime: editingItem.dueTime || '',
          notificationOffset: editingItem.notificationOffset || 30,
        });
      } else {
        setFormData(initialAgendaItem);
      }
    }
  }, [isOpen, editingItem]);
  
  // Verifica se há alterações (simplificado)
  const hasChanges = useMemo(() => {
      if (!isOpen) return false;
      const current = JSON.stringify(formData);
      const original = JSON.stringify(editingItem ? {
          title: editingItem.title,
          description: editingItem.description || '',
          urgency: editingItem.urgency,
          dueDate: editingItem.dueDate,
          dueTime: editingItem.dueTime || '',
          notificationOffset: editingItem.notificationOffset || 30,
      } : initialAgendaItem);
      return current !== original;
  }, [formData, editingItem, isOpen]);

  const handleFormChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleDateChange = (dateStr: string) => {
      if (!dateStr) {
          handleFormChange('dueDate', undefined);
      } else {
          // Cria um objeto Date a partir da string YYYY-MM-DD
          const date = new Date(dateStr + 'T00:00:00');
          handleFormChange('dueDate', date);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
        alert('O título é obrigatório.');
        return;
    }
    
    // Validação de data/hora
    if (formData.dueTime && !formData.dueDate) {
        alert('Se a hora for definida, a data também deve ser definida.');
        return;
    }
    
    // Converte a data para o formato correto antes de submeter
    const dataToSubmit: Omit<AgendaItem, 'id' | 'createdAt' | 'updatedAt' | 'isCompleted'> = {
        ...formData,
        // Garante que dueDate seja Date ou undefined
        dueDate: formData.dueDate && isValid(formData.dueDate) ? formData.dueDate : undefined,
        // Garante que dueTime seja string ou undefined
        dueTime: formData.dueTime || undefined,
        // Garante que notificationOffset seja 0 se não houver hora
        notificationOffset: formData.dueTime ? (formData.notificationOffset || 0) : 0,
    };
    
    onSubmit(dataToSubmit);
    onClose(); // Fecha o modal após submissão
  };
  
  // Converte Date para string YYYY-MM-DD para o input
  const dateString = formData.dueDate && isValid(formData.dueDate) ? format(formData.dueDate, 'yyyy-MM-dd') : '';

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingItem ? 'Editar Item' : 'Novo Item da Agenda'}
              </h3>
              <button onClick={() => {
                  if (hasChanges) {
                      setShowConfirm(true);
                  } else {
                      onClose();
                  }
              }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              
              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição (Opcional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  className="input-field"
                  rows={2}
                />
              </div>
              
              {/* Urgência */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Urgência</label>
                <select
                  value={formData.urgency}
                  onChange={(e) => handleFormChange('urgency', e.target.value as AgendaItem['urgency'])}
                  className="input-field"
                >
                  <option value="Urgente">Urgente</option>
                  <option value="Normal">Normal</option>
                  <option value="Leve">Leve</option>
                </select>
              </div>

              {/* Data e Hora */}
              <div className="grid grid-cols-2 gap-4 border border-gray-200 dark:border-gray-700 p-3 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> Data
                  </label>
                  <input
                    type="date"
                    value={dateString}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                    <Clock className="h-4 w-4" /> Hora (Opcional)
                  </label>
                  <input
                    type="time"
                    value={formData.dueTime}
                    onChange={(e) => handleFormChange('dueTime', e.target.value)}
                    className="input-field"
                    disabled={!formData.dueDate}
                  />
                </div>
              </div>
              
              {/* Notificação (Apenas se houver hora) */}
              {formData.dueTime && formData.dueDate && (
                  <div className="border border-blue-200 dark:border-blue-700 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                          Notificação (Alerta Modal)
                      </label>
                      <select
                          value={formData.notificationOffset}
                          onChange={(e) => handleFormChange('notificationOffset', parseInt(e.target.value))}
                          className="input-field"
                      >
                          <option value={0}>Na hora exata</option>
                          <option value={15}>15 minutos antes</option>
                          <option value={30}>30 minutos antes</option>
                          <option value={60}>1 hora antes</option>
                          <option value={120}>2 horas antes</option>
                      </select>
                  </div>
              )}

              <div className="flex space-x-4 pt-4">
                <button type="button" className="btn-secondary flex-1" onClick={() => {
                    if (hasChanges) {
                        setShowConfirm(true);
                    } else {
                        onClose();
                    }
                }}>Cancelar</button>
                <button type="submit" className="btn-primary flex-1">
                  {editingItem ? 'Salvar Alterações' : 'Adicionar Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* Modal de Confirmação de Cancelamento */}
      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={onClose}
        title="Descartar Alterações"
        message="Você tem alterações não salvas. Deseja descartá-las e fechar o formulário?"
        confirmText="Descartar e Fechar"
        variant="warning"
      />
    </>
  );
};

export default AgendaFormModal;