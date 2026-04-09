import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Crown, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../lib/utils';

interface LimitReachedModalProps {
  type: 'folios' | 'postcards' | 'photos';
  onClose: () => void;
}

export const LimitReachedModal = ({ type, onClose }: LimitReachedModalProps) => {
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);

  const handleNotify = async () => {
    if (!auth.currentUser?.email) {
      alert('Please log in to join the waitlist.');
      return;
    }

    setLoading(true);
    try {
      await setDoc(doc(db, 'waitlist', auth.currentUser.email), {
        email: auth.currentUser.email,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        source: `limit_reached_${type}`
      });
      setJoined(true);
    } catch (error) {
      console.error('Error joining waitlist:', error);
      alert('Failed to join waitlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const limitInfo = {
    folios: {
      title: 'Collection Limit Reached',
      description: 'You have reached the maximum number of collections allowed in the beta version.',
      icon: <Zap className="text-sage" size={32} />,
    },
    postcards: {
      title: 'Postcard Limit Reached',
      description: 'You have reached the maximum number of postcards allowed in the free tier.',
      icon: <Zap className="text-sage" size={32} />,
    },
    photos: {
      title: 'Photo Limit Reached',
      description: 'Each postcard can hold up to 5 high-resolution photos in the current version.',
      icon: <Zap className="text-sage" size={32} />,
    }
  };

  const info = limitInfo[type];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-canvas rounded-3xl shadow-2xl overflow-hidden p-8 text-center space-y-6"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-charcoal/20 hover:text-charcoal transition-colors"
        >
          <X size={20} />
        </button>

        <div className="w-20 h-20 bg-sage/10 rounded-full flex items-center justify-center mx-auto">
          {info.icon}
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-serif">{info.title}</h3>
          <p className="text-charcoal/60 text-sm leading-relaxed">
            {info.description}
          </p>
        </div>

        <div className="p-6 bg-charcoal/5 rounded-2xl border border-charcoal/5 space-y-4">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-sage">
              <Crown size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest">Folio Premium</h4>
              <p className="text-[10px] text-charcoal/40">Coming soon in future updates</p>
            </div>
          </div>
          <p className="text-[11px] text-charcoal/60 text-left leading-relaxed">
            Unlock increased collections, higher image resolution, custom domains, and advanced privacy features with our upcoming subscription plans.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button variant="primary" onClick={onClose} className="w-full">
            Got it
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleNotify}
            disabled={loading || joined}
            className={cn(
              "w-full text-xs uppercase tracking-widest font-bold gap-2",
              joined && "text-sage"
            )}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={14} />
            ) : joined ? (
              <>You're on the list! <Check size={14} /></>
            ) : (
              <>Notify me when Premium launches <ArrowRight size={14} /></>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
