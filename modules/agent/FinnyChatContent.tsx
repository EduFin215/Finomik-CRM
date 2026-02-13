import React, { useState, useRef, useEffect } from 'react';
import { sendAgentMessage } from '../../services/agent';
import type { AgentMessage } from '../../services/agent';
import { Send } from 'lucide-react';

export function FinnyChatContent() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setError(null);
    const userMessage: AgentMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setLoading(true);
    try {
      const { message } = await sendAgentMessage(newMessages);
      setMessages((prev) => [...prev, { role: 'assistant', content: message.content }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar con Finny');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-brand-500 font-body text-sm py-8">
              Escribe un mensaje para empezar. Finny puede ayudarte con tareas, leads, deals, proyectos, resumen del dashboard o búsqueda de documentos en Recursos.
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm font-body ${
                  m.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-brand-100/50 text-primary border border-brand-200'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg px-3 py-2 bg-brand-100/50 text-brand-500 text-sm font-body">
                Pensando...
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-lg px-3 py-2 bg-red-50 text-red-700 text-sm font-body border border-red-200">
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form
          onSubmit={handleSubmit}
          className="shrink-0 border-t border-brand-200 p-3 flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="flex-1 min-w-0 rounded-lg border border-brand-200 px-3 py-2 text-sm font-body text-primary placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            disabled={loading}
            aria-label="Mensaje para Finny"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shrink-0 flex items-center justify-center gap-1 rounded-lg bg-primary text-white px-4 py-2 text-sm font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Enviar"
          >
            <Send size={18} />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>
      </div>
    </div>
  );
}
