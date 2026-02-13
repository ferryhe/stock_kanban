-- Migration: Email-based Authentication
-- Description: Add email, email verification, and password reset functionality
-- Date: 2026-02-13

-- Step 1: Add email column to users table (required and unique)
ALTER TABLE users ADD COLUMN email VARCHAR(255);

-- Step 2: Add email verification fields
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN email_verification_expiry TIMESTAMP WITH TIME ZONE;

-- Step 3: Add password reset fields
ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN password_reset_expiry TIMESTAMP WITH TIME ZONE;

-- Step 4: For existing users, set email to username@localhost (temporary)
-- This allows the migration to work, but users should update their email
UPDATE users SET email = username || '@localhost.local' WHERE email IS NULL;

-- Step 5: Make email NOT NULL and add unique constraint
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Step 6: Create indexes for token lookups
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;

-- Add comment
COMMENT ON COLUMN users.email IS 'User email address for authentication and notifications';
COMMENT ON COLUMN users.email_verified IS 'Whether the email address has been verified';
