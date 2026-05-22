import { motion, AnimatePresence } from 'framer-motion';
import { Pill, Droplets, Calendar, AlertTriangle, Check, X, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';

export const SmartNotifications = () => {
  // Mock data for our intelligent notifications
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'alert',
      title: 'Abnormal Heart Rate Spike',
      message: 'Your heart rate reached 115 bpm during rest. We recommend sitting down and taking deep breaths.',
      time: '10 mins ago',
      color: 'text-red-500',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30',
      icon: AlertTriangle
    },
    {
      id: 2,
      type: 'medication',
      title: 'Prenatal Vitamin',
      message: 'Time to take your daily Iron & Folic Acid supplement with food.',
      time: 'Just now',
      color: 'text-luna-pink',
      bgColor: 'bg-luna-pink/20',
      borderColor: 'border-luna-pink/30',
      icon: Pill
    },
    {
      id: 3,
      type: 'hydration',
      title: 'Hydration Goal',
      message: 'You have been active! Drink 250ml of water to stay on track with your daily goal.',
      time: '1 hour ago',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30',
      icon: Droplets
    },
    {
      id: 4,
      type: 'appointment',
      title: 'Upcoming Consultation',
      message: 'Telehealth check-up with Dr. Sarah Jenkins is tomorrow at 10:30 AM.',
      time: '2 hours ago',
      color: 'text-luna-purple',
      bgColor: 'bg-luna-purple/20',
      borderColor: 'border-luna-purple/30',
      icon: Calendar
    }
  ]);

  // --- REAL 1-HOUR WATER REMINDER LOGIC ---
  useEffect(() => {
    // 3,600,000 milliseconds = 1 Hour
    const intervalTime = 3600000; 

    const waterTimer = setInterval(() => {
      const newWaterReminder = {
        id: Date.now(), // Generate a unique ID so React doesn't get confused
        type: 'hydration',
        title: 'Hydration Goal',
        message: 'It has been an hour! Drink 250ml of water to stay on track with your daily goal.',
        time: 'Just now',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
        icon: Droplets
      };

      // Add the new reminder to the top of the list
      setNotifications(prev => [newWaterReminder, ...prev]);
    }, intervalTime);

    return () => clearInterval(waterTimer);
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  // --- "WEAVY" ANIMATION LOGIC ---
  const getAnimationVariants = (type) => {
    if (type === 'hydration') {
      return {
        hidden: { opacity: 0, x: -50, y: 0 },
        visible: { 
          opacity: 1, 
          x: 0, 
          // The "Weavy" Bouncing Entrance
          y: [0, -15, 0, -10, 0, -5, 0], 
          transition: { duration: 1.2, ease: "easeInOut" } 
        },
        exit: { opacity: 0, scale: 0.95, x: 20, transition: { duration: 0.2 } }
      };
    }
    // Default Animation for other notifications
    return {
      hidden: { opacity: 0, scale: 0.95, x: -20 },
      visible: { opacity: 1, scale: 1, x: 0 },
      exit: { opacity: 0, scale: 0.95, x: 20 }
    };
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between glass-card p-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-luna-gradient flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Smart Action Center</h2>
            <p className="text-gray-400 text-sm">You have {notifications.length} pending actions.</p>
          </div>
        </div>
        {notifications.length > 0 && (
          <button 
            onClick={() => setNotifications([])}
            className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Dismiss All
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        <AnimatePresence>
          {notifications.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass-card p-12 flex flex-col items-center justify-center text-center"
            >
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Check className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white">All Caught Up!</h3>
              <p className="text-gray-400 mt-2">Mother and baby are safe and on schedule.</p>
            </motion.div>
          ) : (
            notifications.map((notif) => (
              <motion.div
                key={notif.id}
                variants={getAnimationVariants(notif.type)}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
                className={`glass-card p-5 border-l-4 ${notif.borderColor} relative overflow-hidden group`}
              >
                {/* Subtle background glow based on notification type */}
                <div className={`absolute -right-10 -top-10 w-32 h-32 blur-[50px] rounded-full opacity-20 ${notif.bgColor}`} />
                
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 relative z-10">
                  <div className="flex items-start space-x-4">
                    {/* Continuous Bobbing Animation for the Icon if it's a hydration reminder */}
                    <motion.div 
                      animate={notif.type === 'hydration' ? { y: [0, -4, 0] } : {}}
                      transition={notif.type === 'hydration' ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${notif.bgColor}`}
                    >
                      <notif.icon className={`w-6 h-6 ${notif.color}`} />
                    </motion.div>

                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-lg font-bold text-white">{notif.title}</h4>
                        <span className="text-xs text-gray-500">• {notif.time}</span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed max-w-2xl">{notif.message}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 self-end md:self-center">
                    {notif.type === 'medication' && (
                      <button 
                        onClick={() => removeNotification(notif.id)}
                        className="flex items-center space-x-1 px-4 py-2 rounded-lg bg-luna-pink/20 hover:bg-luna-pink/30 text-luna-pink text-sm font-bold transition-colors border border-luna-pink/30"
                      >
                        <Check className="w-4 h-4" /> <span>Taken</span>
                      </button>
                    )}
                    {notif.type === 'hydration' && (
                      <button 
                        onClick={() => removeNotification(notif.id)}
                        className="flex items-center space-x-1 px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-bold transition-colors border border-blue-500/30"
                      >
                        <Droplets className="w-4 h-4" /> <span>Logged</span>
                      </button>
                    )}
                    {notif.type === 'alert' && (
                      <button 
                        onClick={() => removeNotification(notif.id)}
                        className="flex items-center space-x-1 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-bold transition-colors border border-red-500/30"
                      >
                        <Check className="w-4 h-4" /> <span>I'm Okay</span>
                      </button>
                    )}
                    
                    {/* Universal Dismiss Button */}
                    <button 
                      onClick={() => removeNotification(notif.id)}
                      className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};