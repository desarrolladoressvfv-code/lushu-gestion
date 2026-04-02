import { useEffect, useState } from 'react'
import { supabase, clp } from '../../lib/supabase'
import { Users, DollarSign, AlertTriangle, TrendingUp, CheckCircle, XCircle, Clock, Building2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

const PLAN_COLORS = { basico: '#64748b', profesional: '#3b82f6', enterprise: '#8b5cf6' }
const PLAN_LABELS = { basico: 'Básico', profesional: 'Profesional', enterprise: 'Enterprise' }
const PLAN_BADGE = { basico: 'bg-slate-100 text-slate-600', profesional: 'bg-blue-100 text-blue-700', enterprise: 'bg-violet-100 text-violet-700' }

export default function SuperAdminDashboard() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('clientes').select('*').order('nombre')
      .then(({ data }) => { setClientes(data || []); setLoading(false) })
  }, [])

  const hoy = new Date()
  const en30d = new Date(hoy.getTime() + 30 * 86400000)

  const activos = clientes.filter(c => c.estado === 'activo' && new Date(c.fecha_vencimiento) >= hoy)
  const inactivos = clientes.filter(c => c.estado !== 'activo')
  const vencidos = clientes.filter(c => c.estado === 'activo' && new Date(c.fecha_vencimiento) < hoy)
  const vencenProximo = activos.filter(c => new Date(c.fecha_vencimiento) <= en30d)
  const mrr = activos.reduce((s, c) => s + Number(c.valor_plan || 0), 0)

  const planDist = Object.entries(
    clientes.reduce((acc, c) => { const p = c.plan || 'basico'; acc[p] = (acc[p] || 0) + 1; return acc }, {})
  ).map(([plan, cantidad]) => ({ name: PLAN_LABELS[plan] || plan, value: cantidad, plan }))

  const revPlan = Object.entries(
    activos.reduce((acc, c) => { const p = c.plan || 'basico'; acc[p] = (acc[p] || 0) + Number(c.valor_plan || 0); return acc }, {})
  ).map(([plan, total]) => ({ name: PLAN_LABELS[plan] || plan, total, plan }))

  const KPIs = [
    { label: 'Total Clientes', value: clientes.length, icon: Users, gradient: 'from-blue-500 to-blue-700', shadow: 'shadow-blue-500/30' },
    { label: 'Clientes Activos', value: activos.length, icon: CheckCircle, gradient: 'from-emerald-500 to-emerald-700', shadow: 'shadow-emerald-500/30' },
    { label: 'MRR', value: `USD ${mrr.toLocaleString('es-CL')}`, icon: DollarSign, gradient: 'from-violet-500 to-violet-700', shadow: 'shadow-violet-500/30' },
    { label: 'ARR', value: `USD ${(mrr * 12).toLocaleString('es-CL')}`, icon: TrendingUp, gradient: 'from-cyan-500 to-cyan-700', shadow: 'shadow-cyan-500/30' },
    { label: 'Inactivos', value: inactivos.length, icon: XCircle, gradient: 'from-red-500 to-red-700', shadow: 'shadow-red-500/30' },
    { label: 'Vencen en 30 días', value: vencenProximo.length, icon: AlertTriangle, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/30' },
  ]

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-0.5">Visión general del negocio · {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {KPIs.map((k, i) => (
          <div key={i} className={`rounded-2xl p-5 bg-gradient-to-br ${k.gradient} shadow-lg ${k.shadow}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <k.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-white/70 text-xs font-medium mb-1">{k.label}</p>
            <p className="text-white text-2xl font-bold">{loading ? '—' : k.value}</p>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-800 mb-0.5">Distribución por Plan</h2>
          <p className="text-xs text-slate-400 mb-4">Clientes activos e inactivos por plan</p>
          {loading ? <div className="skeleton h-52 rounded-xl" /> : planDist.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={planDist} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                  {planDist.map((d, i) => <Cell key={i} fill={PLAN_COLORS[d.plan] || '#64748b'} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} cliente${v !== 1 ? 's' : ''}`, n]} />
                <Legend formatter={v => <span className="text-xs text-slate-600">{v}</span>} iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-800 mb-0.5">MRR por Plan</h2>
          <p className="text-xs text-slate-400 mb-4">Ingresos mensuales recurrentes por tipo de plan</p>
          {loading ? <div className="skeleton h-52 rounded-xl" /> : revPlan.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revPlan}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={v => [`USD ${Number(v).toLocaleString('es-CL')}`, 'MRR']} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {revPlan.map((d, i) => <Cell key={i} fill={PLAN_COLORS[d.plan] || '#64748b'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Alertas vencimiento */}
      {!loading && vencenProximo.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-600" />
            <h2 className="font-bold text-amber-800 text-sm">
              Licencias por vencer ({vencenProximo.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {vencenProximo.sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento)).map(c => {
              const dias = Math.ceil((new Date(c.fecha_vencimiento) - hoy) / 86400000)
              return (
                <div key={c.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-amber-100">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{c.nombre}</p>
                    <p className="text-xs text-slate-400">{PLAN_LABELS[c.plan] || 'Básico'}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${dias <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {dias === 0 ? 'Vence hoy' : `${dias}d`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Clientes vencidos */}
      {!loading && vencidos.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4 text-red-600" />
            <h2 className="font-bold text-red-800 text-sm">
              Licencias vencidas ({vencidos.length}) — requieren atención
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {vencidos.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-red-100">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{c.nombre}</p>
                  <p className="text-xs text-slate-400">Venció: {c.fecha_vencimiento?.split('T')[0]}</p>
                </div>
                <span className="badge badge-red text-xs">Vencida</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla resumen clientes */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Todos los clientes</h2>
          <span className="text-xs text-slate-400">{clientes.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Empresa', 'Plan', 'Valor/mes', 'Sucursales', 'Vencimiento', 'Estado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Cargando...</td></tr>
              ) : clientes.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  Sin clientes registrados
                </td></tr>
              ) : clientes.map(c => {
                const vencido = new Date(c.fecha_vencimiento) < hoy
                const estaActivo = c.estado === 'activo' && !vencido
                return (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{c.nombre}</p>
                      {c.contacto_email && <p className="text-xs text-slate-400">{c.contacto_email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PLAN_BADGE[c.plan] || PLAN_BADGE.basico}`}>
                        {PLAN_LABELS[c.plan] || 'Básico'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">USD {Number(c.valor_plan || 0).toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{c.max_sucursales || 1}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      <span className={vencido ? 'text-red-600 font-medium' : ''}>{c.fecha_vencimiento?.split('T')[0] || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${estaActivo ? 'bg-emerald-100 text-emerald-700' : vencido ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                        {estaActivo ? 'Activo' : vencido ? 'Vencido' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
