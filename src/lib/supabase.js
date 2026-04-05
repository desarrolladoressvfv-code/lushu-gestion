import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// CLIENTE_ID se resuelve desde la sesión de auth — nunca desde variables de entorno.
// Empieza en null y se actualiza al hacer login / se limpia al hacer logout.
export let CLIENTE_ID = null
export function setClienteId(id) { CLIENTE_ID = id ?? null }

export const clp = (valor) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(valor ?? 0)
