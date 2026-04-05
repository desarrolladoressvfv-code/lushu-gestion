import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

/**
 * S1 — Banner de conexión perdida
 * Escucha los eventos online/offline del navegador.
 * Muestra banner rojo al desconectarse y verde breve al reconectarse.
 */
export default function OfflineBanner() {
  const [estado, setEstado] = useState('online') // 'online' | 'offline' | 'reconectado'

  useEffect(() => {
    function handleOffline() { setEstado('offline') }
    function handleOnline() {
      setEstado('reconectado')
      // Ocultar el banner verde después de 3 segundos
      setTimeout(() => setEstado('online'), 3000)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online',  handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online',  handleOnline)
    }
  }, [])

  if (estado === 'online') return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2
      px-4 py-2.5 text-sm font-semibold transition-all duration-300
      ${estado === 'offline'
        ? 'bg-red-600 text-white'
        : 'bg-emerald-600 text-white'
      }`}>
      {estado === 'offline' ? (
        <>
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          Sin conexión a internet — los datos pueden no estar actualizados
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4 flex-shrink-0" />
          Conexión restablecida
        </>
      )}
    </div>
  )
}
