/*
  esp32s3_multi_sensor_tflite_dht_supabase.ino
  - Collects data from DHT22, MAX30102, MPU6050, INMP441.
  - Runs TinyML inference (TFLite Micro) for cough/wheeze detection.
  - Uploads all sensor data + prediction to Supabase.
  - PSRAM-safe allocation for large buffers.
*/

/* =============== Includes =============== */
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <ArduinoJson.h>

#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <DHT_U.h>
#include "MAX30105.h"
#include "MPU6050.h"

#include <driver/i2s.h>
#include <esp_heap_caps.h>

#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/schema/schema_generated.h"
#include "tensorflow/lite/micro/kernels/micro_ops.h"

#include "audio_model.h"  // Must exist in sketch folder!

/* =============== Config =============== */
const char* WIFI_SSID = "ZTE_2.4G_w7iTVe";
const char* WIFI_PASSWORD = "$tR!b3ran#";

const char* SUPABASE_URL = "https://ogapdrgcwmzecbwwrmre.supabase.co";
const char* SUPABASE_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYXBkcmdjd216ZWNid3dybXJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM0MjE3MCwiZXhwIjoyMDczOTE4MTcwfQ.7L9zpymxD0nGE6pqk_d6Zs_GqrcBJwNUekUFBdYHLlo";

/* =============== Pins =============== */
#define SDA_PIN 6
#define SCL_PIN 7
#define DHTPIN 4
#define DHTTYPE DHT22
#define I2S_WS 13
#define I2S_SD 11
#define I2S_SCK 12
#define I2S_PORT I2S_NUM_0

/* =============== Constants =============== */
#define SAMPLE_RATE 8000
#define RECORD_TIME_SEC 1
#define SAMPLES (SAMPLE_RATE * RECORD_TIME_SEC)

const unsigned long SENSOR_INTERVAL_MS = 10000UL;
const unsigned long AUDIO_INTERVAL_MS  = 60000UL;

/* =============== Globals =============== */
DHT dht(DHTPIN, DHTTYPE);
MAX30105 maxSensor;
MPU6050 mpu;
WiFiClientSecure wifiClient;
HTTPClient http;

static int16_t *audio_buffer = NULL;
unsigned long lastSensor = 0;
unsigned long lastAudio = 0;

/* =============== TensorFlow Lite =============== */
constexpr int kTensorArenaSizeRequested = 80 * 1024;
constexpr int kTensorArenaSizeFallback  = 60 * 1024;
static uint8_t *tensor_arena = NULL;

tflite::MicroInterpreter* interpreter = nullptr;
TfLiteTensor* model_input = nullptr;
TfLiteTensor* model_output = nullptr;
tflite::MicroMutableOpResolver<12> resolver;

/* =============== Labels =============== */
const int kNumLabels = 3;
const char* labels[kNumLabels] = {"normal", "wheeze", "cough"};

String map_label_to_risk(const String &lbl) {
  if (lbl == "normal") return "safe";
  if (lbl == "wheeze") return "high";
  if (lbl == "cough")  return "medium";
  return "safe";
}

/* =============== I2S Config =============== */
i2s_config_t i2s_cfg = {
  .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
  .sample_rate = SAMPLE_RATE,
  .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
  .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
  .communication_format = I2S_COMM_FORMAT_STAND_I2S,
  .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
  .dma_buf_count = 4,
  .dma_buf_len = 512,
  .use_apll = false
};

i2s_pin_config_t i2s_pins = {
  .bck_io_num = I2S_SCK,
  .ws_io_num = I2S_WS,
  .data_out_num = I2S_PIN_NO_CHANGE,
  .data_in_num = I2S_SD
};

/* =============== Helper Functions =============== */
void print_memory_info() {
  size_t free_internal = heap_caps_get_free_size(MALLOC_CAP_8BIT);
  size_t psram_free = heap_caps_get_free_size(MALLOC_CAP_SPIRAM);
  Serial.printf("Free internal RAM: %u bytes\n", (unsigned)free_internal);
  Serial.printf("Free PSRAM: %u bytes\n", (unsigned)psram_free);
}

/* =============== Setup TensorFlow Lite =============== */
bool setup_tflite_model_safe() {
  const tflite::Model* model = tflite::GetModel(audio_model_tflite);
  if (model->version() != TFLITE_SCHEMA_VERSION) {
    Serial.println("❌ Model schema version mismatch!");
    return false;
  }

  Serial.println("Memory before tensor arena allocation:");
  print_memory_info();

  tensor_arena = (uint8_t *)heap_caps_malloc(kTensorArenaSizeRequested, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
  if (!tensor_arena) {
    Serial.printf("⚠️ Requested %d bytes failed, trying fallback (%d bytes)...\n",
                  kTensorArenaSizeRequested, kTensorArenaSizeFallback);
    tensor_arena = (uint8_t *)heap_caps_malloc(kTensorArenaSizeFallback, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
    if (!tensor_arena) {
      Serial.println("❌ Failed to allocate tensor arena.");
      return false;
    }
  }
  Serial.printf("✅ Allocated requested arena in PSRAM: %d bytes\n", kTensorArenaSizeRequested);

  resolver.AddConv2D();
  resolver.AddDepthwiseConv2D();
  resolver.AddFullyConnected();
  resolver.AddSoftmax();
  resolver.AddReshape();
  resolver.AddMaxPool2D();
  resolver.AddShape();
  resolver.AddStridedSlice();
  resolver.AddPack();

  static tflite::MicroInterpreter static_interpreter(model, resolver, tensor_arena, kTensorArenaSizeRequested);
  interpreter = &static_interpreter;

  if (interpreter->AllocateTensors() != kTfLiteOk) {
    Serial.println("⚠️ AllocateTensors failed — trying smaller fallback arena...");
    heap_caps_free(tensor_arena);
    tensor_arena = (uint8_t *)heap_caps_malloc(kTensorArenaSizeFallback, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
    if (!tensor_arena) {
      Serial.println("❌ AllocateTensors failed even with fallback arena.");
      return false;
    }
    tflite::MicroInterpreter *dynamic_interpreter =
        new tflite::MicroInterpreter(model, resolver, tensor_arena, kTensorArenaSizeFallback);
    interpreter = dynamic_interpreter;
    if (interpreter->AllocateTensors() != kTfLiteOk) {
      Serial.println("❌ AllocateTensors failed again.");
      return false;
    }
  }

  model_input = interpreter->input(0);
  model_output = interpreter->output(0);
  Serial.println("✅ TFLite model loaded (safe mode)");
  print_memory_info();
  return true;
}

/* =============== Capture Audio =============== */
bool capture_1s_audio() {
  if (!audio_buffer) return false;
  int32_t raw32;
  size_t bytes_read = 0;
  for (int i = 0; i < SAMPLES; ++i) {
    if (i2s_read(I2S_PORT, &raw32, sizeof(raw32), &bytes_read, portMAX_DELAY) == ESP_OK && bytes_read == sizeof(raw32)) {
      audio_buffer[i] = (int16_t)(raw32 >> 16);
    } else audio_buffer[i] = 0;
  }
  return true;
}

/* =============== Run Inference =============== */
int run_audio_inference_and_get_label_index() {
  if (!interpreter) return -1;
  TfLiteType type = model_input->type;
  int total = 1;
  for (int i = 0; i < model_input->dims->size; i++) total *= model_input->dims->data[i];

  if (type == kTfLiteFloat32) {
    float *in = model_input->data.f;
    for (int i = 0; i < total; i++) in[i] = (i < SAMPLES) ? (audio_buffer[i] / 32768.0f) : 0.0f;
  }

  if (interpreter->Invoke() != kTfLiteOk) return -1;

  int best = 0;
  float best_score = -1e9;
  float* out = model_output->data.f;
  int out_len = model_output->dims->data[1];
  for (int i = 0; i < out_len; i++) {
    if (out[i] > best_score) { best_score = out[i]; best = i; }
  }
  Serial.printf("✅ Inference done: %s (score=%.3f)\n", labels[best], best_score);
  return best;
}

/* =============== Supabase Upload =============== */
void upload_sensor_row(
  float hr, float spo2, float accel,
  float temp, float hum,
  const String &label, const String &risk
) {
  String url = String(SUPABASE_URL) + "/rest/v1/s3_sensor_data";
  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
  http.addHeader("Prefer", "return=representation");

  DynamicJsonDocument j(512);
  j["device_id"] = "esp32_s3_01";
  j["heart_rate"] = hr;
  j["spo2"] = spo2;
  j["accel_mag"] = accel;
  j["temperature"] = temp;
  j["humidity"] = hum;
  j["prediction_label"] = label;
  j["risk_level"] = risk;

  String payload; serializeJson(j, payload);
  int code = http.POST(payload);

  if (code >= 200 && code < 300) Serial.printf("✅ Data uploaded (%d)\n", code);
  else Serial.printf("❌ Upload failed (%d): %s\n", code, http.getString().c_str());

  http.end();
}

/* =============== Setup =============== */
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("=== ESP32-S3 Multi-Sensor + TinyML (PSRAM-safe) ===");

  size_t audio_bytes = SAMPLES * sizeof(int16_t);
  Serial.printf("Allocating audio buffer: %u bytes\n", (unsigned)audio_bytes);
  audio_buffer = (int16_t *)heap_caps_malloc(audio_bytes, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
  if (!audio_buffer) audio_buffer = (int16_t *)malloc(audio_bytes);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting");
  for (int i = 0; WiFi.status() != WL_CONNECTED && i < 40; i++) {
    delay(250); Serial.print(".");
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? "\n✅ WiFi connected" : "\n❌ WiFi failed");
  wifiClient.setInsecure();

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000);
  dht.begin();

  if (maxSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    maxSensor.setup(); Serial.println("✅ MAX30102 ready");
  } else Serial.println("❌ MAX30102 failed");

  mpu.initialize();
  if (mpu.testConnection()) Serial.println("✅ MPU6050 ready");
  else Serial.println("❌ MPU6050 failed");

  if (i2s_driver_install(I2S_PORT, &i2s_cfg, 0, NULL) != ESP_OK) Serial.println("❌ I2S install failed");
  if (i2s_set_pin(I2S_PORT, &i2s_pins) != ESP_OK) Serial.println("❌ I2S pin failed");
  i2s_zero_dma_buffer(I2S_PORT);
  Serial.println("✅ INMP441 (I2S) ready");

  setup_tflite_model_safe();
}

/* =============== Loop =============== */
void loop() {
  unsigned long now = millis();

  if (now - lastSensor >= SENSOR_INTERVAL_MS) {
    lastSensor = now;

    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();
    long ir = maxSensor.getIR();
    long red = maxSensor.getRed();
    int16_t ax, ay, az;
    mpu.getAcceleration(&ax, &ay, &az);
    float accel = sqrt((float)ax*ax + ay*ay + az*az);

    float scaled_ir = (float)ir / 1000000.0f;
    float scaled_red = (float)red / 1000000.0f;
    float scaled_accel = accel / 10000.0f;

    upload_sensor_row(scaled_ir, scaled_red, scaled_accel, temp, hum, "normal", "safe");
  }

  if (now - lastAudio >= AUDIO_INTERVAL_MS) {
    lastAudio = now;
    Serial.println("🎙 Capturing audio...");
    if (capture_1s_audio() && interpreter) {
      int idx = run_audio_inference_and_get_label_index();
      if (idx >= 0) {
        String lbl = labels[idx];
        String risk = map_label_to_risk(lbl);
        float temp = dht.readTemperature();
        float hum = dht.readHumidity();
        upload_sensor_row(0, 0, 0, temp, hum, lbl, risk);
      }
    } else Serial.println("⚠️ Inference skipped (not ready)");
  }

  delay(50);
}
