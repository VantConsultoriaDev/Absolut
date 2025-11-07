import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AgendaItem, AgendaContextType, generateUuid, loadAgendaData, saveAgendaData } from './types';
import { isBefore, subMinutes, isSameDay, isSameHour, isSameMinute } from 'date-fns';
import { showError } from '../utils/toast';

const AgendaContext = createContext<AgendaContextType | undefined>(undefined);

export const useAgenda = () => {
  const context = useContext(AgendaContext);
  if (context === undefined) {
    throw new Error('useAgenda must be used within an AgendaProvider');
  }
  return context;
};

interface AgendaProviderProps {
  children: React.ReactNode;
}

export const AgendaProvider: React.FC<AgendaProviderProps> = ({ children }) => {
  const [items, setItems] = useState<AgendaItem[]>(loadAgendaData());
  const [pendingNotifications, setPendingNotifications] = useState<AgendaItem[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]); // IDs de notif. já dispensadas

  // --- Persistência ---
  useEffect(() => {
    saveAgendaData(items);
  }, [items]);

  // --- CRUD Operations ---
  const addItem = useCallback((item: Omit<AgendaItem, 'id' | 'createdAt' | 'updatedAt' | 'isCompleted'>): AgendaItem => {
    const newItem: AgendaItem = {
      ...item,
      id: generateUuid(),
      isCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setItems(prev => [...prev, newItem]);
    return newItem;
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<AgendaItem>): AgendaItem | null => {
    let updatedItem: AgendaItem | null = null;
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        updatedItem = { ...item, ...updates, updatedAt: new Date() };
        return updatedItem;
      }
      return item;
    }));
    return updatedItem;
  }, []);

  const deleteItem = useCallback((id: string): boolean => {
    setItems(prev => prev.filter(item => item.id !== id));
    return true;
  }, []);

  const toggleCompletion = useCallback((id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, isCompleted: !item.isCompleted, updatedAt: new Date() };
      }
      return item;
    }));
  }, []);
  
  const dismissNotification = useCallback((id: string) => {
    setPendingNotifications(prev => prev.filter(item => item.id !== id));
    setDismissedNotifications(prev => [...prev, id]);
  }, []);

  // --- Lógica de Notificação (Polling a cada 1 minuto) ---
  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      
      const newPending = items.filter(item => {
        // 1. Deve ter data e hora definidas, e não estar concluído
        if (!item.dueDate || !item.dueTime || item.isCompleted) return false;
        
        // 2. Deve ser um item que ainda não foi notificado/dispensado nesta sessão
        if (pendingNotifications.some(n => n.id === item.id)) return false;
        if (dismissedNotifications.includes(item.id)) return false;
        
        // 3. Calcula o tempo de notificação
        const [hours, minutes] = item.dueTime.split(':').map(Number);
        const dueDateTime = new Date(item.dueDate);
        dueDateTime.setHours(hours, minutes, 0, 0);
        
        const offset = item.notificationOffset || 0;
        const notificationTime = subMinutes(dueDateTime, offset);
        
        // 4. Verifica se o tempo de notificação já passou, mas o compromisso ainda não
        // Verifica se NOW está entre [NotificationTime] e [DueDateTime]
        const isTimeForNotification = now >= notificationTime && now <= dueDateTime;
        
        // 5. Se a notificação for para o momento exato (offset=0), verifica se é o minuto atual
        if (offset === 0) {
            return isSameDay(now, dueDateTime) && isSameHour(now, dueDateTime) && isSameMinute(now, dueDateTime);
        }
        
        return isTimeForNotification;
      });
      
      if (newPending.length > 0) {
        setPendingNotifications(prev => [...prev, ...newPending]);
      }
    };

    // Executa imediatamente e depois a cada 60 segundos
    checkNotifications();
    const interval = setInterval(checkNotifications, 60000); 

    return () => clearInterval(interval);
  }, [items, pendingNotifications, dismissedNotifications]);


  const value: AgendaContextType = {
    items,
    addItem,
    updateItem,
    deleteItem,
    toggleCompletion,
    pendingNotifications,
    dismissNotification,
  };

  return (
    <AgendaContext.Provider value={value}>
      {children}
    </AgendaContext.Provider>
  );
};