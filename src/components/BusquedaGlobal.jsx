import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, CLIENTE_ID } from '../lib/supabase'
import { Search, FileText, Users, ClipboardList, X } from 'lucide-react'

/**
 * S5 — Búsqueda global
 * Se abre con Ctrl+K (o Cmd+K en Mac).
 * Busca en servicios, fallecidos y retorna resultados navegables con teclado.
 */
export default function BusquedaGlobal() {
  const [abierto, setAbierto]   = useState(false)
  const [query,   setQuery]     = useState('')
  const [resultados, setResultados] = useState([])
  const [seleccionado, setSeleccionado] = useState(0)
  const [buscando, setBuscando] = useState(false)
  const inputRef  = useRef(null)
  const navigate  = useNavigate()

  // Abrir con Ctrl+K / Cmd+K
  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setAbierto(v => !v)
      }
      if (e.key === 'Escape') setAbierto(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Focus al abrir
  useEffect(() => {
    if (abierto) {
      setQuery('')
      setResultados([])
      setSeleccionado(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [abierto])

  // Búsqueda con debounce
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResultados([]); return }
    const t = setTimeout(buscar, 300)
    return () => clearTimeout(t)
  }, [query])

  async function buscar() {
    setBuscando(true)
    const q = query.trim()

    const [{ data: servicios }, { data: fallecidos }] = await Promise.all([
      supabase.from('servicios')
        .select('id, numero_formulario, nombre_cliente, fecha_servicio')
        .eq('cliente_id', CLIENTE_ID)
        .or(`nombre_cliente.ilike.%${q}%,numero_formulario.eq.${isNaN(q) ? 0 : q}`)
        .limit(5),
      supabase.from('fallecidos')
        .select('id, nombre, rut, fecha_servicio, numero_formulario')
        .eq('cliente_id', CLIENTE_ID)
        .or(`nombre.ilike.%${q}%,rut.ilike.%${q}%`)
        .limit(5),
    ])

    const res = [
      ...(servicios || []).map(r => ({
        tipo: 'servicio',
        id: r.id,
        titulo: r.nombre_cliente,
        sub: `Formulario #${r.numero_formulario} · ${r.fecha_servicio}`,
        ruta: '/servicios',
      })),
      ...(fallecidos || []).map(r => ({
        tipo: 'fallecido',
        id: r.id,
        titulo: r.nombre,
        sub: `RUT ${r.rut || '—'} · ${r.fecha_servicio || ''}`,
        ruta: '/fallecidos',
      })),
    ]

    setResultados(res)
    setSeleccionado(0)
    setBuscando(false)
  }

  function navegar(item) {
    navigate(item.ruta)
    setAbierto(false)
  }

  function handleKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSeleccionado(v => Math.min(v + 1, resultados.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSeleccionado(v => Math.max(v - 1, 0))
    }
    if (e.key === 'Enter' && resultados[seleccionado]) {
      navegar(resultados[seleccionado])
    }
  }

  const ICON = { servicio: ClipboardList, fallecido: Users }

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[12vh] px-4"
      style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={() => setAbierto(false)}>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-modal"
        onClick={e => e.stopPropagation()}>

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Buscar clientes, fallecidos, N° formulario..."
            className="flex-1 text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:block text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg font-mono">Esc</kbd>
        </div>

        {/* Resultados */}
        <div className="max-h-80 overflow-y-auto">
          {buscando && (
            <div className="py-8 text-center text-sm text-slate-400">Buscando...</div>
          )}
          {!buscando && query.length >= 2 && resultados.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-400">Sin resultados para "{query}"</div>
          )}
          {!buscando && resultados.length > 0 && resultados.map((r, i) => {
            const Icon = ICON[r.tipo] || FileText
            return (
              <button key={r.id + r.tipo} onClick={() => navegar(r)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                  ${i === seleccionado ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                  ${r.tipo === 'servicio' ? 'bg-blue-100' : 'bg-violet-100'}`}>
                  <Icon className={`w-4 h-4 ${r.tipo === 'servicio' ? 'text-blue-600' : 'text-violet-600'}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{r.titulo}</p>
                  <p className="text-xs text-slate-500 truncate">{r.sub}</p>
                </div>
                <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0
                  ${r.tipo === 'servicio' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}`}>
                  {r.tipo === 'servicio' ? 'Servicio' : 'Fallecido'}
                </span>
              </button>
            )
          })}
          {!query && (
            <div className="py-6 text-center text-sm text-slate-400">
              Escribe para buscar en servicios y fallecidos
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
          <span><kbd className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">↑↓</kbd> Navegar</span>
          <span><kbd className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">Enter</kbd> Ir</span>
          <span><kbd className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">Esc</kbd> Cerrar</span>
        </div>
      </div>
    </div>
  )
}
