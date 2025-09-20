-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create children table
CREATE TABLE children (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 0 AND age <= 18),
    medical_condition VARCHAR(100) DEFAULT 'Asthma',
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create devices table for ESP32 sensors
CREATE TABLE devices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    device_name VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) DEFAULT 'ESP32',
    mac_address VARCHAR(17) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create health_metrics table for storing sensor data
CREATE TABLE health_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    spo2 DECIMAL(5,2) CHECK (spo2 >= 0 AND spo2 <= 100),
    respiration_rate DECIMAL(5,2) CHECK (respiration_rate >= 0),
    pm25 DECIMAL(8,2) CHECK (pm25 >= 0),
    heart_rate INTEGER CHECK (heart_rate >= 0),
    temperature DECIMAL(4,2) CHECK (temperature >= 0),
    wheeze_detected BOOLEAN DEFAULT false,
    cough_detected BOOLEAN DEFAULT false,
    overall_risk_score DECIMAL(5,2) CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alerts table for notifications
CREATE TABLE alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- 'high_risk', 'low_spo2', 'high_pm25', 'wheeze_detected', etc.
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table for user authentication
CREATE TABLE user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_children_user_id ON children(user_id);
CREATE INDEX idx_devices_child_id ON devices(child_id);
CREATE INDEX idx_health_metrics_child_id ON health_metrics(child_id);
CREATE INDEX idx_health_metrics_recorded_at ON health_metrics(recorded_at);
CREATE INDEX idx_alerts_child_id ON alerts(child_id);
CREATE INDEX idx_alerts_is_read ON alerts(is_read);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON children
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate overall risk score
CREATE OR REPLACE FUNCTION calculate_risk_score(
    p_spo2 DECIMAL,
    p_respiration DECIMAL,
    p_pm25 DECIMAL,
    p_wheeze BOOLEAN,
    p_cough BOOLEAN
) RETURNS DECIMAL AS $$
DECLARE
    risk_score DECIMAL := 0;
BEGIN
    -- SpO2 scoring (lower is worse)
    IF p_spo2 < 90 THEN
        risk_score := risk_score + 40;
    ELSIF p_spo2 < 95 THEN
        risk_score := risk_score + 20;
    ELSIF p_spo2 < 98 THEN
        risk_score := risk_score + 10;
    END IF;
    
    -- Respiration rate scoring
    IF p_respiration < 8 OR p_respiration > 20 THEN
        risk_score := risk_score + 25;
    ELSIF p_respiration < 10 OR p_respiration > 18 THEN
        risk_score := risk_score + 15;
    ELSIF p_respiration < 12 OR p_respiration > 16 THEN
        risk_score := risk_score + 5;
    END IF;
    
    -- PM2.5 scoring (higher is worse)
    IF p_pm25 > 50 THEN
        risk_score := risk_score + 30;
    ELSIF p_pm25 > 25 THEN
        risk_score := risk_score + 20;
    ELSIF p_pm25 > 15 THEN
        risk_score := risk_score + 10;
    END IF;
    
    -- Wheeze detection
    IF p_wheeze THEN
        risk_score := risk_score + 25;
    END IF;
    
    -- Cough detection
    IF p_cough THEN
        risk_score := risk_score + 15;
    END IF;
    
    -- Cap at 100
    IF risk_score > 100 THEN
        risk_score := 100;
    END IF;
    
    RETURN risk_score;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate alerts based on health metrics
CREATE OR REPLACE FUNCTION generate_health_alerts()
RETURNS TRIGGER AS $$
DECLARE
    alert_title VARCHAR(200);
    alert_message TEXT;
    alert_severity VARCHAR(20);
BEGIN
    -- Check for critical SpO2
    IF NEW.spo2 < 90 THEN
        alert_title := 'Critical: Low Oxygen Level';
        alert_message := 'Your child''s oxygen level is critically low (' || NEW.spo2 || '%). Please seek immediate medical attention.';
        alert_severity := 'critical';
        
        INSERT INTO alerts (child_id, alert_type, severity, title, message)
        VALUES (NEW.child_id, 'low_spo2', alert_severity, alert_title, alert_message);
    END IF;
    
    -- Check for high PM2.5
    IF NEW.pm25 > 50 THEN
        alert_title := 'High Air Pollution Alert';
        alert_message := 'Air quality is poor (PM2.5: ' || NEW.pm25 || ' µg/m³). Consider moving to a cleaner environment.';
        alert_severity := 'high';
        
        INSERT INTO alerts (child_id, alert_type, severity, title, message)
        VALUES (NEW.child_id, 'high_pm25', alert_severity, alert_title, alert_message);
    END IF;
    
    -- Check for wheeze detection
    IF NEW.wheeze_detected THEN
        alert_title := 'Wheeze Detected';
        alert_message := 'Wheezing sounds detected. Monitor your child closely and consider using prescribed medication.';
        alert_severity := 'medium';
        
        INSERT INTO alerts (child_id, alert_type, severity, title, message)
        VALUES (NEW.child_id, 'wheeze_detected', alert_severity, alert_title, alert_message);
    END IF;
    
    -- Check for high overall risk
    IF NEW.overall_risk_score > 70 THEN
        alert_title := 'High Risk Alert';
        alert_message := 'Your child''s health metrics indicate high risk. Please monitor closely and consider contacting your healthcare provider.';
        alert_severity := 'high';
        
        INSERT INTO alerts (child_id, alert_type, severity, title, message)
        VALUES (NEW.child_id, 'high_risk', alert_severity, alert_title, alert_message);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to generate alerts when health metrics are inserted
CREATE TRIGGER trigger_generate_health_alerts
    AFTER INSERT ON health_metrics
    FOR EACH ROW
    EXECUTE FUNCTION generate_health_alerts();

-- Insert sample data for testing
INSERT INTO users (email, password_hash, first_name, last_name, phone) VALUES
('john.doe@example.com', '$2a$10$example_hash_here', 'John', 'Doe', '+1-555-123-4567'),
('jane.smith@example.com', '$2a$10$example_hash_here', 'Jane', 'Smith', '+1-555-987-6543');

-- Insert sample children
INSERT INTO children (user_id, name, age, medical_condition, emergency_contact_name, emergency_contact_phone, address) VALUES
((SELECT id FROM users WHERE email = 'john.doe@example.com'), 'Emma', 5, 'Asthma', 'Jane Doe', '+1-555-123-4567', '123 Health Street, Medical City, MC 12345'),
((SELECT id FROM users WHERE email = 'jane.smith@example.com'), 'Liam', 7, 'Asthma', 'John Smith', '+1-555-987-6543', '456 Wellness Ave, Health Town, HT 67890');

-- Insert sample devices
INSERT INTO devices (child_id, device_name, mac_address, is_active) VALUES
((SELECT id FROM children WHERE name = 'Emma'), 'Emma''s Monitor', 'AA:BB:CC:DD:EE:01', true),
((SELECT id FROM children WHERE name = 'Liam'), 'Liam''s Monitor', 'AA:BB:CC:DD:EE:02', true);

-- Insert sample health metrics
INSERT INTO health_metrics (child_id, device_id, spo2, respiration_rate, pm25, heart_rate, temperature, wheeze_detected, cough_detected, overall_risk_score) VALUES
((SELECT id FROM children WHERE name = 'Emma'), (SELECT id FROM devices WHERE device_name = 'Emma''s Monitor'), 95.5, 14.2, 12.3, 85, 98.6, false, false, 25.0),
((SELECT id FROM children WHERE name = 'Liam'), (SELECT id FROM devices WHERE device_name = 'Liam''s Monitor'), 92.1, 16.8, 18.7, 92, 98.4, true, false, 45.0);

-- Create view for dashboard data
CREATE VIEW dashboard_metrics AS
SELECT 
    c.id as child_id,
    c.name as child_name,
    c.age,
    u.first_name as parent_first_name,
    u.last_name as parent_last_name,
    hm.spo2,
    hm.respiration_rate,
    hm.pm25,
    hm.heart_rate,
    hm.temperature,
    hm.wheeze_detected,
    hm.cough_detected,
    hm.overall_risk_score,
    hm.recorded_at,
    d.device_name,
    d.is_active as device_active
FROM children c
JOIN users u ON c.user_id = u.id
LEFT JOIN health_metrics hm ON c.id = hm.child_id
LEFT JOIN devices d ON c.id = d.child_id
WHERE hm.recorded_at = (
    SELECT MAX(recorded_at) 
    FROM health_metrics hm2 
    WHERE hm2.child_id = c.id
);

-- Create view for recent alerts
CREATE VIEW recent_alerts AS
SELECT 
    a.id,
    a.child_id,
    c.name as child_name,
    a.alert_type,
    a.severity,
    a.title,
    a.message,
    a.is_read,
    a.created_at
FROM alerts a
JOIN children c ON a.child_id = c.id
ORDER BY a.created_at DESC;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
