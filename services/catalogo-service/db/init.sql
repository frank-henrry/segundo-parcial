CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(40) UNIQUE NOT NULL,
    nombre VARCHAR(160) NOT NULL,
    categoria VARCHAR(80) NOT NULL,
    precio NUMERIC(12, 2) NOT NULL CHECK (precio > 0),
    stock INTEGER NOT NULL CHECK (stock >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO productos (sku, nombre, categoria, precio, stock, activo)
VALUES
    ('SKU-1001', 'Teclado Mecánico RGB', 'Periféricos', 79.90, 25, TRUE),
    ('SKU-1002', 'Mouse Inalámbrico Pro', 'Periféricos', 49.90, 40, TRUE),
    ('SKU-1003', 'Monitor 27" QHD', 'Monitores', 299.00, 12, TRUE),
    ('SKU-1004', 'Audífonos Studio ANC', 'Audio', 129.50, 18, TRUE)
ON CONFLICT (sku) DO NOTHING;
