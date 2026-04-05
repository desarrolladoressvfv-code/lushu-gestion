import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { LayoutDashboard, Users, LogOut, Menu, X, ChevronRight, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import bikloudLogo from '../assets/bikloud-logo-white.svg'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/superadmin' },
  { icon: Users, label: 'Clientes', path: '/superadmin/clientes' },
]

export default function SuperAdminLayout({ children }) {
  const { logout, perfil } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-auto`}>

        {/* Brand */}
        <div className="p-5 border-b border-slate-800/80">
          <img src={bikloudLogo} alt="BiKloud" className="w-32 mb-1" />
          <p className="text-slate-500 text-xs">Panel Administrador</p>
        </div>

        {/* Admin badge */}
        <div className="px-4 pt-4">
          <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-blue-300 text-xs font-semibold">Super Admin</p>
              <p className="text-slate-500 text-xs truncate">{perfil?.nombre || 'Administrador'}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 mt-2">
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-800/80">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Backdrop mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar mobile */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center">
            <p className="font-semibold text-slate-800 text-sm">BiKloud · Panel Admin</p>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
