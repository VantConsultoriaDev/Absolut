import React from 'react';
import { X, CheckCircle } from 'lucide-react';
import { useModal } from '../hooks/useModal';

interface StatusOption {
  key: string;
  label: string;
  icon: React.ElementType;
  textColor: string;
  color: string;
}

interface StatusChangeModalProps {
  isOpen: boolean;
  currentStatus: string;
  statusOptions: StatusOption[];
  entityName: string;
  onClose: () => void;
  onSelectStatus: (newStatus: string) => void;
}

const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  isOpen,
  currentStatus,
  statusOptions,
  entityName,
  onClose,
  onSelectStatus,
}) => {
  const { modalRef } = useModal({ isOpen, onClose });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Alterar Status - {entityName}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4 space-y-1">
          {statusOptions.map((option) => {
            const IconComponent = option.icon;
            const isActive = currentStatus === option.key;
            
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onSelectStatus(option.key)}
                className={`w-full flex items-center px-4 py-3 text-sm rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <IconComponent className={`h-4 w-4 mr-3 ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : option.textColor || 'text-gray-500 dark:text-gray-400'
                }`} />
                <span className="flex-1 text-left">{option.label}</span>
                {isActive && (
                  <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                )}
              </button>
            );
          })}
        </div>
        
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
            <button onClick={onClose} className="btn-secondary">
                Fechar
            </button>
        </div>
      </div>
    </div>
  );
};

export default StatusChangeModal;