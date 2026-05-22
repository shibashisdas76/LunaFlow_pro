import { motion } from 'framer-motion';
import { Droplets, Moon, Apple, Wind, Calendar, ArrowLeft, TrendingUp, Sparkles } from 'lucide-react';

export const DailyReport = ({ onBack }) => {
  // Animation variants for a smooth staggered entrance
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      initial="hidden" animate="show" exit="hidden" variants={container}
      className="space-y-6"
    >
      {/* Header & Back Button */}
      <motion.div variants={item} className="flex items-center justify-between glass-card p-4">
        <button 
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Dashboard</span>
        </button>
        <div className="flex items-center space-x-2 text-luna-pink bg-luna-pink/10 px-4 py-1.5 rounded-full">
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-bold tracking-wider">TODAY'S SUMMARY</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Score & AI Summary */}
        <motion.div variants={item} className="xl:col-span-1 space-y-6">
          
          {/* Daily Wellness Score */}
          <div className="glass-card p-8 relative overflow-hidden flex flex-col items-center justify-center text-center h-[300px]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-luna-purple/20 blur-[60px] rounded-full" />
            
            <h3 className="text-gray-400 text-sm font-medium tracking-widest uppercase mb-4 z-10">Daily Wellness Score</h3>
            
            <div className="relative z-10 flex items-baseline space-x-2">
              <span className="text-7xl font-bold text-white tracking-tighter">94</span>
              <span className="text-xl text-gray-500 font-medium">/100</span>
            </div>
            
            <div className="mt-4 flex items-center space-x-2 text-green-400 bg-green-400/10 px-3 py-1 rounded-full z-10">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">+2 from yesterday</span>
            </div>
          </div>

          {/* AI Personalized Summary */}
          <div className="glass-card p-6 border border-luna-pink/20 bg-gradient-to-br from-white/5 to-transparent relative">
            <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-luna-gradient flex items-center justify-center shadow-[0_0_15px_rgba(236,72,153,0.5)]">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-3">AI Health Summary</h3>
            <p className="text-gray-300 text-sm leading-relaxed font-light">
              Your vitals have remained remarkably stable throughout the night. Heart rate variability indicates excellent recovery. Minor fluctuations in body temperature are consistent with your current trimester (Week 24). <span className="text-luna-pink font-medium">Both mother and baby are in optimal condition today.</span>
            </p>
          </div>
        </motion.div>

        {/* Right Column: Smart Recommendations Grid */}
        <motion.div variants={item} className="xl:col-span-2">
          <div className="glass-card p-6 h-full">
            <h3 className="text-xl font-bold text-white mb-6">Smart Recommendations</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Hydration */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">Action Needed</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-1">Hydration</h4>
                <p className="text-sm text-gray-400 mb-4">You are slightly behind on fluid intake based on your activity level.</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-300 font-medium">
                    <span>Current: 1.2L</span>
                    <span>Target: 2.5L</span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[48%] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  </div>
                </div>
              </div>

              {/* Sleep */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                    <Moon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-full">Optimal</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-1">Sleep Quality</h4>
                <p className="text-sm text-gray-400 mb-4">Excellent deep sleep phases detected. Restlessness decreased by 12%.</p>
                <div className="p-3 rounded-xl bg-black/20 border border-white/5 text-sm">
                  <span className="text-gray-400 block mb-1 text-xs">AI Suggestion:</span>
                  <span className="text-indigo-300 font-medium">Maintain your 10:30 PM bedtime to keep this circadian rhythm stable.</span>
                </div>
              </div>

              {/* Nutrition */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-green-500/30 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform">
                    <Apple className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-gray-400 bg-white/5 px-2 py-1 rounded-full">On Track</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-1">Nutrition</h4>
                <p className="text-sm text-gray-400 mb-4">Glucose levels indicate a balanced diet over the last 24 hours.</p>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-300"><div className="w-1.5 h-1.5 rounded-full bg-green-400 mr-2" /> Daily Prenatal Vitamin Taken</li>
                  <li className="flex items-center text-sm text-gray-300"><div className="w-1.5 h-1.5 rounded-full bg-orange-400 mr-2" /> Tip: Add Iron-rich foods to dinner</li>
                </ul>
              </div>

              {/* Stress Management */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-luna-purple/30 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-luna-purple/20 flex items-center justify-center text-luna-purple group-hover:scale-110 transition-transform">
                    <Wind className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-full">Relaxed</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-1">Stress Management</h4>
                <p className="text-sm text-gray-400 mb-4">Heart Rate Variability (HRV) shows minimal physiological stress.</p>
                <button className="w-full py-2.5 rounded-xl bg-luna-purple/10 hover:bg-luna-purple/20 text-luna-purple text-sm font-bold transition-colors border border-luna-purple/20">
                  Start 3-Min Breathing Exercise
                </button>
              </div>

            </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
};