import React, { useState, useMemo } from 'react'
import { useDatabase } from '../contexts/DatabaseContext'
import { useModal } from '../hooks/useModal'
import { format, isWithinInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency, parseCurrency } from '../utils/formatters'
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
  RefreshCw
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
      setFormData({
        descricao: '',
        valor: '',
        tipo: 'receita',
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
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [showStatusDropdown, setShowStatusDropdown] = useState<string | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    tipo: 'receita',
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

  const filteredMovimentacoes = useMemo(() => {
    return movimentacoes.filter(movimentacao => {
      const matchSearch = movimentacao.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movimentacao.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchType = !filterType || movimentacao.tipo === filterType
      const matchStatus = !filterStatus || movimentacao.status === filterStatus
      
      let matchesDateRange = true
      if (filterStartDate && filterEndDate) {
        const movimentacaoDate = new Date(movimentacao.data)
        const startDate = new Date(filterStartDate)
        const endDate = new Date(filterEndDate)
        matchesDateRange = isWithinInterval(movimentacaoDate, { start: startDate, end: endDate })
      } else if (filterStartDate) {
        const movimentacaoDate = new Date(movimentacao.data)
        const startDate = new Date(filterStartDate)
        matchesDateRange = movimentacaoDate >= startDate
      } else if (filterEndDate) {
        const movimentacaoDate = new Date(movimentacao.data)
        const endDate = new Date(filterEndDate)
        matchesDateRange = movimentacaoDate <= endDate
      }
      
      return matchSearch && matchType && matchStatus && matchesDateRange
    })
  }, [movimentacoes, searchTerm, filterType, filterStatus, filterStartDate, filterEndDate])

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
      tipo: 'receita',
      categoria: '',
      data: format(new Date(), 'yyyy-MM-dd'),
      status: 'pendente',
      observacoes: ''
    })
    setEditingMovimentacao(null)
    setShowForm(false)
  }

  const handleEdit = (movimentacao: any) => {
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
      updateMovimentacao(id, { status: newStatus });
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
          onClick={() => setShowForm(true)}
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input-field"
          >
            <option value="">Todos os tipos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field"
          >
            <option value="">Todos os status</option>
            {Object.entries(statusConfig).map(([status, config]) => (
              <option key={status} value={status}>{config.label}</option>
            ))}
          </select>

          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className="input-field"
          />

          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="table-cell text-left">Data</th>
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
                  <tr key={movimentacao.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
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
                          onClick={() => handleEdit(movimentacao)}
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
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div ref={modalRef} className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
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
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Valor
                </label>
                <input
                  type="text"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: formatCurrency(e.target.value) })}
                  className="input-field"
                  placeholder="R$ 0,00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tipo
                </label>
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

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Categoria
                </label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Selecione uma categoria</option>
                  {categorias[formData.tipo as keyof typeof categorias].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Adiado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="input-field"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={resetForm} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingMovimentacao ? 'Atualizar' : 'Criar'}
                </button>
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
