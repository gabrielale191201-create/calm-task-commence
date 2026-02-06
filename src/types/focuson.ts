export interface Task {
  id: string;
  text: string;
  /**
   * Estado actual de la tarea.
   * - pending: por hacer
   * - done: hecha
   */
  status: 'pending' | 'done';
  /**
   * Origen de la tarea.
   * - manual: creada en la pestaña Tareas
   * - horario: creada desde una actividad del Horario
   */
  source: 'manual' | 'horario';
  completedAt?: string;
  createdAt: string;
  isTopThree: boolean;

  // Programación OPCIONAL - el usuario decide manualmente
  scheduledDate?: string; // YYYY-MM-DD (opcional)
  scheduledTime?: string; // HH:mm (opcional)
  durationMinutes?: number; // minutos (opcional)
  
  // Recordatorio push notification
  reminderEnabled?: boolean;
  reminderSentAt?: string; // timestamp ISO cuando se envió
}

/**
 * Nota rápida de la agendita diaria.
 * No consume tiempo, no crea bloques, no cuenta en el límite de 5.
 */
export interface QuickNote {
  id: string;
  text: string;
  date: string; // YYYY-MM-DD
  done: boolean;
  createdAt: string;
}

export interface Routine {
  id: string;
  name: string;
  // Rutinas NO tienen duración - son hábitos sin tiempo
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
