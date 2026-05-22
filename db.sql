-- 1. Tabla de Proyectos (Para agrupar escaneos)
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- 2. Tabla de Hosts (Relacionada con proyectos)
CREATE TABLE hosts (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    hostname VARCHAR(255),
    os_name VARCHAR(255),
    os_family VARCHAR(50), -- Windows, Linux, Apple, etc.
    status VARCHAR(20) DEFAULT 'up',
    last_scanned TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Puertos/Servicios (Relacionada con hosts)
CREATE TABLE ports (
    id SERIAL PRIMARY KEY,
    host_id INTEGER REFERENCES hosts(id) ON DELETE CASCADE,
    port_number INTEGER NOT NULL,
    protocol VARCHAR(10) DEFAULT 'tcp',
    service_name VARCHAR(100),
    product_version VARCHAR(255),
    risk_level VARCHAR(20), -- Critical, High, Medium, Low
    notes TEXT -- Campo editable para tus notas personales
);

-- 4. Tabla de Vulnerabilidades (Vectores de ataque)
CREATE TABLE vulnerabilities (
    id SERIAL PRIMARY KEY,
    port_id INTEGER REFERENCES ports(id) ON DELETE CASCADE,
    cve_id VARCHAR(50),
    title VARCHAR(255),
    severity VARCHAR(20),
    description TEXT,
    mitigation TEXT
);

-- Índices para mejorar el rendimiento de las consultas de búsqueda
CREATE INDEX idx_hosts_project ON hosts(project_id);
CREATE INDEX idx_ports_host ON ports(host_id);
CREATE INDEX idx_vulnerabilities_port ON vulnerabilities(port_id);