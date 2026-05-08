import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { DocumentData, OperationType } from './types';
import { handleFirestoreError } from './lib/firebaseUtils';
import Dashboard from './components/Dashboard';
import { Scale, LogIn, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Ensure user doc exists
        const userRef = doc(db, 'users', u.uid);
        try {
          await setDoc(userRef, {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            updatedAt: serverTimestamp(),
            lastLogin: serverTimestamp()
          }, { merge: true });
        } catch (err) {
          console.error("Error creating user doc", err);
        }
      }
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
             <Scale className="w-6 h-6 text-white" />
          </div>
          <span className="font-sans font-medium text-sm text-slate-400 tracking-widest uppercase">Initializing Systems</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div 
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="h-screen flex flex-col items-center justify-center p-4 bg-slate-100"
          >
            <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-2xl border border-slate-200 text-center relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50" />
              
              <div className="relative z-10">
                <div className="flex justify-center mb-10">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl transform rotate-3">
                    <span className="text-white font-black text-3xl italic">L</span>
                  </div>
                </div>
                
                <h1 className="text-3xl font-bold mb-3 tracking-tighter text-slate-800">LexAI<span className="text-blue-600 font-normal underline decoration-4 underline-offset-4">Pro</span></h1>
                <p className="text-slate-500 mb-10 leading-relaxed font-normal text-sm px-4">
                  The ultimate legal consultancy platform. Secure, distributed, and powered by advanced analytical intelligence.
                </p>
                
                <button
                  onClick={handleLogin}
                  className="w-full bg-blue-600 text-white py-3.5 rounded-xl flex items-center justify-center gap-3 hover:bg-blue-700 transition-all group font-bold text-sm shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                >
                  <LogIn className="w-4 h-4" />
                  AUTHENTICATE WITH GOOGLE
                </button>
                
                <div className="mt-12 flex items-center justify-center gap-6 opacity-30">
                   <div className="h-px w-8 bg-slate-300" />
                   <span className="text-[10px] font-black uppercase tracking-[0.3em]">Corporate Grade</span>
                   <div className="h-px w-8 bg-slate-300" />
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <Dashboard key="app" user={user} />
        )}
      </AnimatePresence>
    </div>
  );
}
