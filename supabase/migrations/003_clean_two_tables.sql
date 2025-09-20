-- Migration 003: Clean Two-Table Schema
-- Just users and sensor_data - nothing else!

-- Drop everything and start fresh
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS children CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS health_metrics CASCADE;
DROP TABLE IF EXISTS sensor_data CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop all views
DROP VIEW IF EXISTS dashboard_metrics CASCADE;
DROP VIEW IF EXISTS device_status CASCADE;
DROP VIEW IF EXISTS latest_sensor_data CASCADE;
DROP VIEW IF EXISTS recent_alerts CASCADE;
DROP VIEW IF EXISTS sensor_data_trends CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS calculate_risk_score(DECIMAL, DECIMAL, DECIMAL, BOOLEAN, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS generate_health_alerts() CASCADE;
DROP FUNCTION IF EXISTS generate_sensor_alerts() CASCADE;
DROP FUNCTION IF EXISTS get_latest_sensor_data(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_sensor_data_history(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_user_data_history(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_user_latest_data(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Create users table (parents with child info)
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    -- Child information
    child_name VARCHAR(100) NOT NULL,
    child_age INTEGER NOT NULL CHECK (child_age >= 0 AND child_age <= 18),
    child_condition VARCHAR(100) DEFAULT 'Asthma',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sensor_data table (ESP32 readings for asthma monitoring)
CREATE TABLE sensor_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Core health metrics
    spo2 DECIMAL(5,2) CHECK (spo2 >= 0 AND spo2 <= 100), -- Pulse oximeter readings
    respiration_rate DECIMAL(5,2) CHECK (respiration_rate >= 0), -- Chest movement/accelerometer
    heart_rate INTEGER CHECK (heart_rate >= 0), -- Heart rate from pulse oximeter
    
    -- Acoustic sensors
    wheeze_detected BOOLEAN DEFAULT false, -- Acoustic sensor analysis
    wheeze_confidence DECIMAL(5,2) CHECK (wheeze_confidence >= 0 AND wheeze_confidence <= 100), -- ML model confidence
    cough_detected BOOLEAN DEFAULT false, -- Microphone analysis
    cough_confidence DECIMAL(5,2) CHECK (cough_confidence >= 0 AND cough_confidence <= 100), -- ML model confidence
    
    -- Environmental triggers
    temperature DECIMAL(4,2) CHECK (temperature >= -40 AND temperature <= 60), -- Temperature sensor
    humidity DECIMAL(5,2) CHECK (humidity >= 0 AND humidity <= 100), -- Humidity sensor
    pm25 DECIMAL(8,2) CHECK (pm25 >= 0), -- Air quality sensor
    air_quality_index INTEGER CHECK (air_quality_index >= 0 AND air_quality_index <= 500), -- AQI calculation
    
    -- ML model outputs
    breathing_anomaly_score DECIMAL(5,2) CHECK (breathing_anomaly_score >= 0 AND breathing_anomaly_score <= 100), -- Accelerometer analysis
    environmental_risk_score DECIMAL(5,2) CHECK (environmental_risk_score >= 0 AND environmental_risk_score <= 100), -- Environmental factors
    overall_risk_score DECIMAL(5,2) CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100), -- Meta-classifier output
    
    -- Raw sensor data (for ML processing)
    raw_audio_data TEXT, -- Base64 encoded audio samples for wheeze/cough detection
    raw_accelerometer_data TEXT, -- JSON array of accelerometer readings for breathing analysis
    raw_environmental_data TEXT, -- JSON object with temp, humidity, PM2.5 raw values
    
    -- Timestamps
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Basic indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sensor_data_user_id ON sensor_data(user_id);
CREATE INDEX idx_sensor_data_recorded_at ON sensor_data(recorded_at);

-- Insert sample users with child info
INSERT INTO users (email, password_hash, first_name, last_name, child_name, child_age, child_condition) VALUES
('john.doe@example.com', '$2a$10$example_hash_here', 'John', 'Doe', 'Emma', 5, 'Asthma'),
('jane.smith@example.com', '$2a$10$example_hash_here', 'Jane', 'Smith', 'Liam', 7, 'Asthma');

-- Insert sample sensor data with comprehensive asthma monitoring metrics
INSERT INTO sensor_data (
    user_id, 
    spo2, respiration_rate, heart_rate,
    wheeze_detected, wheeze_confidence, cough_detected, cough_confidence,
    temperature, humidity, pm25, air_quality_index,
    breathing_anomaly_score, environmental_risk_score, overall_risk_score,
    raw_environmental_data
) VALUES
-- John's child - Emma (5 years old) - Normal readings
((SELECT id FROM users WHERE email = 'john.doe@example.com'), 
 95.5, 14.2, 85, 
 false, 15.2, false, 8.5, 
 22.5, 45.2, 12.3, 50, 
 20.0, 25.0, 25.0,
 '{"temp_raw": 22.5, "humidity_raw": 45.2, "pm25_raw": 12.3, "sensor_quality": "good"}'),

-- John's child - Emma - Wheezing detected
((SELECT id FROM users WHERE email = 'john.doe@example.com'), 
 92.1, 16.8, 92, 
 true, 78.5, false, 12.3, 
 24.1, 52.8, 18.7, 75, 
 45.0, 40.0, 45.0,
 '{"temp_raw": 24.1, "humidity_raw": 52.8, "pm25_raw": 18.7, "sensor_quality": "good"}'),

-- John's child - Emma - Cough detected
((SELECT id FROM users WHERE email = 'john.doe@example.com'), 
 94.8, 15.5, 88, 
 false, 25.1, true, 82.3, 
 23.8, 48.5, 15.2, 60, 
 35.0, 30.0, 38.0,
 '{"temp_raw": 23.8, "humidity_raw": 48.5, "pm25_raw": 15.2, "sensor_quality": "good"}'),

-- Jane's child - Liam (7 years old) - Good readings
((SELECT id FROM users WHERE email = 'jane.smith@example.com'), 
 97.2, 12.5, 78, 
 false, 5.2, false, 3.1, 
 21.8, 42.1, 8.9, 35, 
 10.0, 15.0, 15.0,
 '{"temp_raw": 21.8, "humidity_raw": 42.1, "pm25_raw": 8.9, "sensor_quality": "excellent"}'),

-- Jane's child - Liam - Environmental trigger
((SELECT id FROM users WHERE email = 'jane.smith@example.com'), 
 96.8, 13.8, 82, 
 false, 18.5, false, 15.2, 
 26.5, 68.2, 35.4, 120, 
 25.0, 65.0, 55.0,
 '{"temp_raw": 26.5, "humidity_raw": 68.2, "pm25_raw": 35.4, "sensor_quality": "good"}'),

-- Additional recent readings for better chart data
((SELECT id FROM users WHERE email = 'john.doe@example.com'), 
 96.2, 13.8, 87, 
 false, 12.5, false, 8.9, 
 23.2, 46.8, 14.1, 55, 
 18.0, 22.0, 20.0,
 '{"temp_raw": 23.2, "humidity_raw": 46.8, "pm25_raw": 14.1, "sensor_quality": "good"}'),

((SELECT id FROM users WHERE email = 'jane.smith@example.com'), 
 98.1, 11.9, 75, 
 false, 3.2, false, 2.1, 
 20.5, 38.9, 6.7, 25, 
 5.0, 8.0, 8.0,
 '{"temp_raw": 20.5, "humidity_raw": 38.9, "pm25_raw": 6.7, "sensor_quality": "excellent"}');
