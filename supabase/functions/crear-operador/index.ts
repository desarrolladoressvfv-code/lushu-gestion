import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Cliente con service_role para crear usuarios en auth
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Cliente con JWT del usuario que llama (para verificar que es admin)
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Verificar que el que llama es admin
    const { data: { user: caller } } = await supabaseUser.auth.getUser()
    if (!caller) throw new Error('No autenticado')

    const { data: callerPerfil } = await supabaseAdmin
      .from('usuarios')
      .select('rol, cliente_id, nombre')
      .eq('auth_user_id', caller.id)
      .single()

    if (!callerPerfil || !['admin', 'superadmin'].includes(callerPerfil.rol)) {
      throw new Error('Solo el admin puede crear operadores')
    }

    // Verificar límite de usuarios por plan
    const { data: clienteData } = await supabaseAdmin
      .from('clientes')
      .select('plan, max_sucursales')
      .eq('id', callerPerfil.cliente_id)
      .single()

    const { count: totalUsuarios } = await supabaseAdmin
      .from('usuarios')
      .select('id', { count: 'exact' })
      .eq('cliente_id', callerPerfil.cliente_id)
      .eq('activo', true)

    const limites: Record<string, number> = { basico: 2, profesional: 5, enterprise: 9999 }
    const limite = limites[clienteData?.plan || 'basico'] || 2
    if ((totalUsuarios || 0) >= limite) {
      throw new Error(`Límite de ${limite} usuarios alcanzado para el plan ${clienteData?.plan || 'básico'}`)
    }

    // Obtener datos del nuevo operador
    const { nombre, email, password, acceso_tipo, sucursal_id, modulos_permitidos } = await req.json()

    if (!nombre || !email || !password) throw new Error('Faltan campos obligatorios')
    if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres')

    // Crear usuario en Supabase Auth
    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // confirmar email automáticamente
    })

    if (authError) throw new Error(authError.message)

    // Insertar en tabla usuarios
    const { error: insertError } = await supabaseAdmin.from('usuarios').insert({
      auth_user_id:       newUser.user.id,
      cliente_id:         callerPerfil.cliente_id,
      nombre,
      email,
      rol:                'operador',
      activo:             true,
      acceso_tipo:        acceso_tipo || 'general',
      sucursal_id:        acceso_tipo === 'sucursal' ? sucursal_id : null,
      modulos_permitidos: modulos_permitidos || [],
      debe_cambiar_pass:  false,
    })

    if (insertError) {
      // Rollback: eliminar usuario auth si falla el insert
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      throw new Error(insertError.message)
    }

    // Registrar en auditoría
    await supabaseAdmin.from('auditoria').insert({
      cliente_id:    callerPerfil.cliente_id,
      nombre_usuario: callerPerfil.nombre,
      rol:           callerPerfil.rol,
      accion:        'crear',
      modulo:        'usuarios',
      descripcion:   `Operador creado: ${nombre} (${email})`,
      fecha:         new Date().toISOString(),
    })

    return new Response(JSON.stringify({ ok: true, email }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
