import { useState, useEffect } from 'react'
import { Menu, X, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useEmpresa } from '../context/EmpresaContext'
import OfflineBanner from './OfflineBanner'
import BusquedaGlobal from './BusquedaGlobal'
import { useAtajos } from '../hooks/useAtajos'

const TITULOS = {
  '/dashboard': 'Dashboard',
  '/formulario': 'Nuevo Servicio',
  '/cotizacion': 'Cotización',
  '/servicios': 'Servicios',
  '/ventas': 'Ventas',
  '/formas-pago': 'Formas de Pago',
  '/cheques': 'Cheques',
  '/fallecidos': 'Fallecidos',
  '/inventario': 'Stock Actual',
  '/movimientos': 'Movimientos',
  '/compras': 'Órdenes de Compra',
  '/recepcion': 'Recepción',
  '/configuracion': 'Configuración',
}

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { nombreEmpresa, cargandoEmpresa } = useEmpresa()
  const titulo = TITULOS[location.pathname] || 'Gestión'

  // Cerrar sidebar al navegar
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  // Abrir sidebar desde el tour (mobile)
  useEffect(() => {
    function handler() { setSidebarOpen(true) }
    window.addEventListener('bikloud:open-sidebar', handler)
    return () => window.removeEventListener('bikloud:open-sidebar', handler)
  }, [])

  // Bloquear scroll cuando sidebar móvil está abierto
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  // S4 — Atajos de teclado globales
  useAtajos()

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* S1 — Banner offline */}
      <OfflineBanner />
      {/* S5 — Búsqueda global */}
      <BusquedaGlobal />
      {/* Sidebar desktop (≥1024px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 shadow-xl shadow-slate-900/20 z-20">
        <Sidebar />
      </aside>

      {/* Overlay móvil/tablet */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
        </div>
      )}

      {/* Sidebar móvil/tablet deslizante */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex-shrink-0 h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 gap-4 shadow-sm z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Abrir menú">
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-800 truncate">{titulo}</h2>
            {cargandoEmpresa
              ? <div className="skeleton h-3 w-28 hidden sm:block" />
              : <p className="text-xs text-slate-400 hidden sm:block">{nombreEmpresa}</p>
            }
          </div>

          {/* S5 — Botón búsqueda global */}
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs transition-colors">
            <Search className="w-3.5 h-3.5" />
            <span>Buscar</span>
            <kbd className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-mono">Ctrl K</kbd>
          </button>

          {/* Botón cerrar sidebar en tablet cuando está abierto */}
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          )}
        </header>

        {/* Área de contenido con animación de entrada */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-5 lg:p-6 page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
