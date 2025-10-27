import React, { useState, useEffect } from 'react';
import { undoService, UndoAction } from '../services/undoService';

const UndoButton: React.FC = () => {
  const [currentAction, setCurrentAction] = useState<UndoAction | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  useEffect(() => {
    // Registrar callback para receber notificações do serviço
    undoService.setNotificationCallback((action) => {
      setCurrentAction(action);
      if (action) {
        setTimeLeft(10); // 10 segundos
      } else {
        setTimeLeft(0);
      }
    });

    return () => {
      undoService.setNotificationCallback(() => {});
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (currentAction && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentAction, timeLeft]);

  const handleUndo = async () => {
    if (!currentAction || isExecuting) return;

    setIsExecuting(true);
    try {
      const success = await undoService.executeUndo();
      if (success) {
        console.log('Ação desfeita com sucesso');
      } else {
        console.error('Falha ao desfazer ação');
      }
    } catch (error) {
      console.error('Erro ao desfazer:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancel = () => {
    undoService.cancelCurrentAction();
  };

  if (!currentAction || timeLeft <= 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-80 max-w-96">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              Operação realizada
            </h4>
            <p className="text-sm text-gray-600">
              {currentAction.description}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Fechar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleUndo}
              disabled={isExecuting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center space-x-1"
            >
              {isExecuting ? (
                <>
                  <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Desfazendo...</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  <span>Desfazer</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="mt-3 w-full bg-gray-200 rounded-full h-1">
          <div 
            className="bg-blue-600 h-1 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 10) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default UndoButton;