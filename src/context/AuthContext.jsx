import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase, setClienteId } from '../lib/supabase'

const AuthContext = createContext(null)
const SESSION_KEY = 'bikloud_st'

export function AuthProvider({ children }) {
  const [session, setSession]                   = useState(null)
  const [perfil, setPerfil]                     = useState(null)
  const [cargando, setCargando]                 = useState(true)
  const [sesionDesplazada, setSesionDesplazada] = useState(false)
  const checkRef = useRef(null)

  function detenerCheck() {
    if (checkRef.current) { clearInterval(checkRef.current); checkRef.current = null }
  }

  async function verificarSesion() {
    const miToken = sessionStorage.getItem(SESSION_KEY)
    if (!miToken) return // sin token local, nada que verificar

    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) { detenerCheck(); return }

    const tokenDB = data.user.user_metadata?.session_token
    if (tokenDB && tokenDB !== miToken) {
      detenerCheck()
      sessionStorage.removeItem(SESSION_KEY)
      setSesionDesplazada(true)
      await supabase.auth.signOut()
    }
  }

  async function reclamarSesion() {
    // Solo en login nuevo: generar token y registrarlo en Auth metadata
    const token = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, token)
    await supabase.auth.updateUser({ data: { session_token: token } })
  }

  async function adoptarSesion() {
    // En recarga/sesión existente: adoptar el token que ya está en la DB
    const { data } = await supabase.auth.getUser()
    const tokenDB = data?.user?.user_metadata?.session_token
    if (tokenDB) {
      // Adoptar el token existente del servidor
      sessionStorage.setItem(SESSION_KEY, tokenDB)
    } else {
      // Nunca hubo token (primera vez) → reclamar
      await reclamarSesion()
    }
  }

  function iniciarCheck() {
    detenerCheck()
    checkRef.current = setInterval(verificarSesion, 10000)
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
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol, cliente_id, nombre, activo, debe_cambiar_pass, acceso_tipo, sucursal_id, modulos_permitidos')
      .eq('auth_user_id', userId)
      .single()

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

        // ── Sesión única via Auth metadata ───────────────────
        if (esNuevoLogin) {
          await reclamarSesion() // genera token nuevo → desplaza sesiones anteriores
        } else {
          await adoptarSesion()  // adopta token existente → no compite con otras sesiones
        }
        iniciarCheck()

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
    sessionStorage.removeItem(SESSION_KEY)
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
