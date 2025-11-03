import React, { useMemo, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useDatabase } from '../contexts/DatabaseContext'
import { formatDocument, formatContact } from '../utils/formatters'
import { Plus, Edit, Trash2, Search, Building2, User, Globe, Mail, Phone, Image, X as CloseIcon } from 'lucide-react'
import { CNPJService } from '../services/cnpjService'
import { useModal } from '../hooks/useModal' // Importando useModal

const Clientes: React.FC = () => {
  const location = useLocation()
  const { clientes, createCliente, updateCliente, deleteCliente } = useDatabase()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null) // Arquivo temporário
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null) // Preview da imagem

  const [form, setForm] = useState({
    tipo: 'PJ' as 'PF' | 'PJ' | 'INTERNACIONAL',
    nome: '',
    documento: '',
    email: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    observacoes: '',
    isActive: true as boolean,
    avatarUrl: '' // Adicionado ao estado do formulário
  })

  // Estados para consulta de CNPJ (apenas para PJ)
  const [consultandoCNPJ, setConsultandoCNPJ] = useState(false)
  const [cnpjConsultado, setCnpjConsultado] = useState(false)

  // Hook useModal
  const { modalRef } = useModal({
    isOpen: showForm,
    onClose: () => {
      setShowForm(false)
      resetForm()
    }
  })

  // Reset para tela inicial quando navegado via menu lateral
  useEffect(() => {
    if (location.state?.resetModule) {
      // Fechar modal e limpar estados
      setShowForm(false)
      setEditingId(null)
      resetForm()
      setQuery('')
      setAvatarFile(null)
      setAvatarPreview(null)
      setConsultandoCNPJ(false)
      setCnpjConsultado(false)
    }
  }, [location.state])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter(c =>
      (c.nome || '').toLowerCase().includes(q) ||
      (c.documento || '').toLowerCase().includes(q)
    )
  }, [clientes, query])

  const resetForm = () => {
    setForm({
      tipo: 'PJ',
      nome: '',
      documento: '',
      email: '',
      telefone: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      observacoes: '',
      isActive: true,
      avatarUrl: ''
    })
    setEditingId(null)
    setConsultandoCNPJ(false)
    setCnpjConsultado(false)
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  const startEdit = (id: string) => {
    const c = clientes.find(x => x.id === id)
    if (!c) return
    setForm({
      tipo: c.tipo,
      nome: c.nome || '',
      documento: c.documento || '',
      email: c.email || '',
      telefone: c.telefone || '',
      endereco: c.endereco || '',
      cidade: c.cidade || '',
      estado: c.estado || '',
      cep: c.cep || '',
      observacoes: c.observacoes || '',
      isActive: c.isActive ?? true,
      avatarUrl: c.avatarUrl || ''
    })
    setAvatarPreview(c.avatarUrl || null)
    setEditingId(c.id)
    setShowForm(true)
  }
  
  // Handler para upload de imagem (converte para Base64)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }
  
  const handleRemoveImage = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    setForm(prev => ({ ...prev, avatarUrl: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) {
      alert('Informe o nome/razão social do cliente')
      return
    }
    
    let finalAvatarUrl = form.avatarUrl;
    
    // Se houver um novo arquivo, use o preview (Base64)
    if (avatarFile && avatarPreview) {
        finalAvatarUrl = avatarPreview;
    } else if (!avatarFile && !avatarPreview) {
        // Se o usuário removeu a imagem
        finalAvatarUrl = '';
    }
    
    const payload = {
      ...form,
      documento: form.documento,
      avatarUrl: finalAvatarUrl,
    }
    
    if (editingId) {
      updateCliente(editingId, payload)
    } else {
      createCliente(payload)
    }
    
    setShowForm(false)
    resetForm()
  }

  // Consulta automática de CNPJ (PJ)
  const handleCNPJConsultation = async (cnpj: string) => {
    if (form.tipo !== 'PJ') return
    const cnpjLimpo = cnpj.replace(/\D/g, '')
    if (cnpjLimpo.length !== 14) return
    if (consultandoCNPJ) return

    setConsultandoCNPJ(true)
    try {
      // Passa o CNPJ formatado para o serviço, que fará a limpeza/formatação final
      const dados = await CNPJService.consultarCNPJ(cnpj) 
      if (dados) {
        setForm(prev => ({
          ...prev,
          nome: dados.razaoSocial || prev.nome,
          telefone: dados.telefone || prev.telefone,
          endereco: dados.endereco || prev.endereco,
          cidade: dados.cidade || prev.cidade,
          estado: dados.uf || prev.estado,
          cep: dados.cep || prev.cep
        }))
        setCnpjConsultado(true)
        if (dados.simulado) {
          alert('Não foi possível conectar com a API de CNPJ. Usando dados simulados para demonstração.')
        }
      }
    } catch (err) {
      console.error('Erro ao consultar CNPJ:', err)
      alert('Erro ao consultar CNPJ. Verifique o número e tente novamente.')
    } finally {
      setConsultandoCNPJ(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
          <p className="text-gray-600 dark:text-gray-400">Cadastro e gestão de clientes</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou documento"
              className="input-field pl-9"
            />
          </div>
        </div>
      </div>

      {/* Lista de Clientes em Formato de Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Nenhum cliente encontrado.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Tente ajustar sua busca ou adicione um novo cliente.</p>
          </div>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col">
              <div className="p-5 flex-grow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {c.avatarUrl ? (
                      <img 
                        src={c.avatarUrl} 
                        alt={c.nome} 
                        className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        c.tipo === 'PJ' ? 'bg-blue-500 text-white' : 
                        c.tipo === 'PF' ? 'bg-green-500 text-white' : 
                        'bg-purple-500 text-white'
                      }`}>
                        {c.tipo === 'PJ' ? <Building2 className="h-5 w-5" /> :
                         c.tipo === 'PF' ? <User className="h-5 w-5" /> :
                         <Globe className="h-5 w-5" />}
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{c.nome}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{
                        c.tipo === 'PJ' ? 'Pessoa Jurídica' :
                        c.tipo === 'PF' ? 'Pessoa Física' :
                        'Internacional'
                      }</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <p className="text-gray-600 dark:text-gray-300 font-mono tracking-tight bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-md">{formatDocument(c.documento || '', c.tipo)}</p>
                  
                  {c.email && (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${c.email}`} className="hover:text-blue-500 truncate">{c.email}</a>
                    </div>
                  )}
                  
                  {c.telefone && (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <Phone className="h-4 w-4" />
                      <span className="truncate">{c.telefone}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800/50 px-5 py-3 flex justify-end items-center gap-2 rounded-b-2xl">
                <button 
                  onClick={() => startEdit(c.id)} 
                  className="p-2 rounded-full text-gray-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  aria-label="Editar"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => deleteCliente(c.id)} 
                  className="p-2 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={() => { setShowForm(false); resetForm() }} className="text-gray-400 hover:text-gray-600">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Seção de Imagem */}
              <div className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Imagem do Cliente (Opcional)
                </label>
                <div className="flex items-center space-x-4">
                  <div className="relative h-16 w-16 flex-shrink-0">
                    {avatarPreview ? (
                      <img 
                        src={avatarPreview} 
                        alt="Preview" 
                        className="h-16 w-16 rounded-full object-cover border-2 border-blue-500"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                        <Image className="h-6 w-6" />
                      </div>
                    )}
                    {(avatarPreview || form.avatarUrl) && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        title="Remover imagem"
                      >
                        <CloseIcon className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full text-sm text-gray-500 dark:text-gray-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-medium
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      dark:file:bg-blue-900 dark:file:text-blue-300
                      dark:hover:file:bg-blue-800"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  A imagem será salva localmente (Base64) e exibida no card.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => {
                      const novoTipo = e.target.value as 'PF' | 'PJ' | 'INTERNACIONAL'
                      setForm(prev => ({ ...prev, tipo: novoTipo, documento: '' }))
                      setCnpjConsultado(false)
                      setConsultandoCNPJ(false)
                    }}
                    className="input-field"
                  >
                    <option value="PF">Pessoa Física</option>
                    <option value="PJ">Pessoa Jurídica</option>
                    <option value="INTERNACIONAL">Internacional</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome / Razão Social *</label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  {form.tipo === 'PJ' ? (
                    <>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        CNPJ *
                        {consultandoCNPJ && (
                          <span className="ml-2 text-blue-500 text-xs">Consultando...</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={form.documento}
                        onChange={(e) => {
                          const formatted = formatDocument(e.target.value, 'PJ')
                          const limpo = formatted.replace(/\D/g, '')
                          setForm(prev => ({ ...prev, documento: formatted }))
                          if (cnpjConsultado && limpo.length < 14) setCnpjConsultado(false)
                          if (limpo.length === 14) {
                            handleCNPJConsultation(formatted)
                          }
                        }}
                        className={`input-field ${consultandoCNPJ ? 'opacity-50' : ''}`}
                        placeholder="00.000.000/0000-00"
                        disabled={consultandoCNPJ}
                        required
                      />
                      {cnpjConsultado && (
                        <p className="text-green-600 text-xs mt-1">✓ Dados consultados automaticamente</p>
                      )}
                    </>
                  ) : form.tipo === 'PF' ? (
                    <>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CPF *</label>
                      <input
                        type="text"
                        value={form.documento}
                        onChange={(e) => {
                          const formatted = formatDocument(e.target.value, 'PF')
                          setForm(prev => ({ ...prev, documento: formatted }))
                        }}
                        placeholder="000.000.000-00"
                        className="input-field"
                        required
                      />
                    </>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Documento</label>
                      <input
                        type="text"
                        value={form.documento}
                        onChange={(e) => setForm(prev => ({ ...prev, documento: e.target.value }))}
                        placeholder="Documento"
                        className="input-field"
                        required
                      />
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={form.telefone}
                    onChange={(e) => setForm(prev => ({ ...prev, telefone: formatContact(e.target.value) }))}
                    className="input-field"
                    placeholder="Ex: +55 11 9 8765-4321 ou (11) 98765-4321"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço</label>
                  <input
                    type="text"
                    value={form.endereco}
                    onChange={(e) => setForm(prev => ({ ...prev, endereco: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={form.cidade}
                    onChange={(e) => setForm(prev => ({ ...prev, cidade: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                  <input
                    type="text"
                    value={form.estado}
                    onChange={(e) => setForm(prev => ({ ...prev, estado: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CEP</label>
                  <input
                    type="text"
                    value={form.cep}
                    onChange={(e) => setForm(prev => ({ ...prev, cep: e.target.value }))}
                    className="input-field"
                  />
                </div>
                {/* Checkbox 'Ativo' removido conforme solicitado */}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
                  className="input-field"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); resetForm() }}>Cancelar</button>
                <button type="submit" className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                  {editingId ? 'Salvar alterações' : 'Adicionar cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Clientes