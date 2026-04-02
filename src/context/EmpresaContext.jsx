import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, CLIENTE_ID } from '../lib/supabase'

const EmpresaContext = createContext({ nombreEmpresa: 'Funeraria', logoUrl: null, alertas: {} })

export function EmpresaProvider({ children }) {
  const [nombreEmpresa, setNombreEmpresa] = useState('Funeraria')
  const [logoUrl, setLogoUrl] = useState(null)
  const [alertas, setAlertas] = useState({ cheques: 0, stockBajo: 0, pagoPendiente: 0 })

  useEffect(() => {
    async function cargar() {
      const [{ data: cliente }, { data: cheques }, { data: inventario }, { data: pagos }] = await Promise.all([
        supabase.from('clientes').select('nombre, logo_url').eq('id', CLIENTE_ID).single(),
        supabase.from('cheques').select('id', { count: 'exact' }).eq('cliente_id', CLIENTE_ID).eq('estado', 'vigente')
          .lte('vencimiento', new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]),
        supabase.from('inventario').select('stock_actual, stock_minimo').eq('cliente_id', CLIENTE_ID),
        supabase.from('formas_pago').select('saldo_pendiente').eq('cliente_id', CLIENTE_ID).eq('estado', 'pendiente'),
      ])

      if (cliente?.nombre) setNombreEmpresa(cliente.nombre)
      if (cliente?.logo_url) setLogoUrl(cliente.logo_url)

      const stockBajo = (inventario || []).filter(i => i.stock_actual <= i.stock_minimo).length
      const pendiente = (pagos || []).filter(p => (p.saldo_pendiente || 0) > 0).length

      setAlertas({
        cheques: cheques?.length || 0,
        stockBajo,
        pagoPendiente: pendiente,
      })
    }
    cargar()
    // Refrescar alertas cada 5 minutos
    const interval = setInterval(cargar, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <EmpresaContext.Provider value={{ nombreEmpresa, logoUrl, alertas }}>
      {children}
    </EmpresaContext.Provider>
  )
}

export const useEmpresa = () => useContext(EmpresaContext)
