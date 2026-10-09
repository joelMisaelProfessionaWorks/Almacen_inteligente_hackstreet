-- 1. Catálogo de Productos / Piezas del Taller
CREATE TABLE items (
    id SERIAL PRIMARY KEY, -- 'part_id' en el contrato
    sku VARCHAR(50),       -- El contrato dice que puede ser null
    name VARCHAR(255) NOT NULL,
    description TEXT,
    min_stock_level INT DEFAULT 3, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ubicaciones Físicas (Ej. Recepción U-100, Estante U-101)
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_workbench BOOLEAN DEFAULT FALSE
);

-- 3. Proveedores (Para el Smart Procurement AI)
CREATE TABLE providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    reliability_score INT DEFAULT 100 -- Para que la IA evalúe a quién comprarle
);

-- 4. Catálogo de Proveedores vs Piezas (Precios y Tiempos de Entrega)
CREATE TABLE item_providers (
    item_id INT REFERENCES items(id),
    provider_id INT REFERENCES providers(id),
    unit_price DECIMAL(10,2) NOT NULL,
    lead_time_days INT NOT NULL, -- Tiempo de entrega esperado
    PRIMARY KEY (item_id, provider_id)
);

-- 5. Lotes y Stock por Ubicación (FIFO)
CREATE TABLE lots (
    id SERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES items(id),
    location_id INT NOT NULL REFERENCES locations(id),
    lot_code VARCHAR(100) UNIQUE NOT NULL,
    physical_quantity INT NOT NULL DEFAULT 0,  -- 'on_hand'
    reserved_quantity INT NOT NULL DEFAULT 0,  -- 'reserved'
    entry_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_quantities CHECK (
        physical_quantity >= 0 AND 
        reserved_quantity >= 0 AND 
        reserved_quantity <= physical_quantity
    )
);

-- 6. Órdenes de Trabajo y Necesidades (Reservas ligadas al BOM)
CREATE TABLE work_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL, -- 'work_order_code'
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Faltantes (Shortages)
CREATE TABLE shortages (
    id SERIAL PRIMARY KEY,
    work_order_id INT REFERENCES work_orders(id),
    item_id INT REFERENCES items(id),
    inspection_item_id INT NOT NULL,
    missing_quantity INT NOT NULL,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP -- Null significa que sigue siendo un faltante
);

-- 8. Tabla de Movimientos Inmutable (Audit Trail)
CREATE TABLE inventory_movements (
    id SERIAL PRIMARY KEY,
    event_id UUID UNIQUE, -- IDEMPOTENCIA: ID único del evento de Kafka
    item_id INT NOT NULL REFERENCES items(id),
    location_id INT NOT NULL REFERENCES locations(id),
    work_order_id INT REFERENCES work_orders(id), 
    movement_type VARCHAR(50) NOT NULL, -- 'receipt', 'issue', 'transfer', 'adjustment'
    quantity INT NOT NULL, -- Negativo cuando sale
    notes TEXT, 
    occurred_at TIMESTAMP NOT NULL, -- Hora real del suceso en el piso (del evento)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices recomendados para la evaluación de Kafka y FIFO
CREATE INDEX idx_lots_fifo ON lots(item_id, entry_date);
CREATE INDEX idx_movements_event ON inventory_movements(event_id);
