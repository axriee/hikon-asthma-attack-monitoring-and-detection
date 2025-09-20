/*
 * BreathCare ESP32 Simple Version
 * 
 * This is a simplified version that works without additional sensors
 * Uses only the ESP32's built-in capabilities
 * Perfect for testing and development
 * 
 * Hardware Requirements:
 * - ESP32 Dev Board only
 * - WiFi connection
 * 
 * Libraries Required:
 * - WiFi.h (built-in)
 * - HTTPClient.h (built-in)
 * - ArduinoJson.h (install from Library Manager)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ========================================
// CONFIGURATION - UPDATE THESE VALUES
// ========================================
const char* ssid = "ZTE_5G_9RsHEG";
const char* password = "yGH64KcS";

// Supabase configuration
const char* supabase_url = "https://ogapdrgcwmzecbwwrmre.supabase.co";
const char* supabase_anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYXBkcmdjd216ZWNid3dybXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDIxNzAsImV4cCI6MjA3MzkxODE3MH0.5ondVqwEc09dcuO9DsFcOqVl8lctcrI4CIjmhKsua10";

// Active user ID (get this from the dashboard)
String active_user_id = "YOUR_ACTIVE_USER_ID";

// Data sending interval (10 seconds like the test script)
const unsigned long SEND_INTERVAL = 10000; // 10 seconds
unsigned long lastSendTime = 0;

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  connectToWiFi();
  
  // Get active user ID
  getActiveUserID();
  
  Serial.println("🚀 BreathCare ESP32 Simple Version started!");
  Serial.println("📡 Will send simulated data every 10 seconds to Supabase");
  Serial.println("💡 This version works without additional sensors");
}

void loop() {
  // Check if it's time to send data
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    sendSensorData();
    lastSendTime = millis();
  }
  
  // Small delay to prevent overwhelming the system
  delay(100);
}

void connectToWiFi() {
  Serial.print("🔌 Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("✅ WiFi connected!");
  Serial.print("📡 IP address: ");
  Serial.println(WiFi.localIP());
}

void getActiveUserID() {
  if (active_user_id == "YOUR_ACTIVE_USER_ID") {
    Serial.println("⚠️  Please update active_user_id in the code!");
    Serial.println("💡 Get the user ID from the dashboard or run: node test-esp32-data.js");
    Serial.println("💡 Look for: 'Active user: [Name] ([ID])' in the console output");
  } else {
    Serial.print("👤 Active user ID: ");
    Serial.println(active_user_id);
  }
}

void sendSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected, skipping data send");
    return;
  }
  
  Serial.println("📡 Sending sensor data...");
  
  // Generate simulated sensor data (same as test script)
  float spo2 = 95.0 + random(-5, 5); // 90-100
  float respiration_rate = 15.0 + random(-3, 3); // 12-18
  int heart_rate = 75 + random(-10, 10); // 65-85
  bool wheeze_detected = random(0, 100) < 5; // 5% chance
  float wheeze_confidence = wheeze_detected ? 60 + random(0, 35) : random(0, 20);
  bool cough_detected = random(0, 100) < 3; // 3% chance
  float cough_confidence = cough_detected ? 70 + random(0, 25) : random(0, 15);
  float temperature = 22.0 + random(-3, 3); // 19-25°C
  float humidity = 45.0 + random(-10, 10); // 35-55%
  float pm25 = 10.0 + random(0, 20); // 10-30 µg/m³
  
  // Calculate derived values (same as test script)
  int air_quality_index = 30 + (int)(pm25 * 2);
  float breathing_anomaly_score = wheeze_detected ? 20 + random(0, 30) : random(0, 15);
  float environmental_risk_score = (pm25 > 20 ? 15 : 5) + random(0, 20);
  float overall_risk_score = (breathing_anomaly_score + environmental_risk_score) / 2.0;
  
  // Create JSON payload (exact same structure as test script)
  DynamicJsonDocument doc(1024);
  doc["user_id"] = active_user_id;
  doc["spo2"] = round(spo2 * 10) / 10.0;
  doc["respiration_rate"] = round(respiration_rate * 10) / 10.0;
  doc["heart_rate"] = heart_rate;
  doc["wheeze_detected"] = wheeze_detected;
  doc["wheeze_confidence"] = round(wheeze_confidence * 10) / 10.0;
  doc["cough_detected"] = cough_detected;
  doc["cough_confidence"] = round(cough_confidence * 10) / 10.0;
  doc["temperature"] = round(temperature * 10) / 10.0;
  doc["humidity"] = round(humidity * 10) / 10.0;
  doc["pm25"] = round(pm25 * 10) / 10.0;
  doc["air_quality_index"] = air_quality_index;
  doc["breathing_anomaly_score"] = round(breathing_anomaly_score * 10) / 10.0;
  doc["environmental_risk_score"] = round(environmental_risk_score * 10) / 10.0;
  doc["overall_risk_score"] = round(overall_risk_score * 10) / 10.0;
  
  // Raw environmental data
  DynamicJsonDocument rawData(256);
  rawData["temp_raw"] = temperature;
  rawData["humidity_raw"] = humidity;
  rawData["pm25_raw"] = pm25;
  rawData["sensor_quality"] = "good";
  
  String rawDataString;
  serializeJson(rawData, rawDataString);
  doc["raw_environmental_data"] = rawDataString;
  
  // Current timestamp
  doc["recorded_at"] = getCurrentTimestamp();
  
  // Send to Supabase
  String jsonString;
  serializeJson(doc, jsonString);
  
  HTTPClient http;
  http.begin(String(supabase_url) + "/rest/v1/sensor_data");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabase_anon_key);
  http.addHeader("Authorization", "Bearer " + String(supabase_anon_key));
  http.addHeader("Prefer", "return=minimal");
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("✅ Data sent successfully!");
    
    // Show key metrics like the test script
    String status = wheeze_detected ? "⚠️  WHEEZING" : 
                   cough_detected ? "🤧 COUGH" : 
                   "✅ NORMAL";
    
    Serial.println("📊 Status: " + status);
    Serial.println("   SpO2: " + String(spo2) + "% | Resp: " + String(respiration_rate) + " bpm | Risk: " + String(overall_risk_score) + "%");
    Serial.println("🔄 Dashboard should update in real-time...");
  } else {
    Serial.println("❌ Error sending data: " + String(httpResponseCode));
    String errorResponse = http.getString();
    Serial.println("Error details: " + errorResponse);
  }
  
  http.end();
}

String getCurrentTimestamp() {
  // Get current timestamp in ISO format
  // For now, return a basic timestamp
  // In production, you'd want to sync with NTP server
  
  unsigned long currentTime = millis();
  unsigned long seconds = currentTime / 1000;
  unsigned long minutes = seconds / 60;
  unsigned long hours = minutes / 60;
  
  // Simple timestamp (not accurate, but works for testing)
  String timestamp = "2024-01-20T";
  timestamp += String((hours % 24), DEC);
  timestamp += ":";
  timestamp += String((minutes % 60), DEC);
  timestamp += ":";
  timestamp += String((seconds % 60), DEC);
  timestamp += ".000Z";
  
  return timestamp;
}
