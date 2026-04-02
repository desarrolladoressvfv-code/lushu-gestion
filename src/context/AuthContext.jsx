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
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol, cliente_id, nombre')
      .eq('auth_user_id', userId)
      .single()

    if (usuario?.cliente_id) {
      // Carga estado del cliente para saber si está activo
      const { data: cliente } = await supabase
        .from('clientes')
        .select('estado, fecha_vencimiento, nombre')
        .eq('id', usuario.cliente_id)
        .single()
      usuario.clienteEstado = cliente?.estado
      usuario.clienteVencimiento = cliente?.fecha_vencimiento
      usuario.nombreEmpresa = cliente?.nombre
      // Actualiza el CLIENTE_ID global para que todos los componentes lo usen
      setClienteId(usuario.cliente_id)
    }

    setPerfil(usuario || null)
    setCargando(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    setPerfil(null)
  }

  const esSuperAdmin = perfil?.rol === 'superadmin'
  const clienteActivo = perfil?.clienteEstado === 'activo' &&
    new Date(perfil?.clienteVencimiento) >= new Date()

  return (
    <AuthContext.Provider value={{ session, perfil, cargando, esSuperAdmin, clienteActivo, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
