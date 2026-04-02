-- ============================================================
-- SCHEMA COMPLETO - SISTEMA FUNERARIA
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- 1. CLIENTES / LICENCIAS
CREATE TABLE clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT,
  fecha_vencimiento DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUCTOS (urnas)
CREATE TABLE productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  numero INTEGER,
  nombre TEXT NOT NULL,
  precio BIGINT NOT NULL DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CONVENIOS (seguros / INP / AFP)
CREATE TABLE convenios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  numero INTEGER,
  nombre TEXT NOT NULL,
  valor BIGINT NOT NULL DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE
);

-- 4. TRABAJADORES / INSTALADORES
CREATE TABLE trabajadores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  numero INTEGER,
  nombre TEXT NOT NULL,
  activo BOOLEAN DEFAULT TRUE
);

-- 5. PROVEEDORES
CREATE TABLE proveedores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  contacto TEXT,
  telefono TEXT,
  email TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SERVICIOS (registro principal por formulario)
CREATE TABLE servicios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  numero_formulario INTEGER NOT NULL,
  fecha_servicio DATE,
  nombre_cliente TEXT,
  telefono TEXT,
  producto_id UUID REFERENCES productos(id),
  color TEXT,
  lugar_retiro TEXT,
  lugar_servicio TEXT,
  cementerio TEXT,
  trabajador_id UUID REFERENCES trabajadores(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. VENTAS
CREATE TABLE ventas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  servicio_id UUID REFERENCES servicios(id) ON DELETE CASCADE,
  numero_formulario INTEGER,
  fecha_servicio DATE,
  producto_id UUID REFERENCES productos(id),
  valor_servicio BIGINT DEFAULT 0,
  valor_adicional BIGINT DEFAULT 0,
  total BIGINT DEFAULT 0,
  descuento BIGINT DEFAULT 0,
  venta_neta BIGINT DEFAULT 0,
  iva BIGINT DEFAULT 0,
  venta_total BIGINT DEFAULT 0
);

-- 8. FORMAS DE PAGO
CREATE TABLE formas_pago (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  servicio_id UUID REFERENCES servicios(id) ON DELETE CASCADE,
  numero_formulario INTEGER,
  fecha DATE,
  venta_total BIGINT DEFAULT 0,
  convenio_id UUID REFERENCES convenios(id),
  valor_convenio BIGINT DEFAULT 0,
  efectivo BIGINT DEFAULT 0,
  tarjeta BIGINT DEFAULT 0,
  monto_cuotas BIGINT DEFAULT 0,
  cuotas INTEGER DEFAULT 0,
  valor_cheques BIGINT DEFAULT 0,
  saldo_pendiente BIGINT DEFAULT 0,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pagado', 'pendiente')),
  info_adicional TEXT
);

-- 9. CHEQUES
CREATE TABLE cheques (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  servicio_id UUID REFERENCES servicios(id) ON DELETE CASCADE,
  numero_formulario INTEGER,
  monto BIGINT DEFAULT 0,
  numero_documento TEXT,
  vencimiento DATE,
  estado TEXT DEFAULT 'vigente' CHECK (estado IN ('vigente', 'vencido', 'cobrado'))
);

-- 10. FALLECIDOS
CREATE TABLE fallecidos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  servicio_id UUID REFERENCES servicios(id) ON DELETE CASCADE,
  numero_formulario INTEGER,
  fecha_servicio DATE,
  nombre TEXT,
  sexo TEXT CHECK (sexo IN ('Masculino', 'Femenino')),
  edad INTEGER,
  rut TEXT,
  fecha_defuncion DATE,
  causa_muerte TEXT,
  comuna TEXT
);

-- 11. INVENTARIO (stock por producto)
CREATE TABLE inventario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  stock_actual INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 3,
  UNIQUE(cliente_id, producto_id)
);

-- 12. MOVIMIENTOS DE INVENTARIO
CREATE TABLE movimientos_inventario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  cantidad INTEGER NOT NULL,
  motivo TEXT,
  referencia_id UUID,
  fecha DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. ÓRDENES DE COMPRA
CREATE TABLE ordenes_compra (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  proveedor_id UUID REFERENCES proveedores(id),
  fecha DATE DEFAULT CURRENT_DATE,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'recibida', 'cancelada')),
  total BIGINT DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. ITEMS DE ÓRDENES DE COMPRA
CREATE TABLE items_orden_compra (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orden_compra_id UUID NOT NULL REFERENCES ordenes_compra(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario BIGINT DEFAULT 0,
  subtotal BIGINT DEFAULT 0
);

-- ============================================================
-- DATOS INICIALES para un cliente de ejemplo
-- Reemplazar el UUID por el que Supabase genere al insertar
-- ============================================================

-- Insertar cliente de prueba
INSERT INTO clientes (id, nombre, email, fecha_vencimiento, estado)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'Funeraria San Martín',
  'admin@funeraria.cl',
  '2027-12-31',
  'activo'
);

-- Productos / Urnas
INSERT INTO productos (cliente_id, numero, nombre, precio) VALUES
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 1, 'PLANA BASICA', 550000),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 2, 'REBALSADA BASICA', 600000),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 3, 'MACKEL PINO', 800000),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 4, 'MACKEL PINO LUZ', 1000000),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 5, 'AMERICANA', 1200000),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 6, 'AMERICANA CUERPO ENTERO', 1400000),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 7, 'RAULI', 1600000),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 8, 'CASTAÑO', 1800000),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 9, 'ARAUCARIA', 2000000);

-- Convenios
INSERT INTO convenios (cliente_id, numero, nombre, valor) VALUES
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 1, 'INP', 300000),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 2, 'DIPRECA', 350000),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 3, 'AFP', 380000),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 4, 'SEGURO DE VIDA', 400000),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 5, 'NINGUNO', 0);

-- Trabajadores
INSERT INTO trabajadores (cliente_id, numero, nombre) VALUES
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 1, 'ANDRES PEREZ'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 2, 'FIDEL LOPEZ'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 3, 'NICOLAS PALACIOS'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 4, 'MATIAS PIZARRO'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 5, 'ROBERTO DIAZ'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 6, 'DIEGO ROJAS'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 7, 'SEBASTIAN VARGAS');
