import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, LayoutDashboard, FileText, Headphones, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const metallicBlueActive = {
  background: `
    linear-gradient(145deg, rgba(255,255,255,0.18) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.12) 100%),
    linear-gradient(160deg, #3d6b9e 0%, #1a4a7a 22%, #0B3064 45%, #092a52 70%, #114076 88%, #1e5082 100%)
  `,
  boxShadow: '0 25px 50px -12px rgba(11, 48, 100, 0.4), 0 0 0 1px rgba(255,255,255,0.08) inset',
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

  const tools = [
    {
      id: 'crm',
      title: 'CRM',
      description: 'Ventas, pipeline, centros educativos y calendario.',
      href: '/crm',
      available: true,
      icon: LayoutDashboard,
    },
    {
      id: 'billing',
      title: 'Facturación',
      description: 'Contratos, facturas y cobros por centro.',
      href: '/billing',
      available: true,
      icon: FileText,
    },
    {
      id: 'documents',
      title: 'Documentos',
      description: 'Repositorio centralizado de enlaces a documentos internos.',
      href: '/documents',
      available: true,
      icon: FileText,
    },
    {
      id: 'support',
      title: 'Soporte',
      description: 'Incidencias y seguimiento post-venta con centros.',
      href: '#',
      available: false,
      icon: Headphones,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <header className="h-16 bg-white/95 backdrop-blur border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
            <img src="/finomik-logo-white.png" alt="Finomik Ecosystem" className="h-9 w-auto object-contain" />
          </div>
          <span className="text-sm font-bold text-primary font-title tracking-tight">Finomik Ecosystem</span>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-slate-600 font-body hidden sm:block truncate max-w-[200px]">{user?.email ?? 'Usuario'}</p>
          <button
            type="button"
            onClick={() => signOut()}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:bg-slate-100 hover:text-primary rounded-xl text-sm font-body transition-all"
            title="Cerrar sesión"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline font-bold">Cerrar sesión</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center py-12 px-6 sm:px-8">
        <div className="w-full max-w-2xl text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles size={14} />
            Bienvenido
          </div>
          <h1 className="text-4xl sm:text-5xl font-title text-primary mb-4 tracking-tight">
            Elige tu herramienta
          </h1>
          <p className="text-slate-600 font-body text-lg max-w-md mx-auto">
            Accede al CRM, facturación o soporte desde un solo lugar.
          </p>
        </div>

        <div className="w-full max-w-6xl grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const style = tool.available ? metallicBlueActive : metallicBlueComing;
            const content = (
              <>
                <div className="flex flex-col items-center justify-center flex-1 text-white">
                  <div className={`w-24 h-24 rounded-2xl flex items-center justify-center bg-white/15 backdrop-blur-sm border border-white/20 shadow-inner ${tool.available ? 'group-hover:scale-110' : ''} transition-transform duration-300`}>
                    <Icon size={44} strokeWidth={2} className="text-white drop-shadow-sm" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold font-title mt-6 mb-3 text-white drop-shadow-sm">{tool.title}</h2>
                  <p className="text-white/90 font-body text-base sm:text-lg text-center leading-relaxed max-w-xs">{tool.description}</p>
                </div>
                {tool.available ? (
                  <span className="w-full py-4 rounded-2xl font-bold text-primary text-center block transition-all flex items-center justify-center gap-2 group-hover:gap-3 mt-6 bg-white/95 hover:bg-white shadow-lg group-hover:shadow-xl">
                    Abrir
                    <ArrowRight size={20} className="transition-transform group-hover:translate-x-1 text-primary" />
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
                to={tool.href}
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
