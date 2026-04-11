import { useEffect, useState } from 'react'
import { supabase, CLIENTE_ID, clp } from '../lib/supabase'
import { AlertTriangle, Download, CheckCircle, Clock, XCircle, History, X, CreditCard, CheckSquare } from 'lucide-react'
import { exportarExcel } from '../lib/exportExcel'
import { SkeletonTabla } from '../components/SkeletonLoader'
import HistorialAuditoria from '../components/HistorialAuditoria'

function diasRestantes(fecha) {
  if (!fecha) return null
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const venc = new Date(fecha + 'T00:00:00')
  return Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24))
}

const BADGE_CHEQUE = {
  vigente: 'bg-blue-100 text-blue-700',
  vencido: 'bg-red-100 text-red-700',
  cobrado: 'bg-emerald-100 text-emerald-700',
}

const BADGE_CUOTA = {
  pendiente: 'bg-amber-100 text-amber-700',
  vencido:   'bg-red-100 text-red-700',
  pagado:    'bg-emerald-100 text-emerald-700',
}

// ── Sección Cheques ────────────────────────────────────────────────────────────
function SeccionCheques() {
  const [rows, setRows]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [filtro, setFiltro]           = useState('')
  const [historialItem, setHistorialItem] = useState(null)

  async function cargar() {
    const { data } = await supabase.from('cheques').select('*')
      .eq('cliente_id', CLIENTE_ID).order('numero_formulario', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  const filtrados  = rows.filter(r => !filtro || r.estado === filtro)
  const vigentes   = rows.filter(r => r.estado === 'vigente')
  const vencidos   = rows.filter(r => r.estado === 'vencido')
  const cobrados   = rows.filter(r => r.estado === 'cobrado')
  const porVencer  = vigentes.filter(r => { const d = diasRestantes(r.vencimiento); return d !== null && d <= 7 && d >= 0 })

  async function cambiarEstado(id, nuevoEstado) {
    const { error } = await supabase.from('cheques').update({ estado: nuevoEstado }).eq('id', id)
    if (error) return
    const cheque = rows.find(r => r.id === id)
    setRows(prev => prev.map(r => r.id === id ? { ...r, estado: nuevoEstado } : r))
    await supabase.rpc('registrar_auditoria', {
      p_accion: 'actualizar', p_modulo: 'cheques',
      p_descripcion: `Cheque del formulario #${cheque?.numero_formulario} marcado como "${nuevoEstado}"`,
      p_referencia_id: cheque?.numero_formulario,
    })
  }

  function exportar() {
    const datos = filtrados.map(r => ({
      'N° Formulario': r.numero_formulario,
      'Monto': r.monto,
      'N° Documento': r.numero_documento,
      'Vencimiento': r.vencimiento,
      'Días Restantes': diasRestantes(r.vencimiento) ?? '',
      'Estado': r.estado,
    }))
    exportarExcel(datos, 'Cheques', 'Cheques')
  }

  const KPI_CARDS = [
    { icon: Clock,         label: 'Vigentes',        value: `${vigentes.length}`,  sub: clp(vigentes.reduce((s,r)=>s+r.monto,0)),   gradient: 'from-blue-500 to-blue-600' },
    { icon: XCircle,       label: 'Vencidos',         value: `${vencidos.length}`,  sub: clp(vencidos.reduce((s,r)=>s+r.monto,0)),   gradient: 'from-red-500 to-red-600' },
    { icon: CheckCircle,   label: 'Cobrados',         value: `${cobrados.length}`,  sub: clp(cobrados.reduce((s,r)=>s+r.monto,0)),   gradient: 'from-emerald-500 to-emerald-600' },
    { icon: AlertTriangle, label: 'Por vencer (7d)',  value: `${porVencer.length}`, sub: clp(porVencer.reduce((s,r)=>s+r.monto,0)), gradient: 'from-amber-500 to-amber-600' },
  ]

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI_CARDS.map((k, i) => (
          <div key={i} className={`kpi-card bg-gradient-to-br ${k.gradient}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <k.icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white/70 text-xs font-medium truncate">{k.label}</p>
                <p className="text-white font-bold text-lg">{k.value}</p>
                <p className="text-white/60 text-xs text-money">{k.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerta por vencer */}
      {porVencer.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-amber-800 font-semibold text-sm">
              {porVencer.length} cheque{porVencer.length > 1 ? 's' : ''} vence{porVencer.length === 1 ? '' : 'n'} en los próximos 7 días
            </p>
            <p className="text-amber-600 text-xs mt-0.5">
              {porVencer.map(c => `#${c.numero_formulario} · ${clp(c.monto)} · ${diasRestantes(c.vencimiento)}d`).join(' — ')}
            </p>
          </div>
        </div>
      )}

      {/* Filtros + Exportar */}
      <div className="filtros-bar flex items-center gap-3">
        <select value={filtro} onChange={e => setFiltro(e.target.value)} className="input-base w-auto">
          <option value="">Todos</option>
          <option value="vigente">Vigentes</option>
          <option value="vencido">Vencidos</option>
          <option value="cobrado">Cobrados</option>
        </select>
        <button onClick={exportar} className="btn-excel ml-auto">
          <Download className="w-4 h-4" /> Excel
        </button>
      </div>

      {loading ? <SkeletonTabla filas={6} cols={6} /> : (
        <div className="tabla-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['N° Form.', 'Monto', 'N° Documento', 'Vencimiento', 'Días Restantes', 'Estado', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtrados.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">Sin cheques</td></tr>
                ) : filtrados.map(r => {
                  const dias = diasRestantes(r.vencimiento)
                  return (
                    <tr key={r.id} className="tabla-fila">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600">#{r.numero_formulario}</td>
                      <td className="px-4 py-3 font-medium text-money">{clp(r.monto)}</td>
                      <td className="px-4 py-3 text-slate-600">{r.numero_documento || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.vencimiento || '-'}</td>
                      <td className="px-4 py-3">
                        {dias === null ? '-' : (
                          <span className={`font-semibold text-sm ${dias < 0 ? 'text-red-600' : dias <= 7 ? 'text-amber-600' : 'text-slate-700'}`}>
                            {dias < 0 ? `Vencido hace ${Math.abs(dias)}d` : dias === 0 ? 'Vence hoy' : `${dias} días`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select value={r.estado} onChange={e => cambiarEstado(r.id, e.target.value)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer ${BADGE_CHEQUE[r.estado]}`}>
                          <option value="vigente">Vigente</option>
                          <option value="vencido">Vencido</option>
                          <option value="cobrado">Cobrado</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setHistorialItem(r)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Ver historial">
                          <History className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {historialItem && (
        <div className="modal-backdrop">
          <div className="modal-panel w-full max-w-lg">
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-slate-900">Historial del formulario</h3>
                  <p className="text-xs text-slate-400 mt-0.5">#{historialItem.numero_formulario}</p>
                </div>
                <button onClick={() => setHistorialItem(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                <HistorialAuditoria referenciaId={historialItem.numero_formulario} modulos={['cheques']} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Sección Cuotas ─────────────────────────────────────────────────────────────
function SeccionCuotas() {
  const [grupos, setGrupos]           = useState([]) // [{ fp, cliente, cuotas: [] }]
  const [loading, setLoading]         = useState(true)
  const [filtro, setFiltro]           = useState('')
  const [expandidos, setExpandidos]   = useState(new Set())

  async function cargar() {
    // 1. Formas de pago con cuotas
    const { data: fp } = await supabase.from('formas_pago')
      .select('id, numero_formulario, monto_cuotas, cuotas, fecha')
      .eq('cliente_id', CLIENTE_ID)
      .gt('monto_cuotas', 0)
      .order('numero_formulario', { ascending: false })

    if (!fp || fp.length === 0) { setGrupos([]); setLoading(false); return }

    // 2. Nombres de clientes
    const nums = fp.map(r => r.numero_formulario).filter(Boolean)
    const { data: svcs } = await supabase.from('servicios')
      .select('numero_formulario, nombre_cliente')
      .eq('cliente_id', CLIENTE_ID)
      .in('numero_formulario', nums)
    const clienteMap = {}
    ;(svcs || []).forEach(s => { clienteMap[s.numero_formulario] = s.nombre_cliente })

    // 3. Cuotas detalle existentes
    const fpIds = fp.map(r => r.id)
    const { data: detalle } = await supabase.from('cuotas_detalle')
      .select('*')
      .eq('cliente_id', CLIENTE_ID)
      .in('formas_pago_id', fpIds)
      .order('numero_cuota', { ascending: true })

    const detalleMap = {}
    ;(detalle || []).forEach(d => {
      if (!detalleMap[d.formas_pago_id]) detalleMap[d.formas_pago_id] = []
      detalleMap[d.formas_pago_id].push(d)
    })

    // 4. Lazy init: insertar cuotas_detalle faltantes
    const inserts = []
    for (const row of fp) {
      const existing = detalleMap[row.id] || []
      if (existing.length === 0 && row.cuotas > 0) {
        const montoCuota = Math.round((row.monto_cuotas || 0) / row.cuotas)
        for (let i = 1; i <= row.cuotas; i++) {
          inserts.push({
            cliente_id: CLIENTE_ID,
            formas_pago_id: row.id,
            numero_formulario: row.numero_formulario,
            numero_cuota: i,
            monto: montoCuota,
            estado: 'pendiente',
          })
        }
      }
    }
    if (inserts.length > 0) {
      const { data: nuevas } = await supabase.from('cuotas_detalle').insert(inserts).select()
      ;(nuevas || []).forEach(d => {
        if (!detalleMap[d.formas_pago_id]) detalleMap[d.formas_pago_id] = []
        detalleMap[d.formas_pago_id].push(d)
      })
    }

    // 5. Armar grupos
    setGrupos(fp.map(row => ({
      fp: row,
      cliente: clienteMap[row.numero_formulario] || '—',
      cuotas: (detalleMap[row.id] || []).sort((a, b) => a.numero_cuota - b.numero_cuota),
    })))
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  // Todas las cuotas individuales (para KPIs y filtrado)
  const todasCuotas = grupos.flatMap(g => g.cuotas)
  const pendientes  = todasCuotas.filter(c => c.estado === 'pendiente')
  const vencidas    = todasCuotas.filter(c => c.estado === 'vencido')
  const cobradas    = todasCuotas.filter(c => c.estado === 'cobrado')

  // Filtrar grupos: si hay filtro, solo mostrar grupos que tengan ≥1 cuota en ese estado
  const gruposFiltrados = !filtro
    ? grupos
    : grupos.filter(g => g.cuotas.some(c => c.estado === filtro))

  function toggleExpandir(id) {
    setExpandidos(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function cambiarEstadoCuota(cuotaId, nuevoEstado, numForm) {
    const { error } = await supabase.from('cuotas_detalle').update({ estado: nuevoEstado }).eq('id', cuotaId)
    if (error) return
    setGrupos(prev => prev.map(g => ({
      ...g,
      cuotas: g.cuotas.map(c => c.id === cuotaId ? { ...c, estado: nuevoEstado } : c),
    })))
    await supabase.rpc('registrar_auditoria', {
      p_accion: 'actualizar', p_modulo: 'formas_pago',
      p_descripcion: `Cuota marcada como "${nuevoEstado}" (formulario #${numForm})`,
      p_referencia_id: numForm,
    })
  }

  function exportar() {
    const datos = gruposFiltrados.flatMap(g =>
      g.cuotas
        .filter(c => !filtro || c.estado === filtro)
        .map(c => ({
          'N° Formulario': g.fp.numero_formulario,
          'Cliente':       g.cliente,
          'Cuota':         `${c.numero_cuota} / ${g.fp.cuotas}`,
          'Monto':         c.monto,
          'Estado':        c.estado,
        }))
    )
    exportarExcel(datos, 'Cuotas', 'Cuotas')
  }

  const KPI_CARDS = [
    { icon: Clock,       label: 'Pendientes', value: pendientes.length, sub: clp(pendientes.reduce((s,c)=>s+c.monto,0)), gradient: 'from-amber-500 to-amber-600' },
    { icon: XCircle,     label: 'Vencidas',   value: vencidas.length,   sub: clp(vencidas.reduce((s,c)=>s+c.monto,0)),   gradient: 'from-red-500 to-red-600' },
    { icon: CheckCircle, label: 'Cobradas',   value: cobradas.length,   sub: clp(cobradas.reduce((s,c)=>s+c.monto,0)),   gradient: 'from-emerald-500 to-emerald-600' },
  ]

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {KPI_CARDS.map((k, i) => (
          <div key={i} className={`kpi-card bg-gradient-to-br ${k.gradient}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <k.icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white/70 text-xs font-medium truncate">{k.label}</p>
                <p className="text-white font-bold text-lg">{k.value}</p>
                <p className="text-white/60 text-xs text-money">{k.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros + Exportar */}
      <div className="filtros-bar flex items-center gap-3">
        <select value={filtro} onChange={e => setFiltro(e.target.value)} className="input-base w-auto">
          <option value="">Todas</option>
          <option value="pendiente">Pendientes</option>
          <option value="vencido">Vencidas</option>
          <option value="cobrado">Cobradas</option>
        </select>
        <button onClick={exportar} className="btn-excel ml-auto">
          <Download className="w-4 h-4" /> Excel
        </button>
      </div>

      {loading ? <SkeletonTabla filas={5} cols={5} /> : (
        <div className="tabla-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide w-8"></th>
                  {['N° Form.', 'Cliente', 'Total cuotas', 'Progreso'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gruposFiltrados.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400">Sin cuotas registradas</td></tr>
                ) : gruposFiltrados.map(g => {
                  const abierto = expandidos.has(g.fp.id)
                  const nCobradas  = g.cuotas.filter(c => c.estado === 'cobrado').length
                  const nTotal     = g.cuotas.length
                  const cuotasFilt = filtro ? g.cuotas.filter(c => c.estado === filtro) : g.cuotas
                  return (
                    <>
                      {/* Fila cabecera del servicio */}
                      <tr key={g.fp.id}
                        className="tabla-fila cursor-pointer hover:bg-blue-50/40 border-b border-slate-100"
                        onClick={() => toggleExpandir(g.fp.id)}>
                        <td className="px-4 py-3 text-slate-400">
                          <span className={`inline-block transition-transform duration-150 ${abierto ? 'rotate-90' : ''}`}>▶</span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-blue-600">#{g.fp.numero_formulario}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{g.cliente}</td>
                        <td className="px-4 py-3 font-semibold text-money">{clp(g.fp.monto_cuotas)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 rounded-full h-1.5 min-w-[60px]">
                              <div className="bg-emerald-500 h-1.5 rounded-full transition-all"
                                style={{ width: nTotal > 0 ? `${Math.round((nCobradas/nTotal)*100)}%` : '0%' }} />
                            </div>
                            <span className="text-xs text-slate-500 whitespace-nowrap">{nCobradas}/{nTotal}</span>
                          </div>
                        </td>
                      </tr>

                      {/* Filas de cuotas individuales */}
                      {abierto && cuotasFilt.map(c => (
                        <tr key={c.id} className="bg-slate-50/60 border-b border-slate-100">
                          <td className="px-4 py-2.5"></td>
                          <td className="px-4 py-2.5 pl-8 text-slate-400 text-xs font-mono">
                            Cuota {c.numero_cuota}/{nTotal}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 text-xs"></td>
                          <td className="px-4 py-2.5 text-slate-700 text-money text-sm">{clp(c.monto)}</td>
                          <td className="px-4 py-2.5">
                            <select value={c.estado}
                              onChange={e => cambiarEstadoCuota(c.id, e.target.value, g.fp.numero_formulario)}
                              onClick={e => e.stopPropagation()}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer ${BADGE_CUOTA[c.estado] || 'bg-slate-100 text-slate-600'}`}>
                              <option value="pendiente">Pendiente</option>
                              <option value="vencido">Vencida</option>
                              <option value="cobrado">Cobrada</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────
const TABS = [
  { label: 'Cheques',  icon: CheckSquare },
  { label: 'Cuotas',   icon: CreditCard  },
]

export default function CuentasPorCobrar() {
  const [tab, setTab] = useState(0)

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Cuentas por cobrar</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map((t, i) => (
          <button key={t.label} onClick={() => setTab(i)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              tab === i ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 0 && <SeccionCheques />}
      {tab === 1 && <SeccionCuotas />}
    </div>
  )
}
