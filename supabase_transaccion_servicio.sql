-- ============================================================
-- TRANSACCIÓN ATÓMICA: Registrar servicio completo
-- Ejecuta todo en una sola transacción PostgreSQL.
-- Si cualquier INSERT/UPDATE falla, se hace rollback de todo.
-- ============================================================

CREATE OR REPLACE FUNCTION registrar_servicio_completo(
  -- Servicio
  p_cliente_id            UUID,
  p_numero_formulario     INTEGER,
  p_fecha_servicio        DATE,
  p_nombre_cliente        TEXT,
  p_telefono              TEXT,
  p_producto_id           UUID,
  p_sucursal_id           UUID,
  p_color                 TEXT,
  p_lugar_retiro          TEXT,
  p_lugar_servicio        TEXT,
  p_cementerio            TEXT,
  p_trabajador_id         UUID,
  -- Venta
  p_valor_servicio        NUMERIC,
  p_valor_adicional       NUMERIC,
  p_total                 NUMERIC,
  p_descuento             NUMERIC,
  p_venta_neta            NUMERIC,
  p_iva                   NUMERIC,
  p_venta_total           NUMERIC,
  -- Formas de pago
  p_convenio_id           UUID,
  p_valor_convenio        NUMERIC,
  p_efectivo              NUMERIC,
  p_tarjeta               NUMERIC,
  p_monto_cuotas          NUMERIC,
  p_cuotas                INTEGER,
  p_valor_cheques         NUMERIC,
  p_saldo_pendiente       NUMERIC,
  p_estado_pago           TEXT,
  p_info_adicional        TEXT,
  -- Cheques (array JSON: [{monto, numero_documento, vencimiento}])
  p_cheques               JSONB,
  -- Fallecido
  p_fallecido_nombre      TEXT,
  p_fallecido_sexo        TEXT,
  p_fallecido_edad        INTEGER,
  p_fallecido_rut         TEXT,
  p_fallecido_fecha_def   DATE,
  p_fallecido_causa       TEXT,
  p_fallecido_comuna      TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_servicio_id     UUID;
  v_inventario_id   UUID;
  v_stock_actual    INTEGER;
  v_cheque          JSONB;
BEGIN

  -- ── 1. Insertar servicio ──────────────────────────────────
  INSERT INTO servicios (
    cliente_id, numero_formulario, fecha_servicio, nombre_cliente,
    telefono, producto_id, sucursal_id, color,
    lugar_retiro, lugar_servicio, cementerio, trabajador_id
  ) VALUES (
    p_cliente_id, p_numero_formulario, p_fecha_servicio, p_nombre_cliente,
    p_telefono, p_producto_id, p_sucursal_id, p_color,
    p_lugar_retiro, p_lugar_servicio, p_cementerio, p_trabajador_id
  )
  RETURNING id INTO v_servicio_id;

  -- ── 2. Insertar venta ─────────────────────────────────────
  INSERT INTO ventas (
    cliente_id, servicio_id, numero_formulario, fecha_servicio,
    sucursal_id, producto_id,
    valor_servicio, valor_adicional, total,
    descuento, venta_neta, iva, venta_total
  ) VALUES (
    p_cliente_id, v_servicio_id, p_numero_formulario, p_fecha_servicio,
    p_sucursal_id, p_producto_id,
    p_valor_servicio, p_valor_adicional, p_total,
    p_descuento, p_venta_neta, p_iva, p_venta_total
  );

  -- ── 3. Insertar forma de pago ─────────────────────────────
  INSERT INTO formas_pago (
    cliente_id, servicio_id, numero_formulario, fecha, venta_total,
    convenio_id, valor_convenio, efectivo, tarjeta,
    monto_cuotas, cuotas, valor_cheques,
    saldo_pendiente, estado, info_adicional
  ) VALUES (
    p_cliente_id, v_servicio_id, p_numero_formulario, p_fecha_servicio, p_venta_total,
    p_convenio_id, p_valor_convenio, p_efectivo, p_tarjeta,
    p_monto_cuotas, p_cuotas, p_valor_cheques,
    p_saldo_pendiente, p_estado_pago, p_info_adicional
  );

  -- ── 4. Insertar cheques (si hay) ──────────────────────────
  IF p_cheques IS NOT NULL AND jsonb_array_length(p_cheques) > 0 THEN
    FOR v_cheque IN SELECT value FROM jsonb_array_elements(p_cheques) LOOP
      IF (v_cheque->>'monto')::NUMERIC > 0 THEN
        INSERT INTO cheques (
          cliente_id, servicio_id, numero_formulario,
          monto, numero_documento, vencimiento, estado
        ) VALUES (
          p_cliente_id, v_servicio_id, p_numero_formulario,
          (v_cheque->>'monto')::NUMERIC,
          NULLIF(v_cheque->>'numero_documento', ''),
          NULLIF(v_cheque->>'vencimiento', '')::DATE,
          'vigente'
        );
      END IF;
    END LOOP;
  END IF;

  -- ── 5. Insertar fallecido (si tiene nombre) ───────────────
  IF p_fallecido_nombre IS NOT NULL AND p_fallecido_nombre <> '' THEN
    INSERT INTO fallecidos (
      cliente_id, servicio_id, numero_formulario, fecha_servicio,
      nombre, sexo, edad, rut,
      fecha_defuncion, causa_muerte, comuna
    ) VALUES (
      p_cliente_id, v_servicio_id, p_numero_formulario, p_fecha_servicio,
      p_fallecido_nombre,
      NULLIF(p_fallecido_sexo, ''),
      p_fallecido_edad,
      NULLIF(p_fallecido_rut, ''),
      p_fallecido_fecha_def,
      NULLIF(p_fallecido_causa, ''),
      NULLIF(p_fallecido_comuna, '')
    );
  END IF;

  -- ── 6. Descontar stock + registrar movimiento ─────────────
  -- FOR UPDATE bloquea la fila para evitar condición de carrera
  -- cuando dos servicios se registran simultáneamente con la misma urna.
  IF p_producto_id IS NOT NULL THEN
    SELECT id, stock_actual
    INTO v_inventario_id, v_stock_actual
    FROM inventario
    WHERE cliente_id = p_cliente_id
      AND producto_id = p_producto_id
      AND (
        (p_sucursal_id IS NULL AND sucursal_id IS NULL)
        OR sucursal_id = p_sucursal_id
      )
    LIMIT 1
    FOR UPDATE;

    IF v_inventario_id IS NOT NULL THEN
      IF v_stock_actual <= 0 THEN
        RAISE EXCEPTION 'Sin stock disponible para el producto seleccionado';
      END IF;

      UPDATE inventario
      SET stock_actual = v_stock_actual - 1
      WHERE id = v_inventario_id;

      INSERT INTO movimientos_inventario (
        cliente_id, producto_id, tipo, cantidad,
        motivo, referencia_id, fecha
      ) VALUES (
        p_cliente_id, p_producto_id, 'salida', 1,
        'Servicio N° ' || p_numero_formulario,
        v_servicio_id, p_fecha_servicio
      );
    END IF;
  END IF;

  -- Retorna el ID del servicio creado
  RETURN v_servicio_id;

EXCEPTION
  WHEN OTHERS THEN
    -- PostgreSQL hace rollback automático al relanzar la excepción
    RAISE;
END;
$$;
