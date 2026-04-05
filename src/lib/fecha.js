/**
 * M7 — Utilidades de fecha con timezone Chile (America/Santiago)
 *
 * Chile opera en UTC−3 (invierno) / UTC−4 (verano, CLST).
 * `new Date().toISOString()` devuelve UTC, lo que puede mostrar
 * el día anterior en Chile después de las 21:00 hrs. Estas
 * funciones siempre usan el huso horario correcto.
 */

/** Fecha de hoy en Chile → 'YYYY-MM-DD' */
export function hoyCL() {
  // 'en-CA' devuelve formato ISO YYYY-MM-DD de forma nativa
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

/** Formatea 'YYYY-MM-DD' → 'DD/MM/YYYY' para mostrar al usuario */
export function mostrarFecha(fechaStr) {
  if (!fechaStr) return ''
  const [y, m, d] = fechaStr.split('-')
  return `${d}/${m}/${y}`
}

/**
 * Devuelve la fecha de hace N meses en formato 'YYYY-MM-DD'
 * calculada en el timezone de Chile.
 */
export function haceNmesesCL(n) {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }))
  d.setMonth(d.getMonth() - n)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}
