-- Initialization script for PostgreSQL
-- This script runs when the container is first created

-- Create database if not exists (though Docker handles this)
SELECT 'CREATE DATABASE api_gateway'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'api_gateway')\gexec

-- You can add initial database setup here if needed
