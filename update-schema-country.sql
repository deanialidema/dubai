-- Add country-related columns to existing user_sessions table
-- Run this to add country tracking to your existing table

ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS country VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) NULL,
ADD COLUMN IF NOT EXISTS flag VARCHAR(10) NULL,
ADD COLUMN IF NOT EXISTS city VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS region VARCHAR(100) NULL;

-- Add comments to the new columns
COMMENT ON COLUMN user_sessions.country IS 'Country name based on IP geolocation';
COMMENT ON COLUMN user_sessions.country_code IS 'ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN user_sessions.flag IS 'Country flag emoji';
COMMENT ON COLUMN user_sessions.city IS 'City name based on IP geolocation';
COMMENT ON COLUMN user_sessions.region IS 'Region/state name based on IP geolocation';

-- Create index for country-based queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_country_code ON user_sessions (country_code);
CREATE INDEX IF NOT EXISTS idx_user_sessions_country ON user_sessions (country); 