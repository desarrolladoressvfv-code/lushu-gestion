import { useEffect, useState } from 'react'
import { supabase, CLIENTE_ID, clp } from '../lib/supabase'
import { generarCotizacionPDF } from '../lib/generarPDF'
import { useEmpresa } from '../context/EmpresaContext'
import { hoyCL } from '../lib/fecha'
import { Download, AlertTriangle, PackageX, RotateCcw } from 'lucide-react'

export default function Cotizacion() {
  const { nombreEmpresa, logoUrl } = useEmpresa()
  const [productos, setProductos] = useState([])
  const [sucursales, setSucursales] = useState([])
  const [generando, setGenerando] = useState(false)
  const [stockInfo, setStockInfo] = useState(null)
  const [stockSucursales, setStockSucursales] = useState([])

  const FORM_INICIAL = {
    fecha: hoyCL(),
    nombre_cliente: '',
    telefono: '',
    nombre_servicio: '',
    sucursal_id: '',
    producto_id: '',
    color: '',
    lugar_retiro: '',
    lugar_servicio: '',
    cementerio: '',
    valor_adicional: 0,
    descuento: 0,
    comentarios: '',
  }

  const [form, setForm] = useState({
    fecha: hoyCL(),
    nombre_cliente: '',
    telefono: '',
    nombre_servicio: '',
    sucursal_id: '',
    producto_id: '',
    color: '',
    lugar_retiro: '',
    lugar_servicio: '',
    cementerio: '',
    valor_adicional: 0,
    descuento: 0,
    comentarios: '',
  })

  useEffect(() => {
    Promise.all([
      supabase.from('productos').select('id,nombre,precio').eq('cliente_id', CLIENTE_ID).eq('activo', true).order('numero'),
      supabase.from('sucursales').select('id,nombre').eq('cliente_id', CLIENTE_ID).eq('activo', true).order('nombre'),
    ]).then(([{ data: p }, { data: s }]) => {
      setProductos(p || [])
      setSucursales(s || [])
    })
  }, [])

  const prod = productos.find(p => p.id === form.producto_id)
  const sucursal = sucursales.find(s => s.id === form.sucursal_id)
  const valor_servicio = prod?.precio || 0
  const total = valor_servicio + Number(form.valor_adicional)
  const venta_neta = total - Number(form.descuento)
  const iva = Math.round(venta_neta * 0.19)
  const venta_total = Math.round(venta_neta * 1.19)
  const porc = total > 0 ? ((Number(form.descuento) / total) * 100).toFixed(1) : '0.0'

  /* ── Verificar stock al cambiar producto o sucursal ── */
  useEffect(() => {
    async function verificarStock() {
      if (!form.producto_id) { setStockInfo(null); setStockSucursales([]); return }

      // Stock de todas las sucursales
      const { data: todos } = await supabase.from('inventario')
        .select('stock_actual, stock_minimo, sucursal_id, sucursales(nombre)')
        .eq('cliente_id', CLIENTE_ID).eq('producto_id', form.producto_id)
      setStockSucursales(todos || [])

      // Stock de la sucursal seleccionada
      const query = supabase.from('inventario')
        .select('stock_actual, stock_minimo')
        .eq('cliente_id', CLIENTE_ID).eq('producto_id', form.producto_id)
      if (form.sucursal_id) query.eq('sucursal_id', form.sucursal_id)
      const { data } = await query.maybeSingle()
      setStockInfo(data ?? { stock_actual: 0, stock_minimo: 0 })
    }
    verificarStock()
  }, [form.producto_id, form.sucursal_id])

  function handle(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })) }

  const sinStock   = stockInfo !== null && stockInfo.stock_actual === 0
  const stockBajo  = stockInfo !== null && stockInfo.stock_actual > 0
                     && stockInfo.stock_actual <= (stockInfo.stock_minimo ?? 0)

  function limpiarFormulario() {
    setForm({ ...FORM_INICIAL, fecha: hoyCL() })
    setStockInfo(null)
    setStockSucursales([])
  }

  async function descargarPDF() {
    setGenerando(true)
    try {
      // M4: obtener número correlativo desde Supabase
      let numeroCotizacion = null
      const { data: numData } = await supabase.rpc('get_next_cotizacion', { p_cliente_id: CLIENTE_ID })
      if (numData) numeroCotizacion = numData

      await generarCotizacionPDF({
        numeroCotizacion,
        fecha: form.fecha,
        nombreCliente: form.nombre_cliente,
        telefono: form.telefono,
        nombreServicio: form.nombre_servicio,
        sucursalNombre: sucursal?.nombre || '',
        tipoUrna: prod?.nombre || '',
        color: form.color,
        lugarRetiro: form.lugar_retiro,
        lugarServicio: form.lugar_servicio,
        cementerio: form.cementerio,
        valorServicio: valor_servicio,
        valorAdicional: Number(form.valor_adicional),
        total,
        descuento: Number(form.descuento),
        porcDescuento: porc,
        ventaNeta: venta_neta,
        iva,
        ventaTotal: venta_total,
        comentarios: form.comentarios,
        empresaNombre: nombreEmpresa,
        logoUrl,
      })
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-5 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Cotización</h1>
      </div>

      {/* Datos del cliente */}
      <div className="form-section">
        <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Datos del Cliente</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-base">Fecha</label>
            <input name="fecha" value={form.fecha} onChange={handle} type="date" className="input-base" />
          </div>
          <div>
            <label className="label-base">Sucursal</label>
            <select name="sucursal_id" value={form.sucursal_id} onChange={handle} className="input-base">
              <option value="">Sin sucursal</option>
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label-base">Nombre Cliente</label>
            <input name="nombre_cliente" value={form.nombre_cliente} onChange={handle} className="input-base" placeholder="Nombre completo" />
          </div>
          <div>
            <label className="label-base">Teléfono</label>
            <input name="telefono" value={form.telefono} onChange={handle}
              className="input-base" placeholder="+56 9 XXXX XXXX"
              maxLength={15} inputMode="tel" />
          </div>
          <div className="col-span-1 sm:col-span-2">
            <label className="label-base">Nombre del Servicio</label>
            <input name="nombre_servicio" value={form.nombre_servicio} onChange={handle} className="input-base" placeholder="Ej: Servicio completo con traslado" />
          </div>
        </div>
      </div>

      {/* Detalle del servicio */}
      <div className="form-section">
        <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Detalle del Servicio</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-base">Tipo de Urna</label>
            <select name="producto_id" value={form.producto_id} onChange={handle} className="input-base">
              <option value="">Seleccionar...</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label-base">Color</label>
            <input name="color" value={form.color} onChange={handle} className="input-base" placeholder="Color de la urna" />
          </div>
          <div>
            <label className="label-base">Lugar de Retiro</label>
            <input name="lugar_retiro" value={form.lugar_retiro} onChange={handle} className="input-base" />
          </div>
          <div>
            <label className="label-base">Lugar de Servicio</label>
            <input name="lugar_servicio" value={form.lugar_servicio} onChange={handle} className="input-base" />
          </div>
          <div className="col-span-1 sm:col-span-2">
            <label className="label-base">Cementerio</label>
            <input name="cementerio" value={form.cementerio} onChange={handle} className="input-base" />
          </div>
        </div>
      </div>

      {/* Banner de stock */}
      {form.producto_id && stockInfo !== null && (
        <div className={`rounded-xl p-4 border ${sinStock ? 'bg-red-50 border-red-200' : stockBajo ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className="flex items-start gap-3">
            {sinStock ? <PackageX className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" /> : <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${stockBajo ? 'text-amber-500' : 'text-emerald-500'}`} />}
            <div className="flex-1">
              <p className={`font-semibold text-sm ${sinStock ? 'text-red-800' : stockBajo ? 'text-amber-800' : 'text-emerald-800'}`}>
                {sinStock ? 'Sin stock disponible' : stockBajo ? `Stock bajo — quedan ${stockInfo.stock_actual} unidade${stockInfo.stock_actual !== 1 ? 's' : ''}` : `Stock OK — ${stockInfo.stock_actual} unidades`}
              </p>
              {sinStock && <p className="text-red-600 text-xs mt-0.5">La cotización puede generarse como referencia, pero no podrá convertirse en servicio hasta reponer inventario.</p>}
              {stockBajo && <p className="text-amber-600 text-xs mt-0.5">El stock está igual o por debajo del mínimo configurado ({stockInfo.stock_minimo}).</p>}
              {/* Detalle por sucursal: solo cuando no hay sucursal seleccionada */}
              {!form.sucursal_id && stockSucursales.length > 1 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {stockSucursales.map(s => (
                    <span key={s.sucursal_id}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.stock_actual <= 0 ? 'bg-red-100 text-red-700'
                        : s.stock_actual <= s.stock_minimo ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                      }`}>
                      {s.sucursales?.nombre || 'Sin sucursal'}: {s.stock_actual}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Valores */}
      <div className="form-section">
        <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Valores</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="label-base">Valor Servicio</label>
            <input readOnly value={clp(valor_servicio)} className="input-base bg-slate-50 font-semibold" />
          </div>
          <div>
            <label className="label-base">Valor Adicional</label>
            <input name="valor_adicional" value={form.valor_adicional} onChange={handle} type="number" className="input-base" placeholder="0" />
          </div>
          <div>
            <label className="label-base">Total</label>
            <input readOnly value={clp(total)} className="input-base bg-slate-50 font-semibold" />
          </div>
          <div>
            <label className="label-base">Descuento ($)</label>
            <input name="descuento" value={form.descuento} onChange={handle} type="number" className="input-base" placeholder="0" />
          </div>
          <div>
            <label className="label-base">Descuento (%)</label>
            <input readOnly value={`${porc}%`} className="input-base bg-slate-50" />
          </div>
          <div>
            <label className="label-base">Venta Neta</label>
            <input readOnly value={clp(venta_neta)} className="input-base bg-slate-50" />
          </div>
          <div>
            <label className="label-base">IVA (19%)</label>
            <input readOnly value={clp(iva)} className="input-base bg-slate-50" />
          </div>
          <div className="col-span-2">
            <label className="label-base">Total a Pagar</label>
            <input readOnly value={clp(venta_total)} className="input-base bg-blue-50 text-blue-700 font-bold text-base" />
          </div>
        </div>

        <div className="border-t border-slate-100 mt-4 pt-4">
          <label className="label-base">Comentarios (opcional)</label>
          <textarea name="comentarios" value={form.comentarios} onChange={handle} rows={3}
            className="input-base" placeholder="Notas adicionales, condiciones especiales, observaciones..." />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-6">
        <button onClick={limpiarFormulario} type="button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-medium transition-colors">
          <RotateCcw className="w-4 h-4" />
          Limpiar campos
        </button>
        <div className="flex items-center gap-3">
          {sinStock && (
            <p className="text-xs text-red-500 font-medium">
              ⚠ Sin stock — la cotización se genera como referencia
            </p>
          )}
          <button onClick={descargarPDF} disabled={generando}
            className={`btn-primary px-7 py-3 ${sinStock ? 'opacity-80' : ''}`}>
            <Download className="w-4 h-4" />
            {generando ? 'Generando PDF...' : 'Descargar PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
