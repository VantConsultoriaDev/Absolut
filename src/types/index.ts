import { format } from 'date-fns';

export interface User {
  id: string
  email: string
  name?: string
  createdAt: Date
  updatedAt: Date
}

export interface Endereco {
  cep: string
  logradouro: string
  bairro: string
  cidade: string
  uf: string // RENOMEADO
}

export interface Cliente {
  id: string
  tipo: 'PF' | 'PJ' | 'INTERNACIONAL'
  nome: string
  nomeFantasia?: string // Novo campo para Nome Fantasia
  documento?: string
  cnh?: string // Adicionado CNH para Cliente PF (se necessário)
  email?: string
  telefone?: string
  responsavel?: string // NOVO CAMPO
  endereco?: string
  numero?: string // NOVO CAMPO
  complemento?: string // NOVO CAMPO
  cidade?: string
  uf?: string // RENOMEADO
  cep?: string
  observacoes?: string
  isActive?: boolean
  avatarUrl?: string | null // Novo campo para a imagem - AGORA ACEITA NULL
  
  // NOVOS CAMPOS DE IDENTIFICAÇÃO PESSOAL (REPLICADOS DE PARCEIRO PF)
  dataNascimento?: Date 
  rg?: string 
  orgaoEmissor?: string 
  
  createdAt: Date
  updatedAt: Date
}

export interface Parceiro {
  id: string
  tipo: 'PF' | 'PJ'
  nome?: string
  nomeFantasia?: string // Novo campo para Nome Fantasia
  documento?: string
  cnh?: string
  email?: string
  telefone?: string
  responsavel?: string // NOVO CAMsPO
  pixKeyType?: 'CPF' | 'CNPJ' | 'Celular' | 'E-mail' | 'Chave aleatória' | '' // NOVO: Incluindo string vazia
  pixKey?: string // NOVO
  pixTitular?: string // NOVO: Titular da chave Pix
  
  // Novos campos de identificação para PF
  dataNascimento?: Date // NOVO
  rg?: string // NOVO
  orgaoEmissor?: string // NOVO
  
  // Campos de endereço (já são opcionais, mas garantimos que sejam tratados como tal)
  endereco?: string
  numero?: string // NOVO CAMPO
  complemento?: string // NOVO CAMPO
  cidade?: string
  uf?: string // RENOMEADO
  cep?: string
  
  observacoes?: string
  isMotorista?: boolean
  isActive?: boolean // Mantido como opcional
  createdAt: Date
  updatedAt: Date
}

export interface Motorista {
  id: string
  parceiroId: string
  nome: string
  cpf: string
  cnh: string
  nacionalidade: 'Brasileiro' | 'Estrangeiro' // NOVO CAMPO
  categoriaCnh?: string
  validadeCnh?: Date
  telefone?: string
  veiculoVinculado?: string
  isActive?: boolean // Mantido como opcional
  
  // NOVOS CAMPOS DE IDENTIFICAÇÃO PESSOAL (REPLICADOS DE PARCEIRO PF)
  dataNascimento?: Date 
  rg?: string 
  orgaoEmissor?: string 
  
  createdAt: Date
  updatedAt: Date
}

export interface PermissoInternacional {
  id: string
  veiculoId: string
  razaoSocial: string
  nomeFantasia?: string // NOVO CAMPO
  cnpj: string
  enderecoCompleto?: string
  dataConsulta: Date
  simulado?: boolean // CORRIGIDO: Adicionado simulado
  userId?: string // NOVO: Para RLS
  createdAt: Date
  updatedAt: Date
}

export interface Veiculo {
  id: string
  parceiroId: string
  placa?: string
  placaCavalo?: string
  placaCarreta?: string
  modelo?: string
  fabricante?: string
  ano?: number
  capacidade?: number
  chassis?: string
  carroceria?: string
  tipo: string
  motoristaVinculado?: string
  carretasSelecionadas?: string[]
  isActive?: boolean // Mantido como opcional
  permisso?: PermissoInternacional // Adicionado o permisso
  userId?: string // NOVO: Para RLS
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
  status?: 'pendente' | 'pago' | 'cancelado' | 'vencido' // ALTERADO: Adicionado 'vencido'
  dataPagamento?: Date | null // Changed to allow null
  parceiroId?: string
  cargaId?: string
  // isPago?: boolean // REMOVIDO
  observacoes?: string
  comprovanteUrl?: string
  trajetoIndex?: number // NOVO: Para vincular a um trajeto específico
  
  // NOVO: Recurrence fields
  isRecurring?: boolean;
  recurrencePeriod?: 'monthly' | 'quarterly' | 'yearly'; // Monthly, Quarterly, Yearly
  recurrenceEndDate?: Date | null; // Null if indeterminate
  recurrenceGroupId?: string; // UUID to link all instances of a recurring movement
  recurrenceIndex?: number; // Index of the movement in the series (e.g., 1, 2, 3...)
  
  // NOVO: Installment fields
  isInstallment?: boolean; // É parte de um parcelamento?
  installmentCount?: number; // Total de parcelas
  installmentIndex?: number; // Número da parcela (ex: 1, 2, 3...)
  installmentGroupId?: string; // UUID para ligar todas as parcelas
  
  // NOVO: Campo auxiliar para criação de parcelamento (não persistido)
  totalValueForInstallment?: number; 
  
  createdAt: Date
  updatedAt: Date
}

export interface Trajeto {
  index: number // 1, 2, 3...
  ufOrigem: string
  cidadeOrigem: string
  ufDestino: string
  cidadeDestino: string
  valor: number // Valor do frete para este trajeto
  dataColeta?: string // NOVO: Data de coleta do trajeto (YYYY-MM-DD string)
  dataEntrega?: string // NOVO: Data de entrega do trajeto (YYYY-MM-DD string)
  parceiroId?: string
  motoristaId?: string
  veiculoId?: string
  carretasSelecionadas?: string[]
}

export interface Carga {
  id: string
  descricao: string
  origem: string // Origem inicial (Trajeto 1)
  destino: string // Destino final (Último Trajeto)
  peso: number
  valor: number // Valor total da carga (soma dos trajetos)
  dataColeta?: Date
  dataEntrega?: Date
  status: 'entregue' | 'em_transito' | 'a_coletar' | 'armazenada' | 'cancelada'
  clienteId?: string
  crt?: string
  observacoes?: string // Adicionado
  
  // Novos campos para transbordo
  transbordo: 'sem_transbordo' | 'com_transbordo'
  trajetos: Trajeto[] // Lista de trajetos (mínimo 1)
  
  // NOVO CAMPO
  tipoOperacao: 'importacao' | 'exportacao' // Importação ou Exportação
  
  createdAt: Date
  updatedAt: Date
}

export interface ContratoFrete {
  id: string
  cargaId: string
  pdfUrl: string
  motoristaNome?: string
  parceiroNome?: string
  crt?: string
  createdAt: Date
  updatedAt: Date
}

// --- NOVAS INTERFACES PARA AGENDA (Mapeamento do Supabase) ---

export interface Compromisso {
  id: string;
  userId: string; // ALTERADO: user_id -> userId
  titulo: string;
  descricao?: string;
  dataHora: Date; // ALTERADO: data_hora -> dataHora
  duracaoMinutos: number; // ALTERADO: duracao_minutos -> duracaoMinutos
  local?: string;
  notificacao: boolean;
  createdAt: Date; // ALTERADO: created_at -> createdAt
  updatedAt: Date; // ALTERADO: updated_at -> updatedAt
}

export interface Tarefa {
  id: string;
  userId: string; // ALTERADO: user_id -> userId
  titulo: string;
  descricao?: string;
  prioridade: string; // Ex: 'alta', 'media', 'baixa'
  status: string; // Ex: 'pendente', 'concluida'
  dataVencimento?: Date; // ALTERADO: data_vencimento -> dataVencimento
  vincularAoCalendario: boolean; // ALTERADO: vincular_ao_calendario -> vincularAoCalendario
  createdAt: Date; // ALTERADO: created_at -> createdAt
  updatedAt: Date; // ALTERADO: updated_at -> updatedAt
}

// Tipo para as opções de split de extras
type ExtraSplitOption = 'adiantamento' | 'saldo' | 'individual';

// NOVO: Interface para dados de integração financeira
export interface IntegrateData {
  adiantamentoEnabled: boolean;
  adiantamentoPercentual: string;
  dataVencimentoAdiantamento: string;
  dataVencimentoSaldo: string;
  dataVencimentoDespesa: string;
  dataVencimentoDiarias: string;
  
  despesasEnabled: boolean;
  valorARS: string;
  taxaConversao: string;
  valorBRL: string;
  valorBRLExtra: string;
  splitExtrasOption: ExtraSplitOption; // NOVO: Como lidar com Despesas Adicionais
  dataVencimentoExtras: string; // NOVO: Data se for 'individual'
  
  diariasEnabled: boolean;
  valorDiarias: string;
  splitDiariasOption: ExtraSplitOption; // NOVO: Como lidar com Diárias
  dataVencimentoDiariasIndividual: string; // NOVO: Data se for 'individual'
  
  somaOpcao: 'adiantamento' | 'saldo'; // Mantido para compatibilidade, mas pode ser removido se splitOption for 'ambos'
  splitOption: 'ambos' | 'adiantamento' | 'saldo';
  trajetoIndex?: number;
  calculoFreteOption: 'total' | 'diarias_separadas'; 
}

export const initialIntegrateData: IntegrateData = {
  adiantamentoEnabled: false,
  adiantamentoPercentual: '70',
  dataVencimentoAdiantamento: '',
  dataVencimentoSaldo: '',
  dataVencimentoDespesa: format(new Date(), 'yyyy-MM-dd'),
  dataVencimentoDiarias: format(new Date(), 'yyyy-MM-dd'),
  
  despesasEnabled: false,
  valorARS: '',
  taxaConversao: '',
  valorBRL: '',
  valorBRLExtra: '',
  splitExtrasOption: 'saldo', // Padrão: Somar ao Saldo
  dataVencimentoExtras: format(new Date(), 'yyyy-MM-dd'),
  
  diariasEnabled: false,
  valorDiarias: '',
  splitDiariasOption: 'saldo', // Padrão: Somar ao Saldo
  dataVencimentoDiariasIndividual: format(new Date(), 'yyyy-MM-dd'),
  
  somaOpcao: 'adiantamento',
  splitOption: 'ambos',
  trajetoIndex: undefined,
  calculoFreteOption: 'total',
};

export interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean // Adicionado
  lastAuthError?: string
  updateProfile: (name: string) => Promise<boolean>
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ ok: boolean; error?: string }>
}

export interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
  isMenuManual: boolean // NOVO
  toggleMenuManual: () => void // NOVO
}

// Tipo auxiliar para operações de criação: O objeto passado NÃO deve ter ID, createdAt ou updatedAt.
// Mantendo a definição original, mas ajustando a interface DatabaseContextType abaixo.
type CreateType<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>

export interface DatabaseContextType {
  users: User[] // Mantido como array vazio, mas sem operações CRUD
  clientes: Cliente[]
  parceiros: Parceiro[]
  motoristas: Motorista[]
  veiculos: Veiculo[]
  movimentacoes: MovimentacaoFinanceira[]
  cargas: Carga[]
  contratos: ContratoFrete[] // Novo
  
  // NOVO: Agenda
  compromissos: Compromisso[];
  tarefas: Tarefa[];
  
  // User operations (Removidas as funções CRUD)
  createUser: (user: CreateType<User>) => User
  updateUser: (id: string, user: Partial<User>) => User | null
  deleteUser: (id: string) => boolean
  getUserById: (id: string) => User | null
  
  // Cliente operations
  // CORREÇÃO: updateCliente agora retorna Promise<Cliente | null>
  createCliente: (cliente: CreateType<Cliente> & { id?: string }) => Cliente 
  updateCliente: (id: string, cliente: Partial<Cliente>) => Promise<Cliente | null>
  deleteCliente: (id: string) => boolean
  getClienteById: (id: string) => Cliente | null
  
  // Parceiro operations
  createParceiro: (parceiro: CreateType<Parceiro>) => Parceiro
  updateParceiro: (id: string, parceiro: Partial<Parceiro>) => Parceiro | null
  deleteParceiro: (id: string) => boolean
  getParceiroById: (id: string) => Parceiro | null
  
  // Motorista operations
  createMotorista: (motorista: CreateType<Motorista>) => Motorista
  updateMotorista: (id: string, motorista: Partial<Motorista>) => Motorista | null
  deleteMotorista: (id: string) => boolean
  getMotoristasByParceiro: (parceiroId: string) => Motorista[]
  
  // Veiculo operations
  createVeiculo: (veiculo: CreateType<Veiculo>) => Veiculo
  updateVeiculo: (id: string, veiculo: Partial<Veiculo>) => Veiculo | null
  deleteVeiculo: (id: string) => boolean
  getVeiculosByParceiro: (parceiroId: string) => Veiculo[]
  
  // Permisso operations (REMOVIDAS AS FUNÇÕES DE CRUD DE PERMISSO)
  getPermissoByVeiculoId: (veiculoId: string) => PermissoInternacional | null

  // Movimentacao operations
  createMovimentacao: (movimentacao: CreateType<MovimentacaoFinanceira>) => MovimentacaoFinanceira
  // CORRIGIDO: updateMovimentacao agora é assíncrona e retorna Promise
  updateMovimentacao: (id: string, movimentacao: Partial<MovimentacaoFinanceira>) => Promise<MovimentacaoFinanceira | null>
  // ALTERADO: deleteMovimentacao agora aceita um segundo parâmetro opcional para exclusão em grupo
  deleteMovimentacao: (id: string, deleteGroup?: boolean) => boolean
  
  // Carga operations
  createCarga: (carga: CreateType<Carga>) => Carga
  updateCarga: (id: string, carga: Partial<Carga>) => Carga | null
  deleteCarga: (id: string) => boolean

  // Contrato operations (Novo)
  generateContract: (cargaId: string) => Promise<void>
  getContracts: () => Promise<ContratoFrete[]>
  deleteContrato: (id: string) => boolean 
  
  // NOVO: CRUD Compromissos
  createCompromisso: (compromisso: CreateType<Compromisso>) => Compromisso;
  updateCompromisso: (id: string, compromisso: Partial<Compromisso>) => Compromisso | null;
  deleteCompromisso: (id: string) => boolean;
  
  // NOVO: CRUD Tarefas
  createTarefa: (tarefa: CreateType<Tarefa>) => Tarefa;
  updateTarefa: (id: string, tarefa: Partial<Tarefa>) => Tarefa | null;
  deleteTarefa: (id: string) => boolean;
  
  // Storage Utils (NOVO)
  uploadAvatar: (file: File, clienteId: string) => Promise<string | null>
  deleteAvatar: (avatarUrl: string) => Promise<boolean>
  deleteComprovante: (comprovanteUrl: string) => Promise<boolean>
  uploadComprovante: (file: File, movId: string) => Promise<string | null> // NOVO
  
  // Utility functions for Cargas/Financeiro synchronization
  getMotoristaName: (motoristaId: string | undefined) => string
  // CORRIGIDO: Adicionando 'Diárias' e 'Despesas Adicionais'
  buildMovimentacaoDescription: (carga: Carga, prefix: 'Adto' | 'Saldo' | 'Frete' | 'Diárias' | 'Despesas Adicionais', trajetoIndex?: number) => string 
  syncMovimentacoesForCarga: (cargaId: string) => void
  
  // Sincronização e Reset (Novos)
  pullSupabaseData: () => Promise<boolean>
  isSynced: boolean // CORRIGIDO: Adicionado isSynced
  isSyncing: boolean // CORRIGIDO: Adicionado isSyncing
}