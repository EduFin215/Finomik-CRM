import React from 'react';
import { Link } from 'react-router-dom';
import {
  LogOut,
  LayoutDashboard,
  CheckSquare,
  FolderOpen,
  Wallet,
  BarChart2,
  Plug,
  Settings,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { TOOLS_IN_SELECTOR } from '../config/tools';

const iconMap: Record<string, typeof LayoutDashboard> = {
  crm: LayoutDashboard,
  tasks: CheckSquare,
  resources: FolderOpen,
  finance: Wallet,
  reporting: BarChart2,
  integrations: Plug,
  settings: Settings,
};

const blueTonalities: Record<string, { background: string; boxShadow: string }> = {
  crm: {
    background: `
      linear-gradient(145deg, rgba(255,255,255,0.18) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.12) 100%),
      linear-gradient(160deg, #2e5a8a 0%, #1a4a7a 25%, #0B3064 50%, #092a52 75%, #1e5082 100%)
    `,
    boxShadow: '0 25px 50px -12px rgba(11, 48, 100, 0.4), 0 0 0 1px rgba(255,255,255,0.08) inset',
  },
  tasks: {
    background: `
      linear-gradient(145deg, rgba(255,255,255,0.18) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.12) 100%),
      linear-gradient(160deg, #3d6b9e 0%, #2a5a8a 25%, #1a4a7a 50%, #0d3d6a 75%, #255a90 100%)
    `,
    boxShadow: '0 25px 50px -12px rgba(45, 90, 130, 0.4), 0 0 0 1px rgba(255,255,255,0.08) inset',
  },
  resources: {
    background: `
      linear-gradient(145deg, rgba(255,255,255,0.18) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.12) 100%),
      linear-gradient(160deg, #4a7ab0 0%, #3569a0 25%, #245890 50%, #184780 75%, #2e6aa8 100%)
    `,
    boxShadow: '0 25px 50px -12px rgba(52, 105, 160, 0.4), 0 0 0 1px rgba(255,255,255,0.08) inset',
  },
  finance: {
    background: `
      linear-gradient(145deg, rgba(255,255,255,0.18) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.12) 100%),
      linear-gradient(160deg, #1e4d7a 0%, #153d65 25%, #0c2d50 50%, #062240 75%, #1a4570 100%)
    `,
    boxShadow: '0 25px 50px -12px rgba(20, 70, 110, 0.45), 0 0 0 1px rgba(255,255,255,0.08) inset',
  },
  reporting: {
    background: `
      linear-gradient(145deg, rgba(255,255,255,0.18) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.12) 100%),
      linear-gradient(160deg, #5a8ec4 0%, #457ab8 25%, #3066ac 50%, #1e52a0 75%, #3a72b8 100%)
    `,
    boxShadow: '0 25px 50px -12px rgba(70, 130, 190, 0.4), 0 0 0 1px rgba(255,255,255,0.08) inset',
  },
  settings: {
    background: `
      linear-gradient(145deg, rgba(255,255,255,0.18) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.12) 100%),
      linear-gradient(160deg, #2d4668 0%, #223a58 25%, #172e48 50%, #0e2438 75%, #1f3a58 100%)
    `,
    boxShadow: '0 25px 50px -12px rgba(35, 65, 95, 0.45), 0 0 0 1px rgba(255,255,255,0.08) inset',
  },
};

const metallicBlueComing = {
  background: `
    linear-gradient(145deg, rgba(255,255,255,0.12) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.08) 100%),
    linear-gradient(160deg, #3E5374 0%, #2d4360 30%, #1e3550 60%, #2d4360 100%)
  `,
  boxShadow: '0 20px 40px -12px rgba(30, 53, 80, 0.35), 0 0 0 1px rgba(255,255,255,0.06) inset',
};

const PlatformHub: React.FC = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-brand-100/10 via-white to-brand-100/20">
      <header className="h-16 flex items-center justify-between px-4 sm:px-6 shrink-0 bg-white border-b border-brand-200/50">
        <div className="flex items-center gap-3">
          <Link to="/" className="shrink-0 flex items-center py-2">
            <img src="/finomik-logo-white.png" alt="Finomik" className="h-10 w-auto object-contain" />
          </Link>
          <span className="text-sm font-bold text-primary font-title tracking-tight hidden sm:inline">
            Finomik Ecosystem
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <p className="text-sm text-brand-600 font-body hidden xl:block truncate max-w-[140px]" title={user?.email ?? 'Usuario'}>
            {user?.email ?? 'Usuario'}
          </p>
          <button
            type="button"
            onClick={() => signOut()}
            className="flex items-center gap-2 px-3 py-2.5 text-brand-600 hover:bg-brand-100/50 rounded-lg text-sm font-body transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline font-bold">Cerrar sesión</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center py-14 px-6 sm:px-8">
        <div className="w-full max-w-2xl text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-100/50 text-primary text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles size={14} />
            Bienvenido
          </div>
          <h1 className="text-4xl sm:text-5xl font-title text-primary mb-4 tracking-tight">
            Elige tu herramienta
          </h1>
          <p className="text-brand-500 font-body text-lg max-w-md mx-auto">
            Accede al CRM, facturación o soporte desde un solo lugar.
          </p>
        </div>

        <div className="w-full max-w-6xl grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS_IN_SELECTOR.map((tool) => {
            const Icon = iconMap[tool.id] ?? LayoutDashboard;
            const style = tool.available ? (blueTonalities[tool.id] ?? blueTonalities.crm) : metallicBlueComing;
            const description = tool.description ?? '';
            const content = (
              <>
                <div className="flex flex-col items-center justify-center flex-1 text-white">
                  <div
                    className={`w-24 h-24 rounded-2xl flex items-center justify-center bg-white/15 backdrop-blur-sm border border-white/20 shadow-inner ${tool.available ? 'group-hover:scale-110' : ''} transition-transform duration-300`}
                  >
                    <Icon size={44} strokeWidth={2} className="text-white drop-shadow-sm" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold font-title mt-6 mb-3 text-white drop-shadow-sm">
                    {tool.name}
                  </h2>
                  <p className="text-white/90 font-body text-base sm:text-lg text-center leading-relaxed max-w-xs">
                    {description}
                  </p>
                </div>
                {tool.available ? (
                  <span className="w-full py-4 rounded-2xl font-bold text-primary text-center block transition-all duration-300 flex items-center justify-center gap-2 group-hover:gap-3 mt-6 bg-white/95 hover:bg-white shadow-lg group-hover:shadow-xl">
                    Abrir
                    <ArrowRight size={20} className="transition-transform duration-300 group-hover:translate-x-1 text-primary" />
                  </span>
                ) : (
                  <span className="w-full py-4 rounded-2xl font-bold text-center text-white/90 bg-white/10 border border-white/20 block mt-6 backdrop-blur-sm">
                    Próximamente
                  </span>
                )}
              </>
            );
            const cardClass = `rounded-[2rem] p-10 sm:p-12 flex flex-col min-h-[420px] sm:min-h-[460px] transition-all duration-300 ${
              tool.available ? 'hover:scale-[1.02] hover:shadow-2xl group' : ''
            }`;
            return tool.available ? (
              <Link
                key={tool.id}
                to={tool.path}
                className={`block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-[2rem] ${cardClass}`}
                style={style}
              >
                {content}
              </Link>
            ) : (
              <div key={tool.id} className={`rounded-[2rem] ${cardClass}`} style={style}>
                {content}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default PlatformHub;
