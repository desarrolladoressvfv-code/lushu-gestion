import { useEffect, useRef, useState } from 'react'
import { supabase, CLIENTE_ID } from '../lib/supabase'
import {
  AlertTriangle, Download, Package, CheckCircle,
  XCircle, TrendingDown, DollarSign, Pencil, Check, X, History,
} from 'lucide-react'
import { exportarExcel } from '../lib/exportExcel'
import { SkeletonTabla } from '../components/SkeletonLoader'
import HistorialAuditoria from '../components/HistorialAuditoria'

/* ── Toast ─────────────────────────────────────────────── */
function Toast({ mensaje, tipo, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3
      px-4 py-3 rounded-2xl shadow-xl text-sm font-medium animate-modal
      ${tipo === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
      {tipo === 'ok'
        ? <Check className="w-4 h-4 flex-shrink-0" />
        : <X className="w-4 h-4 flex-shrink-0" />}
      {mensaje}
    </div>
  )
}

/* ── Celda editable inline de stock mínimo ─────────────── */
function StockMinimoCell({ row, onGuardar }) {
  const [editando, setEditando] = useState(false)
  const [valor,    setValor]    = useState('')
  const inputRef = useRef(null)

  function iniciar() {
    setValor(String(row.stock_minimo ?? 0))
    setEditando(true)
  }

  useEffect(() => {
    if (editando) inputRef.current?.focus()
  }, [editando])

  async function confirmar() {
    // Solo enteros positivos; vacío → 0
    const nuevo = Math.max(0, parseInt(valor, 10) || 0)
    setEditando(false)
    if (nuevo === (row.stock_minimo ?? 0)) return   // Sin cambio
    await onGuardar(row.id, nuevo)
  }

  function handleKey(e) {
    if (e.key === 'Enter')  confirmar()
    if (e.key === 'Escape') setEditando(false)
  }

  if (editando) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={0}
        step={1}
        value={valor}
        onChange={e => setValor(e.target.value.replace(/[^0-9]/g, ''))}
        onBlur={confirmar}
        onKeyDown={handleKey}
        className="w-16 text-center text-sm font-semibold border-2 border-blue-400
                   rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
    )
  }

  return (
    <button
      onClick={iniciar}
      title="Clic para editar el stock mínimo"
      className="flex items-center justify-center gap-1 group hover:text-blue-600
                 transition-colors duration-150"
    >
      <span className="font-semibold text-slate-600 group-hover:text-blue-600">
        {row.stock_minimo ?? 0}
      </span>
      <Pencil className="w-3 h-3 text-slate-300 group-hover:text-blue-400
                         opacity-0 group-hover:opacity-100 transition-all" />
    </button>
  )
}

/* ── Módulo principal ──────────────────────────────────── */
export default function Inventario() {
  const [rows,          setRows]          = useState([])
  const [sucursales,    setSucursales]    = useState([])
  const [loading,       setLoading]       = useState(true)
  // B8: persiste el filtro en sessionStorage para que no se pierda al navegar
  const [filtroSucursal,setFiltroSucursal]= useState(() => sessionStorage.getItem('inv_sucursal') || '')
  const [toast,         setToast]         = useState(null)
  const [historialItem, setHistorialItem] = useState(null)

  async function cargar() {
    const [{ data: inv }, { data: suc }] = await Promise.all([
      supabase.from('inventario')
        .select('*, productos(nombre, precio), sucursales(nombre)')
        .eq('cliente_id', CLIENTE_ID),
      supabase.from('sucursales')
        .select('id,nombre')
        .eq('cliente_id', CLIENTE_ID)
        .eq('activo', true)
        .order('nombre'),
    ])
    setRows(inv || [])
    setSucursales(suc || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  /* ── Actualizar stock mínimo ─────────────────────────── */
  async function actualizarStockMinimo(id, nuevoMinimo) {
    const { error } = await supabase
      .from('inventario')
      .update({ stock_minimo: nuevoMinimo })
      .eq('id', id)

    if (!error) {
      setRows(prev =>
        prev.map(r => r.id === id ? { ...r, stock_minimo: nuevoMinimo } : r)
      )
      setToast({ mensaje: `Stock mínimo actualizado a ${nuevoMinimo}`, tipo: 'ok' })
      // S2: log de auditoría
      const prod = rows.find(r => r.id === id)
      supabase.rpc('registrar_auditoria', {
        p_accion: 'editar',
        p_modulo: 'inventario',
        p_descripcion: `Stock mínimo de "${prod?.productos?.nombre || id}" actualizado a ${nuevoMinimo}`,
        p_referencia_id: id,
      })
    } else {
      setToast({ mensaje: 'Error al actualizar el stock mínimo', tipo: 'error' })
    }
  }

  /* ── Filtrado y métricas ─────────────────────────────── */
  const filtrados = filtroSucursal
    ? rows.filter(r => r.sucursal_id === filtroSucursal)
    : rows

  const alertas         = filtrados.filter(r => r.stock_actual <= r.stock_minimo)
  const totalProductos  = filtrados.reduce((sum, r) => sum + (r.stock_actual || 0), 0)
  const normal          = filtrados.filter(r => r.stock_actual > (r.stock_minimo ?? 0)).length
  const critico         = filtrados.filter(r => r.stock_actual > 0 && r.stock_actual <= (r.stock_minimo ?? 0)).length
  const sinStock        = filtrados.filter(r => r.stock_actual === 0).length
  const valorInventario = filtrados.reduce(
    (s, r) => s + (r.stock_actual * (r.productos?.precio || 0)), 0
  )

  const clp = v => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(v ?? 0)

  const KPI = [
    {
      icon: Package,
      label: 'Total Productos',
      value: totalProductos,
      sub: filtroSucursal ? 'unidades en sucursal seleccionada' : 'unidades en todas las sucursales',
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      icon: CheckCircle,
      label: 'Stock Normal',
      value: normal,
      sub: 'sobre el mínimo',
      gradient: 'from-emerald-500 to-emerald-600',
    },
    {
      icon: TrendingDown,
      label: 'Stock Crítico',
      value: critico,
      sub: 'igual o bajo el mínimo',
      gradient: 'from-amber-500 to-amber-600',
      alert: critico > 0,
    },
    {
      icon: XCircle,
      label: 'Sin Stock',
      value: sinStock,
      sub: 'stock = 0',
      gradient: 'from-red-500 to-red-600',
      alert: sinStock > 0,
    },
    {
      icon: DollarSign,
      label: 'Valor Inventario',
      value: clp(valorInventario),
      sub: 'stock × precio de lista',
      gradient: 'from-violet-500 to-violet-600',
      wide: true,
    },
  ]

  /* ── Exportar ────────────────────────────────────────── */
  function exportar() {
    const datos = filtrados.map(r => ({
      'Producto':        r.productos?.nombre  || '',
      'Sucursal':        r.sucursales?.nombre || 'General',
      'Precio Unitario': r.productos?.precio  || 0,
      'Stock Actual':    r.stock_actual,
      'Stock Mínimo':    r.stock_minimo ?? 0,
      'Valor Total':     r.stock_actual * (r.productos?.precio || 0),
      'Estado':          r.stock_actual === 0 ? 'Sin Stock'
                         : r.stock_actual <= (r.stock_minimo ?? 0) ? 'Stock Bajo' : 'Normal',
    }))
    exportarExcel(datos, 'Inventario', 'Stock_Inventario')
  }

  return (
    <>
    <div className="space-y-4 page-enter">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Stock Actual</h1>
        <button onClick={exportar} className="btn-excel">
          <Download className="w-4 h-4" /> Excel
        </button>
      </div>

      {/* KPI Cards */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {KPI.map((k, i) => (
            <div key={i}
              className={`kpi-card bg-gradient-to-br ${k.gradient}
                ${k.wide ? 'col-span-2 sm:col-span-4 lg:col-span-1' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <k.icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-white/70 text-xs font-medium truncate">{k.label}</p>
                  <p className="text-white font-bold text-lg leading-tight truncate text-money">
                    {k.value}
                    {k.alert && <span className="ml-1.5 text-white/80 text-xs">⚠</span>}
                  </p>
                  <p className="text-white/50 text-[10px] truncate">{k.sub}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="filtros-bar flex gap-3 items-center">
        <select
          value={filtroSucursal}
          onChange={e => { setFiltroSucursal(e.target.value); sessionStorage.setItem('inv_sucursal', e.target.value) }}
          className="input-base w-auto">
          <option value="">Todas las sucursales</option>
          {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <p className="text-xs text-slate-400">
          Haz clic en el número de <span className="font-semibold text-slate-600">Stock Mínimo</span> para editarlo directamente.
        </p>
      </div>

      {/* Alerta stock bajo */}
      {!loading && alertas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-semibold text-sm">
              Stock bajo en {alertas.length} producto{alertas.length > 1 ? 's' : ''}
            </p>
            <p className="text-red-600 text-xs mt-0.5">
              {alertas.map(a => a.productos?.nombre).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Tabla */}
      {loading ? <SkeletonTabla filas={5} cols={6} /> : (
        <div className="tabla-panel">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Producto</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Sucursal</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Stock Actual</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                  <span className="flex items-center justify-center gap-1">
                    Stock Mínimo
                    <Pencil className="w-3 h-3 text-blue-400" title="Editable inline" />
                  </span>
                </th>
                <th className="text-center px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    Sin productos en inventario.
                  </td>
                </tr>
              ) : filtrados.map(r => (
                <tr key={r.id} className={`tabla-fila ${r.stock_actual <= (r.stock_minimo ?? 0) ? 'bg-red-50/40' : ''}`}>

                  <td className="px-4 py-3 font-medium text-slate-900">
                    {r.productos?.nombre}
                  </td>

                  <td className="px-4 py-3 text-slate-500">
                    {r.sucursales?.nombre || 'General'}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center">
                      <span className={`text-xl font-bold ${
                        r.stock_actual === 0             ? 'text-red-600'
                        : r.stock_actual <= (r.stock_minimo ?? 0) ? 'text-amber-600'
                        : 'text-slate-900'
                      }`}>
                        {r.stock_actual}
                      </span>
                    </div>
                  </td>

                  {/* Columna editable inline */}
                  <td className="px-4 py-3 text-center">
                    <StockMinimoCell row={r} onGuardar={actualizarStockMinimo} />
                  </td>

                  <td className="px-4 py-3 text-center">
                    {r.stock_actual === 0
                      ? <span className="badge badge-red">Sin Stock</span>
                      : r.stock_actual <= (r.stock_minimo ?? 0)
                      ? <span className="badge badge-amber">Stock Bajo</span>
                      : <span className="badge badge-green">Normal</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setHistorialItem(r)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Ver historial">
                      <History className="w-4 h-4" />
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          mensaje={toast.mensaje}
          tipo={toast.tipo}
          onClose={() => setToast(null)}
        />
      )}

    </div>

    {historialItem && (
      <div className="modal-backdrop">
        <div className="modal-panel w-full max-w-lg">
          <div className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-slate-900">Historial de inventario</h3>
                <p className="text-xs text-slate-400 mt-0.5">{historialItem.productos?.nombre}</p>
              </div>
              <button onClick={() => setHistorialItem(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <HistorialAuditoria referenciaId={historialItem.id} modulos={['inventario']} />
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  )
}
