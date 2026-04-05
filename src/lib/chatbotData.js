import { supabase, CLIENTE_ID } from './supabase'
import { hoyCL } from './fecha'

// ─── Utilidades de fecha ────────────────────────────────────────────────────
const hoy = () => hoyCL()

const diasDesdeHoy = (n) => {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }))
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

const inicioMes = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const inicioMesAnterior = () => {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const finMesAnterior = () => {
  const d = new Date()
  d.setDate(0)
  return d.toISOString().split('T')[0]
}

const inicioSemana = () => {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  return d.toISOString().split('T')[0]
}

const calcDias = (fecha) => {
  if (!fecha) return null
  const h = new Date(); h.setHours(0, 0, 0, 0)
  const v = new Date(fecha + 'T00:00:00')
  return Math.ceil((v - h) / 86400000)
}

// ─── Detección de módulos por palabras clave ────────────────────────────────
export function detectarModulos(mensaje) {
  const m = mensaje.toLowerCase()
  const mod = new Set(['base'])

  if (/servicio|formulario|registr|atenci|cliente/.test(m)) mod.add('servicios')
  if (/venta|ingreso|recaud|mes|semana|vendid|ticket|total|factur|dinero|ganancia/.test(m)) mod.add('ventas')
  if (/cheque/.test(m)) mod.add('cheques')
  if (/stock|inventario|urna|producto|reponer|agot|existencia/.test(m)) mod.add('inventario')
  if (/compra|orden|proveedor/.test(m)) mod.add('compras')
  if (/fallecido|difunto/.test(m)) mod.add('fallecidos')
  if (/sucursal|local|sede|comparar/.test(m)) mod.add('sucursales')
  if (/pago|pendiente|debe|cobrar|saldo|cobro/.test(m)) mod.add('pagos')

  return [...mod]
}

// ─── Contexto base (siempre activo) ────────────────────────────────────────
async function fetchBase() {
  const [
    { data: ventasMes },
    { data: ventasMesAnt },
    { data: serviciosSemana },
    { data: chequesVencer },
    { data: inventario },
    { data: pagosPend },
  ] = await Promise.all([
    supabase.from('ventas').select('venta_total, venta_neta')
      .eq('cliente_id', CLIENTE_ID).gte('fecha_servicio', inicioMes()),
    supabase.from('ventas').select('venta_total')
      .eq('cliente_id', CLIENTE_ID)
      .gte('fecha_servicio', inicioMesAnterior())
      .lte('fecha_servicio', finMesAnterior()),
    supabase.from('servicios').select('id, fecha_servicio, nombre_cliente')
      .eq('cliente_id', CLIENTE_ID).gte('fecha_servicio', inicioSemana()),
    supabase.from('cheques').select('numero_formulario, monto, vencimiento')
      .eq('cliente_id', CLIENTE_ID)
      .eq('estado', 'vigente')
      .gte('vencimiento', hoy())
      .lte('vencimiento', diasDesdeHoy(7)),
    supabase.from('inventario')
      .select('stock_actual, stock_minimo, productos(nombre), sucursales(nombre)')
      .eq('cliente_id', CLIENTE_ID),
    supabase.from('formas_pago').select('saldo_pendiente')
      .eq('cliente_id', CLIENTE_ID)
      .eq('estado', 'pendiente')
      .gt('saldo_pendiente', 0),
  ])

  const totalMes = (ventasMes || []).reduce((s, v) => s + (v.venta_total || 0), 0)
  const cantMes = (ventasMes || []).length
  const totalMesAnt = (ventasMesAnt || []).reduce((s, v) => s + (v.venta_total || 0), 0)
  const variacion = totalMesAnt > 0
    ? (((totalMes - totalMesAnt) / totalMesAnt) * 100).toFixed(1)
    : null

  const stockCritico = (inventario || []).filter(r => r.stock_actual <= r.stock_minimo)

  return {
    fecha_hoy: hoy(),
    ventas_este_mes: {
      total_clp: totalMes,
      cantidad_servicios: cantMes,
      promedio_ticket: cantMes > 0 ? Math.round(totalMes / cantMes) : 0,
      variacion_vs_anterior_pct: variacion,
    },
    servicios_esta_semana: {
      cantidad: (serviciosSemana || []).length,
    },
    cheques_por_vencer_7dias: (chequesVencer || []).map(c => ({
      formulario: c.numero_formulario,
      monto: c.monto,
      vencimiento: c.vencimiento,
      dias_restantes: calcDias(c.vencimiento),
    })),
    stock_critico: stockCritico.map(r => ({
      producto: r.productos?.nombre || 'Desconocido',
      sucursal: r.sucursales?.nombre || 'General',
      stock_actual: r.stock_actual,
      stock_minimo: r.stock_minimo,
      sin_stock: r.stock_actual === 0,
    })),
    cobros_pendientes: {
      total_clp: (pagosPend || []).reduce((s, p) => s + (p.saldo_pendiente || 0), 0),
      cantidad: (pagosPend || []).length,
    },
  }
}

// ─── Módulos adicionales ────────────────────────────────────────────────────
async function fetchServicios() {
  const { data } = await supabase.from('servicios')
    .select('numero_formulario, fecha_servicio, nombre_cliente, telefono, color, lugar_servicio, cementerio, productos(nombre), trabajadores(nombre), sucursales(nombre)')
    .eq('cliente_id', CLIENTE_ID)
    .order('created_at', { ascending: false })
    .limit(20)
  return data || []
}

async function fetchVentas() {
  const { data } = await supabase.from('ventas')
    .select('numero_formulario, fecha_servicio, venta_total, venta_neta, descuento, productos(nombre)')
    .eq('cliente_id', CLIENTE_ID)
    .gte('fecha_servicio', diasDesdeHoy(-60))
    .order('fecha_servicio', { ascending: false })

  const porProducto = {}
  ;(data || []).forEach(v => {
    const p = v.productos?.nombre || 'Sin especificar'
    if (!porProducto[p]) porProducto[p] = { cantidad: 0, total: 0 }
    porProducto[p].cantidad++
    porProducto[p].total += v.venta_total || 0
  })

  // Group by week
  const porSemana = {}
  ;(data || []).forEach(v => {
    const d = new Date(v.fecha_servicio)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1))
    const key = weekStart.toISOString().split('T')[0]
    if (!porSemana[key]) porSemana[key] = { total: 0, cantidad: 0 }
    porSemana[key].total += v.venta_total || 0
    porSemana[key].cantidad++
  })

  const rankingProductos = Object.entries(porProducto)
    .sort((a, b) => b[1].cantidad - a[1].cantidad)
    .slice(0, 5)
    .map(([nombre, d]) => ({ nombre, cantidad: d.cantidad, total_clp: d.total }))

  return {
    ultimos_60_dias_total: (data || []).length,
    ultimos_60_dias_monto: (data || []).reduce((s, v) => s + (v.venta_total || 0), 0),
    ranking_productos: rankingProductos,
    ventas_por_semana: Object.entries(porSemana)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([semana, d]) => ({ semana, total_clp: d.total, cantidad: d.cantidad })),
  }
}

async function fetchCheques() {
  const { data } = await supabase.from('cheques').select('*')
    .eq('cliente_id', CLIENTE_ID).order('vencimiento', { ascending: true })
  return (data || []).map(c => ({
    formulario: c.numero_formulario,
    monto: c.monto,
    numero_doc: c.numero_documento,
    vencimiento: c.vencimiento,
    estado: c.estado,
    dias_restantes: calcDias(c.vencimiento),
  }))
}

async function fetchInventario() {
  const { data } = await supabase.from('inventario')
    .select('stock_actual, stock_minimo, productos(nombre), sucursales(nombre)')
    .eq('cliente_id', CLIENTE_ID)
  return (data || []).map(r => ({
    producto: r.productos?.nombre || 'Desconocido',
    sucursal: r.sucursales?.nombre || 'General',
    stock_actual: r.stock_actual,
    stock_minimo: r.stock_minimo,
    estado: r.stock_actual === 0 ? 'SIN_STOCK' : r.stock_actual <= r.stock_minimo ? 'CRITICO' : 'NORMAL',
  }))
}

async function fetchCompras() {
  const { data } = await supabase.from('ordenes_compra')
    .select('fecha, estado, total, notas, proveedores(nombre)')
    .eq('cliente_id', CLIENTE_ID)
    .order('created_at', { ascending: false })
    .limit(10)
  return data || []
}

async function fetchFallecidos() {
  const { data } = await supabase.from('fallecidos')
    .select('numero_formulario, nombre, fecha_servicio, causa_muerte, comuna, edad')
    .eq('cliente_id', CLIENTE_ID)
    .order('fecha_servicio', { ascending: false })
    .limit(10)
  return data || []
}

async function fetchSucursales() {
  const { data } = await supabase.from('ventas')
    .select('venta_total, servicios(sucursal_id, sucursales(nombre))')
    .eq('cliente_id', CLIENTE_ID)
    .gte('fecha_servicio', inicioMes())

  const porSucursal = {}
  ;(data || []).forEach(v => {
    const nombre = v.servicios?.sucursales?.nombre || 'Sin sucursal'
    if (!porSucursal[nombre]) porSucursal[nombre] = { total: 0, cantidad: 0 }
    porSucursal[nombre].total += v.venta_total || 0
    porSucursal[nombre].cantidad++
  })

  return Object.entries(porSucursal)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([nombre, d]) => ({ sucursal: nombre, total_mes_clp: d.total, servicios: d.cantidad }))
}

async function fetchPagos() {
  const { data } = await supabase.from('formas_pago')
    .select('numero_formulario, fecha, venta_total, saldo_pendiente, efectivo, tarjeta, valor_cheques, monto_cuotas, valor_convenio')
    .eq('cliente_id', CLIENTE_ID)
    .eq('estado', 'pendiente')
    .gt('saldo_pendiente', 0)
  return data || []
}

// ─── Fetcher principal ──────────────────────────────────────────────────────
const FETCHERS = {
  base: fetchBase,
  servicios: fetchServicios,
  ventas: fetchVentas,
  cheques: fetchCheques,
  inventario: fetchInventario,
  compras: fetchCompras,
  fallecidos: fetchFallecidos,
  sucursales: fetchSucursales,
  pagos: fetchPagos,
}

export async function fetchContexto(modulos) {
  const resultados = await Promise.all(modulos.map(m => FETCHERS[m]?.() ?? Promise.resolve(null)))
  const ctx = {}
  modulos.forEach((m, i) => { if (resultados[i] !== null) ctx[m] = resultados[i] })
  return ctx
}
