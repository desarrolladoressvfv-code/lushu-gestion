import { useEffect, useState } from 'react'
import {
  LayoutDashboard, FilePlus, ClipboardList, DollarSign,
  Package, ShoppingCart, Sparkles, ArrowRight, SkipForward,
} from 'lucide-react'
import { useEmpresa } from '../context/EmpresaContext'

/* ── Logo idéntico al de Login ─────────────────────────── */
function BiKloudLogo({ width = 320, animated = false }) {
  const cloudClass = animated ? 'logo-anim-cloud' : ''
  const textClass  = animated ? 'logo-anim-text'  : ''
  const tagClass   = animated ? 'logo-anim-tagline' : ''
  return (
    <svg width={width} viewBox="0 0 680 200" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="ob-ga" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <g className={cloudClass}>
        <ellipse cx="340" cy="48" rx="32" ry="20" fill="url(#ob-ga)" opacity="0.95" />
        <ellipse cx="318" cy="56" rx="18" ry="14" fill="url(#ob-ga)" opacity="0.95" />
        <ellipse cx="362" cy="55" rx="18" ry="14" fill="url(#ob-ga)" opacity="0.95" />
        <rect x="300" y="56" width="80" height="12" fill="url(#ob-ga)" opacity="0.95" />
      </g>
      <g className={textClass}>
        <text x="340" y="128" textAnchor="middle"
          fontFamily="Arial Black, sans-serif" fontSize="64"
          fontWeight="900" letterSpacing="-2">
          <tspan fill="url(#ob-ga)">B</tspan>
          <tspan fill="white" fontSize="48" baselineShift="-4">i</tspan>
          <tspan fill="url(#ob-ga)">K</tspan>
          <tspan fill="white" fontSize="48" baselineShift="-4">loud</tspan>
        </text>
      </g>
      <g className={tagClass}>
        <text x="340" y="160" textAnchor="middle"
          fontFamily="Arial, sans-serif" fontSize="11"
          fill="#94a3b8" letterSpacing="4">
          GESTIÓN INTELIGENTE EN LA NUBE
        </text>
      </g>
    </svg>
  )
}

const MODULOS = [
  { icon: LayoutDashboard, label: 'Dashboard',   desc: 'Visión general en tiempo real' },
  { icon: FilePlus,        label: 'Servicios',   desc: 'Registro completo de servicios' },
  { icon: DollarSign,      label: 'Finanzas',    desc: 'Ventas, cobros y cheques' },
  { icon: Package,         label: 'Inventario',  desc: 'Control de stock por sucursal' },
  { icon: ShoppingCart,    label: 'Compras',     desc: 'Órdenes a proveedores' },
  { icon: Sparkles,        label: "Lushu's",     desc: 'Tu asistente inteligente' },
]

export default function OnboardingWelcome({ onComenzar, onSaltar }) {
  const { nombreEmpresa, cargandoEmpresa } = useEmpresa()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-y-auto"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0c1a3a 100%)' }}>

      {/* Círculos decorativos */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)' }} />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)' }} />

      <div className={`relative z-10 flex flex-col items-center text-center px-6 py-10 max-w-2xl w-full
        transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

        {/* Logo animado */}
        <BiKloudLogo width={300} animated />

        {/* Título de bienvenida */}
        <div className="mt-10 logo-anim-tagline" style={{ animationDelay: '1s' }}>
          <p className="text-blue-400 text-sm font-semibold tracking-widest uppercase mb-2">
            ¡Bienvenido a BiKloud!
          </p>
          {cargandoEmpresa ? (
            <div className="h-9 w-56 mx-auto rounded-2xl bg-white/10 animate-pulse" />
          ) : (
            <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
              {nombreEmpresa}
            </h1>
          )}
          <p className="text-slate-400 text-base mt-3 max-w-md mx-auto leading-relaxed">
            En los próximos minutos te guiaremos por todo lo que puedes hacer con tu nueva plataforma.
          </p>
        </div>

        {/* Grid de módulos */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-3 w-full logo-anim-tagline"
          style={{ animationDelay: '1.2s' }}>
          {MODULOS.map(m => (
            <div key={m.label}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left
                         hover:bg-white/8 hover:border-blue-500/30 transition-all duration-200">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center mb-2.5">
                <m.icon className="w-4.5 h-4.5 text-blue-400" style={{ width: 18, height: 18 }} />
              </div>
              <p className="text-white font-semibold text-sm">{m.label}</p>
              <p className="text-slate-500 text-xs mt-0.5 leading-snug">{m.desc}</p>
            </div>
          ))}
        </div>

        {/* Botones */}
        <div className="mt-10 flex flex-col items-center gap-4 login-form-enter"
          style={{ animationDelay: '1.5s' }}>
          <button
            onClick={onComenzar}
            className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 active:scale-95
                       text-white px-8 py-4 rounded-2xl font-bold text-base
                       transition-all duration-150 shadow-xl shadow-blue-600/30
                       hover:shadow-blue-500/40">
            Comenzar tour
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={onSaltar}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-300
                       text-sm transition-colors duration-150">
            <SkipForward className="w-4 h-4" />
            Saltar tour e ir al dashboard
          </button>
        </div>

        <p className="mt-10 text-slate-700 text-xs">
          © 2026 BiKloud · Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}
