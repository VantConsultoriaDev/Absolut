import React, { useState, useMemo } from 'react'
import { useDatabase } from '../contexts/DatabaseContext'
import { useAuth } from '../contexts/AuthContext'
import { useModal } from '../hooks/useModal'
import { format } from 'date-fns'
import StandardCheckbox from '../components/StandardCheckbox'
import { 
  Plus, 
  Search, 
  Filter, 
  Users,
  User,
  Shield,
  Crown,
  UserCheck,
  Edit,
  Trash2,
  X,
  Eye,
  EyeOff,
  Mail,
  Calendar,
  CheckCircle
} from 'lucide-react'

interface UserForm {
  username: string
  email: string
  password: string
  confirmPassword: string
  role: 'admin' | 'master' | 'comum'
  isActive: boolean
}

const Usuarios: React.FC = () => {
  const { users, createUser, updateUser, deleteUser } = useDatabase()
  const { user: currentUser } = useAuth()
  
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'master' | 'comum'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [showPassword, setShowPassword] = useState(false)
  
  const [userForm, setUserForm] = useState<UserForm>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'comum',
    isActive: true
  })

  // Hook para gerenciar fechamento do modal
  const { modalRef } = useModal({
    isOpen: showForm,
    onClose: () => {
      setShowForm(false);
      setEditingId(null);
      setUserForm({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'comum',
        isActive: true
      });
    }
  });

  // Configurações de roles
  const roleConfig = {
    admin: {
      label: 'Administrador Global',
      icon: Crown,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900',
      textColor: 'text-red-800 dark:text-red-200',
      description: 'Acesso total ao sistema'
    },
    master: {
      label: 'Master',
      icon: Shield,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
      textColor: 'text-blue-800 dark:text-blue-200',
      description: 'Acesso avançado com algumas restrições'
    },
    comum: {
      label: 'Usuário Comum',
      icon: User,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100 dark:bg-gray-900',
      textColor: 'text-gray-800 dark:text-gray-200',
      description: 'Acesso básico ao sistema'
    }
  }

  // Verificar permissões do usuário atual
  const canCreateUser = (role: string) => {
    if (currentUser?.role === 'admin') return true
    if (currentUser?.role === 'master' && role !== 'admin') return true
    return false
  }

  const canEditUser = (targetUser: any) => {
    if (currentUser?.role === 'admin') return true
    if (currentUser?.role === 'master' && targetUser.role !== 'admin') return true
    return currentUser?.id === targetUser.id
  }

  const canDeleteUser = (targetUser: any) => {
    if (currentUser?.id === targetUser.id) return false // Não pode deletar a si mesmo
    if (currentUser?.role === 'admin') return true
    return false
  }

  // Filtrar usuários
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesRole = filterRole === 'all' || user.role === filterRole
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'active' && user.isActive) ||
                           (filterStatus === 'inactive' && !user.isActive)
      
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchTerm, filterRole, filterStatus])

  // Estatísticas
  const stats = useMemo(() => {
    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive).length,
      adminUsers: users.filter(u => u.role === 'admin').length,
      masterUsers: users.filter(u => u.role === 'master').length,
      commonUsers: users.filter(u => u.role === 'comum').length
    }
  }, [users])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações
    if (userForm.password !== userForm.confirmPassword) {
      alert('As senhas não coincidem!')
      return
    }

    if (!canCreateUser(userForm.role) && !editingId) {
      alert('Você não tem permissão para criar usuários com este nível de acesso!')
      return
    }

    const userData = {
      username: userForm.username,
      email: userForm.email,
      password: userForm.password,
      role: userForm.role,
      isActive: userForm.isActive
    }

    if (editingId) {
      const targetUser = users.find(u => u.id === editingId)
      if (!canEditUser(targetUser)) {
        alert('Você não tem permissão para editar este usuário!')
        return
      }
      updateUser(editingId, userData)
      setEditingId(null)
    } else {
      createUser(userData)
    }

    setShowForm(false)
    resetForm()
  }

  const resetForm = () => {
    setUserForm({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'comum',
      isActive: true
    })
    setShowPassword(false)
  }

  const handleEdit = (user: any) => {
    if (!canEditUser(user)) {
      alert('Você não tem permissão para editar este usuário!')
      return
    }

    setUserForm({
      username: user.username,
      email: user.email,
      password: '',
      confirmPassword: '',
      role: user.role,
      isActive: user.isActive
    })
    setEditingId(user.id)
    setShowForm(true)
  }

  const handleDelete = (user: any) => {
    if (!canDeleteUser(user)) {
      alert('Você não tem permissão para excluir este usuário!')
      return
    }

    const confirmMessage = `Tem certeza que deseja excluir o usuário "${user.username}"?`
    if (confirm(confirmMessage)) {
      deleteUser(user.id)
    }
  }

  const getAvailableRoles = () => {
    if (currentUser?.role === 'admin') {
      return ['admin', 'master', 'comum']
    } else if (currentUser?.role === 'master') {
      return ['master', 'comum']
    } else {
      return ['comum']
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Usuários</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestão de usuários do sistema</p>
        </div>
        {(currentUser?.role === 'admin' || currentUser?.role === 'master') && (
          <button 
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo Usuário
          </button>
        )}
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Usuários</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ativos</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.activeUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <Crown className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Administradores</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.adminUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Masters</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.masterUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">
              <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Usuários Comuns</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.commonUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Filtros</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
            className="input-field"
          >
            <option value="all">Todos os níveis</option>
            <option value="admin">Administradores</option>
            <option value="master">Masters</option>
            <option value="comum">Usuários Comuns</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="input-field"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Nível de Acesso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Contato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Criado em
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Último Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => {
                const config = roleConfig[user.role as keyof typeof roleConfig]
                const IconComponent = config.icon
                
                return (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg ${config.bgColor}`}>
                          <IconComponent className={`h-5 w-5 ${config.color}`} />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.email || 'Email não informado'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bgColor} ${config.textColor}`}>
                        {config.label}
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{config.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 dark:text-white">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {user.email || 'Email não informado'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 dark:text-white">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {user.createdAt ? format(new Date(user.createdAt), 'dd/MM/yyyy') : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      Nunca
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {user.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {canEditUser(user) && (
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="Editar usuário"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        {canDeleteUser(user) && (
                          <button
                            onClick={() => handleDelete(user)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Excluir usuário"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {!canEditUser(user) && !canDeleteUser(user) && (
                          <span className="text-gray-400 text-sm">Sem permissão</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            Nenhum usuário encontrado
          </p>
        )}
      </div>

      {/* Modal de Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingId ? 'Editar Usuário' : 'Novo Usuário'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Nome de Usuário */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome de Usuário *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Digite o nome de usuário"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Digite o email"
                      required
                    />
                  </div>
                </div>

                {/* Nível de Acesso */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nível de Acesso *
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white appearance-none"
                      required
                    >
                      {getAvailableRoles().map(role => {
                        const config = roleConfig[role as keyof typeof roleConfig]
                        return (
                          <option key={role} value={role}>
                            {config.label}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {roleConfig[userForm.role as keyof typeof roleConfig].description}
                  </p>
                </div>

                {/* Senha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Senha {editingId ? '(deixe em branco para manter a atual)' : '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Digite a senha"
                      required={!editingId}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Senha */}
                {userForm.password && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirmar Senha *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={userForm.confirmPassword}
                        onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                        className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Confirme a senha"
                        required={!!userForm.password}
                      />
                    </div>
                  </div>
                )}

                {/* Status Ativo */}
                <StandardCheckbox
                  label="Usuário ativo"
                  checked={userForm.isActive}
                  onChange={(checked) => setUserForm({ ...userForm, isActive: checked })}
                  description="Marque para ativar o usuário no sistema"
                />

                {/* Botões */}
                <div className="flex space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingId(null)
                      resetForm()
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                  >
                    {editingId ? 'Atualizar Usuário' : 'Criar Usuário'}
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

export default Usuarios