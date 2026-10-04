-- ============================================
-- SafeGuardian Database Schema
-- ============================================

-- USERS
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- EMERGENCY CONTACTS
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    relationship VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_contact_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- SOS INCIDENTS
CREATE TABLE IF NOT EXISTS sos_incidents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,

    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    locality VARCHAR(255),

    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT fk_sos_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_sos_status
        CHECK (status IN ('ACTIVE', 'RESOLVED'))
);


-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,

    sos_id INTEGER NOT NULL,
    contact_id INTEGER NOT NULL,

    message TEXT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempts INTEGER NOT NULL DEFAULT 0,

    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notification_sos
        FOREIGN KEY (sos_id)
        REFERENCES sos_incidents(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notification_contact
        FOREIGN KEY (contact_id)
        REFERENCES emergency_contacts(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_notification_status
        CHECK (status IN ('PENDING', 'SENT', 'FAILED'))
);


-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,

    user_id INTEGER,

    event VARCHAR(100) NOT NULL,
    details TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);