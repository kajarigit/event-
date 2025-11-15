-- Database initialization script for Docker PostgreSQL
-- This runs automatically when the container is first created

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For faster text search

-- Create indexes for common queries
-- Note: Tables will be created by Sequelize, this just adds extra indexes

-- Function to create indexes after tables exist
CREATE OR REPLACE FUNCTION create_performance_indexes()
RETURNS void AS $$
BEGIN
    -- Users table indexes
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Users') THEN
        CREATE INDEX IF NOT EXISTS idx_users_email_lower ON "Users" (LOWER(email));
        CREATE INDEX IF NOT EXISTS idx_users_regno ON "Users" ("regNo");
        CREATE INDEX IF NOT EXISTS idx_users_role ON "Users" (role);
        CREATE INDEX IF NOT EXISTS idx_users_faculty ON "Users" (faculty);
        CREATE INDEX IF NOT EXISTS idx_users_department ON "Users" (department);
        CREATE INDEX IF NOT EXISTS idx_users_createdat ON "Users" ("createdAt" DESC);
        
        -- Full text search index
        CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON "Users" USING gin(name gin_trgm_ops);
    END IF;

    -- Events table indexes
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Events') THEN
        CREATE INDEX IF NOT EXISTS idx_events_date ON "Events" (date DESC);
        CREATE INDEX IF NOT EXISTS idx_events_isactive ON "Events" ("isActive");
        CREATE INDEX IF NOT EXISTS idx_events_createdat ON "Events" ("createdAt" DESC);
        
        -- Full text search
        CREATE INDEX IF NOT EXISTS idx_events_name_trgm ON "Events" USING gin(name gin_trgm_ops);
    END IF;

    -- Stalls table indexes
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Stalls') THEN
        CREATE INDEX IF NOT EXISTS idx_stalls_event ON "Stalls" ("eventId");
        CREATE INDEX IF NOT EXISTS idx_stalls_department ON "Stalls" (department);
        CREATE INDEX IF NOT EXISTS idx_stalls_category ON "Stalls" (category);
        CREATE INDEX IF NOT EXISTS idx_stalls_owneremail ON "Stalls" ("ownerEmail");
        
        -- Full text search
        CREATE INDEX IF NOT EXISTS idx_stalls_name_trgm ON "Stalls" USING gin(name gin_trgm_ops);
    END IF;

    -- QRCodes table indexes
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'QRCodes') THEN
        CREATE INDEX IF NOT EXISTS idx_qrcodes_user ON "QRCodes" ("userId");
        CREATE INDEX IF NOT EXISTS idx_qrcodes_event ON "QRCodes" ("eventId");
        CREATE INDEX IF NOT EXISTS idx_qrcodes_token ON "QRCodes" (token);
        CREATE INDEX IF NOT EXISTS idx_qrcodes_scanned ON "QRCodes" ("isScanned");
    END IF;

    -- ScanHistories table indexes
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'ScanHistories') THEN
        CREATE INDEX IF NOT EXISTS idx_scanhistories_qrcode ON "ScanHistories" ("qrCodeId");
        CREATE INDEX IF NOT EXISTS idx_scanhistories_volunteer ON "ScanHistories" ("scannedBy");
        CREATE INDEX IF NOT EXISTS idx_scanhistories_event ON "ScanHistories" ("eventId");
        CREATE INDEX IF NOT EXISTS idx_scanhistories_timestamp ON "ScanHistories" ("scannedAt" DESC);
    END IF;

    RAISE NOTICE 'Performance indexes created successfully';
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for event statistics (optional)
CREATE MATERIALIZED VIEW IF NOT EXISTS event_statistics AS
SELECT 
    e.id as event_id,
    e.name as event_name,
    COUNT(DISTINCT q.id) as total_qr_codes,
    COUNT(DISTINCT CASE WHEN q."isScanned" = true THEN q.id END) as scanned_count,
    COUNT(DISTINCT s.id) as total_scans,
    COUNT(DISTINCT s."scannedBy") as unique_volunteers
FROM "Events" e
LEFT JOIN "QRCodes" q ON q."eventId" = e.id
LEFT JOIN "ScanHistories" s ON s."eventId" = e.id
GROUP BY e.id, e.name;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_stats_event_id ON event_statistics(event_id);

-- Function to refresh statistics
CREATE OR REPLACE FUNCTION refresh_event_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY event_statistics;
    RAISE NOTICE 'Event statistics refreshed';
END;
$$ LANGUAGE plpgsql;

-- Audit log function (tracks all changes)
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO "AuditLogs" ("tableName", "recordId", "action", "newValue", "createdAt", "updatedAt")
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), NOW(), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO "AuditLogs" ("tableName", "recordId", "action", "oldValue", "newValue", "createdAt", "updatedAt")
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), NOW(), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO "AuditLogs" ("tableName", "recordId", "action", "oldValue", "createdAt", "updatedAt")
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), NOW(), NOW());
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to setup audit triggers (call after tables exist)
CREATE OR REPLACE FUNCTION setup_audit_triggers()
RETURNS void AS $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'Audit%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger ON %I', tbl);
        EXECUTE format('CREATE TRIGGER audit_trigger 
                       AFTER INSERT OR UPDATE OR DELETE ON %I
                       FOR EACH ROW EXECUTE FUNCTION audit_trigger_func()', tbl);
    END LOOP;
    RAISE NOTICE 'Audit triggers setup complete';
END;
$$ LANGUAGE plpgsql;

-- Cleanup old records function
CREATE OR REPLACE FUNCTION cleanup_old_records()
RETURNS void AS $$
BEGIN
    -- Delete scan histories older than 1 year
    DELETE FROM "ScanHistories" WHERE "scannedAt" < NOW() - INTERVAL '1 year';
    
    -- Delete old audit logs (keep 90 days)
    DELETE FROM "AuditLogs" WHERE "createdAt" < NOW() - INTERVAL '90 days';
    
    -- Vacuum tables
    VACUUM ANALYZE;
    
    RAISE NOTICE 'Old records cleaned up successfully';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Database initialization script completed successfully';
    RAISE NOTICE 'Run create_performance_indexes() after Sequelize creates tables';
    RAISE NOTICE 'Run setup_audit_triggers() to enable audit logging';
END $$;
