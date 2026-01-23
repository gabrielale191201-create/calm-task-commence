export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  isTopThree: boolean;
}

export interface Routine {
  id: string;
  name: string;
  duration: number; // in minutes
  steps: RoutineStep[];
  createdAt: string;
}

export interface RoutineStep {
  id: string;
  text: string;
  completed: boolean;
}

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  createdAt: string;
}

export interface FocusSession {
  id: string;
  task: string;
  duration: number; // in seconds
  completedAt: string;
  date: string;
}

export interface DailyStats {
  date: string;
  sessionsCompleted: number;
  minutesFocused: number;
}

export interface UserProfile {
  name: string;
}

export type TabType = 'hoy' | 'enfoque' | 'tareas' | 'rutinas' | 'diario' | 'progreso';
