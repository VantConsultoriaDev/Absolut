// Utilitários de formatação automática

import { isValid, isBefore, startOfDay } from 'date-fns'; // Importando isBefore e startOfDay

// Função para criar um objeto Date a partir de uma string YYYY-MM-DD,
// garantindo que o fuso horário local não desvie a data para o dia anterior.
export const createLocalDate = (dateString: string): Date | undefined => {
  if (!dateString) return undefined;
  // Adiciona 'T00:00:00' para forçar a interpretação como data local à meia-noite
  const date = new Date(dateString + 'T00:00:00');
  if (isValid(date)) return date;
  
  // Fallback se o formato T00:00:00 não funcionar (embora deva funcionar na maioria dos browsers)
  const parts = dateString.split('-');
  if (parts.length === 3) {
    // Cria a data usando componentes (Ano, Mês-1, Dia) para forçar o fuso horário local
    const fallbackDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    if (isValid(fallbackDate)) return fallbackDate;
  }
  
  // Se tudo falhar, tenta o parsing direto e verifica a validade
  const directParse = new Date(dateString);
  if (isValid(directParse)) return directParse;
  
  return undefined; // Retorna undefined se a data for inválida
};

// NOVO: Função para verificar se uma data está estritamente antes do início do dia atual
export const isBeforeToday = (date: Date | undefined): boolean => {
    if (!date || !isValid(date)) return false;
    // Compara a data com o início do dia atual (meia-noite)
    return isBefore(date, startOfDay(new Date()));
};

// NOVO: Função para calcular o status efetivo de exibição da movimentação
export const getEffectiveMovStatus = (mov: { status?: 'pendente' | 'pago' | 'cancelado' | 'vencido', data: Date }): 'pendente' | 'pago' | 'cancelado' | 'vencido' => {
    const storedStatus = mov.status || 'pendente';
    
    if (storedStatus === 'pendente' && isBeforeToday(mov.data)) {
        return 'vencido';
    }
    
    // Retorna o status armazenado (que pode ser 'pago', 'cancelado' ou 'pendente')
    return storedStatus;
};


// Formatação de CPF: 000.000.000-00
export const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 11); // Limita a 11 dígitos
  if (numbers.length <= 11) {
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return value;
};

// Formatação de CNPJ: 00.000.000/0001-00
export const formatCNPJ = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 14); // Limita a 14 dígitos
  if (numbers.length <= 14) {
    return numbers
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
  return value;
};

// Formatação de documento (CPF ou CNPJ baseado no tamanho)
export const formatDocument = (value: string, type?: 'PF' | 'PJ' | 'INTERNACIONAL'): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (type === 'INTERNACIONAL') {
    // Para internacional, retorna o valor sem formatação específica (pode ser CUIT, etc.)
    return value;
  }

  if (type === 'PF' || (!type && numbers.length <= 11)) {
    return formatCPF(value);
  } else if (type === 'PJ' || (!type && numbers.length > 11)) {
    return formatCNPJ(value);
  }
  
  return value;
};

// Formatação de CUIT (Argentina): XX-XXXXXXXX-X
export const formatCUIT = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
}

// NOVO: Formatação de Chave Pix
export const formatPixKey = (value: string, type: 'CPF' | 'CNPJ' | 'Celular' | 'E-mail' | 'Chave aleatória' | ''): string => {
  if (!value || !type) return value;

  switch (type) {
    case 'CPF':
      // Limita a 11 dígitos antes de formatar
      const cpfNumbers = value.replace(/\D/g, '').slice(0, 11);
      return formatCPF(cpfNumbers);
    case 'CNPJ':
      // Limita a 14 dígitos antes de formatar
      const cnpjNumbers = value.replace(/\D/g, '').slice(0, 14);
      return formatCNPJ(cnpjNumbers);
    case 'Celular':
      // Permite apenas números e aplica formatação de contato (brasileiro)
      const numbers = value.replace(/\D/g, '').slice(0, 11); // Limita a 11 dígitos
      if (numbers.length <= 11) {
        return numbers
          .replace(/^(\d{2})(\d)/g, '($1) $2')
          .replace(/(\d{4,5})(\d{4})$/, '$1-$2');
      }
      return value;
    case 'E-mail':
    case 'Chave aleatória':
    default:
      // Não aplica formatação
      return value;
  }
};

// NOVO: Função para limpar a chave Pix (remover formatação)
export const cleanPixKey = (value: string, type: 'CPF' | 'CNPJ' | 'Celular' | 'E-mail' | 'Chave aleatória' | ''): string => {
    if (type === 'CPF' || type === 'CNPJ' || type === 'Celular') {
        return value.replace(/\D/g, '');
    }
    return value;
};

// NOVO: Formatação de contato condicional
export const formatContact = (value: string): string => {
  if (!value) return '';

  // Se começar com '+', assume formato internacional (ex: +55 11 9 9999-9999)
  if (value.startsWith('+')) {
    // Remove tudo exceto números e o '+' inicial
    const clean = '+' + value.slice(1).replace(/\D/g, '');
    
    // Tenta aplicar a máscara: +00 0 0000 00-0000 (máscara complexa, vamos simplificar para legibilidade)
    // Exemplo: +5511987654321 -> +55 11 9 8765-4321
    let formatted = clean;
    
    // +XX (código país)
    if (clean.length > 3) formatted = clean.slice(0, 3) + ' ' + clean.slice(3);
    // +XX XX (DDD)
    if (clean.length > 5) formatted = formatted.slice(0, 6) + ' ' + formatted.slice(6);
    // +XX XX X (Dígito 9)
    if (clean.length > 6) formatted = formatted.slice(0, 8) + ' ' + formatted.slice(8);
    // +XX XX X XXXX (Primeiros 4)
    if (clean.length > 10) formatted = formatted.slice(0, 13) + '-' + formatted.slice(13);
    
    return formatted;
  }

  // Se começar com número, assume formato brasileiro (ex: (11) 99999-9999)
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 11) {
    return numbers
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d{4,5})(\d{4})$/, '$1-$2');
  }
  
  return value;
};


// Formatação de valor monetário: R$ 10.000,00
export const formatCurrency = (value: string | number): string => {
  // Se for número, formata diretamente
  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
  
  // Se for string, remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  if (!numbers) return '';
  
  // Converte para número e divide por 100 para ter centavos
  const amount = parseInt(numbers) / 100;
  
  // Formata como moeda brasileira
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Formatação de placa: Padroniza para 7 caracteres sem hífen.
 * @param value Placa bruta (ex: ABC1234, ABC-1234, ABC1D23)
 * @returns Placa formatada sem hífen (ex: ABC1234)
 */
export const formatPlaca = (value: string): string => {
  // Remove caracteres não alfanuméricos (case-insensitive) e limita a 7 caracteres, sem forçar caixa
  const alphanumeric = value.replace(/[^A-Z0-9]/gi, '').substring(0, 7).toUpperCase();
  
  // Retorna a placa limpa e em maiúsculas, sem hífen
  return alphanumeric;
};

// Função para converter valor monetário formatado para número
export const parseCurrency = (value: string): number => {
  const numbers = value.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(numbers) || 0;
};

// Função para converter documento formatado para apenas números
export const parseDocument = (value: string): string => {
  // CORREÇÃO: Garante que a placa não seja limpa aqui, pois ela pode conter letras
  // A placa deve ser limpa usando a lógica específica de placa (formatPlaca ou replace)
  // Esta função é primariamente para CPF/CNPJ.
  
  // Se o valor for uma placa (7 caracteres alfanuméricos), não limpa completamente
  const isLikelyPlaca = value.length >= 7 && /^[A-Z0-9-]+$/i.test(value);
  
  if (isLikelyPlaca) {
      // Se for placa, remove apenas o hífen (se houver)
      return value.replace(/-/g, '');
  }
  
  // Para documentos (CPF/CNPJ), remove tudo exceto dígitos
  return value.replace(/\D/g, '');
};

// Função para validar CPF
export const isValidCPF = (cpf: string): boolean => {
  const numbers = cpf.replace(/\D/g, '');
  
  if (numbers.length !== 11 || /^(\d)\1{10}$/.test(numbers)) {
    return false;
  }
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers.charAt(10))) return false;
  
  return true;
};

// Função para validar CNPJ
export const isValidCNPJ = (cnpj: string): boolean => {
  const numbers = cnpj.replace(/\D/g, '');
  
  if (numbers.length !== 14 || /^(\d)\1{13}$/.test(numbers)) {
    return false;
  }
  
  let length = numbers.length - 2;
  let sequence = numbers.substring(0, length);
  let digits = numbers.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(sequence.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(0))) return false;
  
  length = length + 1;
  sequence = numbers.substring(0, length);
  sum = 0;
  pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(sequence.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
};

// Função para forçar maiúsculas (exceto campos específicos)
export const forceUpperCase = (value: string): string => {
  return value.toUpperCase();
};