import { StickyNote, X, Check, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FloatingNote {
  id: string;
  text: string;
  createdAt: string;
}

interface FloatingNotesButtonProps {
  notes: FloatingNote[];
  onAddNote: (text: string) => void;
  onDeleteNote: (id: string) => void;
  onWritingModeChange?: (active: boolean) => void;
}

export function FloatingNotesButton({ notes, onAddNote, onDeleteNote, onWritingModeChange }: FloatingNotesButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newNote, setNewNote] = useState('');

  // Notify parent when notes panel opens/closes (writing mode)
  const handleOpen = () => {
    setIsOpen(true);
    onWritingModeChange?.(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    onWritingModeChange?.(false);
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(newNote.trim());
      setNewNote('');
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        className={cn(
          "fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full shadow-lg",
          "bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/50 text-amber-700 dark:text-amber-400",
          "flex items-center justify-center transition-all duration-300",
          "hover:scale-110 hover:shadow-xl",
          isOpen && "scale-0 opacity-0"
        )}
        aria-label="Notas rápidas (no son tareas)"
      >
        <StickyNote size={22} />
        {notes.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {notes.length}
          </span>
        )}
      </button>

      {/* Notes panel overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="fixed bottom-0 left-0 right-0 max-h-[70vh] bg-card rounded-t-3xl shadow-2xl animate-slide-up overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <StickyNote size={20} className="text-amber-500" />
                <div>
                  <h3 className="font-display font-semibold text-foreground">Notas rápidas</h3>
                  <p className="text-xs text-muted-foreground">(no son tareas)</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl hover:bg-muted transition-colors"
              >
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            {/* Info text */}
            <div className="px-6 py-3 bg-amber-50/50 dark:bg-amber-900/10">
              <p className="text-xs text-muted-foreground">
                Anota lo que no quieres olvidar. Sin presión, sin horarios.
              </p>
            </div>

            {/* Notes list */}
            <div className="px-6 py-4 max-h-[35vh] overflow-y-auto">
              {notes.length > 0 ? (
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 group"
                    >
                      <span className="flex-1 text-sm text-foreground">{note.text}</span>
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-6">
                  Sin notas todavía.
                </p>
              )}
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-border/50 bg-card">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  placeholder="Escribe una nota rápida..."
                  className="focus-input flex-1 py-3"
                  autoFocus
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="p-3 rounded-xl bg-primary text-white disabled:opacity-50 transition-all"
                >
                  <Check size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
