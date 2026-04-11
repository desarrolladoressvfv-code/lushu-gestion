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
  const [rows, setRows]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [filtro, setFiltro]           = useState('')
  const [historialItem, setHistorialItem] = useState(null)

  async function cargar() {
    const { data: fp } = await supabase.from('formas_pago')
      .select('id, numero_formulario, monto_cuotas, cuotas, estado, fecha')
      .eq('cliente_id', CLIENTE_ID)
      .gt('monto_cuotas', 0)
      .order('numero_formulario', { ascending: false })

    if (!fp || fp.length === 0) { setRows([]); setLoading(false); return }

    const nums = fp.map(r => r.numero_formulario).filter(Boolean)
    const { data: svcs } = await supabase.from('servicios')
      .select('numero_formulario, nombre_cliente')
      .eq('cliente_id', CLIENTE_ID)
      .in('numero_formulario', nums)

    const clienteMap = {}
    ;(svcs || []).forEach(s => { clienteMap[s.numero_formulario] = s.nombre_cliente })

    setRows(fp.map(r => ({ ...r, nombre_cliente: clienteMap[r.numero_formulario] || '—' })))
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  const filtrados  = rows.filter(r => !filtro || r.estado === filtro)
  const pendientes = rows.filter(r => r.estado === 'pendiente')
  const vencidos   = rows.filter(r => r.estado === 'vencido')
  const pagados    = rows.filter(r => r.estado === 'pagado')

  const montoPendiente = pendientes.reduce((s,r)=>s+(r.monto_cuotas||0),0)
  const montoVencido   = vencidos.reduce((s,r)=>s+(r.monto_cuotas||0),0)
  const montoPagado    = pagados.reduce((s,r)=>s+(r.monto_cuotas||0),0)

  async function cambiarEstado(id, nuevoEstado) {
    const { error } = await supabase.from('formas_pago').update({ estado: nuevoEstado }).eq('id', id)
    if (error) return
    const cuota = rows.find(r => r.id === id)
    setRows(prev => prev.map(r => r.id === id ? { ...r, estado: nuevoEstado } : r))
    await supabase.rpc('registrar_auditoria', {
      p_accion: 'actualizar', p_modulo: 'formas_pago',
      p_descripcion: `Cuotas del formulario #${cuota?.numero_formulario} marcadas como "${nuevoEstado}"`,
      p_referencia_id: cuota?.numero_formulario,
    })
  }

  function exportar() {
    const datos = filtrados.map(r => ({
      'N° Formulario':  r.numero_formulario,
      'Cliente':        r.nombre_cliente,
      'Monto Cuotas':   r.monto_cuotas,
      'N° Cuotas':      r.cuotas,
      'Valor/Cuota':    r.cuotas > 0 ? Math.round(r.monto_cuotas / r.cuotas) : '',
      'Estado':         r.estado,
    }))
    exportarExcel(datos, 'Cuotas', 'Cuotas')
  }

  const KPI_CARDS = [
    { icon: Clock,       label: 'Pendientes', value: pendientes.length, sub: clp(montoPendiente), gradient: 'from-amber-500 to-amber-600' },
    { icon: XCircle,     label: 'Vencidas',   value: vencidos.length,   sub: clp(montoVencido),   gradient: 'from-red-500 to-red-600' },
    { icon: CheckCircle, label: 'Cobradas',   value: pagados.length,    sub: clp(montoPagado),    gradient: 'from-emerald-500 to-emerald-600' },
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
          <option value="pagado">Cobradas</option>
        </select>
        <button onClick={exportar} className="btn-excel ml-auto">
          <Download className="w-4 h-4" /> Excel
        </button>
      </div>

      {loading ? <SkeletonTabla filas={5} cols={6} /> : (
        <div className="tabla-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['N° Form.', 'Cliente', 'Monto Cuotas', 'N° Cuotas', 'Valor / Cuota', 'Estado', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtrados.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">Sin cuotas registradas</td></tr>
                ) : filtrados.map(r => {
                  const valorCuota = r.cuotas > 0 ? Math.round((r.monto_cuotas || 0) / r.cuotas) : null
                  return (
                    <tr key={r.id} className="tabla-fila">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600">#{r.numero_formulario}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{r.nombre_cliente}</td>
                      <td className="px-4 py-3 font-semibold text-money">{clp(r.monto_cuotas)}</td>
                      <td className="px-4 py-3 text-slate-600 text-center">{r.cuotas || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 text-money">{valorCuota ? clp(valorCuota) : '—'}</td>
                      <td className="px-4 py-3">
                        <select value={r.estado} onChange={e => cambiarEstado(r.id, e.target.value)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer ${BADGE_CUOTA[r.estado] || 'bg-slate-100 text-slate-600'}`}>
                          <option value="pendiente">Pendiente</option>
                          <option value="vencido">Vencida</option>
                          <option value="pagado">Cobrada</option>
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
                <HistorialAuditoria referenciaId={historialItem.numero_formulario} modulos={['formas_pago']} />
              </div>
            </div>
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
