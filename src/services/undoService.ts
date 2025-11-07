export interface UndoAction {
  type: string;
  description: string;
  data: any; // Data needed to revert the action
  undoFunction: () => Promise<void>;
  syncFunction?: () => Promise<void>; // NOVO: Função para sincronizar se não for desfeito
}

type UndoNotificationCallback = (action: UndoAction | null) => void;
type UndoExpirationCallback = (action: UndoAction) => void; // NOVO: Callback de expiração

class UndoService {
  private currentAction: UndoAction | null = null;
  private timeoutId: number | null = null;
  private notificationCallback: UndoNotificationCallback | null = null;
  private expirationCallback: UndoExpirationCallback | null = null; // NOVO

  addUndoAction(action: UndoAction) {
    // Clear any existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.currentAction = action;
    this.notificationCallback?.(action);

    // Set a new timeout to clear the action after 10 seconds
    this.timeoutId = setTimeout(() => {
      if (this.currentAction) {
        // Se a ação expirar, chama o callback de expiração antes de limpar
        this.expirationCallback?.(this.currentAction);
      }
      this.clearCurrentAction();
    }, 10000) as unknown as number; // Explicitly cast to number
  }

  async executeUndo(): Promise<boolean> {
    if (!this.currentAction) {
      return false;
    }

    try {
      await this.currentAction.undoFunction();
      console.log(`Undo successful for: ${this.currentAction.description}`);
      this.clearCurrentAction();
      return true;
    } catch (error) {
      console.error(`Error executing undo for: ${this.currentAction.description}`, error);
      return false;
    }
  }

  cancelCurrentAction() {
    this.clearCurrentAction();
  }

  private clearCurrentAction() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.currentAction = null;
    this.notificationCallback?.(null);
  }

  setNotificationCallback(callback: UndoNotificationCallback) {
    this.notificationCallback = callback;
  }
  
  setExpirationCallback(callback: UndoExpirationCallback) { // NOVO
    this.expirationCallback = callback;
  }

  getCurrentAction(): UndoAction | null {
    return this.currentAction;
  }
}

export const undoService = new UndoService();