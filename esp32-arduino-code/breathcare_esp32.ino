/*
 * BreathCare ESP32 Sensor Data Sender
 * 
 * This code sends sensor data to Supabase database
 * Based on the test-esp32-data.js script
 * 
 * Hardware Requirements:
 * - ESP32 Dev Board
 * - MAX30100 Pulse Oximeter (SpO2, Heart Rate)
 * - DHT22 Temperature & Humidity Sensor
 * - PMS5003 Air Quality Sensor (PM2.5)
 * - Microphone for audio analysis
 * - Accelerometer for breathing detection
 * 
 * Libraries Required:
 * - WiFi.h (built-in)
 * - HTTPClient.h (built-in)
 * - ArduinoJson.h (install from Library Manager)
 * - MAX30100lib.h (install from Library Manager)
 * - DHT.h (install from Library Manager)
 * - PMS.h (install from Library Manager)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

// ========================================
// CONFIGURATION - UPDATE THESE VALUES
// ========================================
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Supabase configuration
const char* supabase_url = "https://ogapdrgcwmzecbwwrmre.supabase.co";
const char* supabase_anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYXBkcmdjd216ZWNid3dybXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDIxNzAsImV4cCI6MjA3MzkxODE3MH0.5ondVqwEc09dcuO9DsFcOqVl8lctcrI4CIjmhKsua10";

// Active user ID (get this from the dashboard)
String active_user_id = "YOUR_ACTIVE_USER_ID";

// Sensor pins (adjust based on your hardware)
#define SPO2_SDA_PIN 21
#define SPO2_SCL_PIN 22
#define TEMP_PIN 4
#define HUMIDITY_PIN 5
#define PM25_RX_PIN 16
#define PM25_TX_PIN 17
#define MICROPHONE_PIN A0
#define ACCELEROMETER_PIN A1

// Sensor libraries (uncomment when you have the hardware)
// #include <MAX30100_PulseOximeter.h>
// #include <DHT.h>
// #include <PMS.h>

// Global variables
// PulseOximeter pox;
// DHT dht(TEMP_PIN, DHT22);
// PMS pms(Serial2);
// PMS::DATA data;

// Data sending interval (10 seconds like the test script)
const unsigned long SEND_INTERVAL = 10000; // 10 seconds
unsigned long lastSendTime = 0;

void setup() {
  Serial.begin(115200);
  
  // Initialize sensors
  initializeSensors();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Get active user ID (you can hardcode this or get it from a config)
  getActiveUserID();
  
  Serial.println("🚀 BreathCare ESP32 started!");
  Serial.println("📡 Will send data every 10 seconds to Supabase");
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

void initializeSensors() {
  Serial.println("🔧 Initializing sensors...");
  
  // Initialize I2C for MAX30100
  Wire.begin(SPO2_SDA_PIN, SPO2_SCL_PIN);
  
  // Initialize DHT sensor
  // dht.begin();
  
  // Initialize PMS sensor
  // Serial2.begin(9600, SERIAL_8N1, PM25_RX_PIN, PM25_TX_PIN);
  
  // Initialize pulse oximeter
  // if (!pox.begin()) {
  //   Serial.println("❌ MAX30100 initialization failed");
  // } else {
  //   Serial.println("✅ MAX30100 initialized");
  // }
  
  Serial.println("✅ Sensor initialization complete");
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
  // For now, you need to manually set this
  // In a real implementation, you might get this from:
  // - A config file on SD card
  // - A web interface
  // - Hardcoded for your specific use case
  
  if (active_user_id == "YOUR_ACTIVE_USER_ID") {
    Serial.println("⚠️  Please update active_user_id in the code!");
    Serial.println("💡 Get the user ID from the dashboard or run: node get-active-user-id.js");
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
  
  // Read sensor values
  float spo2 = readSpO2();
  float respiration_rate = readRespirationRate();
  int heart_rate = readHeartRate();
  bool wheeze_detected = detectWheezing();
  float wheeze_confidence = getWheezeConfidence();
  bool cough_detected = detectCough();
  float cough_confidence = getCoughConfidence();
  float temperature = readTemperature();
  float humidity = readHumidity();
  float pm25 = readPM25();
  
  // Calculate derived values
  int air_quality_index = calculateAQI(pm25);
  float breathing_anomaly_score = calculateBreathingAnomaly(wheeze_detected, wheeze_confidence);
  float environmental_risk_score = calculateEnvironmentalRisk(temperature, humidity, pm25);
  float overall_risk_score = (breathing_anomaly_score + environmental_risk_score) / 2.0;
  
  // Create JSON payload (same structure as test script)
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
    Serial.println("✅ Data sent successfully! Response: " + response);
    
    // Show key metrics like the test script
    String status = wheeze_detected ? "⚠️  WHEEZING" : 
                   cough_detected ? "🤧 COUGH" : 
                   "✅ NORMAL";
    
    Serial.println("📊 Status: " + status);
    Serial.println("   SpO2: " + String(spo2) + "% | Resp: " + String(respiration_rate) + " bpm | Risk: " + String(overall_risk_score) + "%");
  } else {
    Serial.println("❌ Error sending data: " + String(httpResponseCode));
    String errorResponse = http.getString();
    Serial.println("Error details: " + errorResponse);
  }
  
  http.end();
}

// ========================================
// SENSOR READING FUNCTIONS
// ========================================

float readSpO2() {
  // Implement your SpO2 sensor reading
  // For now, return simulated data like the test script
  return 95.0 + random(-5, 5);
}

float readRespirationRate() {
  // Implement your respiration rate sensor reading
  // For now, return simulated data like the test script
  return 15.0 + random(-3, 3);
}

int readHeartRate() {
  // Implement your heart rate sensor reading
  // For now, return simulated data like the test script
  return 75 + random(-10, 10);
}

bool detectWheezing() {
  // Implement your wheezing detection algorithm
  // For now, return simulated data like the test script (5% chance)
  return random(0, 100) < 5;
}

float getWheezeConfidence() {
  // Implement your wheezing confidence calculation
  // For now, return simulated data like the test script
  return random(0, 100);
}

bool detectCough() {
  // Implement your cough detection algorithm
  // For now, return simulated data like the test script (3% chance)
  return random(0, 100) < 3;
}

float getCoughConfidence() {
  // Implement your cough confidence calculation
  // For now, return simulated data like the test script
  return random(0, 100);
}

float readTemperature() {
  // Implement your temperature sensor reading
  // For now, return simulated data like the test script
  return 22.0 + random(-3, 3);
}

float readHumidity() {
  // Implement your humidity sensor reading
  // For now, return simulated data like the test script
  return 45.0 + random(-10, 10);
}

float readPM25() {
  // Implement your PM2.5 sensor reading
  // For now, return simulated data like the test script
  return 10.0 + random(0, 20);
}

// ========================================
// CALCULATION FUNCTIONS
// ========================================

int calculateAQI(float pm25) {
  // Simple AQI calculation based on PM2.5 (same as test script)
  return (int)(30 + pm25 * 2);
}

float calculateBreathingAnomaly(bool wheeze, float wheeze_conf) {
  // Same calculation as test script
  if (wheeze) {
    return 20.0 + random(0, 30);
  }
  return random(0, 15);
}

float calculateEnvironmentalRisk(float temp, float humidity, float pm25) {
  // Same calculation as test script
  float risk = 5.0;
  if (pm25 > 20) risk += 15.0;
  if (temp > 25 || temp < 18) risk += 10.0;
  if (humidity > 60 || humidity < 30) risk += 5.0;
  return risk + random(0, 20);
}

String getCurrentTimestamp() {
  // Get current timestamp in ISO format
  // You might need to implement NTP time sync for accurate timestamps
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    // Fallback to a basic timestamp
    return "2024-01-20T15:30:00.000Z";
  }
  
  char timeString[25];
  strftime(timeString, sizeof(timeString), "%Y-%m-%dT%H:%M:%S.000Z", &timeinfo);
  return String(timeString);
}
