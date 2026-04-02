import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { EmpresaProvider } from './context/EmpresaContext'
import Layout from './components/Layout'
import SuperAdminLayout from './components/SuperAdminLayout'
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

// Pantalla de carga
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

// Pantalla de acceso bloqueado (cliente inactivo/vencido)
function AccesoBloqueado({ logout }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Servicio Suspendido</h1>
        <p className="text-gray-500 text-sm mb-6">
          Su licencia ha vencido o ha sido desactivada.<br />
          Contacte al administrador para reactivar el acceso.
        </p>
        <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-700 underline transition-colors">
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

// Router interno que conoce el estado de auth
function AppRouter() {
  const { session, perfil, cargando, esSuperAdmin, clienteActivo, logout } = useAuth()

  if (cargando) return <LoadingScreen />
  if (!session) return <Login />

  // Portal superadmin
  if (esSuperAdmin) {
    return (
      <BrowserRouter>
        <SuperAdminLayout>
          <Routes>
            <Route path="/superadmin" element={<SuperAdminDashboard />} />
            <Route path="/superadmin/clientes" element={<SuperAdminClientes />} />
            <Route path="*" element={<Navigate to="/superadmin" replace />} />
          </Routes>
        </SuperAdminLayout>
      </BrowserRouter>
    )
  }

  // Cliente bloqueado / sin perfil
  if (!perfil || !clienteActivo) {
    return <AccesoBloqueado logout={logout} />
  }

  // Portal cliente
  return (
    <BrowserRouter>
      <EmpresaProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/formulario" element={<FormularioNuevo />} />
            <Route path="/cotizacion" element={<Cotizacion />} />
            <Route path="/servicios" element={<Servicios />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/formas-pago" element={<FormasPago />} />
            <Route path="/cheques" element={<Cheques />} />
            <Route path="/fallecidos" element={<Fallecidos />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/movimientos" element={<MovimientosInventario />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/recepcion" element={<RecepcionMercaderia />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
        <ChatBot />
      </EmpresaProvider>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}
