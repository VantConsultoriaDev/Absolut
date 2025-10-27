// Interface para ações que podem ser desfeitas
export interface UndoAction {
  id: string;
  type: 'delete_partner' | 'delete_cargo' | 'delete_financial' | 'import_csv' | 'import_excel';
  description: string;
  data: any;
  timestamp: number;
  undoFunction: () => Promise<void>;
}

// Tipo para callback de notificação
export type UndoNotificationCallback = (action: UndoAction | null) => void;

class UndoService {
  private currentAction: UndoAction | null = null;
  private timeoutId: NodeJS.Timeout | null = null;
  private notificationCallback: UndoNotificationCallback | null = null;
  private readonly UNDO_TIMEOUT = 10000; // 10 segundos

  // Registrar callback para notificações
  setNotificationCallback(callback: UndoNotificationCallback) {
    this.notificationCallback = callback;
  }

  // Adicionar uma nova ação que pode ser desfeita
  addUndoAction(action: Omit<UndoAction, 'id' | 'timestamp'>) {
    // Limpar ação anterior se existir
    this.clearCurrentAction();

    // Criar nova ação
    const newAction: UndoAction = {
      ...action,
      id: this.generateId(),
      timestamp: Date.now()
    };

    this.currentAction = newAction;

    // Notificar sobre a nova ação
    if (this.notificationCallback) {
      this.notificationCallback(newAction);
    }

    // Configurar timeout para remover a ação
    this.timeoutId = setTimeout(() => {
      this.clearCurrentAction();
    }, this.UNDO_TIMEOUT);
  }

  // Executar desfazer da ação atual
  async executeUndo(): Promise<boolean> {
    if (!this.currentAction) {
      return false;
    }

    try {
      await this.currentAction.undoFunction();
      this.clearCurrentAction();
      return true;
    } catch (error) {
      console.error('Erro ao desfazer ação:', error);
      return false;
    }
  }

  // Obter ação atual
  getCurrentAction(): UndoAction | null {
    return this.currentAction;
  }

  // Limpar ação atual
  private clearCurrentAction() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.currentAction = null;

    // Notificar que não há mais ação
    if (this.notificationCallback) {
      this.notificationCallback(null);
    }
  }

  // Gerar ID único
  private generateId(): string {
    return `undo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cancelar ação atual sem executar
  cancelCurrentAction() {
    this.clearCurrentAction();
  }
}

// Instância singleton
export const undoService = new UndoService();