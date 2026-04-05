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
    // 1. Obtener rol y nombre del usuario
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol, cliente_id, nombre')
      .eq('auth_user_id', userId)
      .single()

    // Los superadmin no necesitan verificación de licencia
    if (usuario?.rol === 'superadmin') {
      setPerfil(usuario)
      setCargando(false)
      return
    }

    if (usuario?.cliente_id) {
      // 2. Verificación de licencia en el SERVIDOR mediante función PostgreSQL.
      //    El servidor usa auth.uid() del JWT para identificar al usuario —
      //    no puede ser manipulado desde el navegador.
      const { data: licencia, error: licErr } = await supabase.rpc('verificar_licencia')

      if (licErr || !licencia?.activo) {
        // Licencia inválida — bloquear acceso con la razón del servidor
        usuario.clienteEstado  = 'bloqueado'
        usuario.licenciaRazon  = licencia?.razon || 'Error al verificar licencia'
      } else {
        // Licencia válida — poblar perfil con datos del servidor
        usuario.clienteEstado        = 'activo'
        usuario.clienteVencimiento   = licencia.fecha_vencimiento
        usuario.nombreEmpresa        = licencia.nombre
        usuario.plan                 = licencia.plan        || 'basico'
        usuario.max_sucursales       = licencia.max_sucursales || 1
        usuario.onboardingCompletado = licencia.onboarding_completado ?? false
        setClienteId(usuario.cliente_id)
        // M10: título dinámico al iniciar sesión
        if (licencia.nombre) document.title = `BiKloud · ${licencia.nombre}`
        // S2: registrar login en auditoría
        supabase.rpc('registrar_auditoria', {
          p_accion: 'login',
          p_modulo: 'sesion',
          p_descripcion: `Inicio de sesión`,
        })
      }
    }

    setPerfil(usuario || null)
    setCargando(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    setPerfil(null)
    setClienteId(null)          // Limpia CLIENTE_ID para que no quede el del usuario anterior
    document.title = 'BiKloud'  // Restaura el título sin nombre de empresa
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
  // El servidor ya verificó estado y vencimiento — solo leemos su respuesta
  const clienteActivo = perfil?.clienteEstado === 'activo'

  return (
    <AuthContext.Provider value={{
      session, perfil, cargando,
      esSuperAdmin, clienteActivo,
      logout, completarOnboarding, reiniciarOnboarding,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
