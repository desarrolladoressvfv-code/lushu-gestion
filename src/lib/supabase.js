import { createClient } from '@supabase/supabase-js'

const supabaseUrl      = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

// Usar sessionStorage para que la sesión se cierre al cerrar el navegador/pestaña
const sessionStorage_ = {
  getItem:    (key) => sessionStorage.getItem(key),
  setItem:    (key, val) => sessionStorage.setItem(key, val),
  removeItem: (key) => sessionStorage.removeItem(key),
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: sessionStorage_, persistSession: true, autoRefreshToken: true },
})

// CLIENTE_ID se resuelve desde la sesión de auth — nunca desde variables de entorno.
// Empieza en null y se actualiza al hacer login / se limpia al hacer logout.
export let CLIENTE_ID = null
export function setClienteId(id) { CLIENTE_ID = id ?? null }

export const clp = (valor) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(valor ?? 0)
