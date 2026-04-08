import { ShieldX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AccesoDenegado() {
  const navigate = useNavigate()
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <ShieldX className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso denegado</h2>
        <p className="text-slate-500 text-sm mb-6">
          No tienes permisos para acceder a este módulo.<br />
          Contacta al administrador si crees que esto es un error.
        </p>
        <button onClick={() => navigate('/dashboard')}
          className="btn-primary justify-center">
          Volver al inicio
        </button>
      </div>
    </div>
  )
}
