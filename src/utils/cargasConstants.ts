import { Truck, CheckCircle, Clock, AlertTriangle, Package } from 'lucide-react';

export const UFS_ORDENADAS = [
  { value: 'internacional', label: 'Internacional' },
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