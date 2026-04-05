import { useEffect, useState } from 'react'
import { supabase, CLIENTE_ID, clp } from '../lib/supabase'
import { CheckCircle, Package } from 'lucide-react'
import { hoyCL } from '../lib/fecha'

export default function RecepcionMercaderia() {
  const [ordenes, setOrdenes] = useState([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(null)
  const [detalleOC, setDetalleOC] = useState({})
  const [errorMsg, setErrorMsg] = useState('')

  async function cargar() {
    const { data } = await supabase.from('ordenes_compra')
      .select('*, proveedores(nombre), sucursales(nombre)')
      .eq('cliente_id', CLIENTE_ID)
      .eq('estado', 'pendiente')
      .order('fecha', { ascending: false })
    setOrdenes(data || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  async function verDetalle(oc_id) {
    if (detalleOC[oc_id]) {
      setDetalleOC(prev => { const n = { ...prev }; delete n[oc_id]; return n })
      return
    }
    const { data } = await supabase.from('items_orden_compra')
      .select('*, productos(nombre)').eq('orden_compra_id', oc_id)
    setDetalleOC(prev => ({ ...prev, [oc_id]: data || [] }))
  }

  async function recibirOrden(oc) {
    setProcesando(oc.id)
    setErrorMsg('')
    try {
      const items = detalleOC[oc.id]
      let itemsData = items
      if (!itemsData) {
        const { data } = await supabase.from('items_orden_compra')
          .select('*, productos(nombre)').eq('orden_compra_id', oc.id)
        itemsData = data || []
      }
      await procesarRecepcion(oc, itemsData)
      cargar()
    } catch (e) {
      setErrorMsg(`Error al procesar recepción: ${e.message}`)
    } finally {
      setProcesando(null)
    }
  }

  async function procesarRecepcion(oc, items) {
    const { error: ocErr } = await supabase.from('ordenes_compra').update({ estado: 'recibida' }).eq('id', oc.id)
    if (ocErr) throw ocErr

    for (const item of items) {
      if (!item.producto_id || item.cantidad <= 0) continue

      // Buscar registro de inventario para este producto+sucursal
      let q = supabase.from('inventario')
        .select('id, stock_actual')
        .eq('cliente_id', CLIENTE_ID)
        .eq('producto_id', item.producto_id)
      if (oc.sucursal_id) q = q.eq('sucursal_id', oc.sucursal_id)
      else q = q.is('sucursal_id', null)
      const { data: inv, error: invErr } = await q.maybeSingle()
      if (invErr) throw invErr

      if (inv) {
        const { error: updErr } = await supabase.from('inventario')
          .update({ stock_actual: inv.stock_actual + item.cantidad })
          .eq('id', inv.id)
        if (updErr) throw updErr
      } else {
        const { error: insErr } = await supabase.from('inventario').insert({
          cliente_id: CLIENTE_ID,
          producto_id: item.producto_id,
          sucursal_id: oc.sucursal_id || null,
          stock_actual: item.cantidad,
          stock_minimo: 3,
        })
        if (insErr) throw insErr
      }

      await supabase.from('movimientos_inventario').insert({
        cliente_id: CLIENTE_ID,
        producto_id: item.producto_id,
        sucursal_id: oc.sucursal_id || null,
        tipo: 'entrada',
        cantidad: item.cantidad,
        motivo: `Recepción OC - ${oc.proveedores?.nombre || 'Proveedor'}`,
        referencia_id: oc.id,
        fecha: hoyCL(),
      })
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Recepción de Mercadería</h1>
        <p className="text-sm text-slate-500 mt-1">
          Órdenes pendientes de recepción. Al confirmar, el stock se actualiza en la sucursal correspondiente.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {errorMsg}
        </div>
      )}

      {ordenes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="text-slate-700 font-semibold text-base">Todo al día</p>
          <p className="text-slate-400 text-sm mt-1">No hay órdenes pendientes de recepción.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ordenes.map(oc => (
            <div key={oc.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Cabecera de la orden */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Package className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{oc.proveedores?.nombre || 'Sin proveedor'}</p>
                    <p className="text-sm text-slate-500">
                      {oc.fecha} · <span className="font-medium text-slate-700">{clp(oc.total)}</span>
                      {oc.sucursales?.nombre && (
                        <span className="ml-2 text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full">
                          {oc.sucursales.nombre}
                        </span>
                      )}
                    </p>
                    {oc.notas && <p className="text-xs text-slate-400 mt-0.5">{oc.notas}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => verDetalle(oc.id)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50">
                    {detalleOC[oc.id] ? 'Ocultar' : 'Ver detalle'}
                  </button>
                  <button onClick={() => recibirOrden(oc)} disabled={procesando === oc.id}
                    className="btn-primary disabled:opacity-50">
                    <CheckCircle className="w-4 h-4" />
                    {procesando === oc.id ? 'Procesando...' : 'Confirmar Recepción'}
                  </button>
                </div>
              </div>

              {/* Detalle items */}
              {detalleOC[oc.id] && (
                <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/60">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 text-xs uppercase tracking-wide">
                        <th className="text-left py-1 font-semibold">Producto</th>
                        <th className="text-center py-1 font-semibold">Cantidad</th>
                        <th className="text-right py-1 font-semibold">Precio Unit.</th>
                        <th className="text-right py-1 font-semibold">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detalleOC[oc.id].map(item => (
                        <tr key={item.id}>
                          <td className="py-2 font-medium text-slate-700">{item.productos?.nombre || '-'}</td>
                          <td className="py-2 text-center font-bold text-slate-900">{item.cantidad}</td>
                          <td className="py-2 text-right text-slate-500 text-money">{clp(item.precio_unitario)}</td>
                          <td className="py-2 text-right font-semibold text-money">{clp(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
