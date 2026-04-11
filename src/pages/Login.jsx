import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, LogIn, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function BiKloudLogo({ width = 320, animated = false }) {
  const cloudClass = animated ? 'logo-anim-cloud' : ''
  const textClass  = animated ? 'logo-anim-text'  : ''
  const tagClass   = animated ? 'logo-anim-tagline' : ''

  return (
    <svg width={width} viewBox="0 0 680 200" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="bk-ga" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <g className={cloudClass}>
        <ellipse cx="340" cy="48" rx="32" ry="20" fill="url(#bk-ga)" opacity="0.95" />
        <ellipse cx="318" cy="56" rx="18" ry="14" fill="url(#bk-ga)" opacity="0.95" />
        <ellipse cx="362" cy="55" rx="18" ry="14" fill="url(#bk-ga)" opacity="0.95" />
        <rect x="300" y="56" width="80" height="12" fill="url(#bk-ga)" opacity="0.95" />
      </g>
      <g className={textClass}>
        <text x="340" y="128" textAnchor="middle"
          fontFamily="Arial Black, sans-serif" fontSize="64"
          fontWeight="900" letterSpacing="-2">
          <tspan fill="url(#bk-ga)">B</tspan>
          <tspan fill="white" fontSize="48" baselineShift="-4">i</tspan>
          <tspan fill="url(#bk-ga)">K</tspan>
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

const FEATURES = [
  { label: 'Servicios',   desc: 'Registro completo de servicios' },
  { label: 'Inventario',  desc: 'Control de stock por sucursal' },
  { label: 'Finanzas',    desc: 'Ventas, cobros y cheques' },
  { label: "Luchus IA",  desc: 'Tu asistente inteligente' },
]

export default function Login() {
  const { sesionDesplazada, setSesionDesplazada } = useAuth?.() || {}
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos'
          : error.message
      )
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo — branding ─────────────────────────── */}
      <div className="hidden lg:flex flex-col w-[58%] relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0c1a3a 100%)' }}>

        {/* Círculos decorativos */}
        <div className="absolute -top-60 -left-60 w-[800px] h-[800px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 65%)' }} />
        <div className="absolute -bottom-60 -right-60 w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.10) 0%, transparent 65%)' }} />

        {/* Contenido centrado verticalmente */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-12 py-16 gap-12">

          {/* ── LOGO GIGANTE ── */}
          <div className="w-full logo-anim-cloud" style={{ maxWidth: '720px' }}>
            <BiKloudLogo width="100%" animated />
          </div>

          {/* Frase tagline grande */}
          <p className="logo-anim-tagline text-slate-300 text-xl font-light tracking-wide text-center max-w-lg"
            style={{ animationDelay: '0.6s' }}>
            La plataforma de gestión funeraria más completa de Chile
          </p>

          {/* Cards */}
          <div className="logo-anim-tagline w-full" style={{ animationDelay: '1s', maxWidth: '640px' }}>
            <div className="grid grid-cols-2 gap-4">
              {FEATURES.map(f => (
                <div key={f.label}
                  className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-left
                             hover:bg-white/8 hover:border-blue-500/25 transition-all duration-200">
                  <p className="text-white font-bold text-lg mb-1">{f.label}</p>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="relative z-10 text-slate-700 text-xs text-center pb-6">
          © 2026 BiKloud · Todos los derechos reservados
        </p>
      </div>

      {/* ── Panel derecho — formulario ─────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-10 py-12">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="flex lg:hidden justify-center mb-8 px-4">
            <BiKloudLogo width="100%" animated />
          </div>

          {/* Formulario */}
          <div className="login-form-enter">
            <p className="text-blue-600 text-xs font-bold mb-3 tracking-widest uppercase">
              Bienvenido de vuelta
            </p>
            <h2 className="text-4xl font-black text-slate-900 mb-2 leading-tight">
              Iniciar sesión
            </h2>
            <p className="text-slate-500 text-base mb-10">
              Ingresa tus credenciales para acceder
            </p>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                  className="input-base !py-4 !text-base !rounded-2xl"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="input-base pr-14 !py-4 !text-base !rounded-2xl"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {sesionDesplazada && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-800 font-semibold text-sm">Sesión cerrada automáticamente</p>
                    <p className="text-amber-700 text-xs mt-0.5">Tu cuenta fue iniciada en otro dispositivo. Solo se permite una sesión activa a la vez.</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary justify-center gap-3 !py-4 !text-lg !rounded-2xl mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Ingresar
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-slate-400 text-sm mt-10">
              BiKloud · Gestión Inteligente en la Nube v2.0
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
