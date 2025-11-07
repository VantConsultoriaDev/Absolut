import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useModal } from '../hooks/useModal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  children?: React.ReactNode; // Adicionado suporte a children
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  children, // Desestruturado
}) => {
  const { modalRef } = useModal({ isOpen, onClose });

  if (!isOpen) return null;

  const colorConfig = {
    danger: {
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      confirmButtonClass: 'bg-amber-600 hover:bg-amber-700',
    },
    info: {
      icon: AlertTriangle,
      iconColor: 'text-blue-500',
      confirmButtonClass: 'bg-blue-600 hover:bg-blue-700',
    },
  }[variant];
  
  const IconComponent = colorConfig.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <IconComponent className={`h-6 w-6 mr-3 flex-shrink-0 ${colorConfig.iconColor}`} />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
            {message}
          </div>
          
          {/* NOVO: Renderiza children se fornecido, caso contrário, usa botões padrão */}
          {children ? (
            children
          ) : (
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium ${colorConfig.confirmButtonClass}`}
              >
                {confirmText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;