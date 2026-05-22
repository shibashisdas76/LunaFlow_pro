import { motion } from 'framer-motion';
import { Stethoscope, FileText, Video, Share2, Calendar, Clock, ChevronRight } from 'lucide-react';

export const DoctorConnect = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      {/* Left Column: Connected Doctor & Actions */}
      <div className="col-span-1 lg:col-span-5 space-y-6">
        
        {/* Doctor Profile Card */}
        <div className="glass-card p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full" />
          
          <h3 className="text-gray-400 text-sm font-medium mb-6 uppercase tracking-widest">Primary Obstetrician</h3>
          
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative">
              <img 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=DrSarah&style=circle" 
                alt="Dr. Sarah" 
                className="w-20 h-20 rounded-full bg-blue-500/20 p-1 border border-white/10" 
              />
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-[#05010d] rounded-full" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Dr. Sarah Jenkins</h2>
              <p className="text-blue-400 text-sm font-medium">Maternal-Fetal Medicine</p>
              <p className="text-gray-400 text-xs mt-1">City Care Hospital</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <button className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium">
              <Video className="w-4 h-4 text-luna-pink" />
              <span>Video Call</span>
            </button>
            <button className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 transition-colors text-sm font-medium border border-blue-500/30">
              <Share2 className="w-4 h-4" />
              <span>Share Live Vitals</span>
            </button>
          </div>
        </div>

        {/* Generate Report Card */}
        <div className="glass-card p-6 bg-gradient-to-br from-white/5 to-transparent border border-luna-purple/20">
          <div className="flex items-start justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-luna-purple/20 flex items-center justify-center text-luna-purple mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Smart Health Report</h3>
              <p className="text-sm text-gray-400 font-light mb-4">Generate an AI-summarized PDF of your vitals from the past 7 days to send to your doctor.</p>
            </div>
          </div>
          <button className="w-full py-3 rounded-xl bg-luna-gradient text-white font-bold shadow-lg shadow-luna-purple/20 hover:opacity-90 transition-opacity">
            Generate & Send to Dr. Sarah
          </button>
        </div>
      </div>

      {/* Right Column: Appointments & History */}
      <div className="col-span-1 lg:col-span-7 space-y-6">
        
        {/* Upcoming Appointment */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Upcoming Consultation</h3>
            <button className="text-sm text-luna-pink hover:text-luna-purple transition-colors">Reschedule</button>
          </div>
          
          <div className="flex items-center p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-16 h-16 rounded-xl bg-luna-pink/20 flex flex-col items-center justify-center text-luna-pink mr-4 flex-shrink-0">
              <span className="text-xs font-bold uppercase">Oct</span>
              <span className="text-xl font-bold">24</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-white">Routine 24-Week Scan</h4>
              <div className="flex items-center text-gray-400 text-sm mt-1 space-x-4">
                <span className="flex items-center"><Clock className="w-4 h-4 mr-1" /> 10:30 AM</span>
                <span className="flex items-center"><Video className="w-4 h-4 mr-1" /> Telehealth</span>
              </div>
            </div>
            <div className="hidden sm:block">
              <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Previous Reports List */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-4">Shared History</h3>
          <div className="space-y-3">
            {[
              { date: "Oct 10, 2026", title: "Weekly Vitals Summary", status: "Viewed by Doctor" },
              { date: "Oct 03, 2026", title: "Anomalous Heart Rate Alert", status: "Discussed" },
              { date: "Sep 26, 2026", title: "Monthly AI Predictive Risk Report", status: "Viewed by Doctor" },
            ].map((report, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">{report.title}</h4>
                    <p className="text-xs text-gray-500">{report.date}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${report.status.includes('Viewed') ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                  {report.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </motion.div>
  );
};