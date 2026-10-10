-- Almacén Inteligente Hackstreet
-- Tiger Data (PostgreSQL) Schema

-- Tablas de catálogo y entidades base
CREATE TABLE parts (
    part_id INT PRIMARY KEY,
    sku VARCHAR(255),
    sku_norm VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_of_measure VARCHAR(50)
);

CREATE TABLE locations (
    location_id INT PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE work_orders (
    work_order_id INT PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE TABLE bom_lines (
    bom_line_id INT PRIMARY KEY,
    work_order_id INT NOT NULL REFERENCES work_orders(work_order_id),
    part_id INT REFERENCES parts(part_id),
    qty_per_unit NUMERIC,
    group_name VARCHAR(255)
);

CREATE TABLE inspections (
    inspection_id INT PRIMARY KEY,
    work_order_id INT NOT NULL REFERENCES work_orders(work_order_id),
    voided_at TIMESTAMP WITH TIME ZONE NULL
);

-- Libro Mayor
CREATE TABLE balances (
    part_id INT NOT NULL REFERENCES parts(part_id),
    location_id INT NOT NULL REFERENCES locations(location_id),
    on_hand NUMERIC NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
    reserved NUMERIC NOT NULL DEFAULT 0 CHECK (reserved >= 0),
    PRIMARY KEY (part_id, location_id),
    CONSTRAINT positive_available CHECK (on_hand >= reserved)
);

CREATE TABLE movements (
    movement_id BIGSERIAL PRIMARY KEY,
    part_id INT NOT NULL REFERENCES parts(part_id),
    location_id INT NOT NULL REFERENCES locations(location_id),
    quantity NUMERIC NOT NULL,
    type VARCHAR(50) NOT NULL, -- receipt, issue, transfer_out, transfer_in, adjustment, count
    reference_id VARCHAR(255), -- ID de evento o código que generó el movimiento
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reservas, necesidades y faltantes
CREATE TABLE needs (
    work_order_id INT NOT NULL REFERENCES work_orders(work_order_id),
    bom_line_id INT NOT NULL, -- No fk a bom_lines porque puede llegar antes
    inspection_id INT NOT NULL REFERENCES inspections(inspection_id),
    required_quantity NUMERIC NOT NULL,
    PRIMARY KEY (work_order_id, bom_line_id)
);

CREATE TABLE reservations (
    reservation_id BIGSERIAL PRIMARY KEY,
    work_order_id INT NOT NULL REFERENCES work_orders(work_order_id),
    bom_line_id INT NOT NULL,
    reserved_quantity NUMERIC NOT NULL DEFAULT 0,
    fulfilled_quantity NUMERIC NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, released, fulfilled
    UNIQUE (work_order_id, bom_line_id)
);

CREATE TABLE shortages (
    id BIGSERIAL PRIMARY KEY,
    part_id INT REFERENCES parts(part_id), -- Puede ser NULL
    work_order_id INT REFERENCES work_orders(work_order_id),
    missing_quantity NUMERIC, -- Puede ser NULL
    status VARCHAR(50) NOT NULL DEFAULT 'open', -- open, resolved, closed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gestión de Eventos y Patrones
CREATE TABLE processed_events (
    event_id VARCHAR(255) PRIMARY KEY,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE pending_events (
    event_id VARCHAR(255) PRIMARY KEY,
    topic VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    next_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE outbox (
    id BIGSERIAL PRIMARY KEY,
    topic VARCHAR(255) NOT NULL,
    key VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE NULL
);

-- Manejo de Excepciones y Reglas de Negocio
CREATE TABLE unmatched_receipts (
    id BIGSERIAL PRIMARY KEY,
    receipt_event_id VARCHAR(255) NOT NULL,
    sku VARCHAR(255) NOT NULL,
    quantity NUMERIC NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'unresolved', -- unresolved, resolved
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Extras (Smart Procurement / Políticas)
CREATE TABLE policies (
    part_id INT PRIMARY KEY REFERENCES parts(part_id),
    min_stock NUMERIC NOT NULL DEFAULT 0,
    max_stock NUMERIC NOT NULL DEFAULT 0,
    reorder_point NUMERIC NOT NULL DEFAULT 0,
    lead_time_days INT NOT NULL DEFAULT 0
);

CREATE TABLE reorder_suggestions (
    part_id INT PRIMARY KEY REFERENCES parts(part_id),
    suggested_quantity NUMERIC NOT NULL,
    work_order_ids JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'suggested', -- suggested, ordered
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices para optimización de queries del API
CREATE INDEX idx_balances_part ON balances(part_id);
CREATE INDEX idx_movements_part ON movements(part_id);
CREATE INDEX idx_needs_work_order ON needs(work_order_id);
CREATE INDEX idx_reservations_work_order ON reservations(work_order_id);
CREATE INDEX idx_shortages_status ON shortages(status);
CREATE INDEX idx_outbox_unpublished ON outbox(id) WHERE published_at IS NULL;
CREATE INDEX idx_pending_events_next ON pending_events(next_attempt_at);
