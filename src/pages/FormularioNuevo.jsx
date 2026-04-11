import { useEffect, useState } from 'react'
import { supabase, CLIENTE_ID, clp } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Save, Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react'
import { hoyCL } from '../lib/fecha'

const chequeVacio = () => ({ monto: '', numero_documento: '', vencimiento: '' })

function formatRut(value) {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase()
  if (!clean) return ''
  const dv = clean.slice(-1)
  const body = clean.slice(0, -1)
  if (!body) return dv
  let formatted = ''
  let count = 0
  for (let i = body.length - 1; i >= 0; i--) {
    formatted = body[i] + formatted
    count++
    if (count % 3 === 0 && i !== 0) formatted = '.' + formatted
  }
  return formatted + '-' + dv
}

export default function FormularioNuevo() {
  const navigate = useNavigate()
  const [productos, setProductos] = useState([])
  const [convenios, setConvenios] = useState([])
  const [trabajadores, setTrabajadores] = useState([])
  const [sucursales, setSucursales] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [numeroFormulario, setNumeroFormulario] = useState(null)
  const [stockInfo, setStockInfo] = useState(null)     // stock de la sucursal seleccionada
  const [stockSucursales, setStockSucursales] = useState([]) // stock de todas las sucursales

  const [servicio, setServicio] = useState({
    fecha_servicio: hoyCL(),
    nombre_cliente: '',
    telefono: '',
    producto_id: '',
    sucursal_id: '',
    color: '',
    lugar_retiro: '',
    lugar_servicio: '',
    cementerio: '',
    trabajador_id: '',
  })

  const [ivaHabilitado, setIvaHabilitado] = useState(true)
  const [conIva, setConIva] = useState(true)
  const [venta, setVenta] = useState({ valor_servicio: 0, valor_adicional: '', descuento: '' })
  const [pago, setPago] = useState({ convenio_id: '', valor_convenio: 0, efectivo: '', tarjeta: '', monto_cuotas: '', cuotas: '', info_adicional: '' })
  const [cheques, setCheques] = useState([chequeVacio()])
  const [fallecido, setFallecido] = useState({ nombre: '', sexo: '', edad: '', rut: '', fecha_defuncion: '', causa_muerte: '', comuna: '' })

  useEffect(() => {
    async function cargar() {
      const [{ data: p }, { data: c }, { data: t }, { data: s }, { data: num }, { data: cli }] = await Promise.all([
        supabase.from('productos').select('id,nombre,precio').eq('cliente_id', CLIENTE_ID).eq('activo', true).order('numero'),
        supabase.from('convenios').select('id,nombre,valor').eq('cliente_id', CLIENTE_ID).eq('activo', true).order('numero'),
        supabase.from('trabajadores').select('id,nombre').eq('cliente_id', CLIENTE_ID).eq('activo', true).order('numero'),
        supabase.from('sucursales').select('id,nombre').eq('cliente_id', CLIENTE_ID).eq('activo', true).order('nombre'),
        supabase.rpc('get_next_formulario', { p_cliente_id: CLIENTE_ID }),
        supabase.from('clientes').select('iva_habilitado').eq('id', CLIENTE_ID).single(),
      ])
      setProductos(p || [])
      setConvenios(c || [])
      setTrabajadores(t || [])
      setSucursales(s || [])
      setNumeroFormulario(num)
      const habilitado = cli?.iva_habilitado ?? true
      setIvaHabilitado(habilitado)
      if (!habilitado) setConIva(false)
    }
    cargar()
  }, [])

  useEffect(() => {
    const prod = productos.find(p => p.id === servicio.producto_id)
    setVenta(v => ({ ...v, valor_servicio: prod?.precio || 0 }))
    if (servicio.producto_id) verificarStock(servicio.producto_id, servicio.sucursal_id)
    else setStockInfo(null)
  }, [servicio.producto_id, servicio.sucursal_id, productos])

  async function verificarStock(producto_id, sucursal_id) {
    // Stock de todas las sucursales para el producto
    const { data: todos } = await supabase.from('inventario')
      .select('stock_actual, stock_minimo, sucursal_id, sucursales(nombre)')
      .eq('cliente_id', CLIENTE_ID).eq('producto_id', producto_id)
    setStockSucursales(todos || [])

    // Stock de la sucursal seleccionada (o sin sucursal)
    let q = supabase.from('inventario').select('stock_actual, stock_minimo')
      .eq('cliente_id', CLIENTE_ID).eq('producto_id', producto_id)
    if (sucursal_id) q = q.eq('sucursal_id', sucursal_id)
    else q = q.is('sucursal_id', null)
    const { data } = await q.maybeSingle()
    setStockInfo(data || null)
  }

  useEffect(() => {
    const conv = convenios.find(c => c.id === pago.convenio_id)
    setPago(p => ({ ...p, valor_convenio: conv?.valor || 0 }))
  }, [pago.convenio_id, convenios])

  const total = venta.valor_servicio + Number(venta.valor_adicional)
  const venta_neta = total - Number(venta.descuento)
  const iva = conIva ? Math.round(venta_neta * 0.19) : 0
  const venta_total = conIva ? Math.round(venta_neta * 1.19) : Math.round(venta_neta)
  const total_cheques = cheques.reduce((s, c) => s + (Number(c.monto) || 0), 0)
  const saldo_pendiente = venta_total - Number(pago.valor_convenio) - Number(pago.efectivo) - Number(pago.tarjeta) - Number(pago.monto_cuotas) - total_cheques
  const estado_pago = saldo_pendiente <= 0 ? 'pagado' : 'pendiente'
  const porcDescuento = total > 0 ? ((Number(venta.descuento) / total) * 100).toFixed(1) : '0.0'
  const sinStock = stockInfo !== null && stockInfo.stock_actual <= 0

  function handleServ(e) { setServicio(s => ({ ...s, [e.target.name]: e.target.value })) }
  function handleVenta(e) { setVenta(v => ({ ...v, [e.target.name]: e.target.value })) }
  function handlePago(e) { setPago(p => ({ ...p, [e.target.name]: e.target.value })) }
  function handleFall(e) { setFallecido(f => ({ ...f, [e.target.name]: e.target.value })) }
  function handleCheque(i, e) { setCheques(prev => prev.map((c, idx) => idx === i ? { ...c, [e.target.name]: e.target.value } : c)) }

  async function guardar() {
    if (!numeroFormulario) { setError('El N° de formulario aún no se generó. Recarga la página e intenta de nuevo.'); return }
    if (!servicio.nombre_cliente.trim()) { setError('El nombre del cliente es obligatorio.'); return }
    if (sinStock) { setError('No hay stock disponible para la urna seleccionada.'); return }
    setError('')
    setGuardando(true)
    try {
      // ── Transacción atómica en el servidor ───────────────────
      // Todo ocurre dentro de una función PostgreSQL: si algo falla,
      // PostgreSQL hace rollback automático y ningún dato queda a medias.
      const { error } = await supabase.rpc('registrar_servicio_completo', {
        // Servicio
        p_cliente_id:          CLIENTE_ID,
        p_numero_formulario:   numeroFormulario,
        p_fecha_servicio:      servicio.fecha_servicio,
        p_nombre_cliente:      servicio.nombre_cliente.trim(),
        p_telefono:            servicio.telefono || null,
        p_producto_id:         servicio.producto_id || null,
        p_sucursal_id:         servicio.sucursal_id || null,
        p_color:               servicio.color || null,
        p_lugar_retiro:        servicio.lugar_retiro || null,
        p_lugar_servicio:      servicio.lugar_servicio || null,
        p_cementerio:          servicio.cementerio || null,
        p_trabajador_id:       servicio.trabajador_id || null,
        // Venta
        p_valor_servicio:      venta.valor_servicio,
        p_valor_adicional:     Number(venta.valor_adicional) || 0,
        p_total:               total,
        p_descuento:           Number(venta.descuento) || 0,
        p_venta_neta:          venta_neta,
        p_iva:                 iva,
        p_venta_total:         venta_total,
        // Formas de pago
        p_convenio_id:         pago.convenio_id || null,
        p_valor_convenio:      Number(pago.valor_convenio) || 0,
        p_efectivo:            Number(pago.efectivo) || 0,
        p_tarjeta:             Number(pago.tarjeta) || 0,
        p_monto_cuotas:        Number(pago.monto_cuotas) || 0,
        p_cuotas:              Number(pago.cuotas) || 0,
        p_valor_cheques:       total_cheques,
        p_saldo_pendiente:     saldo_pendiente,
        p_estado_pago:         estado_pago,
        p_info_adicional:      pago.info_adicional || null,
        // Cheques (solo los que tienen monto)
        p_cheques:             cheques.filter(c => Number(c.monto) > 0),
        // Fallecido
        p_fallecido_nombre:    fallecido.nombre || null,
        p_fallecido_sexo:      fallecido.sexo || null,
        p_fallecido_edad:      fallecido.edad ? Number(fallecido.edad) : null,
        p_fallecido_rut:       fallecido.rut || null,
        p_fallecido_fecha_def: fallecido.fecha_defuncion || null,
        p_fallecido_causa:     fallecido.causa_muerte || null,
        p_fallecido_comuna:    fallecido.comuna || null,
      })

      if (error) throw error
      // S2: log de auditoría
      supabase.rpc('registrar_auditoria', {
        p_accion: 'crear',
        p_modulo: 'servicios',
        p_descripcion: `Nuevo servicio creado para "${servicio.nombre_cliente}"`,
        p_referencia_id: numeroFormulario,
      })
      navigate('/servicios')
    } catch (e) {
      setError(e.message || 'Error al guardar. Revisa los datos e intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-5 max-w-4xl page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nuevo Servicio</h1>
          {numeroFormulario && (
            <p className="text-sm text-slate-500 mt-0.5">
              Formulario asignado: <span className="font-bold text-blue-600">#{numeroFormulario}</span>
            </p>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Alerta stock */}
      {servicio.producto_id && (stockInfo !== null || stockSucursales.length > 0) && (
        <div className={`rounded-xl px-4 py-3 text-sm border ${
          sinStock ? 'bg-red-50 border-red-200 text-red-700'
          : stockInfo && stockInfo.stock_actual <= stockInfo.stock_minimo ? 'bg-amber-50 border-amber-200 text-amber-700'
          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {sinStock ? <AlertTriangle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
            <span className="font-medium">
              {sinStock
                ? 'Sin stock en la sucursal seleccionada'
                : stockInfo
                  ? `Stock en sucursal: ${stockInfo.stock_actual} unidad${stockInfo.stock_actual !== 1 ? 'es' : ''}`
                  : 'Stock no configurado para esta sucursal'}
            </span>
          </div>
          {/* Detalle por sucursal si hay más de una */}
          {stockSucursales.length > 1 && (
            <div className="flex flex-wrap gap-2 mt-1.5 ml-6">
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
      )}

      {/* Datos del Servicio */}
      <div className="form-section">
        <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Datos del Servicio</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label-base">N° Formulario</label>
            <input readOnly value={numeroFormulario ? `#${numeroFormulario}` : 'Generando...'}
              className="input-base bg-slate-50 font-bold text-blue-600" />
          </div>
          <div>
            <label className="label-base">Fecha de Servicio</label>
            <input name="fecha_servicio" value={servicio.fecha_servicio} onChange={handleServ} type="date" className="input-base" />
          </div>
          <div className="col-span-2">
            <label className="label-base">Nombre Cliente</label>
            <input name="nombre_cliente" value={servicio.nombre_cliente} onChange={handleServ} className="input-base" placeholder="Nombre completo" />
          </div>
          <div>
            <label className="label-base">Teléfono</label>
            <input name="telefono" value={servicio.telefono} onChange={handleServ}
              className="input-base" placeholder="+56 9 XXXX XXXX"
              maxLength={15} inputMode="tel" />
          </div>
          <div>
            <label className="label-base">Sucursal</label>
            <select name="sucursal_id" value={servicio.sucursal_id} onChange={handleServ} className="input-base">
              <option value="">Sin sucursal</option>
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label-base">Tipo de Urna</label>
            <select name="producto_id" value={servicio.producto_id} onChange={handleServ} className="input-base">
              <option value="">Seleccionar...</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label-base">Color</label>
            <input name="color" value={servicio.color} onChange={handleServ} className="input-base" placeholder="Color de la urna" />
          </div>
          <div>
            <label className="label-base">Instalador</label>
            <select name="trabajador_id" value={servicio.trabajador_id} onChange={handleServ} className="input-base">
              <option value="">Seleccionar...</option>
              {trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label-base">Lugar de Retiro</label>
            <input name="lugar_retiro" value={servicio.lugar_retiro} onChange={handleServ} className="input-base" />
          </div>
          <div className="col-span-2">
            <label className="label-base">Lugar de Servicio</label>
            <input name="lugar_servicio" value={servicio.lugar_servicio} onChange={handleServ} className="input-base" />
          </div>
          <div className="col-span-2">
            <label className="label-base">Cementerio</label>
            <input name="cementerio" value={servicio.cementerio} onChange={handleServ} className="input-base" />
          </div>
        </div>
      </div>

      {/* Venta */}
      <div className="form-section">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Venta</h2>
          {ivaHabilitado && (
            <button
              type="button"
              onClick={() => setConIva(v => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                conIva
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${conIva ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-400'}`} />
              {conIva ? 'Con IVA (19%)' : 'Sin IVA'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="label-base">Valor Servicio</label>
            <input readOnly value={clp(venta.valor_servicio)} className="input-base bg-slate-50 font-semibold" />
          </div>
          <div>
            <label className="label-base">Valor Adicional</label>
            <input name="valor_adicional" value={venta.valor_adicional} onChange={handleVenta} type="number" className="input-base" />
          </div>
          <div>
            <label className="label-base">Total</label>
            <input readOnly value={clp(total)} className="input-base bg-slate-50 font-semibold" />
          </div>
          <div>
            <label className="label-base">Descuento ($)</label>
            <input name="descuento" value={venta.descuento} onChange={handleVenta} type="number" className="input-base" />
          </div>
          <div>
            <label className="label-base">Descuento (%)</label>
            <input readOnly value={`${porcDescuento}%`} className="input-base bg-slate-50" />
          </div>
          <div>
            <label className="label-base">Venta Neta</label>
            <input readOnly value={clp(venta_neta)} className="input-base bg-slate-50 font-semibold" />
          </div>
          {ivaHabilitado && (
            <div>
              <label className="label-base">IVA {conIva ? '(19%)' : '(no aplica)'}</label>
              <input readOnly value={conIva ? clp(iva) : '—'} className="input-base bg-slate-50 text-slate-400" />
            </div>
          )}
          <div className="col-span-2">
            <label className="label-base">Venta Total</label>
            <input readOnly value={clp(venta_total)} className="input-base bg-blue-50 text-blue-700 font-bold text-base" />
          </div>
        </div>
      </div>

      {/* Formas de Pago */}
      <div className="form-section">
        <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Formas de Pago</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="label-base">Convenio</label>
            <select name="convenio_id" value={pago.convenio_id} onChange={handlePago} className="input-base">
              <option value="">Sin convenio</option>
              {convenios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label-base">Valor Convenio</label>
            <input readOnly value={clp(pago.valor_convenio)} className="input-base bg-slate-50" />
          </div>
          <div>
            <label className="label-base">Efectivo</label>
            <input name="efectivo" value={pago.efectivo} onChange={handlePago} type="number" className="input-base" />
          </div>
          <div>
            <label className="label-base">Tarjeta</label>
            <input name="tarjeta" value={pago.tarjeta} onChange={handlePago} type="number" className="input-base" />
          </div>
          <div>
            <label className="label-base">Monto en Cuotas</label>
            <input name="monto_cuotas" value={pago.monto_cuotas} onChange={handlePago} type="number" className="input-base" />
          </div>
          <div>
            <label className="label-base">N° Cuotas</label>
            <input name="cuotas" value={pago.cuotas} onChange={handlePago} type="number" className="input-base" />
          </div>
          {Number(pago.monto_cuotas) > 0 && Number(pago.cuotas) > 0 && (
            <div>
              <label className="label-base">Valor por Cuota</label>
              <input readOnly value={clp(Math.round(Number(pago.monto_cuotas) / Number(pago.cuotas)))}
                className="input-base bg-blue-50 text-blue-700 font-semibold" />
            </div>
          )}
        </div>

        {/* Cheques */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Cheques (máx. 5)</h3>
            {cheques.length < 5 && (
              <button onClick={() => setCheques(p => [...p, chequeVacio()])}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
                <Plus className="w-3 h-3" /> Agregar cheque
              </button>
            )}
          </div>
          <div className="space-y-2">
            {cheques.map((c, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <label className="label-base">Cheque {i + 1} - Monto</label>
                  <input name="monto" value={c.monto} onChange={e => handleCheque(i, e)} type="number" className="input-base" />
                </div>
                <div>
                  <label className="label-base">N° Documento</label>
                  <input name="numero_documento" value={c.numero_documento} onChange={e => handleCheque(i, e)} className="input-base" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="label-base">Vencimiento</label>
                    <input name="vencimiento" value={c.vencimiento} onChange={e => handleCheque(i, e)} type="date" className="input-base" />
                  </div>
                  {cheques.length > 1 && (
                    <button onClick={() => setCheques(p => p.filter((_, idx) => idx !== i))}
                      className="self-end pb-2.5 text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen pago */}
        <div className="border-t border-slate-100 mt-4 pt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="label-base">Saldo Pendiente</label>
            <input readOnly value={clp(saldo_pendiente)}
              className={`input-base font-bold ${saldo_pendiente > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`} />
          </div>
          <div>
            <label className="label-base">Estado</label>
            <input readOnly value={estado_pago === 'pagado' ? 'PAGADO' : 'PENDIENTE'}
              className={`input-base font-bold ${estado_pago === 'pagado' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`} />
          </div>
          <div className="col-span-2">
            <label className="label-base">Información Adicional</label>
            <textarea name="info_adicional" value={pago.info_adicional} onChange={handlePago} rows={2} className="input-base" />
          </div>
        </div>
      </div>

      {/* Datos del Fallecido */}
      <div className="form-section">
        <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Datos del Fallecido</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="label-base">Nombre</label>
            <input name="nombre" value={fallecido.nombre} onChange={handleFall} className="input-base" />
          </div>
          <div>
            <label className="label-base">Sexo</label>
            <select name="sexo" value={fallecido.sexo} onChange={handleFall} className="input-base">
              <option value="">Seleccionar</option>
              <option>Masculino</option>
              <option>Femenino</option>
            </select>
          </div>
          <div>
            <label className="label-base">Edad</label>
            <input name="edad" value={fallecido.edad} onChange={handleFall} type="number" className="input-base" />
          </div>
          <div>
            <label className="label-base">RUT</label>
            <input
              name="rut"
              value={fallecido.rut}
              onChange={e => setFallecido(f => ({ ...f, rut: formatRut(e.target.value) }))}
              className="input-base"
              placeholder="12.345.678-9"
              maxLength={12}
            />
          </div>
          <div>
            <label className="label-base">Fecha Defunción</label>
            <input name="fecha_defuncion" value={fallecido.fecha_defuncion} onChange={handleFall} type="date" className="input-base" />
          </div>
          <div className="col-span-2">
            <label className="label-base">Causa de Muerte</label>
            <input name="causa_muerte" value={fallecido.causa_muerte} onChange={handleFall} className="input-base" />
          </div>
          <div>
            <label className="label-base">Comuna</label>
            <input name="comuna" value={fallecido.comuna} onChange={handleFall} className="input-base" />
          </div>
        </div>
      </div>

      <div className="flex justify-end pb-6">
        <button onClick={guardar} disabled={guardando || sinStock} className="btn-primary px-7 py-3">
          <Save className="w-4 h-4" />
          {guardando ? 'Guardando...' : 'Guardar Servicio'}
        </button>
      </div>
    </div>
  )
}
