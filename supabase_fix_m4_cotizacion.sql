-- ============================================================
--  M4: Número correlativo para cotizaciones
--  Crea la tabla y la función RPC de secuencia atómica.
--  Ejecutar en: Supabase → SQL Editor
-- ============================================================

-- Tabla liviana: solo guarda el número para la secuencia
CREATE TABLE IF NOT EXISTS cotizaciones (
  id                 uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id         uuid    NOT NULL,
  numero_cotizacion  integer NOT NULL,
  fecha              date    NOT NULL DEFAULT CURRENT_DATE,
  created_at         timestamptz DEFAULT now(),
  CONSTRAINT fk_cotizacion_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
);

-- Índice para la búsqueda del MAX rápida
CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente
  ON cotizaciones (cliente_id, numero_cotizacion DESC);

-- RPC atómica con advisory lock (igual que get_next_formulario)
CREATE OR REPLACE FUNCTION get_next_cotizacion(p_cliente_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next integer;
BEGIN
  -- Lock exclusivo por cliente (distinto al de formularios → +2 en el hash)
  PERFORM pg_advisory_xact_lock(
    ('x' || substr(p_cliente_id::text, 1, 8))::bit(32)::bigint + 2
  );

  SELECT COALESCE(MAX(numero_cotizacion), 0) + 1
    INTO v_next
    FROM cotizaciones
   WHERE cliente_id = p_cliente_id;

  -- Registrar la cotización para mantener la secuencia
  INSERT INTO cotizaciones (cliente_id, numero_cotizacion)
  VALUES (p_cliente_id, v_next);

  RETURN v_next;
END;
$$;

-- RLS: cada cliente solo ve sus propias cotizaciones
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cotizaciones_cliente" ON cotizaciones
  FOR ALL
  USING (
    cliente_id = (
      SELECT cliente_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );
