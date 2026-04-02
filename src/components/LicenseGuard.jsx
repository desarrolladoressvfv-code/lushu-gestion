import { useEffect, useState } from 'react'
import { supabase, CLIENTE_ID } from '../lib/supabase'

export default function LicenseGuard({ children }) {
  const [estado, setEstado] = useState('cargando')

  useEffect(() => {
    async function verificar() {
      if (!CLIENTE_ID) {
        setEstado('sin_configurar')
        return
      }
      const { data, error } = await supabase
        .from('clientes')
        .select('estado, fecha_vencimiento')
        .eq('id', CLIENTE_ID)
        .single()

      if (error || !data) {
        setEstado('bloqueado')
        return
      }

      const vencido = new Date(data.fecha_vencimiento) < new Date()
      if (data.estado !== 'activo' || vencido) {
        setEstado('bloqueado')
      } else {
        setEstado('activo')
      }
    }
    verificar()
  }, [])

  if (estado === 'cargando') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-center">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg">Verificando acceso...</p>
        </div>
      </div>
    )
  }

  if (estado === 'bloqueado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Servicio Suspendido</h1>
          <p className="text-gray-500">
            Su licencia ha vencido o ha sido desactivada.<br />
            Contacte al administrador para reactivar el acceso.
          </p>
        </div>
      </div>
    )
  }

  if (estado === 'sin_configurar') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Configuración incompleta</h1>
          <p className="text-gray-500 text-sm">
            Crea el archivo <code className="bg-gray-100 px-1 rounded">.env</code> con las variables <br />
            <code className="bg-gray-100 px-1 rounded text-xs">VITE_SUPABASE_URL</code>, {' '}
            <code className="bg-gray-100 px-1 rounded text-xs">VITE_SUPABASE_ANON_KEY</code> y {' '}
            <code className="bg-gray-100 px-1 rounded text-xs">VITE_CLIENTE_ID</code>.
          </p>
        </div>
      </div>
    )
  }

  return children
}
