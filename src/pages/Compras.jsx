import { useEffect, useState } from 'react'
import { supabase, CLIENTE_ID, clp } from '../lib/supabase'
import { Plus, Trash2, Lock, X, AlertTriangle } from 'lucide-react'
import { SkeletonTabla } from '../components/SkeletonLoader'
import { hoyCL } from '../lib/fecha'

const itemVacio = () => ({ producto_id: '', cantidad: 1, precio_unitario: '' })

const ESTADO_BADGE = {
  pendiente: 'badge-amber',
  recibida: 'badge-green',
  cancelada: 'badge-gray',
}

export default function Compras() {
  const [ordenes, setOrdenes] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [productos, setProductos] = useState([])
  const [sucursales, setSucursales] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState('')
  const [form, setForm] = useState({ proveedor_id: '', sucursal_id: '', fecha: hoyCL(), notas: '' })
  const [items, setItems] = useState([itemVacio()])
  const [alertaId, setAlertaId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  async function cargar() {
    const [{ data: o }, { data: p }, { data: pr }, { data: s }] = await Promise.all([
      supabase.from('ordenes_compra').select('*, proveedores(nombre), sucursales(nombre)').eq('cliente_id', CLIENTE_ID).order('created_at', { ascending: false }),
      supabase.from('proveedores').select('id,nombre').eq('cliente_id', CLIENTE_ID).eq('activo', true),
      supabase.from('productos').select('id,nombre').eq('cliente_id', CLIENTE_ID).eq('activo', true).order('numero'),
      supabase.from('sucursales').select('id,nombre').eq('cliente_id', CLIENTE_ID).eq('activo', true).order('nombre'),
    ])
    setOrdenes(o || [])
    setProveedores(p || [])
    setProductos(pr || [])
    setSucursales(s || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const total = items.reduce((s, i) => s + (Number(i.cantidad) * Number(i.precio_unitario)), 0)

  function handleItem(idx, e) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [e.target.name]: e.target.value } : item))
  }

  function abrirModal() {
    setForm({ proveedor_id: '', sucursal_id: '', fecha: hoyCL(), notas: '' })
    setItems([itemVacio()])
    setModal(true)
  }

  async function guardar() {
    if (!form.proveedor_id) return
    setGuardando(true)
    setErrorGuardar('')
    try {
      const { data: oc, error: ocErr } = await supabase.from('ordenes_compra').insert({
        cliente_id: CLIENTE_ID,
        proveedor_id: form.proveedor_id,
        sucursal_id: form.sucursal_id || null,
        fecha: form.fecha,
        estado: 'pendiente',
        total,
        notas: form.notas,
      }).select().single()
      if (ocErr) throw ocErr
      const itemsValidos = items.filter(i => i.producto_id && Number(i.cantidad) > 0)
      if (itemsValidos.length > 0) {
        const { error: itemsErr } = await supabase.from('items_orden_compra').insert(
          itemsValidos.map(i => ({
            orden_compra_id: oc.id,
            producto_id: i.producto_id,
            cantidad: Number(i.cantidad),
            precio_unitario: Number(i.precio_unitario),
            subtotal: Number(i.cantidad) * Number(i.precio_unitario),
          }))
        )
        if (itemsErr) throw itemsErr
      }
      setModal(false)
      cargar()
    } catch (e) {
      setErrorGuardar(e.message || 'Error al guardar la orden')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarOrden() {
    if (!pendingDelete) return
    setEliminando(true)
    const { error } = await supabase.rpc('eliminar_orden_compra', { p_orden_id: pendingDelete.id })
    setEliminando(false)
    setPendingDelete(null)
    if (!error) setOrdenes(prev => prev.filter(o => o.id !== pendingDelete.id))
  }

  return (
    <>
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Órdenes de Compra</h1>
        <button onClick={abrirModal} className="btn-primary">
          <Plus className="w-4 h-4" /> Nueva Orden
        </button>
      </div>

      {loading ? <SkeletonTabla filas={5} cols={6} /> : (
        <div className="tabla-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Fecha', 'Proveedor', 'Sucursal', 'Total', 'Estado', 'Notas', 'Acción'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ordenes.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">Sin órdenes de compra</td></tr>
                ) : ordenes.map(o => (
                  <tr key={o.id} className="tabla-fila">
                    <td className="px-4 py-3 text-slate-600">{o.fecha}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{o.proveedores?.nombre || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{o.sucursales?.nombre || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-money">{clp(o.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${ESTADO_BADGE[o.estado]}`}>
                        {o.estado.charAt(0).toUpperCase() + o.estado.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{o.notas || '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setPendingDelete(o)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar orden"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>

      {/* Modal nueva orden */}
      {modal && (
        <div className="modal-backdrop">
          <div className="modal-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Nueva Orden de Compra</h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-base">Proveedor</label>
                  <select value={form.proveedor_id} onChange={e => setForm(f => ({ ...f, proveedor_id: e.target.value }))} className="input-base">
                    <option value="">Seleccionar...</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-base">Sucursal destino</label>
                  <select value={form.sucursal_id} onChange={e => setForm(f => ({ ...f, sucursal_id: e.target.value }))} className="input-base">
                    <option value="">Sin sucursal</option>
                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-base">Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} className="input-base" />
                </div>
                <div>
                  <label className="label-base">Notas</label>
                  <input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} className="input-base" placeholder="Opcional" />
                </div>
              </div>

              {/* Items */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-700">Productos</h4>
                  <button onClick={() => setItems(p => [...p, itemVacio()])}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
                    <Plus className="w-3 h-3" /> Agregar
                  </button>
                </div>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 items-end">
                      <div>
                        <label className="label-base">Producto</label>
                        <select name="producto_id" value={item.producto_id} onChange={e => handleItem(i, e)} className="input-base">
                          <option value="">Seleccionar...</option>
                          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label-base">Cantidad</label>
                        <input name="cantidad" value={item.cantidad} onChange={e => handleItem(i, e)} type="number" min={1} className="input-base" />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="label-base">Precio Unit.</label>
                          <input name="precio_unitario" value={item.precio_unitario} onChange={e => handleItem(i, e)} type="number" className="input-base" placeholder="" />
                        </div>
                        {items.length > 1 && (
                          <button onClick={() => setItems(p => p.filter((_, idx) => idx !== i))}
                            className="self-end pb-2.5 text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-right mt-3 font-bold text-slate-900 text-money">
                  Total: {clp(total)}
                </div>
              </div>
            </div>

            {errorGuardar && (
              <div className="mx-5 mb-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
                {errorGuardar}
              </div>
            )}
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={guardar} disabled={guardando || !form.proveedor_id} className="btn-primary flex-1 justify-center">
                {guardando ? 'Guardando...' : 'Guardar Orden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación eliminar OC */}
      {pendingDelete && (
        <div className="modal-backdrop">
          <div className="modal-panel w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Eliminar orden de compra</h3>
                  <p className="text-sm text-slate-500">Esta acción es irreversible</p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5 text-sm text-red-700 space-y-1">
                <p className="font-semibold">Se eliminará permanentemente:</p>
                <ul className="list-disc list-inside space-y-0.5 text-red-600">
                  <li>La orden de compra y sus productos</li>
                  {pendingDelete.estado === 'recibida' && (
                    <li className="font-semibold">⚠ El stock recibido será descontado del inventario</li>
                  )}
                </ul>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPendingDelete(null)} className="btn-secondary flex-1 justify-center">
                  Cancelar
                </button>
                <button onClick={eliminarOrden} disabled={eliminando}
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
