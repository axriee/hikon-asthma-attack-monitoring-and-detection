"use client";

import { useState, useEffect } from "react";
import { supabase, SensorData, User } from "@/lib/supabase";

export default function HistoryContent() {
  const [user, setUser] = useState<User | null>(null);
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [filteredData, setFilteredData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(24); // hours
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'moderate' | 'high'>('all');
  const [dateFilter, setDateFilter] = useState<{
    startDate: string;
    endDate: string;
  }>({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get first user for demo
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

        // Get sensor data history for the selected date range
        const startDate = new Date(dateFilter.startDate);
        const endDate = new Date(dateFilter.endDate);
        endDate.setHours(23, 59, 59, 999);

        const { data: sensorHistory, error: sensorError } = await supabase
          .from('sensor_data')
          .select('*')
          .eq('user_id', users.id)
          .gte('recorded_at', startDate.toISOString())
          .lte('recorded_at', endDate.toISOString())
          .order('recorded_at', { ascending: false });

        if (sensorError) {
          console.error('Error fetching sensor history:', sensorError);
        } else {
          setSensorData(sensorHistory || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateFilter]);

  // Filter data based on risk level and date range
  useEffect(() => {
    let filtered = [...sensorData];

    // Filter by risk level
    if (riskFilter !== 'all') {
      filtered = filtered.filter(reading => {
        const risk = reading.overall_risk_score;
        if (!risk) return false;
        
        switch (riskFilter) {
          case 'low':
            return risk < 25;
          case 'moderate':
            return risk >= 25 && risk < 50;
          case 'high':
            return risk >= 50;
          default:
            return true;
        }
      });
    }

    // Filter by date range
    const startDate = new Date(dateFilter.startDate);
    const endDate = new Date(dateFilter.endDate);
    endDate.setHours(23, 59, 59, 999); // Include the entire end date

    filtered = filtered.filter(reading => {
      const readingDate = new Date(reading.recorded_at);
      return readingDate >= startDate && readingDate <= endDate;
    });

    setFilteredData(filtered);
  }, [sensorData, riskFilter, dateFilter]);

  const getRiskLevel = (risk: number | null) => {
    if (!risk) return { level: "UNKNOWN", color: "text-gray-600", bgColor: "bg-gray-100" };
    if (risk < 25) return { level: "LOW", color: "text-green-600", bgColor: "bg-green-100" };
    if (risk < 50) return { level: "MODERATE", color: "text-yellow-600", bgColor: "bg-yellow-100" };
    return { level: "HIGH", color: "text-red-600", bgColor: "bg-red-100" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="px-4 sm:px-6 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 mb-3 sm:mb-4">
            <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-800">Health History</h1>
            
            {/* Risk Level Filter */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as 'all' | 'low' | 'moderate' | 'high')}
              className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 bg-white text-xs sm:text-sm"
            >
              <option value="all" className="text-gray-900">All Risk Levels</option>
              <option value="low" className="text-gray-900">Low Risk (&lt; 25%)</option>
              <option value="moderate" className="text-gray-900">Moderate Risk (25-50%)</option>
              <option value="high" className="text-gray-900">High Risk (&gt; 50%)</option>
            </select>
          </div>
          
          {/* Filters */}
          <div className="space-y-3 sm:space-y-4">
            {/* Date Range Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <span className="text-xs sm:text-sm font-medium text-gray-900">Date Range:</span>
              <div className="flex flex-row items-center space-x-2">
                <input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 bg-white text-xs sm:text-sm flex-1"
                />
                <span className="text-gray-500 text-xs sm:text-sm">to</span>
                <input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 bg-white text-xs sm:text-sm flex-1"
                />
              </div>
            </div>

            {/* Quick Time Range Buttons */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button
                onClick={() => {
                  const today = new Date();
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);
                  setDateFilter({
                    startDate: yesterday.toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0]
                  });
                }}
                className="px-2 sm:px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Last 24h
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const threeDaysAgo = new Date(today);
                  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                  setDateFilter({
                    startDate: threeDaysAgo.toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0]
                  });
                }}
                className="px-2 sm:px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Last 3 days
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const weekAgo = new Date(today);
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  setDateFilter({
                    startDate: weekAgo.toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0]
                  });
                }}
                className="px-2 sm:px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Last week
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const monthAgo = new Date(today);
                  monthAgo.setMonth(monthAgo.getMonth() - 1);
                  setDateFilter({
                    startDate: monthAgo.toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0]
                  });
                }}
                className="px-2 sm:px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Last month
              </button>
            </div>
          </div>
        </div>


        {/* History Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-800">Recent Readings</h2>
          </div>
          
          {filteredData.length === 0 ? (
            <div className="p-4 sm:p-6 lg:p-8 text-center text-gray-700">
              <p className="text-xs sm:text-sm lg:text-base">
                {sensorData.length === 0 
                  ? "No sensor data found for the selected time range." 
                  : "No readings match the current filters. Try adjusting your date range or risk level filter."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      SpO2
                    </th>
                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Resp
                    </th>
                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      AQI
                    </th>
                    <th className="hidden sm:table-cell px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Wheeze
                    </th>
                    <th className="hidden sm:table-cell px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Cough
                    </th>
                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Risk
                    </th>
                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Env Risk
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((reading) => {
                    const riskInfo = getRiskLevel(reading.overall_risk_score);
                    return (
                      <tr key={reading.id} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs text-gray-900">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 text-xs">
                              {new Date(reading.recorded_at).toLocaleDateString()}
                            </span>
                            <span className="text-gray-700 text-xs">
                              {new Date(reading.recorded_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs text-gray-900">
                          {reading.spo2?.toFixed(1) || 'N/A'}%
                        </td>
                        <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs text-gray-900">
                          {reading.respiration_rate?.toFixed(1) || 'N/A'}
                        </td>
                        <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs text-gray-900">
                          {reading.air_quality_index || 'N/A'}
                        </td>
                        <td className="hidden sm:table-cell px-3 lg:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs text-gray-900">
                          <div className="flex items-center space-x-1">
                            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${reading.wheeze_detected ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                            <span className="text-xs">{reading.wheeze_detected ? 'Yes' : 'No'}</span>
                            {reading.wheeze_confidence && (
                              <span className="text-xs text-gray-500">({reading.wheeze_confidence.toFixed(0)}%)</span>
                            )}
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-3 lg:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs text-gray-900">
                          <div className="flex items-center space-x-1">
                            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${reading.cough_detected ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                            <span className="text-xs">{reading.cough_detected ? 'Yes' : 'No'}</span>
                            {reading.cough_confidence && (
                              <span className="text-xs text-gray-500">({reading.cough_confidence.toFixed(0)}%)</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap">
                          <span className={`inline-flex px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs font-semibold rounded-full ${riskInfo.bgColor} ${riskInfo.color}`}>
                            {reading.overall_risk_score?.toFixed(1) || 'N/A'}%
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs text-gray-900">
                          <span className={`inline-flex px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs font-semibold rounded-full ${
                            (reading.environmental_risk_score || 0) < 25 ? 'bg-green-100 text-green-800' :
                            (reading.environmental_risk_score || 0) < 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {reading.environmental_risk_score?.toFixed(1) || 'N/A'}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
