import React, { useEffect, useState } from 'react';
import { Heart, Activity, Droplets, LayoutDashboard, User, ShieldCheck, Stethoscope, Bell, LogOut, Pill, CheckCircle2, Phone, AlertTriangle, Save, Radio, History, X, ClipboardList, Usb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, collection, onSnapshot, updateDoc, addDoc, query, orderBy, limit } from 'firebase/firestore';

// Components
import { VitalCard } from './components/dashboard/VitalCard';
import { EmergencyPopup } from './components/alerts/EmergencyPopup';
import { HealthChart } from './components/charts/HealthChart'; 
import { Landing } from './components/common/Landing'; 
import { DoctorConnect } from './components/doctor/DoctorConnect'; 
import { UserProfile } from './components/profile/UserProfile';
import { DailyReport } from './components/reports/DailyReport';
import { SmartNotifications } from './components/notifications/SmartNotifications';
import { AuthPage } from './components/auth/AuthPage'; 
import { MedicationTracker } from './components/medications/MedicationTracker';

function App() {
  const [appState, setAppState] = useState('landing'); 
  const [currentView, setCurrentView] = useState('dashboard'); 
  const [user, setUser] = useState({ name: '', email: '', uid: null }); 

  const [inputMode, setInputMode] = useState('sensor');
  const [vitals, setVitals] = useState({ heartRate: '--', spo2: '--', hemoglobin: '--' });
  const [history, setHistory] = useState([]); 
  const [activeAlert, setActiveAlert] = useState(null);

  const [manualInputs, setManualInputs] = useState({ heartRate: '', spo2: '', hemoglobin: '' });
  const [vitalsHistory, setVitalsHistory] = useState([]);

  const [userMeds, setUserMeds] = useState([]);
  const [userRoutines, setUserRoutines] = useState([]); 
  const [ringingAlarm, setRingingAlarm] = useState(null);
  const [sosState, setSosState] = useState(null); 
  const [sosCountdown, setSosCountdown] = useState(3);
  
  // --- HARDWARE STATES ---
  const [hardwareFallDetected, setHardwareFallDetected] = useState(false);
  const [usbStatus, setUsbStatus] = useState('disconnected'); // Tracks USB Serial Connection
  
  const guardianName = user?.emergencyContact?.name || "Emergency Services"; 
  const [smartPopups, setSmartPopups] = useState([]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const hr = parseInt(manualInputs.heartRate) || 0;
    const spo2 = parseInt(manualInputs.spo2) || 0;
    const hb = parseFloat(manualInputs.hemoglobin) || 0;

    setVitals({ heartRate: hr, spo2: spo2, hemoglobin: hb.toFixed(1) });

    if (user.uid) {
      await addDoc(collection(db, 'users', user.uid, 'vitals_log'), {
        heartRate: hr, spo2: spo2, hemoglobin: hb, timestamp: new Date().toISOString(), type: 'Manual'
      });
      setManualInputs({ heartRate: '', spo2: '', hemoglobin: '' });
    }
  };

  useEffect(() => {
    if (appState === 'app' && user.uid) {
      const q = query(collection(db, 'users', user.uid, 'vitals_log'), orderBy('timestamp', 'desc'), limit(20));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const histData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setVitalsHistory(histData);
        if (histData.length > 0) {
          const chartData = [...histData].reverse().map(entry => ({
            heartRate: entry.heartRate, spo2: entry.spo2, hemoglobin: entry.hemoglobin,
            timestamp: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
          setHistory(chartData);
        }
      });
      return () => unsubscribe();
    }
  }, [appState, user.uid]);

  useEffect(() => {
    if (appState !== 'app') return;
    const intervalTime = 60000; 
    const popupTimer = setInterval(() => {
      setSmartPopups(prev => [...prev, { id: `water-${Date.now()}`, type: 'water' }]);
    }, intervalTime);
    return () => clearInterval(popupTimer);
  }, [appState]);


  // =========================================================================
  // --- REAL HARDWARE: USB WEB SERIAL API ---
  // =========================================================================
  const connectUSBCable = async () => {
    if (!('serial' in navigator)) {
      alert("Your browser does not support Web Serial. Please use Google Chrome or Microsoft Edge on a Desktop.");
      return;
    }

    try {
      // 1. Request permission to access the USB Port
      const port = await navigator.serial.requestPort();
      
      // 2. Open the port at 115200 baud rate (Must match Arduino code!)
      await port.open({ baudRate: 115200 });
      setUsbStatus('connected');
      console.log("🟢 USB Cable Connected!");

      // 3. Set up the data reader
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();

      let buffer = '';

      // 4. Listen for data constantly
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          reader.releaseLock();
          break;
        }

        // Add the new chunk of data to our buffer
        buffer += value;
        
        // Split by newlines because data comes in chunks
        let lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop(); 

        for (let line of lines) {
          line = line.trim();
          if (line.startsWith('{') && line.endsWith('}')) {
            try {
              const hardwareData = JSON.parse(line);
              
              // Update Screen!
              setVitals({ 
                heartRate: hardwareData.hr || '--', 
                spo2: hardwareData.spo2 || '--', 
                hemoglobin: hardwareData.hb || '--' 
              });

              // Check Fall Detection
              if (hardwareData.fallDetected && !hardwareFallDetected && !sosState) {
                console.warn("🚨 HARDWARE ALERT: Fall Detected by USB MPU6050!");
                setHardwareFallDetected(true);
                setActiveAlert({
                  type: 'HARDWARE FALL DETECTED',
                  message: 'LunaClip detected a sudden impact. Triggering Auto-SOS...',
                  timestamp: new Date().toLocaleTimeString(),
                  isFall: true 
                });
              }

            } catch (err) {
              console.error("JSON Parse Error:", err);
            }
          }
        }
      }
    } catch (error) {
      console.error("USB Connection Error:", error);
      setUsbStatus('disconnected');
    }
  };

  useEffect(() => {
    // Clear vitals if we switch out of sensor mode
    if (inputMode !== 'sensor') {
      setVitals({ heartRate: '--', spo2: '--', hemoglobin: '--' });
    }
  }, [inputMode]);
  // =========================================================================

  useEffect(() => {
    let timer;
    if (sosState === 'countdown' && sosCountdown > 0) {
      timer = setTimeout(() => setSosCountdown(c => c - 1), 1000);
    } else if (sosState === 'countdown' && sosCountdown === 0) {
      setSosState('calling');
      const phoneToCall = user?.emergencyContact?.phone;
      if (phoneToCall) window.location.href = `tel:${phoneToCall}`;
      else { alert("No emergency contact saved!"); setSosState(null); }
    }
    return () => clearTimeout(timer);
  }, [sosState, sosCountdown, user]);

  const triggerSOS = () => { setSosState('countdown'); setSosCountdown(3); };
  
  const cancelSOS = () => { 
    setSosState(null); 
    setHardwareFallDetected(false); 
  };

  useEffect(() => {
    let unsubscribeUser;
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        unsubscribeUser = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
          if (docSnap.exists()) setUser({ ...docSnap.data(), uid: currentUser.uid });
          else setUser({ email: currentUser.email, name: currentUser.email.split('@')[0], uid: currentUser.uid });
        });
        setAppState('app');
      } else {
        setUser({ name: '', email: '', uid: null });
        if (unsubscribeUser) unsubscribeUser();
      }
    });
    return () => { unsubscribeAuth(); if (unsubscribeUser) unsubscribeUser(); };
  }, []);

  useEffect(() => {
    if (appState === 'app' && user.uid) {
      const unsubMeds = onSnapshot(collection(db, 'users', user.uid, 'medications'), (snapshot) => {
        setUserMeds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      const unsubRoutines = onSnapshot(collection(db, 'users', user.uid, 'routines'), (snapshot) => {
        setUserRoutines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => { unsubMeds(); unsubRoutines(); };
    }
  }, [appState, user.uid]);

  const speakAlert = (medName) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(`Luna clip alert! It is time to take your medication: ${medName}. Please confirm in the app.`);
      utterance.voice = window.speechSynthesis.getVoices().find(v => v.name.includes('Female')) || null;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (appState !== 'app' || ringingAlarm) return;
    const clockTimer = setInterval(() => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const todayString = now.toISOString().split('T')[0];
      
      const medToTake = userMeds.find(med => med.time === currentTime && med.lastTaken !== todayString);
      if (medToTake) { setRingingAlarm(medToTake); speakAlert(medToTake.name); }

      const routineToDo = userRoutines.find(r => r.time === currentTime && r.lastNotified !== todayString);
      if (routineToDo) {
        setSmartPopups(prev => [...prev, { id: `routine-${routineToDo.id}-${Date.now()}`, type: 'routine', message: routineToDo.task }]);
        updateDoc(doc(db, 'users', user.uid, 'routines', routineToDo.id), { lastNotified: todayString });
      }
    }, 10000); 
    return () => clearInterval(clockTimer);
  }, [appState, userMeds, userRoutines, ringingAlarm, user.uid]);

  useEffect(() => {
    let snoozeTimer;
    if (ringingAlarm) snoozeTimer = setInterval(() => speakAlert(ringingAlarm.name), 120000); 
    return () => clearInterval(snoozeTimer);
  }, [ringingAlarm]);

  const handleTakeMedicine = async () => {
    if (!ringingAlarm || !user.uid) return;
    window.speechSynthesis.cancel();
    const todayString = new Date().toISOString().split('T')[0];
    try { await updateDoc(doc(db, 'users', user.uid, 'medications', ringingAlarm.id), { lastTaken: todayString }); } 
    catch (error) { console.error("Error logging medication:", error); }
    setRingingAlarm(null);
  };

  const handleLogout = async () => { await signOut(auth); setAppState('landing'); };

  const removeSmartPopup = (id) => {
    setSmartPopups(prev => prev.filter(popup => popup.id !== id));
  };

  if (appState === 'landing') return <Landing onStart={() => setAppState('auth')} onSignIn={() => setAppState('auth')} />;
  if (appState === 'auth') return <AuthPage onBack={() => setAppState('landing')} />;

  const getHeaderInfo = () => {
    if (currentView === 'dashboard') return { title: 'LunaClip Intelligence', subtitle: 'Continuous Monitoring • Week 24' };
    if (currentView === 'doctor') return { title: 'Medical Network', subtitle: 'Secure Doctor Connectivity' };
    if (currentView === 'profile') return { title: 'User Settings', subtitle: 'Profile & Device Management' };
    if (currentView === 'report') return { title: 'Health Analytics', subtitle: 'Personalized Daily Insight' };
    if (currentView === 'notifications') return { title: 'Action Center', subtitle: 'Smart Alerts & Reminders' };
    if (currentView === 'medications') return { title: 'Prescriptions', subtitle: 'AI Voice Medication Reminders' };
    return { title: 'LunaClip', subtitle: '' };
  };

  const headerInfo = getHeaderInfo();

  const lunaStyles = `
    .glass-card { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 1.5rem; }
    .bg-luna-gradient { background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); }
    .text-luna-purple { color: #a855f7; }
    .bg-luna-purple { background-color: #a855f7; }
    .text-luna-pink { color: #ec4899; }
    .text-gradient { background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; color: transparent; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.3); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(168, 85, 247, 0.5); }
  `;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#05010d] text-white font-sans selection:bg-luna-purple/30 pb-24 md:pb-0 relative overflow-x-hidden">
      <style>{lunaStyles}</style>

      {/* --- MULTIPLE SMART POPUPS CONTAINER --- */}
      <div className="fixed top-24 right-4 md:right-8 z-[300] flex flex-col gap-4 pointer-events-none">
        <AnimatePresence>
          {smartPopups.map((popup) => {
            const popupConfig = popup.type === 'water' ? {
              bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'bg-blue-500/10',
              title: 'Hydration Goal', msg: 'Time to drink 250ml of water to stay healthy and hydrated!', btn: 'I drank it', icon: Droplets
            } : {
              bg: 'bg-luna-purple/20', text: 'text-luna-purple', border: 'border-luna-purple/30', glow: 'bg-luna-purple/10',
              title: 'Routine Reminder', msg: popup.message || 'Task reminder', btn: 'Completed', icon: ClipboardList
            };

            return (
              <motion.div key={popup.id} layout initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0, y: [0, -20, 0, -10, 0, -5, 0], transition: { duration: 1.2, ease: "easeInOut" } }} exit={{ opacity: 0, scale: 0.9, x: 100, transition: { duration: 0.3 } }} className={`pointer-events-auto w-[300px] sm:w-[350px] glass-card p-4 border ${popupConfig.border} shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden`}>
                <div className={`absolute top-0 right-0 w-32 h-32 ${popupConfig.glow} blur-[30px] rounded-full pointer-events-none`} />
                <div className="flex items-start space-x-3 relative z-10">
                  <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }} className={`w-10 h-10 rounded-xl ${popupConfig.bg} flex items-center justify-center flex-shrink-0`}><popupConfig.icon className={`w-5 h-5 ${popupConfig.text}`} /></motion.div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-bold text-sm">{popupConfig.title}</h4>
                      <button onClick={() => removeSmartPopup(popup.id)} className="text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                    <p className="text-xs text-gray-300 mt-1 mb-3">{popupConfig.msg}</p>
                    <button onClick={() => removeSmartPopup(popup.id)} className={`w-full py-2 rounded-lg ${popupConfig.bg} hover:brightness-125 ${popupConfig.text} text-xs font-bold transition-all border ${popupConfig.border} flex items-center justify-center`}><CheckCircle2 className="w-4 h-4 mr-1" /> {popupConfig.btn}</button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* --- FLOATING SOS BUTTON --- */}
      {appState === 'app' && !sosState && (
        <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={triggerSOS} className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[60] w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:scale-105 transition-transform">
          <span className="text-white font-black tracking-widest">SOS</span>
        </motion.button>
      )}

      {/* --- FULLSCREEN SOS CALL OVERLAY --- */}
      <AnimatePresence>
        {sosState && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-red-950/95 backdrop-blur-xl p-4">
            <div className="absolute inset-0 bg-red-500/20 animate-pulse" />
            <div className="text-center relative z-10 flex flex-col items-center">
              <div className="relative flex items-center justify-center w-32 h-32 mb-8">
                <div className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse scale-150" />
                <div className="w-32 h-32 rounded-full bg-red-600 flex items-center justify-center relative z-10 shadow-[0_0_50px_rgba(220,38,38,1)]">
                  {sosState === 'countdown' ? <span className="text-6xl font-bold text-white">{sosCountdown}</span> : <Phone className="w-12 h-12 text-white animate-pulse" />}
                </div>
              </div>
              <h2 className="text-4xl font-bold text-white mb-2 uppercase tracking-widest">{sosState === 'countdown' ? 'SOS Triggered' : 'Emergency Call'}</h2>
              <p className="text-xl text-red-200 mb-2">{sosState === 'countdown' ? 'Connecting to Guardian in...' : 'Calling...'}</p>
              <p className="text-3xl font-bold text-white mb-12">{guardianName}</p>
              <button onClick={cancelSOS} className="px-10 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-lg border border-white/20 backdrop-blur-md transition-all flex items-center">
                Cancel {sosState === 'calling' ? 'Call' : 'SOS'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ringingAlarm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="absolute inset-0 bg-luna-purple/20 animate-pulse" />
            <div className="glass-card p-10 max-w-sm w-full text-center relative z-10 border-2 border-luna-purple/50 shadow-[0_0_100px_rgba(168,85,247,0.4)]">
              <div className="w-24 h-24 mx-auto bg-luna-purple/20 rounded-full flex items-center justify-center animate-bounce mb-6"><Pill className="w-12 h-12 text-luna-purple" /></div>
              <h2 className="text-3xl font-bold text-white mb-2">{ringingAlarm.time}</h2>
              <p className="text-gray-300 text-lg mb-8">Time to take your <strong className="text-luna-pink block mt-2 text-2xl">{ringingAlarm.name}</strong></p>
              <button onClick={handleTakeMedicine} className="w-full py-4 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold text-lg transition-colors flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)]"><CheckCircle2 className="w-6 h-6 mr-2" /> I took my medicine</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <EmergencyPopup alert={activeAlert} onDismiss={() => { setActiveAlert(null); setHardwareFallDetected(false); }} onCallSOS={triggerSOS} />

      {/* Desktop Sidebar */}
      <nav className="fixed left-0 top-0 h-full w-20 border-r border-white/5 flex flex-col items-center py-8 space-y-8 z-40 bg-black/20 backdrop-blur-md hidden md:flex">
        <div className="w-10 h-10 rounded-xl bg-luna-gradient flex items-center justify-center font-bold text-xl cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.5)]" onClick={() => setAppState('landing')}>L</div>
        <LayoutDashboard onClick={() => setCurrentView('dashboard')} className={`w-6 h-6 cursor-pointer transition-colors ${currentView === 'dashboard' ? 'text-luna-purple' : 'text-gray-500 hover:text-white'}`} />
        <Stethoscope onClick={() => setCurrentView('doctor')} className={`w-6 h-6 cursor-pointer transition-colors ${currentView === 'doctor' ? 'text-luna-purple' : 'text-gray-500 hover:text-white'}`} />
        <ShieldCheck className="text-gray-500 w-6 h-6 cursor-pointer hover:text-white transition-colors" />
        <Pill onClick={() => setCurrentView('medications')} className={`w-6 h-6 cursor-pointer transition-colors ${currentView === 'medications' ? 'text-luna-purple' : 'text-gray-500 hover:text-white'}`} />
        <div className="relative"><Bell onClick={() => setCurrentView('notifications')} className={`w-6 h-6 cursor-pointer transition-colors ${currentView === 'notifications' ? 'text-luna-purple' : 'text-gray-500 hover:text-white'}`} /></div>
        <User onClick={() => setCurrentView('profile')} className={`w-6 h-6 cursor-pointer transition-colors mt-auto ${currentView === 'profile' ? 'text-luna-purple' : 'text-gray-500 hover:text-white'}`} />
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full h-20 bg-[#05010d]/90 backdrop-blur-xl border-t border-white/10 flex md:hidden items-center justify-around px-2 z-40 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <button onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center p-2 transition-colors ${currentView === 'dashboard' ? 'text-luna-purple' : 'text-gray-500 hover:text-white'}`}><LayoutDashboard className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium">Home</span></button>
        <button onClick={() => setCurrentView('medications')} className={`flex flex-col items-center p-2 transition-colors ${currentView === 'medications' ? 'text-luna-purple' : 'text-gray-500 hover:text-white'}`}><Pill className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium">Meds</span></button>
        <button onClick={() => setCurrentView('doctor')} className={`flex flex-col items-center p-2 transition-colors ${currentView === 'doctor' ? 'text-luna-purple' : 'text-gray-500 hover:text-white'}`}><Stethoscope className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium">Doctor</span></button>
        <button onClick={() => setCurrentView('profile')} className={`flex flex-col items-center p-2 transition-colors ${currentView === 'profile' ? 'text-luna-purple' : 'text-gray-500 hover:text-white'}`}><User className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium">Profile</span></button>
      </nav>

      <div className="md:pl-20">
        <header className="p-4 md:p-8 flex items-center justify-between sticky top-0 z-30 bg-[#05010d]/80 backdrop-blur-xl border-b border-white/5 md:border-none md:static md:bg-transparent">
          <div>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight text-gradient line-clamp-1">{headerInfo.title}</h1>
            <p className="text-gray-400 text-xs md:text-sm mt-0.5 line-clamp-1">{headerInfo.subtitle}</p>
          </div>
          <div className="flex items-center space-x-4 flex-shrink-0">
            <button onClick={handleLogout} className="hidden md:flex items-center text-sm text-gray-400 hover:text-red-400 transition-colors mr-4"><LogOut className="w-4 h-4 mr-2" /> Logout</button>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/10 p-0.5 md:p-1">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Guest'}`} alt="User" className="w-full h-full rounded-full bg-luna-purple/20" />
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8 pt-4 md:pt-0">
          <AnimatePresence mode="wait">
            {currentView === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-12 gap-4 md:gap-6">
                
                {/* --- SOURCE SWITCHER WITH USB CONNECT BUTTON --- */}
                <div className="col-span-12 flex justify-between items-center glass-card px-4 py-2 mb-2">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-bold uppercase tracking-widest text-gray-400 flex items-center hidden sm:flex"><Radio className="w-4 h-4 mr-2"/> Data Source</span>
                    
                    {inputMode === 'sensor' && (
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={connectUSBCable}
                          className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-xs font-bold border border-blue-500/30 flex items-center"
                        >
                          <Usb className="w-4 h-4 mr-1" /> Connect USB
                        </button>
                        <span className={`text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-lg ${usbStatus === 'connected' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                          {usbStatus === 'connected' ? '🟢 Live' : '🔴 Offline'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                    <button onClick={() => setInputMode('sensor')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${inputMode === 'sensor' ? 'bg-luna-gradient text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Live Sensor</button>
                    <button onClick={() => setInputMode('manual')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${inputMode === 'manual' ? 'bg-luna-gradient text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Manual Entry</button>
                  </div>
                </div>

                {/* --- MANUAL ENTRY FORM --- */}
                {inputMode === 'manual' && (
                  <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="col-span-12 glass-card p-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end" onSubmit={handleManualSubmit}>
                    <div><label className="text-xs text-gray-400 uppercase">Heart Rate (bpm)</label><input type="number" required value={manualInputs.heartRate} onChange={e => setManualInputs({...manualInputs, heartRate: e.target.value})} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-luna-purple/50" /></div>
                    <div><label className="text-xs text-gray-400 uppercase">SpO2 (%)</label><input type="number" required value={manualInputs.spo2} onChange={e => setManualInputs({...manualInputs, spo2: e.target.value})} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-luna-purple/50" /></div>
                    <div><label className="text-xs text-gray-400 uppercase">Hemoglobin (g/dL)</label><input type="number" step="0.1" required value={manualInputs.hemoglobin} onChange={e => setManualInputs({...manualInputs, hemoglobin: e.target.value})} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-luna-purple/50" /></div>
                    <button type="submit" className="w-full py-2.5 rounded-xl bg-luna-purple/20 text-luna-purple font-bold hover:bg-luna-purple/30 transition-colors border border-luna-purple/30 flex items-center justify-center"><Save className="w-4 h-4 mr-2" /> Save & Log</button>
                  </motion.form>
                )}

                {/* Vitals Row */}
                <div className="col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                  <VitalCard title="Heart Rate" value={vitals.heartRate} unit="bpm" icon={Heart} color="bg-pink-500" />
                  <VitalCard title="SpO2" value={vitals.spo2} unit="%" icon={Activity} color="bg-purple-500" />
                  <VitalCard title="Hemoglobin" value={vitals.hemoglobin} unit="g/dL" icon={Droplets} color="bg-red-500" />
                </div>
                
                <div className="col-span-12 lg:col-span-7"><HealthChart data={history} /></div>

                <div className="col-span-12 lg:col-span-5 glass-card p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center"><History className="w-5 h-5 mr-2 text-luna-purple" /> History Log</h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {vitalsHistory.length === 0 ? (
                      <div className="text-center p-4 text-gray-500 text-sm border border-white/5 border-dashed rounded-xl">No manual vitals saved yet.</div>
                    ) : (
                      vitalsHistory.map((item) => (
                        <div key={item.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                          <div>
                            <span className="text-sm font-bold text-white block">{new Date(item.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                            <span className="text-xs text-gray-400">HR: {item.heartRate} bpm | SpO2: {item.spo2}% | Hb: {item.hemoglobin} g/dL</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </motion.div>
            )}
            {currentView === 'doctor' && <DoctorConnect key="doctor" />}
            {currentView === 'profile' && <UserProfile key="profile" user={user} />}
            {currentView === 'report' && <DailyReport key="report" onBack={() => setCurrentView('dashboard')} />}
            {currentView === 'notifications' && <SmartNotifications key="notifications" />}
            {currentView === 'medications' && <MedicationTracker key="medications" user={user} />}
          </AnimatePresence>
        </main>
      </div>
    </motion.div>
  );
}

export default App;