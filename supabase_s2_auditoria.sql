-- ============================================================
--  S2: Tabla de log de auditoría
--  Ejecutar en: Supabase → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS auditoria (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id  uuid        NOT NULL,
  usuario_id  uuid,                        -- auth.uid() del que realizó la acción
  nombre_usuario text,                     -- nombre legible
  accion      text        NOT NULL,        -- 'crear' | 'editar' | 'eliminar' | 'login'
  modulo      text        NOT NULL,        -- 'inventario' | 'servicios' | 'configuracion' etc.
  descripcion text,                        -- detalle legible
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_cliente
  ON auditoria (cliente_id, created_at DESC);

ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auditoria_cliente" ON auditoria
  FOR ALL
  USING (
    cliente_id = (
      SELECT cliente_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

-- Función RPC para insertar log (SECURITY DEFINER para que siempre funcione)
CREATE OR REPLACE FUNCTION registrar_auditoria(
  p_accion      text,
  p_modulo      text,
  p_descripcion text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cliente_id  uuid;
  v_nombre      text;
BEGIN
  SELECT cliente_id, nombre
    INTO v_cliente_id, v_nombre
    FROM usuarios
   WHERE auth_user_id = auth.uid()
   LIMIT 1;

  IF v_cliente_id IS NULL THEN RETURN; END IF;

  INSERT INTO auditoria (cliente_id, usuario_id, nombre_usuario, accion, modulo, descripcion)
  VALUES (v_cliente_id, auth.uid(), v_nombre, p_accion, p_modulo, p_descripcion);
END;
$$;
