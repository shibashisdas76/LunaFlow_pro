import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User as UserIcon, Calendar, ArrowRight, ArrowLeft, HeartPulse, AlertCircle } from 'lucide-react';
import { auth, db } from '../../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const AuthPage = ({ onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const InputField = ({ icon: Icon, type, placeholder, label, name, required }) => (
    <div className="space-y-1 relative group">
      <label className="text-xs text-gray-400 font-medium uppercase tracking-widest pl-1">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-gray-500 group-focus-within:text-luna-purple transition-colors" />
        </div>
        <input name={name} type={type} required={required} placeholder={placeholder} className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-luna-purple/50 focus:bg-white/10 transition-all focus:shadow-[0_0_20px_rgba(168,85,247,0.15)]" />
      </div>
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const name = formData.get('name');
    const dueDate = formData.get('dueDate');

    try {
      if (isLogin) {
        // Firebase Login
        await signInWithEmailAndPassword(auth, email, password);
        // Note: We don't need onAuthSuccess here! App.jsx will automatically detect the login state.
      } else {
        // Firebase Register
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save extra user profile data to Firestore
        await setDoc(doc(db, 'users', user.uid), {
          name: name,
          email: email,
          dueDate: dueDate,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05010d] flex flex-col items-center justify-center relative p-4 overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-luna-purple/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-luna-pink/20 blur-[120px] rounded-full pointer-events-none" />

      <button onClick={onBack} className="absolute top-8 left-8 flex items-center space-x-2 text-gray-400 hover:text-white transition-colors z-20"><ArrowLeft className="w-5 h-5" /><span className="font-medium">Back to Home</span></button>

      <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-md relative z-10">
        <div className="glass-card p-8 md:p-10 border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-luna-gradient opacity-10 blur-3xl rounded-full" />
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-luna-gradient flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.4)] mb-4"><HeartPulse className="text-white w-8 h-8" /></div>
            <h2 className="text-3xl font-bold text-white mb-2">{isLogin ? 'Welcome Back' : 'Join LunaClip'}</h2>
            <p className="text-gray-400 text-sm">{isLogin ? 'Securely access your maternal health dashboard.' : 'Start your peaceful pregnancy journey today.'}</p>
          </div>

          {error && <div className="mb-6 p-3 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center space-x-2 text-red-400 text-sm"><AlertCircle className="w-4 h-4" /><span>{error}</span></div>}

          <AnimatePresence mode="wait">
            <motion.form key={isLogin ? 'login' : 'register'} initial={{ opacity: 0, x: isLogin ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isLogin ? 20 : -20 }} transition={{ duration: 0.2 }} className="space-y-5" onSubmit={handleSubmit}>
              {!isLogin && <InputField name="name" icon={UserIcon} type="text" placeholder="Sarah Jenkins" label="Full Name" required={!isLogin} />}
              <InputField name="email" icon={Mail} type="email" placeholder="you@example.com" label="Email Address" required={true} />
              <InputField name="password" icon={Lock} type="password" placeholder="••••••••" label="Password" required={true} />
              {!isLogin && <InputField name="dueDate" icon={Calendar} type="date" placeholder="" label="Expected Due Date" />}

              <button disabled={isLoading} type="submit" className="w-full py-4 mt-4 rounded-2xl bg-luna-gradient text-white font-bold text-lg flex items-center justify-center space-x-2 hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] transition-all group disabled:opacity-50">
                <span>{isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}</span>
                {!isLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </button>
            </motion.form>
          </AnimatePresence>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-luna-purple font-bold hover:text-luna-pink transition-colors">{isLogin ? 'Sign up' : 'Sign in'}</button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};