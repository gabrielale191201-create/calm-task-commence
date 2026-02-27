export interface PrioritizedActivity {
  text: string;
  level: 'esencial' | 'importante' | 'secundario';
  convertedToTask: boolean;
}

export interface UnlockSession {
  id: string;
  inputText: string;
  visionInterior: string;
  actividades: PrioritizedActivity[];
  consejoDisciplina: string;
  startedFocusTime: boolean;
  completed: boolean;
  createdAt: string; // ISO timestamp
}
