-- Create user_sessions table for tracking website visitors
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL, -- Can be linked to an auth user later
  session_id VARCHAR(255) NOT NULL UNIQUE,
  ip_address INET NULL,
  user_agent TEXT NULL,
  page_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  redirect_to_page TEXT NULL, -- Admin can set this to redirect user to specific page
  
  -- Index for better performance
  CONSTRAINT unique_session_id UNIQUE (session_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions (session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions (is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_updated_at ON user_sessions (updated_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on user_sessions" ON user_sessions
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_sessions_updated_at 
  BEFORE UPDATE ON user_sessions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: Function to clean up old inactive sessions (can be called manually or via cron)
CREATE OR REPLACE FUNCTION cleanup_old_sessions(older_than_hours INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions 
  WHERE is_active = false 
    AND updated_at < NOW() - INTERVAL '1 hour' * older_than_hours;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql; 