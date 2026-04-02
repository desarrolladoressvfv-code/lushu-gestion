-- ============================================================
-- ACTUALIZACIÓN 2 — Nombre y logo de empresa por cliente
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nombre_empresa TEXT DEFAULT 'Funeraria';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Actualiza el cliente de ejemplo con un nombre real
-- UPDATE clientes SET nombre_empresa = 'Funeraria San Martín' WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
