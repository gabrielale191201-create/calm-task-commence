export interface Task {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
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
  completedAt?: string;
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
  plannedDuration: number; // in seconds
  focusedDuration: number; // in seconds
  status: 'completed' | 'abandoned';
  completedAt: string;
  date: string;
  linkedActivityId?: string;
}

export type ScheduleCategory = 'Enfoque' | 'Rutina' | 'Personal' | 'Estudio' | 'Trabajo';

export interface ScheduleActivity {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  category: ScheduleCategory;
  note?: string;
  canStartFocus: boolean;
  status: 'scheduled' | 'done' | 'incomplete';
  createdAt: string;
  updatedAt: string;
}

export interface DailyStats {
  date: string;
  sessionsCompleted: number;
  minutesFocused: number;
}

export interface UserProfile {
  name: string;
}

export type TabType = 'hoy' | 'enfoque' | 'horario' | 'tareas' | 'rutinas' | 'diario' | 'progreso';
