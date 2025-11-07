export interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  urgency: 'Urgente' | 'Normal' | 'Leve'; // ALTERADO
  
  // Data e Hora do Compromisso/Tarefa
  dueDate?: Date; 
  dueTime?: string; // Formato HH:mm (ex: "14:30")
  
  // Configuração de Notificação (apenas se dueTime existir)
  notificationOffset?: number; // Minutos antes (ex: 30, 60, 120)
  
  createdAt: Date;
  updatedAt: Date;
}

export interface AgendaContextType {
  items: AgendaItem[];
  addItem: (item: Omit<AgendaItem, 'id' | 'createdAt' | 'updatedAt' | 'isCompleted'>) => AgendaItem;
  updateItem: (id: string, updates: Partial<AgendaItem>) => AgendaItem | null;
  deleteItem: (id: string) => boolean;
  toggleCompletion: (id: string) => void;
  
  // Notificações
  pendingNotifications: AgendaItem[];
  dismissNotification: (id: string) => void;
}

export const initialAgendaItem: Omit<AgendaItem, 'id' | 'createdAt' | 'updatedAt' | 'isCompleted'> = {
    title: '',
    description: '',
    urgency: 'Normal', // ALTERADO
    dueDate: undefined,
    dueTime: undefined,
    notificationOffset: 30,
};

// Função auxiliar para gerar IDs no formato UUID simulado
export const generateUuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Função para carregar dados do localStorage
export const loadAgendaData = (): AgendaItem[] => {
    try {
        const item = localStorage.getItem('agenda_items');
        if (!item) return [];
        
        const data = JSON.parse(item);
        
        // Mapeia e converte datas
        return data.map((d: any) => {
            // Garante que dueDate seja um objeto Date válido ou undefined
            const dueDate = d.dueDate ? new Date(d.dueDate) : undefined;
            
            return {
                ...d,
                // CORREÇÃO: Mapeia urgência antiga para nova se necessário
                urgency: d.urgency === 'high' ? 'Urgente' : d.urgency === 'medium' ? 'Normal' : d.urgency === 'low' ? 'Leve' : d.urgency,
                dueDate: dueDate && !isNaN(dueDate.getTime()) ? dueDate : undefined,
                createdAt: new Date(d.createdAt),
                updatedAt: new Date(d.updatedAt),
            };
        });
    } catch (e) {
        console.error('Failed to load agenda data from localStorage', e);
        return [];
    }
};

// Função para salvar dados no localStorage
export const saveAgendaData = (data: AgendaItem[]) => {
    try {
        // Antes de salvar, remove a referência de Date para que o JSON.stringify funcione corretamente
        const serializableData = data.map(d => ({
            ...d,
            // Converte Date para string ISO para persistência
            dueDate: d.dueDate ? d.dueDate.toISOString() : undefined,
            createdAt: d.createdAt.toISOString(),
            updatedAt: d.updatedAt.toISOString(),
        }));
        localStorage.setItem('agenda_items', JSON.stringify(serializableData));
    } catch (e) {
        console.error('Failed to save agenda data to localStorage', e);
    }
};