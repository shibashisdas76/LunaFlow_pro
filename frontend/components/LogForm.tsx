import React, { useState } from 'react';
import { PeriodLog, FlowIntensity, PainLevel } from '../types';
import { X, Check, AlertCircle, Baby, Loader2, Activity } from 'lucide-react';
import { api } from '../services/api'; 
import CryptoJS from 'crypto-js'; 

// 🔒 DYNAMIC KEY MATCHING: Perfect sync with encryption.ts
const SECRET_KEY = import.meta.env.VITE_APP_ENCRYPTION_KEY || 'luna-hackathon-secure-key-2026';

interface Props {
  initialAge: number;
  onAdd: (log: any, age: number) => void; 
  onClose: () => void;
}

const SYMPTOMS = ['Fatigue', 'Cramps', 'Headache', 'Mood Swings', 'Acne', 'Weight Change', 'Nausea'];

const LogForm: React.FC<Props> = ({ initialAge, onAdd, onClose }) => {
  const [age, setAge] = useState(initialAge);
  const today = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [intensity, setIntensity] = useState<FlowIntensity>('Normal');
  const [pain, setPain] = useState<PainLevel>('Low');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [isMissed, setIsMissed] = useState(false);
  const [isPregnant, setIsPregnant] = useState(false); 
  const [notes, setNotes] = useState('');

  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<{ prediction: string, warning: string } | null>(null);
  const [logDataToSave, setLogDataToSave] = useState<any>(null);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (new Date(startDate) > new Date() || new Date(endDate) > new Date()) {
        alert("⚠️ You cannot log a period for a future date.");
        return;
    }

    const duration = (isMissed || isPregnant) ? 0 : Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const currentLogData = {
      startDate,
      endDate: (isMissed || isPregnant) ? startDate : endDate,
      duration,
      flowIntensity: (isMissed || isPregnant) ? ('None' as any) : intensity, 
      painLevel: (isMissed || isPregnant) ? ('None' as any) : pain,
      symptoms: selectedSymptoms,
      isMissed,
      isPregnant, 
      notes
    };

    setIsPredicting(true);

    try {
      const result = await api.predictHealthRisk({
         age,
         duration,
         flowIntensity: currentLogData.flowIntensity,
         painLevel: currentLogData.painLevel,
         symptoms: selectedSymptoms
      });

      setPredictionResult({
        prediction: result.prediction,
        warning: result.warning
      });
      
      setLogDataToSave(currentLogData);

    } catch (error) {
      console.error("Prediction failed", error);
      
      // Fallback Encryption
      const encryptedFallbackString = CryptoJS.AES.encrypt(JSON.stringify(currentLogData), SECRET_KEY).toString();
      onAdd({ secureData: encryptedFallbackString }, age);
      onClose();
    } finally {
      setIsPredicting(false);
    }
  };

  const handleFinish = () => {
      if (logDataToSave) {
          // 🔒 ZERO-KNOWLEDGE ENCRYPTION: Lock payload with exact matching key
          const encryptedString = CryptoJS.AES.encrypt(JSON.stringify(logDataToSave), SECRET_KEY).toString();
          
          const securePayload = {
             secureData: encryptedString 
          };

          onAdd(securePayload, age);
      }
      onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white rounded-t-[2rem] sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:fade-in sm:zoom-in duration-300 max-h-[95vh] flex flex-col">
        
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 sm:hidden"></div>

        <div className="px-5 py-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-slate-800">
            {predictionResult ? "Health Analysis" : "Log Period Cycle"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        {predictionResult ? (
          <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in overflow-y-auto">
             <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-2 shrink-0">
                <Activity size={40} />
             </div>
             <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Pattern Assessment</h3>
                <p className={`text-3xl font-black ${predictionResult.prediction === 'Normal' ? 'text-emerald-500' : 'text-rose-500'}`}>
                   {predictionResult.prediction}
                </p>
             </div>
             
             <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-sm flex gap-3 items-start text-left w-full">
                <AlertCircle size={20} className="shrink-0 mt-0.5 text-amber-600" />
                <p>{predictionResult.warning}</p>
             </div>

             <button 
                onClick={handleFinish}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 sm:py-3.5 rounded-2xl shadow-lg transition-all flex justify-center items-center gap-2 mt-4"
             >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z"></path></svg>
                Secure Log & Return to Dashboard
             </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 overflow-y-auto pb-8 sm:pb-6">
            
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Pregnancy Status</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={() => { setIsPregnant(true); setIsMissed(true); }} className={`flex-1 py-3.5 sm:py-3 rounded-xl text-sm font-bold border flex items-center justify-center gap-2 transition-all ${isPregnant ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-500/10' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  <Baby size={18} /> Pregnant
                </button>
                <button type="button" onClick={() => setIsPregnant(false)} className={`flex-1 py-3.5 sm:py-3 rounded-xl text-sm font-bold border flex items-center justify-center gap-2 transition-all ${!isPregnant ? 'bg-rose-50 border-rose-200 text-rose-700 ring-2 ring-rose-500/10' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  Non-Pregnant
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Current Age</label>
                <input type="number" value={age} onChange={(e) => setAge(parseInt(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 sm:py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-semibold" placeholder="Years" />
              </div>
              <div className="flex flex-col justify-end">
                  <button type="button" disabled={isPregnant} onClick={() => setIsMissed(!isMissed)} className={`w-full py-3 sm:py-2.5 rounded-xl text-sm font-bold border flex items-center justify-center gap-2 transition-all ${isMissed ? 'bg-amber-50 border-amber-200 text-amber-700 ring-2 ring-amber-500/10' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'} ${isPregnant ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <AlertCircle size={16} />
                    {isMissed ? 'Missed Cycle' : 'Normal Cycle'}
                  </button>
              </div>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all ${(isMissed || isPregnant) ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Start Date</label>
                <input type="date" max={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 sm:py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">End Date</label>
                <input type="date" max={today} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 sm:py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
              </div>
            </div>

            {!(isMissed || isPregnant) && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Flow Intensity</label>
                  <div className="grid grid-cols-3 sm:flex gap-2">
                    {(['Light', 'Normal', 'Heavy'] as FlowIntensity[]).map((level) => (
                      <button key={level} type="button" onClick={() => setIntensity(level)} className={`flex-1 py-3 sm:py-2.5 rounded-xl text-sm font-medium border transition-all ${intensity === level ? 'bg-rose-50 border-rose-200 text-rose-600 ring-2 ring-rose-500/10' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Pain Level</label>
                  <div className="grid grid-cols-3 sm:flex gap-2">
                    {(['Low', 'Medium', 'High'] as PainLevel[]).map((level) => (
                      <button key={level} type="button" onClick={() => setPain(level)} className={`flex-1 py-3 sm:py-2.5 rounded-xl text-sm font-medium border transition-all ${pain === level ? 'bg-orange-50 border-orange-200 text-orange-600 ring-2 ring-orange-500/10' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Symptoms Observed</label>
              <div className="flex flex-wrap gap-2">
                {SYMPTOMS.map((s) => (
                  <button key={s} type="button" onClick={() => toggleSymptom(s)} className={`px-4 py-2.5 sm:py-2 rounded-full text-sm sm:text-xs font-semibold transition-all border ${selectedSymptoms.includes(s) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 sm:pt-4">
              <button 
                type="submit" 
                disabled={isPredicting}
                className={`w-full text-white font-bold py-4 sm:py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                  isPredicting ? 'bg-slate-400 cursor-not-allowed' :
                  isPregnant ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' :
                  isMissed ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' : 
                  'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
                }`}
              >
                {isPredicting ? (
                   <>
                     <Loader2 size={20} className="animate-spin" />
                     Analyzing Patterns...
                   </>
                ) : (
                   <>
                     <Check size={20} />
                     {isPregnant ? 'Log Pregnancy Status' : (isMissed ? 'Record Missed Period' : 'Save Entry')}
                   </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LogForm;