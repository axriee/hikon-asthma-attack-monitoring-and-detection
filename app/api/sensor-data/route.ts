import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'user_id', 'spo2', 'respiration_rate', 'heart_rate',
      'wheeze_detected', 'cough_detected', 'temperature', 
      'humidity', 'pm25', 'air_quality_index',
      'breathing_anomaly_score', 'environmental_risk_score', 'overall_risk_score'
    ];
    
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Insert sensor data into Supabase
    const { data, error } = await supabase
      .from('sensor_data')
      .insert([{
        user_id: body.user_id,
        spo2: parseFloat(body.spo2),
        respiration_rate: parseFloat(body.respiration_rate),
        heart_rate: parseInt(body.heart_rate),
        wheeze_detected: Boolean(body.wheeze_detected),
        wheeze_confidence: parseFloat(body.wheeze_confidence) || 0,
        cough_detected: Boolean(body.cough_detected),
        cough_confidence: parseFloat(body.cough_confidence) || 0,
        temperature: parseFloat(body.temperature),
        humidity: parseFloat(body.humidity),
        pm25: parseFloat(body.pm25),
        air_quality_index: parseInt(body.air_quality_index),
        breathing_anomaly_score: parseFloat(body.breathing_anomaly_score),
        environmental_risk_score: parseFloat(body.environmental_risk_score),
        overall_risk_score: parseFloat(body.overall_risk_score),
        raw_environmental_data: JSON.stringify({
          temp_raw: body.temperature,
          humidity_raw: body.humidity,
          pm25_raw: body.pm25,
          sensor_quality: "good"
        }),
        recorded_at: body.recorded_at || new Date().toISOString()
      }])
      .select();
    
    if (error) {
      console.error('Error inserting sensor data:', error);
      return NextResponse.json(
        { error: 'Failed to insert sensor data' },
        { status: 500 }
      );
    }
    
    console.log('Sensor data inserted successfully:', data);
    
    return NextResponse.json({
      success: true,
      message: 'Sensor data received and stored',
      data: data[0]
    });
    
  } catch (error) {
    console.error('Error processing sensor data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Sensor Data API',
    endpoints: {
      POST: '/api/sensor-data - Send sensor data from ESP32'
    }
  });
}