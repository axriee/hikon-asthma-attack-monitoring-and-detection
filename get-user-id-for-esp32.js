// Quick script to get the active user ID for ESP32
// Run with: node get-user-id-for-esp32.js

const SUPABASE_URL = 'https://ogapdrgcwmzecbwwrmre.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYXBkcmdjd216ZWNid3dybXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDIxNzAsImV4cCI6MjA3MzkxODE3MH0.5ondVqwEc09dcuO9DsFcOqVl8lctcrI4CIjmhKsua10';

async function getActiveUserIdForESP32() {
  try {
    console.log('🔍 Getting Active User ID for ESP32...');
    console.log('=====================================\n');

    // Get active user
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,first_name,last_name,child_name,child_age&active=eq.true&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (response.ok) {
      const users = await response.json();
      if (users && users.length > 0) {
        const activeUser = users[0];
        console.log('✅ Active User Found:');
        console.log(`   Name: ${activeUser.first_name} ${activeUser.last_name}`);
        console.log(`   Child: ${activeUser.child_name} (${activeUser.child_age} years old)`);
        console.log(`   User ID: ${activeUser.id}`);
        console.log('');
        console.log('📋 Copy this line to your ESP32 code:');
        console.log(`String active_user_id = "${activeUser.id}";`);
        console.log('');
        console.log('🔧 Steps to update ESP32 code:');
        console.log('1. Open breathcare_esp32_simple.ino in Arduino IDE');
        console.log('2. Find the line: String active_user_id = "YOUR_ACTIVE_USER_ID";');
        console.log('3. Replace "YOUR_ACTIVE_USER_ID" with the ID above');
        console.log('4. Update WiFi credentials (ssid and password)');
        console.log('5. Upload to your ESP32');
        console.log('');
        console.log('🎯 Your ESP32 will then send data to this user!');
        return activeUser.id;
      } else {
        console.log('❌ No active user found');
        console.log('💡 Run the test script first: node test-esp32-data.js');
        console.log('💡 Or go to the dashboard and click "Set Active"');
        return null;
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

getActiveUserIdForESP32();
