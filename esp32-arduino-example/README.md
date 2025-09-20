# ESP32/Arduino Integration Guide

This guide shows how to send sensor data from your ESP32 to the BreathCare Supabase database.

## Required Libraries

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
```

## Database Schema

The ESP32 must send data in this exact format to match the database schema:

```json
{
  "user_id": "uuid-string",
  "spo2": 95.5,
  "respiration_rate": 14.2,
  "heart_rate": 85,
  "wheeze_detected": false,
  "wheeze_confidence": 15.2,
  "cough_detected": false,
  "cough_confidence": 8.5,
  "temperature": 22.5,
  "humidity": 45.2,
  "pm25": 12.3,
  "air_quality_index": 50,
  "breathing_anomaly_score": 20.0,
  "environmental_risk_score": 25.0,
  "overall_risk_score": 25.0,
  "raw_environmental_data": "{\"temp_raw\": 22.5, \"humidity_raw\": 45.2, \"pm25_raw\": 12.3, \"sensor_quality\": \"good\"}",
  "recorded_at": "2024-01-20T15:30:00.000Z"
}
```

## Complete Arduino Code

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
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
#define PM25_PIN 6
#define MICROPHONE_PIN A0
#define ACCELEROMETER_PIN A1

// Sensor libraries (install these)
// #include <MAX30100_PulseOximeter.h>
// #include <DHT.h>
// #include <Adafruit_Sensor.h>

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("WiFi connected!");
  
  // Initialize sensors
  initializeSensors();
  
  // Send data every 30 seconds
  sendSensorData();
}

void loop() {
  // Send data every 30 seconds
  delay(30000);
  sendSensorData();
}

void initializeSensors() {
  // Initialize your sensors here
  // Example:
  // pulseOximeter.begin();
  // dht.begin();
  // etc.
}

void sendSensorData() {
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
  
  // Create JSON payload
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
  http.begin(supabase_url + "/rest/v1/sensor_data");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabase_anon_key);
  http.addHeader("Authorization", "Bearer " + String(supabase_anon_key));
  http.addHeader("Prefer", "return=minimal");
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Data sent successfully! Response: " + response);
  } else {
    Serial.println("Error sending data: " + String(httpResponseCode));
  }
  
  http.end();
}

// Sensor reading functions (implement based on your hardware)
float readSpO2() {
  // Implement your SpO2 sensor reading
  return 95.0 + random(-5, 5);
}

float readRespirationRate() {
  // Implement your respiration rate sensor reading
  return 15.0 + random(-3, 3);
}

int readHeartRate() {
  // Implement your heart rate sensor reading
  return 75 + random(-10, 10);
}

bool detectWheezing() {
  // Implement your wheezing detection algorithm
  return random(0, 100) < 5; // 5% chance
}

float getWheezeConfidence() {
  // Implement your wheezing confidence calculation
  return random(0, 100);
}

bool detectCough() {
  // Implement your cough detection algorithm
  return random(0, 100) < 3; // 3% chance
}

float getCoughConfidence() {
  // Implement your cough confidence calculation
  return random(0, 100);
}

float readTemperature() {
  // Implement your temperature sensor reading
  return 22.0 + random(-3, 3);
}

float readHumidity() {
  // Implement your humidity sensor reading
  return 45.0 + random(-10, 10);
}

float readPM25() {
  // Implement your PM2.5 sensor reading
  return 10.0 + random(0, 20);
}

int calculateAQI(float pm25) {
  // Simple AQI calculation based on PM2.5
  return (int)(30 + pm25 * 2);
}

float calculateBreathingAnomaly(bool wheeze, float wheeze_conf) {
  if (wheeze) {
    return 20.0 + random(0, 30);
  }
  return random(0, 15);
}

float calculateEnvironmentalRisk(float temp, float humidity, float pm25) {
  float risk = 5.0;
  if (pm25 > 20) risk += 15.0;
  if (temp > 25 || temp < 18) risk += 10.0;
  if (humidity > 60 || humidity < 30) risk += 5.0;
  return risk + random(0, 20);
}

String getCurrentTimestamp() {
  // Get current timestamp in ISO format
  // You might need to implement NTP time sync for accurate timestamps
  return "2024-01-20T15:30:00.000Z";
}
```

## Getting the Active User ID

1. Login to the dashboard
2. Click "Set Active" to become the active user
3. Check the browser console or database to get your user ID
4. Update the `active_user_id` variable in your Arduino code

## Testing

1. Run the test script: `node test-esp32-data.js`
2. Check the dashboard to see real-time data
3. Use the Arduino code as a template for your ESP32

## Database Fields Explained

- **Core Health**: `spo2`, `respiration_rate`, `heart_rate`
- **Acoustic Analysis**: `wheeze_detected`, `wheeze_confidence`, `cough_detected`, `cough_confidence`
- **Environmental**: `temperature`, `humidity`, `pm25`, `air_quality_index`
- **ML Outputs**: `breathing_anomaly_score`, `environmental_risk_score`, `overall_risk_score`
- **Raw Data**: `raw_environmental_data` (JSON string)
- **Timestamps**: `recorded_at` (ISO format)

## Error Handling

The ESP32 should handle:
- WiFi connection failures
- HTTP request timeouts
- JSON serialization errors
- Sensor reading failures

## Security Notes

- The anon key is safe to use in client applications
- User ID should be obtained securely from the dashboard
- Consider implementing device authentication for production use
