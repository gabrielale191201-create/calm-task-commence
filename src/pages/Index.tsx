import { useState, useEffect, useCallback, useMemo } from 'react';
import { HelpCircle, LogOut, UserPlus, Download, X } from 'lucide-react';
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
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useSessionTracker } from '@/hooks/useSessionTracker';
import { useTelegramWebhook } from '@/hooks/useTelegramWebhook';
import { trackUserEvent } from '@/lib/trackEvent';
import { TabType, Task, Routine } from '@/types/focuson';
import { AppLogo } from '@/components/AppLogo';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Index() {
  const { signOut } = useAuthState();
  const { isGuest, exitGuestMode } = useGuestMode();
  const { triggerWebhook } = useTelegramWebhook();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useLocalStorage<TabType>('focuson-tab', 'hoy');
  const [showHowTo, setShowHowTo] = useState(false);
  const [isWritingMode, setIsWritingMode] = useState(false);
  const [dismissedUpdate, setDismissedUpdate] = useState(() => {
    try { return localStorage.getItem('focuson-dismiss-update-v1.2') === 'true'; } catch { return false; }
  });
  const handleDismissUpdate = () => { setDismissedUpdate(true); try { localStorage.setItem('focuson-dismiss-update-v1.2', 'true'); } catch {} };
  const { profile } = useProfile();

  // Session tracker for time-in-app telemetry
  useSessionTracker();

  // Database-first data hook
  const data = useSupabaseData();
  const {
    tasks, quickNotes, journalEntries, sessions, floatingNotes, unlockSessions,
    addTask, setTaskStatus, deleteTask, updateTask, updateTaskFull, addMultipleTasks,
    addQuickNote, toggleQuickNote, deleteQuickNote,
    saveJournalEntry, saveSession,
    addFloatingNote, deleteFloatingNote, toggleFloatingNote, addFloatingNotesFromAI,
    saveUnlockSession, updateUnlockSession,
    setTasks,
  } = data;

  // Routines stay in localStorage (legacy, section hidden)
  const [routines, setRoutines] = useLocalStorage<Routine[]>('focuson-routines', []);
  const [lastActiveDate, setLastActiveDate] = useLocalStorage<string>('focuson-last-active', '');

  const [activeUnlockSessionId, setActiveUnlockSessionId] = useState<string | null>(null);

  const timer = useTimer();
  const { soundEnabled, setSoundEnabled, playAlarm } = useAlarmSound();

  const handleSignOut = async () => {
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

  // Play alarm when timer completes
  useEffect(() => {
    if (timer.isCompleted) playAlarm();
  }, [timer.isCompleted, playAlarm]);

  // Reset routine steps daily
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (lastActiveDate && lastActiveDate !== today) {
      setRoutines(routines.map(r => ({
        ...r, steps: r.steps.map(s => ({ ...s, completed: false }))
      })));
    }
    setLastActiveDate(today);
  }, [lastActiveDate, routines, setRoutines, setLastActiveDate]);

  // Calculate streak
  const calculateStreak = useCallback(() => {
    if (sessions.length === 0) return 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let streak = 0;
    let checkDate = new Date(today);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const hasSessions = sessions.some(s => s.date === dateStr);
      if (hasSessions) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
      else if (checkDate.getTime() === today.getTime()) { checkDate.setDate(checkDate.getDate() - 1); }
      else break;
    }
    return streak;
  }, [sessions]);

  // Task handlers that need webhook integration
  const handleAddTask = (
    input: string | { text: string; scheduledDate?: string; scheduledTime?: string; durationMinutes?: number; source?: Task['source'] },
    isTopThree = false
  ) => {
    const newTask = addTask(input, isTopThree);
    const opts = typeof input === 'string' ? {} as any : input;
    if (opts.scheduledDate && opts.scheduledTime) {
      triggerWebhook(newTask.id, newTask.text, opts.scheduledDate, opts.scheduledTime).then(result => {
        if (!result.sent && result.reason === 'no_telegram') {
          toast('Conecta Telegram para recibir recordatorios', {
            description: 'Así te avisamos a tiempo por mensaje directo.',
            action: { label: 'Conectar', onClick: () => setActiveTab('horario') },
          });
        }
      });
    }
  };

  const handleUpdateTask = (id: string, updates: Partial<Pick<Task, 'scheduledDate' | 'scheduledTime' | 'durationMinutes'>>) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    updateTask(id, updates);
    const finalDate = updates.scheduledDate ?? task.scheduledDate;
    const finalTime = updates.scheduledTime ?? task.scheduledTime;
    if (finalDate && finalTime) {
      triggerWebhook(task.id, task.text, finalDate, finalTime).then(result => {
        if (!result.sent && result.reason === 'no_telegram') {
          toast('Conecta Telegram para recibir recordatorios', {
            description: 'Así te avisamos a tiempo por mensaje directo.',
            action: { label: 'Conectar', onClick: () => setActiveTab('horario') },
          });
        }
      });
    }
  };

  const reuseTask = (id: string, updates: Partial<Pick<Task, 'scheduledDate' | 'scheduledTime' | 'durationMinutes'>>) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    updateTaskFull(id, { status: 'pending', ...updates });
    const finalDate = updates.scheduledDate ?? task.scheduledDate;
    const finalTime = updates.scheduledTime ?? task.scheduledTime;
    if (finalDate && finalTime) {
      triggerWebhook(task.id, task.text, finalDate, finalTime);
    }
  };

  const toggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    setTaskStatus(id, task.status === 'completed' ? 'pending' : 'completed');
  };

  const removeFromTopThree = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const updates: Partial<Task> = { isTopThree: false, isExceptionToday: false };
    if (task.dateAutoAssigned) {
      updates.scheduledDate = undefined;
      updates.dateAutoAssigned = undefined;
    }
    updateTaskFull(id, updates);
  };

  const togglePriority = (id: string, forceException?: boolean) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const todayDate = new Date().toISOString().split('T')[0];

    if (task.isTopThree) { removeFromTopThree(id); return; }

    const currentPriorities = tasks.filter(t => t.isTopThree && t.status !== 'completed');
    const normalCount = currentPriorities.filter(t => !t.isExceptionToday).length;
    const exceptionCount = currentPriorities.filter(t => t.isExceptionToday).length;

    if (normalCount < 3) {
      updateTaskFull(id, {
        isTopThree: true, isExceptionToday: false,
        scheduledDate: task.scheduledDate || todayDate,
        dateAutoAssigned: !task.scheduledDate ? true : task.dateAutoAssigned,
      });
    } else if (forceException && exceptionCount < 2) {
      updateTaskFull(id, {
        isTopThree: true, isExceptionToday: true,
        scheduledDate: task.scheduledDate || todayDate,
        dateAutoAssigned: !task.scheduledDate ? true : task.dateAutoAssigned,
      });
    } else if (normalCount >= 3 && !forceException) {
      return 'needs_confirmation';
    } else if (exceptionCount >= 2) {
      toast('Para mantener claridad, hoy el máximo es 5.');
      return 'max_reached';
    }
    return 'ok';
  };

  // Routine handlers (legacy)
  const addRoutine = (name: string) => {
    setRoutines([...routines, { id: Math.random().toString(36).substr(2, 9), name, steps: [], createdAt: new Date().toISOString() }]);
  };
  const deleteRoutine = (id: string) => setRoutines(routines.filter(r => r.id !== id));
  const addRoutineStep = (routineId: string, text: string) => {
    setRoutines(routines.map(r => r.id === routineId ? { ...r, steps: [...r.steps, { id: Math.random().toString(36).substr(2, 9), text, completed: false }] } : r));
  };
  const toggleRoutineStep = (routineId: string, stepId: string) => {
    const now = new Date().toISOString();
    setRoutines(routines.map(r => r.id === routineId ? { ...r, steps: r.steps.map(s => s.id !== stepId ? s : { ...s, completed: !s.completed, completedAt: !s.completed ? now : undefined }) } : r));
  };
  const deleteRoutineStep = (routineId: string, stepId: string) => {
    setRoutines(routines.map(r => r.id === routineId ? { ...r, steps: r.steps.filter(s => s.id !== stepId) } : r));
  };

  // Focus start from task
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);

  const startFocusFromTopTask = (taskText: string, minutes: number) => {
    const task = tasks.find(t => t.text === taskText);
    if (task) {
      setFocusTaskId(task.id);
      if (task.status === 'pending') setTaskStatus(task.id, 'in_progress');
    }
    setActiveTab('enfoque');
    timer.startTimer(minutes, taskText);
    trackUserEvent('focus_started', { task: taskText, minutes });
  };

  const handleMarkFocusTaskCompleted = useCallback(() => {
    if (focusTaskId) {
      setTaskStatus(focusTaskId, 'completed');
      setFocusTaskId(null);
    }
  }, [focusTaskId, setTaskStatus]);

  const todayISO = new Date().toISOString().split('T')[0];

  const hasVictoryToday = (() => {
    const didSession = sessions.some(s => s.date === todayISO && s.status === 'completed');
    const didTask = tasks.some(t => t.status === 'completed' && (t.completedAt || '').startsWith(todayISO));
    const didRoutine = routines.some(r => r.steps.some(st => st.completed && (st.completedAt || '').startsWith(todayISO)));
    return didSession || didTask || didRoutine;
  })();

  const calculateStartedStreak = useCallback(() => {
    const dayHasVictory = (dateStr: string) => {
      return sessions.some(s => s.date === dateStr && s.status === 'completed') ||
        tasks.some(t => t.status === 'completed' && (t.completedAt || '').startsWith(dateStr)) ||
        routines.some(r => r.steps.some(st => st.completed && (st.completedAt || '').startsWith(dateStr)));
    };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let streak = 0; let check = new Date(today);
    while (true) {
      const ds = check.toISOString().split('T')[0];
      if (dayHasVictory(ds)) { streak++; check.setDate(check.getDate() - 1); }
      else if (check.getTime() === today.getTime()) { check.setDate(check.getDate() - 1); }
      else break;
    }
    return streak;
  }, [sessions, tasks, routines]);

  const topThreeTasks = tasks.filter(t => t.isTopThree).slice(0, 3);

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

  const handleAddMultipleTasks = (taskTexts: string[], priorityIndices?: number[]) => {
    addMultipleTasks(taskTexts, priorityIndices);
    setActiveTab('tareas');
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'hoy':
        return (
          <HomePage
            displayName={profile.name}
            topThreeTasks={topThreeTasks}
            onGoToFocus={() => setActiveTab('enfoque')}
            onToggleTask={toggleTask}
            onAddTask={(text) => handleAddTask(text, true)}
            onRemoveFromTopThree={removeFromTopThree}
            onRequestSchedule={() => setActiveTab('horario')}
            startedStreak={calculateStartedStreak()}
            hasVictoryToday={hasVictoryToday}
            onStartFocusFromTopTask={startFocusFromTopTask}
            onSendToTasks={handleAddMultipleTasks}
            currentTodayPriorityCount={tasks.filter(t => t.isTopThree && t.status !== 'completed').length}
          />
        );
      case 'enfoque':
        return (
          <FocusPage
            isRunning={timer.isRunning} timeLeft={timer.timeLeft} duration={timer.duration}
            progress={timer.progress} task={timer.task} isCompleted={timer.isCompleted}
            soundEnabled={soundEnabled} onStartTimer={timer.startTimer} onStopTimer={timer.stopTimer}
            onContinueTimer={timer.continueTimer} onAcknowledgeCompletion={timer.acknowledgeCompletion}
            onToggleSound={setSoundEnabled} onSaveSession={saveSession}
            onMarkTaskCompleted={focusTaskId ? handleMarkFocusTaskCompleted : undefined}
            unlockSessionId={activeUnlockSessionId}
            onUnlockSessionComplete={(id) => {
              updateUnlockSession(id, { completed: true });
              setActiveUnlockSessionId(null);
            }}
          />
        );
      case 'tareas':
        return (
          <TasksPage
            tasks={tasks}
            onAddTask={(d) => handleAddTask(d, false)}
            onToggleTask={toggleTask} onDeleteTask={deleteTask} onSetTaskStatus={setTaskStatus}
            onUpdateTask={handleUpdateTask} onReuseTask={reuseTask}
            onStartFocus={(taskText, minutes) => startFocusFromTopTask(taskText, minutes)}
            getTasksCountForDate={getTasksCountForDate} onTogglePriority={togglePriority}
          />
        );
      case 'horario':
        return (
          <SchedulePage
            tasks={tasks} quickNotes={quickNotes}
            onStartFocus={(taskText, minutes) => startFocusFromTopTask(taskText, minutes)}
            tasksCountByDate={tasksCountByDate}
            onAddQuickNote={addQuickNote} onToggleQuickNote={toggleQuickNote} onDeleteQuickNote={deleteQuickNote}
          />
        );
      case 'rutinas':
        setActiveTab('hoy');
        return null;
      case 'diario':
        return <JournalPage entries={journalEntries} onSaveEntry={saveJournalEntry} />;
      case 'progreso':
        return <ProgressPage sessions={sessions} tasks={tasks} streak={calculateStreak()} />;
      case 'coach':
        return <CoachPage />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 backdrop-blur-xl border-b border-border/50" style={{ background: 'hsl(var(--background) / 0.8)' }}>
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="pointer-events-none select-none"><AppLogo size={32} /></div>
            <h1 className="text-lg font-display font-semibold text-primary">Focus On</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowHowTo(true)} className="p-2 rounded-xl hover:bg-muted transition-colors" title="¿Cómo funciona Focus On?">
              <HelpCircle size={22} className="text-muted-foreground" />
            </button>
            {isGuest ? (
              <button onClick={handleCreateAccount} className="p-2 rounded-xl hover:bg-muted transition-colors" title="Crear tu espacio">
                <UserPlus size={20} className="text-primary" />
              </button>
            ) : (
              <button onClick={handleSignOut} className="p-2 rounded-xl hover:bg-muted transition-colors" title="Cerrar sesión">
                <LogOut size={20} className="text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      {timer.isRunning && activeTab !== 'enfoque' && (
        <TimerIndicator timeLeft={timer.timeLeft} task={timer.task} onClick={() => setActiveTab('enfoque')} />
      )}

      <ProductTagline />
      <OnboardingBanner />


      {/* Update Banner */}
      {!dismissedUpdate && (
        <div className="fixed top-[60px] left-0 right-0 z-20 px-4 py-2">
          <div className="relative flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 backdrop-blur-lg px-4 py-3 shadow-lg">
            <Download size={22} className="text-primary shrink-0 animate-bounce" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">¡Nueva actualización crítica disponible!</p>
              <p className="text-xs text-muted-foreground mt-0.5">Para activar recordatorios y Focus Time, descarga la v1.2.</p>
            </div>
            <a
              href="https://cmszoptzpkgnroeirilm.supabase.co/storage/v1/object/public/app-releases/Focus%20On.apk"
              download
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-md hover:opacity-90 transition-opacity"
            >
              Descargar
            </a>
            <button onClick={handleDismissUpdate} className="shrink-0 p-1 rounded-full hover:bg-muted/50 transition-colors">
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      <main className="pt-20">{renderPage()}</main>

      <FloatingNotesButton
        notes={floatingNotes} onAddNote={addFloatingNote}
        onDeleteNote={deleteFloatingNote} onToggleNote={toggleFloatingNote}
        onWritingModeChange={setIsWritingMode}
      />

      <GuestModeBanner />

      <UnlockMode
        variant={['hoy', 'progreso', 'diario'].includes(activeTab) ? 'full' : 'compact'}
        onWritingModeChange={setIsWritingMode}
        onStartFocusTime={(minutes, unlockSessionId) => {
          if (unlockSessionId) setActiveUnlockSessionId(unlockSessionId);
          setActiveTab('enfoque');
          timer.startTimer(minutes, 'Modo Desbloqueo');
        }}
        onCreateTask={(text) => handleAddTask(text)}
        sessions={unlockSessions}
        onSaveSession={saveUnlockSession}
        onUpdateSession={updateUnlockSession}
      />

      <div className={`transition-all duration-300 ${isWritingMode ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        <BottomNav activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); trackUserEvent('nav_tab_changed', { tab }); }} />
      </div>

      {showHowTo && <HowToUsePage onClose={() => setShowHowTo(false)} />}
    </div>
  );
}
