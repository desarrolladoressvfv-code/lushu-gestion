import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, CLIENTE_ID } from '../lib/supabase'

const EmpresaContext = createContext({
  nombreEmpresa:    'Mi Empresa',
  logoUrl:          null,
  alertas:          { cheques: 0, stockBajo: 0, pagoPendiente: 0 },
  cargandoEmpresa:  true,
  errorEmpresa:     null,
  reintentarEmpresa: async () => {},
  actualizarNombre: async () => false,
})

export function EmpresaProvider({ children }) {
  const [nombreEmpresa,   setNombreEmpresa]   = useState('Mi Empresa')
  const [logoUrl,         setLogoUrl]         = useState(null)
  const [alertas,         setAlertas]         = useState({ cheques: 0, stockBajo: 0, pagoPendiente: 0 })
  const [cargandoEmpresa, setCargandoEmpresa] = useState(true)
  const [errorEmpresa,    setErrorEmpresa]    = useState(null)   // M2

  /* ── Carga inicial: nombre + logo de la empresa ─────── */
  async function cargarEmpresa() {
    try {
      const { data: cliente, error } = await supabase
        .from('clientes')
        .select('nombre, logo_url')
        .eq('id', CLIENTE_ID)
        .single()

      if (error) throw error

      const nombre = cliente?.nombre || 'Mi Empresa'
      setNombreEmpresa(nombre)
      document.title = `BiKloud · ${nombre}`
      if (cliente?.logo_url) setLogoUrl(cliente.logo_url)
      setErrorEmpresa(null)
    } catch {
      setErrorEmpresa('No se pudo cargar la información de la empresa.')
    } finally {
      setCargandoEmpresa(false)
    }
  }

  /* ── Refresco periódico: solo alertas (no toca el nombre) */
  async function cargarAlertas() {
    try {
      const [
        { data: cheques },
        { data: inventario },
        { data: pagos },
      ] = await Promise.all([
        supabase.from('cheques').select('id', { count: 'exact' })
          .eq('cliente_id', CLIENTE_ID).eq('estado', 'vigente')
          .lte('vencimiento', new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]),
        supabase.from('inventario').select('stock_actual, stock_minimo').eq('cliente_id', CLIENTE_ID),
        supabase.from('formas_pago').select('saldo_pendiente').eq('cliente_id', CLIENTE_ID).eq('estado', 'pendiente'),
      ])

      const stockBajo = (inventario || []).filter(i => i.stock_actual <= i.stock_minimo).length
      const pendiente = (pagos     || []).filter(p => (p.saldo_pendiente || 0) > 0).length
      setAlertas({
        cheques:       cheques?.length || 0,
        stockBajo,
        pagoPendiente: pendiente,
      })
    } catch {
      // Fallo silencioso: las alertas no son críticas para la UX
    }
  }

  /* ── Actualizar nombre desde Configuración ───────────── */
  async function actualizarNombre(nuevoNombre) {
    const nombre = nuevoNombre?.trim() || 'Mi Empresa'
    const { error } = await supabase
      .from('clientes')
      .update({ nombre })
      .eq('id', CLIENTE_ID)
    if (!error) {
      setNombreEmpresa(nombre)
      document.title = `BiKloud · ${nombre}`
    }
    return !error
  }

  useEffect(() => {
    // Carga inicial: empresa primero, luego alertas
    cargarEmpresa().then(() => cargarAlertas())

    /* ── Realtime: detectar cambios del Super Admin ──────
       Para que funcione, activa la replicación de la tabla
       "clientes" en Supabase → Database → Replication.    */
    const channel = supabase
      .channel(`empresa-watch-${CLIENTE_ID}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'clientes',
          filter: `id=eq.${CLIENTE_ID}`,
        },
        (payload) => {
          const nombre = payload.new?.nombre || 'Mi Empresa'
          setNombreEmpresa(nombre)
          document.title = `BiKloud · ${nombre}`
        }
      )
      .subscribe()

    /* ── Refrescar SOLO alertas cada 5 min ───────────
       El nombre no se toca en el intervalo para que
       los cambios manuales queden permanentes.        */
    const interval = setInterval(cargarAlertas, 5 * 60 * 1000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  return (
    <EmpresaContext.Provider value={{
      nombreEmpresa,
      logoUrl,
      alertas,
      cargandoEmpresa,
      errorEmpresa,
      reintentarEmpresa: cargarEmpresa,
      actualizarNombre,
    }}>
      {children}
    </EmpresaContext.Provider>
  )
}

export const useEmpresa = () => useContext(EmpresaContext)
