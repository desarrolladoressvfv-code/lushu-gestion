import { useEffect, useState } from 'react'
import { supabase, CLIENTE_ID, clp } from '../lib/supabase'
import { hoyCL } from '../lib/fecha'
import {
  ClipboardList, DollarSign, CheckSquare, Package, ShoppingCart,
  TrendingUp, ArrowRight, Calendar, ChevronDown,
  CreditCard, Award, Archive, Banknote,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SkeletonKPI, SkeletonTabla } from '../components/SkeletonLoader'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from 'recharts'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const PERIODOS = ['Diario', 'Semanal', 'Mensual']
const COLORES_PIE = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444']

const KPI_CONFIG = [
  { key: 'servicios',       label: 'Servicios',           icon: ClipboardList, ruta: '/servicios',   gradiente: 'from-blue-500 to-blue-700',       sombra: 'shadow-blue-500/30' },
  { key: 'ventas',          label: 'Ventas',              icon: DollarSign,    ruta: '/ventas',       gradiente: 'from-emerald-500 to-emerald-700', sombra: 'shadow-emerald-500/30', dinero: true },
  { key: 'cheques',         label: 'Cheques por cobrar',  icon: CheckSquare,   ruta: '/cheques',      gradiente: 'from-red-500 to-red-700',         sombra: 'shadow-red-500/30',    sub: 'Próximos 7 días' },
  { key: 'cuotasPorCobrar', label: 'Cuotas por cobrar',  icon: CreditCard,    ruta: '/formas-pago',  gradiente: 'from-amber-500 to-orange-600',    sombra: 'shadow-amber-500/30',  dinero: true },
  { key: 'ocPendientes',    label: 'OC pendientes',       icon: ShoppingCart,  ruta: '/compras',      gradiente: 'from-violet-500 to-violet-700',   sombra: 'shadow-violet-500/30' },
  { key: 'ticketPromedio',  label: 'Ticket promedio',     icon: TrendingUp,    ruta: '/ventas',       gradiente: 'from-cyan-500 to-cyan-700',       sombra: 'shadow-cyan-500/30',   dinero: true },
  { key: 'urnaTop',         label: 'Urna más vendida',    icon: Award,         ruta: '/ventas',       gradiente: 'from-pink-500 to-rose-600',       sombra: 'shadow-pink-500/30',   texto: true },
  { key: 'stockMinimo',     label: 'Stock mínimo',        icon: Package,       ruta: '/inventario',   gradiente: 'from-orange-500 to-orange-700',   sombra: 'shadow-orange-500/30' },
  { key: 'stockTotal',      label: 'Productos en stock',  icon: Archive,       ruta: '/inventario',   gradiente: 'from-teal-500 to-teal-700',       sombra: 'shadow-teal-500/30',   sub: 'unidades totales' },
  { key: 'valorInventario', label: 'Valor inventario',    icon: Banknote,      ruta: '/inventario',   gradiente: 'from-indigo-500 to-indigo-700',   sombra: 'shadow-indigo-500/30', dinero: true },
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
  if (periodo === 'Diario')  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
  if (periodo === 'Semanal') return `Sem ${getWeek(d)}`
  if (periodo === 'Mensual') return d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' })
  return d.getFullYear().toString()
}

function agruparVentas(ventas, periodo) {
  const mapa = {}
  const sorted = [...ventas].sort((a, b) => (a.fecha_servicio > b.fecha_servicio ? 1 : -1))
  sorted.forEach(v => {
    const key = formatFecha(v.fecha_servicio, periodo)
    if (!key) return
    if (!mapa[key]) mapa[key] = { fecha: key, total: 0, cantidad: 0 }
    mapa[key].total    += v.venta_total || 0
    mapa[key].cantidad += 1
  })
  return Object.values(mapa).slice(-31)
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
  const navigate   = useNavigate()
  const añoActual  = parseInt(hoyCL().split('-')[0])

  const [periodo, setPeriodo]               = useState('Mensual')
  const [sucursales, setSucursales]         = useState([])
  const [sucursalFiltro, setSucursalFiltro] = useState('')
  const [añoFiltro, setAñoFiltro]           = useState(añoActual)
  const [mesFiltro, setMesFiltro]           = useState('')
  const [añoCreacion, setAñoCreacion]       = useState(añoActual)
  const [dropdownAbierto, setDropdownAbierto] = useState(false)

  const [kpis, setKpis]                         = useState(null)
  const [ventasData, setVentasData]             = useState([])
  const [productosData, setProductosData]       = useState([])
  const [pagosData, setPagosData]               = useState([])
  const [ultimosServicios, setUltimosServicios] = useState([])
  const [stockBajoItems, setStockBajoItems]     = useState([])
  const [loading, setLoading]                   = useState(true)

  const años = Array.from(
    { length: añoActual - añoCreacion + 1 },
    (_, i) => añoCreacion + i
  )

  useEffect(() => {
    supabase.from('sucursales').select('id,nombre')
      .eq('cliente_id', CLIENTE_ID).eq('activo', true).order('nombre')
      .then(({ data }) => setSucursales(data || []))

    supabase.from('clientes').select('created_at')
      .eq('id', CLIENTE_ID).single()
      .then(({ data }) => {
        if (data?.created_at) setAñoCreacion(new Date(data.created_at).getFullYear())
      })
  }, [])

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      setLoading(true)

      let desdeQuery, hastaQuery
      if (mesFiltro) {
        const m         = parseInt(mesFiltro)
        const ultimoDia = new Date(añoFiltro, m, 0).toLocaleDateString('en-CA')
        desdeQuery = `${añoFiltro}-${mesFiltro}-01`
        hastaQuery = ultimoDia
      } else {
        desdeQuery = `${añoFiltro}-01-01`
        hastaQuery = `${añoFiltro}-12-31`
      }

      const en7dDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }))
      en7dDate.setDate(en7dDate.getDate() + 7)
      const en7d = en7dDate.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })

      const filtroSuc = sucursalFiltro
      const conFiltro = (q) => filtroSuc ? q.eq('sucursal_id', filtroSuc) : q

      let formulariosSuc = null
      if (filtroSuc) {
        const { data: svcAll } = await supabase
          .from('servicios').select('numero_formulario')
          .eq('cliente_id', CLIENTE_ID).eq('sucursal_id', filtroSuc)
        formulariosSuc = (svcAll || []).map(s => s.numero_formulario)
      }
      const conFiltroFormSuc = (q) => {
        if (formulariosSuc === null) return q
        if (formulariosSuc.length === 0) return q.in('numero_formulario', [-1])
        return q.in('numero_formulario', formulariosSuc)
      }

      if (cancelado) return

      const [
        { data: serviciosData },
        { data: todasVentas },
        { data: pagos },
        { data: cheques },
        { data: inventario },
        { data: ultimosSvc },
        { data: ocPendientes },
      ] = await Promise.all([
        conFiltro(supabase.from('servicios').select('id')
          .eq('cliente_id', CLIENTE_ID)
          .gte('fecha_servicio', desdeQuery).lte('fecha_servicio', hastaQuery)),

        conFiltro(supabase.from('ventas').select('venta_total, fecha_servicio, productos(nombre)')
          .eq('cliente_id', CLIENTE_ID)
          .gte('fecha_servicio', desdeQuery).lte('fecha_servicio', hastaQuery)),

        conFiltroFormSuc(supabase.from('formas_pago')
          .select('saldo_pendiente, efectivo, tarjeta, valor_convenio, valor_cheques, monto_cuotas, estado')
          .eq('cliente_id', CLIENTE_ID)),

        conFiltroFormSuc(supabase.from('cheques')
          .select('id, monto, vencimiento')
          .eq('cliente_id', CLIENTE_ID).eq('estado', 'vigente').lte('vencimiento', en7d)),

        conFiltro(supabase.from('inventario')
          .select('stock_actual, stock_minimo, producto_id, sucursal_id, productos(nombre, precio), sucursales(nombre)')
          .eq('cliente_id', CLIENTE_ID)),

        conFiltro(supabase.from('servicios')
          .select('numero_formulario, fecha_servicio, nombre_cliente, productos(nombre), sucursales(nombre)')
          .eq('cliente_id', CLIENTE_ID)
          .gte('fecha_servicio', desdeQuery).lte('fecha_servicio', hastaQuery)
          .order('created_at', { ascending: false }).limit(5)),

        conFiltro(supabase.from('ordenes_compra').select('id')
          .eq('cliente_id', CLIENTE_ID).eq('estado', 'pendiente')),
      ])

      if (cancelado) return

      const totalVentas     = (todasVentas || []).reduce((s, v) => s + (v.venta_total || 0), 0)
      const countServicios  = serviciosData?.length || 0
      const bajo            = (inventario || []).filter(i => i.stock_actual <= i.stock_minimo)
      const stockTotal      = (inventario || []).reduce((s, i) => s + (i.stock_actual || 0), 0)
      const valorInventario = (inventario || []).reduce((s, i) => s + ((i.stock_actual || 0) * (i.productos?.precio || 0)), 0)

      // Cuotas por cobrar: solo formas_pago con monto_cuotas > 0 y estado distinto de 'pagado'
      const cuotasPorCobrar = (pagos || [])
        .filter(p => (p.monto_cuotas || 0) > 0 && p.estado !== 'pagado')
        .reduce((s, p) => s + (p.monto_cuotas || 0), 0)

      // Ticket promedio del período
      const ticketPromedio = countServicios > 0 ? Math.round(totalVentas / countServicios) : 0

      // Urna más vendida del período
      const conteo = {}
      ;(todasVentas || []).forEach(v => {
        const n = v.productos?.nombre || null
        if (!n) return
        conteo[n] = (conteo[n] || 0) + 1
      })
      const productosOrdenados = Object.entries(conteo)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
      const urnaTop = productosOrdenados[0]?.nombre || '—'

      setKpis({
        servicios:       countServicios,
        ventas:          totalVentas,
        cheques:         cheques?.length        || 0,
        cuotasPorCobrar: cuotasPorCobrar,
        ocPendientes:    ocPendientes?.length   || 0,
        ticketPromedio:  ticketPromedio,
        urnaTop:         urnaTop,
        stockMinimo:     bajo.length,
        stockTotal:      stockTotal,
        valorInventario: valorInventario,
      })

      setVentasData(agruparVentas(todasVentas || [], periodo))
      setProductosData(
        productosOrdenados
          .map(({ nombre, cantidad }) => ({ nombre: nombre.split(' ').slice(0, 2).join(' '), cantidad }))
          .slice(0, 6)
      )

      const ef = (pagos || []).reduce((s, p) => s + (p.efectivo       || 0), 0)
      const tj = (pagos || []).reduce((s, p) => s + (p.tarjeta        || 0), 0)
      const cv = (pagos || []).reduce((s, p) => s + (p.valor_convenio || 0), 0)
      const ch = (pagos || []).reduce((s, p) => s + (p.valor_cheques  || 0), 0)
      const cu = (pagos || []).reduce((s, p) => s + (p.monto_cuotas   || 0), 0)
      setPagosData([
        { name: 'Efectivo', value: ef },
        { name: 'Tarjeta',  value: tj },
        { name: 'Convenio', value: cv },
        { name: 'Cheques',  value: ch },
        { name: 'Cuotas',   value: cu },
      ].filter(d => d.value > 0))

      setUltimosServicios(ultimosSvc || [])
      setStockBajoItems(bajo)
      setLoading(false)
    }

    cargar()
    return () => { cancelado = true }
  }, [sucursalFiltro, periodo, mesFiltro, añoFiltro])

  const formatKpiValue = (cfg) => {
    if (!kpis) return '—'
    const v = kpis[cfg.key]
    if (cfg.texto) return v
    return cfg.dinero ? clp(v) : v
  }

  const nombreSucursalActual = sucursalFiltro
    ? sucursales.find(s => s.id === sucursalFiltro)?.nombre || 'Sucursal'
    : 'Todas las sucursales'

  const periodoLabel = mesFiltro
    ? `${MESES[parseInt(mesFiltro) - 1]} ${añoFiltro}`
    : `Año ${añoFiltro}`

  const labelBoton = mesFiltro
    ? `${MESES[parseInt(mesFiltro) - 1]} ${añoFiltro}`
    : `Año ${añoFiltro}`

  return (
    <div className="space-y-6">

      {/* ── Header + Filtros ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Santiago' })}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {sucursales.length > 0 && (
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setSucursalFiltro('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                  !sucursalFiltro ? 'bg-white shadow text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700'
                }`}>
                General
              </button>
              {sucursales.map(s => (
                <button key={s.id} onClick={() => setSucursalFiltro(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                    sucursalFiltro === s.id ? 'bg-white shadow text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {s.nombre}
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => setDropdownAbierto(v => !v)}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-400 shadow-sm px-3.5 py-2 rounded-xl text-sm font-medium text-slate-700 transition-all duration-150 whitespace-nowrap">
              <Calendar className="w-4 h-4 text-blue-500" />
              {labelBoton}
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${dropdownAbierto ? 'rotate-180' : ''}`} />
            </button>

            {dropdownAbierto && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownAbierto(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 w-72">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Año</p>
                  <div className="flex gap-1.5 flex-wrap mb-4">
                    {años.map(a => (
                      <button key={a}
                        onClick={() => { setAñoFiltro(a); setMesFiltro('') }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                          añoFiltro === a
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}>
                        {a}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Período</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={() => { setMesFiltro(''); setDropdownAbierto(false) }}
                      className={`col-span-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                        !mesFiltro
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}>
                      Año completo
                    </button>

                    {MESES.map((m, i) => {
                      const val = String(i + 1).padStart(2, '0')
                      return (
                        <button key={i}
                          onClick={() => { setMesFiltro(val); setDropdownAbierto(false) }}
                          className={`py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                            mesFiltro === val
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}>
                          {m}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── KPIs (10 cards: 2 filas × 5 columnas) ───────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {KPI_CONFIG.map((cfg, i) =>
          loading ? <SkeletonKPI key={cfg.key} /> : (
            <button key={cfg.key} onClick={() => navigate(cfg.ruta)}
              className={`kpi-card bg-gradient-to-br ${cfg.gradiente} shadow-lg ${cfg.sombra} text-left fade-in-up`}
              style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <cfg.icon className="w-4 h-4 text-white" />
                </div>
                <ArrowRight className="w-4 h-4 text-white/50" />
              </div>
              <p className="text-white/70 text-xs font-medium mb-1 truncate">{cfg.label}</p>
              <p className={`text-white font-bold truncate ${cfg.texto ? 'text-sm leading-tight' : 'text-xl sm:text-2xl'}`}>
                {formatKpiValue(cfg)}
              </p>
              {cfg.sub && <p className="text-white/60 text-xs mt-0.5">{cfg.sub}</p>}
            </button>
          )
        )}
      </div>

      {/* ── Gráfico evolución de ventas ──────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="font-bold text-slate-800">Evolución de Ventas</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {periodoLabel} · {nombreSucursalActual}
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

        {loading ? <div className="skeleton h-52 rounded-xl" /> :
         ventasData.length === 0 ? (
           <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Sin datos para mostrar</div>
         ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={ventasData}>
              <defs>
                <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
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

      {/* ── Gráficos secundarios ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h2 className="font-bold text-slate-800 mb-0.5">Urnas Más Vendidas</h2>
          <p className="text-xs text-slate-400 mb-4">{periodoLabel} · {nombreSucursalActual}</p>
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
          <p className="text-xs text-slate-400 mb-4">{nombreSucursalActual} · distribución acumulada</p>
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

      {/* ── Últimos servicios + Stock bajo ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-slate-800">Últimos Servicios</h2>
              <p className="text-xs text-slate-400 mt-0.5">{periodoLabel} · {nombreSucursalActual}</p>
            </div>
            <button onClick={() => navigate('/servicios')} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? <SkeletonTabla filas={4} cols={3} /> :
           ultimosServicios.length === 0 ? (
            <p className="text-slate-400 text-sm py-6 text-center">Sin servicios en el período.</p>
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
