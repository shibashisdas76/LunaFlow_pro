import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Phone } from 'lucide-react';

export const EmergencyPopup = ({ alert, onDismiss, onCallSOS }) => {
  if (!alert) return null;

  // When clicked, dismiss the popup AND trigger the main SOS overlay
  const handleSOSClick = () => {
    onDismiss();
    if (onCallSOS) {
      onCallSOS();
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          className="glass-card w-full max-w-md p-8 relative overflow-hidden border border-red-500/30 text-center shadow-[0_0_50px_rgba(239,68,68,0.2)]"
        >
          {/* Background Glow */}
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 blur-[60px] rounded-full pointer-events-none" />

          {/* Icon */}
          <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-6 border border-red-500/30">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">{alert.type || 'Emergency Alert'}</h2>
          <p className="text-gray-300 mb-2">{alert.message || 'Abnormal vitals detected.'}</p>
          <p className="text-xs text-gray-500 mb-8">Time: {alert.timestamp}</p>

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <button 
              onClick={onDismiss}
              className="py-3 px-4 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white transition-colors font-medium text-sm"
            >
              I'm Okay (Dismiss)
            </button>
            
            {/* UPDATED SOS BUTTON */}
            <button 
              onClick={handleSOSClick}
              className="py-3 px-4 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold transition-colors shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center justify-center text-sm"
            >
              <Phone className="w-4 h-4 mr-2" /> Call SOS
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};