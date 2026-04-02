import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { Plus, Pencil, X, Search, Users, RefreshCw, Eye, EyeOff, Trash2 } from 'lucide-react'

// Cliente Supabase sin persistencia de sesión — para crear usuarios sin afectar la sesión del admin
const supabaseAux = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const PLANES = ['basico', 'profesional', 'enterprise']
const PLAN_LABELS = { basico: 'Básico', profesional: 'Profesional', enterprise: 'Enterprise' }
const PLAN_BADGE = { basico: 'bg-slate-100 text-slate-600', profesional: 'bg-blue-100 text-blue-700', enterprise: 'bg-violet-100 text-violet-700' }
const MAX_SUCURSALES = { basico: 1, profesional: 3, enterprise: 99 }
const VALOR_PLAN = { basico: 29, profesional: 79, enterprise: 149 }

const formVacio = () => ({
  nombre: '',
  rut: '',
  contacto_email: '',
  contacto_telefono: '',
  email_acceso: '',
  password_temporal: '',
  plan: 'basico',
  valor_plan: 29,
  max_sucursales: 1,
  estado: 'activo',
  fecha_vencimiento: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
})

export default function SuperAdminClientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(formVacio())
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [confirmToggle, setConfirmToggle] = useState(null)
  const [confirmEliminar, setConfirmEliminar] = useState(null)

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('clientes').select('*').order('nombre')
    setClientes(data || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const hoy = new Date()
  const filtrados = clientes.filter(c => {
    const texto = c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.contacto_email?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.rut?.includes(busqueda)
    const vencido = new Date(c.fecha_vencimiento) < hoy
    const activo = c.estado === 'activo' && !vencido
    if (filtroEstado === 'activo') return texto && activo
    if (filtroEstado === 'inactivo') return texto && !activo
    return texto
  })

  function abrirNuevo() {
    setForm(formVacio())
    setError('')
    setModal('nuevo')
  }

  function abrirEditar(c) {
    setForm({
      nombre: c.nombre || '',
      rut: c.rut || '',
      contacto_email: c.contacto_email || '',
      contacto_telefono: c.contacto_telefono || '',
      plan: c.plan || 'basico',
      valor_plan: c.valor_plan ?? VALOR_PLAN[c.plan || 'basico'],
      max_sucursales: c.max_sucursales || 1,
      estado: c.estado || 'activo',
      fecha_vencimiento: c.fecha_vencimiento?.split('T')[0] || '',
    })
    setError('')
    setModal(c)
  }

  function handleForm(e) {
    const { name, value } = e.target
    setForm(f => {
      const next = { ...f, [name]: value }
      if (name === 'plan') {
        next.max_sucursales = MAX_SUCURSALES[value] || 1
        next.valor_plan = VALOR_PLAN[value] || 29
      }
      return next
    })
  }

  function renovar30d(c) {
    const base = new Date(c.fecha_vencimiento) < hoy ? hoy : new Date(c.fecha_vencimiento)
    base.setDate(base.getDate() + 30)
    return base.toISOString().split('T')[0]
  }

  async function renovarLicencia(c) {
    await supabase.from('clientes').update({ fecha_vencimiento: renovar30d(c), estado: 'activo' }).eq('id', c.id)
    cargar()
  }

  async function guardar() {
    if (!form.nombre.trim()) { setError('El nombre de la empresa es obligatorio'); return }
    if (modal === 'nuevo') {
      if (!form.email_acceso.trim()) { setError('El email de acceso es obligatorio'); return }
      if (form.password_temporal.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    }
    setGuardando(true)
    setError('')

    try {
      const payload = {
        nombre: form.nombre.trim(),
        rut: form.rut || null,
        contacto_email: form.contacto_email || null,
        contacto_telefono: form.contacto_telefono || null,
        plan: form.plan,
        valor_plan: Number(form.valor_plan),
        max_sucursales: Number(form.max_sucursales),
        estado: form.estado,
        fecha_vencimiento: form.fecha_vencimiento,
      }

      if (modal === 'nuevo') {
        // 1. Crear usuario en Supabase Auth (sin afectar sesión admin)
        const { data: authData, error: authErr } = await supabaseAux.auth.signUp({
          email: form.email_acceso.trim(),
          password: form.password_temporal,
        })
        if (authErr) throw new Error(`Error al crear usuario: ${authErr.message}`)

        const authUserId = authData?.user?.id
        if (!authUserId) throw new Error('No se pudo obtener el ID del usuario creado')

        // 2. Crear registro en clientes
        const { data: clienteData, error: clienteErr } = await supabase
          .from('clientes').insert(payload).select().single()
        if (clienteErr) throw new Error(`Error al crear cliente: ${clienteErr.message}`)

        // 3. Vincular usuario → cliente en tabla usuarios
        const { error: usuErr } = await supabase.from('usuarios').insert({
          auth_user_id: authUserId,
          cliente_id: clienteData.id,
          rol: 'admin',
          nombre: form.nombre.trim(),
        })
        if (usuErr) throw new Error(`Error al vincular usuario: ${usuErr.message}`)

      } else {
        // Solo actualizar datos del cliente existente
        const { error: updErr } = await supabase.from('clientes').update(payload).eq('id', modal.id)
        if (updErr) throw new Error(updErr.message)
      }

      setModal(null)
      cargar()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function toggleEstado(c) {
    const nuevoEstado = c.estado === 'activo' ? 'inactivo' : 'activo'
    await supabase.from('clientes').update({ estado: nuevoEstado }).eq('id', c.id)
    setConfirmToggle(null)
    cargar()
  }

  async function eliminarCliente(c) {
    setError('')
    try {
      const id = c.id
      // Eliminar datos dependientes primero (en orden de dependencias)
      await supabase.from('movimientos_inventario').delete().eq('cliente_id', id)
      await supabase.from('cheques').delete().eq('cliente_id', id)
      await supabase.from('formas_pago').delete().eq('cliente_id', id)
      await supabase.from('inventario').delete().eq('cliente_id', id)
      await supabase.from('ordenes_compra').delete().eq('cliente_id', id)
      await supabase.from('ventas').delete().eq('cliente_id', id)
      await supabase.from('cotizaciones').delete().eq('cliente_id', id)
      await supabase.from('fallecidos').delete().eq('cliente_id', id)
      await supabase.from('servicios').delete().eq('cliente_id', id)
      await supabase.from('productos').delete().eq('cliente_id', id)
      await supabase.from('sucursales').delete().eq('cliente_id', id)
      await supabase.from('usuarios').delete().eq('cliente_id', id)
      const { error: delErr } = await supabase.from('clientes').delete().eq('id', id)
      if (delErr) throw new Error(delErr.message)
      setConfirmEliminar(null)
      cargar()
    } catch (e) {
      setConfirmEliminar(null)
      setError(`No se pudo eliminar: ${e.message}`)
    }
  }

  const activos = clientes.filter(c => c.estado === 'activo' && new Date(c.fecha_vencimiento) >= hoy).length
  const mrr = clientes.filter(c => c.estado === 'activo' && new Date(c.fecha_vencimiento) >= hoy)
    .reduce((s, c) => s + Number(c.valor_plan || 0), 0)

  return (
    <>
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {activos} activos · MRR: <span className="font-semibold text-slate-600">USD {mrr.toLocaleString('es-CL')}</span>
          </p>
        </div>
        <button onClick={abrirNuevo} className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo Cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="filtros-bar flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="input-base pl-9 w-56" placeholder="Buscar empresa, email o RUT..." />
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {[['', 'Todos'], ['activo', 'Activos'], ['inactivo', 'Inactivos']].map(([val, label]) => (
            <button key={val} onClick={() => setFiltroEstado(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filtroEstado === val ? 'bg-white shadow text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="tabla-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Empresa', 'RUT', 'Contacto', 'Plan', 'USD/mes', 'Sucursales', 'Vencimiento', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10 text-slate-400">Cargando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                  Sin clientes registrados
                </td></tr>
              ) : filtrados.map(c => {
                const vencido = new Date(c.fecha_vencimiento) < hoy
                const activo = c.estado === 'activo' && !vencido
                const diasVence = Math.ceil((new Date(c.fecha_vencimiento) - hoy) / 86400000)
                return (
                  <tr key={c.id} className={`tabla-fila ${!activo ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{c.nombre}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{c.rut || '-'}</td>
                    <td className="px-4 py-3">
                      {c.contacto_email && <p className="text-xs text-slate-600">{c.contacto_email}</p>}
                      {c.contacto_telefono && <p className="text-xs text-slate-400">{c.contacto_telefono}</p>}
                      {!c.contacto_email && !c.contacto_telefono && <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PLAN_BADGE[c.plan] || PLAN_BADGE.basico}`}>
                        {PLAN_LABELS[c.plan] || 'Básico'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{Number(c.valor_plan || 0).toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{c.max_sucursales || 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className={`text-sm ${vencido ? 'text-red-600 font-semibold' : diasVence <= 7 ? 'text-amber-600 font-medium' : 'text-slate-600'}`}>
                        {c.fecha_vencimiento?.split('T')[0] || '-'}
                      </p>
                      {activo && diasVence <= 30 && (
                        <p className="text-xs text-amber-500">{diasVence}d restantes</p>
                      )}
                      {vencido && (
                        <p className="text-xs text-red-500">Vencida</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setConfirmToggle(c)}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-full transition-colors ${
                          activo
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {activo ? 'Activo' : vencido ? 'Vencido' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => abrirEditar(c)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors" title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {(vencido || !activo) && (
                          <button onClick={() => renovarLicencia(c)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors" title="Renovar 30 días">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => setConfirmEliminar(c)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Eliminar cliente">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>

      {/* Modal confirmación eliminar */}
      {confirmEliminar && (
        <div className="modal-backdrop">
          <div className="modal-panel max-w-sm">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">¿Eliminar cliente?</h3>
              <p className="text-slate-500 text-sm mb-1">
                Estás a punto de eliminar permanentemente a:
              </p>
              <p className="font-semibold text-slate-800 mb-4">"{confirmEliminar.nombre}"</p>
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-6">
                Esta acción no se puede deshacer. Se eliminarán el cliente y su usuario vinculado.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmEliminar(null)} className="btn-secondary flex-1 justify-center">
                  Cancelar
                </button>
                <button
                  onClick={() => eliminarCliente(confirmEliminar)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación toggle estado */}
      {confirmToggle && (
        <div className="modal-backdrop">
          <div className="modal-panel max-w-sm">
            <div className="p-6 text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${confirmToggle.estado === 'activo' ? 'bg-red-100' : 'bg-emerald-100'}`}>
                <Users className={`w-7 h-7 ${confirmToggle.estado === 'activo' ? 'text-red-600' : 'text-emerald-600'}`} />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">
                {confirmToggle.estado === 'activo' ? '¿Desactivar cliente?' : '¿Activar cliente?'}
              </h3>
              <p className="text-slate-500 text-sm mb-6">
                {confirmToggle.estado === 'activo'
                  ? `El cliente "${confirmToggle.nombre}" perderá acceso inmediatamente a su portal.`
                  : `El cliente "${confirmToggle.nombre}" recuperará acceso a su portal.`}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmToggle(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button
                  onClick={() => toggleEstado(confirmToggle)}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors ${confirmToggle.estado === 'activo' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                  {confirmToggle.estado === 'activo' ? 'Sí, desactivar' : 'Sí, activar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo / editar */}
      {modal !== null && (
        <div className="modal-backdrop">
          <div className="modal-panel w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {modal === 'nuevo' ? 'Nuevo Cliente' : `Editar · ${modal.nombre}`}
              </h3>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Datos empresa */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Datos de la Empresa</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="label-base">Nombre empresa *</label>
                    <input name="nombre" value={form.nombre} onChange={handleForm} className="input-base" placeholder="Funeraria San José" />
                  </div>
                  <div>
                    <label className="label-base">RUT</label>
                    <input name="rut" value={form.rut} onChange={handleForm} className="input-base" placeholder="12.345.678-9" />
                  </div>
                  <div>
                    <label className="label-base">Email de contacto</label>
                    <input name="contacto_email" type="email" value={form.contacto_email} onChange={handleForm} className="input-base" placeholder="admin@empresa.com" />
                  </div>
                  <div>
                    <label className="label-base">Teléfono</label>
                    <input name="contacto_telefono" value={form.contacto_telefono} onChange={handleForm} className="input-base" placeholder="+56 9..." />
                  </div>
                </div>
              </div>

              {/* Acceso — solo al crear */}
              {modal === 'nuevo' && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Credenciales de Acceso</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="label-base">Email de acceso *</label>
                      <input name="email_acceso" type="email" value={form.email_acceso} onChange={handleForm}
                        className="input-base" placeholder="usuario@funeraria.com" />
                      <p className="text-xs text-slate-400 mt-1">Con este email el cliente iniciará sesión</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label-base">Contraseña temporal *</label>
                      <div className="relative">
                        <input name="password_temporal" type={showPass ? 'text' : 'password'}
                          value={form.password_temporal} onChange={handleForm}
                          className="input-base pr-11" placeholder="Mínimo 6 caracteres" />
                        <button type="button" onClick={() => setShowPass(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">El cliente podrá cambiarla desde su portal</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Plan y licencia */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Plan y Licencia</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-base">Plan</label>
                    <select name="plan" value={form.plan} onChange={handleForm} className="input-base">
                      {PLANES.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-base">Valor mensual (USD)</label>
                    <input name="valor_plan" type="number" value={form.valor_plan} onChange={handleForm} className="input-base" />
                  </div>
                  <div>
                    <label className="label-base">Máx. sucursales</label>
                    <input name="max_sucursales" type="number" min={1} value={form.max_sucursales} onChange={handleForm} className="input-base" />
                  </div>
                  <div>
                    <label className="label-base">Vencimiento</label>
                    <input name="fecha_vencimiento" type="date" value={form.fecha_vencimiento} onChange={handleForm} className="input-base" />
                  </div>
                  <div>
                    <label className="label-base">Estado</label>
                    <select name="estado" value={form.estado} onChange={handleForm} className="input-base">
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>

                {/* Resumen plan */}
                <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                  <span className="font-semibold">{PLAN_LABELS[form.plan]}</span>
                  {' · '}{form.max_sucursales} sucursal{form.max_sucursales > 1 ? 'es' : ''}
                  {' · '}USD {Number(form.valor_plan).toLocaleString('es-CL')}/mes
                  {' · '}ARR: USD {(Number(form.valor_plan) * 12).toLocaleString('es-CL')}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">{error}</div>
              )}
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="btn-primary flex-1 justify-center">
                {guardando ? 'Guardando...' : modal === 'nuevo' ? 'Crear Cliente' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
