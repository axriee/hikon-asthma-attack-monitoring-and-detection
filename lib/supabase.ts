import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  child_name: string
  child_age: number
  child_condition: string
  created_at: string
  updated_at: string
}

export interface SensorData {
  id: string
  user_id: string
  
  // Core health metrics
  spo2: number | null
  respiration_rate: number | null
  heart_rate: number | null
  
  // Acoustic sensors
  wheeze_detected: boolean
  wheeze_confidence: number | null
  cough_detected: boolean
  cough_confidence: number | null
  
  // Environmental triggers
  temperature: number | null
  humidity: number | null
  pm25: number | null
  air_quality_index: number | null
  
  // ML model outputs
  breathing_anomaly_score: number | null
  environmental_risk_score: number | null
  overall_risk_score: number | null
  
  // Raw sensor data
  raw_audio_data?: string | null
  raw_accelerometer_data?: string | null
  raw_environmental_data?: string | null
  
  // Timestamps
  recorded_at: string
  created_at: string
}
