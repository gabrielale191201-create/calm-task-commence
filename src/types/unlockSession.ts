export interface UnlockSession {
  id: string;
  inputText: string;
  claridad: string;
  foco: string;
  ritual: string[];
  compromiso: string;
  accion: string;
  startedFocusTime: boolean;
  convertedToTask: boolean;
  completed: boolean; // action was completed
  createdAt: string; // ISO timestamp
}
