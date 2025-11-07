import React, { useState, useEffect } from 'react';
import { X, Calendar, CornerDownRight } from 'lucide-react';
import { useModal } from '../hooks/useModal';
import { format, isValid, addDays } from 'date-fns';
import { createLocalDate } from '../utils/formatters';

interface PostponeModalProps {
  isOpen: boolean;
  currentDate?: Date;
  onClose: () => void;
  onConfirm: (newDate: Date) => void;
}

const PostponeModal: React.FC<PostponeModalProps> = ({ isOpen, currentDate, onClose, onConfirm }) => {
  const initialDate = currentDate && isValid(currentDate) ? currentDate : new Date();
  const [newDateStr, setNewDateStr] = useState(format(addDays(initialDate, 1), 'yyyy-MM-dd'));
  const { modalRef } = useModal({ isOpen, onClose });

  useEffect(() => {
    if (isOpen) {
      // Sugere o dia seguinte como padrão
      const nextDay = currentDate && isValid(currentDate) ? addDays(currentDate, 1) : addDays(new Date(), 1);
      setNewDateStr(format(nextDay, 'yyyy-MM-dd'));
    }
  }, [isOpen, currentDate]);

  const handleConfirm = () => {
    const newDate = createLocalDate(newDateStr);
    if (isValid(newDate)) {
      onConfirm(newDate);
    } else {
      alert('Data inválida.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CornerDownRight className="h-5 w-5 text-blue-600" />
                Adiar Tarefa
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Selecione a nova data de vencimento para esta tarefa.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Nova Data
              </label>
              <input
                type="date"
                value={newDateStr}
                onChange={(e) => setNewDateStr(e.target.value)}
                className="input-field"
                required
              />
            </div>
            
            <div className="flex space-x-3 pt-2">
              <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancelar</button>
              <button type="button" className="btn-primary flex-1" onClick={handleConfirm} disabled={!newDateStr}>
                Confirmar Adiantamento
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostponeModal;