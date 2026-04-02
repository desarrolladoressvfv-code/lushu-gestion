import { useEffect, useState } from 'react'
import { supabase, CLIENTE_ID } from '../lib/supabase'
import { AlertTriangle, Download } from 'lucide-react'
import { exportarExcel } from '../lib/exportExcel'
import { SkeletonTabla } from '../components/SkeletonLoader'

export default function Inventario() {
  const [rows, setRows] = useState([])
  const [sucursales, setSucursales] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroSucursal, setFiltroSucursal] = useState('')

  async function cargar() {
    const [{ data: inv }, { data: suc }] = await Promise.all([
      supabase.from('inventario').select('*, productos(nombre), sucursales(nombre)')
        .eq('cliente_id', CLIENTE_ID),
      supabase.from('sucursales').select('id,nombre').eq('cliente_id', CLIENTE_ID).eq('activo', true).order('nombre'),
    ])
    setRows(inv || [])
    setSucursales(suc || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const filtrados = filtroSucursal ? rows.filter(r => r.sucursal_id === filtroSucursal) : rows


  function exportar() {
    const datos = filtrados.map(r => ({
      'Producto': r.productos?.nombre || '',
      'Sucursal': r.sucursales?.nombre || 'General',
      'Stock Actual': r.stock_actual,
      'Stock Mínimo': r.stock_minimo,
      'Estado': r.stock_actual === 0 ? 'Sin Stock' : r.stock_actual <= r.stock_minimo ? 'Stock Bajo' : 'Normal',
    }))
    exportarExcel(datos, 'Inventario', 'Stock_Inventario')
  }

  const alertas = filtrados.filter(r => r.stock_actual <= r.stock_minimo)

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Stock Actual</h1>
        <button onClick={exportar} className="btn-excel">
          <Download className="w-4 h-4" /> Excel
        </button>
      </div>

      {/* Filtros */}
      <div className="filtros-bar flex gap-3">
        <select value={filtroSucursal} onChange={e => setFiltroSucursal(e.target.value)} className="input-base w-auto">
          <option value="">Todas las sucursales</option>
          {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
      </div>

      {/* Alerta stock bajo */}
      {alertas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-semibold text-sm">
              Stock bajo en {alertas.length} producto{alertas.length > 1 ? 's' : ''}
            </p>
            <p className="text-red-600 text-xs mt-0.5">{alertas.map(a => a.productos?.nombre).join(', ')}</p>
          </div>
        </div>
      )}

      {loading ? <SkeletonTabla filas={5} cols={5} /> : (
        <div className="tabla-panel">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Producto</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Sucursal</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Stock Actual</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Stock Mínimo</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Estado</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">Sin productos en inventario.</td></tr>
              ) : filtrados.map(r => (
                <tr key={r.id} className={`tabla-fila ${r.stock_actual <= r.stock_minimo ? 'bg-red-50/40' : ''}`}>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.productos?.nombre}</td>
                  <td className="px-4 py-3 text-slate-500">{r.sucursales?.nombre || 'General'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xl font-bold ${
                      r.stock_actual === 0 ? 'text-red-600'
                      : r.stock_actual <= r.stock_minimo ? 'text-amber-600'
                      : 'text-slate-900'
                    }`}>{r.stock_actual}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500">{r.stock_minimo}</td>
                  <td className="px-4 py-3 text-center">
                    {r.stock_actual === 0
                      ? <span className="badge badge-red">Sin Stock</span>
                      : r.stock_actual <= r.stock_minimo
                      ? <span className="badge badge-amber">Stock Bajo</span>
                      : <span className="badge badge-green">Normal</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
