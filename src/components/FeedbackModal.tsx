import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
}

export const FeedbackModal = ({ isOpen, onClose, user }: FeedbackModalProps) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const summary = message.slice(0, 50) + (message.length > 50 ? '...' : '');
      const response = await fetch('/api/support/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          summary,
          identity: user ? `${user.displayName} (${user.email})` : 'Guest',
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit feedback');
      
      const data = await response.json().catch(() => ({}));
      if (!data.success) throw new Error('Invalid response from server');

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setMessage('');
        onClose();
      }, 3000);
    } catch (err) {
      setError('Service Unavailable');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
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
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {isSuccess ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-12 text-center space-y-4"
              >
                <div className="flex justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12 }}
                  >
                    <CheckCircle2 size={64} className="text-sage" />
                  </motion.div>
                </div>
                <h3 className="text-2xl font-serif">Thank you!</h3>
                <p className="text-charcoal/60 italic">
                  Your feedback helps us improve Folio for everyone.
                </p>
                <div className="pt-4">
                  <div className="h-1 w-24 bg-sage/20 mx-auto rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ x: "-100%" }}
                      animate={{ x: "0%" }}
                      transition={{ duration: 3, ease: "linear" }}
                      className="h-full bg-sage"
                    />
                  </div>
                </div>
              </motion.div>
            ) : error === 'Service Unavailable' ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-12 text-center space-y-6"
              >
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
                    <Loader2 size={32} className="text-amber-500 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-serif">We're so sorry.</h3>
                  <p className="text-charcoal/60 italic editorial-text leading-relaxed">
                    Our feedback system is currently undergoing maintenance or is temporarily unavailable. 
                  </p>
                  <p className="text-charcoal/40 text-sm italic">
                    We're already working to bring it back online. Please try again in a little while.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="w-full"
                >
                  Close
                </Button>
              </motion.div>
            ) : (
              <>
                <div className="p-6 border-b border-charcoal/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-serif">Send Feedback</h3>
                    <p className="text-[10px] text-charcoal/40 uppercase tracking-widest font-bold">Help us improve Folio</p>
                  </div>
                  <button 
                    onClick={onClose}
                    className="p-2 hover:bg-charcoal/5 rounded-full transition-colors"
                  >
                    <X size={20} className="text-charcoal/40" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-charcoal/60">
                      What's happening?
                    </label>
                    <textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Share a bug, a feature request, or just some love..."
                      className="w-full bg-charcoal/5 border border-transparent focus:border-sage/20 focus:bg-white rounded-xl p-4 text-sm outline-none transition-all min-h-[120px] resize-none"
                      autoFocus
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-red-500 italic">{error}</p>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-[10px] text-charcoal/30 italic">
                      {user ? `Posting as ${user.displayName}` : 'Posting as Guest'}
                    </p>
                    <Button 
                      variant="primary" 
                      type="submit"
                      disabled={isSubmitting || !message.trim()}
                      className="gap-2"
                    >
                      {isSubmitting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                      Send Feedback
                    </Button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
