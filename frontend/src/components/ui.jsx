import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, HelpCircle, ChevronDown } from 'lucide-react';

/* ---------- Toasts ---------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((type, text) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const styles = {
    success: 'bg-emerald-600',
    error: 'bg-rose-600',
    info: 'bg-sky-600',
  };
  const icons = { success: CheckCircle2, error: AlertTriangle, info: Info };

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-80 max-w-[90vw]">
        {toasts.map((t) => {
          const Icon = icons[t.type] || Info;
          return (
            <div
              key={t.id}
              className={`${styles[t.type] || styles.info} text-white rounded-xl shadow-lg p-4 flex gap-3 items-start animate-[fadeIn_.25s_ease]`}
            >
              <Icon className="h-5 w-5 mt-0.5 shrink-0" />
              <p className="text-sm flex-1">{t.text}</p>
              <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
                <X className="h-4 w-4 opacity-80" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Encabezado de pagina ---------- */
export function PageHeader({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ---------- Caja de ayuda "Como funciona" ---------- */
export function HelpBox({ title = '¿Cómo se usa esta pantalla?', steps, defaultOpen = true }) {
  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem('help:' + title + steps[0]);
    return saved === null ? defaultOpen : saved === '1';
  });

  useEffect(() => {
    localStorage.setItem('help:' + title + steps[0], open ? '1' : '0');
  }, [open, title, steps]);

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 mb-6 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-indigo-800 font-medium"
      >
        <span className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" /> {title}
        </span>
        <ChevronDown className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ol className="px-5 pb-4 space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm text-indigo-900">
              <span className="h-6 w-6 shrink-0 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ---------- Tarjeta ---------- */
export function Card({ title, accent = 'indigo', right, children, className = '' }) {
  const colors = {
    indigo: 'border-indigo-500',
    rose: 'border-rose-500',
    amber: 'border-amber-500',
    emerald: 'border-emerald-500',
    sky: 'border-sky-500',
  };
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 border-t-4 ${colors[accent]} p-5 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function Empty({ icon: Icon = Info, text }) {
  return (
    <div className="flex flex-col items-center py-8 text-slate-400">
      <Icon className="h-8 w-8 mb-2" />
      <p className="text-sm text-center">{text}</p>
    </div>
  );
}

export function Spinner({ text = 'Cargando...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-slate-500">
      <div className="h-5 w-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      {text}
    </div>
  );
}

export function Badge({ color = 'slate', children }) {
  const c = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-rose-100 text-rose-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-sky-100 text-sky-700',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${c[color]}`}>{children}</span>;
}

export const inputCls =
  'w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-400 focus:outline-none text-base';
export const btnPrimary =
  'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed';
