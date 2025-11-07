import { Truck, CheckCircle, Clock, AlertTriangle, Package } from 'lucide-react';

export const UFS_ORDENADAS = [
  { value: 'AR', label: 'Argentina (AR)' },
  { value: 'CL', label: 'Chile (CL)' },
  { value: 'UY', label: 'Uruguai (UY)' }, // NOVO: Uruguai
  { value: 'RS', label: 'Rio Grande do Sul (RS)' },
  { value: 'SP', label: 'São Paulo (SP)' },
  { value: 'AC', label: 'Acre (AC)' },
  { value: 'AL', label: 'Alagoas (AL)' },
  { value: 'AP', label: 'Amapá (AP)' },
  { value: 'AM', label: 'Amazonas (AM)' },
  { value: 'BA', label: 'Bahia (BA)' },
  { value: 'CE', label: 'Ceará (CE)' },
  { value: 'DF', label: 'Distrito Federal (DF)' },
  { value: 'ES', label: 'Espírito Santo (ES)' },
  { value: 'GO', label: 'Goiás (GO)' },
  { value: 'MA', label: 'Maranhão (MA)' },
  { value: 'MT', label: 'Mato Grosso (MT)' },
  { value: 'MS', label: 'Mato Grosso do Sul (MS)' },
  { value: 'MG', label: 'Minas Gerais (MG)' },
  { value: 'PA', label: 'Pará (PA)' },
  { value: 'PB', label: 'Paraíba (PB)' },
  { value: 'PR', label: 'Paraná (PR)' },
  { value: 'PE', label: 'Pernambuco (PE)' },
  { value: 'PI', label: 'Piauí (PI)' },
  { value: 'RJ', label: 'Rio de Janeiro (RJ)' },
  { value: 'RN', label: 'Rio Grande do Norte (RN)' },
  { value: 'RO', label: 'Rondônia (RO)' },
  { value: 'RR', label: 'Roraima (RR)' },
  { value: 'SC', label: 'Santa Catarina (SC)' },
  { value: 'SE', label: 'Sergipe (SE)' },
  { value: 'TO', label: 'Tocantins (TO)' }
];

export const STATUS_CONFIG = {
  a_coletar: { 
    label: 'À coletar', 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-600',
    icon: Clock
  },
  em_transito: { 
    label: 'Em trânsito', 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-600',
    icon: Truck
  },
  armazenada: { 
    label: 'Armazenada', 
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-600',
    icon: Package
  },
  entregue: { 
    label: 'Entregue', 
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    bgColor: 'bg-green-100',
    textColor: 'text-green-600',
    icon: CheckCircle
  },
  cancelada: { 
    label: 'Cancelada', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    bgColor: 'bg-red-100',
    textColor: 'text-red-600',
    icon: AlertTriangle
  }
};

/**
 * Extrai UF e Cidade/Local de uma string completa (ex: "Canoas - RS" ou "Salta - AR").
 * @param localCompleto String de origem ou destino.
 * @returns { uf: string, cidade: string }
 */
export const extrairUfECidade = (localCompleto: string): { uf: string, cidade: string } => {
  const cleanLocal = localCompleto.trim();
  if (!cleanLocal) return { uf: '', cidade: '' };

  // Lista de códigos de UF/País válidos
  const validUfs = UFS_ORDENADAS.map(u => u.value);

  // 1. Tenta extrair UF/País e Cidade (formato: Cidade - UF/País)
  // Regex: Captura tudo antes do último hífen, e o código de 2 letras após o hífen.
  // Ajustado para ser mais flexível com o espaço antes do hífen, mas mantendo a validação de 2 letras.
  const match = cleanLocal.match(/(.*)\s-\s([A-Z]{2})$/);
  
  if (match) {
    const cidade = match[1].trim();
    const uf = match[2].trim();
    
    // Verifica se a UF/País extraída é válida
    if (validUfs.includes(uf)) {
        return { uf, cidade };
    }
  } 
  
  // 2. Tenta encontrar uma UF ou País na lista (se o valor for apenas o código)
  if (validUfs.includes(cleanLocal)) {
    return { uf: cleanLocal, cidade: '' };
  }

  // 3. Se falhar, assume que o valor completo é o nome da cidade/local, e a UF é desconhecida
  // Se o valor for um código de 2 letras que não está na lista, ele será tratado como cidade.
  return { uf: '', cidade: cleanLocal };
};