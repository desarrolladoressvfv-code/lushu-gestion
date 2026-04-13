import jsPDF from 'jspdf'

export async function generarCotizacionPDF(datos) {
  const {
    fecha, nombreCliente, telefono, nombreServicio, sucursalNombre,
    tipoUrna, color, lugarRetiro, lugarServicio, cementerio,
    valorServicio, valorAdicional, total, descuento, porcDescuento,
    ventaNeta, iva, ventaTotal, comentarios, empresaNombre,
    numeroCotizacion,
    logoUrl,
  } = datos

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const margen = 18
  let y = 0

  const clp = (v) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(v ?? 0)

  // ── ENCABEZADO ──────────────────────────────────────────────
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, W, 38, 'F')

  // Logo (si existe)
  if (logoUrl) {
    try {
      const resp       = await fetch(logoUrl)
      const ab         = await resp.arrayBuffer()
      const ext        = logoUrl.split('?')[0].split('.').pop().toLowerCase()
      const formatPDF  = ext === 'png' ? 'PNG' : 'JPEG'
      const base64     = btoa(String.fromCharCode(...new Uint8Array(ab)))
      const dataUri    = `data:image/${ext === 'png' ? 'png' : 'jpeg'};base64,${base64}`
      // Logo a la izquierda, contenido en 28x20mm con margen vertical
      doc.addImage(dataUri, formatPDF, margen, 7, 0, 22, '', 'FAST')
      // Ajustar texto para no solaparse con el logo
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(148, 163, 184)
      doc.text('Servicios Fúnebres Profesionales', margen, 34)
    } catch {
      // Si falla el logo, mostrar nombre de empresa
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.text(empresaNombre || 'Mi Empresa', margen, 16)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(148, 163, 184)
      doc.text('Servicios Fúnebres Profesionales', margen, 23)
    }
  } else {
    // Sin logo: nombre de empresa
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.text(empresaNombre || 'Mi Empresa', margen, 16)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(148, 163, 184)
    doc.text('Servicios Fúnebres Profesionales', margen, 23)
  }

  // Etiqueta COTIZACIÓN + número (derecha)
  doc.setFillColor(59, 130, 246)
  doc.roundedRect(W - margen - 48, 7, 48, numeroCotizacion ? 22 : 18, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('COTIZACIÓN', W - margen - 24, numeroCotizacion ? 16 : 19, { align: 'center' })
  if (numeroCotizacion) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(219, 234, 254)
    const numStr = `N° ${String(numeroCotizacion).padStart(4, '0')}`
    doc.text(numStr, W - margen - 24, 24, { align: 'center' })
  }

  y = 50

  // ── DATOS GENERALES ─────────────────────────────────────────
  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)

  // Fecha y sucursal (derecha)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text(`Fecha: ${fecha}`, W - margen, y, { align: 'right' })
  if (sucursalNombre) doc.text(`Sucursal: ${sucursalNombre}`, W - margen, y + 6, { align: 'right' })

  // Datos del cliente
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(margen, y - 5, 90, nombreServicio ? 32 : 26, 3, 3, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text('DATOS DEL CLIENTE', margen + 4, y + 2)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text(nombreCliente || '—', margen + 4, y + 10)

  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  if (telefono) doc.text(`Tel: ${telefono}`, margen + 4, y + 17)
  if (nombreServicio) {
    doc.setTextColor(59, 130, 246)
    doc.setFont('helvetica', 'bold')
    doc.text(`Servicio: ${nombreServicio}`, margen + 4, y + 24)
  }

  y += nombreServicio ? 42 : 36

  // ── DETALLE DEL SERVICIO ─────────────────────────────────────
  doc.setFillColor(15, 23, 42)
  doc.rect(margen, y, W - margen * 2, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('DETALLE DEL SERVICIO', margen + 4, y + 5.5)

  y += 12
  const filas = [
    ['Tipo de Urna', tipoUrna || '—'],
    ['Color', color || '—'],
    ['Lugar de Retiro', lugarRetiro || '—'],
    ['Lugar de Servicio', lugarServicio || '—'],
    ['Cementerio', cementerio || '—'],
  ]

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  filas.forEach(([label, val], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(margen, y - 1, W - margen * 2, 8, 'F')
    }
    doc.setTextColor(100, 116, 139)
    doc.text(label, margen + 4, y + 4.5)
    doc.setTextColor(15, 23, 42)
    doc.setFont('helvetica', 'bold')
    doc.text(val, margen + 55, y + 4.5)
    doc.setFont('helvetica', 'normal')
    y += 8
  })

  y += 6

  // ── RESUMEN DE VALORES ───────────────────────────────────────
  doc.setFillColor(15, 23, 42)
  doc.rect(margen, y, W - margen * 2, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('RESUMEN DE VALORES', margen + 4, y + 5.5)

  y += 12
  const valoresFilas = [
    ['Valor del Servicio', clp(valorServicio)],
    ['Valor Adicional', clp(valorAdicional)],
    ['Total', clp(total)],
    [`Descuento (${porcDescuento}%)`, `- ${clp(descuento)}`],
    ['Venta Neta', clp(ventaNeta)],
    ['IVA (19%)', clp(iva)],
  ]

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  valoresFilas.forEach(([label, val], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(margen, y - 1, W - margen * 2, 8, 'F')
    }
    doc.setTextColor(100, 116, 139)
    doc.text(label, margen + 4, y + 4.5)
    doc.setTextColor(15, 23, 42)
    doc.setFont('helvetica', 'bold')
    doc.text(val, W - margen - 4, y + 4.5, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += 8
  })

  // Total destacado
  doc.setFillColor(59, 130, 246)
  doc.rect(margen, y - 1, W - margen * 2, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('TOTAL A PAGAR', margen + 4, y + 7)
  doc.text(clp(ventaTotal), W - margen - 4, y + 7, { align: 'right' })

  y += 20

  // ── COMENTARIOS ──────────────────────────────────────────────
  if (comentarios) {
    doc.setFillColor(254, 252, 232)
    doc.roundedRect(margen, y, W - margen * 2, 30, 3, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(133, 77, 14)
    doc.text('COMENTARIOS', margen + 4, y + 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(78, 52, 46)
    const lines = doc.splitTextToSize(comentarios, W - margen * 2 - 8)
    doc.text(lines, margen + 4, y + 14)
    y += 36
  }

  // ── PIE DE PÁGINA ────────────────────────────────────────────
  doc.setFillColor(241, 245, 249)
  doc.rect(0, 277, W, 20, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('Este documento es una cotización y no constituye un comprobante de pago.', W / 2, 285, { align: 'center' })
  doc.text(`Generado el ${new Date().toLocaleDateString('es-CL')}`, W / 2, 291, { align: 'center' })

  doc.save(`Cotizacion_${nombreCliente?.replace(/\s+/g, '_') || 'cliente'}_${fecha}.pdf`)
}
