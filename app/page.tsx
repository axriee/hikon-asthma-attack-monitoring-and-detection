import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50">
      {/* Header */}
      <header className="flex items-center justify-between px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs sm:text-sm lg:text-lg">BC</span>
          </div>
          <span className="text-base sm:text-lg lg:text-2xl font-semibold text-gray-800">BreathCare</span>
        </div>
        <nav className="flex items-center space-x-2 sm:space-x-3 lg:space-x-6">
          <Link 
            href="/login" 
            className="bg-blue-600 text-white px-2 sm:px-3 lg:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs sm:text-sm lg:text-base"
          >
            Login
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="space-y-4 sm:space-y-6 lg:space-y-8">
              <div className="inline-block">
                <span className="bg-blue-600 text-white px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium">
                  Caring alerts for parents
                </span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 leading-tight">
                Gentle monitoring for children with asthma.
              </h1>
              
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 leading-relaxed">
                BreathCare turns your ESP32 sensor data into clear, timely insights. 
                Parents get reassuring notifications and clinicians get trends.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link 
                  href="/login"
                  className="bg-blue-600 text-white px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-center text-sm sm:text-base"
                >
                  Get Started
                </Link>
                <Link 
                  href="/dashboard"
                  className="border-2 border-blue-600 text-blue-600 px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-4 rounded-lg hover:bg-blue-50 transition-colors font-medium text-center text-sm sm:text-base"
                >
                  View Demo
                </Link>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-600 rounded-full flex-shrink-0"></div>
                  <span className="text-xs sm:text-sm lg:text-base text-gray-700">Real-time wheeze and cough detection</span>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-600 rounded-full flex-shrink-0"></div>
                  <span className="text-xs sm:text-sm lg:text-base text-gray-700">SpO2 and respiration trends</span>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-600 rounded-full flex-shrink-0"></div>
                  <span className="text-xs sm:text-sm lg:text-base text-gray-700">Air quality and trigger alerts</span>
                </div>
              </div>
            </div>
            
            {/* Right Column - Visual Placeholder */}
            <div className="flex justify-center order-first lg:order-last">
              <div className="w-full max-w-xs sm:max-w-sm lg:max-w-lg h-48 sm:h-64 md:h-80 lg:h-96 border-2 border-gray-300 rounded-xl bg-gradient-to-br from-blue-50 to-pink-50 flex items-center justify-center">
                <p className="text-gray-500 text-center text-xs sm:text-sm lg:text-lg px-3 sm:px-4">
                  Caring medicine-inspired design<br />
                  to keep families informed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 sm:mt-12 lg:mt-20 text-center pb-4 sm:pb-6 lg:pb-8 px-3 sm:px-4">
        <p className="text-xs sm:text-sm text-gray-500">
          © 2025 BreathCare. Caring tech for easier breathing.
        </p>
      </footer>
    </div>
  );
}
