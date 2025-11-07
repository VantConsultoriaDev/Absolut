import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { FileText, RefreshCw, Search, Download, Calendar, FileBadge, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { showError } from '../utils/toast'; // Importando showError

const Contratos: React.FC = () => {
  const location = useLocation();
  const { contratos, cargas, getContracts, generateContract, deleteContrato } = useDatabase();

  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);

  useEffect(() => {
    getContracts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (location.state?.resetModule) {
      setSearchTerm('');
    }
  }, [location.state]);

  const filteredContratos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return contratos.filter(c => {
      const crt = (c.crt || '').toLowerCase();
      const parceiro = (c.parceiroNome || '').toLowerCase();
      const motorista = (c.motoristaNome || '').toLowerCase();
      return !term || crt.includes(term) || parceiro.includes(term) || motorista.includes(term);
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [contratos, searchTerm]);

  const handleGeneratePendingContracts = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGeneratedCount(0);

    try {
      const contratoPorCarga = new Set(contratos.map(c => c.cargaId));
      const pendentes = cargas.filter(c => !contratoPorCarga.has(c.id));

      for (const carga of pendentes) {
        await generateContract(carga.id);
        setGeneratedCount(prev => prev + 1);
      }

      await getContracts();
      // alert(`Contratos gerados: ${pendentes.length}`); // REMOVIDO
    } catch (err) {
      console.error('Erro ao gerar contratos pendentes:', err);
      showError('Falha ao gerar contratos pendentes. Verifique os dados e tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (url?: string) => {
    if (!url) return;
    window.open(url, '_blank');
  };

  const handleVisualize = (url?: string) => {
    if (!url) return;
    window.open(url, '_blank');
  };

  const handleRegenerate = async (cargaId: string) => {
    try {
      await generateContract(cargaId);
      await getContracts();
    } catch (err) {
      console.error('Erro ao regerar contrato:', err);
      showError('Não foi possível regerar o contrato.');
    }
  };

  const handleDeleteContrato = (id: string) => {
    deleteContrato(id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contratos de Frete</h1>
          <p className="text-gray-600 dark:text-gray-400">Gere contratos e acompanhe os PDFs emitidos.</p>
        </div>

        <button
          onClick={handleGeneratePendingContracts}
          disabled={isGenerating}
          className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:bg-gray-400"
          title="Gerar todos os contratos pendentes"
        >
          <FileBadge className="h-5 w-5 mr-2" />
          {isGenerating ? `Gerando... (${generatedCount})` : 'Gerar Contratos Pendentes'}
        </button>
      </div>

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
          <div className="no-uppercase">
            <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Data de Geração</label>
            <button
              type="button"
              className="input-field flex items-center justify-between h-11 text-sm"
              title="Filtro de período (em breve)"
            >
              <span className="text-sm">Selecionar período</span>
              <Calendar className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="table-header">CRT</th>
                <th className="table-header">Parceiro</th>
                <th className="table-header">Motorista</th>
                <th className="table-header">Data</th>
                <th className="table-header">Atualização</th>
                <th className="table-header">Ações</th>
              </tr>
            </thead>
            <tbody className="table-card-body">
              {filteredContratos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">Nenhum contrato encontrado.</td>
                </tr>
              ) : (
                filteredContratos.map((contrato) => (
                  <tr key={contrato.id} className="table-card-row">
                    <td className="table-cell whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{contrato.crt || '-'}</td>
                    <td className="table-cell whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{contrato.parceiroNome || '-'}</td>
                    <td className="table-cell whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{contrato.motoristaNome || '-'}</td>
                    <td className="table-cell whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{format(new Date(contrato.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</td>
                    <td className="table-cell whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{format(new Date(contrato.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</td>
                    <td className="table-cell whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 items-center">
                        <button
                          type="button"
                          onClick={() => handleDownload(contrato.pdfUrl)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Baixar/abrir PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVisualize(contrato.pdfUrl)}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                          title="Visualizar PDF"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRegenerate(contrato.cargaId)}
                          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          title="Regerar Contrato"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteContrato(contrato.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Excluir Contrato"
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
    </div>
  );
};

export default Contratos;