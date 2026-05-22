import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Phone, X } from 'lucide-react';

export const EmergencyPopup = ({ alert, onDismiss }) => {
  if (!alert) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Blurred dark background */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* The Alert Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md p-6 bg-[#1a0b2e] border-2 border-red-500/50 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.3)] z-10"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-red-500/20 rounded-full animate-pulse">
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{alert.type}</h2>
              <p className="text-red-200">{alert.message}</p>
              <p className="text-xs text-gray-500 mt-2">Time: {alert.timestamp}</p>
            </div>

            <div className="flex w-full space-x-3 mt-6">
              <button 
                onClick={onDismiss}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors font-medium"
              >
                I'm Okay (Dismiss)
              </button>
              <button className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold flex items-center justify-center space-x-2 shadow-lg shadow-red-500/30 transition-all">
                <Phone className="w-5 h-5" />
                <span>Call SOS</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};