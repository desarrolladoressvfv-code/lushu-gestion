import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, LogIn } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      {/* Panel izquierdo — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-12 relative overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-700/15 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 rounded-full" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">L</span>
          </div>
          <div>
            <p className="text-white font-bold text-base leading-none">Lushu's</p>
            <p className="text-blue-300 text-xs mt-0.5">Sistema de Gestión</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Gestión funeraria<br />
            <span className="text-blue-400">inteligente</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-xs">
            Administra servicios, inventario, ventas y tu equipo desde un solo lugar, con datos en tiempo real.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { label: 'Servicios', desc: 'Registro completo' },
              { label: 'Inventario', desc: 'Control de stock' },
              { label: 'Finanzas', desc: 'Ventas y cobros' },
              { label: 'Lushu\'s IA', desc: 'Asistente inteligente' },
            ].map(f => (
              <div key={f.label} className="bg-white/5 border border-white/10 rounded-xl p-3">
                <p className="text-white font-semibold text-sm">{f.label}</p>
                <p className="text-slate-400 text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-slate-600 text-xs">© 2026 Lushu's · Todos los derechos reservados</p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">L</span>
            </div>
            <span className="font-bold text-slate-900">Lushu's</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Iniciar sesión</h2>
          <p className="text-slate-500 text-sm mb-8">Ingresa tus credenciales para acceder</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label-base">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                className="input-base"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label-base">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="input-base pr-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-3 text-sm mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Ingresar
                </>
              )}
            </button>
          </form>

          <p className="text-center text-slate-400 text-xs mt-8">
            Lushu's · Sistema de Gestión Funeraria v2.0
          </p>
        </div>
      </div>
    </div>
  )
}
