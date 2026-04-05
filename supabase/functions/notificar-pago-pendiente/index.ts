import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // Verificar JWT del usuario
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: cors })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { numero_formulario, saldo_pendiente, nombre_cliente, email_admin } = await req.json()

    // Usar Resend para enviar el email (configurar RESEND_API_KEY en secrets)
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY no configurada' }), { status: 500, headers: cors })
    }

    const clp = (v: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(v ?? 0)

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BiKloud <notificaciones@bikloud.cl>',
        to: [email_admin],
        subject: `⚠ Pago pendiente — Formulario #${numero_formulario}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <div style="background: #0f172a; padding: 24px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; font-size: 20px; margin: 0;">BiKloud</h1>
              <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0;">Sistema de Gestión Funeraria</p>
            </div>
            <div style="background: #fff8f0; border: 1px solid #fed7aa; padding: 20px;">
              <h2 style="color: #9a3412; font-size: 16px; margin: 0 0 12px;">⚠ Pago marcado como pendiente</h2>
              <p style="color: #374151; font-size: 14px; margin: 0 0 8px;">
                El formulario <strong>#${numero_formulario}</strong> del cliente
                <strong>${nombre_cliente}</strong> tiene un saldo pendiente de:
              </p>
              <p style="font-size: 28px; font-weight: bold; color: #dc2626; margin: 12px 0;">${clp(saldo_pendiente)}</p>
            </div>
            <div style="background: #f8fafc; padding: 16px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
                Este mensaje fue generado automáticamente por BiKloud.
              </p>
            </div>
          </div>
        `,
      }),
    })

    if (!emailRes.ok) {
      const err = await emailRes.text()
      return new Response(JSON.stringify({ error: err }), { status: 500, headers: cors })
    }

    return new Response(JSON.stringify({ ok: true }), { headers: cors })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors })
  }
})
