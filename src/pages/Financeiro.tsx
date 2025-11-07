import React, { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useDatabase } from '../contexts/DatabaseContext'
import { useModal } from '../hooks/useModal'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency, parseCurrency, createLocalDate } from '../utils/formatters'
import { undoService } from '../services/undoService'
import { 
  Plus, 
  Search, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Edit,
  Trash2,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { MovimentacaoFinanceira } from '../types'
import StatusChangeModal from '../components/StatusChangeModal'
import RangeCalendar from '../components/RangeCalendar'
import MultiSelectStatus from '../components/MultiSelectStatus'
import MovimentacaoDetailModal from '../components/financeiro/MovimentacaoDetailModal'
import ConfirmationModal from '../components/ConfirmationModal'

// Tipagem para a configuração de ordenação
type SortKey = 'data' | 'descricao' | 'categoria' | 'tipo' | 'valor' | 'status';
type SortDirection = 'asc' | 'desc';

const Financeiro: React.FC = () => {
  const location = useLocation()
  const { 
    movimentacoes: rawMovimentacoes,
    createMovimentacao, 
    updateMovimentacao, 
    deleteMovimentacao,
    uploadComprovante,
    cargas,
    parceiros,
    motoristas,
    veiculos,
  } = useDatabase()
  
  // Garantindo que movimentacoes seja sempre um array
  const movimentacoes = rawMovimentacoes || [];

  const [showForm, setShowForm] = useState(false)
  const [editingMovimentacao, setEditingMovimentacao] = useState<any>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{id: string, descricao: string} | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState<{id: string, descricao: string} | null>(null)
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [paymentFile, setPaymentFile] = useState<File | null>(null)
  
  // NOVO: Estado para o modal de detalhes
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailTargetMov, setDetailTargetMov] = useState<MovimentacaoFinanceira | null>(null);
  
  // NOVO: Estado para confirmação de downgrade de status
  const [showStatusDowngradeConfirm, setShowStatusDowngradeConfirm] = useState(false);
  const [downgradeTarget, setDowngradeTarget] = useState<{ mov: MovimentacaoFinanceira, newStatus: string } | null>(null);
  
  const { modalRef } = useModal({
    isOpen: showForm,
    onClose: () => {
      setShowForm(false)
      setEditingMovimentacao(null)
      // setFormAnchor(null) // Removido, pois o modal agora é centralizado
      setFormData({
        descricao: '',
        valor: '',
        tipo: 'despesa',
        categoria: '',
        data: format(new Date(), 'yyyy-MM-dd'),
        status: 'pendente',
        observacoes: ''
      })
    }
  })
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  
  const [filterVencStartDate, setFilterVencStartDate] = useState('')
  const [filterVencEndDate, setFilterVencEndDate] = useState('')
  
  const [filterPayStartDate, setFilterPayStartDate] = useState('')
  const [filterPayEndDate, setFilterPayEndDate] = useState('')
  
  // Calendários de intervalo (Vencimento e Pagamento)
  const [showVencCalendar, setShowVencCalendar] = useState(false)
  const [vencCalendarPosition, setVencCalendarPosition] = useState({ top: 0, left: 0 })
  const [vencMonth, setVencMonth] = useState<Date>(new Date())
  const [tempVencStart, setTempVencStart] = useState<Date | null>(null)
  const [tempVencEnd, setTempVencEnd] = useState<Date | null>(null)

  const [showPayCalendar, setShowPayCalendar] = useState(false)
  const [payCalendarPosition, setPayCalendarPosition] = useState({ top: 0, left: 0 })
  const [payMonth, setPayMonth] = useState<Date>(new Date())
  const [tempPayStart, setTempPayStart] = useState<Date | null>(null)
  const [tempPayEnd, setTempPayEnd] = useState<Date | null>(null)
  
  // Estado para o modal de status centralizado
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTargetMov, setStatusTargetMov] = useState<MovimentacaoFinanceira | null>(null);
  
  // const [formAnchor, setFormAnchor] = useState<{ top: number, left: number } | null>(null) // Removido

  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    tipo: 'despesa',
    categoria: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    status: 'pendente',
    observacoes: ''
  })
  // Categorias dinâmicas com persistência em localStorage
  const [categories, setCategories] = useState<{ receita: string[]; despesa: string[] }>(() => {
    try {
      const saved = localStorage.getItem('financeiro_categories')
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      receita: ['Cliente', 'Frete', 'Seguros', 'Negociações'],
      despesa: ['Frete', 'Aluguel', 'Salários', 'Seguros', 'Impostos', 'Outros']
    }
  })
  
  // NOVO: Estado de Ordenação (Padrão: data crescente - mais antigo primeiro)
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection }>({
    key: 'data',
    direction: 'asc',
  });

  useEffect(() => {
    try {
      localStorage.setItem('financeiro_categories', JSON.stringify(categories))
    } catch {}
  }, [categories])

  const statusConfig = {
    pendente: { label: 'Pendente', color: 'bg-amber-600 text-white', icon: Clock },
    pago: { label: 'Pago', color: 'bg-emerald-600 text-white', icon: CheckCircle },
    cancelado: { label: 'Adiado', color: 'bg-red-600 text-white', icon: AlertTriangle }
  }
  
  // Mapeamento de status para o modal e MultiSelect
  const movStatusOptions = useMemo(() => {
    return Object.entries(statusConfig).map(([key, cfg]) => ({
      key: key as string,
      label: cfg.label,
      icon: cfg.icon,
      textColor: 'text-gray-500 dark:text-gray-400',
      color: cfg.color,
    }));
  }, []);

  // Modal de gerenciamento de categorias
  const [showCategoriesModal, setShowCategoriesModal] = useState(false)
  const [catType, setCatType] = useState<'receita' | 'despesa'>('receita')
  const [newCategory, setNewCategory] = useState('')

  const addCategory = () => {
    const candidate = newCategory.trim()
    if (!candidate) return
    setCategories(prev => {
      const list = prev[catType]
      // Evita duplicatas ignorando caixa, preservando o texto como digitado
      if (list.some(c => c.toLowerCase() === candidate.toLowerCase())) return prev
      const updated = { ...prev, [catType]: [...list, candidate] }
      return updated
    })
    setNewCategory('')
  }

  const removeCategory = (type: 'receita' | 'despesa', cat: string) => {
    setCategories(prev => ({ ...prev, [type]: prev[type].filter(c => c !== cat) }))
  }

  // Reset para tela inicial quando navegado via menu lateral
  useEffect(() => {
    if (location.state?.resetModule) {
      // Fechar modais e limpar estados auxiliares
      setShowForm(false)
      setEditingMovimentacao(null)
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
      setShowPaymentModal(false)
      setPaymentTarget(null)
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'))
      
      // NOVO: Fechar modal de detalhes
      setShowDetailModal(false);
      setDetailTargetMov(null);
      
      // NOVO: Fechar modal de downgrade
      setShowStatusDowngradeConfirm(false);
      setDowngradeTarget(null);

      // Limpar filtros e busca
      setSearchTerm('')
      setFilterType('')
      setFilterStatus([])
      
      // Resetar filtros de data para VAZIO
      setFilterVencStartDate('')
      setFilterVencEndDate('')
      
      setFilterPayStartDate('')
      setFilterPayEndDate('')

      // Fechar calendários e dropdowns
      setShowVencCalendar(false)
      setShowPayCalendar(false)
      setShowStatusModal(false)
      setStatusTargetMov(null)
      // setFormAnchor(null) // Removido
      
      // Resetar ordenação
      setSortConfig({ key: 'data', direction: 'asc' });

      // Resetar formulário
      setFormData({
        descricao: '',
        valor: '',
        tipo: 'despesa',
        categoria: '',
        data: format(new Date(), 'yyyy-MM-dd'),
        status: 'pendente',
        observacoes: ''
      })
    }
  }, [location.state])
  
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
  const SortableHeader: React.FC<{ columnKey: SortKey, label: string, className?: string }> = ({ columnKey, label, className = 'text-left' }) => {
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
        className={`table-header cursor-pointer hover:text-blue-500 transition-colors ${className}`}
        onClick={() => requestSort(columnKey)}
      >
        <div className="flex items-center">
          {label}
          {getIcon()}
        </div>
      </th>
    );
  };

  
  const filteredMovimentacoes = useMemo(() => {
    let sortedMovs = rawMovimentacoes.filter(movimentacao => {
      const matchSearch = movimentacao.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movimentacao.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchType = !filterType || movimentacao.tipo === filterType
      
      // ALTERADO: Lógica de filtro de status
      const matchStatus = filterStatus.length === 0 || filterStatus.includes(movimentacao.status || 'pendente')
      
      // Filtro por Vencimento (movimentacao.data)
      let matchesVencimentoRange = true
      if (filterVencStartDate) {
        // Usar createLocalDate para garantir que a comparação seja feita no mesmo dia
        const startDate = createLocalDate(filterVencStartDate)
        const d = createLocalDate(format(new Date(movimentacao.data), 'yyyy-MM-dd'))
        matchesVencimentoRange = matchesVencimentoRange && d >= startDate
      }
      if (filterVencEndDate) {
        const endDate = createLocalDate(filterVencEndDate)
        const d = createLocalDate(format(new Date(movimentacao.data), 'yyyy-MM-dd'))
        matchesVencimentoRange = matchesVencimentoRange && d <= endDate
      }

      // Filtro por Pagamento (movimentacao.dataPagamento)
      let matchesPagamentoRange = true
      if (filterPayStartDate || filterPayEndDate) {
        if (!movimentacao.dataPagamento) {
          matchesPagamentoRange = false
        } else {
          const dp = createLocalDate(format(new Date(movimentacao.dataPagamento), 'yyyy-MM-dd'))
          if (filterPayStartDate) {
            const ps = createLocalDate(filterPayStartDate)
            matchesPagamentoRange = matchesPagamentoRange && dp >= ps
          }
          if (filterPayEndDate) {
            const pe = createLocalDate(filterPayEndDate)
            matchesPagamentoRange = matchesPagamentoRange && dp <= pe
          }
        }
      }
      
      return matchSearch && matchType && matchStatus && matchesVencimentoRange && matchesPagamentoRange
    });
    
    // 2. Ordenação (NOVO)
    if (sortConfig.key) {
      sortedMovs.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        let comparison = 0;
        
        if (sortConfig.key === 'data') {
          // Ordena por data de vencimento
          const aTime = aValue ? new Date(aValue as Date).getTime() : 0;
          const bTime = bValue ? new Date(bValue as Date).getTime() : 0;
          comparison = aTime - bTime;
        } else if (sortConfig.key === 'valor') {
          comparison = (aValue as number) - (bValue as number);
        } else if (sortConfig.key === 'status') {
          // Ordenação por status (alfabética)
          const aStr = String(aValue || '').toLowerCase();
          const bStr = String(bValue || '').toLowerCase();
          if (aStr > bStr) comparison = 1;
          if (aStr < bStr) comparison = -1;
        } else {
          // Ordenação alfabética para strings (descricao, categoria, tipo)
          const aStr = String(aValue || '').toLowerCase();
          const bStr = String(bValue || '').toLowerCase();
          if (aStr > bStr) comparison = 1;
          if (aStr < bStr) comparison = -1;
        }
        
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return sortedMovs;
  }, [rawMovimentacoes, searchTerm, filterType, filterStatus, filterVencStartDate, filterVencEndDate, filterPayStartDate, filterPayEndDate, sortConfig])

  // Stats calculation deve usar as movimentações filtradas pelo mês corrente
  const stats = useMemo(() => {
    // Para manter a consistência com o que o usuário vê, usaremos as movimentações FILTRADAS.
    const receitas = filteredMovimentacoes.filter(t => t.tipo === 'receita')
    const despesas = filteredMovimentacoes.filter(t => t.tipo === 'despesa')
    
    const totalReceitas = receitas.reduce((sum, t) => sum + (t.valor || 0), 0)
    const totalDespesas = despesas.reduce((sum, t) => sum + (t.valor || 0), 0)
    const saldo = totalReceitas - totalDespesas
    
    const receitasPendentes = receitas.filter(t => t.status === 'pendente').reduce((sum, t) => sum + (t.valor || 0), 0)
    const despesasPendentes = despesas.filter(t => t.status === 'pendente').reduce((sum, t) => sum + (t.valor || 0), 0)
    
    return { totalReceitas, totalDespesas, saldo, receitasPendentes, despesasPendentes, totalTransacoes: filteredMovimentacoes.length }
  }, [filteredMovimentacoes])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const movimentacaoData: Omit<MovimentacaoFinanceira, 'id' | 'createdAt' | 'updatedAt'> = {
      descricao: formData.descricao,
      valor: parseCurrency(formData.valor),
      tipo: formData.tipo as 'receita' | 'despesa',
      categoria: formData.categoria,
      data: createLocalDate(formData.data),
      status: formData.status as 'pendente' | 'pago' | 'cancelado',
      observacoes: formData.observacoes,
    }

    if (editingMovimentacao) {
      updateMovimentacao(editingMovimentacao.id, movimentacaoData)
    } else {
      createMovimentacao(movimentacaoData)
    }

    resetForm()
  }

  const resetForm = () => {
    setFormData({
      descricao: '',
      valor: '',
      tipo: 'despesa',
      categoria: '',
      data: format(new Date(), 'yyyy-MM-dd'),
      status: 'pendente',
      observacoes: ''
    })
    setEditingMovimentacao(null)
    setShowForm(false)
    // setFormAnchor(null) // Removido
  }

  const handleEdit = (movimentacao: any) => {
    setFormData({
      descricao: movimentacao.descricao,
      valor: formatCurrency(movimentacao.valor.toString()),
      tipo: movimentacao.tipo,
      categoria: movimentacao.categoria,
      // Usar format para garantir YYYY-MM-DD a partir do objeto Date
      data: format(new Date(movimentacao.data), 'yyyy-MM-dd'),
      status: movimentacao.status,
      observacoes: movimentacao.observacoes || ''
    })
    setEditingMovimentacao(movimentacao)
    // Centraliza sempre o modal de edição
    // setFormAnchor(null) // Removido
    setShowForm(true)
  }
  
  // NOVO: Handler para abrir o modal de detalhes
  const handleOpenDetailModal = (movimentacao: MovimentacaoFinanceira) => {
    setDetailTargetMov(movimentacao);
    setShowDetailModal(true);
  };

  const handleDelete = (id: string) => {
    const movimentacao = movimentacoes.find(m => m.id === id)
    if (movimentacao) {
      setDeleteTarget({
        id: id,
        descricao: movimentacao.descricao
      })
      setShowDeleteConfirm(true)
    }
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      // Salvar dados para desfazer
      const deletedMovimentacao = movimentacoes.find(m => m.id === deleteTarget.id);
      
      if (deletedMovimentacao) {
        // Executar exclusão
        deleteMovimentacao(deleteTarget.id);

        // Adicionar ação de desfazer
        undoService.addUndoAction({
          type: 'delete_financial',
          description: `Movimentação "${deleteTarget.descricao}" excluída`,
          data: deletedMovimentacao,
          undoFunction: async () => {
            createMovimentacao(deletedMovimentacao);
          }
        });
      }

      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  }

  const handleOpenStatusModal = (movimentacao: MovimentacaoFinanceira) => {
    setStatusTargetMov(movimentacao);
    setShowStatusModal(true);
  };

  const handleChangeStatus = (newStatus: string) => {
    if (!statusTargetMov) return;
    
    // Lógica de Downgrade de Status
    if (statusTargetMov.status === 'pago' && newStatus !== 'pago') {
        setDowngradeTarget({ mov: statusTargetMov, newStatus });
        setShowStatusDowngradeConfirm(true);
        setStatusTargetMov(null); // Fecha o modal de seleção de status
        return;
    }
    
    // Lógica de Upgrade para Pago
    if (newStatus === 'pago') {
      setPaymentTarget({
        id: statusTargetMov.id,
        descricao: statusTargetMov.descricao
      });
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      setShowPaymentModal(true);
    } else {
      // Se for Pendente -> Adiado ou Adiado -> Pendente (sem comprovante)
      updateMovimentacao(statusTargetMov.id, { status: newStatus as 'pendente' | 'pago' | 'cancelado', dataPagamento: null, comprovanteUrl: undefined }); // Limpa comprovante se não for pago
    }
    setStatusTargetMov(null);
    setShowStatusModal(false);
  };
  
  const confirmDowngrade = () => {
    if (!downgradeTarget) return;
    
    const { mov, newStatus } = downgradeTarget;
    
    // A função updateMovimentacao no DatabaseContext já lida com a exclusão do comprovante
    // se o status for alterado de 'pago' para outro.
    updateMovimentacao(mov.id, { 
        status: newStatus as 'pendente' | 'pago' | 'cancelado', 
        dataPagamento: null, 
        comprovanteUrl: undefined 
    });
    
    setShowStatusDowngradeConfirm(false);
    setDowngradeTarget(null);
  };

  const cancelDowngrade = () => {
    setShowStatusDowngradeConfirm(false);
    setDowngradeTarget(null);
  };

  const confirmPayment = async () => {
    if (paymentTarget) {
      let comprovanteUrl: string | undefined = undefined;
      const targetMov = movimentacoes.find(m => m.id === paymentTarget.id);
      
      if (!targetMov) {
          alert('Erro: Movimentação não encontrada.');
          return;
      }

      if (paymentFile) {
        // Usar a função do contexto que garante o bucket e faz o upload
        const url = await uploadComprovante(paymentFile, paymentTarget.id);
        
        if (!url) {
          // Se o upload falhar (e o erro 'Bucket not found' for capturado e tratado no contexto)
          alert('Falha ao enviar comprovante. Verifique a configuração do Supabase Storage.');
          return;
        }
        comprovanteUrl = url;
      }

      // 3. Atualizar a movimentação com o status e a URL do comprovante
      const updatedMov = await updateMovimentacao(paymentTarget.id, { 
        status: 'pago',
        dataPagamento: createLocalDate(paymentDate),
        ...(comprovanteUrl ? { comprovanteUrl } : { comprovanteUrl: undefined })
      });
      
      if (updatedMov && updatedMov.comprovanteUrl) {
          console.log('Comprovante salvo com sucesso:', updatedMov.comprovanteUrl);
      }

      setShowPaymentModal(false);
      setPaymentTarget(null);
      setPaymentFile(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50">Financeiro</h1>
          <p className="text-slate-600 dark:text-slate-400">Gestão de receitas e despesas</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoriesModal(true)}
            className="btn-secondary"
          >
            Categorias
          </button>
          <button
            onClick={() => {
              // setFormAnchor(null) // Removido
              setEditingMovimentacao(null)
              setFormData(prev => ({ ...prev, tipo: 'despesa' }))
              setShowForm(true)
            }}
            className="btn-primary"
          >
            <Plus className="h-5 w-5" />
            Nova Movimentação
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Receitas */}
        <div className="stat-card hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="stat-label">Receitas (Filtro)</p>
              <p className="stat-value">{formatCurrency(stats.totalReceitas)}</p>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="pt-4 flex items-center gap-2 text-sm">
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
            <span className="text-slate-600 dark:text-slate-400">
              {formatCurrency(stats.receitasPendentes)} pendentes
            </span>
          </div>
        </div>

        {/* Despesas */}
        <div className="stat-card hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="stat-label">Despesas (Filtro)</p>
              <p className="stat-value text-red-600 dark:text-red-400">{formatCurrency(stats.totalDespesas)}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="pt-4 flex items-center gap-2 text-sm">
            <ArrowDownRight className="h-4 w-4 text-red-600" />
            <span className="text-slate-600 dark:text-slate-400">
              {formatCurrency(stats.despesasPendentes)} pendentes
            </span>
          </div>
        </div>

        {/* Saldo */}
        <div className={`stat-card hover:shadow-md ${stats.saldo >= 0 ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'bg-red-50/50 dark:bg-red-900/10'}`}>
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="stat-label">Saldo (Filtro)</p>
              <p className={`stat-value ${stats.saldo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(stats.saldo)}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${stats.saldo >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              <DollarSign className={`h-6 w-6 ${stats.saldo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
            </div>
          </div>
          <div className="pt-4 flex items-center gap-2 text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              {stats.totalTransacoes} transações no período
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-50">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 h-11 text-sm"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input-field h-11 text-sm"
          >
            <option value="">Tipos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>

          {/* ALTERADO: Usando MultiSelectStatus */}
          <MultiSelectStatus
            label="Status"
            options={movStatusOptions.map(o => ({
                key: o.key,
                label: o.label,
                // Mapeia a cor para o badge-color correspondente
                color: o.key === 'pago' ? 'bg-emerald-600' : o.key === 'pendente' ? 'bg-amber-600' : 'bg-red-600'
            }))}
            selectedKeys={filterStatus}
            onChange={setFilterStatus}
          />

          <div className="no-uppercase">
            <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Vencimento</label>
            <button
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                setVencCalendarPosition({
                  top: rect.bottom + 5,
                  left: rect.left
                })
                const s = filterVencStartDate ? createLocalDate(filterVencStartDate) : null
                const ed = filterVencEndDate ? createLocalDate(filterVencEndDate) : null
                setTempVencStart(s)
                setTempVencEnd(ed)
                setVencMonth(s || new Date())
                setShowVencCalendar(true)
              }}
              className="input-field flex items-center justify-between h-11 text-sm"
            >
              <span className="text-sm whitespace-nowrap">
                {filterVencStartDate && filterVencEndDate
                  ? `${format(createLocalDate(filterVencStartDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(createLocalDate(filterVencEndDate), 'dd/MM/yyyy', { locale: ptBR })}`
                  : filterVencStartDate
                    ? `De ${format(createLocalDate(filterVencStartDate), 'dd/MM/yyyy', { locale: ptBR })}`
                    : 'Selecionar período'}
              </span>
              <Calendar className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="no-uppercase">
            <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Pagamento</label>
            <button
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                setPayCalendarPosition({
                  top: rect.bottom + 5,
                  left: rect.left
                })
                const s = filterPayStartDate ? createLocalDate(filterPayStartDate) : null
                const ed = filterPayEndDate ? createLocalDate(filterPayEndDate) : null
                setTempPayStart(s)
                setTempPayEnd(ed)
                setPayMonth(s || new Date())
                setShowPayCalendar(true)
              }}
              className="input-field flex items-center justify-between h-11 text-sm"
            >
              <span className="text-sm whitespace-nowrap">
                {filterPayStartDate && filterPayEndDate
                  ? `${format(createLocalDate(filterPayStartDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(createLocalDate(filterPayEndDate), 'dd/MM/yyyy', { locale: ptBR })}`
                  : filterPayStartDate
                    ? `De ${format(createLocalDate(filterPayStartDate), 'dd/MM/yyyy', { locale: ptBR })}`
                    : 'Selecionar período'}
              </span>
              <Calendar className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendário de Vencimento (overlay ancorado) */}
      {showVencCalendar && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowVencCalendar(false)} />
          <div
            className="fixed z-50"
            style={{ top: `${vencCalendarPosition.top}px`, left: `${vencCalendarPosition.left}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <RangeCalendar
              month={vencMonth}
              start={tempVencStart}
              end={tempVencEnd}
              onPrev={() => setVencMonth(new Date(vencMonth.getFullYear(), vencMonth.getMonth() - 1, 1))}
              onNext={() => setVencMonth(new Date(vencMonth.getFullYear(), vencMonth.getMonth() + 1, 1))}
              onSelectDate={(d) => {
                if (!tempVencStart || (tempVencStart && tempVencEnd)) {
                  setTempVencStart(d)
                  setTempVencEnd(null)
                } else {
                  if (d < tempVencStart) {
                    setTempVencEnd(tempVencStart)
                    setTempVencStart(d)
                  } else {
                    setTempVencEnd(d)
                  }
                }
              }}
              onClear={() => {
                setTempVencStart(null)
                setTempVencEnd(null)
                setFilterVencStartDate('')
                setFilterVencEndDate('')
                setShowVencCalendar(false)
              }}
              onApply={() => {
                setFilterVencStartDate(tempVencStart ? format(tempVencStart, 'yyyy-MM-dd') : '')
                setFilterVencEndDate(tempVencEnd ? format(tempVencEnd, 'yyyy-MM-dd') : '')
                setShowVencCalendar(false)
              }}
            />
          </div>
        </>
      )}

      {/* Calendário de Pagamento (overlay ancorado) */}
      {showPayCalendar && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPayCalendar(false)} />
          <div
            className="fixed z-50"
            style={{ top: `${payCalendarPosition.top}px`, left: `${payCalendarPosition.left}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <RangeCalendar
              month={payMonth}
              start={tempPayStart}
              end={tempPayEnd}
              onPrev={() => setPayMonth(new Date(payMonth.getFullYear(), payMonth.getMonth() - 1, 1))}
              onNext={() => setPayMonth(new Date(payMonth.getFullYear(), payMonth.getMonth() + 1, 1))}
              onSelectDate={(d) => {
                if (!tempPayStart || (tempPayStart && tempPayEnd)) {
                  setTempPayStart(d)
                  setTempPayEnd(null)
                } else {
                  if (d < tempPayStart) {
                    setTempPayEnd(tempPayStart)
                    setTempPayStart(d)
                  } else {
                    setTempPayEnd(d)
                  }
                }
              }}
              onClear={() => {
                setTempPayStart(null)
                setTempPayEnd(null)
                setFilterPayStartDate('')
                setFilterPayEndDate('')
                setShowPayCalendar(false)
              }}
              onApply={() => {
                setFilterPayStartDate(tempPayStart ? format(tempPayStart, 'yyyy-MM-dd') : '')
                setFilterPayEndDate(tempPayEnd ? format(tempPayEnd, 'yyyy-MM-dd') : '')
                setShowPayCalendar(false)
              }}
            />
          </div>
        </>
      )}

      {/* Table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <SortableHeader columnKey="data" label="Vencimento" />
                <SortableHeader columnKey="descricao" label="Descrição" />
                <SortableHeader columnKey="categoria" label="Categoria" />
                <SortableHeader columnKey="tipo" label="Tipo" />
                <SortableHeader columnKey="valor" label="Valor" />
                <SortableHeader columnKey="status" label="Status" />
                <th className="table-header text-left">Pagamento</th>
                <th className="table-header text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="table-card-body">
              {filteredMovimentacoes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                    Nenhuma transação encontrada
                  </td>
                </tr>
              ) : (
                filteredMovimentacoes.map((movimentacao) => (
                  <tr 
                    key={movimentacao.id} 
                    className="table-card-row cursor-pointer"
                    onClick={() => handleOpenDetailModal(movimentacao)}
                  >
                    <td className="table-cell text-sm">
                      {format(new Date(movimentacao.data), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="table-cell font-medium text-slate-900 dark:text-white">
                      {movimentacao.descricao}
                    </td>
                    <td className="table-cell text-slate-700 dark:text-slate-300 text-sm">
                      {movimentacao.categoria}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${movimentacao.tipo === 'receita' ? 'badge-success' : 'badge-danger'}`}>
                        {movimentacao.tipo === 'receita' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className={`table-cell font-semibold ${movimentacao.tipo === 'receita' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {movimentacao.tipo === 'receita' ? '+' : '-'} {formatCurrency(movimentacao.valor || 0)}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${statusConfig[movimentacao.status as keyof typeof statusConfig].color}`}>
                        {statusConfig[movimentacao.status as keyof typeof statusConfig].label}
                      </span>
                    </td>
                    <td className="table-cell text-sm">
                      {movimentacao.dataPagamento ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {format(new Date(movimentacao.dataPagamento), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">-</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(movimentacao);
                          }}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        {/* Botão de Status */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenStatusModal(movimentacao);
                          }}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                          title="Alterar status"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        
                        {/* Botão de Comprovante */}
                        {movimentacao.comprovanteUrl && (
                          <a
                            href={movimentacao.comprovanteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 p-1 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                            title="Ver/Baixar Comprovante"
                          >
                            <FileText className="h-4 w-4" />
                          </a>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(movimentacao.id);
                          }}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Excluir"
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

      {/* Modal de Detalhes da Movimentação (NOVO) */}
      {showDetailModal && detailTargetMov && (
        <MovimentacaoDetailModal
          isOpen={showDetailModal}
          movimentacao={detailTargetMov}
          cargas={cargas}
          parceiros={parceiros}
          motoristas={motoristas}
          veiculos={veiculos}
          onClose={() => {
            setShowDetailModal(false);
            setDetailTargetMov(null);
          }}
        />
      )}

      {/* Modal de Alteração de Status (Financeiro) */}
      {showStatusModal && statusTargetMov && (
        <StatusChangeModal
          isOpen={showStatusModal}
          currentStatus={statusTargetMov.status || 'pendente'}
          statusOptions={movStatusOptions}
          entityName={statusTargetMov.descricao}
          onClose={() => setShowStatusModal(false)}
          onSelectStatus={handleChangeStatus}
        />
      )}
      
      {/* Modal de Confirmação de Downgrade de Status */}
      {showStatusDowngradeConfirm && downgradeTarget && (
        <ConfirmationModal
          isOpen={showStatusDowngradeConfirm}
          onClose={cancelDowngrade}
          onConfirm={confirmDowngrade}
          title="Reverter Pagamento"
          message={
            <>
              Tem certeza que deseja reverter o status de "Pago" para "{statusConfig[downgradeTarget.newStatus as keyof typeof statusConfig].label}"?
              <span className="block mt-2 text-sm text-red-600 dark:text-red-400">
                O comprovante anexado será excluído permanentemente do Storage.
              </span>
            </>
          }
          confirmText="Reverter e Excluir Comprovante"
          cancelText="Manter Pago"
          variant="danger"
        />
      )}

      {/* Modal de Formulário (Centralizado) */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div ref={modalRef} className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editingMovimentacao ? 'Editar Movimentação' : 'Nova Movimentação'}</h3>
              <button onClick={resetForm} className="btn-ghost p-2"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                <input type="text" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor</label>
                <input type="text" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: formatCurrency(e.target.value) })} className="input-field" placeholder="R$ 0,00" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                <select value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'receita' | 'despesa', categoria: '' })} className="input-field" required>
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                <select value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })} className="input-field" required>
                  <option value="">Selecione uma categoria</option>
                  {categories[formData.tipo as keyof typeof categories].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
                <input type="date" value={formData.data} onChange={(e) => setFormData({ ...formData, data: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input-field" required>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Adiado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Observações</label>
                <textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} className="input-field" rows={3} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={resetForm} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">{editingMovimentacao ? 'Atualizar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirmar Exclusão
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Tem certeza que deseja excluir a movimentação{' '}
              <span className="font-semibold">{deleteTarget.descricao}</span>?
              <span className="block mt-2 text-sm text-red-600 dark:text-red-400">
                Esta ação não pode ser desfeita.
              </span>
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTarget(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Categorias */}
      {showCategoriesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCategoriesModal(false)} />
          <div className="card w-full max-w-lg z-50">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Gerenciar Categorias</h3>
              <button onClick={() => setShowCategoriesModal(false)} className="btn-ghost p-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                <select value={catType} onChange={e => setCatType(e.target.value as 'receita' | 'despesa')} className="input-field">
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria (digitação livre)</label>
                <div className="flex gap-2">
                <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="input-field flex-1" placeholder="Ex.: Serviços" />
                  <button className="btn-primary" type="button" onClick={addCategory}>Adicionar</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Categorias de {catType === 'receita' ? 'Receita' : 'Despesa'}</label>
                <div className="flex flex-wrap gap-2">
                  {categories[catType].length === 0 && (
                    <span className="text-slate-500 dark:text-slate-400 text-sm">Nenhuma categoria adicionada.</span>
                  )}
                  {categories[catType].map(cat => (
                    <span key={cat} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-sm">
                      {cat}
                      <button className="p-1 hover:text-red-600" type="button" onClick={() => removeCategory(catType, cat)} title="Remover">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button className="btn-secondary" type="button" onClick={() => setShowCategoriesModal(false)}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de pagamento */}
      {showPaymentModal && paymentTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <CheckCircle className="h-6 w-6 text-emerald-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirmar Pagamento
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Confirmar pagamento da movimentação{' '}
              <span className="font-semibold">{paymentTarget.descricao}</span>?
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data de Pagamento:
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Comprovante (opcional, PDF ou Imagem):
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setPaymentFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
              />
              {paymentFile && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Selecionado: {paymentFile.name}</p>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentTarget(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmPayment}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Financeiro