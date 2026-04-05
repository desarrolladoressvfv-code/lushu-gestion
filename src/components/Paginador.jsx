import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * M1 — Paginación reutilizable
 *
 * Props:
 *   pagina       number  — página actual (1-based)
 *   totalItems   number  — total de registros
 *   porPagina    number  — registros por página (default 25)
 *   onChange     fn      — callback(nuevaPagina)
 */
export default function Paginador({ pagina, totalItems, porPagina = 25, onChange }) {
  const totalPaginas = Math.ceil(totalItems / porPagina)
  if (totalPaginas <= 1) return null

  const desde = (pagina - 1) * porPagina + 1
  const hasta  = Math.min(pagina * porPagina, totalItems)

  // Rango de páginas visibles (máx 5 botones)
  const mitad  = 2
  let inicio = Math.max(1, pagina - mitad)
  let fin    = Math.min(totalPaginas, pagina + mitad)
  if (pagina <= mitad + 1)            fin    = Math.min(totalPaginas, 5)
  if (pagina >= totalPaginas - mitad) inicio = Math.max(1, totalPaginas - 4)
  const rango = []
  for (let i = inicio; i <= fin; i++) rango.push(i)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-white rounded-b-2xl">
      <p className="text-xs text-slate-500">
        Mostrando <span className="font-semibold text-slate-700">{desde}–{hasta}</span> de{' '}
        <span className="font-semibold text-slate-700">{totalItems}</span> registros
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(pagina - 1)}
          disabled={pagina === 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500
                     hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {inicio > 1 && (
          <>
            <button onClick={() => onChange(1)}
              className="w-7 h-7 text-xs rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
              1
            </button>
            {inicio > 2 && <span className="text-slate-300 text-xs px-0.5">…</span>}
          </>
        )}

        {rango.map(p => (
          <button key={p} onClick={() => onChange(p)}
            className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${
              p === pagina
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}>
            {p}
          </button>
        ))}

        {fin < totalPaginas && (
          <>
            {fin < totalPaginas - 1 && <span className="text-slate-300 text-xs px-0.5">…</span>}
            <button onClick={() => onChange(totalPaginas)}
              className="w-7 h-7 text-xs rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
              {totalPaginas}
            </button>
          </>
        )}

        <button
          onClick={() => onChange(pagina + 1)}
          disabled={pagina === totalPaginas}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500
                     hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

/**
 * Hook que maneja el estado de paginación.
 *
 * const { pagina, setPagina, paginados } = usePaginacion(filtrados, 25)
 * — paginados es la slice de datos para la página actual
 * — cuando los filtros cambian, vuelve automáticamente a la página 1
 */
export function usePaginacion(datos, porPagina = 25) {
  const [pagina, setPagina] = useState(1)

  // Volver a página 1 cuando cambian los datos filtrados
  useEffect(() => { setPagina(1) }, [datos.length])

  const paginados = datos.slice((pagina - 1) * porPagina, pagina * porPagina)

  return { pagina, setPagina, paginados, porPagina }
}
