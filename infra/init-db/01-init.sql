-- ============================================
-- Init Database Script
-- ============================================
-- This script runs automatically when PostgreSQL container starts
-- for the first time (empty data volume)

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Mentory database initialized at %', NOW();
END $$;
