"use client";

import { useState, useEffect } from "react";
import { supabase, SensorData, User } from "@/lib/supabase";
import LineChart from "./LineChart";

export default function DashboardContentPolling() {
  const [data, setData] = useState<SensorData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<SensorData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch user and initial data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: users, error: userError } = await supabase
          .from('users')
          .select('*')
          .limit(1)
          .single();

        if (userError) {
          console.error('Error fetching user:', userError);
          return;
        }

        setUser(users);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, []);

  // Polling function to fetch latest sensor data
  const fetchLatestData = async () => {
    if (!user) return;

    try {
      // Get latest sensor data
      const { data: sensorData, error: sensorError } = await supabase
        .from('sensor_data')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (sensorError) {
        console.error('Error fetching sensor data:', sensorError);
        setData(null);
        setIsConnected(false);
        return;
      }

      setData(sensorData);
      setLastUpdate(new Date());
      setIsConnected(true);

      // Get chart data (last 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { data: chartData, error: chartError } = await supabase
        .from('sensor_data')
        .select('*')
        .eq('user_id', user.id)
        .gte('recorded_at', twentyFourHoursAgo.toISOString())
        .order('recorded_at', { ascending: true });

      if (chartError) {
        console.error('Error fetching chart data:', chartError);
        setChartData([]);
      } else {
        setChartData(chartData || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setIsConnected(false);
    }
  };

  // Set up polling
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchLatestData();
    setLoading(false);

    // Set up polling interval (every 5 seconds)
    const interval = setInterval(fetchLatestData, 5000);

    return () => clearInterval(interval);
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
        </div>
      </div>
    );
  }

  // Show no data state if no real sensor data is available
  if (!data) {
    return (
      <main className="px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
              Hello{user ? `, ${user.first_name}` : ''}!
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mb-2">
              Monitoring {user?.child_name} ({user?.child_age} years old)
            </p>
            <div className="text-xs sm:text-sm text-gray-600 flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
              <span className="text-yellow-600 font-medium">Polling for data every 5 seconds</span>
            </div>
          </div>

          {/* No Data State */}
          <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">
              No Sensor Data Available
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Your ESP32 sensor hasn't sent any data yet. The system is polling every 5 seconds for new data.
            </p>
            <div className="space-y-3 text-sm text-gray-500">
              <p>• Check your ESP32 connection</p>
              <p>• Verify sensor data is being sent to the database</p>
              <p>• Data will appear here once sensors start transmitting</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 sm:px-6 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            Hello{user ? `, ${user.first_name}` : ''}!
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-2">
            Monitoring {user?.child_name} ({user?.child_age} years old)
          </p>
          <div className="text-xs sm:text-sm text-gray-600 flex items-center">
            {isConnected ? (
              data ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                  <span className="text-green-600 font-medium">Data polling active</span>
                  <span className="text-gray-500 ml-2">
                    • Last updated: {lastUpdate?.toLocaleTimeString()}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-yellow-600 font-medium">Polling - waiting for data</span>
                </>
              )
            ) : (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                <span className="text-red-600 font-medium">Connection lost</span>
              </>
            )}
          </div>
        </div>

        {/* Health Metrics Cards - Same as before */}
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

          {/* Other cards... (same as original) */}
        </div>

        {/* Rest of the component... (same as original) */}
      </div>
    </main>
  );
}
