import { motion } from 'framer-motion';
import { HeartPulse, Shield, Activity, ArrowRight } from 'lucide-react';

export const Landing = ({ onStart, onSignIn }) => { // ADDED onSignIn prop
  return (
    <div className="min-h-screen bg-[#05010d] text-white flex flex-col relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-luna-purple/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-luna-pink/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 md:p-8 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-luna-gradient flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            <HeartPulse className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-wide hidden sm:block">LunaClip</span>
        </div>
        <div className="hidden md:flex space-x-8 text-sm font-medium text-gray-300">
          <a href="#" className="hover:text-white transition-colors">How it Works</a>
          <a href="#" className="hover:text-white transition-colors">Features</a>
          <a href="#" className="hover:text-white transition-colors">For Doctors</a>
        </div>
        {/* UPDATED: Sign In Button */}
        <button 
          onClick={onSignIn} 
          className="px-6 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10 -mt-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center space-x-2 glass-card px-4 py-2 mb-8 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase text-gray-300">Next-Gen Maternal Care</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Monitor. Protect. <br className="hidden sm:block"/>
            <span className="bg-clip-text text-transparent bg-luna-gradient">Nurture.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
            The world's most advanced AI-powered wearable for pregnant women. Continuous health monitoring for a safer, peaceful pregnancy journey.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            {/* UPDATED: Connect Device calls onStart (which now opens Auth) */}
            <button 
              onClick={onStart}
              className="px-8 py-4 rounded-2xl bg-luna-gradient text-white font-bold text-lg flex items-center space-x-3 hover:shadow-[0_0_40px_rgba(236,72,153,0.4)] transition-all hover:-translate-y-1 w-full sm:w-auto justify-center"
            >
              <span>Connect Device & Start</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="px-8 py-4 rounded-2xl glass-card text-white font-medium text-lg hover:bg-white/5 transition-all w-full sm:w-auto">
              View Demo
            </button>
          </div>
        </motion.div>

        {/* Floating Feature Pills */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="mt-16 md:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 max-w-4xl w-full"
        >
          {[
            { icon: Activity, title: "Real-time Vitals", desc: "Heart rate & SpO2 syncing" },
            { icon: Shield, title: "Fall Detection", desc: "Auto-SOS emergency alerts" },
            { icon: HeartPulse, title: "AI Health Score", desc: "Predictive risk analysis" }
          ].map((feature, idx) => (
            <div key={idx} className="glass-card p-4 md:p-6 flex flex-col items-center text-center">
              <feature.icon className="w-8 h-8 text-luna-pink mb-4" />
              <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-400 hidden sm:block">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
};