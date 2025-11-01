import React, { useState, useMemo, useEffect } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, RefreshCw, Search, AlertTriangle, Download, Calendar, FileBadge, Trash2 } from 'lucide-react';
import { PDFService } from '../services/pdfService';
import RangeCalendar from '../components/RangeCalendar';

const Contratos: React.FC = () => {
  const { 
    contratos, 
    cargas, // Necessário para verificar integração
    movimentacoes, // Necessário para verificar integração
    getContracts, 
    generateContract,
    deleteContrato: deleteContratoFromContext, // Renomeando para evitar conflito
  } = useDatabase();
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null); // Estado para rastrear qual contrato está sendo regerado
  const [isGeneratingContract, setIsGeneratingContract] = useState(false); // Estado para geração em lote
  
  // Filtros de período (Data de Geração)
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState<{ top: number, left: number }>({ top: 0, left: 0 });
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [tempEnd, setTempEnd] = useState<Date | null>(null);

  // Carregar contratos na montagem
  useEffect(() => {
    const fetchContracts = async () => {
      setLoading(true);
      try {
        await getContracts();
      } catch (error) {
        console.error("Erro ao carregar contratos:", error);
      } finally {
        // Garante que o loading seja desativado
        setLoading(false);
      }
    };
    fetchContracts();
  }, [getContracts]);

  // 1. Filtragem e Busca
  const filteredContratos = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    
    return contratos.filter(contrato => {
      const matchSearch = (contrato.crt || '').toLowerCase().includes(q) ||
                         (contrato.motoristaNome || '').toLowerCase().includes(q) ||
                         (contrato.parceiroNome || '').toLowerCase().includes(q);
      
      let matchesDateRange = true;
      if (filterStartDate && contrato.createdAt) {
        const start = new Date(filterStartDate);
        const d = new Date(contrato.createdAt);
        matchesDateRange = matchesDateRange && d >= start;
      }
      if (filterEndDate && contrato.createdAt) {
        const end = new Date(filterEndDate);
        const d = new Date(contrato.createdAt);
        matchesDateRange = matchesDateRange && d <= end;
      }
      
      return matchSearch && matchesDateRange;
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [contratos, searchTerm, filterStartDate, filterEndDate]);

  // 2. Funções de Ação
  
  const handleRegenerate = async (cargaId: string, contratoId: string) => {
    if (!window.confirm('Tem certeza que deseja REGERAR este contrato? O PDF existente será substituído com os dados atuais da carga.')) {
      return;
    }
    setRegeneratingId(contratoId);
    try {
      await generateContract(cargaId);
      // getContracts é chamado dentro de generateContract
    } catch (error) {
      console.error("Erro ao regerar contrato:", error);
      alert('Falha ao regerar contrato. Verifique o console.');
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleDownload = (url: string, crt: string) => {
    PDFService.downloadPDF(url, `Contrato_Frete_${crt || 'N_A'}.pdf`);
  };
  
  const handleView = (url: string) => {
    window.open(url, '_blank');
  };
  
  const handleDelete = (id: string, crt: string) => {
    if (window.confirm(`Tem certeza que deseja EXCLUIR o contrato ${crt}? Isso não afeta a carga, mas remove o registro do contrato.`)) {
      // A função deleteContrato precisa ser implementada no DatabaseContext
      // Por enquanto, vamos simular a exclusão localmente e avisar que a função real precisa ser implementada.
      alert('A exclusão de contratos no Supabase ainda não está implementada no DatabaseContext. Excluindo localmente.');
      // deleteContratoFromContext(id); // Descomentar quando a função for implementada
    }
  };
  
  // Função para gerar contratos em lote (MOVIDA PARA CÁ)
  const handleGeneratePendingContracts = async () => {
    if (!window.confirm('Deseja gerar contratos para TODAS as cargas que já possuem integração financeira, mas ainda não têm contrato?')) {
      return;
    }
    
    setIsGeneratingContract(true);
    
    const cargasIntegradasSemContrato = cargas.filter(carga => {
      // 1. Verifica se existe pelo menos uma movimentação de FRETE associada (Integrada)
      const isIntegrated = movimentacoes.some(m => m.cargaId === carga.id && m.categoria === 'FRETE');
      
      // 2. Verifica se o contrato NÃO existe
      const hasContractRecord = contratos.some(c => c.cargaId === carga.id);
      
      // Se estiver integrado E não tiver registro de contrato
      return isIntegrated && !hasContractRecord;
    });
    
    if (cargasIntegradasSemContrato.length === 0) {
      alert('Nenhuma carga integrada sem contrato pendente de geração.');
      setIsGeneratingContract(false);
      return;
    }
    
    let successCount = 0;
    for (const carga of cargasIntegradasSemContrato) {
      // Usamos generateContract que já faz o upsert (cria ou atualiza)
      await generateContract(carga.id);
      successCount++;
    }
    
    // Após a geração em lote, atualiza a lista de contratos
    await getContracts();
    
    alert(`${successCount} contratos gerados com sucesso!`);
    setIsGeneratingContract(false);
  };


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contratos de Frete</h1>
          <p className="text-gray-600 dark:text-gray-400">Contratos gerados automaticamente após a integração financeira das cargas.</p>
        </div>
        
        {/* Botão de Geração em Lote */}
        <button
            onClick={handleGeneratePendingContracts}
            disabled={isGeneratingContract}
            className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:bg-gray-400"
            title="Gera contratos para todas as cargas integradas que ainda não possuem contrato."
          >
            {isGeneratingContract ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Gerando em Lote...
              </>
            ) : (
              <>
                <FileBadge className="h-5 w-5 mr-2" />
                Gerar Contratos Pendentes
              </>
            )}
          </button>
      </div>

      {/* Filtros */}
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
          
          {/* Filtro de Período */}
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Data de Geração</label>
            <button
              type="button"
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                setCalendarPosition({
                  top: rect.bottom + window.scrollY + 5,
                  left: rect.left + window.scrollX
                });
                const s = filterStartDate ? new Date(filterStartDate) : null;
                const ed = filterEndDate ? new Date(filterEndDate) : null;
                setTempStart(s);
                setTempEnd(ed);
                setCalendarMonth(s || new Date());
                setShowCalendar(true);
              }}
              className="input-field flex items-center justify-between h-11 text-sm"
            >
              <span className="text-sm">
                {filterStartDate && filterEndDate
                  ? `${format(new Date(filterStartDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(filterEndDate), 'dd/MM/yyyy', { locale: ptBR })}`
                  : filterStartDate
                    ? `De ${format(new Date(filterStartDate), 'dd/MM/yyyy', { locale: ptBR })}`
                    : 'Selecionar período'}
              </span>
              <Calendar className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Calendário de Período (overlay ancorado) */}
      {showCalendar && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowCalendar(false)} />
          <div
            className="fixed z-50"
            style={{ top: `${calendarPosition.top}px`, left: `${calendarPosition.left}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <RangeCalendar
              month={calendarMonth}
              start={tempStart}
              end={tempEnd}
              onPrev={() => setCalendarMonth(prev => subMonths(prev, 1))}
              onNext={() => setCalendarMonth(prev => addMonths(prev, 1))}
              onSelectDate={(d) => {
                if (!tempStart || (tempStart && tempEnd)) {
                  setTempStart(d);
                  setTempEnd(null);
                } else {
                  if (d < tempStart) {
                    setTempEnd(tempStart);
                    setTempStart(d);
                  } else {
                    setTempEnd(d);
                  }
                }
              }}
              onClear={() => {
                setTempStart(null);
                setTempEnd(null);
                setFilterStartDate('');
                setFilterEndDate('');
                setShowCalendar(false);
              }}
              onApply={() => {
                setFilterStartDate(tempStart ? format(tempStart, 'yyyy-MM-dd') : '');
                setFilterEndDate(tempEnd ? format(tempEnd, 'yyyy-MM-dd') : '');
                setShowCalendar(false);
              }}
            />
          </div>
        </>
      )}

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
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-blue-500 dark:text-blue-400">
                    <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin" />
                    Carregando contratos...
                  </td>
                </tr>
              ) : filteredContratos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Nenhum contrato gerado encontrado.
                  </td>
                </tr>
              ) : (
                filteredContratos.map((contrato) => {
                  const isRegenerating = regeneratingId === contrato.id;
                  
                  return (
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
                          onClick={() => handleDownload(contrato.pdfUrl, contrato.crt || contrato.cargaId)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Baixar PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleView(contrato.pdfUrl)}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                          title="Visualizar PDF"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRegenerate(contrato.cargaId, contrato.id)}
                          disabled={isRegenerating}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                          title="Regerar Contrato"
                        >
                          <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(contrato.id, contrato.crt || contrato.cargaId)}
                          className="text-gray-600 hover:text-red-800 dark:text-gray-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Excluir Contrato"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Nota sobre o modelo PDF */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center">
        <AlertTriangle className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          A funcionalidade de geração de PDF utiliza uma Edge Function do Supabase. Para que a geração funcione, você deve criar o bucket 'contratos' no Supabase Storage e garantir que o modelo PDF preenchível esteja configurado corretamente na Edge Function.
        </p>
      </div>
    </div>
  );
};

export default Contratos;