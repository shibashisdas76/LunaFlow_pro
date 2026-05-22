import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; 
import { PeriodLog, UserProfile, User } from './types';
import { api } from './services/api'; 
import Dashboard from './components/Dashboard';
import LogForm from './components/LogForm';
import AnalysisView from './components/AnalysisView';
import HistoryTable from './components/HistoryTable';
import TutorialsView from './components/TutorialsView'; 
import DoctorsView from './components/DoctorsView'; 
import Auth from './components/Auth';
import logoImage from './public/Lunaflow.jpeg';
import ProfilePage from './components/ProfilePage';

// ✅ Added 'Building' icon for the new Institute Services menu option
import { Heart, History, ShieldAlert, Plus, LayoutDashboard, LogOut, User as UserIcon, MapPin, Search, Loader2, Trash2, BellRing, Sparkles, ArrowRight, Info, Activity, Zap, BookOpen, Bluetooth, Stethoscope, Video, BookCheck, Calendar, ShieldCheck, AlertTriangle, FileText, Settings, Menu, X, Building } from 'lucide-react';

import InstituteServicesSidebar from './components/enterprise/InstituteServicesSidebar';
import AwarenessAssignment from './components/AwarenessAssignment';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<PeriodLog[]>([]);
  const [profile, setProfile] = useState<UserProfile>({ age: 25, averageCycleLength: 28, location: '' });
  
  // 🌟 Added 'institute' to the activeTab state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'analysis' | 'tutorials' | 'doctors' | 'assignment' | 'profile' | 'institute'>('dashboard'); 
  
  const [isLogFormOpen, setIsLogFormOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const [isLocating, setIsLocating] = useState(false);
  const [locationInput, setLocationInput] = useState('');

  const [showOverview, setShowOverview] = useState(false);
  const [showCycleAlarm, setShowCycleAlarm] = useState(false);
  const [showMonthlyReminder, setShowMonthlyReminder] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('lunaflow_session');
    if (session) {
      setCurrentUser(JSON.parse(session));
    }
    setIsInitialLoad(false);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    const hasSeen = localStorage.getItem(`overview_seen_${user.id}`);
    if (!hasSeen) {
      setTimeout(() => setShowOverview(true), 800);
    }
  };

  const closeOverview = () => {
    if (currentUser) {
      localStorage.setItem(`overview_seen_${currentUser.id}`, 'true');
      setShowOverview(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (currentUser && currentUser.role !== 'male_user') {
        try {
          const data = await api.getUserData(currentUser.id);
          const formattedLogs = data.logs.map((l: any) => ({ ...l, id: l._id }));
          setLogs(formattedLogs);
          if (data.profile) {
            setProfile(data.profile);
            setLocationInput(data.profile.location || '');
          }
        } catch (error) {
          console.error("Failed to load data", error);
        }
      }
    };
    fetchData();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || currentUser.role === 'male_user') return;

    if (logs.length > 0 && profile.averageCycleLength) {
      const lastPeriodDate = new Date(logs[0].startDate);
      const nextPeriodDate = new Date(lastPeriodDate);
      nextPeriodDate.setDate(lastPeriodDate.getDate() + profile.averageCycleLength);
      
      const today = new Date();
      const diffTime = nextPeriodDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 3 && diffDays >= 0) {
        if (!showCycleAlarm) { 
            setShowCycleAlarm(true);
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.5; 
            audio.play().catch(e => console.log("Audio blocked:", e));
        }
      } else {
        setShowCycleAlarm(false);
      }
    }
    const today = new Date();
    if (today.getDate() <= 3) setShowMonthlyReminder(true); else setShowMonthlyReminder(false);
  }, [logs, profile, currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('lunaflow_session');
    setCurrentUser(null);
    setLogs([]);
    setProfile({ age: 25, averageCycleLength: 28, location: '' });
    setActiveTab('dashboard');
    setShowOverview(false);
    setIsMobileMenuOpen(false);
  };

  const detectLocation = () => { 
    if (!currentUser) return; 
    setIsLocating(true); 
    navigator.geolocation.getCurrentPosition( 
      async (position) => { 
        const { latitude, longitude } = position.coords; 
        try { 
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`); 
          const data = await response.json(); 
          const city = data.address.city || data.address.town || data.address.state || 'Unknown'; 
          const country = data.address.country || ''; 
          const locationString = `${city}, ${country}`; 
          setLocationInput(locationString); 
          await updateManualLocation(locationString); 
        } catch (error) { 
          console.error("Geocoding failed", error); 
        } finally { 
          setIsLocating(false); 
        } 
      }, 
      () => { 
        setIsLocating(false); 
        alert("Location access denied."); 
      } 
    ); 
  };

  const updateManualLocation = async (loc?: string) => { 
    if (!currentUser) return; 
    const finalLocation = loc || locationInput; 
    const updatedProfile = { ...profile, location: finalLocation }; 
    setProfile(updatedProfile); 
    try { 
      await api.updateProfile(currentUser.id, updatedProfile); 
      if(!loc) alert("Location updated successfully!"); 
    } catch (err) { 
      console.error(err); 
    } 
  };

  const handleAddLog = async (newLog: Omit<PeriodLog, 'id' | 'cycleLength'>, age: number) => { if (!currentUser) return; try { const response = await api.addLog(currentUser.id, newLog, age); const formattedLogs = response.logs.map((l: any) => ({ ...l, id: l._id })); setLogs(formattedLogs); setProfile(prev => ({ ...prev, ...response.profile })); setIsLogFormOpen(false); } catch (error) { console.error("Failed to save log", error); } };
  const handleDeleteLog = async (logId: string) => { if (!currentUser || !window.confirm("Are you sure?")) return; try { const response = await api.deleteLog(logId, currentUser.id); const formattedLogs = response.logs.map((l: any) => ({ ...l, id: l._id })); setLogs(formattedLogs); setProfile(prev => ({ ...prev, averageCycleLength: response.profile.averageCycleLength })); } catch (error) { console.error("Failed to delete", error); } };
  const handleResetData = async () => { if (!currentUser || !window.confirm("WARNING: All data will be deleted.")) return; try { await api.resetData(currentUser.id); setLogs([]); setProfile({ ...profile, averageCycleLength: 28 }); } catch (error) { console.error("Failed to reset", error); } };

  const handleUpdateProfile = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('lunaflow_session', JSON.stringify(updatedUser));
    if (updatedUser.profile) {
      setProfile(updatedUser.profile);
      setLocationInput(updatedUser.profile.location || '');
    }
  };

  const changeTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false); 
  };

  if (isInitialLoad) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-pulse w-12 h-12 bg-rose-500 rounded-xl" /></div>;

  const showFullBaseApp = currentUser && currentUser.role !== 'male_user';

  return (
    <Router>
      <Routes>
        <Route path="/*" element={
          !currentUser ? (
            <div className="relative min-h-screen">
              <Auth onLogin={handleLoginSuccess} />
            </div>
          ) : (
            <>
              <div className="min-h-screen flex flex-col lg:flex-row bg-[#fff5f5] relative overflow-hidden w-full">
                
                {/* Background Animations */}
                <div className="fixed inset-0 pointer-events-none z-0">
                  <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-rose-200/40 rounded-full blur-[120px] animate-pulse" />
                  <div className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-indigo-200/30 rounded-full blur-[150px] animate-bounce" style={{ animationDuration: '15s' }} />
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="absolute bg-rose-400/10 rounded-full blur-md" style={{ width: `${Math.random() * 150 + 50}px`, height: `${Math.random() * 150 + 50}px`, top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, animation: `floatAround ${Math.random() * 20 + 10}s infinite linear` }} />
                  ))}
                </div>
                <style>{` @keyframes floatAround { 0% { transform: translate(0, 0) rotate(0deg); } 33% { transform: translate(30px, -50px) rotate(120deg); } 66% { transform: translate(-20px, 20px) rotate(240deg); } 100% { transform: translate(0, 0) rotate(360deg); } } `}</style>

                {/* MOBILE TOP APP BAR */}
                <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl z-40 border-b border-rose-100 flex items-center justify-between px-4 shadow-sm">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full overflow-hidden border border-rose-100 shadow-sm shrink-0">
                        <img src={logoImage} alt="LunaFlow" className="w-full h-full object-cover" />
                     </div>
                     <span className="text-xl font-black text-slate-800 tracking-tight">LunaFlow</span>
                  </div>
                </div>

                {/* Overview Modal */}
                {showOverview && showFullBaseApp && (
                  <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-500 overflow-y-auto">
                    <div className="max-w-5xl w-full space-y-4 md:space-y-6 my-auto animate-in zoom-in-95 duration-500 py-10">
                      
                      <div className="bg-gradient-to-br from-orange-500 via-rose-500 to-pink-600 rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-8 border-4 border-white/20">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-20 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl translate-y-1/2"></div>

                        <div className="relative z-10 max-w-xl">
                          <div className="bg-white/20 backdrop-blur-md w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-white/20 shadow-inner">
                            <Sparkles className="text-white" size={28} />
                          </div>
                          <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
                            Welcome to <br/> LunaFlow Ecosystem
                          </h1>
                          <p className="text-orange-50 font-medium tracking-wide text-sm md:text-base leading-relaxed border-l-4 border-white/30 pl-4">
                            WHEN DATA BECOMES MORE UNDERSTANDABLE, <br/> AWARENESS BECOMES MORE POWERFUL.
                          </p>
                        </div>

                        <div className="relative z-10 w-full md:w-auto mt-4 md:mt-0 shrink-0">
                          <button 
                            onClick={closeOverview}
                            className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all hover:scale-105 hover:shadow-xl shadow-slate-900/30 group"
                          >
                            Get Started <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 hover:border-rose-200 transition-all group">
                          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                            <Calendar size={24} />
                          </div>
                          <h3 className="text-lg font-black text-slate-800 mb-2">Smart Cycle Tracking</h3>
                          <p className="text-slate-500 text-xs leading-relaxed font-medium">
                            Log your periods, flow intensity, and pain levels. Let AI predict your next cycle with high accuracy.
                          </p>
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 hover:border-indigo-200 transition-all group">
                          <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                            <Bluetooth size={24} />
                          </div>
                          <h3 className="text-lg font-black text-slate-800 mb-2">IoT LunaClip Sync</h3>
                          <p className="text-slate-500 text-xs leading-relaxed font-medium">
                            Connect your LunaClip device via WebBLE to sync real-time Hemoglobin (Hb) vitals directly to your dashboard.
                          </p>
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 hover:border-emerald-200 transition-all group md:col-span-1">
                          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                            <Activity size={24} />
                          </div>
                          <h3 className="text-lg font-black text-slate-800 mb-2">AI Cross-Analysis</h3>
                          <p className="text-slate-500 text-xs leading-relaxed font-medium">
                            Our ML Engine merges your hardware Hb data with menstrual logs to detect hidden Anemia risks instantly.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile Drawer Overlay Backdrop */}
                {isMobileMenuOpen && (
                  <div 
                    className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70]"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                )}

                {/* DESKTOP SIDEBAR / MOBILE FULL DRAWER */}
                <nav className={`
                  fixed lg:sticky top-0 left-0 h-full lg:h-screen w-[280px] lg:w-72 
                  bg-white/95 lg:bg-white/60 backdrop-blur-xl border-r border-rose-100 
                  p-6 flex flex-col shadow-2xl lg:shadow-xl 
                  transition-transform duration-300 ease-in-out z-[80] lg:z-10
                  ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                  ${showOverview ? 'lg:opacity-0 lg:pointer-events-none' : 'opacity-100'}
                  overflow-y-auto
                `}>
                  
                  {/* Mobile Drawer Header with Close Button */}
                  <div className="flex lg:hidden items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-rose-100 shrink-0">
                          <img src={logoImage} alt="LunaFlow" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xl font-black text-slate-800">Menu</span>
                    </div>
                    <button 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2 bg-rose-50 text-rose-500 rounded-full hover:bg-rose-100"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Desktop Logo */}
                  <div className="hidden lg:flex items-center gap-4 px-2 py-4">
                     <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-rose-100 shadow-md shrink-0">
                        <img src={logoImage} alt="LunaFlow Logo" className="w-full h-full object-cover" />
                     </div>
                     <span className="text-2xl font-black text-slate-800 tracking-tight">LunaFlow</span>
                  </div>
                  
                  <div className="space-y-2 flex-1 lg:mt-4">
                    {showFullBaseApp && (
                      <button onClick={() => { setShowOverview(true); setIsMobileMenuOpen(false); }} className="hidden lg:flex w-full items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-rose-400 to-orange-400 shadow-lg shadow-rose-200 hover:shadow-xl hover:scale-[1.02] transition-all mb-4">
                        <Sparkles size={20} /> App Overview
                      </button>
                    )}

                    {/* These items show on Desktop Sidebar, but are hidden on Mobile Drawer (since they are in Bottom Nav) */}
                    <div className="hidden lg:block space-y-2">
                        <button onClick={() => changeTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:bg-rose-50'}`}>
                          <LayoutDashboard size={20} /> Dashboard
                        </button>

                        {showFullBaseApp && (
                          <>
                            <button onClick={() => changeTab('history')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'history' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:bg-rose-50'}`}><History size={20} /> My Records</button>
                            <button onClick={() => changeTab('analysis')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'analysis' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:bg-rose-50'}`}><ShieldAlert size={20} /> Health Analysis</button>
                          </>
                        )}
                    </div>

                    {/* These items ALWAYS show (Tools & More) */}
                    {showFullBaseApp && (
                        <button onClick={() => changeTab('doctors')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'doctors' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:bg-rose-50'}`}><Stethoscope size={20} /> Find Doctors 🏥</button>
                    )}
                    
                    <button onClick={() => changeTab('tutorials')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'tutorials' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:bg-rose-50'}`}><Video size={20} /> Tutorials 📺</button>

                    <button onClick={() => changeTab('assignment')} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'assignment' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:bg-rose-50'}`}>
                      <div className="flex items-center gap-3">
                        <BookCheck size={20} /> Awareness Task
                      </div>
                      <span className="bg-rose-100 text-rose-600 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-black">Required</span>
                    </button>

                    {/* 🌟 NEW: Mobile Only - Institute Services accessed via the "More" Drawer */}
                    {showFullBaseApp && (
                      <button onClick={() => changeTab('institute')} className={`lg:hidden w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all mt-4 mb-2 ${activeTab === 'institute' ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                        <Building size={20} /> Institute Services
                      </button>
                    )}

                    {showFullBaseApp && (
                      <button onClick={() => changeTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all mt-2 ${activeTab === 'profile' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:bg-rose-50'}`}>
                        <Settings size={20} /> Profile & Settings
                      </button>
                    )}
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-rose-100 space-y-4">
                    <div className="px-4 py-3 bg-white/50 rounded-2xl border border-rose-50 space-y-3 cursor-default">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center text-rose-500"><UserIcon size={16} /></div>
                        <div className="flex-1 overflow-hidden">
                          <div className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</div>
                          {showFullBaseApp && <div className="text-[10px] text-slate-400">{profile.age} years old</div>}
                        </div>
                      </div>
                      
                      {showFullBaseApp && (
                        <div className="space-y-2">
                          <div className="text-[9px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1"><MapPin size={10} /> Location Insights</div>
                          <div className="flex gap-1 flex-col sm:flex-row">
                            <input type="text" placeholder="Enter City" value={locationInput} onChange={(e) => setLocationInput(e.target.value)} className="bg-white border border-rose-100 rounded-lg px-2 py-2 sm:py-1 text-xs sm:text-[10px] flex-1 focus:ring-1 focus:ring-rose-500 focus:outline-none" />
                            <button onClick={() => updateManualLocation()} className="p-2 sm:p-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all flex justify-center"><Search size={14} className="sm:w-3 sm:h-3" /></button>
                          </div>
                          <button onClick={detectLocation} disabled={isLocating} className="w-full text-xs sm:text-[10px] font-bold text-rose-600 flex items-center justify-center gap-1 py-2 sm:py-1.5 border border-rose-200 rounded-lg bg-rose-50 hover:bg-rose-100 transition-all disabled:opacity-50 mt-1 sm:mt-0">
                            {isLocating ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
                            {isLocating ? 'Locating...' : 'Detect Auto'}
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {showFullBaseApp && <button onClick={handleResetData} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={20} /> Reset Data</button>}
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><LogOut size={20} /> Logout</button>
                  </div>
                </nav>

                {/* MAIN CONTENT AREA */}
                {/* Notice pb-28 to prevent content hiding behind the Bottom App Bar */}
                <main className={`relative z-10 flex-1 p-4 pt-24 pb-28 lg:pt-10 lg:pb-10 lg:p-10 max-w-7xl mx-auto w-full transition-opacity duration-500 ${showOverview ? 'opacity-0' : 'opacity-100'} overflow-y-auto`}>
                  
                  {/* Dynamic Header */}
                  <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8 mb-8 md:mb-10"> 
                    <div>
                      <h2 className="text-3xl md:text-4xl font-black text-slate-800 capitalize tracking-tight">{activeTab === 'profile' ? 'My Profile' : activeTab === 'institute' ? 'Institute Connect' : activeTab}</h2>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                        <p className="text-sm md:text-base text-slate-500 font-medium">Monitoring portal for {currentUser.name.split(' ')[0]}</p>
                        {profile.location && showFullBaseApp && (
                          <span className="inline-flex w-fit items-center gap-1 text-[11px] font-bold text-rose-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-rose-100 shadow-sm">
                            <MapPin size={12} /> {profile.location}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Desktop Add Log Button */}
                    {showFullBaseApp && activeTab !== 'profile' && activeTab !== 'institute' && (
                      <button onClick={() => setIsLogFormOpen(true)} className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-rose-500 to-orange-400 text-white px-8 py-4 rounded-3xl font-bold hover:opacity-90 transition-all shadow-2xl hover:scale-105 active:scale-95">
                        <Plus size={22} /> Log Period
                      </button>
                    )}
                  </header>

                  <div className="space-y-4 mb-8">
                    {showCycleAlarm && showFullBaseApp && activeTab !== 'profile' && activeTab !== 'institute' && (
                      <div className="bg-white/80 backdrop-blur-md border border-rose-200 p-4 md:p-5 rounded-3xl flex items-center gap-4 md:gap-5 shadow-xl animate-in slide-in-from-top-4">
                        <div className="bg-rose-500 text-white p-3 md:p-3.5 rounded-2xl shadow-lg animate-bounce shrink-0"><BellRing size={20} className="md:w-6 md:h-6" /></div>
                        <div>
                          <h4 className="font-bold text-rose-900 text-sm md:text-base">Cycle Warning</h4>
                          <p className="text-xs md:text-sm text-rose-600">Predicted start within 72 hours.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative z-20">
                    {activeTab === 'dashboard' && <Dashboard logs={logs} profile={profile} />}
                    {activeTab === 'history' && showFullBaseApp && <HistoryTable logs={logs} onDelete={handleDeleteLog} />}
                    {activeTab === 'analysis' && showFullBaseApp && <AnalysisView logs={logs} profile={profile} />}
                    {activeTab === 'doctors' && showFullBaseApp && <DoctorsView userLocation={profile.location || 'India'} />}
                    {activeTab === 'tutorials' && <TutorialsView />}
                    {activeTab === 'assignment' && <AwarenessAssignment />}
                    
                    {activeTab === 'profile' && showFullBaseApp && (
                      <ProfilePage user={currentUser} onUpdateUser={handleUpdateProfile} />
                    )}

                    {/* 🌟 NEW: Mobile Institute Services View */}
                    {activeTab === 'institute' && showFullBaseApp && (
                      <div className="w-full flex flex-col items-center justify-center pt-8 pb-10 animate-in zoom-in-95 duration-300">
                         <div className="bg-blue-50 border border-blue-100 p-5 rounded-[2rem] shadow-inner mb-6">
                            <Building size={48} className="text-blue-600" />
                         </div>
                         <h3 className="text-2xl font-black text-slate-800 text-center mb-2">Enterprise Gateway</h3>
                         <p className="text-slate-500 text-center max-w-sm text-sm mb-8 leading-relaxed">
                            Tap your dedicated access button below to submit complaints, apply for leaves, and connect with your institution.
                         </p>
                         
                         {/* Render the component inline for mobile users to access its native toggle button clearly */}
                         <div className="relative w-full h-[200px] flex items-center justify-center bg-white rounded-3xl border border-slate-100 shadow-sm overflow-visible">
                            <InstituteServicesSidebar user={currentUser} />
                         </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Modal Rendering */}
                  {isLogFormOpen && showFullBaseApp && <LogForm initialAge={profile.age} onAdd={handleAddLog} onClose={() => setIsLogFormOpen(false)} />}
                </main>

                {/* 🌟 Hide the floating button on mobile if they are on a different tab to prevent overlapping! */}
                <div className={`${activeTab !== 'institute' ? 'hidden lg:block' : 'hidden'}`}>
                  <InstituteServicesSidebar user={currentUser} />
                </div>

                {/* 🌟 MOBILE BOTTOM NAVIGATION BAR 🌟 */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-white border-t border-slate-200 flex justify-between items-center px-6 z-[60] pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                  
                  {/* Tab 1: Dashboard */}
                  <button onClick={() => changeTab('dashboard')} className={`flex flex-col items-center justify-center space-y-1 w-12 transition-colors ${activeTab === 'dashboard' ? 'text-rose-500' : 'text-slate-400'}`}>
                    <LayoutDashboard size={22} className={activeTab === 'dashboard' ? 'fill-rose-50' : ''} />
                    <span className="text-[10px] font-bold">Home</span>
                  </button>

                  {/* Tab 2: History (If eligible) */}
                  {showFullBaseApp ? (
                    <button onClick={() => changeTab('history')} className={`flex flex-col items-center justify-center space-y-1 w-12 transition-colors ${activeTab === 'history' ? 'text-rose-500' : 'text-slate-400'}`}>
                      <History size={22} className={activeTab === 'history' ? 'fill-rose-50' : ''} />
                      <span className="text-[10px] font-bold">Records</span>
                    </button>
                  ) : (
                    <div className="w-12"></div> /* Empty placeholder for layout balance */
                  )}

                  {/* Center Floating Action Button (FAB) */}
                  {showFullBaseApp ? (
                    <div className="relative -top-6">
                      <button 
                        onClick={() => setIsLogFormOpen(true)} 
                        className="w-14 h-14 bg-gradient-to-tr from-rose-500 to-orange-500 text-white rounded-full shadow-[0_8px_25px_rgb(244,63,94,0.4)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border-4 border-[#fff5f5]"
                      >
                        <Plus size={28} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-14"></div> /* Empty placeholder */
                  )}

                  {/* Tab 4: Analysis (If eligible) */}
                  {showFullBaseApp ? (
                    <button onClick={() => changeTab('analysis')} className={`flex flex-col items-center justify-center space-y-1 w-12 transition-colors ${activeTab === 'analysis' ? 'text-rose-500' : 'text-slate-400'}`}>
                      <ShieldAlert size={22} className={activeTab === 'analysis' ? 'fill-rose-50' : ''} />
                      <span className="text-[10px] font-bold">AI</span>
                    </button>
                  ) : (
                    <div className="w-12"></div>
                  )}

                  {/* Tab 5: More Menu (Opens Slide-out Drawer) */}
                  <button onClick={() => setIsMobileMenuOpen(true)} className={`flex flex-col items-center justify-center space-y-1 w-12 transition-colors ${isMobileMenuOpen || activeTab === 'institute' || activeTab === 'doctors' || activeTab === 'tutorials' ? 'text-rose-500' : 'text-slate-400'}`}>
                    <Menu size={22} />
                    <span className="text-[10px] font-bold">More</span>
                  </button>

                </div>

              </div>
            </>
          )
        } />
      </Routes>
    </Router>
  );
};

export default App;