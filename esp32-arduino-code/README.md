# ESP32 Arduino Code for BreathCare

This directory contains the Arduino code to run on your ESP32 device, converting the `test-esp32-data.js` script to work with actual hardware.

## 📋 Prerequisites

### Hardware Required
- **ESP32 Dev Board** (ESP32-WROOM-32 or similar)
- **WiFi Connection** (2.4GHz network)
- **Sensors** (optional - see sensor setup below)

### Software Required
- **Arduino IDE** (latest version)
- **ESP32 Board Package** (install via Board Manager)
- **Required Libraries** (install via Library Manager)

## 🔧 Setup Instructions

### 1. Install Arduino IDE
1. Download Arduino IDE from https://www.arduino.cc/en/software
2. Install and open Arduino IDE

### 2. Install ESP32 Board Package
1. Open Arduino IDE
2. Go to **File** → **Preferences**
3. Add this URL to **Additional Boards Manager URLs**:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to **Tools** → **Board** → **Boards Manager**
5. Search for "ESP32" and install "ESP32 by Espressif Systems"

### 3. Install Required Libraries
Go to **Tools** → **Manage Libraries** and install:
- **ArduinoJson** by Benoit Blanchon
- **WiFi** (built-in)
- **HTTPClient** (built-in)

### 4. Configure the Code
Open `breathcare_esp32.ino` and update these values:

```cpp
// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Active user ID (get this from the dashboard)
String active_user_id = "YOUR_ACTIVE_USER_ID";
```

### 5. Get Active User ID
1. Run the test script: `node test-esp32-data.js`
2. Copy the user ID from the console output
3. Or check the dashboard and copy the user ID from the browser console

### 6. Upload to ESP32
1. Connect ESP32 to your computer via USB
2. Select your ESP32 board: **Tools** → **Board** → **ESP32 Arduino** → **ESP32 Dev Module**
3. Select the correct port: **Tools** → **Port** → **COM3** (or your port)
4. Click **Upload** button

## 🔌 Hardware Connections (Optional)

If you have sensors, connect them as follows:

### MAX30100 Pulse Oximeter
```
ESP32    MAX30100
21   →   SDA
22   →   SCL
3.3V →   VCC
GND  →   GND
```

### DHT22 Temperature & Humidity
```
ESP32    DHT22
4    →   Data
3.3V →   VCC
GND  →   GND
```

### PMS5003 Air Quality Sensor
```
ESP32    PMS5003
16   →   TX
17   →   RX
5V   →   VCC
GND  →   GND
```

## 📊 Testing

### 1. Basic Test (No Sensors)
The code will work with simulated data even without sensors. You should see:
```
🚀 BreathCare ESP32 started!
📡 Will send data every 10 seconds to Supabase
✅ WiFi connected!
📡 IP address: 192.168.1.100
📡 Sending sensor data...
✅ Data sent successfully!
📊 Status: ✅ NORMAL
   SpO2: 95% | Resp: 15 bpm | Risk: 25%
```

### 2. Check Dashboard
1. Open the dashboard in your browser
2. You should see real-time updates every 10 seconds
3. No page refresh needed!

## 🐛 Troubleshooting

### WiFi Connection Issues
- Check SSID and password are correct
- Ensure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
- Check signal strength

### Data Not Appearing
- Verify active_user_id is correct
- Check Supabase URL and API key
- Look at Serial Monitor for error messages

### Compilation Errors
- Make sure ESP32 board package is installed
- Install all required libraries
- Check Arduino IDE version compatibility

## 📱 Advanced Features

### Real Sensors
To use real sensors, uncomment the sensor library includes and implement the actual reading functions:

```cpp
// Uncomment these lines when you have the hardware
// #include <MAX30100_PulseOximeter.h>
// #include <DHT.h>
// #include <PMS.h>
```

### Custom Data
Modify the `generateSensorData()` function to use your actual sensor readings instead of simulated data.

### Different Intervals
Change `SEND_INTERVAL` to send data more or less frequently:

```cpp
const unsigned long SEND_INTERVAL = 5000; // 5 seconds
```

## 🔄 Data Flow

1. **ESP32** reads sensor data (or generates simulated data)
2. **ESP32** sends HTTP POST to Supabase
3. **Supabase** stores data in `sensor_data` table
4. **Dashboard** receives real-time updates via WebSocket
5. **UI** updates automatically without refresh

## 📞 Support

If you encounter issues:
1. Check the Serial Monitor for error messages
2. Verify all configuration values are correct
3. Test with the Node.js script first to ensure Supabase is working
4. Check the dashboard console for any errors

## 🎯 Next Steps

1. **Test with simulated data** first
2. **Add real sensors** gradually
3. **Customize the data** for your specific use case
4. **Deploy to production** when ready

The ESP32 will now send data to Supabase just like the test script, but using real hardware! 🚀
