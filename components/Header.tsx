"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

interface HeaderProps {
  currentPage: 'dashboard' | 'history' | 'profile';
}

export default function Header({ currentPage }: HeaderProps) {
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Set mounted state and update time every second
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link href="/dashboard" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm sm:text-lg">BC</span>
              </div>
              <span className="text-lg sm:text-2xl font-semibold text-gray-800">BreathCare</span>
            </Link>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-6">
            {/* Date and Time Display */}
            <div className="hidden md:flex flex-col items-end text-right">
              <div className="text-sm font-medium text-gray-800">
                {mounted ? currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'Loading...'}
              </div>
              <div className="text-xs text-gray-500">
                {mounted ? currentTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                }) : '--:--:--'}
              </div>
            </div>
            
            <nav className="hidden sm:flex items-center space-x-4 lg:space-x-6">
              <Link
                href="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === 'dashboard' 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/history"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === 'history' 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                History
              </Link>
            </nav>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                  className="flex items-center space-x-1 sm:space-x-2 hover:bg-gray-50 rounded-lg px-2 sm:px-3 py-2 transition-colors"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">U</span>
                  </div>
                  <span className="hidden sm:block text-gray-700 font-medium text-sm">Account</span>
                  <svg
                    className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-500 transition-transform ${
                      isAccountDropdownOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isAccountDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 sm:w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <Link
                      href="/profile"
                      onClick={() => setIsAccountDropdownOpen(false)}
                      className="flex items-center w-full px-3 sm:px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        setIsAccountDropdownOpen(false);
                        // Redirect to landing page
                        window.location.href = '/';
                      }}
                      className="flex items-center w-full px-3 sm:px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <div className="sm:hidden mt-4 pt-4 border-t border-gray-200">
          <nav className="flex space-x-1">
            <Link
              href="/dashboard"
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 'dashboard' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/history"
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 'history' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              History
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
