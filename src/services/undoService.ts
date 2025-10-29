export interface UndoAction {
  type: string;
  description: string;
  data: any; // Data needed to revert the action
  undoFunction: () => Promise<void>;
}

type UndoNotificationCallback = (action: UndoAction | null) => void;

class UndoService {
  private currentAction: UndoAction | null = null;
  private timeoutId: number | null = null;
  private notificationCallback: UndoNotificationCallback | null = null;

  addUndoAction(action: UndoAction) {
    // Clear any existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.currentAction = action;
    this.notificationCallback?.(action);

    // Set a new timeout to clear the action after 10 seconds
    this.timeoutId = setTimeout(() => {
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

  getCurrentAction(): UndoAction | null {
    return this.currentAction;
  }
}

export const undoService = new UndoService();