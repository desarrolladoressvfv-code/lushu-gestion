import ExcelJS from 'exceljs'
import { hoyCL } from './fecha'

/**
 * Exporta datos a Excel con logo opcional en la cabecera.
 * @param {object[]} datos        - Array de objetos (cada key = columna)
 * @param {string}   nombreHoja   - Nombre de la hoja
 * @param {string}   nombreArchivo - Nombre base del archivo
 * @param {string}   [logoUrl]    - URL pública del logo (opcional)
 * @param {string}   [empresa]    - Nombre de la empresa para el encabezado
 */
export async function exportarExcel(datos, nombreHoja, nombreArchivo, logoUrl = null, empresa = '') {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(nombreHoja)

  let startRow = 1

  // ── Logo ──────────────────────────────────────────────
  if (logoUrl) {
    try {
      const resp = await fetch(logoUrl)
      const ab   = await resp.arrayBuffer()
      const ext  = logoUrl.split('?')[0].split('.').pop().toLowerCase()
      const tipo = ext === 'png' ? 'png' : ext === 'svg' ? 'png' : 'jpeg'

      const imageId = wb.addImage({ buffer: ab, extension: tipo })
      ws.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 140, height: 45 },
      })
      // Reservar filas para el logo
      ws.getRow(1).height = 36
      ws.getRow(2).height = 6
      startRow = 3
    } catch {
      // Si falla la imagen, continuar sin logo
    }
  }

  // ── Nombre empresa + fecha ─────────────────────────────
  const rowInfo = ws.getRow(startRow)
  rowInfo.getCell(1).value = empresa || nombreArchivo
  rowInfo.getCell(1).font  = { bold: true, size: 11, color: { argb: 'FF0F172A' } }
  const fechaCell = rowInfo.getCell(3)
  fechaCell.value     = `Generado: ${hoyCL()}`
  fechaCell.font      = { size: 9, color: { argb: 'FF64748B' } }
  fechaCell.alignment = { horizontal: 'right' }
  startRow++

  // Fila separadora vacía
  startRow++

  // ── Encabezados ────────────────────────────────────────
  if (datos.length === 0) {
    ws.getRow(startRow).getCell(1).value = 'Sin datos'
  } else {
    const headers = Object.keys(datos[0])
    const headerRow = ws.getRow(startRow)
    headers.forEach((h, i) => {
      const cell  = headerRow.getCell(i + 1)
      cell.value  = h
      cell.font   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF3B82F6' } },
      }
    })
    headerRow.height = 20
    startRow++

    // ── Filas de datos ─────────────────────────────────────
    datos.forEach((fila, rowIdx) => {
      const values = Object.values(fila)
      const dataRow = ws.getRow(startRow + rowIdx)
      values.forEach((v, i) => {
        const cell = dataRow.getCell(i + 1)
        cell.value = v ?? ''
        cell.font  = { size: 9 }
        cell.fill  = {
          type: 'pattern', pattern: 'solid',
          fgColor: { argb: rowIdx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC' },
        }
      })
    })

    // ── Anchos de columna ──────────────────────────────────
    const headers2 = Object.keys(datos[0])
    headers2.forEach((key, i) => {
      const maxLen = Math.max(
        key.length,
        ...datos.map(r => String(r[key] ?? '').length),
      )
      ws.getColumn(i + 1).width = Math.min(maxLen + 4, 50)
    })
  }

  // ── Descargar ──────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob   = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = `${nombreArchivo}_${hoyCL()}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

export function clpTexto(valor) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(valor ?? 0)
}
