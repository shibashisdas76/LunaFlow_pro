import React, { useState } from 'react';
import { PeriodLog, AnalysisResult, UserProfile } from '../types';
import { analyzeHealthRisks } from '../services/gemini';
import { api } from '../services/api'; 
import { Sparkles, AlertTriangle, ShieldCheck, Utensils, Zap, Loader2, Flower2, Apple, CheckCircle2, MapPin, Brain, Activity, Save } from 'lucide-react';

interface Props {
  logs: PeriodLog[];
  profile: UserProfile;
}

const AnalysisView: React.FC<Props> = ({ logs, profile }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  // ML Prediction state updated to include 'score'
  const [mlPrediction, setMlPrediction] = useState<{ prediction: string, warning: string, score: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for Saving Analysis
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const isAnalysisGranted = logs.length >= 2;

  const performAnalysis = async () => {
    if (logs.length < 2) {
      setError("Please add at least 2 period logs for a pattern analysis.");
      return;
    }
    setLoading(true);
    setError(null);
    
    try {
      const latestLog = logs[0]; 
      
      // 1. ML MODEL RUNS FIRST (Primary Diagnosis & Vitality Score)
      const mlResult = await api.predictHealthRisk({
         age: profile.age,
         cycleLength: latestLog.cycleLength || profile.averageCycleLength,
         duration: latestLog.duration,
         flowIntensity: latestLog.flowIntensity,
         painLevel: latestLog.painLevel,
         symptoms: latestLog.symptoms || []
      });

      setMlPrediction({
          prediction: mlResult.prediction,
          warning: mlResult.warning,
          score: mlResult.vitalityScore || 0 // Ensuring score is captured
      });

      // 2. PASS ML RESULTS TO GEMINI (Secondary indicators, Diet & Yoga)
      const geminiResult = await analyzeHealthRisks(
          logs, 
          profile.age, 
          profile.location,
          mlResult.prediction,   // Pass ML prediction to Gemini
          mlResult.vitalityScore // Pass ML score to Gemini
      );
      
      setAnalysis(geminiResult);

    } catch (err: any) {
      setError(err.message || "Failed to analyze health data. Please check your API connection.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- SMART Save Analysis Function ---
  const handleSaveAnalysis = async () => {
    if (!analysis || !mlPrediction) return;
    setIsSaving(true);
    setSaveMessage(null);

    try {
      let userId = null;

      // 1. Check if it's stored as an object named 'user'
      const userStr = localStorage.getItem('user');
      if (userStr) {
          try {
              const userObj = JSON.parse(userStr);
              userId = userObj._id || userObj.id;
          } catch (e) {}
      }
      
      // 2. Check if it's stored directly as 'userId'
      if (!userId) {
          userId = localStorage.getItem('userId');
      }

      // 3. Fallback: Take the userId directly from the Period logs! (Guaranteed to work)
      if (!userId && logs.length > 0) {
          // @ts-ignore
          userId = logs[0].userId;
      }

      if (!userId) {
          throw new Error("User ID not found. Please log out and log in again.");
      }

      // Call the API to save
      await api.saveAnalysis(userId as string, analysis, mlPrediction);
      
      // Show success message
      setSaveMessage({ type: 'success', text: 'Analysis saved successfully!' });
      
      // Remove success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Failed to save analysis.' });
    } finally {
      setIsSaving(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-red-600 bg-red-50 border-red-100';
      case 'Moderate': return 'text-orange-600 bg-orange-50 border-orange-100';
      default: return 'text-teal-600 bg-teal-50 border-teal-100';
    }
  };

  // 1. If there are less than 2 records
  if (!isAnalysisGranted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] sm:min-h-[60vh] p-6 sm:p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm animate-in fade-in zoom-in duration-300 mx-4 sm:mx-0">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-6 sm:mb-8 shadow-inner shrink-0">
          <Brain size={40} className="animate-pulse sm:w-12 sm:h-12 w-10 h-10" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-3 sm:mb-4 tracking-tight">AI Analysis Locked</h2>
        <p className="text-slate-500 max-w-md mb-6 sm:mb-8 leading-relaxed text-base sm:text-lg px-2">
          To provide accurate health insights and detect patterns, our AI requires **at least two menstrual records**.
        </p>
        <div className="flex flex-col items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center justify-center gap-3 w-full sm:w-auto px-5 sm:px-6 py-3 bg-slate-50 rounded-2xl text-xs font-bold text-slate-400 uppercase tracking-widest border border-slate-100">
            <Zap size={16} className="fill-slate-400 shrink-0" /> 
            <span>Records Found: <span className="text-rose-500">{logs.length}</span> / 2 Required</span>
          </div>
          <p className="text-xs sm:text-sm text-rose-400 italic font-medium">Please log more cycles in "My Records" to unlock.</p>
        </div>
      </div>
    );
  }

  // Determine the display score (prefer ML score, fallback to Gemini score)
  const displayScore = mlPrediction?.score ?? analysis?.overallHealthScore ?? 0;

  // 2. If there are 2 or more records
  return (
    <div className="space-y-6 sm:space-y-8 pb-10 px-0 sm:px-2">
      {!analysis && !loading && (
        <div className="bg-white rounded-3xl p-6 sm:p-12 border border-slate-100 shadow-sm text-center flex flex-col items-center max-w-2xl mx-auto">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-50 rounded-full flex items-center justify-center mb-5 sm:mb-6 text-rose-500 shrink-0">
            <Sparkles size={32} className="sm:w-10 sm:h-10" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-3">Health Analysis</h2>
          <p className="text-slate-500 mb-6 max-w-md text-sm sm:text-base px-2">
            Our ML Model diagnoses your patterns, while AI generates a personalized wellness plan based on your cycle, symptoms, and location.
          </p>
          
          {profile.location && (
            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 rounded-full text-slate-500 text-xs sm:text-sm mb-8 border border-slate-100 w-fit mx-auto">
              <MapPin size={14} className="text-rose-400 shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-none">Location: <span className="font-bold text-slate-700">{profile.location}</span></span>
            </div>
          )}

          <button 
            onClick={performAnalysis}
            className="w-full sm:w-auto bg-rose-500 hover:bg-rose-600 text-white font-bold px-6 sm:px-10 py-3.5 sm:py-4 rounded-2xl shadow-xl shadow-rose-100 transition-all flex items-center justify-center gap-2 group text-sm sm:text-base"
          >
            Generate My Wellness Plan
            <Zap size={18} className="group-hover:scale-110 transition-transform shrink-0" />
          </button>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium w-full max-w-md text-left sm:text-center">
              <p className="font-bold mb-1">Error detected:</p>
              {error}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-sm text-center flex flex-col items-center max-w-2xl mx-auto">
          <Loader2 size={40} className="animate-spin text-rose-500 mb-5 sm:mb-6 sm:w-12 sm:h-12" />
          <h2 className="text-lg sm:text-xl font-bold mb-2">Analyzing your patterns...</h2>
          <p className="text-slate-400 text-sm sm:text-base">ML Model is calculating your score while Gemini crafts your diet & yoga routine...</p>
        </div>
      )}

      {analysis && (
        <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Top Row: Score Card & ML Prediction */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              
              {/* 1. Cycle Vitality Score (Now uses ML Score) */}
              <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col items-center md:items-start text-center md:text-left h-full">
                <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-4 sm:gap-6 w-full mb-4">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/20" />
                        <circle cx="50%" cy="50%" r="42%" stroke="white" strokeWidth="6" fill="transparent" strokeDasharray={264} strokeDashoffset={264 - (264 * displayScore) / 100} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                    </svg>
                    <span className="absolute text-xl sm:text-2xl font-bold">{displayScore}%</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center sm:items-start md:items-start">
                        <h2 className="text-lg sm:text-xl font-bold mb-1 uppercase tracking-tight">Cycle Vitality Score</h2>
                        {profile.location && (
                            <div className="flex items-center justify-center sm:justify-start md:justify-start gap-1.5 mt-1 text-white/70 text-xs">
                            <MapPin size={12} className="shrink-0" /> <span className="truncate max-w-[150px]">{profile.location} Region</span>
                            </div>
                        )}
                    </div>
                </div>
                <p className="text-indigo-50 leading-relaxed text-xs sm:text-sm opacity-90 flex-grow w-full text-center sm:text-left md:text-left">{analysis.summary}</p>
                
                {/* Update Data & Save Analysis Buttons Container */}
                <div className="flex flex-col w-full sm:w-auto gap-3 mt-5 self-stretch md:self-start">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                    <button onClick={() => setAnalysis(null)} className="text-white bg-white/10 hover:bg-white/20 text-xs font-bold border border-white/20 rounded-xl px-4 py-3 sm:py-2 transition-all flex-1 sm:flex-none justify-center">
                        Update Data
                    </button>
                    
                    <button 
                      onClick={handleSaveAnalysis} 
                      disabled={isSaving}
                      className="flex items-center justify-center gap-1.5 bg-white text-indigo-600 hover:bg-indigo-50 text-xs font-bold rounded-xl px-4 py-3 sm:py-2 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex-1 sm:flex-none"
                    >
                      {isSaving ? <Loader2 size={14} className="animate-spin shrink-0" /> : <Save size={14} className="shrink-0" />}
                      {isSaving ? 'Saving...' : 'Save Analysis'}
                    </button>
                  </div>
                  
                  {saveMessage && (
                    <div className={`text-xs font-medium px-3 py-2 sm:py-1.5 rounded-lg text-center sm:text-left ${saveMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-50' : 'bg-rose-500/20 text-rose-50'}`}>
                      {saveMessage.text}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. ML Pattern Prediction Box */}
              {mlPrediction && (
                  <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col justify-center h-full">
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4 text-center sm:text-left">
                          <div className={`p-3 rounded-xl shrink-0 ${mlPrediction.prediction === 'None' || mlPrediction.prediction === 'Normal' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                              <Activity size={24} />
                          </div>
                          <div>
                              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-0">ML Pattern Assessment</h3>
                              <p className={`text-xl sm:text-2xl font-black ${mlPrediction.prediction === 'None' || mlPrediction.prediction === 'Normal' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {mlPrediction.prediction === 'None' ? 'No Risk Detected' : mlPrediction.prediction}
                              </p>
                          </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-slate-600 text-sm flex flex-col sm:flex-row gap-3 items-center sm:items-start mt-auto text-center sm:text-left">
                          <AlertTriangle size={16} className="shrink-0 sm:mt-0.5 text-slate-400 hidden sm:block" />
                          <p className="leading-relaxed text-xs sm:text-sm">{mlPrediction.warning}</p>
                      </div>
                  </div>
              )}
          </div>

          {/* Risks and Alerts Section */}
          <section>
            <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-4 flex items-center gap-2 px-2">
              <ShieldCheck className="text-indigo-500 shrink-0" /> Secondary Health Indicators
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.risks.map((risk, idx) => (
                <div key={idx} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                    <h3 className="font-bold text-slate-800 text-base sm:text-lg">{risk.condition}</h3>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest w-fit ${getRiskColor(risk.riskLevel)}`}>
                      {risk.riskLevel}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm mb-4 leading-relaxed">{risk.reasoning}</p>
                  <div className="space-y-2">
                    {risk.recommendations.map((rec, i) => (
                      <div key={i} className="flex gap-2 text-xs sm:text-sm text-slate-700 bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                        <CheckCircle2 size={14} className="text-teal-500 shrink-0 mt-0.5 sm:mt-0" />
                        <span className="leading-snug">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Wellness Plan: Diet and Habits */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-100 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 sm:mb-6 gap-3">
                  <h3 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
                    <Utensils className="text-orange-500 shrink-0" /> Regional Diet Chart
                  </h3>
                  {profile.location && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full whitespace-nowrap w-fit">{profile.location} Focus</span>}
                </div>
                <div className="space-y-3 sm:space-y-4">
                  {analysis.wellnessPlan.dietChart.map((item, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row gap-2 sm:gap-4 p-4 rounded-2xl bg-orange-50/30 border border-orange-100">
                      <div className="w-full md:w-32 font-black text-orange-600 uppercase text-xs tracking-widest md:pt-1">{item.meal}</div>
                      <div className="text-slate-700 text-xs sm:text-sm leading-relaxed">{item.recommendation}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-100 shadow-sm">
                <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-5 sm:mb-6 flex items-center gap-2">
                  <Flower2 className="text-teal-500 shrink-0" /> Recommended Yoga Routine
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {analysis.wellnessPlan.yogaPoses.map((pose, idx) => (
                    <div key={idx} className="p-4 sm:p-5 rounded-2xl bg-teal-50/30 border border-teal-100">
                      <div className="font-bold text-teal-700 text-sm sm:text-base mb-1">{pose.name}</div>
                      <div className="text-xs text-slate-600 leading-relaxed">{pose.benefit}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-100 shadow-sm h-full">
                <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-5 sm:mb-6 flex items-center gap-2">
                  <Apple className="text-rose-500 shrink-0" /> Healthy Food Habits
                </h3>
                <ul className="space-y-3 sm:space-y-4">
                  {analysis.wellnessPlan.foodHabits.map((habit, idx) => (
                    <li key={idx} className="flex gap-3 text-xs sm:text-sm text-slate-700">
                      <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 font-bold text-xs">{idx + 1}</div>
                      <span className="leading-relaxed mt-0.5 sm:mt-0">{habit}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-slate-50 italic text-[10px] sm:text-[11px] text-slate-400">
                  Tip: These suggestions take into account locally available ingredients common in the {profile.location || 'your'} region.
                </div>
              </div>
            </div>
          </section>

          {/* Footer Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 p-5 sm:p-6 rounded-3xl flex flex-col sm:flex-row gap-3 sm:gap-4 text-amber-800 text-xs sm:text-sm shadow-sm shadow-amber-100 items-start">
            <AlertTriangle size={24} className="shrink-0 text-amber-500 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2 mb-1 sm:mb-0">
                <AlertTriangle size={16} className="shrink-0 text-amber-500 sm:hidden" />
                <p className="font-black uppercase tracking-wider text-[10px] sm:text-[11px]">Important Health Disclaimer</p>
              </div>
              <p className="leading-relaxed opacity-90 mt-1 sm:mt-1 text-xs">{analysis.disclaimer}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisView;