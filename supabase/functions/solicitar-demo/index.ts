const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { nombre, funeraria, telefono, email, sucursales, comentario } = await req.json()

    if (!nombre || !funeraria || !telefono) {
      return new Response(JSON.stringify({ ok: false, error: 'Faltan campos obligatorios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:12px">
        <div style="background:#0f172a;border-radius:8px;padding:20px 24px;margin-bottom:24px">
          <h1 style="color:#ffffff;margin:0;font-size:20px">📋 Nueva solicitud de demo</h1>
          <p style="color:#94a3b8;margin:6px 0 0;font-size:14px">Recibida desde bikloud.com</p>
        </div>
        <div style="background:#ffffff;border-radius:8px;padding:24px;border:1px solid #e2e8f0">
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;width:130px">Nombre</td>
                <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:14px;font-weight:600">${nombre}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">Funeraria</td>
                <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:14px;font-weight:600">${funeraria}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">Teléfono</td>
                <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:14px">${telefono}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">Email</td>
                <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:14px">${email || '(no indicado)'}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">Sucursales</td>
                <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:14px">${sucursales || '(no indicado)'}</td></tr>
            <tr><td style="padding:10px 0;color:#64748b;font-size:13px;vertical-align:top">Comentario</td>
                <td style="padding:10px 0;color:#0f172a;font-size:14px">${comentario || '(sin comentarios)'}</td></tr>
          </table>
        </div>
        <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:20px">BiKloud · Gestión Inteligente en la Nube</p>
      </div>
    `

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'BiKloud Demo <onboarding@resend.dev>',
        to:      ['admin@bikloud.com'],
        subject: `Nueva solicitud de demo — ${funeraria}`,
        html,
      }),
    })

    if (!resendRes.ok) {
      const err = await resendRes.json()
      throw new Error(err?.message || 'Error al enviar email')
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
