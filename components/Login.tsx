import React, { useState } from 'react';
import { supabase } from '../services/supabase';

interface LoginProps {
  onSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setMessage(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Si el proyecto requiere confirmación por email, Supabase no inicia sesión directamente
        if (!data.session) {
          setMessage({
            type: 'success',
            text: 'Cuenta creada. Revisa tu email para confirmar el acceso.',
          });
        } else {
          onSuccess();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-100/20 via-white to-brand-200/10 p-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl border border-brand-200/60 p-8">
        <div className="flex flex-col items-center mb-8">
          <img src="/finomik-logo-white.png" alt="Finomik Ecosystem" className="w-40 h-auto object-contain mb-4" />
          <h1 className="text-2xl font-title text-primary">Finomik Ecosystem</h1>
          <p className="text-sm text-brand-500 font-body mt-2 text-center">
            {mode === 'login'
              ? 'Inicia sesión para acceder al CRM y a las demás herramientas de la plataforma.'
              : 'Crea tu cuenta para acceder al CRM y a las demás herramientas de la plataforma.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-bold text-brand-500 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3.5 rounded-xl border border-brand-200/80 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-primary font-body placeholder:text-brand-400"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-xs font-bold text-brand-500 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3.5 rounded-xl border border-brand-200/80 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-primary font-body placeholder:text-brand-400"
              placeholder="••••••••"
            />
          </div>

          {message && (
            <div
              className={`px-4 py-3 rounded-xl text-sm font-body ${
                message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-primary hover:bg-brand-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-60 disabled:hover:shadow-lg"
          >
            {loading ? 'Espera...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-brand-500 font-body">
          {mode === 'login' ? (
            <>
              ¿No tienes cuenta?{' '}
              <button
                type="button"
                className="font-bold text-brand-700 hover:text-primary underline-offset-2 hover:underline"
                onClick={() => {
                  setMessage(null);
                  setMode('signup');
                }}
              >
                Crear una cuenta
              </button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                className="font-bold text-brand-700 hover:text-primary underline-offset-2 hover:underline"
                onClick={() => {
                  setMessage(null);
                  setMode('login');
                }}
              >
                Inicia sesión
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default Login;
