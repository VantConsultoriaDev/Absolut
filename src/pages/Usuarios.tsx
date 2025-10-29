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
  Edit,
  Trash2,
  X,
  Eye,
  EyeOff,
  Mail,
  Calendar,
  CheckCircle,
  Database
} from 'lucide-react'

// Removendo interfaces de formulário e lógica de CRUD local
// interface UserForm { ... }

const Usuarios: React.FC = () => {
  const { users } = useDatabase() // users agora é sempre []
  const { user: currentUser } = useAuth()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'master' | 'comum'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  
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

  // Como a lista de usuários está vazia, vamos simular um usuário para fins de demonstração
  // Se o usuário logado for o único na lista, ele será exibido.
  const simulatedUsers = useMemo(() => {
    if (currentUser) {
      // Cria uma lista contendo apenas o usuário logado, usando dados do AuthContext
      const loggedUser = {
        ...currentUser,
        id: currentUser.id,
        username: currentUser.username,
        email: currentUser.email,
        role: currentUser.role,
        isActive: currentUser.isActive ?? true,
        createdAt: currentUser.createdAt,
        updatedAt: currentUser.updatedAt
      }
      return [loggedUser];
    }
    return [];
  }, [currentUser]);

  // Filtrar usuários (agora filtra apenas o usuário logado)
  const filteredUsers = useMemo(() => {
    return simulatedUsers.filter(user => {
      const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesRole = filterRole === 'all' || user.role === filterRole
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'active' && user.isActive) ||
                           (filterStatus === 'inactive' && !user.isActive)
      
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [simulatedUsers, searchTerm, filterRole, filterStatus])

  // Estatísticas (baseadas apenas no usuário logado)
  const stats = useMemo(() => {
    return {
      totalUsers: simulatedUsers.length,
      activeUsers: simulatedUsers.filter(u => u.isActive).length,
      adminUsers: simulatedUsers.filter(u => u.role === 'admin').length,
      masterUsers: simulatedUsers.filter(u => u.role === 'master').length,
      commonUsers: simulatedUsers.filter(u => u.role === 'comum').length
    }
  }, [simulatedUsers])

  // Funções de CRUD removidas/desabilitadas
  const handleEdit = (user: any) => {
    alert(`A edição do usuário ${user.username} deve ser feita no painel do Supabase.`);
  }

  const handleDelete = (user: any) => {
    alert(`A exclusão do usuário ${user.username} deve ser feita no painel do Supabase.`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Usuários</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestão de usuários do sistema</p>
        </div>
        <button 
          onClick={() => alert('A criação de novos usuários deve ser feita diretamente no painel do Supabase.')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          disabled={true}
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Usuário (Supabase)
        </button>
      </div>

      {/* Alerta de Gestão Externa */}
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start space-x-3">
        <Database className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-1 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
            Gestão de Usuários Centralizada
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            A criação, edição de perfis e exclusão de usuários (incluindo roles e permissões) são gerenciadas diretamente no painel do Supabase. Esta tela exibe apenas o usuário logado.
          </p>
        </div>
      </div>

      {/* Cards de Estatísticas (Apenas para o usuário logado) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 opacity-50 pointer-events-none">
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 opacity-50 pointer-events-none">
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
                      N/A
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
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="Editar usuário (Supabase)"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Excluir usuário (Supabase)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
            Nenhum usuário logado encontrado.
          </p>
        )}
      </div>

      {/* Modal de Formulário removido */}
    </div>
  )
}

export default Usuarios