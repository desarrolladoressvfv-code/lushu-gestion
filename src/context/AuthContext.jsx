import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase, setClienteId } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]                   = useState(null)
  const [perfil, setPerfil]                     = useState(null)
  const [cargando, setCargando]                 = useState(true)
  const [sesionDesplazada, setSesionDesplazada] = useState(false)
  const checkRef = useRef(null)

  function detenerCheck() {
    if (checkRef.current) { clearInterval(checkRef.current); checkRef.current = null }
  }

  // Cada 10s intenta renovar el refresh token.
  // Si falla con error HTTP (token inválido/revocado) → cerrar sesión.
  // Si falla por red (sin status) → reintentar hasta 3 veces consecutivas antes de cerrar.
  const refreshFailsRef = useRef(0)
  function iniciarCheck() {
    detenerCheck()
    refreshFailsRef.current = 0
    checkRef.current = setInterval(async () => {
      const { error } = await supabase.auth.refreshSession()
      if (!error) {
        refreshFailsRef.current = 0
        return
      }
      const esErrorRed = !error.status || error.status === 0
      if (esErrorRed) {
        refreshFailsRef.current += 1
        if (refreshFailsRef.current < 3) return // tolerar fallos de red momentáneos
      }
      // Error definitivo (token revocado) o 3 fallos de red consecutivos
      detenerCheck()
      setSesionDesplazada(true)
      setPerfil(null)
      setSession(null)
      setClienteId(null)
      document.title = 'BiKloud'
    }, 10000)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) cargarPerfil(session.user.id, false)
      else setCargando(false)
    })

    // Solo reaccionar a SIGNED_IN e INITIAL_SESSION para evitar re-cargas
    // en USER_UPDATED (que dispara updateUser internamente)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        cargarPerfil(session.user.id, event === 'SIGNED_IN')
      } else if (!session) {
        setPerfil(null); setCargando(false); detenerCheck()
      }
    })

    return () => { subscription.unsubscribe(); detenerCheck() }
  }, [])

  async function cargarPerfil(userId, esNuevoLogin = false) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol, cliente_id, nombre, activo, debe_cambiar_pass, acceso_tipo, sucursal_id, modulos_permitidos')
      .eq('auth_user_id', userId)
      .maybeSingle()

    if (usuario?.rol === 'superadmin') {
      setPerfil(usuario)
      setCargando(false)
      return
    }

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
        usuario.debeCambiarPass      = usuario.debe_cambiar_pass ?? false
        usuario.accesoTipo           = usuario.acceso_tipo        || 'general'
        usuario.sucursalRestringida  = usuario.sucursal_id        || null
        usuario.modulosPermitidos    = usuario.modulos_permitidos || []
        setClienteId(usuario.cliente_id)
        if (licencia.nombre) document.title = `BiKloud · ${licencia.nombre}`

        if (esNuevoLogin) {
          // Revocar todas las otras sesiones activas del mismo usuario (servidor)
          await supabase.auth.signOut({ scope: 'others' })
          // allSettled: registrar sin bloquear login si alguno falla
          await Promise.allSettled([
            supabase.rpc('registrar_auditoria', {
              p_accion: 'login', p_modulo: 'sesion', p_descripcion: 'Inicio de sesión',
            }),
            supabase.rpc('actualizar_ultimo_acceso'),
          ])
        }

        iniciarCheck()
      }
    }

    setPerfil(usuario || null)
    setCargando(false)
  }

  async function logout() {
    detenerCheck()
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
    await supabase.from('clientes').update({ onboarding_completado: true }).eq('id', perfil.cliente_id)
    setPerfil(p => ({ ...p, onboardingCompletado: true }))
  }

  async function reiniciarOnboarding() {
    if (!perfil?.cliente_id) return
    await supabase.from('clientes').update({ onboarding_completado: false }).eq('id', perfil.cliente_id)
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
      sesionDesplazada, setSesionDesplazada,
      logout, completarOnboarding, reiniciarOnboarding, marcarPassCambiado,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
