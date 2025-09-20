"use client";

import { useState, useEffect } from "react";
import { supabase, SensorData } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import LineChart from "./LineChart";

export default function DashboardContent() {
  const [data, setData] = useState<SensorData | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<SensorData[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const { user, logout } = useAuth();

  // Fetch sensor data for logged-in user
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchSensorData = async () => {
      try {
        setLoading(true);
        
        console.log('Fetching active user data...');

        // Get the currently active user
        const { data: activeUserData, error: activeUserError } = await supabase
          .from('users')
          .select('*')
          .eq('active', true)
          .limit(1);

        if (activeUserError) {
          console.error('Error fetching active user:', activeUserError);
          setData(null);
          setChartData([]);
          return;
        }

        if (!activeUserData || activeUserData.length === 0) {
          console.log('No active user found - checking all users...');
          
          // Check if there are any users at all
          const { data: allUsers } = await supabase
            .from('users')
            .select('id,first_name,last_name,active')
            .limit(5);
          
          console.log('All users in database:', allUsers);
          
          if (allUsers && allUsers.length > 0) {
            console.log('Found users but none are active. Setting first user as active...');
            
            // Set first user as active
            const { error: deactivateError } = await supabase
              .from('users')
              .update({ active: false });
            
            if (!deactivateError) {
              const { error: activateError } = await supabase
                .from('users')
                .update({ active: true })
                .eq('id', allUsers[0].id);
              
              if (!activateError) {
                console.log('Set first user as active, retrying...');
                // Retry fetching active user
                const { data: retryActiveUser } = await supabase
                  .from('users')
                  .select('*')
                  .eq('active', true)
                  .limit(1);
                
                if (retryActiveUser && retryActiveUser.length > 0) {
                  console.log('Retry successful, active user found:', retryActiveUser[0]);
                  // Continue with the retry data
                  const activeUser = retryActiveUser[0];
                  // Continue with sensor data fetching...
                  const { data: sensorData, error: sensorError } = await supabase
                    .from('sensor_data')
                    .select('*')
                    .eq('user_id', activeUser.id)
                    .order('recorded_at', { ascending: false })
                    .limit(1);

                  if (sensorError) {
                    console.error('Error fetching sensor data:', sensorError);
                    setData(null);
                  } else if (sensorData && sensorData.length > 0) {
                    console.log('Fetched sensor data:', sensorData[0]);
                    setData(sensorData[0]);
                  } else {
                    console.log('No sensor data found for active user');
                    setData(null);
                  }

                  // Get chart data
                  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                  const { data: chartData, error: chartError } = await supabase
                    .from('sensor_data')
                    .select('*')
                    .eq('user_id', activeUser.id)
                    .gte('recorded_at', twentyFourHoursAgo.toISOString())
                    .order('recorded_at', { ascending: true });

                  if (chartError) {
                    console.error('Error fetching chart data:', chartError);
                    setChartData([]);
                  } else {
                    console.log('Fetched chart data:', chartData?.length || 0, 'records');
                    setChartData(chartData || []);
                  }

                  setIsConnected(true);
                  return;
                }
              }
            }
          }
          
          setData(null);
          setChartData([]);
          return;
        }

        const activeUser = activeUserData[0];
        console.log('Active user:', activeUser);

        // Get latest sensor data for active user
        const { data: sensorData, error: sensorError } = await supabase
          .from('sensor_data')
          .select('*')
          .eq('user_id', activeUser.id)
          .order('recorded_at', { ascending: false })
          .limit(1);

        if (sensorError) {
          console.error('Error fetching sensor data:', sensorError);
          console.error('Error details:', JSON.stringify(sensorError, null, 2));
          setData(null);
        } else if (sensorData && sensorData.length > 0) {
          console.log('✅ Fetched sensor data successfully:', sensorData[0]);
          console.log('📊 Data preview:', {
            spo2: sensorData[0].spo2,
            respiration_rate: sensorData[0].respiration_rate,
            wheeze_detected: sensorData[0].wheeze_detected,
            recorded_at: sensorData[0].recorded_at
          });
          setData(sensorData[0]);
        } else {
          console.log('⚠️ No sensor data found for active user:', activeUser.id);
          console.log('💡 Make sure the test script is running and sending data');
          setData(null);
        }

        // Get chart data (last 24 hours) for active user
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const { data: chartData, error: chartError } = await supabase
          .from('sensor_data')
          .select('*')
          .eq('user_id', activeUser.id)
          .gte('recorded_at', twentyFourHoursAgo.toISOString())
          .order('recorded_at', { ascending: true });

        if (chartError) {
          console.error('Error fetching chart data:', chartError);
          setChartData([]);
        } else {
          console.log('Fetched chart data:', chartData?.length || 0, 'records');
          setChartData(chartData || []);
        }

        setIsConnected(true);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsConnected(false);
      } finally {
        setLoading(false);
      }
    };

        fetchSensorData();
      }, [user]);

  // Set up real-time subscription for sensor data updates (for active user)
  useEffect(() => {
    if (!user) return;

    console.log('🔌 Setting up WebSocket connection for active user data...');
    
    const channel = supabase
      .channel(`sensor_data_changes_active`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen to INSERT events (new data)
          schema: 'public',
          table: 'sensor_data'
        },
        async (payload) => {
          console.log('📡 Real-time sensor data update received:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newData = payload.new as SensorData;
            
            // Get current active user to check if this data is for them
            const { data: activeUserData } = await supabase
              .from('users')
              .select('*')
              .eq('active', true)
              .limit(1);
              
            if (activeUserData && activeUserData.length > 0) {
              const activeUser = activeUserData[0];
              if (newData.user_id === activeUser.id) {
                console.log('✅ Updating sensor data with real-time data for active user:', newData);
                setIsUpdating(true);
                setData(newData);
                setTimeout(() => setIsUpdating(false), 1000); // Reset after 1 second
                
                // Refresh chart data with real-time data
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const { data: newChartData } = await supabase
                  .from('sensor_data')
                  .select('*')
                  .eq('user_id', activeUser.id)
                  .gte('recorded_at', twentyFourHoursAgo.toISOString())
                  .order('recorded_at', { ascending: true });

                if (newChartData) {
                  console.log('📊 Updated chart data with real-time data:', newChartData.length, 'records');
                  setChartData(newChartData);
                }
              } else {
                console.log('📡 Data received for different user, ignoring...');
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 WebSocket subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ WebSocket connected successfully!');
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('❌ WebSocket connection lost');
          setIsConnected(false);
        }
      });

    return () => {
      console.log('🧹 Cleaning up WebSocket subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fallback polling mechanism (every 5 seconds)
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up polling fallback...');
    
    const pollInterval = setInterval(async () => {
      try {
        // Get current active user
        const { data: activeUserData } = await supabase
          .from('users')
          .select('*')
          .eq('active', true)
          .limit(1);

        if (activeUserData && activeUserData.length > 0) {
          const activeUser = activeUserData[0];
          
          // Get latest sensor data
          const { data: sensorData } = await supabase
            .from('sensor_data')
            .select('*')
            .eq('user_id', activeUser.id)
            .order('recorded_at', { ascending: false })
            .limit(1);

          if (sensorData && sensorData.length > 0) {
            const latestData = sensorData[0];
            
            // Only update if we have new data (compare timestamps)
            setData(prevData => {
              if (!prevData || new Date(latestData.recorded_at) > new Date(prevData.recorded_at)) {
                console.log('🔄 Polling: Updated with new data');
                setIsUpdating(true);
                setTimeout(() => setIsUpdating(false), 1000); // Reset after 1 second
                return latestData;
              }
              return prevData;
            });
          }
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => {
      console.log('🧹 Cleaning up polling interval');
      clearInterval(pollInterval);
    };
  }, [user]);


  const getRiskLevel = (risk: number | null) => {
    if (!risk) return { level: "UNKNOWN", color: "text-gray-600" };
    if (risk < 25) return { level: "LOW", color: "text-green-600" };
    if (risk < 50) return { level: "MODERATE", color: "text-yellow-600" };
    return { level: "HIGH", color: "text-red-600" };
  };

  const riskInfo = getRiskLevel(data?.overall_risk_score || null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching active user and sensor data...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if no user
  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Please Log In</h2>
          <p className="text-gray-600 mb-6">You need to be logged in to view the dashboard.</p>
          <a 
            href="/login" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span>Go to Login</span>
          </a>
        </div>
      </div>
    );
  }



  return (
    <main className="px-4 sm:px-6 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto">

        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
                Hello{user ? `, ${user.first_name}` : ''}!
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mb-2">
                {user ? `Monitoring active user's data` : 'Welcome to BreathCare'}
              </p>
              {/* Debug info */}
              <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
                {data ? (
                  <>
                    <span className="text-green-600">✅ Data loaded</span>
                    <span className="text-gray-400">•</span>
                    <span>Last update: {new Date(data.recorded_at).toLocaleTimeString()}</span>
                    {isUpdating ? (
                      <>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-blue-600">Updating...</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-600">Live</span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-yellow-600">⚠️ No data - Check console for details</span>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={async () => {
                  try {
                    console.log('Setting user as active:', user.id);
                    
                    // First, set all users to inactive
                    const { error: deactivateError } = await supabase
                      .from('users')
                      .update({ active: false });
                    
                    if (deactivateError) {
                      console.error('Error deactivating all users:', deactivateError);
                      alert(`Error: ${deactivateError.message}`);
                      return;
                    }
                    
                    // Then, set current user as active
                    const { error: activateError } = await supabase
                      .from('users')
                      .update({ active: true })
                      .eq('id', user.id);
                    
                    if (activateError) {
                      console.error('Error setting active user:', activateError);
                      alert(`Error setting active user: ${activateError.message}`);
                    } else {
                      console.log('Set user as active successfully');
                      alert('You are now the active user! ESP32 will send data to you.');
                      // Refresh the page to show updated data
                      window.location.reload();
                    }
                  } catch (error) {
                    console.error('Error:', error);
                    alert(`Error setting active user: ${error.message}`);
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Set Active</span>
              </button>
              
              <button
                onClick={async () => {
                  try {
                    console.log('Setting user as inactive:', user.id);
                    const { error } = await supabase
                      .from('users')
                      .update({ active: false })
                      .eq('id', user.id);
                    if (error) {
                      console.error('Error setting inactive:', error);
                      alert(`Error setting inactive: ${error.message}`);
                    } else {
                      console.log('Set user as inactive successfully');
                      alert('You are now inactive. ESP32 will not send data to you.');
                      // Refresh the page to show updated data
                      window.location.reload();
                    }
                  } catch (error) {
                    console.error('Error:', error);
                    alert(`Error setting inactive: ${error.message}`);
                  }
                }}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Set Inactive</span>
              </button>
            </div>
          </div>
            <div className="text-xs sm:text-sm text-gray-600 flex items-center">
              {isConnected ? (
                data ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                    <span className="text-green-600 font-medium">Live data connected</span>
                    <span className="text-gray-500 ml-2">
                      • Last updated: {new Date(data.recorded_at).toLocaleTimeString()}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="text-yellow-600 font-medium">Connected - waiting for data</span>
                  </>
                )
              ) : (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-red-600 font-medium">Connection lost</span>
                </>
              )}
            </div>
            
            {/* Connection Status */}
            <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center">
                <span className="font-medium">Device Status:</span> 
                <span className="ml-1 text-gray-500">Ready to monitor</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium">Connection:</span>
                {isConnected ? (
                  <span className="ml-1 text-green-600 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                    Live
                  </span>
                ) : (
                  <span className="ml-1 text-red-600 flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                    Offline
                  </span>
                )}
              </div>
            </div>
        </div>

            {/* Health Metrics Cards - 8 Essential Sensors */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
              {/* Wheezing Detection Card */}
              <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6 relative card-hover">
                <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Wheezing
                  </h3>
                  <div className={`w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 rounded-full ${data?.wheeze_detected ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                </div>
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 mb-1">
                  {data?.wheeze_detected ? 'DETECTED' : 'CLEAR'}
                </div>
                <div className="text-xs text-gray-500">
                  Confidence: {data?.wheeze_confidence?.toFixed(1) || '5.2'}%
                </div>
              </div>

              {/* Cough Detection Card */}
              <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6 relative card-hover">
                <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Cough Detection
                  </h3>
                  <div className={`w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 rounded-full ${data?.cough_detected ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                </div>
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 mb-1">
                  {data?.cough_detected ? 'DETECTED' : 'CLEAR'}
                </div>
                <div className="text-xs text-gray-500">
                  Confidence: {data?.cough_confidence?.toFixed(1) || '3.1'}%
                </div>
              </div>

              {/* Breathing Rate Card */}
              <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6 relative card-hover">
                <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Breathing Rate
                  </h3>
                  <div className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 border border-gray-300 rounded"></div>
                </div>
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 mb-1">
                  {data?.respiration_rate?.toFixed(1) || '12.5'} bpm
                </div>
                <div className="text-xs text-gray-500">
                  chest movement
                </div>
              </div>

              {/* SpO2 Card */}
              <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6 relative card-hover">
                <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    SpO2
                  </h3>
                  <div className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 border border-gray-300 rounded"></div>
                </div>
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 mb-1">
                  {data?.spo2?.toFixed(1) || '97.2'}%
                </div>
                <div className="text-xs text-gray-500">
                  pulse oximeter
                </div>
              </div>

              {/* Temperature Card */}
              <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6 relative card-hover">
                <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Temperature
                  </h3>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-red-500">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15 13V5a3 3 0 0 0-6 0v8a5 5 0 1 0 6 0z"/>
                    </svg>
                  </div>
                </div>
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 mb-1">
                  {data?.temperature?.toFixed(1) || '22.5'}°C
                </div>
                <div className="text-xs text-gray-500">
                  environment
                </div>
              </div>

              {/* Humidity Card */}
              <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6 relative card-hover">
                <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Humidity
                  </h3>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-blue-500">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                  </div>
                </div>
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 mb-1">
                  {data?.humidity?.toFixed(1) || '45.2'}%
                </div>
                <div className="text-xs text-gray-500">
                  relative humidity
                </div>
              </div>

              {/* PM2.5 Card */}
              <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6 relative card-hover">
                <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    PM2.5
                  </h3>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-500">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                    </svg>
                  </div>
                </div>
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 mb-1">
                  {data?.pm25?.toFixed(1) || '8.9'} µg/m³
                </div>
                <div className="text-xs text-gray-500">
                  air quality
                </div>
              </div>

              {/* Overall Risk Card */}
              <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6 relative card-hover">
                <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Overall Risk
                  </h3>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-red-500">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </div>
                </div>
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 mb-1">
                  {data?.overall_risk_score?.toFixed(1) || '15.0'}%
                </div>
                <div className={`text-xs font-medium ${riskInfo.color}`}>
                  {riskInfo.level}
                </div>
              </div>
            </div>

        {/* Trends Chart */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Health Trends</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Live Data</span>
            </div>
          </div>
          
          <div className="h-60 sm:h-80 rounded-lg relative overflow-hidden border border-gray-200">
            {chartData.length > 0 ? (
              <div className="absolute inset-0">
                <LineChart data={chartData} />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-center text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium">No data available</p>
                  <p className="text-xs mt-1">Data will appear here as sensor readings are collected</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
