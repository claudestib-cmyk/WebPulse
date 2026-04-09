import { Button } from "./ui/button";
import { Activity, Shield } from "lucide-react";
import matrixaLogo from "../../assets/matrixa-logo.png";
import webpulseLogo from "../../assets/webpulse-logo.png";
import globeIcon from "../../assets/globe-icon.png";
import backgroundImage from "../../assets/hero-bg.png";
import { motion } from "motion/react";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      ></div>

      {/* Large ECG Heartbeat Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <motion.svg
          className="absolute top-0 left-0 w-full h-full"
          viewBox="0 0 2000 800"
          preserveAspectRatio="xMidYMid slice"
          animate={{
            x: [0, -1000],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {/* Realistic Hospital ECG Pattern - Repeating */}
          <path
            d="
              M 0 400 L 80 400 
              L 90 390 L 95 400 L 100 410 L 105 400
              L 150 400
              L 155 400 L 160 350 L 165 500 L 170 380 L 175 400
              L 220 400
              L 230 385 L 245 415 L 255 400
              L 350 400
              
              L 430 400 
              L 440 390 L 445 400 L 450 410 L 455 400
              L 500 400
              L 505 400 L 510 350 L 515 500 L 520 380 L 525 400
              L 570 400
              L 580 385 L 595 415 L 605 400
              L 700 400
              
              L 780 400 
              L 790 390 L 795 400 L 800 410 L 805 400
              L 850 400
              L 855 400 L 860 350 L 865 500 L 870 380 L 875 400
              L 920 400
              L 930 385 L 945 415 L 955 400
              L 1050 400
              
              L 1130 400 
              L 1140 390 L 1145 400 L 1150 410 L 1155 400
              L 1200 400
              L 1205 400 L 1210 350 L 1215 500 L 1220 380 L 1225 400
              L 1270 400
              L 1280 385 L 1295 415 L 1305 400
              L 1400 400
              
              L 1480 400 
              L 1490 390 L 1495 400 L 1500 410 L 1505 400
              L 1550 400
              L 1555 400 L 1560 350 L 1565 500 L 1570 380 L 1575 400
              L 1620 400
              L 1630 385 L 1645 415 L 1655 400
              L 1750 400
              
              L 1830 400 
              L 1840 390 L 1845 400 L 1850 410 L 1855 400
              L 1900 400
              L 1905 400 L 1910 350 L 1915 500 L 1920 380 L 1925 400
              L 1970 400
              L 1980 385 L 1995 415 L 2005 400
              L 2100 400
              
              L 2180 400 
              L 2190 390 L 2195 400 L 2200 410 L 2205 400
              L 2250 400
              L 2255 400 L 2260 350 L 2265 500 L 2270 380 L 2275 400
              L 2320 400
              L 2330 385 L 2345 415 L 2355 400
              L 2450 400
              
              L 2530 400 
              L 2540 390 L 2545 400 L 2550 410 L 2555 400
              L 2600 400
              L 2605 400 L 2610 350 L 2615 500 L 2620 380 L 2625 400
              L 2670 400
              L 2680 385 L 2695 415 L 2705 400
              L 2800 400
              
              L 2880 400 
              L 2890 390 L 2895 400 L 2900 410 L 2905 400
              L 2950 400
              L 2955 400 L 2960 350 L 2965 500 L 2970 380 L 2975 400
              L 3020 400
              L 3030 385 L 3045 415 L 3055 400
              L 3150 400
            "
            stroke="white"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </motion.svg>
      </div>

      {/* Floating Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 right-20 w-80 h-80 bg-purple-300/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <header className="relative z-40 bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <motion.div 
              className="flex items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <img 
                src={webpulseLogo} 
                alt="WebPulse Logo" 
                className="h-10 w-auto"
              />
            </motion.div>
            <div className="flex items-center gap-3">
              <img 
                src={matrixaLogo} 
                alt="MATRIXA Logo" 
                className="h-10 w-auto mix-blend-multiply"
              />
              <Button 
                onClick={onLogin}
                variant="ghost"
                className="text-gray-900 hover:bg-black/10 rounded-xl px-6 py-5 border border-gray-900/30 font-medium bg-white/50"
              >
                Login
              </Button>
              <Button 
                onClick={onGetStarted}
                className="bg-purple-600 text-white hover:bg-purple-700 rounded-xl px-8 py-5 shadow-xl font-semibold"
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Main Hero */}
          <div className="text-center py-24 space-y-10 relative">
            <motion.div 
              className="inline-block"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex items-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-full text-sm font-semibold shadow-lg">
                <div className="w-12 h-8 overflow-hidden flex items-center">
                  <motion.svg
                    width="250"
                    height="32"
                    viewBox="0 0 250 32"
                    className="flex-shrink-0"
                    animate={{
                      x: [0, -125],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    {/* Repeating ECG pattern - larger and more detailed */}
                    <path
                      d="M 0 16 L 15 16 L 17 16 L 18 10 L 21 22 L 24 12 L 25 16 L 35 16 L 38 13 L 42 19 L 45 16 L 65 16 L 67 16 L 68 10 L 71 22 L 74 12 L 75 16 L 85 16 L 88 13 L 92 19 L 95 16 L 115 16 L 117 16 L 118 10 L 121 22 L 124 12 L 125 16 L 135 16 L 138 13 L 142 19 L 145 16 L 165 16 L 167 16 L 168 10 L 171 22 L 174 12 L 175 16 L 185 16 L 188 13 L 192 19 L 195 16 L 215 16 L 217 16 L 218 10 L 221 22 L 224 12 L 225 16 L 235 16 L 238 13 L 242 19 L 245 16 L 250 16"
                      stroke="white"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </motion.svg>
                </div>
                Real-Time Website Monitoring
              </div>
            </motion.div>
            
            <motion.h1 
              className="text-7xl lg:text-8xl leading-tight text-gray-900 font-extrabold" 
              style={{ textShadow: '2px 2px 4px rgba(255,255,255,0.5)' }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Monitor Your
              <br />
              Websites
              <span className="block mt-2 text-purple-700 font-extrabold">
                24/7
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-2xl text-gray-800 max-w-3xl mx-auto leading-relaxed font-semibold" 
              style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.5)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              Track uptime, performance, and get instant alerts when something goes wrong. 
              Keep your websites running smoothly.
            </motion.p>

            <motion.div 
              className="flex items-center justify-center gap-5 pt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 20px 25px -5px rgba(147, 51, 234, 0.3), 0 10px 10px -5px rgba(147, 51, 234, 0.2)",
                    "0 25px 50px -12px rgba(147, 51, 234, 0.5), 0 15px 20px -5px rgba(147, 51, 234, 0.3)",
                    "0 20px 25px -5px rgba(147, 51, 234, 0.3), 0 10px 10px -5px rgba(147, 51, 234, 0.2)",
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="rounded-2xl"
              >
                <Button 
                  onClick={onGetStarted}
                  className="bg-purple-600 text-white hover:bg-purple-700 rounded-2xl px-12 py-8 text-xl font-bold hover:scale-110 transition-transform"
                >
                  Get Started Free →
                </Button>
              </motion.div>
              <Button 
                variant="outline"
                className="border-3 border-gray-900 bg-white/80 text-gray-900 hover:bg-white rounded-2xl px-12 py-8 text-xl font-semibold"
              >
                View Demo
              </Button>
            </motion.div>

            {/* ECG Heartbeat Below Buttons */}
            <motion.div
              className="pt-12 pb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
            >
              <div className="relative h-20 overflow-hidden">
                <motion.svg
                  className="absolute top-1/2 left-0 -translate-y-1/2 w-[300%] h-full"
                  viewBox="0 0 3000 200"
                  preserveAspectRatio="none"
                  animate={{
                    x: [0, -1000],
                  }}
                  transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  {/* Ultra-realistic Hospital ECG Pattern */}
                  <path
                    d="
                      M 0 100 L 80 100
                      L 85 98 L 88 100 L 91 102 L 94 100
                      L 130 100
                      L 133 100 L 136 60 L 139 140 L 142 85 L 145 100
                      L 180 100
                      L 190 90 L 210 110 L 220 100
                      L 320 100
                      
                      L 400 100
                      L 405 98 L 408 100 L 411 102 L 414 100
                      L 450 100
                      L 453 100 L 456 60 L 459 140 L 462 85 L 465 100
                      L 500 100
                      L 510 90 L 530 110 L 540 100
                      L 640 100
                      
                      L 720 100
                      L 725 98 L 728 100 L 731 102 L 734 100
                      L 770 100
                      L 773 100 L 776 60 L 779 140 L 782 85 L 785 100
                      L 820 100
                      L 830 90 L 850 110 L 860 100
                      L 960 100
                      
                      L 1040 100
                      L 1045 98 L 1048 100 L 1051 102 L 1054 100
                      L 1090 100
                      L 1093 100 L 1096 60 L 1099 140 L 1102 85 L 1105 100
                      L 1140 100
                      L 1150 90 L 1170 110 L 1180 100
                      L 1280 100
                      
                      L 1360 100
                      L 1365 98 L 1368 100 L 1371 102 L 1374 100
                      L 1410 100
                      L 1413 100 L 1416 60 L 1419 140 L 1422 85 L 1425 100
                      L 1460 100
                      L 1470 90 L 1490 110 L 1500 100
                      L 1600 100
                      
                      L 1680 100
                      L 1685 98 L 1688 100 L 1691 102 L 1694 100
                      L 1730 100
                      L 1733 100 L 1736 60 L 1739 140 L 1742 85 L 1745 100
                      L 1780 100
                      L 1790 90 L 1810 110 L 1820 100
                      L 1920 100
                      
                      L 2000 100
                      L 2005 98 L 2008 100 L 2011 102 L 2014 100
                      L 2050 100
                      L 2053 100 L 2056 60 L 2059 140 L 2062 85 L 2065 100
                      L 2100 100
                      L 2110 90 L 2130 110 L 2140 100
                      L 2240 100
                      
                      L 2320 100
                      L 2325 98 L 2328 100 L 2331 102 L 2334 100
                      L 2370 100
                      L 2373 100 L 2376 60 L 2379 140 L 2382 85 L 2385 100
                      L 2420 100
                      L 2430 90 L 2450 110 L 2460 100
                      L 2560 100
                      
                      L 2640 100
                      L 2645 98 L 2648 100 L 2651 102 L 2654 100
                      L 2690 100
                      L 2693 100 L 2696 60 L 2699 140 L 2702 85 L 2705 100
                      L 2740 100
                      L 2750 90 L 2770 110 L 2780 100
                      L 2880 100
                      
                      L 2960 100
                      L 2965 98 L 2968 100 L 2971 102 L 2974 100
                      L 3010 100
                      L 3013 100 L 3016 60 L 3019 140 L 3022 85 L 3025 100
                      L 3060 100
                      L 3070 90 L 3090 110 L 3100 100
                      L 3200 100
                    "
                    stroke="white"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    opacity="0.8"
                  />
                </motion.svg>
              </div>
            </motion.div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 pb-24 pt-0">
            {/* Basic Plan */}
            <div className="group bg-gradient-to-br from-purple-500 to-pink-400 rounded-3xl p-8 border-3 border-yellow-400 hover:scale-105 transition-all hover:shadow-2xl">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">BASIC PLAN</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold text-white">₱0</span>
                  <span className="text-white/90 text-base">month</span>
                </div>
              </div>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-400 rounded-full p-1 flex-shrink-0 mt-0.5">
                    <Shield className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-white text-sm">Monitor up to 3 Websites</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-400 rounded-full p-1 flex-shrink-0 mt-0.5">
                    <Shield className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-white text-sm">30-minute Interval Checks</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-400 rounded-full p-1 flex-shrink-0 mt-0.5">
                    <Shield className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-white text-sm">Basic Uptime Status</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-400 rounded-full p-1 flex-shrink-0 mt-0.5">
                    <Shield className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-white text-sm">Email Alerts</span>
                </div>
              </div>

              <Button 
                onClick={onGetStarted}
                className="w-full bg-yellow-400 text-purple-700 hover:bg-yellow-300 rounded-full py-3 font-bold text-sm"
              >
                Get Started
              </Button>
            </div>

            {/* Standard Plan - Recommended */}
            <div className="group bg-gradient-to-br from-blue-600 to-purple-500 rounded-3xl p-8 border-3 border-yellow-400 hover:scale-105 transition-all hover:shadow-2xl relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-100 text-purple-700 px-4 py-1 rounded-full text-xs font-bold">
                Recommend
              </div>
              
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">STANDARD PLAN</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold text-white">₱499</span>
                  <span className="text-white/90 text-base">/month</span>
                </div>
              </div>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-400 rounded-full p-1 flex-shrink-0 mt-0.5">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-white text-sm">Monitor up to 10 Websites</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-400 rounded-full p-1 flex-shrink-0 mt-0.5">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-white text-sm">10-minute Interval Checks</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-400 rounded-full p-1 flex-shrink-0 mt-0.5">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-white text-sm">Downtime Logs & History</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-400 rounded-full p-1 flex-shrink-0 mt-0.5">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-white text-sm">Performance Reports</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-400 rounded-full p-1 flex-shrink-0 mt-0.5">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-white text-sm">Priority Email Alerts</span>
                </div>
              </div>

              <Button 
                onClick={onGetStarted}
                className="w-full bg-yellow-400 text-blue-700 hover:bg-yellow-300 rounded-full py-3 font-bold text-sm"
              >
                Get Started
              </Button>
            </div>

            {/* Premium Plan */}
            <div className="group bg-gradient-to-br from-blue-600 to-purple-500 rounded-3xl p-8 border-3 border-yellow-400 hover:scale-105 transition-all hover:shadow-2xl">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">PREMIUM PLAN</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold text-white">₱999</span>
                  <span className="text-white/90 text-base">/month</span>
                </div>
              </div>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-400 rounded-full p-1 flex-shrink-0 mt-0.5">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-white text-sm">Unlimited Websites</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-400 rounded-full p-1 flex-shrink-0 mt-0.5">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-white text-sm">5-minute Interval Checks</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-400 rounded-full p-1 flex-shrink-0 mt-0.5">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-white text-sm">Full Dashboard Access</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-400 rounded-full p-1 flex-shrink-0 mt-0.5">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-white text-sm">Keyword Monitoring</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-400 rounded-full p-1 flex-shrink-0 mt-0.5">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-white text-sm">Daily Performance Analytics</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-400 rounded-full p-1 flex-shrink-0 mt-0.5">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-white text-sm">Real-time Email Alerts</span>
                </div>
              </div>

              <Button 
                onClick={onGetStarted}
                className="w-full bg-yellow-400 text-blue-700 hover:bg-yellow-300 rounded-full py-3 font-bold text-sm"
              >
                Get Started
              </Button>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-500 backdrop-blur-xl border-2 border-purple-400 rounded-[2rem] p-16 text-center mb-24 shadow-2xl">
            <h2 className="text-5xl text-white mb-6 font-extrabold">
              Ready to get started?
            </h2>
            <p className="text-white text-xl mb-10 max-w-2xl mx-auto">
              Join thousands of businesses monitoring their websites with WebPulse
            </p>
            <Button 
              onClick={onGetStarted}
              className="bg-white text-purple-600 hover:bg-purple-50 rounded-2xl px-14 py-8 text-xl font-bold shadow-2xl hover:scale-110 transition-transform"
            >
              Start Monitoring Now
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-white/20 backdrop-blur-sm border-t border-gray-300 py-8">
        <div className="container mx-auto px-6">
          <div className="text-center text-gray-800 text-lg font-medium">
            <p>© 2026 WebPulse. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}