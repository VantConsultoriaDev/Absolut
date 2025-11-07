import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
  ArrowUp, // Importado
  ArrowDown, // Importado
} from 'lucide-react'

// Tipagem para a configuração de ordenação
type SortKey = 'crt' | 'origem' | 'destino' | 'dataColeta' | 'valor' | 'status';
type SortDirection = 'asc' | 'desc';

// Componente auxiliar para o Card Link
interface DashboardCardLinkProps {
    to: string;
    title: string;
    value: string | number; // Valor principal (será movido para baixo)
    icon: React.ElementType;
    iconColor: string;
    borderColor: string;
    children: React.ReactNode;
    valueClassName?: string; // Adicionado
}

const DashboardCardLink: React.FC<DashboardCardLinkProps> = ({ to, title, value, icon: Icon, iconColor, borderColor, children, valueClassName = '' }) => {
    
    const isFinancialValue = title.includes('Valor Total') || title.includes('Saldo Financeiro');
    
    // Verifica se o valor é uma string (para formatCurrency) ou número
    const formattedValue = typeof value === 'number' 
        ? (isFinancialValue ? formatCurrency(value) : value.toString()) 
        : value;
    
    // Se o valor for o Valor Total Cargas, ele será renderizado na parte inferior
    // ALTERADO: Inclui Total de Clientes e Total de Parceiros para usar o formato de valor grande
    const isLargeValueCard = title.includes('Valor Total') || title.includes('Total de Clientes') || title.includes('Total de Parceiros'); 
    
    return (
        <Link 
            to={to} 
            className={`stat-card hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 ${borderColor} transform hover:-translate-y-0.5`}
        >
            <div className="flex items-start justify-between">
                <div className="space-y-1 w-full">
                    {/* Renderiza o título, permitindo quebras de linha */}
                    <p className="stat-label whitespace-pre-wrap">{title}</p>
                    {/* Renderiza o valor no topo APENAS se não for o card de valor grande */}
                    {!isLargeValueCard && (
                        <p className={`stat-value text-lg ${valueClassName}`}>{formattedValue}</p>
                    )}
                </div>
                <div className={`p-3 rounded-lg ${iconColor.replace('text-', 'bg-').replace('-600', '-100').replace('-400', '-900/30')}`}>
                    <Icon className={`h-6 w-6 ${iconColor}`} />
                </div>
            </div>
            
            {/* NOVO: Bloco para o valor principal (se for o card de valor grande) */}
            {isLargeValueCard && (
                <div className="pt-2 flex flex-col gap-1">
                    <p className={`text-2xl font-bold text-slate-900 dark:text-slate-50 ${valueClassName}`}>
                        {formattedValue}
                    </p>
                </div>
            )}
            
            {/* Conteúdo adicional (children) */}
            <div className="pt-2 flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                {children}
            </div>
        </Link>
    );
};


export default function Dashboard() {
  const { 
    cargas: rawCargas, 
    parceiros: rawParceiros, 
    clientes: rawClientes, 
    movimentacoes: rawMovimentacoes, 
    veiculos: rawVeiculos, // Adicionado rawVeiculos
  } = useDatabase()
  const navigate = useNavigate()
  
  // NOVO: Estado de Ordenação (Padrão: dataColeta crescente - mais antiga primeiro)
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection }>({
    key: 'dataColeta',
    direction: 'asc', // ALTERADO PARA CRESCENTE
  });
  
  // Função para alternar a ordenação
  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    } else {
      // Se for uma nova coluna, o padrão é crescente (asc)
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  // Componente auxiliar para o cabeçalho da tabela com ordenação
  const SortableHeader: React.FC<{ columnKey: SortKey, label: string }> = ({ columnKey, label }) => {
    const isSorted = sortConfig.key === columnKey;
    const direction = sortConfig.direction;
    
    const getIcon = () => {
      if (!isSorted) return null;
      return direction === 'asc' 
        ? <ArrowUp className="h-3 w-3 ml-1" /> 
        : <ArrowDown className="h-3 w-3 ml-1" />;
    };
    
    return (
      <th 
        className="table-header cursor-pointer hover:text-blue-500 transition-colors"
        onClick={() => requestSort(columnKey)}
      >
        <div className="flex items-center">
          {label}
          {getIcon()}
        </div>
      </th>
    );
  };
  
  // Garante que todas as coleções sejam arrays vazios se forem null/undefined
  const cargas = rawCargas || [];
  const parceiros = rawParceiros || [];
  const clientes = rawClientes || [];
  const movimentacoes = rawMovimentacoes || [];
  const veiculos = rawVeiculos || []; // Usando veiculos

  const handleStatusClick = (status: string) => {
    // Navegar para a página de cargas com filtro de status
    navigate('/cargas', { state: { filterStatus: status } })
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
  
  // NOVO: Cálculo de estatísticas de Parceiros e Veículos
  const parceiroVeiculoStats = useMemo(() => {
    const totalParceiros = parceiros.length;
    const parceirosBloqueados = parceiros.filter(p => p.isActive === false).length;
    
    const cavalosTrucks = veiculos.filter(v => v.tipo === 'Cavalo' || v.tipo === 'Truck').length;
    
    return { totalParceiros, parceirosBloqueados, cavalosTrucks };
  }, [parceiros, veiculos]);

  const statusConfig = {
    a_coletar: { label: 'À Coletar', icon: Clock, color: 'bg-amber-50', iconColor: 'text-amber-600', count: cargoStats.aColetar },
    em_transito: { label: 'Em Trânsito', icon: Truck, color: 'bg-blue-50', iconColor: 'text-blue-600', count: cargoStats.emTransito },
    armazenada: { label: 'Armazenadas', icon: Package, color: 'bg-purple-50', iconColor: 'text-purple-600', count: cargoStats.armazenada },
    entregue: { label: 'Entregues', icon: CheckCircle, color: 'bg-emerald-50', iconColor: 'text-emerald-600', count: cargoStats.entregue },
    cancelada: { label: 'Canceladas', icon: AlertTriangle, color: 'bg-red-50', iconColor: 'text-red-600', count: cargoStats.cancelada }
  }

  const cargasRecentes = useMemo(() => {
    let sortedCargas = [...cargas];
    
    // 1. Ordenação
    if (sortConfig.key) {
      sortedCargas.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        let comparison = 0;
        
        if (sortConfig.key === 'dataColeta') {
          const aTime = aValue ? new Date(aValue as Date).getTime() : 0;
          const bTime = bValue ? new Date(bValue as Date).getTime() : 0;
          comparison = aTime - bTime;
        } else if (sortConfig.key === 'valor') {
          comparison = (aValue as number) - (bValue as number);
        } else {
          // Ordenação alfabética para strings (CRT, origem, destino, status)
          const aStr = String(aValue || '').toLowerCase();
          const bStr = String(bValue || '').toLowerCase();
          if (aStr > bStr) comparison = 1;
          if (aStr < bStr) comparison = -1;
        }
        
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    
    // 2. Limita a 5 resultados
    return sortedCargas.slice(0, 5)
  }, [cargas, sortConfig])

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
        
        {/* Ações de Sincronização e Reset (REMOVIDO) */}
        <div className="flex flex-col items-end space-y-2">
          {/* Status de Sincronização (REMOVIDO) */}
          {/* Botão de Sincronização Manual (REMOVIDO) */}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* 1. Total de Clientes */}
        <DashboardCardLink
            to="/clientes"
            title="Total de Clientes"
            value={clientes.length}
            icon={Users}
            iconColor="text-blue-600 dark:text-blue-400"
            borderColor="border-blue-500"
        >
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <Package className="h-4 w-4" />
                {cargoStats.total} cargas cadastradas
            </div>
        </DashboardCardLink>

        {/* 2. Total de Parceiros */}
        <DashboardCardLink
            to="/parceiros"
            title="Total de Parceiros"
            value={parceiros.length}
            icon={Users}
            iconColor="text-purple-600 dark:text-purple-400"
            borderColor="border-purple-500"
        >
            <span className="text-slate-600 dark:text-slate-400">
              {parceiroVeiculoStats.cavalosTrucks} Conjuntos cadastrados
            </span>
            <span className="text-red-600 dark:text-red-400">
              {parceiroVeiculoStats.parceirosBloqueados} Parceiros bloqueados
            </span>
        </DashboardCardLink>

        {/* 3. Valor Total das Cargas (Valor movido para baixo) */}
        <DashboardCardLink
            to="/cargas"
            title={`Valor Total\n de Cargas`}
            value={cargoStats.valorTotal} // Passa o valor aqui
            icon={DollarSign}
            iconColor="text-amber-600 dark:text-amber-400"
            borderColor="border-amber-500"
        >
            {/* Conteúdo adicional (children) - Mantido vazio para este card */}
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                &nbsp;
            </div>
        </DashboardCardLink>
        
        {/* 4. Saldo Financeiro */}
        <DashboardCardLink
            to="/financeiro"
            title="Saldo Financeiro"
            value={financeiroStats.saldo}
            icon={DollarSign}
            iconColor={financeiroStats.saldo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
            borderColor={financeiroStats.saldo >= 0 ? 'border-emerald-500' : 'border-red-500'}
            valueClassName={financeiroStats.saldo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
        >
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <FileText className="h-4 w-4" />
                {formatCurrency(financeiroStats.totalReceitas)} Receitas / {formatCurrency(financeiroStats.totalDespesas)} Despesas
            </div>
        </DashboardCardLink>
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
                  <SortableHeader columnKey="crt" label="CRT" />
                  <SortableHeader columnKey="origem" label="Origem" />
                  <SortableHeader columnKey="destino" label="Destino" />
                  <SortableHeader columnKey="dataColeta" label="Data de Coleta" />
                  <SortableHeader columnKey="valor" label="Valor" />
                  <SortableHeader columnKey="status" label="Status" />
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