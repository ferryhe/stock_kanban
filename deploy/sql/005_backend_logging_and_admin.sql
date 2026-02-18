-- Migration: Add backend logging system and update authentication
-- This migration adds backend_logs table for system/admin monitoring

-- Create backend_logs table
CREATE TABLE IF NOT EXISTS backend_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  level VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  user_id VARCHAR REFERENCES users(id),
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for backend_logs
CREATE INDEX IF NOT EXISTS idx_backend_logs_level ON backend_logs(level);
CREATE INDEX IF NOT EXISTS idx_backend_logs_category ON backend_logs(category);
CREATE INDEX IF NOT EXISTS idx_backend_logs_date ON backend_logs(created_at);

-- Add comment
COMMENT ON TABLE backend_logs IS 'System and backend logs for admin monitoring and debugging';
