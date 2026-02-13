import React, { useState, useRef, useEffect } from 'react';
import { sendAgentMessage } from '../../services/agent';
import type { AgentMessage } from '../../services/agent';
import { Send, Sparkles, User, ArrowUp } from 'lucide-react';

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
  }, [messages, loading]);

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
    <div className="flex flex-col h-full bg-transparent">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-thin scrollbar-thumb-brand-200/50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 opacity-60">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-accent mb-4 flex items-center justify-center shadow-lg animate-pulse-slow">
              <Sparkles size={32} className="text-white" />
            </div>
            <p className="text-primary font-bold text-lg mb-2">¿En qué puedo ayudarte hoy?</p>
            <p className="text-sm text-brand-500 max-w-[260px]">
              Puedo gestionar tus leads, crear tareas, revisar tus finanzas o buscar documentos.
            </p>
          </div>
        )}

        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={i}
              className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm
                    ${isUser ? 'bg-primary text-white' : 'bg-white border border-brand-100 text-accent'}
                `}>
                  {isUser ? <User size={14} /> : <Sparkles size={14} />}
                </div>

                {/* Bubble */}
                <div
                  className={`
                    px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm
                    ${isUser
                      ? 'bg-primary text-white rounded-tr-sm'
                      : 'bg-white/80 border border-brand-100/60 text-brand-700 rounded-tl-sm backdrop-blur-sm'
                    }
                  `}
                >
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex w-full justify-start">
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-white border border-brand-100 text-accent flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles size={14} className="animate-spin-slow" />
              </div>
              <div className="bg-white/80 border border-brand-100/60 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm backdrop-blur-sm flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-brand-400 font-medium ml-1">Pensando...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex justify-center">
            <div className="rounded-xl px-4 py-2 bg-red-50 text-red-600 text-xs font-bold border border-red-100 shadow-sm">
              ⚠️ {error}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 p-4 pt-2">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center bg-white rounded-3xl border border-brand-200 shadow-lg shadow-brand-100/50 focus-within:shadow-xl focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all p-1"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregúntame lo que sea..."
            className="flex-1 bg-transparent border-none px-4 py-3 text-sm font-medium text-primary placeholder:text-brand-400 focus:outline-none focus:ring-0"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={`
                w-9 h-9 flex items-center justify-center rounded-full mr-1 transition-all
                ${!input.trim() || loading
                ? 'bg-brand-100 text-brand-300 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-md'
              }
            `}
          >
            <ArrowUp size={18} />
          </button>
        </form>
        <p className="text-center text-[10px] text-brand-300 mt-2 font-medium">Finny puede cometer errores. Verifica la información importante.</p>
      </div>
    </div>
  );
}
