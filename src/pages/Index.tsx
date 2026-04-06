import { useState, useEffect, useCallback, useMemo } from 'react';
import { HelpCircle, LogOut, UserPlus } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { TimerIndicator } from '@/components/TimerIndicator';
import { HomePage } from '@/components/pages/HomePage';
import { FocusPage } from '@/components/pages/FocusPage';
import { TasksPage } from '@/components/pages/TasksPage';
import { JournalPage } from '@/components/pages/JournalPage';
import { ProgressPage } from '@/components/pages/ProgressPage';
import { SchedulePage } from '@/components/pages/SchedulePage';
import { CoachPage } from '@/components/pages/CoachPage';
import { HowToUsePage } from '@/components/pages/HowToUsePage';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { ProductTagline } from '@/components/ProductTagline';
import { FloatingNotesButton } from '@/components/notes/FloatingNotesButton';
import { UnlockMode } from '@/components/ai/UnlockMode';
import { GuestModeBanner } from '@/components/GuestModeBanner';
import { useTimer } from '@/hooks/useTimer';
import { useAlarmSound } from '@/hooks/useAlarmSound';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAuthState } from '@/hooks/useAuthState';
import { useGuestMode } from '@/hooks/useGuestMode';
import { useProfile } from '@/hooks/useProfile';
import { useTelegramWebhook } from '@/hooks/useTelegramWebhook';
import { trackUserEvent } from '@/lib/trackEvent';
import { TabType, Task, Routine, JournalEntry, FocusSession, QuickNote } from '@/types/focuson';
import { UnlockSession } from '@/types/unlockSession';
import { AppLogo } from '@/components/AppLogo';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// Interface for floating notes (separate from quick notes in schedule)
interface FloatingNote {
  id: string;
  text: string;
  done?: boolean;
  createdAt: string;
}

export default function Index() {
  const { signOut } = useAuthState();
  const { isGuest, exitGuestMode } = useGuestMode();
  const { triggerWebhook } = useTelegramWebhook();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useLocalStorage<TabType>('focuson-tab', 'hoy');
  const [showHowTo, setShowHowTo] = useState(false);
  const [isWritingMode, setIsWritingMode] = useState(false);
  const { profile } = useProfile();

  const handleSignOut = async () => {
    // If guest, just exit guest mode
    if (isGuest) {
      exitGuestMode();
      navigate('/auth', { replace: true });
      return;
    }
    
    const { error } = await signOut();
    if (error) {
      toast.error('Error al cerrar sesión');
    } else {
      toast.success('Sesión cerrada');
    }
  };

  const handleCreateAccount = () => {
    exitGuestMode();
    navigate('/auth');
  };
  const [tasks, setTasks] = useLocalStorage<Task[]>('focuson-tasks', []);
  const [routines, setRoutines] = useLocalStorage<Routine[]>('focuson-routines', []);
  const [journalEntries, setJournalEntries] = useLocalStorage<JournalEntry[]>('focuson-journal', []);
  const [sessions, setSessions] = useLocalStorage<FocusSession[]>('focuson-sessions', []);
  const [quickNotes, setQuickNotes] = useLocalStorage<QuickNote[]>('focuson-quicknotes', []);
  const [floatingNotes, setFloatingNotes] = useLocalStorage<FloatingNote[]>('focuson-floatingnotes', []);
  const [unlockSessions, setUnlockSessions] = useLocalStorage<UnlockSession[]>('focuson-unlock-sessions', []);
  const [activeUnlockSessionId, setActiveUnlockSessionId] = useState<string | null>(null);
  const [lastActiveDate, setLastActiveDate] = useLocalStorage<string>('focuson-last-active', '');

  const timer = useTimer();
  const { soundEnabled, setSoundEnabled, playAlarm } = useAlarmSound();

  // Play alarm when timer completes
  useEffect(() => {
    if (timer.isCompleted) {
      playAlarm();
    }
  }, [timer.isCompleted, playAlarm]);

  // Reset routine steps daily
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (lastActiveDate && lastActiveDate !== today) {
      setRoutines(routines.map(r => ({
        ...r,
        steps: r.steps.map(s => ({ ...s, completed: false }))
      })));
    }
    setLastActiveDate(today);
  }, [lastActiveDate, routines, setRoutines, setLastActiveDate]);

  // Calculate streak
  const calculateStreak = useCallback(() => {
    if (sessions.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let checkDate = new Date(today);
    
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const hasSessions = sessions.some(s => s.date === dateStr);
      
      if (hasSessions) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (checkDate.getTime() === today.getTime()) {
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  }, [sessions]);

  // Task handlers
  const addTask = (
    input: string | { text: string; scheduledDate?: string; scheduledTime?: string; durationMinutes?: number; source?: Task['source'] },
    isTopThree = false
  ) => {
    if (typeof input === 'string') {
      const newTask: Task = {
        id: generateId(),
        text: input,
        status: 'pending',
        source: 'manual',
        createdAt: new Date().toISOString(),
        isTopThree: true,
        // Sin programación por defecto
        scheduledDate: undefined,
        scheduledTime: undefined,
        durationMinutes: undefined,
      };
      setTasks([...tasks, newTask]);
      trackUserEvent('task_created', { text: input, source: 'manual', is_top_three: true });
      return;
    }

    const newTask: Task = {
      id: generateId(),
      text: input.text,
      status: 'pending',
      source: input.source || 'manual',
      createdAt: new Date().toISOString(),
      isTopThree,
      scheduledDate: input.scheduledDate,
      scheduledTime: input.scheduledTime,
      durationMinutes: input.durationMinutes,
    };
    setTasks([...tasks, newTask]);
    trackUserEvent('task_created', { text: input.text, source: input.source || 'manual', is_top_three: isTopThree });

    // Disparar webhook si tiene fecha + hora
    if (input.scheduledDate && input.scheduledTime) {
      triggerWebhook(newTask.id, input.text, input.scheduledDate, input.scheduledTime).then(result => {
        if (!result.sent && result.reason === 'no_telegram') {
          toast('Conecta Telegram para recibir recordatorios', {
            description: 'Así te avisamos a tiempo por mensaje directo.',
            action: {
              label: 'Conectar',
              onClick: () => setActiveTab('horario'),
            },
          });
        }
      });
    }
  };

  // Update task scheduling
  const updateTask = (id: string, updates: Partial<Pick<Task, 'scheduledDate' | 'scheduledTime' | 'durationMinutes'>>) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const updatedTask = { ...task, ...updates };
    setTasks(tasks.map(t => t.id === id ? updatedTask : t));

    // Disparar webhook si ahora tiene fecha + hora
    const finalDate = updates.scheduledDate ?? task.scheduledDate;
    const finalTime = updates.scheduledTime ?? task.scheduledTime;
    
    if (finalDate && finalTime) {
      triggerWebhook(task.id, updatedTask.text, finalDate, finalTime).then(result => {
        if (!result.sent && result.reason === 'no_telegram') {
          toast('Conecta Telegram para recibir recordatorios', {
            description: 'Así te avisamos a tiempo por mensaje directo.',
            action: {
              label: 'Conectar',
              onClick: () => setActiveTab('horario'),
            },
          });
        }
      });
    }
  };

  // Reuse a completed task — set back to pending with optional new schedule
  const reuseTask = (id: string, updates: Partial<Pick<Task, 'scheduledDate' | 'scheduledTime' | 'durationMinutes'>>) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const reusedTask: Task = {
      ...task,
      status: 'pending',
      completedAt: task.completedAt, // keep as last_completed_at
      ...updates,
    };
    setTasks(tasks.map(t => t.id === id ? reusedTask : t));

    // Trigger webhook if now has date + time
    const finalDate = updates.scheduledDate ?? task.scheduledDate;
    const finalTime = updates.scheduledTime ?? task.scheduledTime;
    if (finalDate && finalTime) {
      triggerWebhook(task.id, reusedTask.text, finalDate, finalTime);
    }
  };

  // Add multiple tasks from AI - SIN hora, fecha ni duración
  const addMultipleTasks = (taskTexts: string[], priorityIndices?: number[]) => {
    const prioritySet = new Set(priorityIndices || []);
    const todayDate = new Date().toISOString().split('T')[0];
    const newTasks = taskTexts.map((text, index) => {
      const isPriority = prioritySet.has(index);
      return {
        id: generateId(),
        text,
        status: 'pending' as const,
        source: 'manual' as const,
        createdAt: new Date().toISOString(),
        isTopThree: isPriority,
        isExceptionToday: false,
        dateAutoAssigned: isPriority ? true : undefined,
        // Auto-assign date for priorities, none for others
        scheduledDate: isPriority ? todayDate : undefined,
        scheduledTime: undefined,
        durationMinutes: undefined,
      };
    });
    setTasks([...tasks, ...newTasks]);
    setActiveTab('tareas');
  };

  // Add floating notes from AI
  const addFloatingNotesFromAI = (noteTexts: string[]) => {
    const newNotes = noteTexts.map(text => ({
      id: generateId(),
      text,
      createdAt: new Date().toISOString(),
    }));
    setFloatingNotes([...floatingNotes, ...newNotes]);
  };

  const setTaskStatus = (id: string, newStatus: Task['status']) => {
    const now = new Date().toISOString();
    setTasks(tasks.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        status: newStatus,
        completedAt: newStatus === 'completed' ? now : undefined,
      };
    }));
    trackUserEvent('task_status_changed', { task_id: id, new_status: newStatus });
  };

  const toggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    setTaskStatus(id, task.status === 'completed' ? 'pending' : 'completed');
  };

  // Migration for old tasks (done → completed)
  useEffect(() => {
    const needsMigration = tasks.some((t: any) => typeof t.status === 'undefined' || typeof t.source === 'undefined' || t.status === 'done');
    if (!needsMigration) return;
    setTasks(tasks.map((t: any) => {
      let status: Task['status'] = t.status;
      if (typeof t.status === 'undefined') {
        status = t.completed ? 'completed' : 'pending';
      } else if (t.status === 'done') {
        status = 'completed';
      }
      const source: Task['source'] = t.source || 'manual';
      return {
        ...t,
        status,
        source,
      } as Task;
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    trackUserEvent('task_deleted', { task_id: id });
  };

  const removeFromTopThree = (id: string) => {
    setTasks(tasks.map(t => {
      if (t.id !== id) return t;
      const updated: Task = { ...t, isTopThree: false, isExceptionToday: false };
      // If date was auto-assigned, remove it
      if (t.dateAutoAssigned) {
        updated.scheduledDate = undefined;
        updated.dateAutoAssigned = undefined;
      }
      return updated;
    }));
  };

  // Toggle priority (isTopThree) with 3+2 exception logic
  const togglePriority = (id: string, forceException?: boolean) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const todayDate = new Date().toISOString().split('T')[0];

    // If already priority, remove it
    if (task.isTopThree) {
      removeFromTopThree(id);
      return;
    }

    // Count current priorities for today
    const currentPriorities = tasks.filter(t => t.isTopThree && t.status !== 'completed');
    const normalCount = currentPriorities.filter(t => !t.isExceptionToday).length;
    const exceptionCount = currentPriorities.filter(t => t.isExceptionToday).length;

    if (normalCount < 3) {
      // Normal priority slot available
      setTasks(tasks.map(t => t.id === id ? {
        ...t,
        isTopThree: true,
        isExceptionToday: false,
        scheduledDate: t.scheduledDate || todayDate,
        dateAutoAssigned: !t.scheduledDate ? true : t.dateAutoAssigned,
      } : t));
    } else if (forceException && exceptionCount < 2) {
      // Exception approved
      setTasks(tasks.map(t => t.id === id ? {
        ...t,
        isTopThree: true,
        isExceptionToday: true,
        scheduledDate: t.scheduledDate || todayDate,
        dateAutoAssigned: !t.scheduledDate ? true : t.dateAutoAssigned,
      } : t));
    } else if (normalCount >= 3 && !forceException) {
      // Need to show confirmation - return special value
      return 'needs_confirmation';
    } else if (exceptionCount >= 2) {
      toast('Para mantener claridad, hoy el máximo es 5.');
      return 'max_reached';
    }
    return 'ok';
  };

  // Routine handlers (kept for data, but section is hidden)
  const addRoutine = (name: string) => {
    const newRoutine: Routine = {
      id: generateId(),
      name,
      steps: [],
      createdAt: new Date().toISOString(),
    };
    setRoutines([...routines, newRoutine]);
  };

  const deleteRoutine = (id: string) => {
    setRoutines(routines.filter(r => r.id !== id));
  };

  const addRoutineStep = (routineId: string, text: string) => {
    setRoutines(routines.map(r => {
      if (r.id === routineId) {
        return {
          ...r,
          steps: [...r.steps, { id: generateId(), text, completed: false }]
        };
      }
      return r;
    }));
  };

  const toggleRoutineStep = (routineId: string, stepId: string) => {
    const now = new Date().toISOString();
    setRoutines(routines.map(r => {
      if (r.id === routineId) {
        return {
          ...r,
          steps: r.steps.map(s => {
            if (s.id !== stepId) return s;
            const nextCompleted = !s.completed;
            return { ...s, completed: nextCompleted, completedAt: nextCompleted ? now : undefined };
          })
        };
      }
      return r;
    }));
  };

  const deleteRoutineStep = (routineId: string, stepId: string) => {
    setRoutines(routines.map(r => {
      if (r.id === routineId) {
        return {
          ...r,
          steps: r.steps.filter(s => s.id !== stepId)
        };
      }
      return r;
    }));
  };

  // Journal handlers
  const saveJournalEntry = (content: string, date: string) => {
    const existingIndex = journalEntries.findIndex(e => e.date === date);
    if (existingIndex >= 0) {
      const updated = [...journalEntries];
      updated[existingIndex] = { ...updated[existingIndex], content };
      setJournalEntries(updated);
    } else {
      setJournalEntries([...journalEntries, {
        id: generateId(),
        date,
        content,
        createdAt: new Date().toISOString(),
    }]);
    }
    trackUserEvent('journal_saved', { date, word_count: content.trim().split(/\s+/).length });
  };

  // QuickNote handlers (Agendita diaria)
  const addQuickNote = (text: string, date: string) => {
    const newNote: QuickNote = {
      id: generateId(),
      text,
      date,
      done: false,
      createdAt: new Date().toISOString(),
    };
    setQuickNotes([...quickNotes, newNote]);
  };

  const toggleQuickNote = (id: string) => {
    setQuickNotes(quickNotes.map(n => n.id === id ? { ...n, done: !n.done } : n));
  };

  const deleteQuickNote = (id: string) => {
    setQuickNotes(quickNotes.filter(n => n.id !== id));
  };

  // Floating notes handlers
  const addFloatingNote = (text: string) => {
    const newNote: FloatingNote = {
      id: generateId(),
      text,
      createdAt: new Date().toISOString(),
    };
    setFloatingNotes([...floatingNotes, newNote]);
    trackUserEvent('note_created', { text });
  };

  const deleteFloatingNote = (id: string) => {
    setFloatingNotes(floatingNotes.filter(n => n.id !== id));
    trackUserEvent('note_deleted', { note_id: id });
  };

  const toggleFloatingNote = (id: string) => {
    const note = floatingNotes.find(n => n.id === id);
    setFloatingNotes(floatingNotes.map(n =>
      n.id === id ? { ...n, done: !n.done } : n
    ));
    trackUserEvent('note_toggled', { note_id: id, done: !note?.done });
  };

  // Session handlers
  const saveSession = useCallback((task: string, duration: number) => {
    const newSession: FocusSession = {
      id: generateId(),
      task,
      plannedDuration: duration,
      focusedDuration: duration,
      status: 'completed',
      completedAt: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
    };
    setSessions(prev => [...prev, newSession]);
    trackUserEvent('focus_completed', { task, duration_seconds: duration });
  }, [setSessions]);

  // Focus start from task - track which task started it
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);

  const startFocusFromTopTask = (taskText: string, minutes: number) => {
    // Find the task by text to track it
    const task = tasks.find(t => t.text === taskText);
    if (task) {
      setFocusTaskId(task.id);
      // Auto-set to in_progress if pending
      if (task.status === 'pending') {
        setTaskStatus(task.id, 'in_progress');
      }
    }
    setActiveTab('enfoque');
    timer.startTimer(minutes, taskText);
  };

  const handleMarkFocusTaskCompleted = useCallback(() => {
    if (focusTaskId) {
      setTaskStatus(focusTaskId, 'completed');
      setFocusTaskId(null);
    }
  }, [focusTaskId, tasks]);

  const todayISO = new Date().toISOString().split('T')[0];

  const hasVictoryToday = (() => {
    const didSession = sessions.some((s) => s.date === todayISO && s.status === 'completed');
    const didTask = tasks.some((t) => t.status === 'completed' && (t.completedAt || '').startsWith(todayISO));
    const didRoutine = routines.some((r) => r.steps.some((st) => st.completed && (st.completedAt || '').startsWith(todayISO)));
    return didSession || didTask || didRoutine;
  })();

  const calculateStartedStreak = useCallback(() => {
    const dayHasVictory = (dateStr: string) => {
      const didSession = sessions.some((s) => s.date === dateStr && s.status === 'completed');
      const didTask = tasks.some((t) => t.status === 'completed' && (t.completedAt || '').startsWith(dateStr));
      const didRoutine = routines.some((r) => r.steps.some((st) => st.completed && (st.completedAt || '').startsWith(dateStr)));
      return didSession || didTask || didRoutine;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    let check = new Date(today);

    while (true) {
      const ds = check.toISOString().split('T')[0];
      if (dayHasVictory(ds)) {
        streak++;
        check.setDate(check.getDate() - 1);
      } else if (check.getTime() === today.getTime()) {
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [sessions, tasks, routines]);

  const topThreeTasks = tasks.filter(t => t.isTopThree).slice(0, 3);
  const regularTasks = tasks.filter(t => !t.isTopThree);

  // Count tasks per date for limit validation (now unlimited, kept for display)
  const getTasksCountForDate = useCallback((dateStr: string) => {
    return tasks.filter(t => t.scheduledDate === dateStr && t.status === 'pending').length;
  }, [tasks]);

  const tasksCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks) {
      if (t.scheduledDate && t.status === 'pending') {
        map.set(t.scheduledDate, (map.get(t.scheduledDate) || 0) + 1);
      }
    }
    return map;
  }, [tasks]);

  const renderPage = () => {
    switch (activeTab) {
      case 'hoy':
        return (
          <HomePage
            displayName={profile.name}
            topThreeTasks={topThreeTasks}
            onGoToFocus={() => setActiveTab('enfoque')}
            onToggleTask={toggleTask}
            onAddTask={(text) => addTask(text, true)}
            onRemoveFromTopThree={removeFromTopThree}
            onRequestSchedule={() => setActiveTab('horario')}
            startedStreak={calculateStartedStreak()}
            hasVictoryToday={hasVictoryToday}
            onStartFocusFromTopTask={startFocusFromTopTask}
            onSendToTasks={addMultipleTasks}
            currentTodayPriorityCount={tasks.filter(t => t.isTopThree && t.status !== 'completed').length}
          />
        );
      case 'enfoque':
        return (
          <FocusPage
            isRunning={timer.isRunning}
            timeLeft={timer.timeLeft}
            duration={timer.duration}
            progress={timer.progress}
            task={timer.task}
            isCompleted={timer.isCompleted}
            soundEnabled={soundEnabled}
            onStartTimer={timer.startTimer}
            onStopTimer={timer.stopTimer}
            onContinueTimer={timer.continueTimer}
            onAcknowledgeCompletion={timer.acknowledgeCompletion}
            onToggleSound={setSoundEnabled}
            onSaveSession={saveSession}
            onMarkTaskCompleted={focusTaskId ? handleMarkFocusTaskCompleted : undefined}
            unlockSessionId={activeUnlockSessionId}
            onUnlockSessionComplete={(id) => {
              setUnlockSessions(prev => prev.map(s => s.id === id ? { ...s, completed: true } : s));
              setActiveUnlockSessionId(null);
            }}
          />
        );
      case 'tareas':
        return (
          <TasksPage
            tasks={tasks}
            onAddTask={(data) => addTask(data, false)}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
            onSetTaskStatus={setTaskStatus}
            onUpdateTask={updateTask}
            onReuseTask={reuseTask}
            onStartFocus={(taskText, minutes) => startFocusFromTopTask(taskText, minutes)}
            getTasksCountForDate={getTasksCountForDate}
            onTogglePriority={togglePriority}
          />
        );
      case 'horario':
        return (
          <SchedulePage
            tasks={tasks}
            quickNotes={quickNotes}
            onStartFocus={(taskText, minutes) => startFocusFromTopTask(taskText, minutes)}
            tasksCountByDate={tasksCountByDate}
            onAddQuickNote={addQuickNote}
            onToggleQuickNote={toggleQuickNote}
            onDeleteQuickNote={deleteQuickNote}
          />
        );
      // Rutinas hidden - data preserved but not shown
      case 'rutinas':
        // Redirect to home if somehow accessed
        setActiveTab('hoy');
        return null;
      case 'diario':
        return (
          <JournalPage
            entries={journalEntries}
            onSaveEntry={saveJournalEntry}
          />
        );
      case 'progreso':
        return (
          <ProgressPage
            sessions={sessions}
            tasks={tasks}
            streak={calculateStreak()}
          />
        );
      case 'coach':
        return <CoachPage />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header with help button */}
      <header className="fixed top-0 left-0 right-0 z-30 backdrop-blur-xl border-b border-border/50" style={{ background: 'hsl(var(--background) / 0.8)' }}>
        <div className="flex items-center justify-between px-6 py-3">
          {/* Logo - fixed size, calm positioning */}
          <div className="flex items-center gap-2">
            <div className="pointer-events-none select-none">
              <AppLogo size={32} />
            </div>
            <h1 className="text-lg font-display font-semibold text-primary">
              Focus On
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHowTo(true)}
              className="p-2 rounded-xl hover:bg-muted transition-colors"
              title="¿Cómo funciona Focus On?"
            >
              <HelpCircle size={22} className="text-muted-foreground" />
            </button>
            {isGuest ? (
              <button
                onClick={handleCreateAccount}
                className="p-2 rounded-xl hover:bg-muted transition-colors"
                title="Crear tu espacio"
              >
                <UserPlus size={20} className="text-primary" />
              </button>
            ) : (
              <button
                onClick={handleSignOut}
                className="p-2 rounded-xl hover:bg-muted transition-colors"
                title="Cerrar sesión"
              >
                <LogOut size={20} className="text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Timer indicator when running and not on focus page */}
      {timer.isRunning && activeTab !== 'enfoque' && (
        <TimerIndicator
          timeLeft={timer.timeLeft}
          task={timer.task}
          onClick={() => setActiveTab('enfoque')}
        />
      )}

      {/* Onboarding + Tagline */}
      <ProductTagline />
      <OnboardingBanner />

      {/* Main content */}
      <main className="pt-20">
        {renderPage()}
      </main>

      {/* Floating Notes Button - visible on all sections */}
      <FloatingNotesButton
        notes={floatingNotes}
        onAddNote={addFloatingNote}
        onDeleteNote={deleteFloatingNote}
        onToggleNote={toggleFloatingNote}
        onWritingModeChange={setIsWritingMode}
      />

      {/* Guest mode banner - discrete reminder about local storage */}
      <GuestModeBanner />

      {/* Modo Desbloqueo - full on Home/Progress/Journal, compact on Focus/Schedule/Tasks */}
      <UnlockMode 
        variant={['hoy', 'progreso', 'diario'].includes(activeTab) ? 'full' : 'compact'} 
        onWritingModeChange={setIsWritingMode}
        onStartFocusTime={(minutes, unlockSessionId) => {
          if (unlockSessionId) setActiveUnlockSessionId(unlockSessionId);
          setActiveTab('enfoque');
          timer.startTimer(minutes, 'Modo Desbloqueo');
        }}
        onCreateTask={(text) => addTask(text)}
        sessions={unlockSessions}
        onSaveSession={(session) => setUnlockSessions(prev => [...prev, session])}
        onUpdateSession={(id, updates) => setUnlockSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))}
      />

      {/* Bottom navigation - hidden during writing mode */}
      <div className={`transition-all duration-300 ${isWritingMode ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* How to use overlay */}
      {showHowTo && <HowToUsePage onClose={() => setShowHowTo(false)} />}
    </div>
  );
}
