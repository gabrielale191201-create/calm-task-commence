/**
 * Hook maestro Database-First: sincroniza todas las entidades con Supabase.
 * Invitados siguen usando localStorage como fallback.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { useGuestMode } from '@/hooks/useGuestMode';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { getLatestTaskTimestamp, getTaskCacheKey, mergeTaskSources, readTaskCache, toTaskInsert, writeTaskCache } from '@/lib/taskCache';
import { trackUserEvent } from '@/lib/trackEvent';
import { Task, QuickNote, JournalEntry, FocusSession } from '@/types/focuson';
import { UnlockSession } from '@/types/unlockSession';

interface FloatingNote {
  id: string;
  text: string;
  done?: boolean;
  createdAt: string;
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function useSupabaseData() {
  const { isAuthenticated, currentUserId, isLoading: authLoading } = useAuthState();
  const { isGuest } = useGuestMode();
  const useDB = isAuthenticated && !isGuest;
  const userIdRef = useRef<string | null>(null);
  const taskCacheKeyRef = useRef<string | null>(null);

  // --- localStorage fallbacks for guests ---
  const [guestTasks, setGuestTasks] = useLocalStorage<Task[]>('focuson-tasks', []);
  const [guestQuickNotes, setGuestQuickNotes] = useLocalStorage<QuickNote[]>('focuson-quicknotes', []);
  const [guestJournal, setGuestJournal] = useLocalStorage<JournalEntry[]>('focuson-journal', []);
  const [guestSessions, setGuestSessions] = useLocalStorage<FocusSession[]>('focuson-sessions', []);
  const [guestFloating, setGuestFloating] = useLocalStorage<FloatingNote[]>('focuson-floatingnotes', []);
  const [guestUnlock, setGuestUnlock] = useLocalStorage<UnlockSession[]>('focuson-unlock-sessions', []);

  // --- Supabase state for authenticated users ---
  const [dbTasks, setDbTasks] = useState<Task[]>([]);
  const [dbQuickNotes, setDbQuickNotes] = useState<QuickNote[]>([]);
  const [dbJournal, setDbJournal] = useState<JournalEntry[]>([]);
  const [dbSessions, setDbSessions] = useState<FocusSession[]>([]);
  const [dbFloating, setDbFloating] = useState<FloatingNote[]>([]);
  const [dbUnlock, setDbUnlock] = useState<UnlockSession[]>([]);
  const [loading, setLoading] = useState(true);

  const setDbTasksAndCache = useCallback((value: Task[] | ((prev: Task[]) => Task[])) => {
    setDbTasks(prev => {
      const nextTasks = value instanceof Function ? value(prev) : value;
      const cacheKey = taskCacheKeyRef.current;
      if (cacheKey) writeTaskCache(cacheKey, nextTasks);
      return nextTasks;
    });
  }, []);

  const syncTaskCacheToDatabase = useCallback(async (userId: string, cachedTasks: Task[], remoteTasks: Task[]) => {
    const cachedRows = cachedTasks.map(task => toTaskInsert(task, userId));

    if (cachedRows.length > 0) {
      const { error } = await supabase.from('tasks').upsert(cachedRows, { onConflict: 'id' });
      if (error) console.error('Error syncing task cache to database:', error.message);
    }

    const cachedIds = new Set(cachedTasks.map(task => task.id));
    const staleRemoteIds = remoteTasks.filter(task => !cachedIds.has(task.id)).map(task => task.id);

    if (staleRemoteIds.length > 0) {
      const { error } = await supabase.from('tasks').delete().eq('user_id', userId).in('id', staleRemoteIds);
      if (error) console.error('Error removing stale remote tasks:', error.message);
    }
  }, []);

  // Get user id
  useEffect(() => {
    let isActive = true;

    if (authLoading) {
      setLoading(true);
      return () => { isActive = false; };
    }

    if (!useDB) {
      userIdRef.current = null;
      taskCacheKeyRef.current = null;
      setDbTasks([]);
      setLoading(false);
      return () => { isActive = false; };
    }

    if (!currentUserId) {
      setLoading(true);
      return () => { isActive = false; };
    }

    setLoading(true);

    const cacheKey = getTaskCacheKey(currentUserId);
    const taskCache = readTaskCache(cacheKey);

    userIdRef.current = currentUserId;
    taskCacheKeyRef.current = cacheKey;
    setDbTasks(taskCache.tasks);

    loadAllData(currentUserId, taskCache)
      .catch((error) => {
        console.error('Error loading app data:', error);
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => { isActive = false; };
  }, [authLoading, currentUserId, useDB]);

  const loadAllData = async (userId: string, initialTaskCache = readTaskCache(getTaskCacheKey(userId))) => {
    const [tasksRes, qnRes, journalRes, sessionsRes, floatingRes, dumpsRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('quick_notes').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.from('journal_entries').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('focus_sessions').select('*').eq('user_id', userId).order('completed_at', { ascending: false }),
      supabase.from('floating_notes').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.from('mental_dumps').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);

    if (tasksRes.data) {
      const remoteTasks = tasksRes.data.map(mapDbTask);
      const latestRemoteTimestamp = getLatestTaskTimestamp(tasksRes.data);
      const liveTaskCache = readTaskCache(taskCacheKeyRef.current ?? getTaskCacheKey(userId));
      const taskCache = liveTaskCache.exists ? liveTaskCache : initialTaskCache;
      const cacheIsAuthoritative = taskCache.exists && (!!taskCache.updatedAt ? (!latestRemoteTimestamp || taskCache.updatedAt >= latestRemoteTimestamp) : remoteTasks.length === 0);
      const mergedTasks = mergeTaskSources(taskCache.tasks, remoteTasks, cacheIsAuthoritative);

      setDbTasksAndCache(mergedTasks);

      if (cacheIsAuthoritative) {
        syncTaskCacheToDatabase(userId, mergedTasks, remoteTasks).then();
      }
    }
    if (qnRes.data) setDbQuickNotes(qnRes.data.map((r: any) => ({ id: r.id, text: r.text, date: r.date, done: r.done, createdAt: r.created_at })));
    if (journalRes.data) setDbJournal(journalRes.data.map((r: any) => ({ id: r.id, date: r.date, content: r.content, createdAt: r.created_at })));
    if (sessionsRes.data) setDbSessions(sessionsRes.data.map((r: any) => ({
      id: r.id, task: r.task, plannedDuration: r.planned_duration, focusedDuration: r.focused_duration,
      status: r.status, completedAt: r.completed_at, date: r.date, linkedActivityId: r.linked_activity_id,
    })));
    if (floatingRes.data) setDbFloating(floatingRes.data.map((r: any) => ({ id: r.id, text: r.text, done: r.done, createdAt: r.created_at })));
    if (dumpsRes.data) setDbUnlock(dumpsRes.data.map(mapDbDump));
  };

  // --- Mappers ---
  function mapDbTask(r: any): Task {
    return {
      id: r.id, text: r.text, status: r.status, source: r.source,
      completedAt: r.completed_at, createdAt: r.created_at, isTopThree: r.is_top_three,
      isExceptionToday: r.is_exception_today, scheduledDate: r.scheduled_date,
      scheduledTime: r.scheduled_time, durationMinutes: r.duration_minutes,
      reminderEnabled: r.reminder_enabled, reminderSentAt: r.reminder_sent_at,
    };
  }

  function mapDbDump(r: any): UnlockSession {
    return {
      id: r.id, inputText: r.input_text, visionInterior: r.vision_interior || '',
      actividades: r.actividades || [], consejoDisciplina: r.consejo_disciplina || '',
      startedFocusTime: r.started_focus_time, completed: r.completed, createdAt: r.created_at,
    };
  }

  // ============ EXPOSED DATA (DB or guest) ============
  const tasks = useDB ? dbTasks : guestTasks;
  const quickNotes = useDB ? dbQuickNotes : guestQuickNotes;
  const journalEntries = useDB ? dbJournal : guestJournal;
  const sessions = useDB ? dbSessions : guestSessions;
  const floatingNotes = useDB ? dbFloating : guestFloating;
  const unlockSessions = useDB ? dbUnlock : guestUnlock;

  // ============ TASK OPERATIONS ============
  const addTask = useCallback((
    input: string | { text: string; scheduledDate?: string; scheduledTime?: string; durationMinutes?: number; source?: Task['source'] },
    isTopThree = false
  ) => {
    const text = typeof input === 'string' ? input : input.text;
    const opts = typeof input === 'string' ? {} as Partial<{ scheduledDate?: string; scheduledTime?: string; durationMinutes?: number; source?: Task['source'] }> : input;
    const newTask: Task = {
      id: generateId(), text, status: 'pending', source: opts.source || 'manual',
      createdAt: new Date().toISOString(), isTopThree: typeof input === 'string' ? true : isTopThree,
      scheduledDate: opts.scheduledDate, scheduledTime: opts.scheduledTime, durationMinutes: opts.durationMinutes,
    };

    if (useDB) {
      setDbTasksAndCache(prev => [newTask, ...prev]);
      const uid = userIdRef.current;
      if (uid) {
        supabase.from('tasks').insert({
          id: newTask.id, user_id: uid, text: newTask.text, status: newTask.status, source: newTask.source,
          is_top_three: newTask.isTopThree, scheduled_date: newTask.scheduledDate || null,
          scheduled_time: newTask.scheduledTime || null, duration_minutes: newTask.durationMinutes || null,
        } as any).then();
      }
    } else {
      setGuestTasks(prev => [...prev, newTask]);
    }
    trackUserEvent('task_created', { text, source: opts.source || 'manual', is_top_three: newTask.isTopThree });
    return newTask;
  }, [useDB]);

  const setTaskStatus = useCallback((id: string, newStatus: Task['status']) => {
    const now = new Date().toISOString();
    const updater = (prev: Task[]) => prev.map(t => t.id !== id ? t : {
      ...t, status: newStatus, completedAt: newStatus === 'completed' ? now : undefined,
    });

    if (useDB) {
      setDbTasksAndCache(updater);
      supabase.from('tasks').update({
        status: newStatus, completed_at: newStatus === 'completed' ? now : null,
      } as any).eq('id', id).then();
    } else {
      setGuestTasks(updater);
    }
    trackUserEvent('task_status_changed', { task_id: id, new_status: newStatus });
  }, [useDB]);

  const deleteTask = useCallback((id: string) => {
    if (useDB) {
      setDbTasksAndCache(prev => prev.filter(t => t.id !== id));
      supabase.from('tasks').delete().eq('id', id).then();
    } else {
      setGuestTasks(prev => prev.filter(t => t.id !== id));
    }
    trackUserEvent('task_deleted', { task_id: id });
  }, [useDB]);

  const updateTask = useCallback((id: string, updates: Partial<Pick<Task, 'scheduledDate' | 'scheduledTime' | 'durationMinutes'>>) => {
    const updater = (prev: Task[]) => prev.map(t => t.id !== id ? t : { ...t, ...updates });
    if (useDB) {
      setDbTasksAndCache(updater);
      supabase.from('tasks').update({
        scheduled_date: updates.scheduledDate ?? undefined,
        scheduled_time: updates.scheduledTime ?? undefined,
        duration_minutes: updates.durationMinutes ?? undefined,
      } as any).eq('id', id).then();
    } else {
      setGuestTasks(updater);
    }
  }, [useDB]);

  const updateTaskFull = useCallback((id: string, updates: Partial<Task>) => {
    const updater = (prev: Task[]) => prev.map(t => t.id !== id ? t : { ...t, ...updates });
    if (useDB) {
      setDbTasksAndCache(updater);
      const dbUpdates: any = {};
      if (updates.isTopThree !== undefined) dbUpdates.is_top_three = updates.isTopThree;
      if (updates.isExceptionToday !== undefined) dbUpdates.is_exception_today = updates.isExceptionToday;
      if (updates.scheduledDate !== undefined) dbUpdates.scheduled_date = updates.scheduledDate || null;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt || null;
      supabase.from('tasks').update(dbUpdates).eq('id', id).then();
    } else {
      setGuestTasks(updater);
    }
  }, [useDB]);

  const addMultipleTasks = useCallback((taskTexts: string[], priorityIndices?: number[]) => {
    const prioritySet = new Set(priorityIndices || []);
    const todayDate = new Date().toISOString().split('T')[0];
    const newTasks = taskTexts.map((text, index) => {
      const isPriority = prioritySet.has(index);
      return {
        id: generateId(), text, status: 'pending' as const, source: 'manual' as const,
        createdAt: new Date().toISOString(), isTopThree: isPriority, isExceptionToday: false,
        dateAutoAssigned: isPriority ? true : undefined,
        scheduledDate: isPriority ? todayDate : undefined,
      } as Task;
    });

    if (useDB) {
      setDbTasksAndCache(prev => [...newTasks, ...prev]);
      const uid = userIdRef.current;
      if (uid) {
        supabase.from('tasks').insert(newTasks.map(t => ({
          id: t.id, user_id: uid, text: t.text, status: t.status, source: t.source,
          is_top_three: t.isTopThree, scheduled_date: t.scheduledDate || null,
        } as any))).then();
      }
    } else {
      setGuestTasks(prev => [...prev, ...newTasks]);
    }
  }, [useDB]);

  // ============ QUICK NOTES ============
  const addQuickNote = useCallback((text: string, date: string) => {
    const note: QuickNote = { id: generateId(), text, date, done: false, createdAt: new Date().toISOString() };
    if (useDB) {
      setDbQuickNotes(prev => [...prev, note]);
      const uid = userIdRef.current;
      if (uid) supabase.from('quick_notes').insert({ id: note.id, user_id: uid, text, date } as any).then();
    } else {
      setGuestQuickNotes(prev => [...prev, note]);
    }
  }, [useDB]);

  const toggleQuickNote = useCallback((id: string) => {
    const updater = (prev: QuickNote[]) => prev.map(n => n.id === id ? { ...n, done: !n.done } : n);
    if (useDB) {
      const current = dbQuickNotes.find(n => n.id === id);
      setDbQuickNotes(updater);
      supabase.from('quick_notes').update({ done: !current?.done } as any).eq('id', id).then();
    } else {
      setGuestQuickNotes(updater);
    }
  }, [useDB, dbQuickNotes]);

  const deleteQuickNote = useCallback((id: string) => {
    if (useDB) {
      setDbQuickNotes(prev => prev.filter(n => n.id !== id));
      supabase.from('quick_notes').delete().eq('id', id).then();
    } else {
      setGuestQuickNotes(prev => prev.filter(n => n.id !== id));
    }
  }, [useDB]);

  // ============ JOURNAL ============
  const saveJournalEntry = useCallback((content: string, date: string) => {
    const updater = (prev: JournalEntry[]) => {
      const idx = prev.findIndex(e => e.date === date);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], content };
        return updated;
      }
      return [...prev, { id: generateId(), date, content, createdAt: new Date().toISOString() }];
    };

    if (useDB) {
      setDbJournal(updater);
      const uid = userIdRef.current;
      if (uid) {
        supabase.from('journal_entries').upsert({
          user_id: uid, date, content, updated_at: new Date().toISOString(),
        } as any, { onConflict: 'user_id,date' }).then();
      }
    } else {
      setGuestJournal(updater);
    }
    trackUserEvent('journal_saved', { date, word_count: content.trim().split(/\s+/).length });
  }, [useDB]);

  // ============ FOCUS SESSIONS ============
  const saveSession = useCallback((task: string, duration: number) => {
    const s: FocusSession = {
      id: generateId(), task, plannedDuration: duration, focusedDuration: duration,
      status: 'completed', completedAt: new Date().toISOString(), date: new Date().toISOString().split('T')[0],
    };
    if (useDB) {
      setDbSessions(prev => [s, ...prev]);
      const uid = userIdRef.current;
      if (uid) {
        supabase.from('focus_sessions').insert({
          id: s.id, user_id: uid, task, planned_duration: duration, focused_duration: duration,
          status: 'completed', date: s.date,
        } as any).then();
      }
    } else {
      setGuestSessions(prev => [...prev, s]);
    }
    trackUserEvent('focus_completed', { task, duration_seconds: duration, minutes: Math.round(duration / 60) });
  }, [useDB]);

  // ============ FLOATING NOTES ============
  const addFloatingNote = useCallback((text: string) => {
    const note: FloatingNote = { id: generateId(), text, createdAt: new Date().toISOString() };
    if (useDB) {
      setDbFloating(prev => [...prev, note]);
      const uid = userIdRef.current;
      if (uid) supabase.from('floating_notes').insert({ id: note.id, user_id: uid, text } as any).then();
    } else {
      setGuestFloating(prev => [...prev, note]);
    }
    trackUserEvent('note_created', { text });
  }, [useDB]);

  const deleteFloatingNote = useCallback((id: string) => {
    if (useDB) {
      setDbFloating(prev => prev.filter(n => n.id !== id));
      supabase.from('floating_notes').delete().eq('id', id).then();
    } else {
      setGuestFloating(prev => prev.filter(n => n.id !== id));
    }
    trackUserEvent('note_deleted', { note_id: id });
  }, [useDB]);

  const toggleFloatingNote = useCallback((id: string) => {
    const current = (useDB ? dbFloating : guestFloating).find(n => n.id === id);
    const updater = (prev: FloatingNote[]) => prev.map(n => n.id === id ? { ...n, done: !n.done } : n);
    if (useDB) {
      setDbFloating(updater);
      supabase.from('floating_notes').update({ done: !current?.done } as any).eq('id', id).then();
    } else {
      setGuestFloating(updater);
    }
    trackUserEvent('note_toggled', { note_id: id, done: !current?.done });
  }, [useDB, dbFloating, guestFloating]);

  const addFloatingNotesFromAI = useCallback((noteTexts: string[]) => {
    const newNotes = noteTexts.map(text => ({ id: generateId(), text, createdAt: new Date().toISOString() }));
    if (useDB) {
      setDbFloating(prev => [...prev, ...newNotes]);
      const uid = userIdRef.current;
      if (uid) {
        supabase.from('floating_notes').insert(newNotes.map(n => ({ id: n.id, user_id: uid, text: n.text } as any))).then();
      }
    } else {
      setGuestFloating(prev => [...prev, ...newNotes]);
    }
  }, [useDB]);

  // ============ UNLOCK SESSIONS ============
  const saveUnlockSession = useCallback((session: UnlockSession) => {
    if (useDB) {
      setDbUnlock(prev => [session, ...prev]);
      const uid = userIdRef.current;
      if (uid) {
        supabase.from('mental_dumps').insert({
          id: session.id, user_id: uid, input_text: session.inputText,
          vision_interior: session.visionInterior, actividades: session.actividades as any,
          consejo_disciplina: session.consejoDisciplina,
          started_focus_time: session.startedFocusTime, completed: session.completed,
        } as any).then();
      }
      trackUserEvent('unlock_session_created', { input_length: session.inputText.length });
    } else {
      setGuestUnlock(prev => [...prev, session]);
    }
  }, [useDB]);

  const updateUnlockSession = useCallback((id: string, updates: Partial<UnlockSession>) => {
    const updater = (prev: UnlockSession[]) => prev.map(s => s.id === id ? { ...s, ...updates } : s);
    if (useDB) {
      setDbUnlock(updater);
      const dbUpdates: any = {};
      if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
      if (updates.startedFocusTime !== undefined) dbUpdates.started_focus_time = updates.startedFocusTime;
      if (updates.actividades !== undefined) dbUpdates.actividades = updates.actividades;
      supabase.from('mental_dumps').update(dbUpdates).eq('id', id).then();
    } else {
      setGuestUnlock(updater);
    }
    if (updates.actividades) {
      const converted = (updates.actividades as any[]).filter(a => a.convertedToTask);
      if (converted.length > 0) {
        trackUserEvent('conversion_desbloqueo_a_tarea', { origen: 'desbloqueo_mental', count: converted.length });
      }
    }
  }, [useDB]);

  return {
    loading,
    // Data
    tasks, quickNotes, journalEntries, sessions, floatingNotes, unlockSessions,
    // Task ops
    addTask, setTaskStatus, deleteTask, updateTask, updateTaskFull, addMultipleTasks,
    // Quick notes
    addQuickNote, toggleQuickNote, deleteQuickNote,
    // Journal
    saveJournalEntry,
    // Focus sessions
    saveSession,
    // Floating notes
    addFloatingNote, deleteFloatingNote, toggleFloatingNote, addFloatingNotesFromAI,
    // Unlock sessions
    saveUnlockSession, updateUnlockSession,
    // Raw setters for legacy compatibility
    setTasks: useDB ? setDbTasksAndCache : setGuestTasks,
  };
}
