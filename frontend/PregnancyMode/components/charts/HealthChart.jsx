import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const HealthChart = ({ data }) => {
  return (
    <div className="glass-card p-6 h-[400px] w-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-white">Live Heart Rate Trend</h3>
        <div className="flex space-x-2">
          <span className="px-3 py-1 rounded-full bg-white/5 text-xs text-gray-400">Live Sync</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorHr" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="timestamp" 
            hide 
          />
          <YAxis 
            domain={['dataMin - 5', 'dataMax + 5']} 
            stroke="rgba(255,255,255,0.3)" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1a0b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
            itemStyle={{ color: '#fff' }}
          />
          <Area 
            type="monotone" 
            dataKey="heartRate" 
            stroke="#A855F7" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorHr)" 
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};