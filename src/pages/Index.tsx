import { useState, useEffect, useCallback } from 'react';
import { HelpCircle } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { TimerIndicator } from '@/components/TimerIndicator';
import { HomePage } from '@/components/pages/HomePage';
import { FocusPage } from '@/components/pages/FocusPage';
import { TasksPage } from '@/components/pages/TasksPage';
import { RoutinesPage } from '@/components/pages/RoutinesPage';
import { JournalPage } from '@/components/pages/JournalPage';
import { ProgressPage } from '@/components/pages/ProgressPage';
import { HowToUsePage } from '@/components/pages/HowToUsePage';
import { useTimer } from '@/hooks/useTimer';
import { useAlarmSound } from '@/hooks/useAlarmSound';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TabType, Task, Routine, JournalEntry, FocusSession, UserProfile } from '@/types/focuson';
import { FocusOnLogo } from '@/components/FocusOnLogo';

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export default function Index() {
  const [activeTab, setActiveTab] = useLocalStorage<TabType>('focuson-tab', 'hoy');
  const [showHowTo, setShowHowTo] = useState(false);
  const [profile, setProfile] = useLocalStorage<UserProfile>('focuson-profile', { name: '' });
  const [tasks, setTasks] = useLocalStorage<Task[]>('focuson-tasks', []);
  const [routines, setRoutines] = useLocalStorage<Routine[]>('focuson-routines', []);
  const [journalEntries, setJournalEntries] = useLocalStorage<JournalEntry[]>('focuson-journal', []);
  const [sessions, setSessions] = useLocalStorage<FocusSession[]>('focuson-sessions', []);
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
        // Today has no sessions yet, check yesterday
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  }, [sessions]);

  // Task handlers
  const addTask = (text: string, isTopThree = false) => {
    const newTask: Task = {
      id: generateId(),
      text,
      completed: false,
      createdAt: new Date().toISOString(),
      isTopThree,
    };
    setTasks([...tasks, newTask]);
  };

  const toggleTask = (id: string) => {
    const now = new Date().toISOString();
    setTasks(tasks.map(t => {
      if (t.id !== id) return t;
      const nextCompleted = !t.completed;
      return {
        ...t,
        completed: nextCompleted,
        completedAt: nextCompleted ? now : undefined,
      };
    }));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const removeFromTopThree = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, isTopThree: false } : t));
  };

  // Routine handlers
  const addRoutine = (name: string, duration: number) => {
    const newRoutine: Routine = {
      id: generateId(),
      name,
      duration,
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
  }, [setSessions]);

  // Focus start from task
  const startFocusFromTask = (taskText: string) => {
    setActiveTab('enfoque');
  };

  const startFocusFromTopTask = (taskText: string, minutes: number) => {
    setActiveTab('enfoque');
    timer.startTimer(minutes, taskText);
  };

  const todayISO = new Date().toISOString().split('T')[0];

  const hasVictoryToday = (() => {
    const didSession = sessions.some((s) => s.date === todayISO && s.status === 'completed');
    const didTask = tasks.some((t) => t.completed && (t.completedAt || '').startsWith(todayISO));
    const didRoutine = routines.some((r) => r.steps.some((st) => st.completed && (st.completedAt || '').startsWith(todayISO)));
    return didSession || didTask || didRoutine;
  })();

  const calculateStartedStreak = useCallback(() => {
    const dayHasVictory = (dateStr: string) => {
      const didSession = sessions.some((s) => s.date === dateStr && s.status === 'completed');
      const didTask = tasks.some((t) => t.completed && (t.completedAt || '').startsWith(dateStr));
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
        // Si hoy todavía no, miramos ayer
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [sessions, tasks, routines]);

  const topThreeTasks = tasks.filter(t => t.isTopThree).slice(0, 3);
  const regularTasks = tasks.filter(t => !t.isTopThree);

  const renderPage = () => {
    switch (activeTab) {
      case 'hoy':
        return (
          <HomePage
            profile={profile}
            topThreeTasks={topThreeTasks}
            onGoToFocus={() => setActiveTab('enfoque')}
            onToggleTask={toggleTask}
            onAddTask={(text) => addTask(text, true)}
            onRemoveFromTopThree={removeFromTopThree}
            onRequestSchedule={() => setActiveTab('horario')}
            startedStreak={calculateStartedStreak()}
            hasVictoryToday={hasVictoryToday}
            onStartFocusFromTopTask={startFocusFromTopTask}
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
          />
        );
      case 'tareas':
        return (
          <TasksPage
            tasks={regularTasks}
            onAddTask={(text) => addTask(text, false)}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
            onStartFocus={startFocusFromTask}
          />
        );
      case 'rutinas':
        return (
          <RoutinesPage
            routines={routines}
            onAddRoutine={addRoutine}
            onDeleteRoutine={deleteRoutine}
            onAddStep={addRoutineStep}
            onToggleStep={toggleRoutineStep}
            onDeleteStep={deleteRoutineStep}
          />
        );
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
            streak={calculateStreak()}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with help button */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between px-6 py-3">
          {activeTab === 'hoy' ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <div className="pointer-events-none select-none">
                <FocusOnLogo size={40} />
              </div>
              <h1 className="text-sm font-display font-semibold tracking-[0.22em] text-foreground">
                FOCUSON
              </h1>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {activeTab === 'enfoque' ? (
                <div className="pointer-events-none select-none">
                  <FocusOnLogo size={26} />
                </div>
              ) : null}
              <h1 className="text-xl font-display font-semibold text-primary">
                FocusON
              </h1>
            </div>
          )}
          <button
            onClick={() => setShowHowTo(true)}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
            title="Cómo usar FocusON"
          >
            <HelpCircle size={22} className="text-muted-foreground" />
          </button>
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

      {/* Main content */}
      <main className="pt-20">
        {renderPage()}
      </main>

      {/* Bottom navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* How to use overlay */}
      {showHowTo && <HowToUsePage onClose={() => setShowHowTo(false)} />}
    </div>
  );
}
