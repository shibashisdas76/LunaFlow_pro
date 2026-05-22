import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pill, Plus, Clock, Trash2 } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

export const MedicationTracker = ({ user }) => {
  const [meds, setMeds] = useState([]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedTime, setNewMedTime] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Fetch medications from Firebase instantly
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'users', user.uid, 'medications'), orderBy('time'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMeds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddMed = async (e) => {
    e.preventDefault();
    if (!newMedName || !newMedTime) return;
    
    setIsAdding(true);
    await addDoc(collection(db, 'users', user.uid, 'medications'), {
      name: newMedName,
      time: newMedTime,
      createdAt: new Date().toISOString()
    });
    setNewMedName('');
    setNewMedTime('');
    setIsAdding(false);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'users', user.uid, 'medications', id));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between glass-card p-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-luna-gradient flex items-center justify-center">
            <Pill className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Medication Schedule</h2>
            <p className="text-gray-400 text-sm">Manage your prescriptions and daily vitamins.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ADD NEW MEDICATION FORM */}
        <div className="col-span-1 glass-card p-6 h-fit">
          <h3 className="text-lg font-bold text-white mb-4">Add Prescription</h3>
          <form onSubmit={handleAddMed} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-widest pl-1">Medicine Name</label>
              <input 
                type="text" required placeholder="e.g. Iron Supplement" value={newMedName} onChange={(e) => setNewMedName(e.target.value)}
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-luna-purple/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-widest pl-1">Reminder Time</label>
              <input 
                type="time" required value={newMedTime} onChange={(e) => setNewMedTime(e.target.value)}
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-luna-purple/50"
              />
            </div>
            <button disabled={isAdding} type="submit" className="w-full py-3 rounded-xl bg-luna-purple/20 text-luna-purple font-bold hover:bg-luna-purple/30 transition-colors flex items-center justify-center border border-luna-purple/30">
              <Plus className="w-5 h-5 mr-1" /> Add to Schedule
            </button>
          </form>
        </div>

        {/* MEDICATION LIST */}
        <div className="col-span-1 lg:col-span-2 space-y-3">
          <AnimatePresence>
            {meds.length === 0 ? (
              <div className="glass-card p-8 text-center text-gray-400 border border-white/5 border-dashed">
                No medications scheduled. Add one to get voice reminders!
              </div>
            ) : (
              meds.map((med) => (
                <motion.div key={med.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card p-4 flex items-center justify-between border-l-4 border-l-luna-purple">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">{med.name}</h4>
                      <p className="text-sm text-luna-pink font-medium">{med.time}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(med.id)} className="p-2 text-gray-500 hover:text-red-400 transition-colors bg-white/5 rounded-lg hover:bg-red-400/10">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};