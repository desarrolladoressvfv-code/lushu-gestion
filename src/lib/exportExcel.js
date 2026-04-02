import * as XLSX from 'xlsx'

export function exportarExcel(datos, nombreHoja, nombreArchivo) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(datos)

  // Ajustar ancho de columnas automáticamente
  const cols = Object.keys(datos[0] || {}).map(key => ({
    wch: Math.max(key.length, ...datos.map(r => String(r[key] ?? '').length)) + 2
  }))
  ws['!cols'] = cols

  XLSX.utils.book_append_sheet(wb, ws, nombreHoja)
  XLSX.writeFile(wb, `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export function clpTexto(valor) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(valor ?? 0)
}
