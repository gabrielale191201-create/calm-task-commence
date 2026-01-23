import { useState } from 'react';
import { Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { JournalEntry } from '@/types/focuson';

interface JournalPageProps {
  entries: JournalEntry[];
  onSaveEntry: (content: string, date: string) => void;
}

export function JournalPage({ entries, onSaveEntry }: JournalPageProps) {
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState(() => {
    const todayEntry = entries.find(e => e.date === currentDate);
    return todayEntry?.content || '';
  });
  const [saved, setSaved] = useState(false);

  const handleDateChange = (direction: 'prev' | 'next') => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
    
    // Don't go to future dates
    if (date > new Date()) return;
    
    const newDateStr = date.toISOString().split('T')[0];
    setCurrentDate(newDateStr);
    
    const entry = entries.find(e => e.date === newDateStr);
    setContent(entry?.content || '');
    setSaved(false);
  };

  const handleSave = () => {
    if (content.trim()) {
      onSaveEntry(content.trim(), currentDate);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date().toISOString().split('T')[0];
    
    if (dateStr === today) return 'Hoy';
    
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const isToday = currentDate === new Date().toISOString().split('T')[0];

  return (
    <div className="page-enter px-6 pt-8 pb-32">
      <h1 className="text-2xl font-display font-semibold text-foreground mb-2 animate-fade-in">
        Diario
      </h1>
      <p className="text-muted-foreground mb-6 animate-fade-in">
        Desbloqueo mental. Nada más.
      </p>

      {/* Date navigation */}
      <div className="flex items-center justify-between mb-6 animate-slide-up">
        <button
          onClick={() => handleDateChange('prev')}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft size={20} className="text-muted-foreground" />
        </button>
        
        <span className="font-medium text-foreground capitalize">
          {formatDate(currentDate)}
        </span>
        
        <button
          onClick={() => handleDateChange('next')}
          disabled={isToday}
          className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
        >
          <ChevronRight size={20} className="text-muted-foreground" />
        </button>
      </div>

      {/* Question prompt */}
      <div className="bg-accent/50 rounded-xl p-4 mb-6 animate-slide-up stagger-1">
        <p className="text-sm text-accent-foreground font-medium">
          💭 ¿Qué fue lo más difícil de empezar hoy?
        </p>
      </div>

      {/* Journal textarea */}
      <div className="relative animate-slide-up stagger-2">
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setSaved(false);
          }}
          placeholder="Escribe lo que quieras... Esto es solo para ti."
          className="w-full min-h-[300px] p-5 rounded-2xl bg-card border border-border/50 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/30 focus:shadow-sm transition-all"
        />
        
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">
            {content.length} caracteres
          </span>
          
          <button
            onClick={handleSave}
            disabled={!content.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-focus"
          >
            <Save size={18} />
            {saved ? '¡Guardado!' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Previous entries hint */}
      {entries.length > 0 && (
        <p className="text-center text-xs text-muted-foreground mt-8 animate-fade-in">
          Usa las flechas para ver entradas anteriores
        </p>
      )}
    </div>
  );
}
