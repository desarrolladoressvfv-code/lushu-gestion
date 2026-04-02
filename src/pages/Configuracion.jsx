import { useEffect, useState } from 'react'
import { supabase, CLIENTE_ID, clp } from '../lib/supabase'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

const TABS = ['Productos', 'Convenios', 'Trabajadores', 'Proveedores', 'Sucursales']

// ─── CRUD genérico ───────────────────────────────────────────────────────────
function useTabla(tabla) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})
  const [nuevo, setNuevo] = useState(false)
  const [nuevoData, setNuevoData] = useState({})

  async function cargar() {
    const { data } = await supabase.from(tabla).select('*').eq('cliente_id', CLIENTE_ID).order('numero', { nullsFirst: false })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { cargar() }, [tabla])

  async function guardarNuevo() {
    await supabase.from(tabla).insert({ cliente_id: CLIENTE_ID, ...nuevoData, activo: true })
    setNuevo(false); setNuevoData({}); cargar()
  }
  async function guardarEdicion(id) {
    await supabase.from(tabla).update(editData).eq('id', id)
    setEditId(null); cargar()
  }
  async function eliminar(id) {
    if (!confirm('¿Eliminar este registro?')) return
    await supabase.from(tabla).delete().eq('id', id); cargar()
  }
  async function toggleActivo(id, activo) {
    await supabase.from(tabla).update({ activo: !activo }).eq('id', id); cargar()
  }
  return { rows, loading, editId, editData, setEditId, setEditData, nuevo, setNuevo, nuevoData, setNuevoData, guardarNuevo, guardarEdicion, eliminar, toggleActivo }
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
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => { t.setNuevo(true); t.setNuevoData({ numero: '', nombre: '', precio: 0 }) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Agregar Producto
        </button>
      </div>
      <TablaWrapper headers={['N°', 'Nombre', 'Precio', 'Estado', 'Acciones']}>
        {t.nuevo && (
          <tr className="bg-blue-50/60">
            <td className="px-4 py-2"><input className="input-base" value={t.nuevoData.numero || ''} onChange={e => t.setNuevoData(p => ({ ...p, numero: e.target.value }))} placeholder="N°" /></td>
            <td className="px-4 py-2"><input className="input-base" value={t.nuevoData.nombre || ''} onChange={e => t.setNuevoData(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre" /></td>
            <td className="px-4 py-2"><input className="input-base" type="number" value={t.nuevoData.precio || ''} onChange={e => t.setNuevoData(p => ({ ...p, precio: e.target.value }))} placeholder="Precio" /></td>
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
                <td />
                <AccionesFila onConfirm={() => t.guardarEdicion(r.id)} onCancel={() => t.setEditId(null)} />
              </>
            ) : (
              <>
                <td className="px-4 py-3 text-slate-500">{r.numero}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{r.nombre}</td>
                <td className="px-4 py-3 text-money">{clp(r.precio)}</td>
                <td className="px-4 py-3"><ToggleActivo activo={r.activo} onClick={() => t.toggleActivo(r.id, r.activo)} /></td>
                <AccionesFila onEdit={() => { t.setEditId(r.id); t.setEditData({ numero: r.numero, nombre: r.nombre, precio: r.precio }) }} onDelete={() => t.eliminar(r.id)} />
              </>
            )}
          </tr>
        ))}
        {t.rows.length === 0 && !t.nuevo && <tr><td colSpan={5} className="text-center py-8 text-slate-400">Sin productos</td></tr>}
      </TablaWrapper>
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
        <button onClick={() => { t.setNuevo(true); t.setNuevoData({ numero: '', nombre: '', valor: 0 }) }} className="btn-primary">
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
                <AccionesFila onEdit={() => { t.setEditId(r.id); t.setEditData({ numero: r.numero, nombre: r.nombre, valor: r.valor }) }} onDelete={() => t.eliminar(r.id)} />
              </>
            )}
          </tr>
        ))}
        {t.rows.length === 0 && !t.nuevo && <tr><td colSpan={5} className="text-center py-8 text-slate-400">Sin convenios</td></tr>}
      </TablaWrapper>
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
        <button onClick={() => { t.setNuevo(true); t.setNuevoData({ numero: '', nombre: '' }) }} className="btn-primary">
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
                <AccionesFila onEdit={() => { t.setEditId(r.id); t.setEditData({ numero: r.numero, nombre: r.nombre }) }} onDelete={() => t.eliminar(r.id)} />
              </>
            )}
          </tr>
        ))}
        {t.rows.length === 0 && !t.nuevo && <tr><td colSpan={4} className="text-center py-8 text-slate-400">Sin trabajadores</td></tr>}
      </TablaWrapper>
    </div>
  )
}

// ─── Tab Proveedores ──────────────────────────────────────────────────────────
function TabProveedores() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo] = useState(false)
  const [nuevoData, setNuevoData] = useState({ nombre: '', contacto: '', telefono: '', email: '' })
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})

  async function cargar() {
    const { data } = await supabase.from('proveedores').select('*').eq('cliente_id', CLIENTE_ID).order('nombre')
    setRows(data || []); setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  async function guardarNuevo() {
    await supabase.from('proveedores').insert({ cliente_id: CLIENTE_ID, ...nuevoData, activo: true })
    setNuevo(false); setNuevoData({ nombre: '', contacto: '', telefono: '', email: '' }); cargar()
  }
  async function guardarEdicion(id) {
    await supabase.from('proveedores').update(editData).eq('id', id)
    setEditId(null); cargar()
  }
  async function eliminar(id) {
    if (!confirm('¿Eliminar este proveedor?')) return
    await supabase.from('proveedores').delete().eq('id', id); cargar()
  }

  if (loading) return <div className="py-8 text-center text-slate-400">Cargando...</div>

  const campos = ['nombre', 'contacto', 'telefono', 'email']
  const placeholders = { nombre: 'Nombre', contacto: 'Contacto', telefono: 'Teléfono', email: 'Email' }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setNuevo(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Agregar Proveedor
        </button>
      </div>
      <TablaWrapper headers={['Nombre', 'Contacto', 'Teléfono', 'Email', 'Acciones']}>
        {nuevo && (
          <tr className="bg-blue-50/60">
            {campos.map(c => (
              <td key={c} className="px-4 py-2">
                <input className="input-base" value={nuevoData[c] || ''} onChange={e => setNuevoData(p => ({ ...p, [c]: e.target.value }))} placeholder={placeholders[c]} />
              </td>
            ))}
            <AccionesFila onConfirm={guardarNuevo} onCancel={() => setNuevo(false)} />
          </tr>
        )}
        {rows.map(r => (
          <tr key={r.id} className="tabla-fila">
            {editId === r.id ? (
              <>
                {campos.map(c => (
                  <td key={c} className="px-4 py-2">
                    <input className="input-base" value={editData[c] || ''} onChange={e => setEditData(p => ({ ...p, [c]: e.target.value }))} />
                  </td>
                ))}
                <AccionesFila onConfirm={() => guardarEdicion(r.id)} onCancel={() => setEditId(null)} />
              </>
            ) : (
              <>
                <td className="px-4 py-3 font-medium text-slate-900">{r.nombre}</td>
                <td className="px-4 py-3 text-slate-500">{r.contacto || '-'}</td>
                <td className="px-4 py-3 text-slate-500">{r.telefono || '-'}</td>
                <td className="px-4 py-3 text-slate-500">{r.email || '-'}</td>
                <AccionesFila onEdit={() => { setEditId(r.id); setEditData({ nombre: r.nombre, contacto: r.contacto, telefono: r.telefono, email: r.email }) }} onDelete={() => eliminar(r.id)} />
              </>
            )}
          </tr>
        ))}
        {rows.length === 0 && !nuevo && <tr><td colSpan={5} className="text-center py-8 text-slate-400">Sin proveedores</td></tr>}
      </TablaWrapper>
    </div>
  )
}

// ─── Tab Sucursales ───────────────────────────────────────────────────────────
function TabSucursales() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo] = useState(false)
  const [nuevoData, setNuevoData] = useState({ nombre: '', direccion: '' })
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})
  const [errorMsg, setErrorMsg] = useState('')

  async function cargar() {
    const { data } = await supabase.from('sucursales').select('*').eq('cliente_id', CLIENTE_ID).order('nombre')
    setRows(data || []); setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  async function guardarNuevo() {
    if (!nuevoData.nombre) return
    setErrorMsg('')
    const { error } = await supabase.from('sucursales').insert({ cliente_id: CLIENTE_ID, nombre: nuevoData.nombre, direccion: nuevoData.direccion || null, activo: true })
    if (error) { setErrorMsg(error.message); return }
    setNuevo(false); setNuevoData({ nombre: '', direccion: '' }); cargar()
  }
  async function guardarEdicion(id) {
    setErrorMsg('')
    const { error } = await supabase.from('sucursales').update(editData).eq('id', id)
    if (error) { setErrorMsg(error.message); return }
    setEditId(null); cargar()
  }
  async function toggleActivo(id, activo) {
    await supabase.from('sucursales').update({ activo: !activo }).eq('id', id); cargar()
  }
  async function eliminar(id) {
    if (!confirm('¿Eliminar esta sucursal?')) return
    await supabase.from('sucursales').delete().eq('id', id); cargar()
  }

  if (loading) return <div className="py-8 text-center text-slate-400">Cargando...</div>

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => { setNuevo(true); setErrorMsg('') }} className="btn-primary">
          <Plus className="w-4 h-4" /> Agregar Sucursal
        </button>
      </div>
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
          {errorMsg}
        </div>
      )}
      <TablaWrapper headers={['Nombre', 'Dirección', 'Estado', 'Acciones']}>
        {nuevo && (
          <tr className="bg-blue-50/60">
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
                <td className="px-4 py-2"><input className="input-base" value={editData.nombre || ''} onChange={e => setEditData(p => ({ ...p, nombre: e.target.value }))} /></td>
                <td className="px-4 py-2"><input className="input-base" value={editData.direccion || ''} onChange={e => setEditData(p => ({ ...p, direccion: e.target.value }))} /></td>
                <td />
                <AccionesFila onConfirm={() => guardarEdicion(r.id)} onCancel={() => setEditId(null)} />
              </>
            ) : (
              <>
                <td className="px-4 py-3 font-medium text-slate-900">{r.nombre}</td>
                <td className="px-4 py-3 text-slate-500">{r.direccion || '-'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActivo(r.id, r.activo)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${r.activo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                    {r.activo ? 'Activa' : 'Inactiva'}
                  </button>
                </td>
                <AccionesFila onEdit={() => { setEditId(r.id); setEditData({ nombre: r.nombre, direccion: r.direccion }) }} onDelete={() => eliminar(r.id)} />
              </>
            )}
          </tr>
        ))}
        {rows.length === 0 && !nuevo && <tr><td colSpan={4} className="text-center py-8 text-slate-400">Sin sucursales registradas</td></tr>}
      </TablaWrapper>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Configuracion() {
  const [tab, setTab] = useState(0)

  return (
    <div className="space-y-5 page-enter">
      <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl w-fit max-w-full overflow-x-auto">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap ${
              tab === i
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <TabProductos />}
      {tab === 1 && <TabConvenios />}
      {tab === 2 && <TabTrabajadores />}
      {tab === 3 && <TabProveedores />}
      {tab === 4 && <TabSucursales />}
    </div>
  )
}
