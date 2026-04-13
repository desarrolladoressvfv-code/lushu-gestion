import { useEffect, useRef, useState } from 'react'
import { supabase, CLIENTE_ID } from '../lib/supabase'
import {
  AlertTriangle, Download, Package, CheckCircle,
  XCircle, TrendingDown, DollarSign, Pencil, Check, X, History,
  FileUp, FileDown, Upload,
} from 'lucide-react'
import { exportarExcel } from '../lib/exportExcel'
import { SkeletonTabla } from '../components/SkeletonLoader'
import HistorialAuditoria from '../components/HistorialAuditoria'
import { useEmpresa } from '../context/EmpresaContext'
import ExcelJS from 'exceljs'

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
      className="w-full flex items-center justify-center gap-1 group hover:text-blue-600
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
  const { logoUrl, nombreEmpresa } = useEmpresa()
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

  /* ── Importar inventario ─────────────────────────────── */
  const [modalImport,   setModalImport]   = useState(false)
  const [importando,    setImportando]    = useState(false)
  const [importErrors,  setImportErrors]  = useState([])
  const [importOk,      setImportOk]      = useState(null)   // número de filas procesadas
  const importRef = useRef(null)

  async function descargarPlantilla() {
    const [{ data: prods }, { data: sucs }] = await Promise.all([
      supabase.from('productos').select('nombre').eq('cliente_id', CLIENTE_ID).eq('activo', true).order('numero'),
      supabase.from('sucursales').select('nombre').eq('cliente_id', CLIENTE_ID).eq('activo', true).order('nombre'),
    ])
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Inventario')

    // Cabeceras
    ws.columns = [
      { header: 'Producto',     key: 'producto',     width: 30 },
      { header: 'Sucursal',     key: 'sucursal',     width: 25 },
      { header: 'Stock Actual', key: 'stock_actual', width: 15 },
      { header: 'Stock Mínimo', key: 'stock_minimo', width: 15 },
    ]
    const headerRow = ws.getRow(1)
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF334155' } } }
    })
    headerRow.height = 22

    // Fila de ejemplo por cada combinación producto × sucursal
    const sucNombres = (sucs || []).map(s => s.nombre)
    const prodNombres = (prods || []).map(p => p.nombre)
    if (prodNombres.length === 0) prodNombres.push('Ejemplo Producto')
    if (sucNombres.length === 0) sucNombres.push('Casa Central')

    prodNombres.forEach((prod, pi) => {
      sucNombres.forEach((suc, si) => {
        const row = ws.addRow({ producto: prod, sucursal: suc, stock_actual: 0, stock_minimo: 0 })
        const bg = (pi + si) % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF'
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
          cell.alignment = { vertical: 'middle', horizontal: cell.col >= 3 ? 'center' : 'left' }
        })
        row.height = 18
      })
    })

    // Nota al pie
    const noteRow = ws.addRow([])
    ws.addRow(['⚠ No modifiques los nombres de Producto y Sucursal — deben coincidir exactamente con los del sistema.'])
    ws.mergeCells(`A${noteRow.number + 1}:D${noteRow.number + 1}`)
    const noteCell = ws.getCell(`A${noteRow.number + 1}`)
    noteCell.font = { italic: true, color: { argb: 'FF94A3B8' }, size: 9 }

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'Plantilla_Inventario.xlsx'; a.click()
    URL.revokeObjectURL(url)
  }

  async function procesarImport(file) {
    setImportando(true)
    setImportErrors([])
    setImportOk(null)
    try {
      const [{ data: prods }, { data: sucs }, { data: invActual }] = await Promise.all([
        supabase.from('productos').select('id,nombre').eq('cliente_id', CLIENTE_ID).eq('activo', true),
        supabase.from('sucursales').select('id,nombre').eq('cliente_id', CLIENTE_ID).eq('activo', true),
        supabase.from('inventario').select('id,producto_id,sucursal_id').eq('cliente_id', CLIENTE_ID),
      ])

      const prodMap = Object.fromEntries((prods || []).map(p => [p.nombre.trim().toLowerCase(), p.id]))
      const sucMap  = Object.fromEntries((sucs || []).map(s => [s.nombre.trim().toLowerCase(), s.id]))
      const invMap  = Object.fromEntries((invActual || []).map(i => [`${i.producto_id}|${i.sucursal_id ?? ''}`, i.id]))

      const buf = await file.arrayBuffer()
      const wb  = new ExcelJS.Workbook()
      await wb.xlsx.load(buf)
      const ws  = wb.worksheets[0]

      const errores = []
      const upserts = []

      ws.eachRow((row, rowNum) => {
        if (rowNum === 1) return  // cabecera
        const prod    = String(row.getCell(1).value ?? '').trim()
        const suc     = String(row.getCell(2).value ?? '').trim()
        const stockA  = parseInt(row.getCell(3).value, 10) || 0
        const stockM  = parseInt(row.getCell(4).value, 10) || 0
        if (!prod) return  // fila vacía o nota al pie

        const prodId = prodMap[prod.toLowerCase()]
        const sucId  = suc ? sucMap[suc.toLowerCase()] : null

        if (!prodId) { errores.push(`Fila ${rowNum}: producto "${prod}" no encontrado`); return }
        if (suc && sucId === undefined) { errores.push(`Fila ${rowNum}: sucursal "${suc}" no encontrada`); return }

        const key = `${prodId}|${sucId ?? ''}`
        const existingId = invMap[key]

        if (existingId) {
          upserts.push({ id: existingId, cliente_id: CLIENTE_ID, producto_id: prodId, sucursal_id: sucId ?? null, stock_actual: stockA, stock_minimo: stockM })
        } else {
          upserts.push({ cliente_id: CLIENTE_ID, producto_id: prodId, sucursal_id: sucId ?? null, stock_actual: stockA, stock_minimo: stockM })
        }
      })

      if (upserts.length > 0) {
        const { error } = await supabase.from('inventario').upsert(upserts, { onConflict: 'id' })
        if (error) { errores.push(`Error al guardar: ${error.message}`) }
        else {
          setImportOk(upserts.length)
          await cargar()
          supabase.rpc('registrar_auditoria', {
            p_accion: 'importar',
            p_modulo: 'inventario',
            p_descripcion: `Importación masiva de inventario: ${upserts.length} registros actualizados`,
            p_referencia_id: null,
          })
        }
      } else if (errores.length === 0) {
        errores.push('El archivo no contiene filas con datos válidos.')
      }

      setImportErrors(errores)
    } catch (e) {
      setImportErrors([`Error al leer el archivo: ${e.message}`])
    } finally {
      setImportando(false)
      if (importRef.current) importRef.current.value = ''
    }
  }

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
    exportarExcel(datos, 'Inventario', 'Stock_Inventario', logoUrl, nombreEmpresa)
  }

  return (
    <>
    <div className="space-y-4 page-enter">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Stock Actual</h1>
        <button onClick={descargarPlantilla} className="btn-secondary flex items-center gap-2 text-sm">
          <FileDown className="w-4 h-4" /> Plantilla
        </button>
        <button onClick={() => { setImportErrors([]); setImportOk(null); setModalImport(true) }}
          className="btn-secondary flex items-center gap-2 text-sm">
          <FileUp className="w-4 h-4" /> Importar
        </button>
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

    {/* Modal importar inventario */}
    {modalImport && (
      <div className="modal-backdrop">
        <div className="modal-panel w-full max-w-md">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Importar inventario</h3>
                <p className="text-xs text-slate-400 mt-0.5">Carga un Excel con el formato de la plantilla</p>
              </div>
              <button onClick={() => setModalImport(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
              <li>Descarga la plantilla con el botón <span className="font-semibold text-slate-700">Plantilla</span>.</li>
              <li>Completa las columnas <span className="font-semibold text-slate-700">Stock Actual</span> y <span className="font-semibold text-slate-700">Stock Mínimo</span>.</li>
              <li>No cambies los nombres de Producto ni Sucursal.</li>
              <li>Sube el archivo aquí.</li>
            </ol>

            {importOk !== null && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-700 text-sm">
                <Check className="w-4 h-4 flex-shrink-0" />
                {importOk} registro{importOk !== 1 ? 's' : ''} importado{importOk !== 1 ? 's' : ''} correctamente.
              </div>
            )}

            {importErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1 max-h-40 overflow-y-auto">
                {importErrors.map((e, i) => (
                  <p key={i} className="text-xs text-red-700">{e}</p>
                ))}
              </div>
            )}

            <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors
              ${importando ? 'opacity-60 pointer-events-none' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'}`}>
              <Upload className="w-7 h-7 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">
                {importando ? 'Procesando...' : 'Haz clic o arrastra tu archivo .xlsx'}
              </span>
              <span className="text-xs text-slate-400">Solo archivos .xlsx</span>
              <input
                ref={importRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) procesarImport(e.target.files[0]) }}
              />
            </label>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setModalImport(false)} className="btn-secondary flex-1 justify-center text-sm">
                Cerrar
              </button>
              <button onClick={descargarPlantilla} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors">
                <FileDown className="w-4 h-4" /> Descargar plantilla
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

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
