import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, CLIENTE_ID } from '../lib/supabase'
import { Save, AlertTriangle, ArrowLeft } from 'lucide-react'

function formatRut(value) {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length <= 1) return clean
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${body}-${clean.slice(-1)}`
}

export default function FormularioEditar() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [loading,           setLoading]           = useState(true)
  const [guardando,         setGuardando]          = useState(false)
  const [error,             setError]              = useState('')
  const [numeroFormulario,  setNumeroFormulario]   = useState(null)

  // Datos de referencia
  const [productos,    setProductos]    = useState([])
  const [trabajadores, setTrabajadores] = useState([])
  const [sucursales,   setSucursales]   = useState([])

  // Datos editables — servicio
  const [servicio, setServicio] = useState({
    fecha_servicio: '',
    nombre_cliente: '',
    telefono:       '',
    producto_id:    '',
    sucursal_id:    '',
    color:          '',
    lugar_retiro:   '',
    lugar_servicio: '',
    cementerio:     '',
    trabajador_id:  '',
  })

  // Datos editables — fallecido
  const [fallecido, setFallecido] = useState({
    nombre:          '',
    sexo:            '',
    edad:            '',
    rut:             '',
    fecha_defuncion: '',
    causa_muerte:    '',
    comuna:          '',
  })

  // ── Carga inicial ────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      supabase.from('servicios').select('*').eq('id', id).eq('cliente_id', CLIENTE_ID).single(),
      supabase.from('productos').select('id,nombre').eq('cliente_id', CLIENTE_ID).eq('activo', true).order('numero'),
      supabase.from('trabajadores').select('id,nombre').eq('cliente_id', CLIENTE_ID).eq('activo', true).order('numero'),
      supabase.from('sucursales').select('id,nombre').eq('cliente_id', CLIENTE_ID).eq('activo', true).order('nombre'),
    ]).then(async ([{ data: svc, error: errSvc }, { data: p }, { data: t }, { data: s }]) => {
      if (errSvc || !svc) {
        setError('No se encontró el formulario.')
        setLoading(false)
        return
      }

      setNumeroFormulario(svc.numero_formulario)
      setServicio({
        fecha_servicio: svc.fecha_servicio || '',
        nombre_cliente: svc.nombre_cliente || '',
        telefono:       svc.telefono || '',
        producto_id:    svc.producto_id || '',
        sucursal_id:    svc.sucursal_id || '',
        color:          svc.color || '',
        lugar_retiro:   svc.lugar_retiro || '',
        lugar_servicio: svc.lugar_servicio || '',
        cementerio:     svc.cementerio || '',
        trabajador_id:  svc.trabajador_id || '',
      })

      // Cargar datos del fallecido vinculado
      const { data: fall } = await supabase
        .from('fallecidos').select('*')
        .eq('numero_formulario', svc.numero_formulario)
        .eq('cliente_id', CLIENTE_ID)
        .maybeSingle()

      if (fall) {
        setFallecido({
          nombre:          fall.nombre || '',
          sexo:            fall.sexo || '',
          edad:            fall.edad ?? '',
          rut:             fall.rut || '',
          fecha_defuncion: fall.fecha_defuncion || '',
          causa_muerte:    fall.causa_muerte || '',
          comuna:          fall.comuna || '',
        })
      }

      setProductos(p || [])
      setTrabajadores(t || [])
      setSucursales(s || [])
      setLoading(false)
    })
  }, [id])

  // ── Handlers ────────────────────────────────────────────
  const handleServ = e => setServicio(v => ({ ...v, [e.target.name]: e.target.value }))
  const handleFall = e => setFallecido(v => ({ ...v, [e.target.name]: e.target.value }))

  // ── Guardar ─────────────────────────────────────────────
  async function guardar() {
    if (!servicio.nombre_cliente.trim()) {
      setError('El nombre del cliente es obligatorio.')
      return
    }
    setError('')
    setGuardando(true)
    try {
      // Actualizar servicios
      const { data: svcActualizado, error: errSvc } = await supabase.from('servicios').update({
        fecha_servicio: servicio.fecha_servicio,
        nombre_cliente: servicio.nombre_cliente.trim(),
        telefono:       servicio.telefono || null,
        sucursal_id:    servicio.sucursal_id || null,
        color:          servicio.color || null,
        lugar_retiro:   servicio.lugar_retiro || null,
        lugar_servicio: servicio.lugar_servicio || null,
        cementerio:     servicio.cementerio || null,
        trabajador_id:  servicio.trabajador_id || null,
      }).eq('id', id).eq('cliente_id', CLIENTE_ID).select()
      if (errSvc) throw errSvc
      if (!svcActualizado || svcActualizado.length === 0)
        throw new Error('Sin permisos para editar este servicio. Solicite acceso al administrador.')

      // Actualizar fallecido
      const { error: errFall } = await supabase.from('fallecidos').update({
        nombre:          fallecido.nombre || null,
        sexo:            fallecido.sexo || null,
        edad:            fallecido.edad !== '' ? Number(fallecido.edad) : null,
        rut:             fallecido.rut || null,
        fecha_defuncion: fallecido.fecha_defuncion || null,
        causa_muerte:    fallecido.causa_muerte || null,
        comuna:          fallecido.comuna || null,
      }).eq('numero_formulario', numeroFormulario).eq('cliente_id', CLIENTE_ID)
      if (errFall) throw errFall

      // Auditoría
      await supabase.rpc('registrar_auditoria', {
        p_accion: 'actualizar',
        p_modulo: 'servicios',
        p_descripcion: `Formulario #${numeroFormulario} (${servicio.nombre_cliente.trim()}) modificado`,
        p_referencia_id: numeroFormulario,
      })

      navigate('/servicios')
    } catch (e) {
      setError(e.message || 'Error al guardar los cambios.')
    } finally {
      setGuardando(false)
    }
  }

  // ── Render ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5 max-w-4xl">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-64 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-4xl page-enter">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <button onClick={() => navigate('/servicios')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-1 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver a Servicios
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Editar Formulario</h1>
          {numeroFormulario && (
            <p className="text-sm text-slate-500 mt-0.5">
              Formulario: <span className="font-bold text-blue-600">#{numeroFormulario}</span>
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

      {/* ── Datos del Servicio ────────────────────────────── */}
      <div className="form-section">
        <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Datos del Servicio</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label-base">N° Formulario</label>
            <input readOnly value={numeroFormulario ? `#${numeroFormulario}` : '—'}
              className="input-base bg-slate-50 font-bold text-blue-600" />
          </div>
          <div>
            <label className="label-base">Fecha de Servicio</label>
            <input name="fecha_servicio" value={servicio.fecha_servicio}
              onChange={handleServ} type="date" className="input-base" />
          </div>
          <div className="col-span-2">
            <label className="label-base">Nombre Cliente</label>
            <input name="nombre_cliente" value={servicio.nombre_cliente}
              onChange={handleServ} className="input-base" placeholder="Nombre completo" />
          </div>
          <div>
            <label className="label-base">Teléfono</label>
            <input name="telefono" value={servicio.telefono} onChange={handleServ}
              className="input-base" placeholder="+56 9 XXXX XXXX" maxLength={15} inputMode="tel" />
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
            <input readOnly
              value={productos.find(p => p.id === servicio.producto_id)?.nombre || '—'}
              className="input-base bg-slate-50 text-slate-500 cursor-not-allowed"
              title="La urna no puede modificarse" />
          </div>
          <div>
            <label className="label-base">Color</label>
            <input name="color" value={servicio.color} onChange={handleServ}
              className="input-base" placeholder="Color de la urna" />
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

      {/* ── Datos del Fallecido ───────────────────────────── */}
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
            <input name="edad" value={fallecido.edad} onChange={handleFall}
              type="number" className="input-base" />
          </div>
          <div>
            <label className="label-base">RUT</label>
            <input name="rut" value={fallecido.rut}
              onChange={e => setFallecido(f => ({ ...f, rut: formatRut(e.target.value) }))}
              className="input-base" placeholder="12.345.678-9" maxLength={12} />
          </div>
          <div>
            <label className="label-base">Fecha Defunción</label>
            <input name="fecha_defuncion" value={fallecido.fecha_defuncion}
              onChange={handleFall} type="date" className="input-base" />
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

      {/* Botones */}
      <div className="flex items-center justify-between pb-6">
        <button onClick={() => navigate('/servicios')} className="btn-secondary px-6 py-2.5">
          Cancelar
        </button>
        <button onClick={guardar} disabled={guardando} className="btn-primary px-7 py-3">
          <Save className="w-4 h-4" />
          {guardando ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  )
}
