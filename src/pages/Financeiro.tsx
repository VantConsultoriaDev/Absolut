import React, { useState, useMemo } from 'react'
import { useDatabase } from '../contexts/DatabaseContext'
import { useModal } from '../hooks/useModal'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency, parseCurrency } from '../utils/formatters'
import { undoService } from '../services/undoService' // Atualizado para importar do serviço
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
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

const Financeiro: React.FC = () => {
  const { 
    movimentacoes, 
    createMovimentacao, 
    updateMovimentacao, 
    deleteMovimentacao
  } = useDatabase()

  const [showForm, setShowForm] = useState(false)
  const [editingMovimentacao, setEditingMovimentacao] = useState<any>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{id: string, descricao: string} | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState<{id: string, descricao: string} | null>(null)
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  
  const { modalRef } = useModal({
    isOpen: showForm,
    onClose: () => {
      setShowForm(false)
      setEditingMovimentacao(null)
      setFormAnchor(null)
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
  const [filterStatus, setFilterStatus] = useState('')
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
  const [showStatusDropdown, setShowStatusDropdown] = useState<string | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const [formAnchor, setFormAnchor] = useState<{ top: number, left: number } | null>(null)

  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    tipo: 'despesa',
    categoria: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    status: 'pendente',
    observacoes: ''
  })

  const categorias = {
    receita: ['Cliente', 'Frete', 'Seguros', 'Negociações', 'Outros'],
    despesa: ['Frete', 'Aluguel', 'Salários', 'Seguros', 'Impostos', 'Manutenção', 'Outros']
  }

  const statusConfig = {
    pendente: { label: 'Pendente', color: 'badge-warning', icon: Clock },
    pago: { label: 'Pago', color: 'badge-success', icon: CheckCircle },
    cancelado: { label: 'Adiado', color: 'badge-danger', icon: AlertTriangle }
  }

  // Componente de calendário para seleção de intervalo (Mantido, mas RangeCalendar foi movido para componente separado)
  const RangeCalendar: React.FC<{
    month: Date,
    start: Date | null,
    end: Date | null,
    onPrev: () => void,
    onNext: () => void,
    onSelectDate: (d: Date) => void,
    onApply: () => void,
    onClear: () => void
  }> = ({ month, start, end, onPrev, onNext, onSelectDate, onApply, onClear }) => {
    const year = month.getFullYear()
    const m = month.getMonth()
    const firstWeekday = new Date(year, m, 1).getDay() // 0=Dom,...6=Sab
    const daysInMonth = new Date(year, m + 1, 0).getDate()

    const cells: (Date | null)[] = []
    for (let i = 0; i < firstWeekday; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, m, d))

    const rows: (Date | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))

    const weekLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const isSameDay = (a: Date, b: Date) => (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    )

    const inRange = (d: Date) => {
      if (!start || !end) return false
      const s = start < end ? start : end
      const e = end > start ? end : start
      const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const sd = new Date(s.getFullYear(), s.getMonth(), s.getDate())
      const ed = new Date(e.getFullYear(), e.getMonth(), e.getDate())
      return dd >= sd && dd <= ed
    }

    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg w-80 p-3">
        <div className="flex items-center justify-between mb-2">
          <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700" onClick={onPrev}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-sm font-medium">
            {format(month, 'MMMM yyyy', { locale: ptBR })}
          </div>
          <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700" onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-xs text-center mb-1">
          {weekLabels.map(d => (
            <div key={d} className="text-slate-500 dark:text-slate-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {rows.map((row, ri) => (
            row.map((cell, ci) => (
              cell ? (
                <button
                  key={`${ri}-${ci}`}
                  onClick={() => onSelectDate(cell)}
                  className={`py-2 rounded text-sm transition-colors ${
                    (start && isSameDay(cell, start)) || (end && isSameDay(cell, end))
                      ? 'bg-blue-600 text-white'
                      : inRange(cell)
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {cell.getDate()}
                </button>
              ) : (
                <div key={`${ri}-${ci}`} />
              )
            ))
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button className="btn-secondary flex-1" onClick={onClear}>Limpar</button>
          <button className="btn-primary flex-1" onClick={onApply}>Aplicar</button>
        </div>
      </div>
    )
  }

  const filteredMovimentacoes = useMemo(() => {
    return movimentacoes.filter(movimentacao => {
      const matchSearch = movimentacao.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movimentacao.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchType = !filterType || movimentacao.tipo === filterType
      const matchStatus = !filterStatus || movimentacao.status === filterStatus
      
      // Filtro por Vencimento (movimentacao.data)
      let matchesVencimentoRange = true
      if (filterVencStartDate) {
        const startDate = new Date(filterVencStartDate)
        const d = new Date(movimentacao.data)
        matchesVencimentoRange = matchesVencimentoRange && d >= startDate
      }
      if (filterVencEndDate) {
        const endDate = new Date(filterVencEndDate)
        const d = new Date(movimentacao.data)
        matchesVencimentoRange = matchesVencimentoRange && d <= endDate
      }

      // Filtro por Pagamento (movimentacao.dataPagamento)
      let matchesPagamentoRange = true
      if (filterPayStartDate || filterPayEndDate) {
        if (!movimentacao.dataPagamento) {
          matchesPagamentoRange = false
        } else {
          const dp = new Date(movimentacao.dataPagamento)
          if (filterPayStartDate) {
            const ps = new Date(filterPayStartDate)
            matchesPagamentoRange = matchesPagamentoRange && dp >= ps
          }
          if (filterPayEndDate) {
            const pe = new Date(filterPayEndDate)
            matchesPagamentoRange = matchesPagamentoRange && dp <= pe
          }
        }
      }
      
      return matchSearch && matchType && matchStatus && matchesVencimentoRange && matchesPagamentoRange
    })
  }, [movimentacoes, searchTerm, filterType, filterStatus, filterVencStartDate, filterVencEndDate, filterPayStartDate, filterPayEndDate])

  const stats = useMemo(() => {
    const receitas = movimentacoes.filter(t => t.tipo === 'receita')
    const despesas = movimentacoes.filter(t => t.tipo === 'despesa')
    
    const totalReceitas = receitas.reduce((sum, t) => sum + (t.valor || 0), 0)
    const totalDespesas = despesas.reduce((sum, t) => sum + (t.valor || 0), 0)
    const saldo = totalReceitas - totalDespesas
    
    const receitasPendentes = receitas.filter(t => t.status === 'pendente').reduce((sum, t) => sum + (t.valor || 0), 0)
    const despesasPendentes = despesas.filter(t => t.status === 'pendente').reduce((sum, t) => sum + (t.valor || 0), 0)
    
    return { totalReceitas, totalDespesas, saldo, receitasPendentes, despesasPendentes, totalTransacoes: movimentacoes.length }
  }, [movimentacoes])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const movimentacaoData = {
      ...formData,
      tipo: formData.tipo as 'receita' | 'despesa',
      status: formData.status as 'pendente' | 'pago' | 'cancelado',
      valor: parseCurrency(formData.valor),
      data: new Date(formData.data)
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
    setFormAnchor(null)
  }

  const handleEdit = (movimentacao: any, e?: React.MouseEvent<HTMLButtonElement>) => {
    setFormData({
      descricao: movimentacao.descricao,
      valor: formatCurrency(movimentacao.valor.toString()),
      tipo: movimentacao.tipo,
      categoria: movimentacao.categoria,
      data: format(new Date(movimentacao.data), 'yyyy-MM-dd'),
      status: movimentacao.status,
      observacoes: movimentacao.observacoes || ''
    })
    setEditingMovimentacao(movimentacao)
    if (e) {
      const rect = e.currentTarget.getBoundingClientRect()
      const left = Math.min(rect.left + window.scrollX, window.scrollX + window.innerWidth - 380)
      const top = rect.bottom + window.scrollY + 8
      setFormAnchor({ top, left })
    } else {
      setFormAnchor(null)
    }
    setShowForm(true)
  }

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

  const handleChangeStatus = (id: string, newStatus: 'pendente' | 'pago' | 'cancelado') => {
    if (newStatus === 'pago') {
      const movimentacao = movimentacoes.find(m => m.id === id);
      if (movimentacao) {
        setPaymentTarget({
          id: id,
          descricao: movimentacao.descricao
        });
        setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
        setShowPaymentModal(true);
      }
    } else {
      updateMovimentacao(id, { status: newStatus, dataPagamento: null });
    }
    setShowStatusDropdown(null);
  };

  const confirmPayment = () => {
    if (paymentTarget) {
      updateMovimentacao(paymentTarget.id, { 
        status: 'pago',
        dataPagamento: new Date(paymentDate)
      });
      setShowPaymentModal(false);
      setPaymentTarget(null);
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
        <button
          onClick={() => {
            setFormAnchor(null)
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Receitas */}
        <div className="stat-card hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="stat-label">Receitas</p>
              <p className="stat-value">{formatCurrency(stats.totalReceitas)}</p>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Despesas */}
        <div className="stat-card hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="stat-label">Despesas</p>
              <p className="stat-value text-red-600 dark:text-red-400">{formatCurrency(stats.totalDespesas)}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        {/* Saldo */}
        <div className={`stat-card hover:shadow-md ${stats.saldo >= 0 ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'bg-red-50/50 dark:bg-red-900/10'}`}>
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="stat-label">Saldo</p>
              <p className={`stat-value ${stats.saldo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(stats.saldo)}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${stats.saldo >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              <DollarSign className={`h-6 w-6 ${stats.saldo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
            </div>
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

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field h-11 text-sm"
          >
            <option value="">Status</option>
            {Object.entries(statusConfig).map(([status, config]) => (
              <option key={status} value={status}>{config.label}</option>
            ))}
          </select>

          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Vencimento</label>
            <button
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                setVencCalendarPosition({
                  top: rect.bottom + window.scrollY + 5,
                  left: rect.left + window.scrollX
                })
                const s = filterVencStartDate ? new Date(filterVencStartDate) : null
                const ed = filterVencEndDate ? new Date(filterVencEndDate) : null
                setTempVencStart(s)
                setTempVencEnd(ed)
                setVencMonth(s || new Date())
                setShowVencCalendar(true)
              }}
              className="input-field flex items-center justify-between h-11 text-sm"
            >
              <span className="text-sm">
                {filterVencStartDate && filterVencEndDate
                  ? `${format(new Date(filterVencStartDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(filterVencEndDate), 'dd/MM/yyyy', { locale: ptBR })}`
                  : filterVencStartDate
                    ? `De ${format(new Date(filterVencStartDate), 'dd/MM/yyyy', { locale: ptBR })}`
                    : 'Selecionar período'}
              </span>
              <Calendar className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Pagamento</label>
            <button
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                setPayCalendarPosition({
                  top: rect.bottom + window.scrollY + 5,
                  left: rect.left + window.scrollX
                })
                const s = filterPayStartDate ? new Date(filterPayStartDate) : null
                const ed = filterPayEndDate ? new Date(filterPayEndDate) : null
                setTempPayStart(s)
                setTempPayEnd(ed)
                setPayMonth(s || new Date())
                setShowPayCalendar(true)
              }}
              className="input-field flex items-center justify-between h-11 text-sm"
            >
              <span className="text-sm">
                {filterPayStartDate && filterPayEndDate
                  ? `${format(new Date(filterPayStartDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(filterPayEndDate), 'dd/MM/yyyy', { locale: ptBR })}`
                  : filterPayStartDate
                    ? `De ${format(new Date(filterPayStartDate), 'dd/MM/yyyy', { locale: ptBR })}`
                    : 'Selecionar período'}
              </span>
              <Calendar className="h-5 w-5 text-slate-400" />
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
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="table-cell text-left">Vencimento</th>
                <th className="table-cell text-left">Descrição</th>
                <th className="table-cell text-left">Categoria</th>
                <th className="table-cell text-left">Tipo</th>
                <th className="table-cell text-left">Valor</th>
                <th className="table-cell text-left">Status</th>
                <th className="table-cell text-left">Pagamento</th>
                <th className="table-cell text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredMovimentacoes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-cell text-center text-slate-500 dark:text-slate-400 py-8">
                    Nenhuma transação encontrada
                  </td>
                </tr>
              ) : (
                filteredMovimentacoes.map((movimentacao) => (
                  <tr key={movimentacao.id} className="table-body-row">
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
                          onClick={(e) => handleEdit(movimentacao, e)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setDropdownPosition({
                                top: rect.bottom + window.scrollY + 5,
                                left: rect.left + window.scrollX - 150
                              });
                              setShowStatusDropdown(showStatusDropdown === movimentacao.id ? null : movimentacao.id);
                            }}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                            title="Alterar status"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleDelete(movimentacao.id)}
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

      {/* Dropdown de Status */}
      {showStatusDropdown && (
        <div 
          className="fixed z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-2 min-w-[160px]"
          style={{
            top: `${dropdownPosition?.top}px`,
            left: `${dropdownPosition?.left}px`
          }}
        >
          {Object.entries(statusConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => handleChangeStatus(showStatusDropdown, key as 'pendente' | 'pago' | 'cancelado')}
              className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-sm"
            >
              <config.icon className="h-4 w-4" />
              {config.label}
            </button>
          ))}
        </div>
      )}

      {/* Overlay para fechar dropdown */}
      {showStatusDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowStatusDropdown(null)}
        />
      )}

      {/* Modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
          {formAnchor ? (
            <div
              ref={modalRef}
              className="fixed z-50 card w-full max-w-md max-h-[90vh] overflow-y-auto"
              style={{ top: `${formAnchor.top}px`, left: `${formAnchor.left}px` }}
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {editingMovimentacao ? 'Editar Movimentação' : 'Nova Movimentação'}
                </h3>
                <button onClick={resetForm} className="btn-ghost p-2">
                  <X className="h-5 w-5" />
                </button>
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
                    {categorias[formData.tipo as keyof typeof categorias].map(cat => (
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
          ) : (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
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
                      {categorias[formData.tipo as keyof typeof categorias].map(cat => (
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
        </>
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
                Pagamento:
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
                required
              />
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