-- ============================================================
--  FIX B2: numero_formulario sin condición de carrera
--  Reemplaza get_next_formulario con versión que usa
--  pg_advisory_xact_lock para serializar la generación
-- ============================================================
CREATE OR REPLACE FUNCTION get_next_formulario(p_cliente_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next integer;
BEGIN
  -- Lock exclusivo por cliente durante la transacción.
  -- Convierte el UUID a bigint tomando los primeros 8 bytes.
  PERFORM pg_advisory_xact_lock(
    ('x' || substr(p_cliente_id::text, 1, 8))::bit(32)::bigint
  );

  SELECT COALESCE(MAX(numero_formulario), 0) + 1
    INTO v_next
    FROM servicios
   WHERE cliente_id = p_cliente_id;

  RETURN v_next;
END;
$$;


-- ============================================================
--  FIX B10: Columna `numero` en proveedores y sucursales
--  Solo agrega la columna si todavía no existe (idempotente)
-- ============================================================

-- Proveedores
ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS numero integer;

-- Sucursales
ALTER TABLE sucursales
  ADD COLUMN IF NOT EXISTS numero integer;

-- Rellenar número correlativo para filas existentes (por cliente)
-- Proveedores
WITH numerados AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY created_at) AS rn
    FROM proveedores
   WHERE numero IS NULL
)
UPDATE proveedores p
   SET numero = n.rn
  FROM numerados n
 WHERE p.id = n.id;

-- Sucursales
WITH numerados AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY created_at) AS rn
    FROM sucursales
   WHERE numero IS NULL
)
UPDATE sucursales s
   SET numero = n.rn
  FROM numerados n
 WHERE s.id = n.id;
