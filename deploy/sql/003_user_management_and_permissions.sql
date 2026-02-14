-- Migration: User Management and Permissions System
-- Description: Add user roles, API keys, portfolio permissions, user rankings, and audit logs
-- Date: 2026-02-13

-- Step 1: Create enums
CREATE TYPE user_role AS ENUM ('user', 'analyst', 'admin', 'superadmin');
CREATE TYPE portfolio_visibility AS ENUM ('private', 'shared', 'public');
CREATE TYPE portfolio_permission AS ENUM ('view', 'trade', 'admin');

-- Step 2: Add new columns to existing users table
ALTER TABLE users 
  ADD COLUMN role user_role NOT NULL DEFAULT 'user',
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Step 3: Add new column to portfolios table
ALTER TABLE portfolios
  ADD COLUMN visibility portfolio_visibility NOT NULL DEFAULT 'private';

-- Create index for portfolio visibility
CREATE INDEX idx_portfolios_visibility ON portfolios(visibility);

-- Step 4: Create API keys table
CREATE TABLE api_keys (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  key_hash TEXT NOT NULL,
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

-- Step 5: Create portfolio permissions table
CREATE TABLE portfolio_permissions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  portfolio_id VARCHAR NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission portfolio_permission NOT NULL,
  granted_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uidx_portfolio_permissions_portfolio_user ON portfolio_permissions(portfolio_id, user_id);
CREATE INDEX idx_portfolio_permissions_portfolio ON portfolio_permissions(portfolio_id);
CREATE INDEX idx_portfolio_permissions_user ON portfolio_permissions(user_id);

-- Step 6: Create user rankings table
CREATE TABLE user_rankings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  portfolio_id VARCHAR NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  ranking_date DATE NOT NULL,
  total_return NUMERIC(10, 6),
  annualized_return NUMERIC(10, 6),
  sharpe_ratio NUMERIC(10, 6),
  total_value NUMERIC(15, 2),
  rank INTEGER,
  percentile NUMERIC(5, 2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uidx_user_rankings_portfolio_date ON user_rankings(portfolio_id, ranking_date);
CREATE INDEX idx_user_rankings_user_date ON user_rankings(user_id, ranking_date);
CREATE INDEX idx_user_rankings_date_rank ON user_rankings(ranking_date, rank);

-- Step 7: Create audit logs table
CREATE TABLE audit_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Step 8: Create default superadmin user (password: admin123 - CHANGE IN PRODUCTION!)
-- Password hash is for 'admin123' with bcrypt salt rounds 10
INSERT INTO users (username, password, role, is_active)
VALUES ('admin', '$2a$10$7GS8aCjhCEHaxgMEGnbbL.fblBPGCRNXkQnlm/ymn1OvY/IcLclQ.', 'superadmin', true)
ON CONFLICT (username) DO NOTHING;

-- Add comment on password security
COMMENT ON TABLE users IS 'Users table - DEFAULT ADMIN PASSWORD MUST BE CHANGED IN PRODUCTION!';
