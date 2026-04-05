import { useEffect, useState } from 'react'
import { supabase, CLIENTE_ID, clp } from '../lib/supabase'
import { Search, Download, DollarSign, CreditCard, CheckSquare, AlertCircle } from 'lucide-react'
import { exportarExcel } from '../lib/exportExcel'
import { SkeletonTabla } from '../components/SkeletonLoader'

export default function FormasPago() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  async function cargar() {
    const { data } = await supabase.from('formas_pago')
      .select('*, convenios(nombre)').eq('cliente_id', CLIENTE_ID)
      .order('fecha', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const filtrados = rows.filter(r => {
    const ok = String(r.numero_formulario).includes(busqueda)
    const okEstado = !filtroEstado || r.estado === filtroEstado
    return ok && okEstado
  })

  const totalCobrado = rows.filter(r => r.estado === 'pagado').reduce((s, r) => s + (r.venta_total || 0), 0)
  const totalPendiente = rows.filter(r => r.estado === 'pendiente').reduce((s, r) => s + (r.saldo_pendiente || 0), 0)
  const totalEfectivo = rows.reduce((s, r) => s + (r.efectivo || 0), 0)
  const totalTarjeta = rows.reduce((s, r) => s + (r.tarjeta || 0), 0)
  const totalConvenio = rows.reduce((s, r) => s + (r.valor_convenio || 0), 0)
  const totalCheques = rows.reduce((s, r) => s + (r.valor_cheques || 0), 0)
  const totalCuotas = rows.reduce((s, r) => s + (r.monto_cuotas || 0), 0)

  async function cambiarEstado(id, nuevoEstado) {
    // B7: al marcar pagado → saldo_pendiente = 0 para que el dashboard sea correcto
    const updates = { estado: nuevoEstado }
    if (nuevoEstado === 'pagado') updates.saldo_pendiente = 0
    const { error } = await supabase.from('formas_pago').update(updates).eq('id', id)
    if (!error) {
      // S3: notificar por email si pasa a pendiente
      if (nuevoEstado === 'pendiente') {
        const fila = rows.find(r => r.id === id)
        const { data: { session } } = await supabase.auth.getSession()
        const { data: cliente } = await supabase.from('clientes').select('email_admin').eq('id', fila?.cliente_id).maybeSingle()
        if (cliente?.email_admin && fila) {
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notificar-pago-pendiente`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              numero_formulario: fila.numero_formulario,
              saldo_pendiente: fila.saldo_pendiente || 0,
              nombre_cliente: fila.convenios?.nombre || `Formulario #${fila.numero_formulario}`,
              email_admin: cliente.email_admin,
            }),
          }).catch(() => {}) // silencioso: el email es best-effort
        }
      }
      cargar()
    }
  }

  function exportar() {
    const datos = filtrados.map(r => ({
      'N° Formulario': r.numero_formulario,
      'Fecha': r.fecha,
      'Venta Total': r.venta_total,
      'Convenio': r.convenios?.nombre || '',
      'Valor Convenio': r.valor_convenio,
      'Efectivo': r.efectivo,
      'Tarjeta': r.tarjeta,
      'Cuotas ($)': r.monto_cuotas,
      'N° Cuotas': r.cuotas,
      'Cheques': r.valor_cheques,
      'Saldo Pendiente': r.saldo_pendiente,
      'Estado': r.estado,
      'Info Adicional': r.info_adicional || '',
    }))
    exportarExcel(datos, 'FormasPago', 'Formas_de_Pago')
  }

  const KPI_CARDS = [
    { icon: DollarSign, label: 'Total Cobrado', value: clp(totalCobrado), gradient: 'from-emerald-500 to-emerald-600' },
    { icon: AlertCircle, label: 'Total Pendiente', value: clp(totalPendiente), gradient: 'from-red-500 to-red-600' },
    { icon: CreditCard, label: 'Efectivo + Tarjeta', value: clp(totalEfectivo + totalTarjeta), gradient: 'from-blue-500 to-blue-600' },
    { icon: CheckSquare, label: 'Convenios + Cheques', value: clp(totalConvenio + totalCheques), gradient: 'from-violet-500 to-violet-600' },
  ]

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Formas de Pago</h1>
        <button onClick={exportar} className="btn-excel">
          <Download className="w-4 h-4" /> Excel
        </button>
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
                <p className="text-white font-bold text-sm truncate text-money">{k.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Distribución por tipo */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Distribución por Tipo de Pago</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-sm">
          {[
            { label: 'Efectivo', val: totalEfectivo, cls: 'badge-green' },
            { label: 'Tarjeta', val: totalTarjeta, cls: 'badge-blue' },
            { label: 'Convenio', val: totalConvenio, cls: 'badge-violet' },
            { label: 'Cheques', val: totalCheques, cls: 'badge-amber' },
            { label: 'Cuotas', val: totalCuotas, cls: 'badge-red' },
          ].map(t => (
            <div key={t.label} className={`badge ${t.cls} flex flex-col items-center py-2 rounded-xl`}>
              <span className="text-xs font-medium mb-0.5">{t.label}</span>
              <span className="font-bold text-sm text-money">{clp(t.val)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-bar flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="input-base pl-9 w-52"
            placeholder="Buscar N° formulario..." />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="input-base w-auto">
          <option value="">Todos los estados</option>
          <option value="pagado">Pagado</option>
          <option value="pendiente">Pendiente</option>
        </select>
      </div>

      {loading ? <SkeletonTabla filas={6} cols={7} /> : (
        <div className="tabla-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['N° Form.', 'Fecha', 'Venta Total', 'Convenio', 'Val. Convenio', 'Efectivo', 'Tarjeta', 'Cuotas', 'Cheques', 'Saldo', 'Estado', 'Info'].map(h => (
                    <th key={h} className="text-left px-3 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtrados.length === 0 ? (
                  <tr><td colSpan={12} className="text-center py-10 text-slate-400">Sin registros</td></tr>
                ) : filtrados.map(r => (
                  <tr key={r.id} className="tabla-fila">
                    <td className="px-3 py-3 font-mono font-bold text-blue-600">#{r.numero_formulario}</td>
                    <td className="px-3 py-3 text-slate-600">{r.fecha}</td>
                    <td className="px-3 py-3 font-medium text-right text-money">{clp(r.venta_total)}</td>
                    <td className="px-3 py-3 text-slate-500">{r.convenios?.nombre || '-'}</td>
                    <td className="px-3 py-3 text-right text-money">{clp(r.valor_convenio)}</td>
                    <td className="px-3 py-3 text-right text-money">{clp(r.efectivo)}</td>
                    <td className="px-3 py-3 text-right text-money">{clp(r.tarjeta)}</td>
                    <td className="px-3 py-3 text-right text-slate-500 text-money">
                      {clp(r.monto_cuotas)}{r.cuotas > 0 ? ` (${r.cuotas}c)` : ''}
                    </td>
                    <td className="px-3 py-3 text-right text-money">{clp(r.valor_cheques)}</td>
                    <td className={`px-3 py-3 text-right font-bold text-money ${r.saldo_pendiente > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {clp(r.saldo_pendiente)}
                    </td>
                    <td className="px-3 py-3">
                      <select value={r.estado} onChange={e => cambiarEstado(r.id, e.target.value)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer ${
                          r.estado === 'pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                        <option value="pagado">Pagado</option>
                        <option value="pendiente">Pendiente</option>
                      </select>
                    </td>
                    <td className="px-3 py-3 text-slate-500 max-w-xs truncate">{r.info_adicional || '-'}</td>
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
