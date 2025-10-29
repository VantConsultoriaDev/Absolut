export interface User {
  id: string
  username: string
  password?: string // Tornar a senha opcional, pois não é retornada pelo Supabase
  email?: string
  name?: string
  role: 'admin' | 'master' | 'comum'
  isActive?: boolean
  createdBy?: string
  permissions?: {
    inicio: 'none' | 'view' | 'edit'
    financeiro: 'none' | 'view' | 'edit'
    cargas: 'none' | 'view' | 'edit'
    parceiros: 'none' | 'view' | 'edit'
    usuarios: 'none' | 'view' | 'edit'
  }
  createdAt: Date
  updatedAt: Date
}

export interface Endereco {
  cep: string
  logradouro: string
  bairro: string
  cidade: string
  estado: string
}

export interface Cliente {
  id: string
  tipo: 'PF' | 'PJ' | 'INTERNACIONAL'
  nome: string
  documento?: string
  email?: string
  telefone?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  observacoes?: string
  isActive?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Parceiro {
  id: string
  tipo: 'PF' | 'PJ'
  nome?: string
  documento?: string
  cnh?: string
  email?: string
  telefone?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  observacoes?: string
  isMotorista?: boolean
  isActive?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Motorista {
  id: string
  parceiroId: string
  nome: string
  cpf: string
  cnh: string
  categoriaCnh?: string
  validadeCnh?: Date
  telefone?: string
  veiculoVinculado?: string
  isActive?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Veiculo {
  id: string
  parceiroId: string
  placa?: string
  placaCavalo?: string
  placaCarreta?: string
  placaCarreta1?: string
  placaCarreta2?: string
  placaDolly?: string
  modelo?: string
  fabricante?: string
  ano?: number
  capacidade?: number
  chassis?: string
  carroceria?: string
  tipo: string
  quantidadeCarretas?: number
  possuiDolly?: boolean
  motoristaVinculado?: string
  carretasVinculadas?: string[]
  isActive?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface MovimentacaoFinanceira {
  id: string
  tipo: 'receita' | 'despesa'
  valor: number
  descricao: string
  categoria?: string
  data: Date
  status?: 'pendente' | 'pago' | 'cancelado'
  dataPagamento?: Date | null // Changed to allow null
  parceiroId?: string
  cargaId?: string
  isPago?: boolean
  observacoes?: string
  createdAt: Date
  updatedAt: Date
}

export interface Carga {
  id: string
  descricao: string
  origem: string
  destino: string
  peso: number
  valor: number
  dataColeta?: Date
  dataEntrega?: Date
  status: 'entregue' | 'em_transito' | 'a_coletar' | 'armazenada' | 'cancelada'
  clienteId?: string
  parceiroId?: string
  motoristaId?: string
  veiculoId?: string
  carretasSelecionadas?: string[]
  crt?: string
  observacoes?: string // Adicionado
  createdAt: Date
  updatedAt: Date
}

export interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
}

export interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
}

export interface DatabaseContextType {
  users: User[]
  clientes: Cliente[]
  parceiros: Parceiro[]
  motoristas: Motorista[]
  veiculos: Veiculo[]
  movimentacoes: MovimentacaoFinanceira[]
  cargas: Carga[]
  
  // User operations
  createUser: (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => User
  updateUser: (id: string, user: Partial<User>) => User | null
  deleteUser: (id: string) => boolean
  getUserById: (id: string) => User | null
  
  // Cliente operations
  createCliente: (cliente: Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'>) => Cliente
  updateCliente: (id: string, cliente: Partial<Cliente>) => Cliente | null
  deleteCliente: (id: string) => boolean
  getClienteById: (id: string) => Cliente | null
  
  // Parceiro operations
  createParceiro: (parceiro: Omit<Parceiro, 'id' | 'createdAt' | 'updatedAt'>) => Parceiro
  updateParceiro: (id: string, parceiro: Partial<Parceiro>) => Parceiro | null
  deleteParceiro: (id: string) => boolean
  getParceiroById: (id: string) => Parceiro | null
  
  // Motorista operations
  createMotorista: (motorista: Omit<Motorista, 'id' | 'createdAt' | 'updatedAt'>) => Motorista
  updateMotorista: (id: string, motorista: Partial<Motorista>) => Motorista | null
  deleteMotorista: (id: string) => boolean
  getMotoristasByParceiro: (parceiroId: string) => Motorista[]
  
  // Veiculo operations
  createVeiculo: (veiculo: Omit<Veiculo, 'id' | 'createdAt' | 'updatedAt'>) => Veiculo
  updateVeiculo: (id: string, veiculo: Partial<Veiculo>) => Veiculo | null
  deleteVeiculo: (id: string) => boolean
  getVeiculosByParceiro: (parceiroId: string) => Veiculo[]
  
  // Movimentacao operations
  createMovimentacao: (movimentacao: Omit<MovimentacaoFinanceira, 'id' | 'createdAt' | 'updatedAt'>) => MovimentacaoFinanceira
  updateMovimentacao: (id: string, movimentacao: Partial<MovimentacaoFinanceira>) => MovimentacaoFinanceira | null
  deleteMovimentacao: (id: string) => boolean
  
  // Carga operations
  createCarga: (carga: Omit<Carga, 'id' | 'createdAt' | 'updatedAt'>) => Carga
  updateCarga: (id: string, carga: Partial<Carga>) => Carga | null
  deleteCarga: (id: string) => boolean
}