-- Migration 002: Additional Features for BreathCare
-- This migration adds additional features and improvements to the schema

-- Add device management table for ESP32 devices
CREATE TABLE devices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) DEFAULT 'ESP32',
    mac_address VARCHAR(17) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add device_id foreign key to sensor_data table
ALTER TABLE sensor_data 
ADD COLUMN device_id UUID REFERENCES devices(id) ON DELETE SET NULL;

-- Create alerts table for health notifications
CREATE TABLE alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- 'high_risk', 'low_spo2', 'high_pm25', 'wheeze_detected', etc.
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user sessions table for authentication
CREATE TABLE user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for new tables
CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_devices_mac_address ON devices(mac_address);
CREATE INDEX idx_sensor_data_device_id ON sensor_data(device_id);
CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_is_read ON alerts(is_read);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);

-- Add triggers for updated_at on new tables
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate alerts based on sensor data
CREATE OR REPLACE FUNCTION generate_sensor_alerts()
RETURNS TRIGGER AS $$
DECLARE
    alert_title VARCHAR(200);
    alert_message TEXT;
    alert_severity VARCHAR(20);
BEGIN
    -- Check for critical SpO2
    IF NEW.spo2 < 90 THEN
        alert_title := 'Critical: Low Oxygen Level';
        alert_message := 'Oxygen level is critically low (' || NEW.spo2 || '%). Please seek immediate medical attention.';
        alert_severity := 'critical';
        
        INSERT INTO alerts (user_id, alert_type, severity, title, message)
        VALUES (NEW.user_id, 'low_spo2', alert_severity, alert_title, alert_message);
    END IF;
    
    -- Check for high PM2.5
    IF NEW.pm25 > 50 THEN
        alert_title := 'High Air Pollution Alert';
        alert_message := 'Air quality is poor (PM2.5: ' || NEW.pm25 || ' µg/m³). Consider moving to a cleaner environment.';
        alert_severity := 'high';
        
        INSERT INTO alerts (user_id, alert_type, severity, title, message)
        VALUES (NEW.user_id, 'high_pm25', alert_severity, alert_title, alert_message);
    END IF;
    
    -- Check for wheeze detection
    IF NEW.wheeze_detected THEN
        alert_title := 'Wheeze Detected';
        alert_message := 'Wheezing sounds detected. Monitor closely and consider using prescribed medication.';
        alert_severity := 'medium';
        
        INSERT INTO alerts (user_id, alert_type, severity, title, message)
        VALUES (NEW.user_id, 'wheeze_detected', alert_severity, alert_title, alert_message);
    END IF;
    
    -- Check for high overall risk
    IF NEW.overall_risk_score > 70 THEN
        alert_title := 'High Risk Alert';
        alert_message := 'Health metrics indicate high risk. Please monitor closely and consider contacting your healthcare provider.';
        alert_severity := 'high';
        
        INSERT INTO alerts (user_id, alert_type, severity, title, message)
        VALUES (NEW.user_id, 'high_risk', alert_severity, alert_title, alert_message);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to generate alerts when sensor data is inserted
CREATE TRIGGER trigger_generate_sensor_alerts
    AFTER INSERT ON sensor_data
    FOR EACH ROW
    EXECUTE FUNCTION generate_sensor_alerts();

-- Create view for recent alerts
CREATE VIEW recent_alerts AS
SELECT 
    a.id,
    a.user_id,
    u.first_name,
    u.last_name,
    a.alert_type,
    a.severity,
    a.title,
    a.message,
    a.is_read,
    a.created_at
FROM alerts a
JOIN users u ON a.user_id = u.id
ORDER BY a.created_at DESC;

-- Create view for device status
CREATE VIEW device_status AS
SELECT 
    d.id,
    d.user_id,
    u.first_name,
    u.last_name,
    d.device_name,
    d.device_type,
    d.mac_address,
    d.is_active,
    d.last_seen,
    CASE 
        WHEN d.last_seen > NOW() - INTERVAL '5 minutes' THEN 'online'
        WHEN d.last_seen > NOW() - INTERVAL '1 hour' THEN 'recent'
        ELSE 'offline'
    END as connection_status
FROM devices d
JOIN users u ON d.user_id = u.id;

-- Insert sample devices
INSERT INTO devices (user_id, device_name, mac_address, is_active) VALUES
((SELECT id FROM users WHERE email = 'john.doe@example.com'), 'John''s ESP32 Monitor', 'AA:BB:CC:DD:EE:01', true),
((SELECT id FROM users WHERE email = 'jane.smith@example.com'), 'Jane''s ESP32 Monitor', 'AA:BB:CC:DD:EE:02', true);

-- Update existing sensor data with device references
UPDATE sensor_data 
SET device_id = (SELECT id FROM devices WHERE user_id = sensor_data.user_id LIMIT 1)
WHERE device_id IS NULL;

-- Insert sample alerts
INSERT INTO alerts (user_id, alert_type, severity, title, message, is_read) VALUES
((SELECT id FROM users WHERE email = 'john.doe@example.com'), 'wheeze_detected', 'medium', 'Wheeze Detected', 'Wheezing sounds detected in recent readings.', false),
((SELECT id FROM users WHERE email = 'jane.smith@example.com'), 'high_risk', 'high', 'High Risk Alert', 'Health metrics indicate elevated risk levels.', false);

-- Create function to get latest sensor data for a user
CREATE OR REPLACE FUNCTION get_latest_sensor_data(p_user_id UUID)
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

-- Create function to get sensor data history for a user
CREATE OR REPLACE FUNCTION get_sensor_data_history(
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
