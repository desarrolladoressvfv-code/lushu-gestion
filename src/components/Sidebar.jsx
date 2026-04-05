import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FilePlus, FileText, ClipboardList,
  DollarSign, CreditCard, CheckSquare, Users, Package,
  ArrowLeftRight, ShoppingCart, Truck, Settings, ChevronDown,
  LogOut, KeyRound, X, Eye, EyeOff
} from 'lucide-react'
import bikloudLogo from '../assets/bikloud-logo-white.svg'
import { useState } from 'react'
import { useEmpresa } from '../context/EmpresaContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function Badge({ count, color = 'bg-red-500' }) {
  if (!count) return null
  return (
    <span className={`ml-auto text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none ${color}`}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

function NavItem({ to, icon: Icon, label, badge, badgeColor, onClick, tourId }) {
  return (
    <NavLink to={to} onClick={onClick} id={tourId}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
            : 'text-slate-400 hover:bg-white/10 hover:text-white'
        }`
      }>
      {({ isActive }) => (
        <>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
            isActive ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'
          }`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="flex-1 truncate">{label}</span>
          {badge > 0 && <Badge count={badge} color={badgeColor} />}
        </>
      )}
    </NavLink>
  )
}

function NavGroup({ label, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-400 transition-colors">
        {label}
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
      </button>
      <div className={`space-y-0.5 overflow-hidden transition-all duration-300 ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  )
}

function ModalCambiarPassword({ onClose }) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [showActual, setShowActual] = useState(false)
  const [showNueva, setShowNueva] = useState(false)

  async function cambiar(e) {
    e.preventDefault()
    if (nueva.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (nueva !== confirmar) { setError('Las contraseñas no coinciden'); return }
    setGuardando(true)
    setError('')
    // Reautenticar con contraseña actual
    const { data: { user } } = await supabase.auth.getUser()
    const { error: reErr } = await supabase.auth.signInWithPassword({ email: user.email, password: actual })
    if (reErr) { setError('La contraseña actual es incorrecta'); setGuardando(false); return }
    // Actualizar contraseña
    const { error: updErr } = await supabase.auth.updateUser({ password: nueva })
    if (updErr) { setError(updErr.message); setGuardando(false); return }
    setOk(true)
    setGuardando(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Cambiar Contraseña</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {ok ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="font-semibold text-slate-900 mb-1">¡Contraseña actualizada!</p>
            <p className="text-sm text-slate-500 mb-4">Usa tu nueva contraseña la próxima vez que inicies sesión.</p>
            <button onClick={onClose} className="btn-primary w-full justify-center">Cerrar</button>
          </div>
        ) : (
          <form onSubmit={cambiar} className="p-5 space-y-3">
            <div>
              <label className="label-base">Contraseña actual</label>
              <div className="relative">
                <input type={showActual ? 'text' : 'password'} value={actual} onChange={e => setActual(e.target.value)}
                  className="input-base pr-10" required placeholder="••••••••" />
                <button type="button" onClick={() => setShowActual(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showActual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label-base">Nueva contraseña</label>
              <div className="relative">
                <input type={showNueva ? 'text' : 'password'} value={nueva} onChange={e => setNueva(e.target.value)}
                  className="input-base pr-10" required placeholder="Mínimo 6 caracteres" />
                <button type="button" onClick={() => setShowNueva(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label-base">Confirmar nueva contraseña</label>
              <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)}
                className="input-base" required placeholder="Repite la contraseña" />
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs">{error}</div>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center text-sm">Cancelar</button>
              <button type="submit" disabled={guardando} className="btn-primary flex-1 justify-center text-sm">
                {guardando ? 'Guardando...' : 'Cambiar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function Sidebar({ onClose }) {
  const { nombreEmpresa, logoUrl, alertas, cargandoEmpresa, errorEmpresa, reintentarEmpresa } = useEmpresa()
  const { logout, perfil } = useAuth()
  const location = useLocation()
  const [modalPass, setModalPass] = useState(false)

  const plan = perfil?.plan || 'basico'
  const esPro = plan === 'profesional' || plan === 'enterprise'

  const PLAN_BADGE = { basico: { label: 'Básico', color: 'bg-slate-600 text-slate-300' }, profesional: { label: 'Profesional', color: 'bg-blue-600 text-blue-100' }, enterprise: { label: 'Enterprise', color: 'bg-violet-600 text-violet-100' } }
  const planInfo = PLAN_BADGE[plan] || PLAN_BADGE.basico

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-800 overflow-hidden">
      {/* Header empresa */}
      <div className="pt-5 pb-4 flex-shrink-0">
        <img src={bikloudLogo} alt="BiKloud" className="w-full logo-sidebar-enter mb-4" />
        <div className="border-t border-white/10 pt-4 px-4">
          <div className="flex items-center gap-2.5">
            {cargandoEmpresa ? (
              <div className="w-7 h-7 rounded-lg bg-white/10 flex-shrink-0 animate-pulse" />
            ) : logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-7 h-7 rounded-lg object-cover shadow-md flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-300 font-bold text-xs">{nombreEmpresa?.charAt(0)?.toUpperCase()}</span>
              </div>
            )}
            <div className="min-w-0">
              {cargandoEmpresa ? (
                <div className="h-3 w-28 rounded-full bg-white/10 animate-pulse mb-1.5" />
              ) : errorEmpresa ? (
                <button onClick={reintentarEmpresa}
                  className="text-red-400 text-xs font-medium hover:text-red-300 transition-colors truncate block">
                  ⚠ Error · Reintentar
                </button>
              ) : (
                <p className="text-white text-xs font-semibold leading-tight truncate">{nombreEmpresa}</p>
              )}
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${planInfo.color}`}>{planInfo.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-thin">
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={onClose} tourId="nav-dashboard" />

        <NavGroup label="Servicios">
          <NavItem to="/formulario" icon={FilePlus}     label="Nuevo Servicio" onClick={onClose} tourId="nav-formulario" />
          {esPro && <NavItem to="/cotizacion" icon={FileText} label="Cotización" onClick={onClose} tourId="nav-cotizacion" />}
          <NavItem to="/servicios" icon={ClipboardList} label="Servicios"      onClick={onClose} tourId="nav-servicios"  />
          <NavItem to="/fallecidos" icon={Users}        label="Fallecidos"     onClick={onClose} tourId="nav-fallecidos" />
        </NavGroup>

        {esPro && (
          <NavGroup label="Finanzas">
            <NavItem to="/ventas"      icon={DollarSign}  label="Ventas"          onClick={onClose} tourId="nav-ventas"      />
            <NavItem to="/formas-pago" icon={CreditCard}  label="Formas de Pago"
              badge={alertas.pagoPendiente} badgeColor="bg-amber-500" onClick={onClose} tourId="nav-formas-pago" />
            <NavItem to="/cheques"     icon={CheckSquare} label="Cheques"
              badge={alertas.cheques} badgeColor="bg-red-500" onClick={onClose} tourId="nav-cheques" />
          </NavGroup>
        )}

        <NavGroup label="Inventario">
          <NavItem to="/inventario" icon={Package} label="Stock Actual"
            badge={alertas.stockBajo} badgeColor="bg-orange-500" onClick={onClose} tourId="nav-inventario" />
          {esPro && <NavItem to="/movimientos" icon={ArrowLeftRight} label="Movimientos" onClick={onClose} tourId="nav-movimientos" />}
        </NavGroup>

        {esPro && (
          <NavGroup label="Compras">
            <NavItem to="/compras"    icon={ShoppingCart} label="Órdenes de Compra" onClick={onClose} tourId="nav-compras"   />
            <NavItem to="/recepcion"  icon={Truck}        label="Recepción"         onClick={onClose} />
          </NavGroup>
        )}

        <NavGroup label="Sistema">
          <NavItem to="/configuracion" icon={Settings} label="Configuración" onClick={onClose} />
        </NavGroup>
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/10 flex-shrink-0 space-y-1">
        {perfil?.nombre && (
          <p className="text-xs text-slate-500 px-3 mb-2 truncate">{perfil.nombre}</p>
        )}
        <button
          onClick={() => setModalPass(true)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-150"
        >
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
            <KeyRound className="w-3.5 h-3.5" />
          </div>
          Cambiar contraseña
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-150"
        >
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
            <LogOut className="w-3.5 h-3.5" />
          </div>
          Cerrar sesión
        </button>
        <p className="text-xs text-slate-700 text-center pt-1">v2.0 · Gestión Funeraria</p>
      </div>

      {modalPass && <ModalCambiarPassword onClose={() => setModalPass(false)} />}
    </div>
  )
}
