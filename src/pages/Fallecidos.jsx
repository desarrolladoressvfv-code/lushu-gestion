import { useEffect, useState } from 'react'
import { supabase, CLIENTE_ID } from '../lib/supabase'
import { Search, Download } from 'lucide-react'
import { exportarExcel } from '../lib/exportExcel'
import { SkeletonTabla } from '../components/SkeletonLoader'
import Paginador, { usePaginacion } from '../components/Paginador'

export default function Fallecidos() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  useEffect(() => {
    supabase.from('fallecidos').select('*').eq('cliente_id', CLIENTE_ID)
      .order('numero_formulario', { ascending: false })
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [])

  const filtrados = rows.filter(r => {
    const textoOk =
      r.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      String(r.numero_formulario).includes(busqueda) ||
      r.comuna?.toLowerCase().includes(busqueda.toLowerCase())

    const fechaServicio = r.fecha_servicio || ''
    const desdeOk = !fechaDesde || fechaServicio >= fechaDesde
    const hastaOk = !fechaHasta || fechaServicio <= fechaHasta

    return textoOk && desdeOk && hastaOk
  })

  function limpiarFiltros() {
    setBusqueda('')
    setFechaDesde('')
    setFechaHasta('')
  }

  function exportar() {
    const datos = filtrados.map(r => ({
      'N° Formulario': r.numero_formulario,
      'Nombre': r.nombre,
      'Sexo': r.sexo || '',
      'Edad': r.edad ?? '',
      'RUT': r.rut || '',
      'Fecha Defunción': r.fecha_defuncion || '',
      'Causa de Muerte': r.causa_muerte || '',
      'Comuna': r.comuna || '',
      'Fecha Servicio': r.fecha_servicio || '',
    }))
    exportarExcel(datos, 'Fallecidos', 'Fallecidos')
  }

  const hayFiltros = busqueda || fechaDesde || fechaHasta

  // M1 — Paginación
  const { pagina, setPagina, paginados } = usePaginacion(filtrados, 25)

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Fallecidos</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{filtrados.length} registros</span>
          <button onClick={exportar} className="btn-excel">
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-bar flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="input-base pl-9 w-52"
            placeholder="Buscar por nombre, N° o comuna..." />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 font-medium">Desde:</span>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="input-base w-auto" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 font-medium">Hasta:</span>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="input-base w-auto" />
        </div>
        {hayFiltros && (
          <button onClick={limpiarFiltros}
            className="text-xs text-slate-400 hover:text-slate-700 font-medium transition-colors whitespace-nowrap">
            Limpiar filtros
          </button>
        )}
      </div>

      {loading ? <SkeletonTabla filas={6} cols={9} /> : (
        <div className="tabla-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['N° Form.', 'Nombre', 'Sexo', 'Edad', 'RUT', 'Fecha Defunción', 'Causa de Muerte', 'Comuna', 'Fecha Servicio'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtrados.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-slate-400">Sin registros</td></tr>
                ) : paginados.map(r => (
                  <tr key={r.id} className="tabla-fila">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600">#{r.numero_formulario}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.nombre}</td>
                    <td className="px-4 py-3">
                      {r.sexo ? (
                        <span className={`badge ${r.sexo === 'Masculino' ? 'badge-blue' : 'badge-violet'}`}>{r.sexo}</span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.edad || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{r.rut || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.fecha_defuncion || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{r.causa_muerte || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{r.comuna || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.fecha_servicio || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginador pagina={pagina} totalItems={filtrados.length} porPagina={25} onChange={setPagina} />
        </div>
      )}
    </div>
  )
}
