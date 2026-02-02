import { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface EmotionalChatButtonProps {
  variant?: 'full' | 'compact';
  onWritingModeChange?: (active: boolean) => void;
}

export function EmotionalChatButton({ variant = 'full', onWritingModeChange }: EmotionalChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    onWritingModeChange?.(false);
  };

  // Activate writing mode on textarea focus (keyboard opens)
  const handleInputFocus = () => {
    onWritingModeChange?.(true);
  };

  const handleInputBlur = () => {
    onWritingModeChange?.(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    const newUserMessage: ChatMessage = { role: 'user', content: userMessage };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('emotional-chat', {
        body: { messages: updatedMessages }
      });

      if (error) {
        console.error('Chat error:', error);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Error: ${error.message || 'No pude conectar. Intenta de nuevo.'}` 
        }]);
      } else if (data?.response) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.response 
        }]);
      } else {
        console.error('No response from API:', data);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'No recibí respuesta. ¿Puedes intentar de nuevo?' 
        }]);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Error de conexión. Intenta de nuevo.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating button - Emotional writing space */}
      <button
        onClick={handleOpen}
        className={cn(
          "fixed z-40 transition-all",
          variant === 'full' 
            ? "bottom-24 left-4 flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary/90 text-primary-foreground shadow-lg hover:bg-primary hover:scale-105"
            : "bottom-24 left-4 w-12 h-12 rounded-full bg-muted/80 text-muted-foreground shadow-md hover:bg-muted hover:text-foreground flex items-center justify-center"
        )}
        title="Escribe cómo te sientes"
      >
        <span className={cn("text-lg", variant === 'compact' && "text-xl")}>✍️</span>
        {variant === 'full' && (
          <span className="text-sm font-medium">Escribe cómo te sientes</span>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col h-full max-w-lg mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✍️</span>
                <div>
                  <h3 className="font-medium text-foreground text-sm">Escribe cómo te sientes</h3>
                  <p className="text-xs text-muted-foreground">Aquí puedes escribir libremente. No se crean tareas.</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl hover:bg-muted transition-colors"
              >
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8 space-y-4">
                  <div className="bg-muted/50 rounded-xl p-4 text-left">
                    <p className="text-sm text-foreground mb-2">
                      Este espacio es solo para hablar y escribir.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Nada de lo que pongas aquí se organiza en tareas.
                    </p>
                  </div>
                  <div className="bg-muted px-4 py-2.5 rounded-2xl rounded-bl-md inline-block text-left">
                    <p className="text-sm text-foreground">
                      Estoy aquí para leerte. Puedes escribir con calma.
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted px-4 py-2.5 rounded-2xl rounded-bl-md">
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border/50">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="Puedes escribir cómo te sientes, lo que te preocupa o lo que necesitas decir ahora."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none text-sm min-h-[44px] max-h-[120px]"
                  rows={1}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="px-4 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground/60 mt-2 text-center">
                Este chat no organiza tareas. Es solo para ti.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
