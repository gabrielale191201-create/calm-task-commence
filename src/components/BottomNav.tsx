import { Home, Target, CalendarClock, CheckSquare, RotateCcw, BookOpen, BarChart3 } from 'lucide-react';
import { TabType } from '@/types/focuson';
import { cn } from '@/lib/utils';
import { FocusOnLogo } from '@/components/FocusOnLogo';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const navItems: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'hoy', label: 'Hoy', icon: Home },
  { id: 'enfoque', label: 'Enfoque', icon: Target },
  { id: 'horario', label: 'Horario', icon: CalendarClock },
  { id: 'tareas', label: 'Tareas', icon: CheckSquare },
  { id: 'rutinas', label: 'Rutinas', icon: RotateCcw },
  { id: 'diario', label: 'Diario', icon: BookOpen },
  { id: 'progreso', label: 'Progreso', icon: BarChart3 },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav z-50 relative">
      {/* Visual-only mark (not a tab / not clickable) */}
      <div className="pointer-events-none select-none absolute left-1/2 top-1.5 -translate-x-1/2 opacity-25">
        <FocusOnLogo size={18} />
      </div>

      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              'nav-item flex-1 max-w-[70px]',
              activeTab === id && 'active'
            )}
          >
            <Icon 
              size={22} 
              className={cn(
                'transition-colors duration-300',
                activeTab === id ? 'text-primary' : 'text-muted-foreground'
              )} 
            />
            <span 
              className={cn(
                'text-[10px] mt-1 font-medium transition-colors duration-300',
                activeTab === id ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
