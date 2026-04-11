import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase, setClienteId } from '../lib/supabase'

const AuthContext = createContext(null)
const SESSION_KEY = 'bikloud_st'

export function AuthProvider({ children }) {
  const [session, setSession]           = useState(null)
  const [perfil, setPerfil]             = useState(null)
  const [cargando, setCargando]         = useState(true)
  const [sesionDesplazada, setSesionDesplazada] = useState(false)
  const checkRef = useRef(null)

  function detenerCheck() {
    if (checkRef.current) { clearInterval(checkRef.current); checkRef.current = null }
  }

  function iniciarCheck(userId) {
    detenerCheck()
    checkRef.current = setInterval(async () => {
      let miToken = localStorage.getItem(SESSION_KEY)
      if (!miToken) {
        // Sin token local → reclamar sesión (genera token y guarda en DB)
        miToken = crypto.randomUUID()
        localStorage.setItem(SESSION_KEY, miToken)
        await supabase.from('usuarios').update({ session_token: miToken }).eq('auth_user_id', userId)
        return
      }
      // Verificar que el token local sigue siendo el vigente en DB
      const { data } = await supabase.from('usuarios')
        .select('session_token').eq('auth_user_id', userId).single()
      if (data?.session_token && data.session_token !== miToken) {
        detenerCheck()
        localStorage.removeItem(SESSION_KEY)
        setSesionDesplazada(true)
        await supabase.auth.signOut()
      }
    }, 30000)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) cargarPerfil(session.user.id, false)
      else setCargando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (session) cargarPerfil(session.user.id, event === 'SIGNED_IN')
      else { setPerfil(null); setCargando(false); detenerCheck() }
    })

    return () => { subscription.unsubscribe(); detenerCheck() }
  }, [])

  async function cargarPerfil(userId, esNuevoLogin = false) {
    // 1. Obtener rol y datos del usuario
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol, cliente_id, nombre, activo, debe_cambiar_pass, acceso_tipo, sucursal_id, modulos_permitidos')
      .eq('auth_user_id', userId)
      .single()

    // Cargar session_token por separado (columna puede no existir aún)
    try {
      const { data: st } = await supabase.from('usuarios')
        .select('session_token').eq('auth_user_id', userId).single()
      if (st) usuario.session_token = st.session_token
    } catch (_) { /* columna no existe aún */ }

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
        // ── Sesión única: registrar token en DB ──────────────
        if (esNuevoLogin) {
          const token = crypto.randomUUID()
          localStorage.setItem(SESSION_KEY, token)
          supabase.from('usuarios').update({ session_token: token }).eq('auth_user_id', userId)
        } else {
          // Recarga de página: verificar que el token local sigue vigente
          const miToken = localStorage.getItem(SESSION_KEY)
          if (miToken && usuario.session_token && miToken !== usuario.session_token) {
            // Ya hay otra sesión activa → desplazar esta
            localStorage.removeItem(SESSION_KEY)
            setSesionDesplazada(true)
            await supabase.auth.signOut()
            return
          }
        }
        iniciarCheck(userId)
        // Registrar login + actualizar último acceso
        if (esNuevoLogin) {
          supabase.rpc('registrar_auditoria', {
            p_accion: 'login', p_modulo: 'sesion', p_descripcion: 'Inicio de sesión',
          })
          supabase.rpc('actualizar_ultimo_acceso')
        }
      }
    }

    setPerfil(usuario || null)
    setCargando(false)
  }

  async function logout() {
    detenerCheck()
    localStorage.removeItem(SESSION_KEY)
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
      sesionDesplazada, setSesionDesplazada,
      logout, completarOnboarding, reiniciarOnboarding, marcarPassCambiado,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
