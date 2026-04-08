import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import bikloudLogo from '../assets/bikloud-logo-white.svg'

export default function CambiarPassObligatorio() {
  const { marcarPassCambiado, logout } = useAuth()
  const [nueva, setNueva]         = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [showNueva, setShowNueva] = useState(false)
  const [showConf, setShowConf]   = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (nueva.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (nueva !== confirmar) { setError('Las contraseñas no coinciden'); return }

    setGuardando(true)
    const { error: updErr } = await supabase.auth.updateUser({ password: nueva })
    if (updErr) { setError(updErr.message); setGuardando(false); return }

    await marcarPassCambiado()
    setGuardando(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <img src={bikloudLogo} alt="BiKloud" className="w-48" />
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-violet-600 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-white font-bold text-xl">Cambio de contraseña requerido</h1>
            <p className="text-white/70 text-sm mt-1">
              Por seguridad, debes crear una contraseña personal antes de continuar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="label-base">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showNueva ? 'text' : 'password'}
                  value={nueva}
                  onChange={e => setNueva(e.target.value)}
                  className="input-base pr-10"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
                <button type="button" onClick={() => setShowNueva(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label-base">Confirmar contraseña</label>
              <div className="relative">
                <input
                  type={showConf ? 'text' : 'password'}
                  value={confirmar}
                  onChange={e => setConfirmar(e.target.value)}
                  className="input-base pr-10"
                  placeholder="Repite la contraseña"
                  required
                />
                <button type="button" onClick={() => setShowConf(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={guardando}
              className="w-full btn-primary justify-center py-3 text-base"
            >
              <KeyRound className="w-4 h-4" />
              {guardando ? 'Guardando...' : 'Establecer contraseña y entrar'}
            </button>

            <button
              type="button"
              onClick={logout}
              className="w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors pt-1"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
