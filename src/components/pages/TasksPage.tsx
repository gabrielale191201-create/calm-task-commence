import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Task } from '@/types/focuson';
import { TaskItem } from '@/components/TaskItem';

interface TasksPageProps {
  tasks: Task[];
  onAddTask: (text: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onStartFocus: (task: string) => void;
}

export function TasksPage({ tasks, onAddTask, onToggleTask, onDeleteTask, onStartFocus }: TasksPageProps) {
  const [newTask, setNewTask] = useState('');

  const handleAddTask = () => {
    if (newTask.trim()) {
      onAddTask(newTask.trim());
      setNewTask('');
    }
  };

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="page-enter px-6 pt-8 pb-32">
      <h1 className="text-2xl font-display font-semibold text-foreground mb-2 animate-fade-in">
        Tareas
      </h1>
      
      <p className="text-muted-foreground mb-6 animate-fade-in">
        No escribas tareas grandes. Escribe solo el primer paso.
      </p>
      
      {/* Add task input */}
      <div className="flex items-center gap-2 mb-6 animate-slide-up">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
          placeholder="¿Cuál es el primer paso?"
          className="focus-input flex-1"
        />
        <button
          onClick={handleAddTask}
          disabled={!newTask.trim()}
          className="p-4 rounded-xl bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-focus"
        >
          <Plus size={20} />
        </button>
      </div>
      
      {/* Active tasks */}
      {activeTasks.length > 0 && (
        <div className="space-y-3 mb-8 animate-slide-up stagger-1">
          {activeTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggleTask}
              onDelete={onDeleteTask}
              onStartFocus={onStartFocus}
            />
          ))}
        </div>
      )}
      
      {/* Empty state */}
      {activeTasks.length === 0 && (
        <div className="text-center py-12 animate-fade-in">
          <p className="text-muted-foreground">
            No tienes tareas pendientes.<br />
            Añade algo pequeño para empezar.
          </p>
        </div>
      )}
      
      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <div className="mt-8 animate-slide-up stagger-2">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Completadas ({completedTasks.length})
          </h3>
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={onToggleTask}
                onDelete={onDeleteTask}
                showFocusButton={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
