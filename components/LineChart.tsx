"use client";

import { SensorData } from "@/lib/supabase";

interface LineChartProps {
  data: SensorData[];
}

export default function LineChart({ data }: LineChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  // Sort data by time
  const sortedData = [...data].sort((a, b) => 
    new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

      // Get min and max values for scaling - using AQI instead of PM2.5 for better visualization
      const aqiValues = sortedData.map(d => d.air_quality_index || 0).filter(v => !isNaN(v) && isFinite(v));
      const respirationValues = sortedData.map(d => d.respiration_rate || 0).filter(v => !isNaN(v) && isFinite(v));
      const spo2Values = sortedData.map(d => d.spo2 || 0).filter(v => !isNaN(v) && isFinite(v));
      const riskValues = sortedData.map(d => d.overall_risk_score || 0).filter(v => !isNaN(v) && isFinite(v));

  const allValues = [...aqiValues, ...respirationValues, ...spo2Values, ...riskValues];
  const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100;
  const range = maxValue - minValue || 1;

  // Normalize values to 0-100 for chart display
  const normalize = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return 50; // Default to middle if invalid
    return ((value - minValue) / range) * 80 + 10; // 10-90% of chart height
  };

  // Generate SVG path for line
  const createPath = (values: number[], color: string, startX: number, startY: number, width: number, height: number) => {
    if (values.length < 2) return null;

    const points = values.map((value, index) => {
      const x = startX + (index / (values.length - 1)) * width;
      const y = startY + height - ((value - minValue) / (maxValue - minValue)) * height;

      // Ensure x and y are valid numbers
      if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
        return null;
      }

      return `${x},${y}`;
    }).filter(Boolean);

    if (points.length < 2) return null;

    return (
      <path
        d={`M ${points.join(' L ')}`}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    );
  };

  // Generate dots for data points
  const createDots = (values: number[], color: string, startX: number, startY: number, width: number, height: number) => {
    if (values.length === 0) return null;

    return values.map((value, index) => {
      const x = startX + (index / (values.length - 1)) * width;
      const y = startY + height - ((value - minValue) / (maxValue - minValue)) * height;

      // Ensure x and y are valid numbers
      if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
        return null;
      }
      
      return (
        <g key={index}>
          {/* Outer glow */}
          <circle
            cx={x}
            cy={y}
            r="6"
            fill={color}
            opacity="0.2"
          />
          {/* Main dot */}
          <circle
            cx={x}
            cy={y}
            r="4"
            fill={color}
            stroke="white"
            strokeWidth="2"
            className="hover:r-5 transition-all cursor-pointer"
          />
        </g>
      );
    }).filter(Boolean);
  };

  return (
    <div className="h-full w-full relative bg-white rounded-lg border border-gray-200">
      <svg
        viewBox="0 0 800 400"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Definitions */}
        <defs>
          {/* Gradient for area fills */}
          <linearGradient id="pm25Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05"/>
          </linearGradient>
          <linearGradient id="respirationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05"/>
          </linearGradient>
          <linearGradient id="spo2Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.05"/>
          </linearGradient>
          <linearGradient id="riskGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05"/>
          </linearGradient>
        </defs>

        {/* Chart area */}
        <rect x="60" y="40" width="720" height="320" fill="none" stroke="#e5e7eb" strokeWidth="1" rx="8"/>
        
        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map(i => (
          <g key={i}>
            <line 
              x1="60" 
              y1={80 + i * 60} 
              x2="780" 
              y2={80 + i * 60} 
              stroke="#f3f4f6" 
              strokeWidth="1"
            />
            <text 
              x="50" 
              y={85 + i * 60} 
              fontSize="12" 
              fill="#6b7280" 
              textAnchor="end"
              className="font-medium"
            >
              {Math.round(maxValue - (i * (maxValue - minValue) / 4))}
            </text>
          </g>
        ))}

        {/* Time labels */}
        {sortedData.length > 0 && (
          <>
            <text x="60" y="380" fontSize="12" fill="#6b7280" textAnchor="start" className="font-medium">
              {new Date(sortedData[0].recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </text>
            <text x="780" y="380" fontSize="12" fill="#6b7280" textAnchor="end" className="font-medium">
              {new Date(sortedData[sortedData.length - 1].recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </text>
          </>
        )}

        {/* Chart lines with better scaling */}
        {createPath(aqiValues, '#ef4444', 60, 80, 720, 240)} {/* Red for AQI */}
        {createPath(respirationValues, '#3b82f6', 60, 80, 720, 240)} {/* Blue for Respiration */}
        {createPath(spo2Values, '#10b981', 60, 80, 720, 240)} {/* Green for SpO2 */}
        {createPath(riskValues, '#8b5cf6', 60, 80, 720, 240)} {/* Purple for Risk */}

        {/* Data points */}
        {createDots(aqiValues, '#ef4444', 60, 80, 720, 240)}
        {createDots(respirationValues, '#3b82f6', 60, 80, 720, 240)}
        {createDots(spo2Values, '#10b981', 60, 80, 720, 240)}
        {createDots(riskValues, '#8b5cf6', 60, 80, 720, 240)}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex flex-wrap justify-center gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-600 font-medium">Air Quality (AQI)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600 font-medium">Breathing Rate</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600 font-medium">SpO2 (%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-gray-600 font-medium">Risk Score</span>
          </div>
        </div>
      </div>
    </div>
  );
}
