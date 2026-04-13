import { useEffect, useState } from 'react'
import { supabase, CLIENTE_ID } from '../lib/supabase'
import { ArrowUp, ArrowDown, Download } from 'lucide-react'
import { exportarExcel } from '../lib/exportExcel'
import { SkeletonTabla } from '../components/SkeletonLoader'
import { useEmpresa } from '../context/EmpresaContext'

export default function MovimientosInventario() {
  const { logoUrl, nombreEmpresa } = useEmpresa()
  const [rows, setRows] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroProducto, setFiltroProducto] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('productos').select('id,nombre').eq('cliente_id', CLIENTE_ID).order('numero'),
      supabase.from('movimientos_inventario').select('*, productos(nombre)')
        .eq('cliente_id', CLIENTE_ID).order('created_at', { ascending: false }),
    ]).then(([{ data: p }, { data: m }]) => {
      setProductos(p || [])
      setRows(m || [])
      setLoading(false)
    })
  }, [])

  const filtrados = rows.filter(r => {
    if (filtroProducto && r.producto_id !== filtroProducto) return false
    if (filtroTipo && r.tipo !== filtroTipo) return false
    if (desde && r.fecha < desde) return false
    if (hasta && r.fecha > hasta) return false
    return true
  })

  function exportar() {
    const datos = filtrados.map(r => ({
      'Fecha': r.fecha,
      'Producto': r.productos?.nombre || '',
      'Tipo': r.tipo === 'entrada' ? 'Entrada' : 'Salida',
      'Cantidad': r.cantidad,
      'Motivo': r.motivo || '',
    }))
    exportarExcel(datos, 'Movimientos', 'Movimientos_Inventario', logoUrl, nombreEmpresa)
  }

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Movimientos</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{filtrados.length} registros</span>
          <button onClick={exportar} className="btn-excel">
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-bar flex flex-wrap gap-3">
        <select value={filtroProducto} onChange={e => setFiltroProducto(e.target.value)} className="input-base w-auto">
          <option value="">Todos los productos</option>
          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="input-base w-auto">
          <option value="">Entradas y Salidas</option>
          <option value="entrada">Solo Entradas</option>
          <option value="salida">Solo Salidas</option>
        </select>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 font-medium">Desde:</span>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="input-base w-auto" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 font-medium">Hasta:</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="input-base w-auto" />
        </div>
      </div>

      {loading ? <SkeletonTabla filas={6} cols={5} /> : (
        <div className="tabla-panel">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Motivo'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">Sin movimientos</td></tr>
              ) : filtrados.map(r => (
                <tr key={r.id} className="tabla-fila">
                  <td className="px-4 py-3 text-slate-600">{r.fecha}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.productos?.nombre || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${r.tipo === 'entrada' ? 'badge-green' : 'badge-red'} flex items-center gap-1.5 w-fit`}>
                      {r.tipo === 'entrada' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {r.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-center text-slate-900">{r.cantidad}</td>
                  <td className="px-4 py-3 text-slate-500">{r.motivo || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
