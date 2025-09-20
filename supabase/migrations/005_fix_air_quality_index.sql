-- Migration 005: Fix air_quality_index column
-- Ensure the air_quality_index column exists in sensor_data table

-- Add air_quality_index column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sensor_data' 
        AND column_name = 'air_quality_index'
    ) THEN
        ALTER TABLE sensor_data 
        ADD COLUMN air_quality_index INTEGER CHECK (air_quality_index >= 0 AND air_quality_index <= 500);
    END IF;
END $$;

-- Add any other missing columns that might be needed
DO $$ 
BEGIN
    -- Check and add breathing_anomaly_score if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sensor_data' 
        AND column_name = 'breathing_anomaly_score'
    ) THEN
        ALTER TABLE sensor_data 
        ADD COLUMN breathing_anomaly_score DECIMAL(5,2) CHECK (breathing_anomaly_score >= 0 AND breathing_anomaly_score <= 100);
    END IF;
END $$;

DO $$ 
BEGIN
    -- Check and add environmental_risk_score if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sensor_data' 
        AND column_name = 'environmental_risk_score'
    ) THEN
        ALTER TABLE sensor_data 
        ADD COLUMN environmental_risk_score DECIMAL(5,2) CHECK (environmental_risk_score >= 0 AND environmental_risk_score <= 100);
    END IF;
END $$;

DO $$ 
BEGIN
    -- Check and add overall_risk_score if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sensor_data' 
        AND column_name = 'overall_risk_score'
    ) THEN
        ALTER TABLE sensor_data 
        ADD COLUMN overall_risk_score DECIMAL(5,2) CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100);
    END IF;
END $$;

DO $$ 
BEGIN
    -- Check and add raw_environmental_data if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sensor_data' 
        AND column_name = 'raw_environmental_data'
    ) THEN
        ALTER TABLE sensor_data 
        ADD COLUMN raw_environmental_data TEXT;
    END IF;
END $$;

-- Update existing records to have air_quality_index values
UPDATE sensor_data 
SET air_quality_index = CASE 
    WHEN pm25 IS NOT NULL THEN LEAST(500, GREATEST(0, 30 + (pm25 * 2)))
    ELSE 50
END
WHERE air_quality_index IS NULL;

-- Update existing records to have risk scores if they're missing
UPDATE sensor_data 
SET breathing_anomaly_score = CASE 
    WHEN wheeze_detected = true THEN 20 + (wheeze_confidence * 0.3)
    ELSE 5 + (wheeze_confidence * 0.1)
END
WHERE breathing_anomaly_score IS NULL;

UPDATE sensor_data 
SET environmental_risk_score = CASE 
    WHEN pm25 > 20 THEN 15 + (pm25 * 0.5)
    ELSE 5 + (pm25 * 0.2)
END
WHERE environmental_risk_score IS NULL;

UPDATE sensor_data 
SET overall_risk_score = (breathing_anomaly_score + environmental_risk_score) / 2
WHERE overall_risk_score IS NULL;

-- Add raw_environmental_data to existing records
UPDATE sensor_data 
SET raw_environmental_data = json_build_object(
    'temp_raw', temperature,
    'humidity_raw', humidity,
    'pm25_raw', pm25,
    'sensor_quality', 'good'
)::text
WHERE raw_environmental_data IS NULL;
