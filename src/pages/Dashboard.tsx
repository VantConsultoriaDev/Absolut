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
  ArrowUpRight
} from 'lucide-react'

export default function Dashboard() {
  const { cargas } = useDatabase()
  const navigate = useNavigate()

  const handleStatusClick = (status: string) => {
    // Navegar para a página de cargas com filtro de status
    navigate('/cargas', { state: { filterStatus: status } })
  }

  const cargoStats = useMemo(() => {
    const aColeta = cargas.filter(carga => carga.status === 'a_coletar').length
    const emTransito = cargas.filter(carga => carga.status === 'em_transito').length
    const armazenada = cargas.filter(carga => carga.status === 'armazenada').length
    const entregue = cargas.filter(carga => carga.status === 'entregue').length
    const cancelada = cargas.filter(carga => carga.status === 'cancelada').length
    
    const total = cargas.length
    const valorTotal = cargas.reduce((sum, carga) => sum + (carga.valor || 0), 0)
    
    return { 
      aColeta, 
      emTransito, 
      armazenada, 
      entregue, 
      cancelada, 
      total,
      valorTotal
    }
  }, [cargas])

  const statusConfig = {
    a_coletar: { label: 'À Coletar', icon: Clock, color: 'bg-amber-50', iconColor: 'text-amber-600' },
    em_transito: { label: 'Em Trânsito', icon: Truck, color: 'bg-blue-50', iconColor: 'text-blue-600' },
    armazenada: { label: 'Armazenadas', icon: Package, color: 'bg-purple-50', iconColor: 'text-purple-600' },
    entregue: { label: 'Entregues', icon: CheckCircle, color: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    cancelada: { label: 'Canceladas', icon: AlertTriangle, color: 'bg-red-50', iconColor: 'text-red-600' }
  }

  const cargasRecentes = useMemo(() => {
    return cargas
      .sort((a, b) => new Date(b.dataColeta || 0).getTime() - new Date(a.dataColeta || 0).getTime())
      .slice(0, 5)
  }, [cargas])

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50">
          Dashboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Visão geral do seu sistema de gestão
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de Cargas */}
        <div className="stat-card hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="stat-label">Total de Cargas</p>
              <p className="stat-value">{cargoStats.total}</p>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          {/* Removido: <div className="pt-4 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-medium"> */}
        </div>

        {/* Em Trânsito */}
        <div className="stat-card hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="stat-label whitespace-nowrap">Em Trânsito</p>
              <p className="stat-value">{cargoStats.emTransito}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          {/* Removido: <p className="stat-change text-blue-600 dark:text-blue-400 pt-4"> */}
        </div>

        {/* Entregues */}
        <div className="stat-card hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="stat-label whitespace-nowrap">Entregues</p>
              <p className="stat-value">{cargoStats.entregue}</p> {/* Corrigido de .entregues para .entregue */}
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          {/* Removido: <div className="pt-4 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-medium"> */}
        </div>

        {/* Valor Total */}
        <div className="stat-card hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="stat-label whitespace-nowrap">Valor Total</p>
              <p className="stat-value text-lg">{formatCurrency(cargoStats.valorTotal)}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          {/* Removido: <p className="stat-change text-slate-600 dark:text-slate-400 pt-4"> */}
        </div>
      </div>

      {/* Status Distribution */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-4">
          Distribuição de Status
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(statusConfig).map(([status, config]) => {
            const count = cargoStats[status as keyof typeof cargoStats] as number || 0
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
                    <tr key={carga.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
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