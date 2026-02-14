-- Migration: Email-based Authentication
-- Description: Add email, email verification, and password reset functionality
-- Date: 2026-02-13

-- Step 1: Add email column to users table (nullable to allow existing users)
ALTER TABLE users ADD COLUMN email VARCHAR(255);

-- Step 2: Add email verification fields
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN email_verification_expiry TIMESTAMP WITH TIME ZONE;

-- Step 3: Add password reset fields
ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN password_reset_expiry TIMESTAMP WITH TIME ZONE;

-- Step 4: For existing users without email, set placeholder (they can update later)
-- New users will be required to provide email during registration
UPDATE users SET email = username || '@localhost.local' WHERE email IS NULL;

-- Step 5: Add unique constraint on email (allowing NULL values)
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Step 6: Create indexes for token lookups
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;

-- Add comment
COMMENT ON COLUMN users.email IS 'User email address for authentication and notifications';
COMMENT ON COLUMN users.email_verified IS 'Whether the email address has been verified';
