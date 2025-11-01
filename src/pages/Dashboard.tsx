import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDatabase } from '../contexts/DatabaseContext'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency } from '../utils/formatters'
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  DollarSign,
  FileText,
  Users,
  RotateCcw,
  Cloud,
  Loader2,
  RefreshCw // Adicionado
} from 'lucide-react'

export default function Dashboard() {
  const { 
    cargas, 
    parceiros, 
    clientes, 
    movimentacoes, 
    resetDemoData,
    syncDemoDataToSupabase, // Importado
    isSynced, // Importado
    isSyncing // Importado
  } = useDatabase()
  const navigate = useNavigate()

  const handleStatusClick = (status: string) => {
    // Navegar para a página de cargas com filtro de status
    navigate('/cargas', { state: { filterStatus: status } })
  }
  
  const handleResetData = () => {
    if (window.confirm('ATENÇÃO: Você tem certeza que deseja resetar todos os dados de demonstração? Esta ação é irreversível e apagará todas as alterações locais.')) {
      resetDemoData();
      // Força a sincronização após o reset para garantir que o Supabase também seja limpo (se o usuário logar novamente)
      syncDemoDataToSupabase(true); 
    }
  }
  
  const handleSyncData = async () => {
    const success = await syncDemoDataToSupabase(true); // Força a sincronização
    if (success) {
      alert('Sincronização manual concluída com sucesso!');
    } else {
      alert('Falha na sincronização manual. Verifique o console para detalhes.');
    }
  }

  const cargoStats = useMemo(() => {
    const aColetar = cargas.filter(carga => carga.status === 'a_coletar').length
    const emTransito = cargas.filter(carga => carga.status === 'em_transito').length
    const armazenada = cargas.filter(carga => carga.status === 'armazenada').length
    const entregue = cargas.filter(carga => carga.status === 'entregue').length
    const cancelada = cargas.filter(carga => carga.status === 'cancelada').length
    
    const total = cargas.length
    const valorTotal = cargas.reduce((sum, carga) => sum + (carga.valor || 0), 0)
    
    return { 
      aColetar, 
      emTransito, 
      armazenada, 
      entregue, 
      cancelada, 
      total,
      valorTotal
    }
  }, [cargas])
  
  const financeiroStats = useMemo(() => {
    const receitas = movimentacoes.filter(t => t.tipo === 'receita')
    const despesas = movimentacoes.filter(t => t.tipo === 'despesa')
    
    const totalReceitas = receitas.reduce((sum, t) => sum + (t.valor || 0), 0)
    const totalDespesas = despesas.reduce((sum, t) => sum + (t.valor || 0), 0)
    const saldo = totalReceitas - totalDespesas
    
    return { saldo, totalReceitas, totalDespesas }
  }, [movimentacoes])

  const statusConfig = {
    a_coletar: { label: 'À Coletar', icon: Clock, color: 'bg-amber-50', iconColor: 'text-amber-600', count: cargoStats.aColetar },
    em_transito: { label: 'Em Trânsito', icon: Truck, color: 'bg-blue-50', iconColor: 'text-blue-600', count: cargoStats.emTransito },
    armazenada: { label: 'Armazenadas', icon: Package, color: 'bg-purple-50', iconColor: 'text-purple-600', count: cargoStats.armazenada },
    entregue: { label: 'Entregues', icon: CheckCircle, color: 'bg-emerald-50', iconColor: 'text-emerald-600', count: cargoStats.entregue },
    cancelada: { label: 'Canceladas', icon: AlertTriangle, color: 'bg-red-50', iconColor: 'text-red-600', count: cargoStats.cancelada }
  }

  const cargasRecentes = useMemo(() => {
    return cargas
      .sort((a, b) => new Date(b.dataColeta || 0).getTime() - new Date(a.dataColeta || 0).getTime())
      .slice(0, 5)
  }, [cargas])

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50">
            Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Visão geral do seu sistema de gestão
          </p>
        </div>
        
        {/* Ações de Sincronização e Reset */}
        <div className="flex flex-col items-end space-y-2">
          {/* Status de Sincronização */}
          <div className={`flex items-center text-sm font-medium px-3 py-1 rounded-full ${
            isSyncing 
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : isSynced 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
          }`}>
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Cloud className="h-4 w-4 mr-2" />
            )}
            {isSyncing ? 'Sincronizando...' : isSynced ? 'Sincronizado com Supabase' : 'Sincronização Pendente'}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleSyncData}
              disabled={isSyncing}
              className="btn-info text-sm px-3 py-2 flex items-center gap-2 disabled:opacity-50"
              title="Forçar sincronização dos dados locais para o Supabase"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
            </button>
            
            <button
              onClick={handleResetData}
              className="btn-danger text-sm px-3 py-2 flex items-center gap-2"
              title="Resetar todos os dados de demonstração"
            >
              <RotateCcw className="h-4 w-4" />
              Resetar Dados
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Saldo Financeiro */}
        <div className={`stat-card hover:shadow-md ${financeiroStats.saldo >= 0 ? 'border-l-4 border-emerald-500' : 'border-l-4 border-red-500'}`}>
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="stat-label">Saldo Financeiro</p>
              <p className={`stat-value text-lg ${financeiroStats.saldo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(financeiroStats.saldo)}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${financeiroStats.saldo >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              <DollarSign className={`h-6 w-6 ${financeiroStats.saldo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
            </div>
          </div>
          <div className="pt-4 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            <FileText className="h-4 w-4" />
            {formatCurrency(financeiroStats.totalReceitas)} Receitas / {formatCurrency(financeiroStats.totalDespesas)} Despesas
          </div>
        </div>
        
        {/* Total de Cargas */}
        <div className="stat-card hover:shadow-md border-l-4 border-blue-500">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="stat-label">Total de Cargas</p>
              <p className="stat-value">{cargoStats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="pt-4 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Truck className="h-4 w-4" />
            {cargoStats.emTransito} em trânsito
          </div>
        </div>

        {/* Total de Parceiros */}
        <div className="stat-card hover:shadow-md border-l-4 border-purple-500">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="stat-label">Total de Parceiros</p>
              <p className="stat-value">{parceiros.length}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="pt-4 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            <span className="text-emerald-600 dark:text-emerald-400">{clientes.length} Clientes</span> cadastrados
          </div>
        </div>

        {/* Valor Total das Cargas */}
        <div className="stat-card hover:shadow-md border-l-4 border-amber-500">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="stat-label whitespace-nowrap">Valor Total Cargas</p>
              <p className="stat-value text-lg">{formatCurrency(cargoStats.valorTotal)}</p>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <DollarSign className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="pt-4 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Clock className="h-4 w-4" />
            {cargoStats.aColetar} cargas à coletar
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-4">
          Distribuição de Status das Cargas
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(statusConfig).map(([status, config]) => {
            const count = config.count
            const Icon = config.icon
            
            return (
              <div 
                key={status} 
                className={`card p-4 text-center hover:shadow-lg transition-all cursor-pointer transform hover:scale-105 ${config.color}`}
                onClick={() => handleStatusClick(status)}
              >
                <div className={`w-12 h-12 ${config.color} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                  <Icon className={`w-6 h-6 ${config.iconColor}`} />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{count}</p>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">
                  {config.label}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Shipments */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-4">
          Cargas Recentes
        </h2>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="table-cell text-left">CRT</th>
                  <th className="table-cell text-left">Origem</th>
                  <th className="table-cell text-left">Destino</th>
                  <th className="table-cell text-left">Data de Coleta</th>
                  <th className="table-cell text-left">Valor</th>
                  <th className="table-cell text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {cargasRecentes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="table-cell text-center text-slate-500 dark:text-slate-400 py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-8 w-8 opacity-40" />
                        <p>Nenhuma carga cadastrada</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  cargasRecentes.map((carga) => (
                    <tr key={carga.id} className="table-body-row cursor-pointer" onClick={() => navigate('/cargas')}>
                      <td className="table-cell font-medium text-slate-900 dark:text-white">
                        {carga.crt || '-'}
                      </td>
                      <td className="table-cell text-slate-700 dark:text-slate-300">
                        {carga.origem}
                      </td>
                      <td className="table-cell text-slate-700 dark:text-slate-300">
                        {carga.destino}
                      </td>
                      <td className="table-cell text-slate-700 dark:text-slate-300 text-sm">
                        {carga.dataColeta ? format(new Date(carga.dataColeta), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                      </td>
                      <td className="table-cell font-medium text-slate-900 dark:text-white">
                        {formatCurrency(carga.valor || 0)}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${
                          carga.status === 'entregue' ? 'badge-success' :
                          carga.status === 'em_transito' ? 'badge-info' :
                          carga.status === 'armazenada' ? 'badge-warning' :
                          carga.status === 'cancelada' ? 'badge-danger' :
                          'badge-gray'
                        }`}>
                          {statusConfig[carga.status as keyof typeof statusConfig]?.label || 'Desconhecido'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}