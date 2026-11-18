CREATE TABLE IF NOT EXISTS ordenes (
  id SERIAL PRIMARY KEY,
  cliente_nombre VARCHAR(160) NOT NULL,
  cliente_email VARCHAR(255) NOT NULL,
  estado VARCHAR(32) NOT NULL DEFAULT 'CREADA' CHECK (estado IN ('CREADA', 'PAGADA', 'ENVIADA', 'CANCELADA')),
  total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orden_items (
  id SERIAL PRIMARY KEY,
  orden_id INTEGER NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  producto_id INTEGER NOT NULL CHECK (producto_id >= 1),
  nombre_producto VARCHAR(160) NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad >= 1),
  precio_unitario NUMERIC(12, 2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ordenes_created_at_id
  ON ordenes (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_orden_items_orden_id
  ON orden_items (orden_id);
