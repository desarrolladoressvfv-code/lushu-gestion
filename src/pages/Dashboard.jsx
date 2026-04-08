import { useEffect, useState, useCallback } from 'react'
import { supabase, CLIENTE_ID, clp } from '../lib/supabase'
import { hoyCL, haceNmesesCL } from '../lib/fecha'
import { ClipboardList, DollarSign, AlertTriangle, CheckSquare, Package, ShoppingCart, TrendingUp, Users, ArrowRight, Building2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SkeletonKPI, SkeletonGrafico, SkeletonTabla } from '../components/SkeletonLoader'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from 'recharts'

const PERIODOS = ['Diario', 'Semanal', 'Mensual', 'Anual']
const COLORES_PIE = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444']

const KPI_CONFIG = [
  { key: 'serviciosMes',    label: 'Servicios este mes',    icon: ClipboardList, ruta: '/servicios',   gradiente: 'from-blue-500 to-blue-700',    sombra: 'shadow-blue-500/30' },
  { key: 'ventasMes',       label: 'Ventas este mes',       icon: DollarSign,    ruta: '/ventas',       gradiente: 'from-emerald-500 to-emerald-700', sombra: 'shadow-emerald-500/30', dinero: true },
  { key: 'pagoPendiente',   label: 'Cobros pendientes',     icon: AlertTriangle, ruta: '/formas-pago',  gradiente: 'from-amber-500 to-orange-600',  sombra: 'shadow-amber-500/30',  dinero: true },
  { key: 'chequesPorVencer',label: 'Cheques por vencer',    icon: CheckSquare,   ruta: '/cheques',      gradiente: 'from-red-500 to-red-700',       sombra: 'shadow-red-500/30',    sub: 'Próximos 7 días' },
  { key: 'stockBajo',       label: 'Productos stock bajo',  icon: Package,       ruta: '/inventario',   gradiente: 'from-orange-500 to-orange-700', sombra: 'shadow-orange-500/30' },
  { key: 'ocPendientes',    label: 'OC pendientes',         icon: ShoppingCart,  ruta: '/compras',      gradiente: 'from-violet-500 to-violet-700', sombra: 'shadow-violet-500/30' },
  { key: 'fallecidosMes',   label: 'Fallecidos este mes',   icon: Users,         ruta: '/fallecidos',   gradiente: 'from-slate-500 to-slate-700',   sombra: 'shadow-slate-500/30' },
  { key: 'totalServicios',  label: 'Total servicios',       icon: TrendingUp,    ruta: '/servicios',    gradiente: 'from-cyan-500 to-cyan-700',     sombra: 'shadow-cyan-500/30' },
]

function getWeek(d) {
  const date = new Date(d); date.setHours(0,0,0,0)
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7)
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}

function formatFecha(fecha, periodo) {
  if (!fecha) return ''
  const d = new Date(fecha + 'T00:00:00')
  if (periodo === 'Diario') return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
  if (periodo === 'Semanal') return `Sem ${getWeek(d)}`
  if (periodo === 'Mensual') return d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' })
  return d.getFullYear().toString()
}

function agruparVentas(ventas, periodo) {
  const mapa = {}
  // Ordenar cronológicamente antes de agrupar para preservar orden de inserción
  const sorted = [...ventas].sort((a, b) => (a.fecha_servicio > b.fecha_servicio ? 1 : -1))
  sorted.forEach(v => {
    const key = formatFecha(v.fecha_servicio, periodo)
    if (!key) return
    if (!mapa[key]) mapa[key] = { fecha: key, total: 0, cantidad: 0 }
    mapa[key].total += v.venta_total || 0
    mapa[key].cantidad += 1
  })
  return Object.values(mapa).slice(-14)
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold">{p.name === 'Ventas ($)' ? clp(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [periodo, setPeriodo] = useState('Mensual')
  const [sucursales, setSucursales] = useState([])
  const [sucursalFiltro, setSucursalFiltro] = useState('')
  const [kpis, setKpis] = useState(null)
  const [ventasData, setVentasData] = useState([])
  const [productosData, setProductosData] = useState([])
  const [pagosData, setPagosData] = useState([])
  const [ultimosServicios, setUltimosServicios] = useState([])
  const [stockBajoItems, setStockBajoItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingGraf, setLoadingGraf] = useState(false)
  const [grafDesde, setGrafDesde] = useState('')
  const [grafHasta, setGrafHasta] = useState('')

  // Carga sucursales una sola vez
  useEffect(() => {
    supabase.from('sucursales').select('id,nombre').eq('cliente_id', CLIENTE_ID).eq('activo', true).order('nombre')
      .then(({ data }) => setSucursales(data || []))
  }, [])

  const cargar = useCallback(async (filtroSuc) => {
    setLoading(true)
    // M7: fechas en timezone Chile para evitar desfase UTC
    const hoy       = hoyCL()
    const [yy, mm]  = hoy.split('-').map(Number)
    const inicioMes = `${yy}-${String(mm).padStart(2, '0')}-01`
    const hace12m   = haceNmesesCL(12)
    const en7dDate  = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }))
    en7dDate.setDate(en7dDate.getDate() + 7)
    const en7d      = en7dDate.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })

    // Helper para tablas que tienen sucursal_id
    const conFiltro = (q) => filtroSuc ? q.eq('sucursal_id', filtroSuc) : q

    // Para tablas sin sucursal_id (cheques, fallecidos, formas_pago):
    // obtenemos los numero_formulario de esa sucursal y filtramos por ellos
    let formularios = null
    if (filtroSuc) {
      const { data: svcNums } = await supabase
        .from('servicios').select('numero_formulario')
        .eq('cliente_id', CLIENTE_ID).eq('sucursal_id', filtroSuc)
      formularios = (svcNums || []).map(s => s.numero_formulario)
    }
    const conFiltroForm = (q) => {
      if (formularios === null) return q
      if (formularios.length === 0) return q.in('numero_formulario', [-1])
      return q.in('numero_formulario', formularios)
    }

    const [
      { data: serviciosMes },
      { data: todasVentas },
      { data: pagos },
      { data: cheques },
      { data: inventario },
      { data: ultimosSvc },
      { data: ocPendientes },
      { data: fallecidosMes },
      { data: totalSvc },
    ] = await Promise.all([
      conFiltro(supabase.from('servicios').select('id').eq('cliente_id', CLIENTE_ID).gte('fecha_servicio', inicioMes)),
      // B1: limitado a últimos 12 meses
      conFiltro(supabase.from('ventas').select('venta_total, fecha_servicio, productos(nombre)').eq('cliente_id', CLIENTE_ID).gte('fecha_servicio', hace12m)),
      // formas_pago no tiene sucursal_id → filtrar por numero_formulario
      conFiltroForm(supabase.from('formas_pago').select('saldo_pendiente, efectivo, tarjeta, valor_convenio, valor_cheques, monto_cuotas').eq('cliente_id', CLIENTE_ID)),
      // cheques no tiene sucursal_id → filtrar por numero_formulario
      conFiltroForm(supabase.from('cheques').select('id, monto, vencimiento').eq('cliente_id', CLIENTE_ID).eq('estado', 'vigente').lte('vencimiento', en7d)),
      conFiltro(supabase.from('inventario').select('stock_actual, stock_minimo, producto_id, sucursal_id, productos(nombre), sucursales(nombre)').eq('cliente_id', CLIENTE_ID)),
      conFiltro(supabase.from('servicios').select('numero_formulario, fecha_servicio, nombre_cliente, productos(nombre), sucursales(nombre)').eq('cliente_id', CLIENTE_ID).order('created_at', { ascending: false }).limit(5)),
      filtroSuc
        ? supabase.from('ordenes_compra').select('id').eq('cliente_id', CLIENTE_ID).eq('estado', 'pendiente').eq('sucursal_id', filtroSuc)
        : supabase.from('ordenes_compra').select('id').eq('cliente_id', CLIENTE_ID).eq('estado', 'pendiente'),
      // fallecidos no tiene sucursal_id → filtrar por numero_formulario
      conFiltroForm(supabase.from('fallecidos').select('id').eq('cliente_id', CLIENTE_ID).gte('fecha_servicio', inicioMes)),
      filtroSuc
        ? supabase.from('servicios').select('id', { count: 'exact' }).eq('cliente_id', CLIENTE_ID).eq('sucursal_id', filtroSuc)
        : supabase.from('servicios').select('id', { count: 'exact' }).eq('cliente_id', CLIENTE_ID),
    ])

    const ventasMes = (todasVentas || []).filter(v => v.fecha_servicio >= inicioMes)
    const totalVentasMes = ventasMes.reduce((s, v) => s + (v.venta_total || 0), 0)
    const totalPendiente = (pagos || []).filter(p => (p.saldo_pendiente || 0) > 0).length
    const bajo = (inventario || []).filter(i => i.stock_actual <= i.stock_minimo)

    setKpis({
      serviciosMes: serviciosMes?.length || 0,
      ventasMes: totalVentasMes,
      pagoPendiente: totalPendiente,
      chequesPorVencer: cheques?.length || 0,
      stockBajo: bajo.length,
      ocPendientes: ocPendientes?.length || 0,
      fallecidosMes: fallecidosMes?.length || 0,
      totalServicios: totalSvc?.length || 0,
    })

    setVentasData(agruparVentas(todasVentas || [], periodo))

    const conteo = {}
    ;(todasVentas || []).forEach(v => {
      const n = v.productos?.nombre || 'Sin urna'
      conteo[n] = (conteo[n] || 0) + 1
    })
    setProductosData(
      Object.entries(conteo)
        .map(([nombre, cantidad]) => ({ nombre: nombre.split(' ').slice(0, 2).join(' '), cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad).slice(0, 6)
    )

    const ef = (pagos || []).reduce((s, p) => s + (p.efectivo || 0), 0)
    const tj = (pagos || []).reduce((s, p) => s + (p.tarjeta || 0), 0)
    const cv = (pagos || []).reduce((s, p) => s + (p.valor_convenio || 0), 0)
    const ch = (pagos || []).reduce((s, p) => s + (p.valor_cheques || 0), 0)
    const cu = (pagos || []).reduce((s, p) => s + (p.monto_cuotas || 0), 0)
    setPagosData([
      { name: 'Efectivo', value: ef },
      { name: 'Tarjeta', value: tj },
      { name: 'Convenio', value: cv },
      { name: 'Cheques', value: ch },
      { name: 'Cuotas', value: cu },
    ].filter(d => d.value > 0))

    setUltimosServicios(ultimosSvc || [])
    setStockBajoItems(bajo)
    setLoading(false)
  }, [periodo])

  useEffect(() => { cargar(sucursalFiltro) }, [sucursalFiltro])

  // Recarga gráfico de ventas al cambiar período o rango de fechas
  useEffect(() => {
    if (loading) return
    setLoadingGraf(true)
    const hace12mGraf = haceNmesesCL(12)
    let q = supabase.from('ventas').select('venta_total, fecha_servicio')
      .eq('cliente_id', CLIENTE_ID)
    if (sucursalFiltro) q = q.eq('sucursal_id', sucursalFiltro)
    // Si hay rango manual lo usa; si no, últimos 12 meses
    if (grafDesde) q = q.gte('fecha_servicio', grafDesde)
    else q = q.gte('fecha_servicio', hace12mGraf)
    if (grafHasta) q = q.lte('fecha_servicio', grafHasta)
    q.then(({ data }) => { setVentasData(agruparVentas(data || [], periodo)); setLoadingGraf(false) })
  }, [periodo, grafDesde, grafHasta, sucursalFiltro])

  const formatKpiValue = (cfg) => {
    if (!kpis) return '—'
    const v = kpis[cfg.key]
    if (cfg.dinero) return clp(v)
    return v
  }

  const nombreSucursalActual = sucursalFiltro
    ? sucursales.find(s => s.id === sucursalFiltro)?.nombre || 'Sucursal'
    : 'General'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Santiago' })}
          </p>
        </div>

        {/* Selector de sucursal */}
        {sucursales.length > 0 && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setSucursalFiltro('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                  !sucursalFiltro ? 'bg-white shadow text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700'
                }`}>
                General
              </button>
              {sucursales.map(s => (
                <button key={s.id}
                  onClick={() => setSucursalFiltro(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                    sucursalFiltro === s.id ? 'bg-white shadow text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {s.nombre}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {KPI_CONFIG.map((cfg, i) =>
          loading ? <SkeletonKPI key={cfg.key} /> : (
            <button key={cfg.key} onClick={() => navigate(cfg.ruta)}
              className={`kpi-card bg-gradient-to-br ${cfg.gradiente} shadow-lg ${cfg.sombra} text-left fade-in-up`}
              style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <cfg.icon className="w-5 h-5 text-white" />
                </div>
                <ArrowRight className="w-4 h-4 text-white/50" />
              </div>
              <p className="text-white/70 text-xs font-medium mb-1 truncate">{cfg.label}</p>
              <p className="text-white text-xl sm:text-2xl font-bold truncate">{formatKpiValue(cfg)}</p>
              {cfg.sub && <p className="text-white/60 text-xs mt-0.5">{cfg.sub}</p>}
            </button>
          )
        )}
      </div>

      {/* Gráfico de ventas */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="flex flex-col gap-3 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-800">Evolución de Ventas</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {sucursalFiltro ? `Sucursal: ${nombreSucursalActual}` : 'Todas las sucursales'}
              </p>
            </div>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
              {PERIODOS.map(p => (
                <button key={p} onClick={() => setPeriodo(p)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    periodo === p ? 'bg-white shadow text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          {/* Filtro por rango de fechas */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Rango:</span>
            <input type="date" value={grafDesde} onChange={e => setGrafDesde(e.target.value)}
              className="input-base text-xs py-1.5 w-36" title="Desde" />
            <span className="text-xs text-slate-400">—</span>
            <input type="date" value={grafHasta} onChange={e => setGrafHasta(e.target.value)}
              className="input-base text-xs py-1.5 w-36" title="Hasta" />
            {(grafDesde || grafHasta) && (
              <button onClick={() => { setGrafDesde(''); setGrafHasta('') }}
                className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors">
                Limpiar
              </button>
            )}
          </div>
        </div>
        {loading || loadingGraf ? <div className="skeleton h-52 rounded-xl" /> :
         ventasData.length === 0 ? (
           <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Sin datos para mostrar</div>
         ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={ventasData}>
              <defs>
                <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total" name="Ventas ($)" stroke="#3b82f6" strokeWidth={2.5}
                fill="url(#gradVentas)" dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Gráficos secundarios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h2 className="font-bold text-slate-800 mb-0.5">Urnas Más Vendidas</h2>
          <p className="text-xs text-slate-400 mb-4">
            {sucursalFiltro ? nombreSucursalActual : 'Todas las sucursales'}
          </p>
          {loading ? <div className="skeleton h-52 rounded-xl" /> :
           productosData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Sin datos</div>
           ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={productosData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10, fill: '#64748b' }} width={85} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cantidad" name="Servicios" radius={[0, 6, 6, 0]}>
                  {productosData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${210 + i * 15}, 80%, ${55 + i * 3}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h2 className="font-bold text-slate-800 mb-0.5">Formas de Pago</h2>
          <p className="text-xs text-slate-400 mb-4">
            {sucursalFiltro ? nombreSucursalActual : 'Distribución acumulada total'}
          </p>
          {loading ? <div className="skeleton h-52 rounded-xl" /> :
           pagosData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Sin datos</div>
           ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pagosData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" nameKey="name" paddingAngle={3}>
                  {pagosData.map((_, i) => <Cell key={i} fill={COLORES_PIE[i % COLORES_PIE.length]} />)}
                </Pie>
                <Tooltip formatter={v => clp(v)} />
                <Legend formatter={v => <span className="text-xs text-slate-600">{v}</span>} iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Últimos servicios + Stock bajo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-slate-800">Últimos Servicios</h2>
              {sucursalFiltro && <p className="text-xs text-slate-400 mt-0.5">{nombreSucursalActual}</p>}
            </div>
            <button onClick={() => navigate('/servicios')} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? <SkeletonTabla filas={4} cols={3} /> :
           ultimosServicios.length === 0 ? (
            <p className="text-slate-400 text-sm py-6 text-center">Sin servicios registrados.</p>
           ) : (
            <div className="space-y-2">
              {ultimosServicios.map(s => (
                <div key={s.numero_formulario} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-700 text-xs font-bold">#{s.numero_formulario}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-800 truncate">{s.nombre_cliente}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {s.productos?.nombre || '-'}
                      {s.sucursales?.nombre && <span className="ml-1.5 text-slate-300">· {s.sucursales.nombre}</span>}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">{s.fecha_servicio}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-slate-800">Alertas de Stock Bajo</h2>
              {sucursalFiltro && <p className="text-xs text-slate-400 mt-0.5">{nombreSucursalActual}</p>}
            </div>
            <button onClick={() => navigate('/inventario')} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              Ver stock <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? <SkeletonTabla filas={3} cols={2} /> :
           stockBajoItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-emerald-700 text-sm font-medium">Inventario en niveles normales</p>
            </div>
           ) : (
            <div className="space-y-2">
              {stockBajoItems.map((item, i) => (
                <div key={`${item.producto_id}-${i}`} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-red-800 truncate block">{item.productos?.nombre}</span>
                      {item.sucursales?.nombre && (
                        <span className="text-xs text-red-400">{item.sucursales.nombre}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className="text-sm font-bold text-red-700">{item.stock_actual}</span>
                    <span className="text-xs text-red-400"> / {item.stock_minimo}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
