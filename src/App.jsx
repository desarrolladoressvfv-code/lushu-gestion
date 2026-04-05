import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { TourProvider, useTour } from './context/TourContext'
import { EmpresaProvider } from './context/EmpresaContext'
import Layout from './components/Layout'
import SuperAdminLayout from './components/SuperAdminLayout'
import TourBiKloud from './components/TourBiKloud'
import OnboardingWelcome from './pages/OnboardingWelcome'
import Login from './pages/Login'
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard'
import SuperAdminClientes from './pages/superadmin/SuperAdminClientes'
import Dashboard from './pages/Dashboard'
import FormularioNuevo from './pages/FormularioNuevo'
import Cotizacion from './pages/Cotizacion'
import Servicios from './pages/Servicios'
import Ventas from './pages/Ventas'
import FormasPago from './pages/FormasPago'
import Cheques from './pages/Cheques'
import Fallecidos from './pages/Fallecidos'
import Inventario from './pages/Inventario'
import MovimientosInventario from './pages/MovimientosInventario'
import Compras from './pages/Compras'
import RecepcionMercaderia from './pages/RecepcionMercaderia'
import Configuracion from './pages/Configuracion'
import ChatBot from './components/ChatBot'

/* ── S6: Página de upgrade de plan ─────────────────────── */
function PaginaUpgrade({ modulo }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm px-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{modulo} es Pro</h2>
        <p className="text-slate-500 text-sm mb-6">
          Este módulo está disponible en el plan <span className="font-semibold text-blue-600">Profesional</span> o superior.
          Actualiza tu plan para acceder a todas las funcionalidades.
        </p>
        <a href="mailto:contacto@bikloud.cl?subject=Upgrade de plan"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600
                     hover:from-blue-500 hover:to-violet-500 text-white px-6 py-3 rounded-2xl
                     font-semibold text-sm transition-all duration-200 shadow-lg shadow-blue-500/30
                     hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5">
          Contactar para upgrade
        </a>
        <p className="text-xs text-slate-400 mt-4">
          O escríbenos a <span className="font-medium">contacto@bikloud.cl</span>
        </p>
      </div>
    </div>
  )
}

/* ── Pantalla de carga ──────────────────────────────────── */
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Cargando...</p>
      </div>
    </div>
  )
}

/* ── Acceso bloqueado ───────────────────────────────────── */
function AccesoBloqueado({ logout, razon }) {
  const mensajes = {
    'Licencia vencida':      'Su licencia ha vencido.',
    'Cuenta suspendida':     'Su cuenta ha sido suspendida.',
    'Usuario no encontrado': 'Usuario no reconocido en el sistema.',
    'Cliente no encontrado': 'No se encontró una cuenta asociada.',
  }
  const mensaje = mensajes[razon] || 'Su licencia ha vencido o ha sido desactivada.'

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Bloqueado</h1>
        <p className="text-gray-500 text-sm mb-1">{mensaje}</p>
        <p className="text-gray-400 text-xs mb-6">
          Contacte al administrador de BiKloud para reactivar el acceso.
        </p>
        <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-700 underline transition-colors">
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

/* ── Router principal ───────────────────────────────────── */
function AppRouter() {
  const { session, perfil, cargando, esSuperAdmin, clienteActivo, logout, completarOnboarding } = useAuth()
  const { fase, setFase } = useTour()

  if (cargando) return <LoadingScreen />
  if (!session)  return <Login />

  /* Portal superadmin */
  if (esSuperAdmin) {
    return (
      <BrowserRouter>
        <SuperAdminLayout>
          <Routes>
            <Route path="/superadmin"          element={<SuperAdminDashboard />} />
            <Route path="/superadmin/clientes" element={<SuperAdminClientes />} />
            <Route path="*"                    element={<Navigate to="/superadmin" replace />} />
          </Routes>
        </SuperAdminLayout>
      </BrowserRouter>
    )
  }

  /* Cliente bloqueado / sin perfil */
  if (!perfil || !clienteActivo) {
    return <AccesoBloqueado logout={logout} razon={perfil?.licenciaRazon} />
  }

  /* Portal cliente */
  const esPro = perfil?.plan === 'profesional' || perfil?.plan === 'enterprise'

  // Determinar si mostrar bienvenida:
  // fase 'bienvenida' explícita (ej: repetir tour desde config)
  // O nunca hizo onboarding y el tour aún no fue iniciado
  const mostrarBienvenida =
    fase === 'bienvenida' ||
    (!fase && perfil && !perfil.onboardingCompletado)

  async function handleSaltar() {
    await completarOnboarding()
    setFase(null)
  }

  async function handleComenzarTour() {
    // M6: marcar completado ANTES de iniciar el tour para que
    // una recarga en medio del tour no reinicie la bienvenida
    await completarOnboarding()
    setFase('tour')
  }

  async function handleFinTour() {
    await completarOnboarding()
    setFase(null)
  }

  return (
    <BrowserRouter>
      <EmpresaProvider>

        {/* ── Overlay de bienvenida ────────────────────────── */}
        {mostrarBienvenida && (
          <OnboardingWelcome
            onComenzar={handleComenzarTour}
            onSaltar={handleSaltar}
          />
        )}

        {/* ── Layout principal ─────────────────────────────── */}
        <Layout>
          <Routes>
            <Route path="/"              element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"     element={<Dashboard />} />
            <Route path="/formulario"    element={<FormularioNuevo />} />
            <Route path="/cotizacion"    element={esPro ? <Cotizacion />            : <PaginaUpgrade modulo="Cotización" />} />
            <Route path="/servicios"     element={<Servicios />} />
            <Route path="/ventas"        element={esPro ? <Ventas />               : <PaginaUpgrade modulo="Ventas" />} />
            <Route path="/formas-pago"   element={esPro ? <FormasPago />           : <PaginaUpgrade modulo="Formas de Pago" />} />
            <Route path="/cheques"       element={esPro ? <Cheques />              : <PaginaUpgrade modulo="Cheques" />} />
            <Route path="/fallecidos"    element={<Fallecidos />} />
            <Route path="/inventario"    element={<Inventario />} />
            <Route path="/movimientos"   element={esPro ? <MovimientosInventario /> : <PaginaUpgrade modulo="Movimientos de Inventario" />} />
            <Route path="/compras"       element={esPro ? <Compras />              : <PaginaUpgrade modulo="Órdenes de Compra" />} />
            <Route path="/recepcion"     element={esPro ? <RecepcionMercaderia />  : <PaginaUpgrade modulo="Recepción de Mercadería" />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route path="*"              element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>

        {/* ── ChatBot (Pro) ────────────────────────────────── */}
        {esPro && <ChatBot />}

        {/* ── Tour Driver.js ───────────────────────────────── */}
        <TourBiKloud
          activo={fase === 'tour'}
          esPro={esPro}
          onFin={handleFinTour}
        />

      </EmpresaProvider>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <TourProvider>
        <AppRouter />
      </TourProvider>
    </AuthProvider>
  )
}
