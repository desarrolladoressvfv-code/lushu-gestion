const clpStr = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n ?? 0)

// ─── System Prompt Builder ──────────────────────────────────────────────────
export function buildSystemPrompt(nombreEmpresa, contexto) {
  const base = contexto.base || {}
  const hora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' })).getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  let prompt = `Eres Lushu's, el asistente inteligente de negocio de ${nombreEmpresa}. Tu rol es ayudar al equipo a tomar mejores decisiones basándote en los datos reales del sistema.

PERSONALIDAD:
- Profesional pero cercano y directo
- Siempre en español
- Usas formato claro con viñetas y emojis para destacar puntos importantes
- Cuando hay alertas urgentes, las destacas con ⚠️ o 🔴
- Si los datos no alcanzan para responder con precisión, lo dices honestamente
- Puedes hacer análisis predictivos y sugerencias de gestión basadas en patrones

SALUDO APROPIADO PARA ESTA HORA: "${saludo}"

=== DATOS EN TIEMPO REAL DEL SISTEMA ===
Fecha actual: ${base.fecha_hoy || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })}
`

  // Ventas del mes
  if (base.ventas_este_mes) {
    const v = base.ventas_este_mes
    prompt += `
📊 VENTAS ESTE MES:
- Total recaudado: ${clpStr(v.total_clp)}
- Servicios registrados: ${v.cantidad_servicios}
- Ticket promedio: ${clpStr(v.promedio_ticket)}
`
    if (v.variacion_vs_anterior_pct !== null) {
      const signo = parseFloat(v.variacion_vs_anterior_pct) >= 0 ? '+' : ''
      const emoji = parseFloat(v.variacion_vs_anterior_pct) >= 0 ? '📈' : '📉'
      prompt += `- Variación vs mes anterior: ${emoji} ${signo}${v.variacion_vs_anterior_pct}%\n`
    }
  }

  // Servicios semana
  if (base.servicios_esta_semana) {
    prompt += `\n📋 SERVICIOS ESTA SEMANA: ${base.servicios_esta_semana.cantidad} servicio(s)\n`
  }

  // Cheques por vencer
  if (base.cheques_por_vencer_7dias?.length > 0) {
    prompt += `\n⚠️ CHEQUES POR VENCER EN 7 DÍAS (${base.cheques_por_vencer_7dias.length} cheque(s)):\n`
    base.cheques_por_vencer_7dias.forEach(c => {
      const urgencia = c.dias_restantes <= 2 ? '🔴' : '🟡'
      prompt += `  ${urgencia} Formulario #${c.formulario}: ${clpStr(c.monto)} → vence en ${c.dias_restantes} día(s) (${c.vencimiento})\n`
    })
  } else {
    prompt += `\n✅ Sin cheques por vencer esta semana\n`
  }

  // Stock crítico
  if (base.stock_critico?.length > 0) {
    prompt += `\n🔴 STOCK CRÍTICO (${base.stock_critico.length} producto(s)):\n`
    base.stock_critico.forEach(s => {
      const emoji = s.sin_stock ? '⛔' : '⚠️'
      prompt += `  ${emoji} ${s.producto} (${s.sucursal}): ${s.stock_actual} unidades [mínimo: ${s.stock_minimo}]${s.sin_stock ? ' ← SIN STOCK' : ''}\n`
    })
  } else {
    prompt += `\n✅ Stock de todos los productos en niveles normales\n`
  }

  // Cobros pendientes
  if (base.cobros_pendientes?.total_clp > 0) {
    prompt += `\n💰 COBROS PENDIENTES: ${clpStr(base.cobros_pendientes.total_clp)} en ${base.cobros_pendientes.cantidad} formulario(s)\n`
  }

  // Módulos adicionales
  if (contexto.servicios?.length > 0) {
    prompt += `\n📌 ÚLTIMOS SERVICIOS (${contexto.servicios.length} registros):\n`
    contexto.servicios.slice(0, 12).forEach(s => {
      prompt += `  - #${s.numero_formulario} | ${s.fecha_servicio} | ${s.nombre_cliente} | ${s.productos?.nombre || 'Sin urna'} | ${s.sucursales?.nombre || 'Sin sucursal'}\n`
    })
  }

  if (contexto.ventas) {
    const v = contexto.ventas
    prompt += `\n📈 ANÁLISIS VENTAS ÚLTIMOS 60 DÍAS:\n`
    prompt += `- Total: ${v.ultimos_60_dias_total} servicios por ${clpStr(v.ultimos_60_dias_monto)}\n`
    if (v.ranking_productos?.length > 0) {
      prompt += `- TOP productos más vendidos:\n`
      v.ranking_productos.forEach((p, i) => {
        prompt += `  ${i + 1}. ${p.nombre}: ${p.cantidad} vez(es) — ${clpStr(p.total_clp)}\n`
      })
    }
    if (v.ventas_por_semana?.length > 0) {
      prompt += `- Tendencia semanal (últimas ${v.ventas_por_semana.length} semanas):\n`
      v.ventas_por_semana.forEach(s => {
        prompt += `  Semana ${s.semana}: ${s.cantidad} servicios — ${clpStr(s.total_clp)}\n`
      })
    }
  }

  if (contexto.cheques?.length > 0) {
    const vigentes = contexto.cheques.filter(c => c.estado === 'vigente')
    const vencidos = contexto.cheques.filter(c => c.estado === 'vencido')
    const cobrados = contexto.cheques.filter(c => c.estado === 'cobrado')
    prompt += `\n🗒️ RESUMEN CHEQUES:\n`
    prompt += `- Vigentes: ${vigentes.length} cheques por ${clpStr(vigentes.reduce((s, c) => s + c.monto, 0))}\n`
    prompt += `- Vencidos: ${vencidos.length} cheques por ${clpStr(vencidos.reduce((s, c) => s + c.monto, 0))}\n`
    prompt += `- Cobrados: ${cobrados.length} cheques\n`
    prompt += `Detalle:\n`
    contexto.cheques.slice(0, 15).forEach(c => {
      const diasStr = c.dias_restantes !== null ? `${c.dias_restantes > 0 ? c.dias_restantes + 'd restantes' : c.dias_restantes < 0 ? `vencido hace ${Math.abs(c.dias_restantes)}d` : 'vence hoy'}` : 'sin fecha'
      prompt += `  - #${c.formulario}: ${clpStr(c.monto)} | ${c.estado} | ${diasStr}\n`
    })
  }

  if (contexto.inventario?.length > 0) {
    prompt += `\n📦 INVENTARIO COMPLETO:\n`
    contexto.inventario.forEach(r => {
      const emoji = r.estado === 'SIN_STOCK' ? '⛔' : r.estado === 'CRITICO' ? '⚠️' : '✅'
      prompt += `  ${emoji} ${r.producto} (${r.sucursal}): ${r.stock_actual} uds [mín: ${r.stock_minimo}]\n`
    })
  }

  if (contexto.compras?.length > 0) {
    prompt += `\n🛒 ÓRDENES DE COMPRA RECIENTES:\n`
    contexto.compras.forEach(o => {
      prompt += `  - ${o.proveedores?.nombre || 'Sin proveedor'} | ${o.fecha} | ${clpStr(o.total)} | Estado: ${o.estado}\n`
    })
  }

  if (contexto.fallecidos?.length > 0) {
    prompt += `\n📂 ÚLTIMOS FALLECIDOS REGISTRADOS:\n`
    contexto.fallecidos.forEach(f => {
      prompt += `  - #${f.numero_formulario} | ${f.nombre} | ${f.edad ? f.edad + ' años' : 's/edad'} | ${f.fecha_servicio} | ${f.comuna || 's/comuna'}\n`
    })
  }

  if (contexto.sucursales?.length > 0) {
    prompt += `\n🏢 VENTAS POR SUCURSAL (este mes):\n`
    contexto.sucursales.forEach((s, i) => {
      prompt += `  ${i + 1}. ${s.sucursal}: ${s.servicios} servicio(s) — ${clpStr(s.total_mes_clp)}\n`
    })
  }

  if (contexto.pagos?.length > 0) {
    prompt += `\n💳 PAGOS PENDIENTES DETALLE (${contexto.pagos.length} formularios):\n`
    contexto.pagos.slice(0, 10).forEach(p => {
      prompt += `  - #${p.numero_formulario}: debe ${clpStr(p.saldo_pendiente)} de ${clpStr(p.venta_total)} | Fecha: ${p.fecha}\n`
    })
  }

  prompt += `\n=== FIN DE DATOS ===\n\nResponde siempre en español. Sé conciso y útil. Usa formato con viñetas y emojis. Si detectas patrones o puedes predecir algo útil, compártelo. Si la pregunta requiere datos que no tienes disponibles, dilo claramente y sugiere qué módulo revisar en la aplicación.`

  return prompt
}

// ─── Llamada a la Edge Function proxy (API key queda en el servidor) ────────
export async function llamarClaude(systemPrompt, historial) {
  // Obtener el JWT del usuario autenticado
  const { supabase } = await import('./supabase.js')
  const { data: { session } } = await supabase.auth.getSession()

  const edgeFnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`

  const response = await fetch(edgeFnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? ''}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      system: systemPrompt,
      messages: historial,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error || `Error HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.text || 'No obtuve respuesta. Intenta de nuevo.'
}
