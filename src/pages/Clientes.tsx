import React, { useMemo, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useDatabase } from '../contexts/DatabaseContext'
import { formatDocument, formatContact, parseDocument } from '../utils/formatters'
import { Plus, Search, Building2, User, Globe, Image, X as CloseIcon, AlertTriangle, Mail, Phone } from 'lucide-react'
import { CNPJService } from '../services/cnpjService'
import { useModal } from '../hooks/useModal' // Importando useModal
import ClienteDetailModal from '../components/clientes/ClienteDetailModal' // NOVO IMPORT
import { Cliente } from '../types' // Importando Cliente para tipagem
import { showError } from '../utils/toast' // Importando toasts

const Clientes: React.FC = () => {
  const location = useLocation()
  const { clientes, createCliente, updateCliente, deleteCliente, uploadAvatar } = useDatabase()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null) // Arquivo temporário
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null) // Preview da imagem
  const [isSaving, setIsSaving] = useState(false) // Estado de salvamento
  
  // Estado para o novo modal de detalhes
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailTargetCliente, setDetailTargetCliente] = useState<any>(null)

  const [form, setForm] = useState({
    tipo: 'PJ' as 'PF' | 'PJ' | 'INTERNACIONAL',
    nome: '', // Razão Social (PJ) / Nome (PF/INT)
    nomeFantasia: '', // Novo campo para Nome Fantasia
    documento: '',
    email: '',
    telefone: '',
    responsavel: '', // NOVO CAMPO
    endereco: '',
    numero: '', // NOVO CAMPO
    complemento: '', // NOVO CAMPO
    cidade: '',
    uf: '', // RENOMEADO
    cep: '',
    observacoes: '',
    isActive: true as boolean,
    avatarUrl: null as string | null // Alterado para aceitar string ou null
  })

  // Estados para consulta de CNPJ (apenas para PJ)
  const [consultandoCNPJ, setConsultandoCNPJ] = useState(false)
  const [cnpjConsultado, setCnpjConsultado] = useState(false)
  const [cnpjError, setCnpjError] = useState('') // NOVO: Mensagem de erro de CNPJ

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
      setShowDetailModal(false)
      setDetailTargetCliente(null)
    }
  }, [location.state])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter(c =>
      (c.nome || '').toLowerCase().includes(q) ||
      (c.documento || '').toLowerCase().includes(q) ||
      (c.nomeFantasia || '').toLowerCase().includes(q)
    )
  }, [clientes, query])

  const resetForm = () => {
    setForm({
      tipo: 'PJ',
      nome: '',
      nomeFantasia: '', // NOVO
      documento: '',
      email: '',
      telefone: '',
      responsavel: '', // NOVO CAMPO
      endereco: '',
      numero: '', // NOVO CAMPO
      complemento: '', // NOVO CAMPO
      cidade: '',
      uf: '', // RENOMEADO
      cep: '',
      observacoes: '',
      isActive: true,
      avatarUrl: null // Reset para null
    })
    setEditingId(null)
    setConsultandoCNPJ(false)
    setCnpjConsultado(false)
    setAvatarFile(null)
    setAvatarPreview(null)
    setCnpjError('') // Limpa erro
  }

  const startEdit = (cliente: any) => {
    const c = clientes.find(x => x.id === cliente.id)
    if (!c) return
    setForm({
      tipo: c.tipo,
      nome: c.nome || '',
      nomeFantasia: c.nomeFantasia || '', // NOVO
      documento: c.documento || '',
      email: c.email || '',
      telefone: c.telefone || '',
      responsavel: (c as any).responsavel || '', // NOVO CAMPO
      endereco: c.endereco || '',
      numero: (c as any).numero || '', // NOVO CAMPO
      complemento: (c as any).complemento || '', // NOVO CAMPO
      cidade: c.cidade || '',
      uf: c.uf || '', // RENOMEADO
      cep: c.cep || '',
      observacoes: c.observacoes || '',
      isActive: c.isActive ?? true,
      avatarUrl: c.avatarUrl || null // Carrega URL ou null
    })
    // Se houver URL, usa como preview (não é um arquivo local)
    setAvatarPreview(c.avatarUrl || null)
    setAvatarFile(null) // Garante que não há arquivo pendente
    setEditingId(c.id)
    setShowForm(true)
    setCnpjError('') // Limpa erro
  }
  
  // Handler para upload de imagem (apenas armazena o arquivo e cria o preview)
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
    // Se estiver editando, limpa o avatarUrl para NULL para que a função de update remova o arquivo antigo
    setForm(prev => ({ ...prev, avatarUrl: null }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) {
      alert('Informe o nome/razão social do cliente')
      return
    }
    
    // Validação final do CNPJ/CPF
    if (form.tipo === 'PJ' && !CNPJService.validarCNPJ(form.documento)) {
        showError('CNPJ inválido. Verifique os dígitos.');
        return;
    }
    
    setIsSaving(true)
    let finalAvatarUrl: string | null | undefined = form.avatarUrl; // Começa com a URL existente ou null
    
    // 1. Determinar o ID do cliente. Se for edição, usa o ID existente. Se for criação, gera um ID temporário.
    const clienteId = editingId || generateUuid(); 

    try {
      // 2. Se houver um novo arquivo, faz o upload usando o ID determinado
      if (avatarFile) {
        const url = await uploadAvatar(avatarFile, clienteId);
        if (!url) {
          // Se o upload falhar, a função uploadAvatar já deve ter mostrado um toast de erro.
          throw new Error('Falha ao fazer upload da imagem.');
        }
        finalAvatarUrl = url;
      } else if (form.avatarUrl === null) {
        // 3. Se a URL foi explicitamente limpa (handleRemoveImage), definimos como null
        finalAvatarUrl = null;
      } else if (form.avatarUrl && !avatarFile) {
        // 4. Mantém a URL existente (sem novo upload)
        finalAvatarUrl = form.avatarUrl;
      } else {
        // 5. Se não há URL e nem arquivo, garante que seja null
        finalAvatarUrl = null;
      }
      
      // O payload de atualização/criação deve ser compatível com Partial<Cliente>
      const payload: Partial<Cliente> = {
        ...form,
        documento: parseDocument(form.documento), // Salva documento limpo
        avatarUrl: finalAvatarUrl,
        // Adicionando campos de endereço
        endereco: form.endereco,
        numero: form.numero,
        complemento: form.complemento,
        responsavel: form.responsavel, // NOVO CAMPO
      }
      
      if (editingId) {
        // AGUARDA A ATUALIZAÇÃO DO CONTEXTO (que inclui a exclusão do avatar antigo)
        await updateCliente(editingId, payload)
      } else {
        // Para criação, precisamos garantir que as propriedades obrigatórias (tipo, nome) estejam presentes
        // e que o objeto seja do tipo CreateType<Cliente>
        const createPayload: Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'> = {
            tipo: form.tipo,
            nome: form.nome,
            nomeFantasia: form.nomeFantasia,
            documento: parseDocument(form.documento), // Salva documento limpo
            email: form.email,
            telefone: form.telefone,
            responsavel: form.responsavel, // NOVO CAMPO
            endereco: form.endereco,
            numero: form.numero, // NOVO CAMPO
            complemento: form.complemento, // NOVO CAMPO
            cidade: form.cidade,
            uf: form.uf, // RENOMEADO
            cep: form.cep,
            observacoes: form.observacoes,
            isActive: form.isActive,
            avatarUrl: finalAvatarUrl,
        };
        await createCliente({ ...createPayload, id: clienteId })
      }
      
      setShowForm(false)
      resetForm()
      // showSuccess(`Cliente ${form.nome} salvo com sucesso.`); // REMOVIDO
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      showError(error instanceof Error ? error.message : 'Erro ao salvar cliente.');
    } finally {
      setIsSaving(false)
    }
  }
  
  // Função auxiliar para gerar ID (necessária para o handleSubmit)
  const generateUuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Consulta automática de CNPJ (PJ)
  const handleCNPJConsultation = async (cnpj: string) => {
    if (form.tipo !== 'PJ') return
    const cnpjLimpo = cnpj.replace(/\D/g, '')
    setCnpjError('')
    
    if (cnpjLimpo.length !== 14) return
    
    // 1. Validação de Dígitos
    if (!CNPJService.validarCNPJ(cnpjLimpo)) {
        setCnpjError('CNPJ inválido. Verifique os dígitos.');
        return;
    }
    
    if (consultandoCNPJ) return

    setConsultandoCNPJ(true)
    try {
      // Passa o CNPJ formatado para o serviço, que fará a limpeza/formatação final
      const dados = await CNPJService.consultarCNPJ(cnpj) 
      
      if (dados) {
        setForm(prev => ({
          ...prev,
          nome: dados.razaoSocial || prev.nome, // Razão Social
          nomeFantasia: dados.nomeFantasia || prev.nomeFantasia, // Nome Fantasia
          telefone: formatContact(dados.telefone || prev.telefone || ''),
          endereco: dados.endereco || prev.endereco,
          numero: dados.numero || prev.numero, // NOVO CAMPO
          complemento: dados.complemento || prev.complemento, // NOVO CAMPO
          cidade: dados.cidade || prev.cidade,
          uf: dados.uf || prev.uf, // RENOMEADO
          cep: dados.cep || prev.cep
        }))
        setCnpjConsultado(true)
        setCnpjError('')
        // showSuccess('Dados do CNPJ consultados com sucesso!'); // REMOVIDO
        if (dados.simulado) {
          showError('Não foi possível conectar com a API de CNPJ. Usando dados simulados como fallback.')
        }
      } else {
        // CNPJ válido, mas não encontrado na base externa
        setCnpjError('CNPJ válido, mas não encontrado na base de dados externa.');
      }
    } catch (err) {
      console.error('Erro ao consultar CNPJ:', err)
      setCnpjError(err instanceof Error ? err.message : 'Erro ao consultar CNPJ. Verifique o número e tente novamente.')
    } finally {
      setConsultandoCNPJ(false)
    }
  }
  
  // Handler para abrir o modal de detalhes
  const handleOpenDetailModal = (cliente: any) => {
    setDetailTargetCliente(cliente);
    setShowDetailModal(true);
  };
  
  // Handler para exclusão (passado para o modal de detalhes)
  const handleDeleteCliente = (id: string) => {
    try {
      deleteCliente(id);
      setShowDetailModal(false);
      setDetailTargetCliente(null);
      // showSuccess('Cliente excluído com sucesso.'); // REMOVIDO
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao excluir cliente.');
    }
  };

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
              placeholder="Buscar por nome, documento ou nome fantasia"
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
          filtered.map(c => {
            // Nome principal a ser exibido
            const displayTitle = c.tipo === 'PJ' && c.nomeFantasia ? c.nomeFantasia : c.nome;
            
            return (
            <button 
              key={c.id} 
              onClick={() => handleOpenDetailModal(c)}
              className="text-left bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col p-5"
            >
              <div className="flex-grow">
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
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{displayTitle}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider leading-tight">
                        {c.tipo === 'PJ' ? 'Pessoa Jurídica' :
                        c.tipo === 'PF' ? 'Pessoa Física' :
                        'Internacional'}
                      </p>
                      {/* ADICIONANDO O DOCUMENTO ABAIXO DO TIPO */}
                      {c.documento && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 font-mono tracking-tight leading-tight mt-0.5">
                          {formatDocument(c.documento, c.tipo)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          )})
        )}
      </div>

      {/* Modal de Detalhes/Edição */}
      <ClienteDetailModal
        isOpen={showDetailModal}
        cliente={detailTargetCliente}
        onClose={() => {
          setShowDetailModal(false);
          setDetailTargetCliente(null);
        }}
        onEdit={startEdit}
        onDelete={handleDeleteCliente}
      />

      {/* Modal de Formulário (Mantido para edição) */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="p-6">
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
                          alt={form.nome} 
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
                    A imagem será salva no Supabase Storage (bucket 'avatares').
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                    <select
                      value={form.tipo}
                      onChange={(e) => {
                        const novoTipo = e.target.value as 'PF' | 'PJ' | 'INTERNACIONAL'
                        setForm(prev => ({ ...prev, tipo: novoTipo, documento: '', nome: '', nomeFantasia: '', responsavel: '' })) // Reset nomeFantasia e responsavel
                        setCnpjConsultado(false)
                        setConsultandoCNPJ(false)
                        setCnpjError('')
                      }}
                      className="input-field"
                    >
                      <option value="PJ">Pessoa Jurídica</option>
                      <option value="PF">Pessoa Física</option>
                      <option value="INTERNACIONAL">Internacional</option>
                    </select>
                  </div>
                  
                  {/* Campo de Documento (CNPJ/CPF/Outro) - Coluna 2 e 3 */}
                  <div className="md:col-span-2">
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
                            setCnpjError('') // Limpa erro ao digitar
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
                        {cnpjError && (
                            <div className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center">
                                <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                                <p className="text-xs text-red-700 dark:text-red-400">{cnpjError}</p>
                            </div>
                        )}
                        {form.tipo === 'PJ' && cnpjConsultado && !cnpjError && (
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
                </div>

                {/* Campos de Nome/Razão Social e Nome Fantasia */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {form.tipo === 'PJ' ? 'Razão Social *' : 'Nome *'}
                    </label>
                    <input
                      type="text"
                      value={form.nome}
                      onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
                      className="input-field"
                      required
                    />
                  </div>
                  
                  {form.tipo === 'PJ' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nome Fantasia
                      </label>
                      <input
                        type="text"
                        value={form.nomeFantasia}
                        onChange={(e) => setForm(prev => ({ ...prev, nomeFantasia: e.target.value }))}
                        className="input-field"
                      />
                    </div>
                  )}
                </div>

                {/* Contato e Responsável */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  
                  {form.tipo === 'PJ' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contato</label>
                        <input
                          type="text"
                          value={form.telefone}
                          onChange={(e) => setForm(prev => ({ ...prev, telefone: formatContact(e.target.value) }))}
                          className="input-field"
                          placeholder="Ex: (11) 98765-4321"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Responsável</label>
                        <input
                          type="text"
                          value={form.responsavel}
                          onChange={(e) => setForm(prev => ({ ...prev, responsavel: e.target.value }))}
                          className="input-field"
                          placeholder="Nome do responsável"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contato</label>
                      <input
                        type="text"
                        value={form.telefone}
                        onChange={(e) => setForm(prev => ({ ...prev, telefone: formatContact(e.target.value) }))}
                        className="input-field"
                        placeholder="Ex: (11) 98765-4321"
                      />
                    </div>
                  )}
                </div>

                {/* Endereço, Número e Complemento (NOVO LAYOUT) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço</label>
                  <input
                    type="text"
                    value={form.endereco}
                    onChange={(e) => setForm(prev => ({ ...prev, endereco: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número</label>
                    <input
                      type="text"
                      value={form.numero}
                      onChange={(e) => setForm(prev => ({ ...prev, numero: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Complemento</label>
                    <input
                      type="text"
                      value={form.complemento}
                      onChange={(e) => setForm(prev => ({ ...prev, complemento: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">UF</label>
                    <input
                      type="text"
                      value={form.uf}
                      onChange={(e) => setForm(prev => ({ ...prev, uf: e.target.value }))}
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CEP</label>
                    <input
                      type="text"
                      value={form.cep}
                      onChange={(e) => setForm(prev => ({ ...prev, cep: e.target.value }))}
                      className="input-field"
                    />
                  </div>
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
                  <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); resetForm() }} disabled={isSaving}>Cancelar</button>
                  <button type="submit" className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors" disabled={isSaving}>
                    {isSaving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar cliente'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Clientes