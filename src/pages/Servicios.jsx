import { useEffect, useState } from 'react'
import { supabase, CLIENTE_ID } from '../lib/supabase'
import { Search, Download, Trash2, AlertTriangle } from 'lucide-react'
import { exportarExcel } from '../lib/exportExcel'
import { SkeletonTabla } from '../components/SkeletonLoader'
import Paginador, { usePaginacion } from '../components/Paginador'

export default function Servicios() {
  const [rows, setRows] = useState([])
  const [productos, setProductos] = useState([])
  const [trabajadores, setTrabajadores] = useState([])
  const [sucursales, setSucursales] = useState([])
  const [loading, setLoading] = useState(true)

  const [busqueda, setBusqueda] = useState('')
  const [filtroProducto, setFiltroProducto] = useState('')
  const [filtroTrabajador, setFiltroTrabajador] = useState('')
  const [filtroSucursal, setFiltroSucursal] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')

  const [pendingDelete, setPendingDelete] = useState(null) // servicio a eliminar
  const [eliminando, setEliminando] = useState(false)

  async function eliminarServicio() {
    if (!pendingDelete) return
    setEliminando(true)
    const { error } = await supabase.rpc('eliminar_servicio_completo', { p_servicio_id: pendingDelete.id })
    setEliminando(false)
    setPendingDelete(null)
    if (!error) setRows(prev => prev.filter(r => r.id !== pendingDelete.id))
  }

  useEffect(() => {
    Promise.all([
      supabase.from('servicios').select('*, productos(nombre), trabajadores(nombre), sucursales(nombre)')
        .eq('cliente_id', CLIENTE_ID).order('numero_formulario', { ascending: false }),
      supabase.from('productos').select('id,nombre').eq('cliente_id', CLIENTE_ID).eq('activo', true).order('numero'),
      supabase.from('trabajadores').select('id,nombre').eq('cliente_id', CLIENTE_ID).eq('activo', true).order('numero'),
      supabase.from('sucursales').select('id,nombre').eq('cliente_id', CLIENTE_ID).eq('activo', true).order('nombre'),
    ]).then(([{ data: s }, { data: p }, { data: t }, { data: suc }]) => {
      setRows(s || [])
      setProductos(p || [])
      setTrabajadores(t || [])
      setSucursales(suc || [])
      setLoading(false)
    })
  }, [])

  const filtrados = rows.filter(r => {
    if (busqueda && !r.nombre_cliente?.toLowerCase().includes(busqueda.toLowerCase()) &&
        !String(r.numero_formulario).includes(busqueda) &&
        !r.cementerio?.toLowerCase().includes(busqueda.toLowerCase())) return false
    if (filtroProducto && r.producto_id !== filtroProducto) return false
    if (filtroTrabajador && r.trabajador_id !== filtroTrabajador) return false
    if (filtroSucursal && r.sucursal_id !== filtroSucursal) return false
    if (filtroDesde && r.fecha_servicio < filtroDesde) return false
    if (filtroHasta && r.fecha_servicio > filtroHasta) return false
    return true
  })

  // M1 — Paginación
  const { pagina, setPagina, paginados } = usePaginacion(filtrados, 25)

  function exportar() {
    const datos = filtrados.map(r => ({
      'N° Formulario': r.numero_formulario,
      'Fecha': r.fecha_servicio,
      'Cliente': r.nombre_cliente,
      'Teléfono': r.telefono,
      'Urna': r.productos?.nombre || '',
      'Color': r.color,
      'Lugar Retiro': r.lugar_retiro,
      'Lugar Servicio': r.lugar_servicio,
      'Cementerio': r.cementerio,
      'Instalador': r.trabajadores?.nombre || '',
      'Sucursal': r.sucursales?.nombre || '',
    }))
    exportarExcel(datos, 'Servicios', 'Servicios')
  }

  return (
    <>
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Servicios</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{filtrados.length} registros</span>
          <button onClick={exportar} className="btn-excel">
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-bar grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="relative col-span-2 md:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="input-base pl-9"
            placeholder="Buscar..." />
        </div>
        <select value={filtroProducto} onChange={e => setFiltroProducto(e.target.value)} className="input-base">
          <option value="">Todas las urnas</option>
          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select value={filtroTrabajador} onChange={e => setFiltroTrabajador(e.target.value)} className="input-base">
          <option value="">Todos los instaladores</option>
          {trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        <select value={filtroSucursal} onChange={e => setFiltroSucursal(e.target.value)} className="input-base">
          <option value="">Todas las sucursales</option>
          {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)}
          className="input-base" title="Fecha desde" />
        <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)}
          className="input-base" title="Fecha hasta" />
      </div>

      {loading ? <SkeletonTabla filas={6} cols={7} /> : (
        <div className="tabla-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  {['N° Form.', 'Fecha', 'Cliente', 'Teléfono', 'Urna', 'Color', 'Lugar Retiro', 'Lugar Servicio', 'Cementerio', 'Instalador', 'Sucursal', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap bg-slate-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtrados.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-10 text-slate-400">Sin registros</td></tr>
                ) : paginados.map(r => (
                  <tr key={r.id} className="tabla-fila">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600">#{r.numero_formulario}</td>
                    <td className="px-4 py-3 text-slate-600">{r.fecha_servicio}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.nombre_cliente}</td>
                    <td className="px-4 py-3 text-slate-500">{r.telefono}</td>
                    <td className="px-4 py-3 text-slate-600">{r.productos?.nombre || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{r.color || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{r.lugar_retiro || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{r.lugar_servicio || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{r.cementerio || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{r.trabajadores?.nombre || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{r.sucursales?.nombre || '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setPendingDelete(r)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar servicio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginador pagina={pagina} totalItems={filtrados.length} porPagina={25} onChange={setPagina} />
        </div>
      )}
    </div>

    {/* Modal confirmación eliminar servicio */}

    {pendingDelete && (
      <div className="modal-backdrop">
        <div className="modal-panel w-full max-w-md">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Eliminar servicio</h3>
                <p className="text-sm text-slate-500">Esta acción es irreversible</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5 text-sm text-red-700 space-y-1">
              <p className="font-semibold">Se eliminará permanentemente:</p>
              <ul className="list-disc list-inside space-y-0.5 text-red-600">
                <li>Servicio #{pendingDelete.numero_formulario} — {pendingDelete.nombre_cliente}</li>
                <li>Registro del fallecido</li>
                <li>Detalle de venta asociada</li>
                <li>Forma de pago y cheques</li>
                <li>El stock de la urna será devuelto</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPendingDelete(null)} className="btn-secondary flex-1 justify-center">
                Cancelar
              </button>
              <button onClick={eliminarServicio} disabled={eliminando}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-60">
                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
