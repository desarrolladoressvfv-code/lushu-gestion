import { useEffect, useState } from 'react'
import { supabase, CLIENTE_ID, clp } from '../lib/supabase'
import { Search, Download, DollarSign, CreditCard, CheckSquare, AlertCircle, ClipboardCheck, History, X } from 'lucide-react'
import { exportarExcel } from '../lib/exportExcel'
import { SkeletonTabla } from '../components/SkeletonLoader'
import HistorialAuditoria from '../components/HistorialAuditoria'

export default function FormasPago() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [tab, setTab] = useState('registros') // 'registros' | 'seguimiento'
  const [historialItem, setHistorialItem] = useState(null)
  const [errorEstado, setErrorEstado] = useState('')

  async function cargar() {
    const { data } = await supabase.from('formas_pago')
      .select('*, convenios(nombre)').eq('cliente_id', CLIENTE_ID)
      .order('numero_formulario', { ascending: false })
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

    if (error) {
      setErrorEstado(`No se pudo cambiar el estado: ${error.message}`)
      setTimeout(() => setErrorEstado(''), 5000)
      return
    }

    const fila = rows.find(r => r.id === id)

    // Actualización inmediata en UI (sin round-trip)
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))

    // Auditoría — await para que quede grabado antes de que el usuario abra el historial
    await supabase.rpc('registrar_auditoria', {
      p_accion: 'actualizar',
      p_modulo: 'formas_pago',
      p_descripcion: `Formulario #${fila?.numero_formulario} marcado como "${nuevoEstado}"`,
      p_referencia_id: fila?.numero_formulario,
    })

    // S3: notificar por email si pasa a pendiente
    if (nuevoEstado === 'pendiente' && fila) {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: cliente } = await supabase.from('clientes').select('email_admin').eq('id', fila.cliente_id).maybeSingle()
      const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente?.email_admin || '')
      if (emailValido) {
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
    <>
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Formas de Pago</h1>
        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setTab('registros')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === 'registros' ? 'bg-white shadow text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}>
              <CreditCard className="w-3.5 h-3.5" /> Registros
            </button>
            <button onClick={() => setTab('seguimiento')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === 'seguimiento' ? 'bg-white shadow text-amber-600 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}>
              <ClipboardCheck className="w-3.5 h-3.5" /> Cuentas por cobrar
              {rows.filter(r => r.saldo_pendiente > 0).length > 0 && (
                <span className="bg-amber-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {rows.filter(r => r.saldo_pendiente > 0).length}
                </span>
              )}
            </button>
          </div>
          <button onClick={exportar} className="btn-excel">
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* Error estado */}
      {errorEstado && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{errorEstado}
        </div>
      )}

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

      {/* Tab: Registros */}
      {tab === 'registros' && (<>
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
            <option value="vencido">Vencido</option>
          </select>
        </div>

        {loading ? <SkeletonTabla filas={6} cols={7} /> : (
          <div className="tabla-panel">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['N° Form.', 'Fecha', 'Venta Total', 'Convenio', 'Val. Convenio', 'Efectivo', 'Tarjeta', 'Cuotas', 'Valor/Cuota', 'Cheques', 'Saldo', 'Estado', 'Info'].map(h => (
                      <th key={h} className="text-left px-3 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtrados.length === 0 ? (
                    <tr><td colSpan={13} className="text-center py-10 text-slate-400">Sin registros</td></tr>
                  ) : filtrados.map(r => {
                    const valorCuota = r.monto_cuotas > 0 && r.cuotas > 0
                      ? Math.round(r.monto_cuotas / r.cuotas) : null
                    return (
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
                      <td className="px-3 py-3 text-right text-slate-500 text-money">
                        {valorCuota ? clp(valorCuota) : '-'}
                      </td>
                      <td className="px-3 py-3 text-right text-money">{clp(r.valor_cheques)}</td>
                      <td className={`px-3 py-3 text-right font-bold text-money ${r.saldo_pendiente > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {clp(r.saldo_pendiente)}
                      </td>
                      <td className="px-3 py-3">
                        <select value={r.estado} onChange={e => cambiarEstado(r.id, e.target.value)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer ${
                            r.estado === 'pagado'   ? 'bg-emerald-100 text-emerald-700'
                            : r.estado === 'vencido' ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                          }`}>
                          <option value="pagado">Pagado</option>
                          <option value="pendiente">Pendiente</option>
                          <option value="vencido">Vencido</option>
                        </select>
                      </td>
                      <td className="px-3 py-3 text-slate-500 max-w-xs truncate">{r.info_adicional || '-'}</td>
                      <td className="px-3 py-3">
                        <button onClick={() => setHistorialItem(r)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Ver historial">
                          <History className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>)}

      {/* Tab: Seguimiento / Cuentas por cobrar */}
      {tab === 'seguimiento' && (() => {
        const pendientes = rows.filter(r => r.saldo_pendiente > 0)
        const totalPend = pendientes.reduce((s, r) => s + (r.saldo_pendiente || 0), 0)
        return (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-amber-800">{pendientes.length} cobro{pendientes.length !== 1 ? 's' : ''} pendiente{pendientes.length !== 1 ? 's' : ''}</p>
                <p className="text-amber-700 text-sm">Total por cobrar: <span className="font-bold text-money">{clp(totalPend)}</span></p>
              </div>
            </div>
            {pendientes.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-8 text-center">
                <CheckSquare className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-emerald-700 font-semibold">Sin cobros pendientes</p>
                <p className="text-emerald-600 text-sm mt-1">Todos los servicios están al día.</p>
              </div>
            ) : (
              <div className="tabla-panel">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['N° Form.', 'Fecha', 'Venta Total', 'Saldo Pendiente', 'Convenio', 'Cuotas', 'Valor/Cuota', 'Info', 'Acción'].map(h => (
                          <th key={h} className="text-left px-3 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {pendientes.map(r => {
                        const valorCuota = r.monto_cuotas > 0 && r.cuotas > 0
                          ? Math.round(r.monto_cuotas / r.cuotas) : null
                        return (
                          <tr key={r.id} className="tabla-fila bg-amber-50/30">
                            <td className="px-3 py-3 font-mono font-bold text-blue-600">#{r.numero_formulario}</td>
                            <td className="px-3 py-3 text-slate-600">{r.fecha}</td>
                            <td className="px-3 py-3 text-right text-money font-medium">{clp(r.venta_total)}</td>
                            <td className="px-3 py-3 text-right font-bold text-red-600 text-money">{clp(r.saldo_pendiente)}</td>
                            <td className="px-3 py-3 text-slate-500">{r.convenios?.nombre || '-'}</td>
                            <td className="px-3 py-3 text-center text-slate-600">
                              {r.cuotas > 0 ? `${r.cuotas} cuotas` : '-'}
                            </td>
                            <td className="px-3 py-3 text-right text-money">
                              {valorCuota ? clp(valorCuota) : '-'}
                            </td>
                            <td className="px-3 py-3 text-slate-500 max-w-xs truncate">{r.info_adicional || '-'}</td>
                            <td className="px-3 py-3">
                              <button onClick={() => cambiarEstado(r.id, 'pagado')}
                                className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors">
                                <CheckSquare className="w-3.5 h-3.5" /> Marcar pagado
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
          </div>
        )
      })()}
    </div>
    {/* Modal historial */}
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
              <HistorialAuditoria referenciaId={historialItem.numero_formulario}
                modulos={['formas_pago']} />
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  )
}
