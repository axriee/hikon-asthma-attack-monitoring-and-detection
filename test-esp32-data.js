// Test script to simulate ESP32 sending data directly to Supabase
// Run with: node test-esp32-data.js

// ========================================
// CONFIGURATION - UPDATE THESE VALUES
// ========================================
const SUPABASE_URL = 'https://ogapdrgcwmzecbwwrmre.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYXBkcmdjd216ZWNid3dybXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDIxNzAsImV4cCI6MjA3MzkxODE3MH0.5ondVqwEc09dcuO9DsFcOqVl8lctcrI4CIjmhKsua10';

// ACTIVE USER SYSTEM
// The ESP32 will automatically send data to the currently active user
// No need to specify user ID - it finds the active user automatically

// Direct Supabase API endpoint (same as ESP32 will use)
const API_URL = `${SUPABASE_URL}/rest/v1/sensor_data`;

// Global variables for user management
let activeUser = null;

// Simulate realistic sensor data with some variation
function generateSensorData(userId) {
  const now = new Date();
  
  // Generate some realistic variations
  const spo2 = 95 + (Math.random() - 0.5) * 8; // 91-99
  const respiration_rate = 15 + (Math.random() - 0.5) * 4; // 13-17
  const heart_rate = Math.floor(70 + (Math.random() - 0.5) * 16); // 62-78
  const temperature = 22 + (Math.random() - 0.5) * 6; // 19-25°C
  const humidity = 45 + (Math.random() - 0.5) * 16; // 37-53%
  const pm25 = 8 + Math.random() * 15; // 8-23 µg/m³
  
  // Wheezing and cough detection (lower chance for more realistic data)
  const wheeze_detected = Math.random() < 0.05; // 5% chance
  const cough_detected = Math.random() < 0.03; // 3% chance
  
  // Calculate risk scores based on actual values
  const breathing_anomaly_score = wheeze_detected ? 20 + Math.random() * 30 : Math.random() * 15;
  const environmental_risk_score = (pm25 > 20 ? 15 : 5) + Math.random() * 20;
  const overall_risk_score = (breathing_anomaly_score + environmental_risk_score) / 2;
  
  return {
    user_id: userId,
    spo2: Math.round(spo2 * 10) / 10,
    respiration_rate: Math.round(respiration_rate * 10) / 10,
    heart_rate: heart_rate,
    wheeze_detected: wheeze_detected,
  
    cough_detected: cough_detected,
  
    temperature: Math.round(temperature * 10) / 10,
   
    pm25: Math.round(pm25 * 10) / 10,
    air_quality_index: Math.floor(30 + pm25 * 2), // AQI based on PM2.5
    breathing_anomaly_score: Math.round(breathing_anomaly_score * 10) / 10,
    environmental_risk_score: Math.round(environmental_risk_score * 10) / 10,
    overall_risk_score: Math.round(overall_risk_score * 10) / 10,
    // Raw sensor data (optional - for ML processing)
    raw_environmental_data: JSON.stringify({
      temp_raw: temperature,
      humidity_raw: humidity,
      pm25_raw: pm25,
      sensor_quality: Math.random() > 0.1 ? "good" : "fair"
    }),
    recorded_at: now.toISOString()
  };
}

async function sendSensorDataToActiveUser() {
  try {
    if (!activeUser) {
      console.log('⚠️  No active user found. Skipping data transmission...');
      return;
    }

    console.log(`📡 [${new Date().toLocaleTimeString()}] Sending data to active user: ${activeUser.first_name} ${activeUser.last_name}`);
    
    const sensorData = generateSensorData(activeUser.id);
    
    // Show key metrics in a nice format
    const status = sensorData.wheeze_detected ? '⚠️  WHEEZING' : 
                   sensorData.cough_detected ? '🤧 COUGH' : 
                   '✅ NORMAL';
    
    console.log(`   👤 ${activeUser.first_name} ${activeUser.last_name} (${activeUser.child_name}): ${status}`);
    console.log(`      SpO2: ${sensorData.spo2}% | Resp: ${sensorData.respiration_rate} bpm | Risk: ${sensorData.overall_risk_score}%`);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(sensorData)
    });
    
    if (response.ok) {
      console.log(`      ✅ Data sent to ${activeUser.first_name}`);
      console.log('🔄 Dashboard should update in real-time...');
    } else {
      const errorText = await response.text();
      console.error(`      ❌ Error sending to ${activeUser.first_name}:`, response.status, errorText);
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Get the currently active user
async function getActiveUser() {
  try {
    console.log('🔍 Looking for active user...');
    
    // Get active user directly from users table
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,first_name,last_name,child_name,child_age&active=eq.true&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (response.ok) {
      const users = await response.json();
      if (users && users.length > 0) {
        activeUser = users[0];
        console.log(`✅ Found active user: ${activeUser.first_name} ${activeUser.last_name} (${activeUser.child_name}, ${activeUser.child_age} yrs)`);
        return activeUser;
      } else {
        console.log('⚠️  No active user found. Will try to set first user as active...');
        return await setFirstUserActive();
      }
    } else {
      console.error('❌ Error fetching active user:', await response.text());
      return null;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return null;
  }
}

// Set the first user as active if no active user exists
async function setFirstUserActive() {
  try {
    console.log('🔧 Setting first user as active...');
    
    // Get all users
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,first_name,last_name,child_name,child_age&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (response.ok) {
      const users = await response.json();
      if (users && users.length > 0) {
        const firstUser = users[0];
        
        // Set this user as active using direct update
        // First, set all users to inactive
        const deactivateResponse = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ active: false })
        });

        if (!deactivateResponse.ok) {
          console.error('Error deactivating all users:', await deactivateResponse.text());
          return null;
        }

        // Then, set the first user as active
        const setActiveResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${firstUser.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ active: true })
        });

        if (setActiveResponse.ok) {
          activeUser = firstUser;
          console.log(`✅ Set ${firstUser.first_name} ${firstUser.last_name} as active user`);
          return activeUser;
        } else {
          console.error('❌ Error setting active user:', await setActiveResponse.text());
          return null;
        }
      } else {
        console.error('❌ No users found in database');
        return null;
      }
    } else {
      console.error('❌ Error fetching users:', await response.text());
      return null;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return null;
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting ESP32 data simulation...');
  console.log('📡 Sending data every 10 seconds to Supabase');
  console.log('🔗 Supabase URL:', SUPABASE_URL);
  console.log('💡 Note: This will send data to the ACTIVE user only');
  console.log('⏰ Press Ctrl+C to stop\n');

  // Get active user
  const user = await getActiveUser();
  
  if (!user) {
    console.error('❌ Could not find or set an active user. Please check your database.');
    process.exit(1);
  }

  // Send initial data to active user
  await sendSensorDataToActiveUser();

  // Set up interval (every 10 seconds for more exciting demo)
  const interval = setInterval(() => sendSensorDataToActiveUser(), 10000);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping data simulation...');
    clearInterval(interval);
    process.exit(0);
  });
}

// Start the simulation
main().catch(console.error);
