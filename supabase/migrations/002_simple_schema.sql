-- Migration 002: Simple Two-Table Schema
-- Just users and sensor_data tables

-- Drop existing tables if they exist (for clean start)
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP VIEW IF EXISTS recent_alerts CASCADE;
DROP VIEW IF EXISTS device_status CASCADE;
DROP VIEW IF EXISTS dashboard_metrics CASCADE;

-- Drop functions that are no longer needed
DROP FUNCTION IF EXISTS generate_sensor_alerts() CASCADE;
DROP FUNCTION IF EXISTS get_latest_sensor_data(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_sensor_data_history(UUID, INTEGER) CASCADE;

-- Keep only the essential two tables: users and sensor_data
-- (These should already exist from migration 001)

-- Add some useful indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sensor_data_user_id_recorded_at ON sensor_data(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_data_overall_risk_score ON sensor_data(overall_risk_score);

-- Create a simple view for dashboard data
CREATE VIEW latest_sensor_data AS
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.email,
    sd.spo2,
    sd.respiration_rate,
    sd.pm25,
    sd.heart_rate,
    sd.temperature,
    sd.wheeze_detected,
    sd.cough_detected,
    sd.overall_risk_score,
    sd.recorded_at
FROM users u
LEFT JOIN sensor_data sd ON u.id = sd.user_id
WHERE sd.recorded_at = (
    SELECT MAX(recorded_at) 
    FROM sensor_data sd2 
    WHERE sd2.user_id = u.id
);

-- Create a simple view for sensor data trends (last 24 hours)
CREATE VIEW sensor_data_trends AS
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    sd.spo2,
    sd.respiration_rate,
    sd.pm25,
    sd.heart_rate,
    sd.temperature,
    sd.wheeze_detected,
    sd.cough_detected,
    sd.overall_risk_score,
    sd.recorded_at
FROM users u
JOIN sensor_data sd ON u.id = sd.user_id
WHERE sd.recorded_at >= NOW() - INTERVAL '24 hours'
ORDER BY sd.recorded_at ASC;

-- Insert some additional sample sensor data for testing
INSERT INTO sensor_data (user_id, spo2, respiration_rate, pm25, heart_rate, temperature, wheeze_detected, cough_detected, overall_risk_score) VALUES
((SELECT id FROM users WHERE email = 'john.doe@example.com'), 96.8, 13.5, 15.2, 88, 98.5, false, false, 20.0),
((SELECT id FROM users WHERE email = 'john.doe@example.com'), 94.2, 15.8, 22.1, 95, 98.3, true, false, 35.0),
((SELECT id FROM users WHERE email = 'jane.smith@example.com'), 98.1, 11.2, 9.8, 82, 98.7, false, false, 12.0),
((SELECT id FROM users WHERE email = 'jane.smith@example.com'), 97.5, 12.8, 18.5, 85, 98.4, false, true, 18.0);

-- Create a simple function to get latest data for a user
CREATE OR REPLACE FUNCTION get_user_latest_data(p_user_id UUID)
RETURNS TABLE (
    spo2 DECIMAL,
    respiration_rate DECIMAL,
    pm25 DECIMAL,
    heart_rate INTEGER,
    temperature DECIMAL,
    wheeze_detected BOOLEAN,
    cough_detected BOOLEAN,
    overall_risk_score DECIMAL,
    recorded_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sd.spo2,
        sd.respiration_rate,
        sd.pm25,
        sd.heart_rate,
        sd.temperature,
        sd.wheeze_detected,
        sd.cough_detected,
        sd.overall_risk_score,
        sd.recorded_at
    FROM sensor_data sd
    WHERE sd.user_id = p_user_id
    ORDER BY sd.recorded_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create a simple function to get data history for a user
CREATE OR REPLACE FUNCTION get_user_data_history(
    p_user_id UUID,
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    spo2 DECIMAL,
    respiration_rate DECIMAL,
    pm25 DECIMAL,
    heart_rate INTEGER,
    temperature DECIMAL,
    wheeze_detected BOOLEAN,
    cough_detected BOOLEAN,
    overall_risk_score DECIMAL,
    recorded_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sd.spo2,
        sd.respiration_rate,
        sd.pm25,
        sd.heart_rate,
        sd.temperature,
        sd.wheeze_detected,
        sd.cough_detected,
        sd.overall_risk_score,
        sd.recorded_at
    FROM sensor_data sd
    WHERE sd.user_id = p_user_id
    AND sd.recorded_at >= NOW() - INTERVAL '1 hour' * p_hours
    ORDER BY sd.recorded_at ASC;
END;
$$ LANGUAGE plpgsql;
