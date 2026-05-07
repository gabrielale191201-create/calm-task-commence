import { useEffect } from 'react';
import { Task } from '@/types/focuson';

export function useTaskNotifications(tasks: Task[]) {
  useEffect(() => {
    if (Notification.permission !== 'granted') return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    tasks.forEach(task => {
      if (
        task.status !== 'pending' ||
        !task.scheduledDate ||
        !task.scheduledTime
      ) return;

      const now = new Date();
      const taskDateTime = new Date(`${task.scheduledDate}T${task.scheduledTime}`);
      const diff = taskDateTime.getTime() - now.getTime();

      // Solo programar si es en el futuro y dentro de las próximas 24 horas
      if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
        const timeout = setTimeout(() => {
          new Notification('⏰ Focus On — Es tu momento', {
            body: task.text,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: task.id,
          });
        }, diff);
        timeouts.push(timeout);
      }
    });

    return () => timeouts.forEach(clearTimeout);
  }, [tasks]);
}
