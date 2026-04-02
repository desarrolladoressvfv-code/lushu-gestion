import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Live binding — se actualiza dinámicamente desde AuthContext al hacer login
export let CLIENTE_ID = import.meta.env.VITE_CLIENTE_ID
export function setClienteId(id) { CLIENTE_ID = id }

export const clp = (valor) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(valor ?? 0)
