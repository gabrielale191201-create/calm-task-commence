import { useState } from 'react';
import { Plus, Check, Trash2, StickyNote } from 'lucide-react';
import { QuickNote } from '@/types/focuson';
import { cn } from '@/lib/utils';

interface DailyAgenditaProps {
  notes: QuickNote[];
  date: string;
  onAddNote: (text: string, date: string) => void;
  onToggleNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
}

export function DailyAgendita({ notes, date, onAddNote, onToggleNote, onDeleteNote }: DailyAgenditaProps) {
  const [newNote, setNewNote] = useState('');

  const dayNotes = notes.filter(n => n.date === date);
  const pendingNotes = dayNotes.filter(n => !n.done);
  const doneNotes = dayNotes.filter(n => n.done);

  const handleAdd = () => {
    if (!newNote.trim()) return;
    onAddNote(newNote.trim(), date);
    setNewNote('');
  };

  return (
    <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 p-4">
      <div className="flex items-center gap-2 mb-2">
        <StickyNote size={18} className="text-amber-500" />
        <h4 className="text-base font-semibold text-foreground">Agendita del día</h4>
      </div>
      <p className="text-xs text-muted-foreground mb-3 italic">
        Esto no ocupa tiempo. Anota recordatorios rápidos sin bloque.
      </p>

      {/* Add note */}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Anotar algo rápido..."
          className="flex-1 px-3 py-2 text-sm rounded-lg bg-muted/50 border border-border/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          maxLength={100}
        />
        <button
          onClick={handleAdd}
          disabled={!newNote.trim()}
          className="p-2 rounded-lg bg-amber-500/20 text-amber-600 hover:bg-amber-500/30 disabled:opacity-40 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Pending notes */}
      {pendingNotes.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {pendingNotes.map((note) => (
            <div
              key={note.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group cursor-pointer"
              onClick={() => onToggleNote(note.id)}
            >
              {/* Circular check - empty */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleNote(note.id); }}
                className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 hover:border-green-400 flex-shrink-0 flex items-center justify-center transition-colors duration-300"
                aria-label="Marcar como completada"
              />
              <span className="flex-1 text-sm text-foreground transition-all duration-300 ease-in-out">
                {note.text}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Done notes */}
      {doneNotes.length > 0 && (
        <div className="space-y-1">
          {doneNotes.map((note) => (
            <div
              key={note.id}
              className="flex items-center gap-2 p-2 rounded-lg opacity-60 group cursor-pointer"
              onClick={() => onToggleNote(note.id)}
            >
              {/* Circular check - filled */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleNote(note.id); }}
                className="w-5 h-5 rounded-full bg-green-500 border-2 border-green-500 flex-shrink-0 flex items-center justify-center transition-colors duration-300"
                aria-label="Desmarcar"
              >
                <Check size={12} className="text-white" strokeWidth={3} />
              </button>
              <span className="flex-1 text-sm text-muted-foreground line-through italic transition-all duration-300 ease-in-out">
                {note.text}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {dayNotes.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Anota recordatorios sin bloque de tiempo.
        </p>
      )}
    </div>
  );
}
