import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useDatabase } from '../contexts/DatabaseContext'
import { useModal } from '../hooks/useModal'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency, parseCurrency, createLocalDate } from '../utils/formatters'
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
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  ArrowUp,
  ArrowDown,
  List, // NOVO: Ícone para categoria
} from 'lucide-react'
import { MovimentacaoFinanceira } from '../types'
import StatusChangeModal from '../components/StatusChangeModal'
import MultiSelectStatus from '../components/MultiSelectStatus'
import MovimentacaoDetailModal from '../components/financeiro/MovimentacaoDetailModal'
import ConfirmationModal from '../components/ConfirmationModal'
import StandardCheckbox from '../components/StandardCheckbox'
import DateRangeFilter from '../components/DateRangeFilter' // NOVO: Importando o componente unificado
import CategoriesModal from '../components/financeiro/CategoriesModal' // NOVO: Importando CategoriesModal
import SearchableSelect, { SelectOption } from '../components/SearchableSelect' // NOVO: Importando SearchableSelect

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
  
  // NOVO: Estado para confirmação de exclusão (recorrente/parcelado)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { modalRef } = useModal({
    isOpen: showForm,
    onClose: () => {
      setShowForm(false)
      setEditingMovimentacao(null)
      resetForm()
    }
  })
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  // NOVO: Estado para filtro de categorias
  const [filterCategories, setFilterCategories] = useState<string[]>([])
  
  // Filtros de intervalo (mantidos)
  const [filterVencStartDate, setFilterVencStartDate] = useState('')
  const [filterVencEndDate, setFilterVencEndDate] = useState('')
  
  const [filterPayStartDate, setFilterPayStartDate] = useState('')
  const [filterPayEndDate, setFilterPayEndDate] = useState('')
  
  // Estado para o modal de status centralizado
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTargetMov, setStatusTargetMov] = useState<MovimentacaoFinanceira | null>(null);
  
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    tipo: 'despesa',
    categoria: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    status: 'pendente',
    observacoes: '',
    
    // Recorrência
    isRecurring: false,
    recurrencePeriod: 'monthly' as MovimentacaoFinanceira['recurrencePeriod'], // Corrigido para o tipo correto
    recurrenceEndDateStr: '' as string, // String for input type="date"
    
    // NOVO: Parcelamento
    isInstallment: false,
    installmentCount: 2, // Quantidade de parcelas
    installmentValueOption: 'total' as 'total' | 'parcela', // 'total' ou 'parcela'
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
    cancelado: { label: 'Urgente', color: 'bg-red-600 text-white', icon: AlertTriangle }
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
  }, [statusConfig]);
  
  // Opções de categoria filtradas pelo tipo de movimentação
  const filteredCategoryOptions = useMemo(() => {
    let list: string[] = [];
    
    if (filterType === 'receita') {
        list = categories.receita;
    } else if (filterType === 'despesa') {
        list = categories.despesa;
    } else {
        // Se não houver filtro de tipo, mostra todas as categorias únicas
        list = [...categories.receita, ...categories.despesa];
    }
    
    // Garante unicidade e mapeia para o formato MultiSelectStatus
    return Array.from(new Set(list)).map(cat => ({
        key: cat,
        label: cat,
        color: 'bg-gray-600' 
    }));
  }, [categories, filterType]);
  
  // Opções de categoria para o SearchableSelect (Formulário)
  const formCategoryOptions: SelectOption[] = useMemo(() => {
    const list = categories[formData.tipo as keyof typeof categories];
    return list.map(cat => ({
        id: cat,
        name: cat,
        icon: List,
    }));
  }, [categories, formData.tipo]);
  
  // Efeito para limpar categorias inválidas quando o tipo de movimentação muda
  useEffect(() => {
    if (filterCategories.length > 0) {
        const validKeys = filteredCategoryOptions.map(o => o.key);
        const categoriesToKeep = filterCategories.filter(cat => validKeys.includes(cat));
        
        if (categoriesToKeep.length !== filterCategories.length) {
            setFilterCategories(categoriesToKeep);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCategoryOptions]); // Depende da lista filtrada de opções

  // Modal de gerenciamento de categorias
  const [showCategoriesModal, setShowCategoriesModal] = useState(false)
  // const [catType, setCatType] = useState<'receita' | 'despesa'>('receita') // REMOVIDO
  // const [newCategory, setNewCategory] = useState('') // REMOVIDO

  // FUNÇÃO AUSENTE 1: addCategory
  const addCategory = (type: 'receita' | 'despesa', category: string) => {
    const candidate = category.trim()
    if (!candidate) return
    setCategories(prev => {
      const list = prev[type]
      // Evita duplicatas ignorando caixa, preservando o texto como digitado
      if (list.some(c => c.toLowerCase() === candidate.toLowerCase())) return prev
      const updated = { ...prev, [type]: [...list, candidate] }
      return updated
    })
  }

  // FUNÇÃO AUSENTE 2: removeCategory
  const removeCategory = (type: 'receita' | 'despesa', cat: string) => {
    setCategories(prev => ({ ...prev, [type]: prev[type].filter(c => c !== cat) }))
  }

  // Reset para tela inicial quando navegado via menu lateral
  useEffect(() => {
    if (location.state?.resetModule) {
      // Fechar modais e limpar estados auxiliares
      setShowForm(false)
      setEditingMovimentacao(null)
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
      setFilterCategories([]) // NOVO: Reset do filtro de categorias
      
      // Resetar filtros de data para VAZIO
      setFilterVencStartDate('')
      setFilterVencEndDate('')
      
      setFilterPayStartDate('')
      setFilterPayEndDate('')

      // Fechar calendários e dropdowns
      setShowStatusModal(false)
      setStatusTargetMov(null)
      
      // Resetar ordenação
      setSortConfig({ key: 'data', direction: 'asc' });

      // Resetar formulário
      resetForm()
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
      
      // Lógica de filtro de status
      const matchStatus = filterStatus.length === 0 || filterStatus.includes(movimentacao.status || 'pendente')
      
      // NOVO: Lógica de filtro de categoria
      const matchCategory = filterCategories.length === 0 || (movimentacao.categoria && filterCategories.includes(movimentacao.categoria));
      
      // Filtro por Vencimento (movimentacao.data)
      let matchesVencimentoRange = true
      if (filterVencStartDate) {
        // Usar createLocalDate para garantir que a comparação seja feita no mesmo dia
        const startDate = createLocalDate(filterVencStartDate)
        const d = createLocalDate(format(new Date(movimentacao.data), 'yyyy-MM-dd'))
        
        if (startDate && d) {
            matchesVencimentoRange = matchesVencimentoRange && d >= startDate
        }
      }
      if (filterVencEndDate) {
        const endDate = createLocalDate(filterVencEndDate)
        const d = createLocalDate(format(new Date(movimentacao.data), 'yyyy-MM-dd'))
        
        if (endDate && d) {
            matchesVencimentoRange = matchesVencimentoRange && d <= endDate
        }
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
            if (dp && ps) {
                matchesPagamentoRange = matchesPagamentoRange && dp >= ps
            }
          }
          if (filterPayEndDate) {
            const pe = createLocalDate(filterPayEndDate)
            if (dp && pe) {
                matchesPagamentoRange = matchesPagamentoRange && dp <= pe
            }
          }
        }
      }
      
      return matchSearch && matchType && matchStatus && matchesVencimentoRange && matchesPagamentoRange && matchCategory
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
  }, [rawMovimentacoes, searchTerm, filterType, filterStatus, filterVencStartDate, filterVencEndDate, filterPayStartDate, filterPayEndDate, sortConfig, filterCategories])

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
    
    // Validação para recorrência
    if (formData.isRecurring && !formData.recurrencePeriod) {
        alert('Selecione o período de recorrência.');
        return;
    }
    
    // Validação para parcelamento
    if (formData.isInstallment) {
        if (formData.installmentCount < 2) {
            alert('A quantidade de parcelas deve ser no mínimo 2.');
            return;
        }
        if (parseCurrency(formData.valor) <= 0) {
            alert('O valor deve ser maior que zero.');
            return;
        }
    }
    
    // Não é possível editar movimentações recorrentes ou parceladas individualmente
    if (editingMovimentacao && (editingMovimentacao.isRecurring || editingMovimentacao.isInstallment)) {
        alert('Não é possível editar movimentações recorrentes ou parceladas individualmente. Altere o status ou exclua.');
        return;
    }
    
    // Não pode ser recorrente E parcelado
    if (formData.isRecurring && formData.isInstallment) {
        alert('Uma movimentação não pode ser recorrente e parcelada ao mesmo tempo.');
        return;
    }
    
    // Determina o valor base e a descrição
    let baseValue = parseCurrency(formData.valor);
    let baseDescription = formData.descricao;
    let installmentValueForContext: number | undefined = undefined;
    
    if (formData.isInstallment) {
        if (formData.installmentValueOption === 'parcela') {
            // Se o usuário forneceu o valor da parcela, o valor total é calculado
            installmentValueForContext = baseValue; // O valor digitado é o valor da parcela
            baseValue = baseValue * formData.installmentCount; // O valor total é o valor da parcela * count
            baseDescription = `${formData.descricao} (Total: ${formatCurrency(baseValue)})`;
        } else if (formData.installmentValueOption === 'total') {
            // Se o usuário forneceu o valor total, o valor da parcela será calculado no contexto
            baseDescription = `${formData.descricao} (Total: ${formatCurrency(baseValue)})`;
        }
    }
    
    // Garante que a data seja um objeto Date válido, usando new Date() como fallback
    const dataMovimentacao = createLocalDate(formData.data) || new Date();
    
    const movimentacaoData: Omit<MovimentacaoFinanceira, 'id' | 'createdAt' | 'updatedAt'> = {
      descricao: baseDescription,
      valor: baseValue, // Valor total (se parcelado) ou valor único (se recorrente/único)
      tipo: formData.tipo as 'receita' | 'despesa',
      categoria: formData.categoria,
      data: dataMovimentacao,
      status: formData.status as 'pendente' | 'pago' | 'cancelado',
      observacoes: formData.observacoes,
      
      // Recorrência
      isRecurring: formData.isRecurring,
      recurrencePeriod: formData.isRecurring ? formData.recurrencePeriod : undefined,
      recurrenceEndDate: formData.isRecurring && formData.recurrenceEndDateStr 
          ? createLocalDate(formData.recurrenceEndDateStr) 
          : null,
          
      // NOVO: Parcelamento
      isInstallment: formData.isInstallment,
      installmentCount: formData.isInstallment ? formData.installmentCount : undefined,
      // Passa o valor da parcela se o usuário o definiu (installmentValueForContext)
      totalValueForInstallment: installmentValueForContext, 
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
      observacoes: '',
      
      // Recorrência
      isRecurring: false,
      recurrencePeriod: 'monthly',
      recurrenceEndDateStr: '',
      
      // NOVO: Parcelamento
      isInstallment: false,
      installmentCount: 2,
      installmentValueOption: 'total',
    })
    setEditingMovimentacao(null)
    setShowForm(false)
  }

  const handleEdit = (movimentacao: any) => {
    // Não é possível editar movimentações recorrentes ou parceladas individualmente
    if (movimentacao.isRecurring || movimentacao.isInstallment) {
        alert('Não é possível editar movimentações recorrentes ou parceladas individualmente. Altere o status ou exclua.');
        return;
    }
    
    setFormData({
      descricao: movimentacao.descricao,
      valor: formatCurrency(movimentacao.valor.toString()),
      tipo: movimentacao.tipo,
      categoria: movimentacao.categoria,
      // Usar format para garantir YYYY-MM-DD a partir do objeto Date
      data: format(new Date(movimentacao.data), 'yyyy-MM-dd'),
      status: movimentacao.status,
      observacoes: movimentacao.observacoes || '',
      
      // Recorrência (set to false/empty for editing single movements)
      isRecurring: false,
      recurrencePeriod: 'monthly',
      recurrenceEndDateStr: '',
      
      // NOVO: Parcelamento (set to false/empty for editing single movements)
      isInstallment: false,
      installmentCount: 2,
      installmentValueOption: 'total',
    })
    setEditingMovimentacao(movimentacao)
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
      // Se for recorrente ou parcelado, o modal de confirmação deve ser exibido
      if (movimentacao.isRecurring || movimentacao.isInstallment) {
          setShowDeleteConfirm(true);
      } else {
          // Para movimentação única, exclui diretamente
          deleteMovimentacao(id, false);
      }
    }
  }

  // FUNÇÃO AUSENTE 3: confirmDelete
  const confirmDelete = (deleteGroup: boolean = false) => {
    if (deleteTarget) {
      const targetMov = movimentacoes.find(m => m.id === deleteTarget.id);
      if (!targetMov) return;
      
      // Passa a flag para o contexto
      deleteMovimentacao(deleteTarget.id, deleteGroup);

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
      // Se for Pendente -> Urgente ou Urgente -> Pendente (sem comprovante)
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
        dataPagamento: createLocalDate(paymentDate) || new Date(),
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
  
  // --- Configuração do Filtro de Data Unificado ---
  const dateFilterOptions = useMemo(() => [
    {
      key: 'vencimento',
      label: 'Vencimento',
      startState: filterVencStartDate,
      endState: filterVencEndDate,
      setStart: setFilterVencStartDate,
      setEnd: setFilterVencEndDate,
    },
    {
      key: 'pagamento',
      label: 'Pagamento',
      startState: filterPayStartDate,
      endState: filterPayEndDate,
      setStart: setFilterPayStartDate,
      setEnd: setFilterPayEndDate,
    },
  ], [filterVencStartDate, filterVencEndDate, filterPayStartDate, filterPayEndDate]);
  
  // Componente de renderização da linha da tabela
  const renderTableRow = (movimentacao: MovimentacaoFinanceira) => (
    <tr 
      key={movimentacao.id} 
      className="table-card-row cursor-pointer"
      onClick={() => handleOpenDetailModal(movimentacao)}
    >
      <td className="table-cell text-sm">
        {format(new Date(movimentacao.data), 'dd/MM/yyyy', { locale: ptBR })}
        {movimentacao.isRecurring && (
            <span className="ml-2 badge badge-info">Rec.</span>
        )}
        {/* NOVO: Indicador de Parcelamento */}
        {movimentacao.isInstallment && movimentacao.installmentIndex && movimentacao.installmentCount && (
            <span className="ml-2 badge badge-info">
                {movimentacao.installmentIndex}/{movimentacao.installmentCount}
            </span>
        )}
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
            disabled={movimentacao.isRecurring || movimentacao.isInstallment}
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
  );

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
        {/* ALTERADO: Grid para 2 colunas em md e 5 em lg */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          
          {/* Busca (md: 2 colunas, lg: 1 coluna) */}
          <div className="relative md:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 h-11 text-sm"
            />
          </div>

          {/* Tipo (1 coluna) */}
          <select
            value={filterType}
            onChange={(e) => {
                setFilterType(e.target.value);
                // Não limpamos filterCategories aqui, o useEffect fará isso se necessário
            }}
            className="input-field h-11 text-sm"
          >
            <option value="">Tipos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>

          {/* NOVO: Filtro de Categoria (1 coluna) */}
          <MultiSelectStatus
            label="Categorias"
            options={filteredCategoryOptions}
            selectedKeys={filterCategories}
            onChange={setFilterCategories}
          />

          {/* Status (1 coluna) */}
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

          {/* Filtro de Data Unificado (1 coluna) */}
          <div className="md:col-span-2 lg:col-span-1">
            <DateRangeFilter
              options={dateFilterOptions}
            />
          </div>
        </div>
      </div>

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
                filteredMovimentacoes.map(renderTableRow)
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
          <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editingMovimentacao ? 'Editar Movimentação' : 'Nova Movimentação'}</h3>
              <button onClick={resetForm} className="btn-ghost p-2"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                <input type="text" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} className="input-field" required />
              </div>
              
              {/* Valor (Condicionalmente) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {formData.isInstallment && formData.installmentValueOption === 'parcela' ? 'Valor da Parcela' : 'Valor Total'}
                </label>
                <input 
                    type="text" 
                    value={formData.valor} 
                    onChange={(e) => setFormData({ ...formData, valor: formatCurrency(e.target.value) })} 
                    className="input-field" 
                    placeholder="R$ 0,00" 
                    required 
                />
                {formData.isInstallment && formData.installmentValueOption === 'total' && formData.installmentCount > 0 && parseCurrency(formData.valor) > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Valor da Parcela: {formatCurrency(parseCurrency(formData.valor) / formData.installmentCount)}
                    </p>
                )}
                {formData.isInstallment && formData.installmentValueOption === 'parcela' && formData.installmentCount > 0 && parseCurrency(formData.valor) > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Valor Total: {formatCurrency(parseCurrency(formData.valor) * formData.installmentCount)}
                    </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                <select 
                    value={formData.tipo} 
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'receita' | 'despesa', categoria: '' })} 
                    className="input-field" 
                    required
                >
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </div>
              
              {/* Categoria (AGORA SEARCHABLE SELECT) */}
              <div>
                <SearchableSelect
                    label="Categoria"
                    placeholder="Buscar ou selecionar categoria"
                    valueId={formData.categoria}
                    options={formCategoryOptions}
                    onSelect={(id) => setFormData({ ...formData, categoria: id })}
                    onClear={() => setFormData({ ...formData, categoria: '' })}
                    icon={List}
                    required
                />
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
                  <option value="cancelado">Urgente</option>
                </select>
              </div>
              
              {/* Recorrência */}
              <div className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg space-y-3" style={{ opacity: formData.isInstallment ? 0.5 : 1, pointerEvents: formData.isInstallment ? 'none' : 'auto' }}>
                <StandardCheckbox
                  label="Movimentação Recorrente"
                  checked={formData.isRecurring}
                  onChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      isRecurring: checked, 
                      recurrenceEndDateStr: checked ? prev.recurrenceEndDateStr : '',
                      isInstallment: false, // Desabilita parcelamento
                  }))}
                  className="bg-white dark:bg-gray-800 p-0"
                />
                
                {formData.isRecurring && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Período de Recorrência *</label>
                      <select 
                        value={formData.recurrencePeriod} 
                        onChange={(e) => setFormData({ ...formData, recurrencePeriod: e.target.value as MovimentacaoFinanceira['recurrencePeriod'] })} 
                        className="input-field" 
                        required
                      >
                        <option value="monthly">Mensal</option>
                        <option value="quarterly">Trimestral</option>
                        <option value="yearly">Anual</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data Final (Opcional)</label>
                      <input 
                        type="date" 
                        value={formData.recurrenceEndDateStr} 
                        onChange={(e) => setFormData({ ...formData, recurrenceEndDateStr: e.target.value })} 
                        className="input-field" 
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Deixe em branco para recorrência indeterminada (limite de 12 instâncias).</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* NOVO: Parcelamento */}
              <div className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg space-y-3" style={{ opacity: formData.isRecurring ? 0.5 : 1, pointerEvents: formData.isRecurring ? 'none' : 'auto' }}>
                <StandardCheckbox
                  label="Movimentação Parcelada"
                  checked={formData.isInstallment}
                  onChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      isInstallment: checked, 
                      isRecurring: false, // Desabilita recorrência
                  }))}
                  className="bg-white dark:bg-gray-800 p-0"
                />
                
                {formData.isInstallment && (
                  <div className="space-y-4 pt-2">
                    {/* Opção de Valor */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor a ser preenchido *</label>
                      <select 
                        value={formData.installmentValueOption} 
                        onChange={(e) => setFormData({ ...formData, installmentValueOption: e.target.value as 'total' | 'parcela' })} 
                        className="input-field" 
                        required
                      >
                        <option value="total">Valor Total da Compra</option>
                        <option value="parcela">Valor da Parcela</option>
                      </select>
                    </div>
                    
                    {/* Quantidade de Parcelas */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantidade de Parcelas *</label>
                      <input 
                        type="number" 
                        min="2"
                        value={formData.installmentCount} 
                        onChange={(e) => setFormData({ ...formData, installmentCount: parseInt(e.target.value) || 2 })} 
                        className="input-field" 
                        required
                      />
                    </div>
                  </div>
                )}
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
      
      {/* Modal de Gerenciamento de Categorias */}
      {showCategoriesModal && (
        <CategoriesModal
          isOpen={showCategoriesModal}
          onClose={() => setShowCategoriesModal(false)}
          categories={categories}
          addCategory={addCategory}
          removeCategory={removeCategory}
        />
      )}
      
      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && deleteTarget && (
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setDeleteTarget(null);
          }}
          onConfirm={() => confirmDelete(true)}
          title="Excluir Movimentação"
          message={
            <>
              A movimentação "{deleteTarget.descricao}" faz parte de um grupo recorrente/parcelado.
              <p className="mt-3">Deseja excluir apenas esta instância ou o grupo completo?</p>
            </>
          }
          confirmText="Excluir Grupo Completo"
          cancelText="Excluir Apenas Esta"
          variant="danger"
        >
          <div className="flex space-x-3 mt-4">
            <button
              type="button"
              onClick={() => confirmDelete(false)}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Excluir Apenas Esta
            </button>
            <button
              type="button"
              onClick={() => confirmDelete(true)}
              className="flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium bg-red-600 hover:bg-red-700"
            >
              Excluir Grupo Completo
            </button>
          </div>
        </ConfirmationModal>
      )}
    </div>
  )
}

export default Financeiro