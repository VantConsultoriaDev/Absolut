import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ImportService } from '../../services/importService';
import { undoService } from '../../services/undoService';
import { Carga } from '../../types';

interface CargaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  createCarga: (carga: Omit<Carga, 'id' | 'createdAt' | 'updatedAt'>) => Carga;
  deleteCarga: (id: string) => boolean;
}

const CargaImportModal: React.FC<CargaImportModalProps> = ({ onClose, createCarga, deleteCarga }) => {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (validTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setImportFile(file);
        setImportStatus('idle');
        setImportMessage('');
      } else {
        setImportMessage('Formato de arquivo não suportado. Use CSV ou Excel (.xlsx, .xls)');
        setImportStatus('error');
      }
    }
  };

  const processImport = async () => {
    if (!importFile) return;

    setImportStatus('processing');
    setImportMessage('Processando arquivo...');

    try {
      const result = await ImportService.processFile(importFile);
      
      if (!result.success && result.data!.length === 0) {
        setImportStatus('error');
        setImportMessage(result.errors.join('\n'));
        return;
      }

      // Importar dados válidos
      const importedCargas: Carga[] = [];
      for (const cargaData of result.data!) {
        try {
          // Ensure dates are Date objects before passing to createCarga
          const dataToCreate = {
            ...cargaData,
            dataColeta: cargaData.dataColeta ? new Date(cargaData.dataColeta) : undefined,
            dataEntrega: cargaData.dataEntrega ? new Date(cargaData.dataEntrega) : undefined,
            peso: parseFloat(cargaData.peso) || 0,
            valor: parseFloat(cargaData.valor) || 0,
            status: cargaData.status || 'a_coletar'
          } as Omit<Carga, 'id' | 'createdAt' | 'updatedAt'>;

          const newCarga = createCarga(dataToCreate);
          importedCargas.push(newCarga);
        } catch (error) {
          result.errorCount++;
          result.successCount--;
          result.errors.push(`Erro ao salvar carga: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      // Adicionar ação de desfazer se cargas foram importadas com sucesso
      if (importedCargas.length > 0) {
        undoService.addUndoAction({
          type: 'import_csv',
          description: `Importação de ${importedCargas.length} cargas do arquivo "${importFile.name}"`,
          data: importedCargas,
          undoFunction: async () => {
            // Excluir todas as cargas importadas
            for (const carga of importedCargas) {
              try {
                deleteCarga(carga.id);
              } catch (error) {
                console.error('Erro ao desfazer importação:', error);
              }
            }
          }
        });
      }
      
      // Determinar status final
      if (result.successCount > 0) {
        setImportStatus('success');
        let message = `Importação concluída! ${result.successCount} cargas importadas com sucesso`;
        
        if (result.errorCount > 0) {
          message += `, ${result.errorCount} erros encontrados`;
        }
        
        if (result.errors.length > 0) {
          message += `\n\nDetalhes dos erros:\n${result.errors.slice(0, 5).join('\n')}`;
          if (result.errors.length > 5) {
            message += `\n... e mais ${result.errors.length - 5} erros`;
          }
        }
        
        setImportMessage(message);
      } else {
        setImportStatus('error');
        setImportMessage(`Nenhuma carga foi importada.\n\nErros encontrados:\n${result.errors.slice(0, 10).join('\n')}`);
      }
      
      // Limpar após 5 segundos para dar tempo de ler os erros
      setTimeout(() => {
        handleClose();
      }, 5000);
      
    } catch (error) {
       setImportStatus('error');
       setImportMessage(`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
     }
   };

  const handleClose = () => {
    onClose();
    setImportFile(null);
    setImportStatus('idle');
    setImportMessage('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Importar Cargas
          </h3>
          <button type="button" onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Selecione um arquivo CSV ou Excel (.xlsx, .xls) para importar cargas:
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded mb-2">
              <strong>Colunas aceitas (flexível):</strong><br/>
              • CRT/Código/Número (opcional)<br/>
              • Origem* (obrigatório)<br/>
              • Destino* (obrigatório)<br/>
              • Data Coleta (formato: DD/MM/YYYY ou similar)<br/>
              • Data Entrega (formato: DD/MM/YYYY ou similar)<br/>
              • Valor (aceita R$ 1.234,56 ou 1234.56)<br/>
              • Peso (em kg)<br/>
              • Observações/Comentários
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400">
              💡 O sistema detecta automaticamente as colunas mesmo com nomes diferentes
            </div>
          </div>
          
          <div className="mb-4">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-medium
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                dark:file:bg-blue-900 dark:file:text-blue-300
                dark:hover:file:bg-blue-800"
            />
          </div>
          
          {importFile && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                Arquivo selecionado: {importFile.name}
              </p>
            </div>
          )}
          
          {importMessage && (
            <div className={`mb-4 p-3 rounded-lg max-h-40 overflow-y-auto ${
              importStatus === 'error' 
                ? 'bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300'
                : importStatus === 'success'
                ? 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300'
                : 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
            }`}>
              <pre className="text-sm whitespace-pre-wrap font-sans">{importMessage}</pre>
            </div>
          )}
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={processImport}
              disabled={!importFile || importStatus === 'processing'}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {importStatus === 'processing' ? 'Processando...' : 'Importar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CargaImportModal;