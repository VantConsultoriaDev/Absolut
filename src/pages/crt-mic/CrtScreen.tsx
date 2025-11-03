import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, Download, Search, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Dados simulados para CRT
const mockCrts = [
  { id: 'CRT-001', numero: '12345', dataEmissao: new Date('2024-07-20'), origem: 'SP', destino: 'RJ', status: 'Emitido', pdfUrl: '#' },
  { id: 'CRT-002', numero: '12346', dataEmissao: new Date('2024-07-19'), origem: 'RS', destino: 'PR', status: 'Emitido', pdfUrl: '#' },
  { id: 'CRT-003', numero: '12347', dataEmissao: new Date('2024-07-18'), origem: 'MG', destino: 'BA', status: 'Pendente', pdfUrl: '#' },
  { id: 'CRT-004', numero: '12348', dataEmissao: new Date('2024-07-17'), origem: 'SC', destino: 'SP', status: 'Emitido', pdfUrl: '#' },
  { id: 'CRT-005', numero: '12349', dataEmissao: new Date('2024-07-16'), origem: 'PR', destino: 'RS', status: 'Emitido', pdfUrl: '#' },
  { id: 'CRT-006', numero: '12350', dataEmissao: new Date('2024-07-15'), origem: 'RJ', destino: 'MG', status: 'Pendente', pdfUrl: '#' },
  { id: 'CRT-007', numero: '12351', dataEmissao: new Date('2024-07-14'), origem: 'BA', destino: 'SC', status: 'Emitido', pdfUrl: '#' },
];

const CrtScreen: React.FC = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

  const filteredCrts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const results = mockCrts.filter(crt => 
      crt.numero.includes(q) || 
      crt.origem.toLowerCase().includes(q) || 
      crt.destino.toLowerCase().includes(q)
    ).sort((a, b) => b.dataEmissao.getTime() - a.dataEmissao.getTime());
    
    return showAll || q ? results : results.slice(0, 5);
  }, [searchTerm, showAll]);

  const stats = useMemo(() => {
    const total = mockCrts.length;
    const emitidos = mockCrts.filter(c => c.status === 'Emitido').length;
    const pendentes = total - emitidos;
    return { total, emitidos, pendentes };
  }, []);

  // Reset para tela inicial quando navegado via menu lateral
  useEffect(() => {
    if (location.state?.resetModule) {
      setSearchTerm('');
      setShowAll(false);
    }
  }, [location.state]);

  const handleDownload = (pdfUrl: string, numero: string) => {
    // Simulação de download
    alert(`Download do CRT ${numero} iniciado.`);
    console.log(`Simulando download de: ${pdfUrl}`);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <FileText className="h-6 w-6 text-blue-600" />
        CRT - Certificado de Registro de Transportador
      </h2>

      {/* Dashboard de Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card bg-blue-50 dark:bg-blue-900/20 border-blue-200">
          <p className="stat-label text-blue-700 dark:text-blue-300">Total de CRT's</p>
          <p className="stat-value text-blue-900 dark:text-white">{stats.total}</p>
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

      {/* Lista de CRT's */}
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
              {filteredCrts.map((crt) => (
                <tr key={crt.id} className="table-body-row">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{crt.numero}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {format(crt.dataEmissao, 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{crt.origem}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{crt.destino}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      crt.status === 'Emitido' ? 'badge-success' : 'badge-warning'
                    }`}>
                      {crt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDownload(crt.pdfUrl, crt.numero)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="Download PDF"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCrts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Nenhum CRT encontrado.
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

export default CrtScreen;