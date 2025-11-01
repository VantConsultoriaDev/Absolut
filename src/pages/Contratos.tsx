import React, { useState, useMemo } from 'react';
import { FileText, RefreshCw, Search, AlertTriangle, Download, Calendar, FileBadge, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Componente estático para a tela de Contratos
const Contratos: React.FC = () => {
  // Estados e lógica removidos, mantendo apenas o esqueleto visual.
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dados simulados para a tabela (apenas para visualização)
  const mockContratos = useMemo(() => [
    { id: '1', crt: 'CRT-INT', parceiroNome: 'Transportes Internacionais LTDA', motoristaNome: 'Ricardo Almeida', createdAt: new Date(), updatedAt: new Date() }
  ], []);

  // Funções de ação simuladas
  const handleGeneratePendingContracts = () => {
    alert('Funcionalidade de geração em lote desabilitada para desenvolvimento.');
  };
  
  const handleAction = (action: string) => {
    alert(`Ação '${action}' desabilitada para desenvolvimento.`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contratos de Frete</h1>
          <p className="text-gray-600 dark:text-gray-400">Contratos gerados automaticamente após a integração financeira das cargas.</p>
        </div>
        
        {/* Botão de Geração em Lote (Desabilitado) */}
        <button
            onClick={handleGeneratePendingContracts}
            disabled={true}
            className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:bg-gray-400"
            title="Funcionalidade desabilitada"
          >
            <FileBadge className="h-5 w-5 mr-2" />
            Gerar Contratos Pendentes
          </button>
      </div>

      {/* Filtros (Estáticos) */}
      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar por CRT, Motorista ou Parceiro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 h-11 text-sm"
            />
          </div>
          
          {/* Filtro de Período (Estático) */}
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Data de Geração</label>
            <button
              type="button"
              onClick={() => handleAction('Abrir Calendário')}
              className="input-field flex items-center justify-between h-11 text-sm"
            >
              <span className="text-sm">Selecionar período</span>
              <Calendar className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Contratos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  CRT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Parceiro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Motorista
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Data de Geração
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Última Atualização
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {mockContratos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Nenhum contrato gerado encontrado.
                  </td>
                </tr>
              ) : (
                mockContratos.map((contrato) => (
                  <tr key={contrato.id} className="table-body-row">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {contrato.crt || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {contrato.parceiroNome || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {contrato.motoristaNome || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {format(new Date(contrato.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {format(new Date(contrato.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 items-center">
                        <button
                          type="button"
                          onClick={() => handleAction('Baixar PDF')}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Baixar PDF (Desabilitado)"
                          disabled
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction('Visualizar PDF')}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                          title="Visualizar PDF (Desabilitado)"
                          disabled
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction('Regerar Contrato')}
                          disabled={true}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                          title="Regerar Contrato (Desabilitado)"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction('Excluir Contrato')}
                          className="text-gray-600 hover:text-red-800 dark:text-gray-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Excluir Contrato (Desabilitado)"
                          disabled
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Nota sobre o modelo PDF */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center">
        <AlertTriangle className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Esta tela está em desenvolvimento. A lógica de carregamento e geração de contratos foi desabilitada.
        </p>
      </div>
    </div>
  );
};

export default Contratos;