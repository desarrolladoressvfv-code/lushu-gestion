import { useEffect, useRef, useState } from 'react'
import { supabase, CLIENTE_ID, clp } from '../lib/supabase'
import { Plus, Pencil, Trash2, Check, X, PlayCircle, Building2, AlertTriangle } from 'lucide-react'

/* ── Toast ─────────────────────────────────────────────── */
function Toast({ mensaje, tipo, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3
      px-4 py-3 rounded-2xl shadow-xl text-sm font-medium animate-modal
      ${tipo === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
      {tipo === 'ok' ? <Check className="w-4 h-4 flex-shrink-0" /> : <X className="w-4 h-4 flex-shrink-0" />}
      {mensaje}
    </div>
  )
}

/* ── Modal de confirmación ──────────────────────────────── */
function ConfirmModal({ titulo, mensaje, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-modal">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 text-sm">{titulo}</p>
            <p className="text-slate-500 text-xs mt-1">{mensaje}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}
import { useAuth } from '../context/AuthContext'
import { useTour } from '../context/TourContext'
import { useEmpresa } from '../context/EmpresaContext'

const TABS = ['Mi Empresa', 'Productos', 'Convenios', 'Trabajadores', 'Proveedores', 'Sucursales', 'Usuarios', 'Auditoría']

const TODOS_MODULOS = [
  { key: 'dashboard',   label: 'Dashboard' },
  { key: 'formulario',  label: 'Nuevo Servicio' },
  { key: 'cotizacion',  label: 'Cotización' },
  { key: 'servicios',   label: 'Servicios' },
  { key: 'fallecidos',  label: 'Fallecidos' },
  { key: 'formas_pago', label: 'Formas de Pago' },
  { key: 'inventario',  label: 'Stock Actual' },
  { key: 'movimientos', label: 'Movimientos' },
  { key: 'compras',     label: 'Órdenes de Compra' },
  { key: 'recepcion',   label: 'Recepción' },
]

// ─── Tab Mi Empresa ──────────────────────────────────────────────────────────
function TabEmpresa() {
  const { nombreEmpresa, cargandoEmpresa, actualizarNombre } = useEmpresa()
  const [valor,    setValor]    = useState('')
  const [guardando,setGuardando]= useState(false)
  const [ok,       setOk]       = useState(false)
  const [error,    setError]    = useState('')

  // Sincronizar input cuando carga el contexto
  useEffect(() => {
    if (!cargandoEmpresa) setValor(nombreEmpresa)
  }, [nombreEmpresa, cargandoEmpresa])

  async function guardar(e) {
    e.preventDefault()
    if (!valor.trim()) { setError('El nombre no puede estar vacío'); return }
    setGuardando(true)
    setOk(false)
    setError('')
    const exito = await actualizarNombre(valor)
    if (exito) {
      setOk(true)
      setTimeout(() => setOk(false), 3500)
    } else {
      setError('No se pudo guardar. Intenta de nuevo.')
    }
    setGuardando(false)
  }

  return (
    <div className="max-w-lg space-y-5">
      <div className="form-section">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4.5 h-4.5 text-blue-600" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Nombre de la empresa</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Aparece en el sidebar, encabezado, PDFs de cotización y el asistente Lushu's.
            </p>
          </div>
        </div>

        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="label-base">Nombre de la empresa</label>
            {cargandoEmpresa ? (
              <div className="skeleton h-10 w-full rounded-xl" />
            ) : (
              <input
                value={valor}
                onChange={e => { setValor(e.target.value); setError('') }}
                className="input-base"
                placeholder="Mi Empresa"
                maxLength={80}
                required
              />
            )}
            <p className="text-xs text-slate-400 mt-1">
              Si lo dejas vacío se usará "Mi Empresa" como valor por defecto.
            </p>
          </div>

          {ok && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700
                            rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              Nombre actualizado en toda la aplicación
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700
                            rounded-xl px-4 py-2.5 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={guardando || cargandoEmpresa}
              className="btn-primary">
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>

      {/* Preview */}
      {!cargandoEmpresa && (
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Vista previa en el sidebar
          </p>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-300 font-bold text-xs">
                {(valor || 'Mi Empresa').charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-white text-xs font-semibold truncate">{valor || 'Mi Empresa'}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CRUD genérico ───────────────────────────────────────────────────────────
function useTabla(tabla) {
  const [rows,          setRows]          = useState([])
  const [loading,       setLoading]       = useState(true)
  const [editId,        setEditId]        = useState(null)
  const [editData,      setEditData]      = useState({})
  const [nuevo,         setNuevo]         = useState(false)
  const [nuevoData,     setNuevoData]     = useState({})
  // M3: toast
  const [toast,         setToast]         = useState(null)
  const clearToast = () => setToast(null)
  // M8: confirmación de eliminación
  const [pendingDelete, setPendingDelete] = useState(null)

  async function cargar() {
    const { data } = await supabase.from(tabla).select('*').eq('cliente_id', CLIENTE_ID).order('numero', { nullsFirst: false })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { cargar() }, [tabla])

  async function guardarNuevo() {
    const { error } = await supabase.from(tabla).insert({ cliente_id: CLIENTE_ID, ...nuevoData, activo: true })
    if (error) { setToast({ msg: 'Error al guardar el registro', tipo: 'error' }); return }
    setNuevo(false); setNuevoData({})
    setToast({ msg: 'Registro guardado correctamente', tipo: 'ok' })
    cargar()
  }
  async function guardarEdicion(id) {
    const { error } = await supabase.from(tabla).update(editData).eq('id', id)
    if (error) { setToast({ msg: 'Error al actualizar el registro', tipo: 'error' }); return }
    setEditId(null)
    setToast({ msg: 'Cambios guardados', tipo: 'ok' })
    cargar()
  }
  // M8: reemplaza window.confirm() con modal
  function solicitarEliminar(id) { setPendingDelete(id) }
  async function confirmarEliminar() {
    if (!pendingDelete) return
    const { error } = await supabase.from(tabla).delete().eq('id', pendingDelete)
    setPendingDelete(null)
    if (error) { setToast({ msg: 'Error al eliminar el registro', tipo: 'error' }); return }
    setToast({ msg: 'Registro eliminado', tipo: 'ok' })
    cargar()
  }
  function cancelarEliminar() { setPendingDelete(null) }

  async function toggleActivo(id, activo) {
    await supabase.from(tabla).update({ activo: !activo }).eq('id', id); cargar()
  }
  return {
    rows, loading, editId, editData, setEditId, setEditData,
    nuevo, setNuevo, nuevoData, setNuevoData,
    guardarNuevo, guardarEdicion,
    solicitarEliminar, confirmarEliminar, cancelarEliminar, pendingDelete,
    toggleActivo,
    toast, clearToast,
  }
}

// ─── Componentes de fila de tabla ────────────────────────────────────────────
function TablaWrapper({ headers, children, emptyMsg }) {
  return (
    <div className="tabla-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {headers.map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AccionesFila({ onConfirm, onCancel, onEdit, onDelete }) {
  if (onConfirm) {
    return (
      <td className="px-4 py-2">
        <div className="flex gap-2">
          <button onClick={onConfirm} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={onCancel} className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors"><X className="w-3.5 h-3.5" /></button>
        </div>
      </td>
    )
  }
  return (
    <td className="px-4 py-3">
      <div className="flex gap-2">
        <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </td>
  )
}

function ToggleActivo({ activo, onClick }) {
  return (
    <button onClick={onClick}
      className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${activo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
      {activo ? 'Activo' : 'Inactivo'}
    </button>
  )
}

// ─── Tab Productos ────────────────────────────────────────────────────────────
function TabProductos() {
  const t = useTabla('productos')
  if (t.loading) return <div className="py-8 text-center text-slate-400">Cargando...</div>

  return (
    <div className="space-y-3 relative">
      <div className="flex justify-end">
        <button onClick={() => {
          const nextNum = Math.max(0, ...t.rows.map(r => Number(r.numero) || 0)) + 1
          t.setNuevo(true)
          t.setNuevoData({ numero: String(nextNum), nombre: '', precio: 0, stock_minimo: 5 })
        }} className="btn-primary">
          <Plus className="w-4 h-4" /> Agregar Producto
        </button>
      </div>
      <TablaWrapper headers={['N°', 'Nombre', 'Precio', 'Stock Mín.', 'Estado', 'Acciones']}>
        {t.nuevo && (
          <tr className="bg-blue-50/60">
            <td className="px-4 py-2"><input className="input-base" value={t.nuevoData.numero || ''} onChange={e => t.setNuevoData(p => ({ ...p, numero: e.target.value }))} placeholder="N°" /></td>
            <td className="px-4 py-2"><input className="input-base" value={t.nuevoData.nombre || ''} onChange={e => t.setNuevoData(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre" /></td>
            <td className="px-4 py-2"><input className="input-base" type="number" value={t.nuevoData.precio || ''} onChange={e => t.setNuevoData(p => ({ ...p, precio: e.target.value }))} placeholder="Precio" /></td>
            <td className="px-4 py-2">
              <input className="input-base w-20" type="number" min={0} step={1}
                value={t.nuevoData.stock_minimo ?? 5}
                onChange={e => t.setNuevoData(p => ({ ...p, stock_minimo: Math.max(0, parseInt(e.target.value) || 0) }))}
                placeholder="5" />
            </td>
            <td />
            <AccionesFila onConfirm={t.guardarNuevo} onCancel={() => t.setNuevo(false)} />
          </tr>
        )}
        {t.rows.map(r => (
          <tr key={r.id} className="tabla-fila">
            {t.editId === r.id ? (
              <>
                <td className="px-4 py-2"><input className="input-base" value={t.editData.numero || ''} onChange={e => t.setEditData(p => ({ ...p, numero: e.target.value }))} /></td>
                <td className="px-4 py-2"><input className="input-base" value={t.editData.nombre || ''} onChange={e => t.setEditData(p => ({ ...p, nombre: e.target.value }))} /></td>
                <td className="px-4 py-2"><input className="input-base" type="number" value={t.editData.precio || ''} onChange={e => t.setEditData(p => ({ ...p, precio: e.target.value }))} /></td>
                <td className="px-4 py-2">
                  <input className="input-base w-20" type="number" min={0} step={1}
                    value={t.editData.stock_minimo ?? 5}
                    onChange={e => t.setEditData(p => ({ ...p, stock_minimo: Math.max(0, parseInt(e.target.value) || 0) }))}
                    placeholder="5" />
                </td>
                <td />
                <AccionesFila onConfirm={() => t.guardarEdicion(r.id)} onCancel={() => t.setEditId(null)} />
              </>
            ) : (
              <>
                <td className="px-4 py-3 text-slate-500">{r.numero}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{r.nombre}</td>
                <td className="px-4 py-3 text-money">{clp(r.precio)}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-semibold text-slate-600">{r.stock_minimo ?? 5}</span>
                </td>
                <td className="px-4 py-3"><ToggleActivo activo={r.activo} onClick={() => t.toggleActivo(r.id, r.activo)} /></td>
                <AccionesFila
                  onEdit={() => { t.setEditId(r.id); t.setEditData({ numero: r.numero, nombre: r.nombre, precio: r.precio, stock_minimo: r.stock_minimo ?? 5 }) }}
                  onDelete={() => t.solicitarEliminar(r.id)} />
              </>
            )}
          </tr>
        ))}
        {t.rows.length === 0 && !t.nuevo && <tr><td colSpan={6} className="text-center py-8 text-slate-400">Sin productos</td></tr>}
      </TablaWrapper>
      {t.pendingDelete && <ConfirmModal titulo="¿Eliminar producto?" mensaje="Esta acción no se puede deshacer." onConfirm={t.confirmarEliminar} onCancel={t.cancelarEliminar} />}
      {t.toast && <Toast mensaje={t.toast.msg} tipo={t.toast.tipo} onClose={t.clearToast} />}
    </div>
  )
}

// ─── Tab Convenios ────────────────────────────────────────────────────────────
function TabConvenios() {
  const t = useTabla('convenios')
  if (t.loading) return <div className="py-8 text-center text-slate-400">Cargando...</div>

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => {
          const nextNum = Math.max(0, ...t.rows.map(r => Number(r.numero) || 0)) + 1
          t.setNuevo(true)
          t.setNuevoData({ numero: String(nextNum), nombre: '', valor: 0 })
        }} className="btn-primary">
          <Plus className="w-4 h-4" /> Agregar Convenio
        </button>
      </div>
      <TablaWrapper headers={['N°', 'Nombre', 'Valor', 'Estado', 'Acciones']}>
        {t.nuevo && (
          <tr className="bg-blue-50/60">
            <td className="px-4 py-2"><input className="input-base" value={t.nuevoData.numero || ''} onChange={e => t.setNuevoData(p => ({ ...p, numero: e.target.value }))} placeholder="N°" /></td>
            <td className="px-4 py-2"><input className="input-base" value={t.nuevoData.nombre || ''} onChange={e => t.setNuevoData(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre" /></td>
            <td className="px-4 py-2"><input className="input-base" type="number" value={t.nuevoData.valor || ''} onChange={e => t.setNuevoData(p => ({ ...p, valor: e.target.value }))} placeholder="Valor" /></td>
            <td />
            <AccionesFila onConfirm={t.guardarNuevo} onCancel={() => t.setNuevo(false)} />
          </tr>
        )}
        {t.rows.map(r => (
          <tr key={r.id} className="tabla-fila">
            {t.editId === r.id ? (
              <>
                <td className="px-4 py-2"><input className="input-base" value={t.editData.numero || ''} onChange={e => t.setEditData(p => ({ ...p, numero: e.target.value }))} /></td>
                <td className="px-4 py-2"><input className="input-base" value={t.editData.nombre || ''} onChange={e => t.setEditData(p => ({ ...p, nombre: e.target.value }))} /></td>
                <td className="px-4 py-2"><input className="input-base" type="number" value={t.editData.valor || ''} onChange={e => t.setEditData(p => ({ ...p, valor: e.target.value }))} /></td>
                <td />
                <AccionesFila onConfirm={() => t.guardarEdicion(r.id)} onCancel={() => t.setEditId(null)} />
              </>
            ) : (
              <>
                <td className="px-4 py-3 text-slate-500">{r.numero}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{r.nombre}</td>
                <td className="px-4 py-3 text-money">{clp(r.valor)}</td>
                <td className="px-4 py-3"><ToggleActivo activo={r.activo} onClick={() => t.toggleActivo(r.id, r.activo)} /></td>
                <AccionesFila onEdit={() => { t.setEditId(r.id); t.setEditData({ numero: r.numero, nombre: r.nombre, valor: r.valor }) }} onDelete={() => t.solicitarEliminar(r.id)} />
              </>
            )}
          </tr>
        ))}
        {t.rows.length === 0 && !t.nuevo && <tr><td colSpan={5} className="text-center py-8 text-slate-400">Sin convenios</td></tr>}
      </TablaWrapper>
      {t.pendingDelete && <ConfirmModal titulo="¿Eliminar convenio?" mensaje="Esta acción no se puede deshacer." onConfirm={t.confirmarEliminar} onCancel={t.cancelarEliminar} />}
      {t.toast && <Toast mensaje={t.toast.msg} tipo={t.toast.tipo} onClose={t.clearToast} />}
    </div>
  )
}

// ─── Tab Trabajadores ─────────────────────────────────────────────────────────
function TabTrabajadores() {
  const t = useTabla('trabajadores')
  if (t.loading) return <div className="py-8 text-center text-slate-400">Cargando...</div>

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => {
          const nextNum = Math.max(0, ...t.rows.map(r => Number(r.numero) || 0)) + 1
          t.setNuevo(true)
          t.setNuevoData({ numero: String(nextNum), nombre: '' })
        }} className="btn-primary">
          <Plus className="w-4 h-4" /> Agregar Trabajador
        </button>
      </div>
      <TablaWrapper headers={['N°', 'Nombre', 'Estado', 'Acciones']}>
        {t.nuevo && (
          <tr className="bg-blue-50/60">
            <td className="px-4 py-2"><input className="input-base" value={t.nuevoData.numero || ''} onChange={e => t.setNuevoData(p => ({ ...p, numero: e.target.value }))} placeholder="N°" /></td>
            <td className="px-4 py-2"><input className="input-base" value={t.nuevoData.nombre || ''} onChange={e => t.setNuevoData(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre completo" /></td>
            <td />
            <AccionesFila onConfirm={t.guardarNuevo} onCancel={() => t.setNuevo(false)} />
          </tr>
        )}
        {t.rows.map(r => (
          <tr key={r.id} className="tabla-fila">
            {t.editId === r.id ? (
              <>
                <td className="px-4 py-2"><input className="input-base" value={t.editData.numero || ''} onChange={e => t.setEditData(p => ({ ...p, numero: e.target.value }))} /></td>
                <td className="px-4 py-2"><input className="input-base" value={t.editData.nombre || ''} onChange={e => t.setEditData(p => ({ ...p, nombre: e.target.value }))} /></td>
                <td />
                <AccionesFila onConfirm={() => t.guardarEdicion(r.id)} onCancel={() => t.setEditId(null)} />
              </>
            ) : (
              <>
                <td className="px-4 py-3 text-slate-500">{r.numero}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{r.nombre}</td>
                <td className="px-4 py-3"><ToggleActivo activo={r.activo} onClick={() => t.toggleActivo(r.id, r.activo)} /></td>
                <AccionesFila onEdit={() => { t.setEditId(r.id); t.setEditData({ numero: r.numero, nombre: r.nombre }) }} onDelete={() => t.solicitarEliminar(r.id)} />
              </>
            )}
          </tr>
        ))}
        {t.rows.length === 0 && !t.nuevo && <tr><td colSpan={4} className="text-center py-8 text-slate-400">Sin trabajadores</td></tr>}
      </TablaWrapper>
      {t.pendingDelete && <ConfirmModal titulo="¿Eliminar trabajador?" mensaje="Esta acción no se puede deshacer." onConfirm={t.confirmarEliminar} onCancel={t.cancelarEliminar} />}
      {t.toast && <Toast mensaje={t.toast.msg} tipo={t.toast.tipo} onClose={t.clearToast} />}
    </div>
  )
}

// ─── Tab Proveedores ──────────────────────────────────────────────────────────
function TabProveedores() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo] = useState(false)
  const [nuevoData, setNuevoData] = useState({ numero: '', nombre: '', contacto: '', telefono: '', email: '' })
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})
  const [toast, setToast] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  async function cargar() {
    const { data } = await supabase.from('proveedores').select('*').eq('cliente_id', CLIENTE_ID).order('numero', { nullsFirst: false })
    setRows(data || []); setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  async function guardarNuevo() {
    const { error } = await supabase.from('proveedores').insert({ cliente_id: CLIENTE_ID, ...nuevoData, activo: true })
    if (error) { setToast({ msg: 'Error al guardar', tipo: 'error' }); return }
    setNuevo(false); setNuevoData({ numero: '', nombre: '', contacto: '', telefono: '', email: '' })
    setToast({ msg: 'Proveedor guardado', tipo: 'ok' }); cargar()
  }
  async function guardarEdicion(id) {
    const { error } = await supabase.from('proveedores').update(editData).eq('id', id)
    if (error) { setToast({ msg: 'Error al actualizar', tipo: 'error' }); return }
    setEditId(null); setToast({ msg: 'Cambios guardados', tipo: 'ok' }); cargar()
  }
  async function confirmarEliminar() {
    const { error } = await supabase.from('proveedores').delete().eq('id', pendingDelete)
    setPendingDelete(null)
    if (error) { setToast({ msg: 'Error al eliminar', tipo: 'error' }); return }
    setToast({ msg: 'Proveedor eliminado', tipo: 'ok' }); cargar()
  }

  if (loading) return <div className="py-8 text-center text-slate-400">Cargando...</div>

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => {
          const nextNum = Math.max(0, ...rows.map(r => Number(r.numero) || 0)) + 1
          setNuevo(true)
          setNuevoData({ numero: String(nextNum), nombre: '', contacto: '', telefono: '', email: '' })
        }} className="btn-primary">
          <Plus className="w-4 h-4" /> Agregar Proveedor
        </button>
      </div>
      <TablaWrapper headers={['N°', 'Nombre', 'Contacto', 'Teléfono', 'Email', 'Acciones']}>
        {nuevo && (
          <tr className="bg-blue-50/60">
            <td className="px-4 py-2"><input className="input-base w-16" value={nuevoData.numero || ''} onChange={e => setNuevoData(p => ({ ...p, numero: e.target.value }))} placeholder="N°" /></td>
            <td className="px-4 py-2"><input className="input-base" value={nuevoData.nombre || ''} onChange={e => setNuevoData(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre" /></td>
            <td className="px-4 py-2"><input className="input-base" value={nuevoData.contacto || ''} onChange={e => setNuevoData(p => ({ ...p, contacto: e.target.value }))} placeholder="Contacto" /></td>
            <td className="px-4 py-2"><input className="input-base" value={nuevoData.telefono || ''} onChange={e => setNuevoData(p => ({ ...p, telefono: e.target.value }))} placeholder="Teléfono" /></td>
            <td className="px-4 py-2"><input className="input-base" value={nuevoData.email || ''} onChange={e => setNuevoData(p => ({ ...p, email: e.target.value }))} placeholder="Email" /></td>
            <AccionesFila onConfirm={guardarNuevo} onCancel={() => setNuevo(false)} />
          </tr>
        )}
        {rows.map(r => (
          <tr key={r.id} className="tabla-fila">
            {editId === r.id ? (
              <>
                <td className="px-4 py-2"><input className="input-base w-16" value={editData.numero || ''} onChange={e => setEditData(p => ({ ...p, numero: e.target.value }))} /></td>
                <td className="px-4 py-2"><input className="input-base" value={editData.nombre || ''} onChange={e => setEditData(p => ({ ...p, nombre: e.target.value }))} /></td>
                <td className="px-4 py-2"><input className="input-base" value={editData.contacto || ''} onChange={e => setEditData(p => ({ ...p, contacto: e.target.value }))} /></td>
                <td className="px-4 py-2"><input className="input-base" value={editData.telefono || ''} onChange={e => setEditData(p => ({ ...p, telefono: e.target.value }))} /></td>
                <td className="px-4 py-2"><input className="input-base" value={editData.email || ''} onChange={e => setEditData(p => ({ ...p, email: e.target.value }))} /></td>
                <AccionesFila onConfirm={() => guardarEdicion(r.id)} onCancel={() => setEditId(null)} />
              </>
            ) : (
              <>
                <td className="px-4 py-3 text-slate-500">{r.numero ?? '-'}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{r.nombre}</td>
                <td className="px-4 py-3 text-slate-500">{r.contacto || '-'}</td>
                <td className="px-4 py-3 text-slate-500">{r.telefono || '-'}</td>
                <td className="px-4 py-3 text-slate-500">{r.email || '-'}</td>
                <AccionesFila
                  onEdit={() => { setEditId(r.id); setEditData({ numero: r.numero, nombre: r.nombre, contacto: r.contacto, telefono: r.telefono, email: r.email }) }}
                  onDelete={() => setPendingDelete(r.id)} />
              </>
            )}
          </tr>
        ))}
        {rows.length === 0 && !nuevo && <tr><td colSpan={6} className="text-center py-8 text-slate-400">Sin proveedores</td></tr>}
      </TablaWrapper>
      {pendingDelete && <ConfirmModal titulo="¿Eliminar proveedor?" mensaje="Esta acción no se puede deshacer." onConfirm={confirmarEliminar} onCancel={() => setPendingDelete(null)} />}
      {toast && <Toast mensaje={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

// ─── Tab Sucursales ───────────────────────────────────────────────────────────
function TabSucursales() {
  const { perfil } = useAuth()
  const maxSucursales = perfil?.max_sucursales || 1
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo] = useState(false)
  const [nuevoData, setNuevoData] = useState({ numero: '', nombre: '', direccion: '' })
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})
  const [errorMsg, setErrorMsg] = useState('')
  const [toast, setToast] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  async function cargar() {
    const { data } = await supabase.from('sucursales').select('*').eq('cliente_id', CLIENTE_ID).order('numero', { nullsFirst: false })
    setRows(data || []); setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  async function guardarNuevo() {
    if (!nuevoData.nombre) return
    setErrorMsg('')
    const { error } = await supabase.from('sucursales').insert({
      cliente_id: CLIENTE_ID,
      numero: nuevoData.numero ? Number(nuevoData.numero) : null,
      nombre: nuevoData.nombre,
      direccion: nuevoData.direccion || null,
      activo: true,
    })
    if (error) { setErrorMsg(error.message); return }
    setNuevo(false); setNuevoData({ numero: '', nombre: '', direccion: '' })
    setToast({ msg: 'Sucursal guardada', tipo: 'ok' }); cargar()
  }
  async function guardarEdicion(id) {
    setErrorMsg('')
    const { error } = await supabase.from('sucursales').update(editData).eq('id', id)
    if (error) { setErrorMsg(error.message); return }
    setEditId(null); setToast({ msg: 'Cambios guardados', tipo: 'ok' }); cargar()
  }
  async function toggleActivo(id, activo) {
    await supabase.from('sucursales').update({ activo: !activo }).eq('id', id); cargar()
  }
  async function confirmarEliminar() {
    const { error } = await supabase.from('sucursales').delete().eq('id', pendingDelete)
    setPendingDelete(null)
    if (error) { setToast({ msg: 'Error al eliminar la sucursal', tipo: 'error' }); return }
    setToast({ msg: 'Sucursal eliminada', tipo: 'ok' }); cargar()
  }

  if (loading) return <div className="py-8 text-center text-slate-400">Cargando...</div>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {rows.length} de {maxSucursales === 99 ? 'ilimitadas' : maxSucursales} sucursales usadas
        </p>
        {rows.length < maxSucursales ? (
          <button onClick={() => {
            const nextNum = Math.max(0, ...rows.map(r => Number(r.numero) || 0)) + 1
            setNuevo(true)
            setErrorMsg('')
            setNuevoData({ numero: String(nextNum), nombre: '', direccion: '' })
          }} className="btn-primary">
            <Plus className="w-4 h-4" /> Agregar Sucursal
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-medium">
              Límite de sucursales alcanzado ({maxSucursales}). Actualiza tu plan para agregar más.
            </span>
          </div>
        )}
      </div>
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
          {errorMsg}
        </div>
      )}
      <TablaWrapper headers={['N°', 'Nombre', 'Dirección', 'Estado', 'Acciones']}>
        {nuevo && (
          <tr className="bg-blue-50/60">
            <td className="px-4 py-2"><input className="input-base w-16" value={nuevoData.numero} onChange={e => setNuevoData(p => ({ ...p, numero: e.target.value }))} placeholder="N°" /></td>
            <td className="px-4 py-2"><input className="input-base" value={nuevoData.nombre} onChange={e => setNuevoData(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre de sucursal" /></td>
            <td className="px-4 py-2"><input className="input-base" value={nuevoData.direccion} onChange={e => setNuevoData(p => ({ ...p, direccion: e.target.value }))} placeholder="Dirección (opcional)" /></td>
            <td />
            <AccionesFila onConfirm={guardarNuevo} onCancel={() => setNuevo(false)} />
          </tr>
        )}
        {rows.map(r => (
          <tr key={r.id} className="tabla-fila">
            {editId === r.id ? (
              <>
                <td className="px-4 py-2"><input className="input-base w-16" value={editData.numero ?? ''} onChange={e => setEditData(p => ({ ...p, numero: e.target.value }))} /></td>
                <td className="px-4 py-2"><input className="input-base" value={editData.nombre || ''} onChange={e => setEditData(p => ({ ...p, nombre: e.target.value }))} /></td>
                <td className="px-4 py-2"><input className="input-base" value={editData.direccion || ''} onChange={e => setEditData(p => ({ ...p, direccion: e.target.value }))} /></td>
                <td />
                <AccionesFila onConfirm={() => guardarEdicion(r.id)} onCancel={() => setEditId(null)} />
              </>
            ) : (
              <>
                <td className="px-4 py-3 text-slate-500">{r.numero ?? '-'}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{r.nombre}</td>
                <td className="px-4 py-3 text-slate-500">{r.direccion || '-'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActivo(r.id, r.activo)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${r.activo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                    {r.activo ? 'Activa' : 'Inactiva'}
                  </button>
                </td>
                <AccionesFila
                  onEdit={() => { setEditId(r.id); setEditData({ numero: r.numero, nombre: r.nombre, direccion: r.direccion }) }}
                  onDelete={() => setPendingDelete(r.id)} />
              </>
            )}
          </tr>
        ))}
        {rows.length === 0 && !nuevo && <tr><td colSpan={5} className="text-center py-8 text-slate-400">Sin sucursales registradas</td></tr>}
      </TablaWrapper>
      {pendingDelete && <ConfirmModal titulo="¿Eliminar sucursal?" mensaje="Esta acción no se puede deshacer." onConfirm={confirmarEliminar} onCancel={() => setPendingDelete(null)} />}
      {toast && <Toast mensaje={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

// ─── Tab Usuarios ─────────────────────────────────────────────────────────────
function TabUsuarios() {
  const [usuarios, setUsuarios]         = useState([])
  const [sucursales, setSucursales]     = useState([])
  const [loading, setLoading]           = useState(true)
  const [modal, setModal]               = useState(false)
  const [editando, setEditando]         = useState(null)
  const [guardando, setGuardando]       = useState(false)
  const [toast, setToast]               = useState(null)
  const [form, setForm]                 = useState({
    nombre: '', email: '', password: '',
    acceso_tipo: 'general', sucursal_id: '',
    modulos_permitidos: [],
  })

  async function cargar() {
    setLoading(true)
    const [{ data: u }, { data: s }] = await Promise.all([
      supabase.rpc('get_usuarios_cliente'),
      supabase.from('sucursales').select('id,nombre').eq('cliente_id', CLIENTE_ID).eq('activo', true).order('nombre'),
    ])
    setUsuarios(u || [])
    setSucursales(s || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  function abrirModalNuevo() {
    setEditando(null)
    setForm({ nombre: '', email: '', password: '', acceso_tipo: 'general', sucursal_id: '', modulos_permitidos: [] })
    setModal(true)
  }

  function abrirModalEditar(u) {
    setEditando(u)
    setForm({
      nombre: u.nombre, email: u.email, password: '',
      acceso_tipo: u.acceso_tipo || 'general',
      sucursal_id: u.sucursal_id || '',
      modulos_permitidos: u.modulos_permitidos || [],
    })
    setModal(true)
  }

  function toggleModulo(key) {
    setForm(f => ({
      ...f,
      modulos_permitidos: f.modulos_permitidos.includes(key)
        ? f.modulos_permitidos.filter(m => m !== key)
        : [...f.modulos_permitidos, key],
    }))
  }

  async function guardar() {
    if (!form.nombre.trim()) { setToast({ msg: 'El nombre es obligatorio', tipo: 'error' }); return }
    if (!editando && (!form.email.trim() || !form.password.trim())) {
      setToast({ msg: 'Email y contraseña son obligatorios', tipo: 'error' }); return
    }
    setGuardando(true)
    try {
      if (editando) {
        // Actualizar datos del operador existente
        const { error } = await supabase.rpc('actualizar_operador', {
          p_usuario_id:         editando.id,
          p_acceso_tipo:        form.acceso_tipo,
          p_sucursal_id:        form.acceso_tipo === 'sucursal' ? form.sucursal_id || null : null,
          p_modulos_permitidos: form.modulos_permitidos,
          p_activo:             editando.activo,
        })
        if (error) throw new Error(error.message)
        setToast({ msg: 'Usuario actualizado', tipo: 'ok' })
      } else {
        // Crear nuevo operador via Edge Function
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crear-operador`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            nombre:             form.nombre.trim(),
            email:              form.email.trim(),
            password:           form.password,
            acceso_tipo:        form.acceso_tipo,
            sucursal_id:        form.acceso_tipo === 'sucursal' ? form.sucursal_id || null : null,
            modulos_permitidos: form.modulos_permitidos,
          }),
        })
        const result = await res.json()
        if (!result.ok) throw new Error(result.error)
        setToast({ msg: `Operador ${form.email} creado`, tipo: 'ok' })
      }
      setModal(false)
      cargar()
    } catch (e) {
      setToast({ msg: e.message, tipo: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo(u) {
    await supabase.rpc('toggle_usuario', { p_usuario_id: u.id })
    cargar()
  }

  async function resetPass(u) {
    const nueva = prompt(`Nueva contraseña para ${u.nombre} (mín. 6 caracteres):`)
    if (!nueva || nueva.length < 6) return
    // Marcar debe_cambiar_pass = true para forzar cambio en próximo login
    await supabase.from('usuarios').update({ debe_cambiar_pass: true }).eq('id', u.id)
    setToast({ msg: `Se forzará cambio de contraseña a ${u.nombre}`, tipo: 'ok' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}</p>
        <button onClick={abrirModalNuevo} className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo Operador
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">Cargando...</div>
      ) : (
        <div className="tabla-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Nombre', 'Email', 'Rol', 'Acceso', 'Sucursal', 'Último acceso', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {usuarios.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-slate-400">Sin usuarios registrados</td></tr>
                ) : usuarios.map(u => (
                  <tr key={u.id} className="tabla-fila">
                    <td className="px-4 py-3 font-medium text-slate-900">{u.nombre}</td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.rol === 'admin' ? 'badge-blue' : 'badge-gray'}`}>
                        {u.rol === 'admin' ? 'Admin' : 'Operador'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 capitalize">{u.acceso_tipo || 'general'}</td>
                    <td className="px-4 py-3 text-slate-500">{u.sucursal_nombre || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleDateString('es-CL') : 'Nunca'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.activo ? 'badge-green' : 'badge-gray'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.rol !== 'admin' && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => abrirModalEditar(u)}
                            className="p-1.5 rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Editar">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => toggleActivo(u)}
                            className={`p-1.5 rounded-lg transition-colors ${u.activo ? 'text-amber-400 hover:text-amber-600 hover:bg-amber-50' : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                            title={u.activo ? 'Desactivar' : 'Activar'}>
                            {u.activo ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => resetPass(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" title="Forzar cambio de contraseña">
                            <Building2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal crear/editar operador */}
      {modal && (
        <div className="modal-backdrop">
          <div className="modal-panel w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">{editando ? 'Editar operador' : 'Nuevo operador'}</h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Datos básicos — solo en creación */}
              {!editando && (
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="label-base">Nombre completo</label>
                    <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                      className="input-base" placeholder="Juan Pérez" />
                  </div>
                  <div>
                    <label className="label-base">Email</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="input-base" placeholder="juan@funeraria.cl" />
                  </div>
                  <div>
                    <label className="label-base">Contraseña temporal</label>
                    <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="input-base" placeholder="Mínimo 6 caracteres" />
                    <p className="text-xs text-slate-400 mt-1">El operador deberá cambiarla en su primer ingreso</p>
                  </div>
                </div>
              )}

              {/* Tipo de acceso */}
              <div>
                <label className="label-base">Tipo de acceso</label>
                <div className="flex gap-3">
                  {[['general', 'General (todas las sucursales)'], ['sucursal', 'Por sucursal específica']].map(([val, lbl]) => (
                    <label key={val} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="acceso_tipo" value={val}
                        checked={form.acceso_tipo === val}
                        onChange={() => setForm(f => ({ ...f, acceso_tipo: val }))}
                        className="accent-blue-600" />
                      <span className="text-sm text-slate-700">{lbl}</span>
                    </label>
                  ))}
                </div>
                {form.acceso_tipo === 'sucursal' && (
                  <select value={form.sucursal_id} onChange={e => setForm(f => ({ ...f, sucursal_id: e.target.value }))}
                    className="input-base mt-2">
                    <option value="">Seleccionar sucursal...</option>
                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                )}
              </div>

              {/* Módulos */}
              <div>
                <label className="label-base">Módulos habilitados</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {TODOS_MODULOS.map(m => (
                    <label key={m.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-100">
                      <input type="checkbox"
                        checked={form.modulos_permitidos.includes(m.key)}
                        onChange={() => toggleModulo(m.key)}
                        className="accent-blue-600 w-4 h-4" />
                      <span className="text-sm text-slate-700">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="btn-primary flex-1 justify-center">
                {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear operador'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast mensaje={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

// ─── Tab Auditoría ────────────────────────────────────────────────────────────
function TabAuditoria() {
  const [rows, setRows]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [filtroModulo, setFiltroModulo]   = useState('')
  const [filtroAccion, setFiltroAccion]   = useState('')
  const [desde, setDesde]         = useState('')
  const [hasta, setHasta]         = useState('')
  const [detalle, setDetalle]     = useState(null)

  useEffect(() => {
    supabase.from('auditoria').select('*')
      .eq('cliente_id', CLIENTE_ID)
      .order('fecha', { ascending: false })
      .limit(500)
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [])

  const filtrados = rows.filter(r => {
    if (filtroUsuario && !r.nombre_usuario?.toLowerCase().includes(filtroUsuario.toLowerCase())) return false
    if (filtroModulo && r.modulo !== filtroModulo) return false
    if (filtroAccion && r.accion !== filtroAccion) return false
    if (desde && r.fecha < desde) return false
    if (hasta && r.fecha?.slice(0,10) > hasta) return false
    return true
  })

  const modulos  = [...new Set(rows.map(r => r.modulo).filter(Boolean))]
  const acciones = [...new Set(rows.map(r => r.accion).filter(Boolean))]

  function exportar() {
    const datos = filtrados.map(r => ({
      'Fecha':    new Date(r.fecha).toLocaleString('es-CL'),
      'Usuario':  r.nombre_usuario || '',
      'Rol':      r.rol || '',
      'Acción':   r.accion || '',
      'Módulo':   r.modulo || '',
      'Descripción': r.descripcion || '',
    }))
    import('../lib/exportExcel').then(({ exportarExcel }) => exportarExcel(datos, 'Auditoría', 'Auditoria'))
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="filtros-bar flex flex-wrap gap-3 items-center">
        <input value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)}
          className="input-base w-40" placeholder="Buscar usuario..." />
        <select value={filtroModulo} onChange={e => setFiltroModulo(e.target.value)} className="input-base w-36">
          <option value="">Todos los módulos</option>
          {modulos.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filtroAccion} onChange={e => setFiltroAccion(e.target.value)} className="input-base w-32">
          <option value="">Todas las acciones</option>
          {acciones.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="input-base w-36" title="Desde" />
        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="input-base w-36" title="Hasta" />
        <button onClick={exportar} className="btn-excel ml-auto">
          <Plus className="w-4 h-4" /> Excel
        </button>
      </div>

      {loading ? <div className="text-center py-10 text-slate-400">Cargando...</div> : (
        <div className="tabla-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Fecha', 'Usuario', 'Rol', 'Acción', 'Módulo', 'Descripción', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtrados.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">Sin registros</td></tr>
                ) : filtrados.map(r => (
                  <tr key={r.id} className="tabla-fila">
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(r.fecha).toLocaleString('es-CL')}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.nombre_usuario || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${r.rol === 'admin' ? 'badge-blue' : 'badge-gray'}`}>{r.rol || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${
                        r.accion === 'crear' ? 'badge-green' :
                        r.accion === 'eliminar' ? 'badge-red' :
                        r.accion === 'editar' ? 'badge-amber' : 'badge-gray'
                      }`}>{r.accion}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 capitalize">{r.modulo}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{r.descripcion}</td>
                    <td className="px-4 py-3">
                      {(r.datos_anteriores || r.datos_nuevos) && (
                        <button onClick={() => setDetalle(r)}
                          className="text-xs text-blue-600 hover:underline">Ver detalle</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <div className="modal-backdrop">
          <div className="modal-panel w-full max-w-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Detalle del cambio</h3>
              <button onClick={() => setDetalle(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {detalle.datos_anteriores && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Antes</p>
                  <pre className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700 overflow-x-auto">
                    {JSON.stringify(detalle.datos_anteriores, null, 2)}
                  </pre>
                </div>
              )}
              {detalle.datos_nuevos && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Después</p>
                  <pre className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-700 overflow-x-auto">
                    {JSON.stringify(detalle.datos_nuevos, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Persiste el tab activo entre remontajes (Supabase refresca token al volver al tab)
let _configTab = 0

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Configuracion() {
  const [tab, setTab] = useState(_configTab)

  function cambiarTab(i) {
    _configTab = i
    setTab(i)
  }
  const { reiniciarOnboarding } = useAuth()
  const { setFase } = useTour()

  async function repetirTour() {
    await reiniciarOnboarding()
    setFase('bienvenida')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <button
          onClick={repetirTour}
          className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200
                     text-blue-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 self-start sm:self-auto">
          <PlayCircle className="w-4 h-4" />
          Repetir tour de bienvenida
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl w-fit max-w-full overflow-x-auto">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => cambiarTab(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap ${
              tab === i
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <TabEmpresa />}
      {tab === 1 && <TabProductos />}
      {tab === 2 && <TabConvenios />}
      {tab === 3 && <TabTrabajadores />}
      {tab === 4 && <TabProveedores />}
      {tab === 5 && <TabSucursales />}
      {tab === 6 && <TabUsuarios />}
      {tab === 7 && <TabAuditoria />}
    </div>
  )
}
