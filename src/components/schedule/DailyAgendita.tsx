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
    <div className="rounded-2xl border border-border/50 bg-card/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <StickyNote size={16} className="text-amber-500" />
        <h4 className="text-sm font-medium text-foreground">Agendita</h4>
        <span className="text-xs text-muted-foreground ml-auto">
          No consume bloques
        </span>
      </div>

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

      {/* Notes list */}
      {pendingNotes.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {pendingNotes.map((note) => (
            <div
              key={note.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
            >
              <button
                onClick={() => onToggleNote(note.id)}
                className="w-4 h-4 rounded border border-amber-500/50 flex items-center justify-center hover:bg-amber-500/20 transition-colors"
              >
                {note.done && <Check size={10} className="text-amber-600" />}
              </button>
              <span className="flex-1 text-sm text-foreground">{note.text}</span>
              <button
                onClick={() => onDeleteNote(note.id)}
                className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {doneNotes.length > 0 && (
        <div className="space-y-1">
          {doneNotes.map((note) => (
            <div
              key={note.id}
              className="flex items-center gap-2 p-2 rounded-lg opacity-60 group"
            >
              <button
                onClick={() => onToggleNote(note.id)}
                className="w-4 h-4 rounded border border-amber-500 bg-amber-500/30 flex items-center justify-center"
              >
                <Check size={10} className="text-amber-600" />
              </button>
              <span className="flex-1 text-sm text-muted-foreground line-through">{note.text}</span>
              <button
                onClick={() => onDeleteNote(note.id)}
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
