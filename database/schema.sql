-- 1. Catálogo de Productos / Piezas del Taller
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    min_stock_level INT DEFAULT 3, -- Nivel mínimo para disparar alertas ElevenLabs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Lotes (Para garantizar el principio FIFO)
CREATE TABLE lots (
    id SERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES items(id),
    lot_code VARCHAR(100) UNIQUE NOT NULL,
    physical_quantity INT NOT NULL DEFAULT 0,  -- El stock que realmente está en bodega
    reserved_quantity INT NOT NULL DEFAULT 0,  -- El stock apartado para reparaciones en curso
    entry_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Clave para sacar siempre el más viejo primero (FIFO)
    
    -- Restricción de base de datos: Nunca puedes reservar más de lo que hay físicamente
    CONSTRAINT check_quantities CHECK (
        physical_quantity >= 0 AND 
        reserved_quantity >= 0 AND 
        reserved_quantity <= physical_quantity
    )
);

-- 3. Órdenes de Trabajo (Justificación de salidas y reservas)
CREATE TABLE work_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, COMPLETED, CANCELLED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Movimientos (Audit Trail / Serie de Tiempo Inmutable)
CREATE TABLE inventory_movements (
    id SERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES items(id),
    lot_id INT NOT NULL REFERENCES lots(id),
    work_order_id INT REFERENCES work_orders(id), 
    movement_type VARCHAR(50) NOT NULL, -- Valores permitidos: 'ENTRY', 'EXIT', 'RESERVE', 'UNRESERVE'
    quantity INT NOT NULL,
    notes TEXT, -- Ej. "Ingreso escáner RFID", "Reserva vía ERP"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices recomendados para consultas de agregación y FIFO
CREATE INDEX idx_lots_fifo ON lots(item_id, entry_date);
CREATE INDEX idx_movements_audit ON inventory_movements(item_id, created_at);
