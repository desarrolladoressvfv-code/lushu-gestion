import { useEffect, useState } from 'react'
import { supabase, CLIENTE_ID } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Clock } from 'lucide-react'

const ACCION_CONFIG = {
  crear:      { label: 'Creación',     dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  actualizar: { label: 'Modificación', dot: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700' },
  editar:     { label: 'Modificación', dot: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700' },
  eliminar:   { label: 'Eliminación',  dot: 'bg-red-500',     badge: 'bg-red-100 text-red-700' },
}

function formatFechaHora(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Muestra el historial de auditoría para un registro específico.
 *
 * Props:
 *   referenciaId  {number}   — numero_formulario o id del registro
 *   modulos       {string[]} — filtrar por módulos (null = todos excepto sesion)
 */
export default function HistorialAuditoria({ referenciaId, modulos = null }) {
  const { esOperador } = useAuth()
  const [entradas, setEntradas] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!referenciaId) { setLoading(false); return }
    setLoading(true)

    let q = supabase
      .from('auditoria')
      .select('id, accion, modulo, descripcion, nombre_usuario, created_at')
      .eq('cliente_id', CLIENTE_ID)
      .eq('referencia_id', referenciaId)
      .neq('modulo', 'sesion')
      .order('created_at', { ascending: false })

    if (modulos?.length) q = q.in('modulo', modulos)
    if (esOperador)      q = q.neq('accion', 'eliminar')

    q.then(({ data }) => { setEntradas(data || []); setLoading(false) })
  }, [referenciaId, esOperador])

  if (loading) {
    return (
      <div className="space-y-4 px-1">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 items-start">
            <div className="skeleton w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3.5 w-28 rounded" />
              <div className="skeleton h-3 w-52 rounded" />
              <div className="skeleton h-2.5 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!entradas.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
        <Clock className="w-8 h-8 opacity-25" />
        <p className="text-sm">Sin actividad registrada</p>
      </div>
    )
  }

  return (
    <div className="space-y-0 px-1">
      {entradas.map((e, idx) => {
        const cfg = ACCION_CONFIG[e.accion] || ACCION_CONFIG.actualizar
        return (
          <div key={e.id} className="flex gap-3 items-start relative">
            {/* Línea vertical del timeline */}
            {idx < entradas.length - 1 && (
              <div className="absolute left-[4px] top-3.5 bottom-0 w-px bg-slate-100" />
            )}
            {/* Punto */}
            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
            {/* Contenido */}
            <div className="flex-1 pb-4 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                  {cfg.label}
                </span>
                <span className="text-xs font-medium text-slate-700">{e.nombre_usuario || '—'}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{e.descripcion}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{formatFechaHora(e.created_at)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
