-- ============================================================
-- ACTUALIZACIONES - Ejecutar en Supabase > SQL Editor
-- DESPUÉS de haber ejecutado supabase_schema.sql
-- ============================================================

-- 1. TABLA SUCURSALES
CREATE TABLE IF NOT EXISTS sucursales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  direccion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AGREGAR sucursal_id A TABLAS EXISTENTES
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id);
ALTER TABLE formas_pago ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id);

-- Para inventario: permitir stock por sucursal
-- Primero eliminamos la restricción única anterior
ALTER TABLE inventario DROP CONSTRAINT IF EXISTS inventario_cliente_id_producto_id_key;
ALTER TABLE inventario ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id);
-- Nueva restricción única considerando sucursal (sucursal puede ser NULL para stock general)
CREATE UNIQUE INDEX IF NOT EXISTS inventario_unique
  ON inventario(cliente_id, producto_id, COALESCE(sucursal_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 3. CONTADOR AUTONUMÉRICO POR CLIENTE PARA N° FORMULARIO
CREATE TABLE IF NOT EXISTS contadores_formulario (
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  ultimo_numero INTEGER DEFAULT 0,
  PRIMARY KEY (cliente_id)
);

-- 4. FUNCIÓN PARA OBTENER EL PRÓXIMO N° DE FORMULARIO
CREATE OR REPLACE FUNCTION get_next_formulario(p_cliente_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  INSERT INTO contadores_formulario (cliente_id, ultimo_numero)
  VALUES (p_cliente_id, 1)
  ON CONFLICT (cliente_id) DO UPDATE
    SET ultimo_numero = contadores_formulario.ultimo_numero + 1
  RETURNING ultimo_numero INTO next_num;
  RETURN next_num;
END;
$$;

-- 5. AGREGAR campo nombre_servicio a cotizaciones (solo para referencia futura si se guardan)
-- Por ahora se maneja en el frontend

-- 6. SUCURSAL INICIAL DE EJEMPLO (reemplazar UUID con el de tu cliente)
-- INSERT INTO sucursales (cliente_id, nombre, direccion)
-- VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Casa Central', 'Dirección principal');
