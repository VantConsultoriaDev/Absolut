import React, { useState, useMemo } from 'react';
import { FileText, Download, Search, RefreshCw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Dados simulados para MIC
const mockMics = [
  { id: 'MIC-001', numero: '98765', dataEmissao: new Date('2024-07-21'), origem: 'BR', destino: 'AR', status: 'Emitido', pdfUrl: '#' },
  { id: 'MIC-002', numero: '98766', dataEmissao: new Date('2024-07-20'), origem: 'BR', destino: 'UY', status: 'Emitido', pdfUrl: '#' },
  { id: 'MIC-003', numero: '98767', dataEmissao: new Date('2024-07-19'), origem: 'BR', destino: 'PY', status: 'Pendente', pdfUrl: '#' },
  { id: 'MIC-004', numero: '98768', dataEmissao: new Date('2024-07-18'), origem: 'BR', destino: 'CL', status: 'Emitido', pdfUrl: '#' },
  { id: 'MIC-005', numero: '98769', dataEmissao: new Date('2024-07-17'), origem: 'BR', destino: 'AR', status: 'Emitido', pdfUrl: '#' },
];

const MicScreen: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

  const filteredMics = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const results = mockMics.filter(mic => 
      mic.numero.includes(q) || 
      mic.origem.toLowerCase().includes(q) || 
      mic.destino.toLowerCase().includes(q)
    ).sort((a, b) => b.dataEmissao.getTime() - a.dataEmissao.getTime());
    
    return showAll || q ? results : results.slice(0, 5);
  }, [searchTerm, showAll]);

  const stats = useMemo(() => {
    const total = mockMics.length;
    const emitidos = mockMics.filter(c => c.status === 'Emitido').length;
    const pendentes = total - emitidos;
    return { total, emitidos, pendentes };
  }, []);

  const handleDownload = (pdfUrl: string, numero: string) => {
    // Simulação de download
    alert(`Download do MIC ${numero} iniciado.`);
    console.log(`Simulando download de: ${pdfUrl}`);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <FileText className="h-6 w-6 text-purple-600" />
        MIC - Manifesto Internacional de Carga
      </h2>

      {/* Dashboard de Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card bg-purple-50 dark:bg-purple-900/20 border-purple-200">
          <p className="stat-label text-purple-700 dark:text-purple-300">Total de MIC's</p>
          <p className="stat-value text-purple-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="stat-card bg-green-50 dark:bg-green-900/20 border-green-200">
          <p className="stat-label text-green-700 dark:text-green-300">Emitidos</p>
          <p className="stat-value text-green-900 dark:text-white">{stats.emitidos}</p>
        </div>
        <div className="stat-card bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
          <p className="stat-label text-yellow-700 dark:text-yellow-300">Pendentes</p>
          <p className="stat-value text-yellow-900 dark:text-white">{stats.pendentes}</p>
        </div>
      </div>

      {/* Filtros e Ações */}
      <div className="card p-4 flex justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Buscar por número ou rota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10 h-10 text-sm"
          />
        </div>
        <button 
          onClick={() => setShowAll(prev => !prev)}
          className="btn-secondary ml-4 text-sm"
        >
          {showAll ? 'Mostrar Recentes (5)' : 'Mostrar Todos'}
        </button>
      </div>

      {/* Lista de MIC's */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Número</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Data Emissão</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Origem</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Destino</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMics.map((mic) => (
                <tr key={mic.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{mic.numero}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {format(mic.dataEmissao, 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{mic.origem}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{mic.destino}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      mic.status === 'Emitido' ? 'badge-success' : 'badge-warning'
                    }`}>
                      {mic.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDownload(mic.pdfUrl, mic.numero)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="Download PDF"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredMics.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Nenhum MIC encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Aviso de Desenvolvimento */}
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center">
        <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
        <p className="text-sm text-red-700 dark:text-red-300">
          Esta tela está em desenvolvimento. Os dados exibidos são simulados.
        </p>
      </div>
    </div>
  );
};

export default MicScreen;