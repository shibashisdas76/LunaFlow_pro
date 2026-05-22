import { motion } from 'framer-motion';
// UPDATED: Added the 'Mic' icon
import { User, Battery, Bluetooth, Bell, ShieldAlert, Smartphone, Edit3, Settings, Phone, Save, ClipboardList, Plus, Trash2, Mic } from 'lucide-react';
import { useState, useEffect } from 'react';
import { doc, updateDoc, collection, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase'; 

export const UserProfile = ({ user }) => {
  const [toggles, setToggles] = useState({
    medication: true,
    hydration: true,
    sos: true,
    shareData: false
  });

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [routines, setRoutines] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newTime, setNewTime] = useState('');
  
  // --- NEW: Voice Recognition State ---
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (user?.emergencyContact) {
      setContactName(user.emergencyContact.name || '');
      setContactPhone(user.emergencyContact.phone || '');
    }

    if (user?.uid) {
      const unsubscribe = onSnapshot(collection(db, 'users', user.uid, 'routines'), (snapshot) => {
        const fetchedRoutines = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedRoutines.sort((a, b) => a.time.localeCompare(b.time));
        setRoutines(fetchedRoutines);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleToggle = (key) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSaveContact = async () => {
    if (!user?.uid || !contactName || !contactPhone) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        emergencyContact: { name: contactName, phone: contactPhone }
      });
      setTimeout(() => setIsSaving(false), 1000); 
    } catch (error) {
      console.error("Error saving contact:", error);
      setIsSaving(false);
    }
  };

  const handleAddRoutine = async () => {
    if (!user?.uid || !newTask || !newTime) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'routines'), {
        task: newTask,
        time: newTime,
        lastNotified: '' 
      });
      setNewTask('');
      setNewTime('');
    } catch (error) {
      console.error("Error adding routine:", error);
    }
  };

  const handleDeleteRoutine = async (id) => {
    if (!user?.uid) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'routines', id));
    } catch (error) {
      console.error("Error deleting routine:", error);
    }
  };

  // --- NEW: Voice-to-Text & Time Parser Engine ---
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please use Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      parseVoiceCommand(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Microphone error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  // Smart Parser: Extracts the time (e.g. "at 9 am") and fills both boxes!
  const parseVoiceCommand = (text) => {
    let task = text;
    let timeStr = "";

    // Regex looks for "at 8 am", "at 14:00", "by 9:30 pm", etc.
    const timeRegex = /(?:at|by|around)\s+(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i;
    const match = text.match(timeRegex);

    if (match) {
      // Remove the time portion from the task name
      task = text.replace(match[0], '').trim();
      
      let hours = parseInt(match[1]);
      const mins = match[2] || '00';
      const modifier = match[3] ? match[3].toLowerCase().replace(/\./g, '') : null;

      // Convert AM/PM to 24-hour clock for the HTML <input type="time">
      if (modifier === 'pm' && hours < 12) hours += 12;
      if (modifier === 'am' && hours === 12) hours = 0;

      timeStr = `${hours.toString().padStart(2, '0')}:${mins}`;
      setNewTime(timeStr);
    }
    
    // Capitalize the first letter and remove any trailing punctuation
    task = task.charAt(0).toUpperCase() + task.slice(1).replace(/[.,!?]$/, '');
    setNewTask(task);
  };

  const ToggleSwitch = ({ label, description, isOn, toggleKey }) => (
    <div className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
      <div>
        <h4 className="text-white font-medium">{label}</h4>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
      <button onClick={() => handleToggle(toggleKey)} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${isOn ? 'bg-luna-purple' : 'bg-gray-700'}`}>
        <motion.div className="w-4 h-4 bg-white rounded-full shadow-md" animate={{ x: isOn ? 24 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
      </button>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Left Column */}
      <div className="col-span-1 lg:col-span-5 space-y-6">
        
        {/* Mother Profile Card */}
        <div className="glass-card p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-luna-pink/10 blur-[50px] rounded-full" />
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-gray-400 text-sm font-medium uppercase tracking-widest">Mother Profile</h3>
            <button className="text-gray-400 hover:text-white transition-colors"><Edit3 className="w-5 h-5" /></button>
          </div>
          <div className="flex items-center space-x-4 mb-8">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Guest'}`} alt="Profile" className="w-20 h-20 rounded-full bg-luna-purple/20 p-1 border border-white/10" />
            <div>
              <h2 className="text-2xl font-bold text-white capitalize">{user?.name || 'Guest User'}</h2>
              <p className="text-gray-400 text-sm">{user?.email || 'No email provided'}</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2"><span className="text-white font-medium">Week 24</span><span className="text-gray-400">Trimester 2</span></div>
            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: '60%' }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full bg-luna-gradient rounded-full" /></div>
            <p className="text-xs text-gray-500 mt-3 text-center">Estimated Due Date: <span className="text-gray-300 font-medium">August 28, 2026</span></p>
          </div>
        </div>

        {/* SOS Emergency Contact Card */}
        <div className="glass-card p-6 border-l-4 border-l-red-500">
          <div className="flex items-center mb-4 text-red-400">
            <Phone className="w-5 h-5 mr-2" />
            <h3 className="font-bold uppercase tracking-widest text-sm">SOS Emergency Contact</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase">Contact Name</label>
              <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. Mom, Husband" className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase">Phone Number</label>
              <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+91 9876543210" className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50" />
            </div>
            <button onClick={handleSaveContact} className="w-full py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors font-bold flex items-center justify-center border border-red-500/30">
              <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saved!' : 'Save Contact'}
            </button>
          </div>
        </div>

        {/* --- UPDATED: Daily Routine Builder Card with VOICE --- */}
        <div className="glass-card p-6 border-l-4 border-l-luna-purple">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center text-luna-purple">
              <ClipboardList className="w-5 h-5 mr-2" />
              <h3 className="font-bold uppercase tracking-widest text-sm">Custom Daily Routine</h3>
            </div>
          </div>
          
          <p className="text-xs text-gray-400 mb-4">Type manually or tap the microphone and say <span className="text-white italic">"Drink a smoothie at 9 AM"</span>.</p>
          
          <div className="flex items-center space-x-2 mb-6 relative">
            {/* NEW VOICE MIC BUTTON */}
            <button 
              onClick={handleVoiceInput} 
              title="Add by voice"
              className={`p-2.5 rounded-lg transition-colors border ${isListening ? 'bg-red-500/20 text-red-500 border-red-500/50 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'}`}
            >
              <Mic className="w-5 h-5" />
            </button>

            <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-[100px] bg-white/5 border border-white/10 rounded-lg py-2 px-2 text-white text-sm focus:border-luna-purple/50" />
            
            <input 
              type="text" 
              value={newTask} 
              onChange={(e) => setNewTask(e.target.value)} 
              placeholder={isListening ? "Listening..." : "e.g. Prenatal Yoga"} 
              className={`w-full bg-white/5 border rounded-lg py-2 px-3 text-white text-sm placeholder-gray-500 transition-colors ${isListening ? 'border-red-500/50 outline-none' : 'border-white/10 focus:border-luna-purple/50'}`} 
            />
            
            <button onClick={handleAddRoutine} disabled={!newTime || !newTask} className="p-2.5 rounded-lg bg-luna-purple/20 text-luna-purple hover:bg-luna-purple/30 transition-colors disabled:opacity-50">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {routines.length === 0 ? (
              <p className="text-xs text-gray-500 text-center italic py-2">No routines added yet.</p>
            ) : (
              routines.map((routine) => (
                <div key={routine.id} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                  <div className="flex items-center space-x-3">
                    <span className="text-luna-purple font-bold text-sm bg-luna-purple/10 px-2 py-1 rounded">{routine.time}</span>
                    <span className="text-white text-sm">{routine.task}</span>
                  </div>
                  <button onClick={() => handleDeleteRoutine(routine.id)} className="text-gray-500 hover:text-red-400 transition-colors" title="Delete Routine"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Right Column (Preferences) */}
      <div className="col-span-1 lg:col-span-7 space-y-6">
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-white/5"><Settings className="w-6 h-6 text-luna-purple" /><h3 className="text-xl font-bold text-white">System Preferences</h3></div>
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-luna-pink uppercase tracking-widest mb-4 mt-2">Smart Reminders</h4>
            <ToggleSwitch label="Hydration & Nutrition Alerts" description="Receive AI recommendations for daily water and vitamin intake." isOn={toggles.hydration} toggleKey="hydration" />
            <ToggleSwitch label="Medication Reminders" description="Push notifications for prescribed supplements." isOn={toggles.medication} toggleKey="medication" />

            <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-4 mt-8 flex items-center"><ShieldAlert className="w-4 h-4 mr-2" /> Safety & Emergency</h4>
            <ToggleSwitch label="Auto-SOS Fall Detection" description="Automatically alert family and doctors if a sudden impact is detected." isOn={toggles.sos} toggleKey="sos" />
            
            <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4 mt-8">Privacy</h4>
            <ToggleSwitch label="Anonymous Data Sharing" description="Help improve AI maternal risk predictions globally." isOn={toggles.shareData} toggleKey="shareData" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};