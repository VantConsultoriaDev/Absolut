// Utilitários de formatação automática

// Formatação de CPF: 000.000.000-00
export const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
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
  const numbers = value.replace(/\D/g, '');
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

// Formatação de placa: ABC5H26 ou ABR5326 (Mercosul e antiga)
export const formatPlaca = (value: string): string => {
  // Remove caracteres não alfanuméricos, força maiúsculas e limita a 7 caracteres
  const alphanumeric = value.replace(/[^A-Z0-9]/gi, '').toUpperCase().substring(0, 7);
  
  // Adiciona o hífen apenas para visualização se for formato antigo (AAA-0000)
  if (alphanumeric.length === 7 && /^[A-Z]{3}[0-9]{4}$/.test(alphanumeric)) {
    return alphanumeric.replace(/^([A-Z]{3})([0-9]{4})$/, '$1-$2');
  }
  
  return alphanumeric;
};

// Função para converter valor monetário formatado para número
export const parseCurrency = (value: string): number => {
  const numbers = value.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(numbers) || 0;
};

// Função para converter documento formatado para apenas números
export const parseDocument = (value: string): string => {
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