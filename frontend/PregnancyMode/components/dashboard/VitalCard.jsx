import { motion } from 'framer-motion';

export const VitalCard = ({ title, value, unit, icon: Icon, color }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="glass-card p-6 relative overflow-hidden group"
    >
      <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-20 blur-2xl rounded-full ${color}`} />
      <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-2xl bg-opacity-10 ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
            <span className="text-xs text-gray-500 uppercase">{unit}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};