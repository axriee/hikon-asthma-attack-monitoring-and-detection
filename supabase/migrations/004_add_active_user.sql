-- Migration 004: Add active user system
-- Add active field to users table for ESP32 data routing

-- Add active column to users table
ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT false;

-- Create index for active users (for faster queries)
CREATE INDEX idx_users_active ON users(active);

-- Update existing users to have one active user (the first one)
UPDATE users SET active = true WHERE id = (SELECT id FROM users LIMIT 1);

-- Create a function to ensure only one user is active at a time
CREATE OR REPLACE FUNCTION set_active_user(user_id UUID)
RETURNS void AS $$
BEGIN
  -- Set all users to inactive
  UPDATE users SET active = false;
  
  -- Set the specified user to active
  UPDATE users SET active = true WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get the currently active user
CREATE OR REPLACE FUNCTION get_active_user()
RETURNS TABLE(
  id UUID,
  email VARCHAR,
  first_name VARCHAR,
  last_name VARCHAR,
  child_name VARCHAR,
  child_age INTEGER,
  child_condition VARCHAR,
  active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.first_name, u.last_name, u.child_name, u.child_age, u.child_condition, u.active
  FROM users u
  WHERE u.active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Insert a few more sample users for testing
INSERT INTO users (email, password_hash, first_name, last_name, child_name, child_age, child_condition, active) VALUES
('sarah.johnson@example.com', '$2a$10$example_hash_here', 'Sarah', 'Johnson', 'Maya', 6, 'Asthma', false),
('mike.wilson@example.com', '$2a$10$example_hash_here', 'Mike', 'Wilson', 'Alex', 8, 'Asthma', false),
('lisa.brown@example.com', '$2a$10$example_hash_here', 'Lisa', 'Brown', 'Sophie', 4, 'Asthma', false);
