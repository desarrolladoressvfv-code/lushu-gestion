import { useEffect, useState } from 'react'
import { supabase, CLIENTE_ID, clp } from '../lib/supabase'
import { Search, Download, TrendingUp, Award, BarChart2, Building2 } from 'lucide-react'
import { exportarExcel } from '../lib/exportExcel'
import { SkeletonTabla } from '../components/SkeletonLoader'
import { useEmpresa } from '../context/EmpresaContext'

export default function Ventas() {
  const { logoUrl, nombreEmpresa } = useEmpresa()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [sucursales, setSucursales] = useState([])
  const [sucursalFiltro, setSucursalFiltro] = useState('')

  useEffect(() => {
    supabase.from('sucursales').select('id,nombre').eq('cliente_id', CLIENTE_ID).eq('activo', true).order('nombre')
      .then(({ data }) => setSucursales(data || []))
  }, [])

  useEffect(() => {
    let q = supabase.from('ventas').select('*, productos(nombre), sucursales(nombre)')
      .eq('cliente_id', CLIENTE_ID).order('numero_formulario', { ascending: false })
    if (desde) q = q.gte('fecha_servicio', desde)
    if (hasta) q = q.lte('fecha_servicio', hasta)
    if (sucursalFiltro) q = q.eq('sucursal_id', sucursalFiltro)
    q.then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [desde, hasta, sucursalFiltro])

  const filtrados = rows.filter(r =>
    String(r.numero_formulario).includes(busqueda) ||
    r.productos?.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const totales = filtrados.reduce((acc, r) => ({
    total: acc.total + (r.total || 0),
    descuento: acc.descuento + (r.descuento || 0),
    venta_neta: acc.venta_neta + (r.venta_neta || 0),
    iva: acc.iva + (r.iva || 0),
    venta_total: acc.venta_total + (r.venta_total || 0),
  }), { total: 0, descuento: 0, venta_neta: 0, iva: 0, venta_total: 0 })

  const promedio = filtrados.length > 0 ? Math.round(totales.venta_total / filtrados.length) : 0

  const conteoUrnas = {}
  filtrados.forEach(r => {
    const n = r.productos?.nombre || 'Sin urna'
    conteoUrnas[n] = (conteoUrnas[n] || 0) + 1
  })
  const urnaMasVendida = Object.entries(conteoUrnas).sort((a, b) => b[1] - a[1])[0]

  function exportar() {
    const datos = filtrados.map(r => ({
      'N° Formulario':  r.numero_formulario,
      'Fecha':          r.fecha_servicio,
      'Urna':           r.productos?.nombre  || '',
      'Sucursal':       r.sucursales?.nombre || '',
      'Valor Servicio': r.valor_servicio,
      'Valor Adicional':r.valor_adicional,
      'Total':          r.total,
      'Descuento':      r.descuento,
      'Venta Neta':     r.venta_neta,
      'IVA':            r.iva,
      'Venta Total':    r.venta_total,
    }))
    exportarExcel(datos, 'Ventas', 'Ventas', logoUrl, nombreEmpresa)
  }

  const KPI_CARDS = [
    { icon: TrendingUp, label: 'Venta Total', value: clp(totales.venta_total), gradient: 'from-blue-500 to-blue-600' },
    { icon: BarChart2, label: 'Venta Neta', value: clp(totales.venta_neta), gradient: 'from-emerald-500 to-emerald-600' },
    { icon: TrendingUp, label: 'Ticket Promedio', value: clp(promedio), gradient: 'from-violet-500 to-violet-600' },
    { icon: Award, label: 'Urna más vendida', value: urnaMasVendida ? `${urnaMasVendida[0]} (${urnaMasVendida[1]})` : '—', gradient: 'from-amber-500 to-amber-600' },
  ]

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Ventas</h1>
        <div className="flex items-center gap-3 flex-wrap">
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
          <span className="text-sm text-slate-500">{filtrados.length} registros</span>
          <button onClick={exportar} className="btn-excel">
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI_CARDS.map((k, i) => (
          <div key={i} className={`kpi-card bg-gradient-to-br ${k.gradient}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <k.icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white/70 text-xs font-medium truncate">{k.label}</p>
                <p className="text-white font-bold text-sm truncate">{k.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Totales detallados */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', val: totales.total },
          { label: 'Descuento', val: totales.descuento },
          { label: 'Venta Neta', val: totales.venta_neta },
          { label: 'IVA', val: totales.iva },
          { label: 'Venta Total', val: totales.venta_total },
        ].map(t => (
          <div key={t.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">{t.label}</p>
            <p className="text-sm font-bold text-slate-900 mt-1 text-money">{clp(t.val)}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="filtros-bar flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="input-base pl-9 w-48"
            placeholder="Buscar..." />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 font-medium">Desde:</span>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="input-base w-auto" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 font-medium">Hasta:</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="input-base w-auto" />
        </div>
      </div>

      {loading ? <SkeletonTabla filas={6} cols={6} /> : (
        <div className="tabla-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['N° Form.', 'Fecha', 'Urna', 'Sucursal', 'Valor Servicio', 'Val. Adicional', 'Total', 'Descuento', 'Venta Neta', 'IVA', 'Venta Total'].map(h => (
                    <th key={h} className={`px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap ${['Valor Servicio','Val. Adicional','Total','Descuento','Venta Neta','IVA','Venta Total'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtrados.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-10 text-slate-400">Sin registros</td></tr>
                ) : filtrados.map(r => (
                  <tr key={r.id} className="tabla-fila">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600">#{r.numero_formulario}</td>
                    <td className="px-4 py-3 text-slate-600">{r.fecha_servicio}</td>
                    <td className="px-4 py-3 text-slate-700">{r.productos?.nombre || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{r.sucursales?.nombre || '-'}</td>
                    <td className="px-4 py-3 text-right text-money">{clp(r.valor_servicio)}</td>
                    <td className="px-4 py-3 text-right text-money">{clp(r.valor_adicional)}</td>
                    <td className="px-4 py-3 text-right text-money">{clp(r.total)}</td>
                    <td className="px-4 py-3 text-right text-red-600 text-money">{clp(r.descuento)}</td>
                    <td className="px-4 py-3 text-right font-medium text-money">{clp(r.venta_neta)}</td>
                    <td className="px-4 py-3 text-right text-slate-500 text-money">{clp(r.iva)}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700 text-money">{clp(r.venta_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
