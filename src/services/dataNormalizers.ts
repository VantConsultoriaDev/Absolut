import { Cliente, Parceiro, Motorista, Veiculo, Carga, PermissoInternacional, Compromisso, Tarefa } from '../types';

// Utilitário para remover chaves com valor undefined (evita sobrescrever campos obrigatórios)
export const stripUndefined = <T extends object>(obj: Partial<T>): Partial<T> => {
  const result: Partial<T> = {};
  for (const key in obj) {
    const value = obj[key as keyof Partial<T>];
    if (value !== undefined) {
      (result as any)[key] = value;
    }
  }
  return result;
};

// --- NORMALIZADORES PARA CRIAÇÃO ---

export const normalizeClienteCreate = (d: Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'>) => ({
  ...d,
  nome: d.nome,
  nomeFantasia: d.nomeFantasia,
  responsavel: d.responsavel, // NOVO
  endereco: d.endereco,
  numero: d.numero, // NOVO
  complemento: d.complemento, // NOVO
  cidade: d.cidade,
  uf: d.uf, // RENOMEADO
  observacoes: d.observacoes,
  
  // NOVOS CAMPOS DE IDENTIFICAÇÃO PESSOAL
  dataNascimento: d.dataNascimento,
  rg: d.rg,
  orgaoEmissor: d.orgaoEmissor,
});

export const normalizeParceiroCreate = (d: Omit<Parceiro, 'id' | 'createdAt' | 'updatedAt'>) => ({
  ...d,
  nome: d.nome,
  nomeFantasia: d.nomeFantasia,
  responsavel: d.responsavel, // NOVO
  
  // Novos campos de identificação
  dataNascimento: d.dataNascimento,
  rg: d.rg,
  orgaoEmissor: d.orgaoEmissor,
  
  endereco: d.endereco,
  numero: d.numero, // NOVO
  complemento: d.complemento, // NOVO
  cidade: d.cidade,
  uf: d.uf, // RENOMEADO
  cep: d.cep,
  
  observacoes: d.observacoes,
});

export const normalizeMotoristaCreate = (d: Omit<Motorista, 'id' | 'createdAt' | 'updatedAt'>) => ({
  ...d,
  nome: d.nome,
  
  // NOVOS CAMPOS DE IDENTIFICAÇÃO PESSOAL
  dataNascimento: d.dataNascimento,
  rg: d.rg,
  orgaoEmissor: d.orgaoEmissor,
});

export const normalizeVeiculoCreate = (d: Omit<Veiculo, 'id' | 'createdAt' | 'updatedAt'>) => ({
  ...d,
  fabricante: d.fabricante,
  modelo: d.modelo,
  carroceria: (d as any).carroceria,
  placa: d.placa,
  placaCavalo: d.placaCavalo,
  placaCarreta: d.placaCarreta,
  // REMOVIDO: placaCarreta1: d.placaCarreta1,
  // REMOVIDO: placaCarreta2: d.placaCarreta2,
  // REMOVIDO: placaDolly: d.placaDolly,
  chassis: d.chassis, // Garantindo que chassis esteja aqui
});

export const normalizeCargaCreate = (d: Omit<Carga, 'id' | 'createdAt' | 'updatedAt'>) => ({
  ...d,
  // GARANTIA: Se a descrição for nula ou vazia, usa um fallback baseado no CRT
  descricao: d.descricao || d.crt || 'Carga sem descrição',
  origem: d.origem,
  destino: d.destino,
  observacoes: d.observacoes,
});

export const normalizePermissoCreate = (d: Omit<PermissoInternacional, 'id' | 'createdAt' | 'updatedAt' | 'dataConsulta'>) => ({
  ...d,
  razaoSocial: d.razaoSocial,
  nomeFantasia: d.nomeFantasia,
  enderecoCompleto: d.enderecoCompleto,
});

export const normalizeCompromissoCreate = (d: Omit<Compromisso, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => ({
  ...d,
  titulo: d.titulo,
  descricao: d.descricao,
  dataHora: d.dataHora, // ALTERADO
  duracaoMinutos: d.duracaoMinutos, // ALTERADO
  local: d.local,
  notificacao: d.notificacao,
});

export const normalizeTarefaCreate = (d: Omit<Tarefa, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => ({
  ...d,
  titulo: d.titulo,
  descricao: d.descricao,
  prioridade: d.prioridade,
  status: d.status,
  dataVencimento: d.dataVencimento, // ALTERADO
  vincularAoCalendario: d.vincularAoCalendario, // ALTERADO
});

// --- APLICADORES DE ATUALIZAÇÃO ---

export const applyUpdateCliente = (current: Cliente, changes: Partial<Cliente>): Cliente => {
  const c = stripUndefined(changes);
  const merged: Cliente = { ...current, ...c };
  merged.updatedAt = new Date();
  return merged;
};

export const applyUpdateParceiro = (current: Parceiro, changes: Partial<Parceiro>): Parceiro => {
  const c = stripUndefined(changes);
  const merged: Parceiro = { ...current, ...c };
  merged.updatedAt = new Date();
  return merged;
};

export const applyUpdateMotorista = (current: Motorista, changes: Partial<Motorista>): Motorista => {
  const c = stripUndefined(changes);
  const merged: Motorista = { ...current, ...c };
  merged.updatedAt = new Date();
  return merged;
};

export const applyUpdateVeiculo = (current: Veiculo, changes: Partial<Veiculo>): Veiculo => {
  const c = stripUndefined(changes);
  const merged: Veiculo = { ...current, ...c };
  merged.updatedAt = new Date();
  return merged;
};

export const applyUpdateCarga = (current: Carga, changes: Partial<Carga>): Carga => {
  const c = stripUndefined(changes);
  
  // Se 'trajetos' estiver presente em changes, ele deve substituir o array inteiro.
  // Se 'trajetos' não estiver presente, ele mantém o array atual.
  const merged: Carga = { 
      ...current, 
      ...c,
      // Garante que o array de trajetos seja o novo, se fornecido
      trajetos: c.trajetos !== undefined ? c.trajetos : current.trajetos,
  };
  
  // GARANTIA: Se a descrição for atualizada para nulo/vazio, usa o CRT ou um fallback
  if (c.descricao === null || c.descricao === undefined || (typeof c.descricao === 'string' && c.descricao.trim() === '')) {
      merged.descricao = merged.crt || 'Carga sem descrição';
  }
  
  merged.updatedAt = new Date();
  return merged;
};

export const applyUpdatePermisso = (current: PermissoInternacional, changes: Partial<PermissoInternacional>): PermissoInternacional => {
  const c = stripUndefined(changes);
  const merged: PermissoInternacional = { ...current, ...c };
  merged.updatedAt = new Date();
  return merged;
};

export const applyUpdateCompromisso = (current: Compromisso, changes: Partial<Compromisso>): Compromisso => {
  const c = stripUndefined(changes);
  const merged: Compromisso = { ...current, ...c };
  merged.updatedAt = new Date();
  return merged;
};

export const applyUpdateTarefa = (current: Tarefa, changes: Partial<Tarefa>): Tarefa => {
  const c = stripUndefined(changes);
  const merged: Tarefa = { ...current, ...c };
  merged.updatedAt = new Date();
  return merged;
};