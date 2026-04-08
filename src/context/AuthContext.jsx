import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, setClienteId } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) cargarPerfil(session.user.id)
      else setCargando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) cargarPerfil(session.user.id)
      else { setPerfil(null); setCargando(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function cargarPerfil(userId) {
    // 1. Obtener rol y datos del usuario
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol, cliente_id, nombre, activo, debe_cambiar_pass, acceso_tipo, sucursal_id, modulos_permitidos')
      .eq('auth_user_id', userId)
      .single()

    // Los superadmin no necesitan verificación de licencia
    if (usuario?.rol === 'superadmin') {
      setPerfil(usuario)
      setCargando(false)
      return
    }

    // Usuario inactivo — bloquear acceso
    if (usuario && usuario.activo === false) {
      usuario.clienteEstado = 'bloqueado'
      usuario.licenciaRazon = 'Usuario desactivado'
      setPerfil(usuario)
      setCargando(false)
      return
    }

    if (usuario?.cliente_id) {
      const { data: licencia, error: licErr } = await supabase.rpc('verificar_licencia')

      if (licErr || !licencia?.activo) {
        usuario.clienteEstado = 'bloqueado'
        usuario.licenciaRazon = licencia?.razon || 'Error al verificar licencia'
      } else {
        usuario.clienteEstado        = 'activo'
        usuario.clienteVencimiento   = licencia.fecha_vencimiento
        usuario.nombreEmpresa        = licencia.nombre
        usuario.plan                 = licencia.plan           || 'basico'
        usuario.max_sucursales       = licencia.max_sucursales || 1
        usuario.onboardingCompletado = licencia.onboarding_completado ?? false
        // Datos de rol extendido
        usuario.debeCambiarPass      = usuario.debe_cambiar_pass ?? false
        usuario.accesoTipo           = usuario.acceso_tipo        || 'general'
        usuario.sucursalRestringida  = usuario.sucursal_id        || null
        usuario.modulosPermitidos    = usuario.modulos_permitidos || []
        setClienteId(usuario.cliente_id)
        if (licencia.nombre) document.title = `BiKloud · ${licencia.nombre}`
        // Registrar login + actualizar último acceso
        supabase.rpc('registrar_auditoria', {
          p_accion: 'login', p_modulo: 'sesion', p_descripcion: 'Inicio de sesión',
        })
        supabase.rpc('actualizar_ultimo_acceso')
      }
    }

    setPerfil(usuario || null)
    setCargando(false)
  }

  async function logout() {
    supabase.rpc('registrar_auditoria', {
      p_accion: 'logout', p_modulo: 'sesion', p_descripcion: 'Cierre de sesión',
    })
    await supabase.auth.signOut()
    setPerfil(null)
    setClienteId(null)
    document.title = 'BiKloud'
  }

  async function marcarPassCambiado() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('usuarios').update({ debe_cambiar_pass: false }).eq('auth_user_id', user.id)
    setPerfil(p => ({ ...p, debeCambiarPass: false }))
  }

  async function completarOnboarding() {
    if (!perfil?.cliente_id) return
    await supabase
      .from('clientes')
      .update({ onboarding_completado: true })
      .eq('id', perfil.cliente_id)
    setPerfil(p => ({ ...p, onboardingCompletado: true }))
  }

  async function reiniciarOnboarding() {
    if (!perfil?.cliente_id) return
    await supabase
      .from('clientes')
      .update({ onboarding_completado: false })
      .eq('id', perfil.cliente_id)
    setPerfil(p => ({ ...p, onboardingCompletado: false }))
  }

  const esSuperAdmin  = perfil?.rol === 'superadmin'
  const esAdmin       = perfil?.rol === 'admin'
  const esOperador    = perfil?.rol === 'operador'
  const clienteActivo = perfil?.clienteEstado === 'activo'

  return (
    <AuthContext.Provider value={{
      session, perfil, cargando,
      esSuperAdmin, esAdmin, esOperador, clienteActivo,
      logout, completarOnboarding, reiniciarOnboarding, marcarPassCambiado,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
