import type { TablesInsert } from '@/integrations/supabase/types';
import type { Task } from '@/types/focuson';

const TASK_CACHE_PREFIX = 'focuson-tasks-cache';
const TASK_CACHE_UPDATED_AT_SUFFIX = ':updated-at';

export interface TaskCacheSnapshot {
  exists: boolean;
  tasks: Task[];
  updatedAt: string | null;
}

export function getTaskCacheKey(userId: string) {
  return `${TASK_CACHE_PREFIX}:${userId}`;
}

export function readTaskCache(cacheKey: string): TaskCacheSnapshot {
  try {
    const raw = window.localStorage.getItem(cacheKey);
    const updatedAt = window.localStorage.getItem(`${cacheKey}${TASK_CACHE_UPDATED_AT_SUFFIX}`);

    if (!raw) {
      return { exists: false, tasks: [], updatedAt };
    }

    const parsed = JSON.parse(raw);

    return {
      exists: true,
      tasks: Array.isArray(parsed) ? sortTasksByCreatedAt(parsed as Task[]) : [],
      updatedAt,
    };
  } catch (error) {
    console.error(`Error reading task cache "${cacheKey}":`, error);
    return { exists: false, tasks: [], updatedAt: null };
  }
}

export function writeTaskCache(cacheKey: string, tasks: Task[]) {
  try {
    window.localStorage.setItem(cacheKey, JSON.stringify(sortTasksByCreatedAt(tasks)));
    window.localStorage.setItem(`${cacheKey}${TASK_CACHE_UPDATED_AT_SUFFIX}`, new Date().toISOString());
  } catch (error) {
    console.error(`Error writing task cache "${cacheKey}":`, error);
  }
}

export function mergeTaskSources(cachedTasks: Task[], remoteTasks: Task[], preferCache = false) {
  const byId = new Map<string, Task>(remoteTasks.map((task) => [task.id, task]));

  for (const cachedTask of cachedTasks) {
    const remoteTask = byId.get(cachedTask.id);

    if (!remoteTask) {
      byId.set(cachedTask.id, cachedTask);
      continue;
    }

    byId.set(
      cachedTask.id,
      preferCache ? { ...remoteTask, ...cachedTask } : { ...cachedTask, ...remoteTask }
    );
  }

  return sortTasksByCreatedAt(Array.from(byId.values()));
}

export function getLatestTaskTimestamp(rows: Array<{ updated_at?: string | null; created_at?: string | null }> | null | undefined) {
  if (!rows?.length) return null;

  return rows.reduce<string | null>((latest, row) => {
    const candidate = row.updated_at ?? row.created_at ?? null;
    if (!candidate) return latest;
    if (!latest || candidate > latest) return candidate;
    return latest;
  }, null);
}

export function toTaskInsert(task: Task, userId: string): TablesInsert<'tasks'> {
  return {
    id: task.id,
    user_id: userId,
    text: task.text,
    status: task.status,
    source: task.source,
    completed_at: task.completedAt ?? null,
    created_at: task.createdAt,
    updated_at: new Date().toISOString(),
    is_top_three: task.isTopThree,
    is_exception_today: task.isExceptionToday ?? false,
    scheduled_date: task.scheduledDate ?? null,
    scheduled_time: task.scheduledTime ?? null,
    duration_minutes: task.durationMinutes ?? null,
    reminder_enabled: task.reminderEnabled ?? false,
    reminder_sent_at: task.reminderSentAt ?? null,
  };
}

function sortTasksByCreatedAt(tasks: Task[]) {
  return [...tasks].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}