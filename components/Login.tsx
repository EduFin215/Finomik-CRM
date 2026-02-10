import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { COLORS } from '../constants';

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
    <div className="min-h-screen flex items-center justify-center bg-brand-100/30 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-brand-200 p-8">
        <div className="flex flex-col items-center mb-8">
          <img src="/finomik-logo-white.png" alt="Finomik Ecosystem" className="w-40 h-auto object-contain mb-4" />
          <h1 className="text-xl font-extrabold text-primary">Finomik Ecosystem</h1>
          <p className="text-sm text-brand-500 font-body mt-1 text-center">
            {mode === 'login'
              ? 'Inicia sesión para acceder al CRM y a las demás herramientas de la plataforma.'
              : 'Crea tu cuenta para acceder al CRM y a las demás herramientas de la plataforma.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-bold text-brand-500 uppercase tracking-wider mb-1">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-brand-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-primary font-body"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-xs font-bold text-brand-500 uppercase tracking-wider mb-1">
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-brand-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-primary font-body"
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
            className="w-full py-3 rounded-xl font-bold text-white transition-all shadow-lg disabled:opacity-60"
            style={{ backgroundColor: COLORS.primary }}
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
