import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Check, Loader2, ArrowRight, Globe } from 'lucide-react';
import { Button } from './ui/Button';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const WaitingRoom = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      const waitlistRef = doc(db, 'waitlist', email.toLowerCase());
      
      try {
        await setDoc(waitlistRef, {
          email: email.toLowerCase(),
          status: 'pending',
          createdAt: serverTimestamp()
        });
        setStatus('success');
        setMessage("You've been added to the waitlist.");
      } catch (err: any) {
        console.error("Firestore write error:", err);
        throw err;
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfcfb] flex flex-col items-center justify-center p-6 text-charcoal">
      <div className="max-w-2xl w-full space-y-16 text-center">
        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <div className="w-12 h-12 bg-charcoal rounded-sm rotate-45 flex items-center justify-center text-white">
            <span className="rotate-[-45deg] font-serif font-bold text-xl">F</span>
          </div>
        </motion.div>

        {/* Hero Text */}
        <div className="space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-7xl font-serif leading-[1.1] tracking-tighter"
          >
            A private home for your <br />
            <span className="italic text-sage">digital postcards.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-charcoal/40 text-sm md:text-base uppercase tracking-[0.2em] font-bold"
          >
            Folio is currently in private beta.
          </motion.p>
        </div>

        {/* Action */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="max-w-md mx-auto w-full"
        >
          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-sage/10 border border-sage/20 p-8 rounded-2xl space-y-4"
              >
                <div className="w-12 h-12 bg-sage text-white rounded-full flex items-center justify-center mx-auto">
                  <Check size={24} />
                </div>
                <h3 className="font-serif text-xl">You're on the list.</h3>
                <p className="text-sm text-charcoal/60 leading-relaxed">
                  We're letting people in slowly to ensure the best experience. <br />
                  Keep an eye on your inbox for a digital invitation.
                </p>
              </motion.div>
            ) : (
              <motion.form 
                key="form"
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div className="relative group">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-charcoal/10 rounded-full px-8 py-5 text-lg outline-none focus:ring-4 focus:ring-sage/10 focus:border-sage transition-all text-center"
                  />
                  <button 
                    type="submit"
                    disabled={status === 'loading'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-charcoal text-white rounded-full flex items-center justify-center hover:bg-sage transition-colors disabled:opacity-50"
                  >
                    {status === 'loading' ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                  </button>
                </div>
                {status === 'error' && (
                  <p className="text-red-500 text-xs font-bold uppercase tracking-widest">{message}</p>
                )}
                <p className="text-[10px] text-charcoal/30 uppercase tracking-widest font-bold">
                  Join the waitlist for early access
                </p>
              </motion.form>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-12 flex flex-col items-center gap-6"
          >
            <Link 
              to="/explore" 
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-charcoal/40 hover:text-sage transition-colors group"
            >
              <Globe size={14} className="group-hover:rotate-12 transition-transform" />
              Explore the Gallery
            </Link>

            <div className="w-8 h-px bg-charcoal/5" />

            <button 
              onClick={() => {
                window.location.href = '/?login=true';
              }}
              className="text-[10px] font-bold uppercase tracking-widest text-charcoal/20 hover:text-sage transition-colors"
            >
              Already a curator? Sign In
            </button>

            <div className="text-center mt-4">
              <p className="text-[9px] text-charcoal/20 uppercase tracking-widest font-bold">
                Tip: If login fails, try <button onClick={() => window.open(window.location.href, '_blank')} className="text-sage underline">opening in a new tab</button>
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="pt-12 border-t border-charcoal/5 flex flex-col md:flex-row items-center justify-center gap-8 text-[10px] font-bold uppercase tracking-[0.3em] text-charcoal/20"
        >
          <span>Curated with intention</span>
          <span className="hidden md:block">&bull;</span>
          <span>Encrypted by default</span>
          <span className="hidden md:block">&bull;</span>
          <span>Ad-free forever</span>
        </motion.div>
      </div>
    </div>
  );
};
