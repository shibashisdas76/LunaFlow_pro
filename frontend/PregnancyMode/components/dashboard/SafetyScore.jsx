import { motion } from 'framer-motion';

export const SafetyScore = ({ score = 98 }) => {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="glass-card p-8 flex flex-col items-center justify-center relative overflow-hidden h-full">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-luna-purple/5 blur-[80px] rounded-full" />
      
      <h3 className="text-gray-400 text-sm font-medium mb-6 uppercase tracking-widest">AI Safety Score</h3>
      
      <div className="relative flex items-center justify-center">
        <svg className="w-48 h-48 transform -rotate-90">
          {/* Background Circle */}
          <circle
            cx="96" cy="96" r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-white/5"
          />
          {/* Progress Circle */}
          <motion.circle
            cx="96" cy="96" r={radius}
            stroke="url(#scoreGradient)"
            strokeWidth="10"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 2, ease: "easeOut" }}
            strokeLinecap="round"
            fill="transparent"
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>
        
        <div className="absolute flex flex-col items-center">
          <span className="text-5xl font-bold text-white">{score}%</span>
          <span className="text-green-400 text-xs font-semibold uppercase mt-1 tracking-tighter">Optimal</span>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-300 font-light leading-relaxed">
          Mother & Baby vitals are <span className="text-luna-pink font-medium">highly stable</span>. No risks detected in current patterns.
        </p>
      </div>
    </div>
  );
};