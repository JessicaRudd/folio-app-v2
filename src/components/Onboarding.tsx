import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Globe, 
  Lock, 
  Share2, 
  Mail, 
  Key, 
  User, 
  CheckCircle2,
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from './ui/Button';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface OnboardingProps {
  onClose: () => void;
  onSuccess: () => void;
  initialStep?: Step;
}

type Step = 'welcome' | 'concepts' | 'privacy' | 'auth-email' | 'auth-password' | 'auth-signup' | 'forgot-password';

export const Onboarding = ({ onClose, onSuccess, initialStep }: OnboardingProps) => {
  const [step, setStep] = useState<Step>(initialStep || 'welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleNext = () => {
    if (step === 'welcome') setStep('concepts');
    else if (step === 'concepts') setStep('privacy');
    else if (step === 'privacy') setStep('auth-email');
  };

  const handleBack = () => {
    if (step === 'concepts') setStep('welcome');
    else if (step === 'privacy') setStep('concepts');
    else if (step === 'auth-email') setStep('privacy');
    else if (step === 'auth-password' || step === 'auth-signup') setStep('auth-email');
    else if (step === 'forgot-password') setStep('auth-password');
  };

  const checkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    
    try {
      // Try to fetch sign-in methods first (cleanest way)
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) {
        setStep('auth-password');
      } else {
        setStep('auth-signup');
      }
    } catch (err: any) {
      console.log('fetchSignInMethodsForEmail error:', err.code);
      // If enumeration protection is on or operation is disabled, fallback to manual check
      if (err.code === 'auth/admin-restricted-operation' || err.code === 'auth/operation-not-allowed') {
        // Fallback: Try to sign in with a dummy password
        try {
          await signInWithEmailAndPassword(auth, email, 'dummy-password-123');
          onSuccess(); // Unlikely but possible
        } catch (signInErr: any) {
          if (signInErr.code === 'auth/user-not-found') {
            setStep('auth-signup');
          } else if (signInErr.code === 'auth/wrong-password' || signInErr.code === 'auth/invalid-credential') {
            // auth/invalid-credential is ambiguous, so we'll assume existing user
            // but provide a "Sign Up" link on that page
            setStep('auth-password');
          } else {
            setError(signInErr.message);
          }
        }
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !displayName) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName });
      
      // Create user document
      const userPath = `users/${user.uid}`;
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName,
          username: username.toLowerCase(),
          role: 'creator',
          profilePrivacy: 'private',
          follower_count: 0,
          following_count: 0,
          total_collection_count: 0,
          total_postcard_count: 0,
          createdAt: new Date().toISOString()
        });
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, userPath);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user doc exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // Create initial doc
        const userPath = `users/${user.uid}`;
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            username: user.email?.split('@')[0].toLowerCase() || `user_${user.uid.slice(0, 5)}`,
            role: 'creator',
            profilePrivacy: 'private',
            follower_count: 0,
            following_count: 0,
            total_collection_count: 0,
            total_postcard_count: 0,
            createdAt: new Date().toISOString()
          });
        } catch (err: any) {
          handleFirestoreError(err, OperationType.WRITE, userPath);
        }
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const renderWelcome = () => (
    <div className="space-y-8 text-center py-12">
      <div className="w-24 h-24 bg-sage/10 rounded-full flex items-center justify-center mx-auto">
        <div className="w-12 h-12 bg-charcoal rounded-sm rotate-45 flex items-center justify-center text-white">
          <span className="rotate-[-45deg] font-serif font-bold text-2xl">F</span>
        </div>
      </div>
      <div className="space-y-4">
        <h2 className="text-4xl font-serif">Welcome to Folio</h2>
        <p className="text-charcoal/60 italic text-lg max-w-md mx-auto">
          "A curated collection of digital postcards. Private memories, shared with intention."
        </p>
      </div>
      <Button variant="primary" onClick={handleNext} className="w-full py-6 text-lg group">
        Begin Your Journey <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
      </Button>
      <div className="text-center">
        <button 
          type="button" 
          onClick={() => setStep('auth-email')}
          className="text-xs text-charcoal/40 hover:text-sage font-bold uppercase tracking-widest transition-colors"
        >
          Already a creator? Sign In
        </button>
      </div>
    </div>
  );

  const renderConcepts = () => (
    <div className="space-y-12 py-8">
      <div className="space-y-2 text-center">
        <h3 className="text-3xl font-serif">The Art of Sharing</h3>
        <p className="text-charcoal/40 uppercase tracking-widest text-xs font-bold">Key Concepts</p>
      </div>
      
      <div className="grid gap-8">
        <div className="flex gap-6 items-start p-6 bg-white rounded-2xl border border-charcoal/5 shadow-sm">
          <div className="w-12 h-12 bg-sage/10 rounded-xl flex items-center justify-center shrink-0 text-sage">
            <Mail size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-charcoal">Digital Postcards</h4>
            <p className="text-charcoal/60 text-sm leading-relaxed">
              Capture moments with photos, music, and location. Each postcard is a standalone memory.
            </p>
          </div>
        </div>

        <div className="flex gap-6 items-start p-6 bg-white rounded-2xl border border-charcoal/5 shadow-sm">
          <div className="w-12 h-12 bg-sage/10 rounded-xl flex items-center justify-center shrink-0 text-sage">
            <Globe size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-charcoal">Curated Collections</h4>
            <p className="text-charcoal/60 text-sm leading-relaxed">
              Organize your postcards into beautiful collections. Tell a story across multiple moments.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button variant="ghost" onClick={handleBack} className="flex-1">Back</Button>
        <Button variant="primary" onClick={handleNext} className="flex-[2]">Next</Button>
      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div className="space-y-12 py-8">
      <div className="space-y-2 text-center">
        <h3 className="text-3xl font-serif">Privacy First</h3>
        <p className="text-charcoal/40 uppercase tracking-widest text-xs font-bold">Your Data, Your Control</p>
      </div>

      <div className="space-y-4">
        <div className="p-6 bg-white rounded-2xl border border-charcoal/5 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-sage">
            <Lock size={20} />
            <h4 className="font-bold text-charcoal">Private by Default</h4>
          </div>
          <p className="text-charcoal/60 text-sm leading-relaxed">
            Everything you create starts as private. Only you can see it until you decide otherwise.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 bg-sage/5 rounded-2xl border border-sage/10 space-y-3">
            <Globe size={18} className="text-sage" />
            <h5 className="font-bold text-xs uppercase tracking-widest">Public Profile</h5>
            <p className="text-[11px] text-charcoal/60 leading-relaxed">
              Share your curated world with the community.
            </p>
          </div>
          <div className="p-5 bg-sage/5 rounded-2xl border border-sage/10 space-y-3">
            <Share2 size={18} className="text-sage" />
            <h5 className="font-bold text-xs uppercase tracking-widest">Secure Links</h5>
            <p className="text-[11px] text-charcoal/60 leading-relaxed">
              Share specific folios with friends via unique tokens.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button variant="ghost" onClick={handleBack} className="flex-1">Back</Button>
        <Button variant="primary" onClick={handleNext} className="flex-[2]">Continue</Button>
      </div>
    </div>
  );

  const renderAuthEmail = () => (
    <div className="space-y-8 py-8">
      <div className="space-y-2 text-center">
        <h3 className="text-3xl font-serif">Get Started</h3>
        <p className="text-charcoal/40 uppercase tracking-widest text-xs font-bold">Enter your email to continue</p>
      </div>

      <form onSubmit={checkEmail} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/20" size={18} />
            <input 
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full py-4 pl-12 pr-4 bg-white rounded-xl border border-charcoal/5 focus:ring-2 focus:ring-sage/20 outline-none transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm flex gap-3 items-start">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <Button variant="primary" type="submit" disabled={loading} className="w-full py-6 text-lg">
          {loading ? <Loader2 className="animate-spin" /> : 'Continue'}
        </Button>

        <div className="text-center">
          <button 
            type="button" 
            onClick={() => setStep('auth-signup')}
            className="text-xs text-charcoal/40 hover:text-sage font-bold uppercase tracking-widest transition-colors"
          >
            I'm new here &mdash; Create Account
          </button>
        </div>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-charcoal/5"></div></div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold text-charcoal/20">
            <span className="bg-canvas px-4">Or</span>
          </div>
        </div>

        <Button variant="outline" type="button" onClick={handleGoogleLogin} className="w-full py-6 gap-3">
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Continue with Google
        </Button>
      </form>
    </div>
  );

  const renderAuthPassword = () => (
    <div className="space-y-8 py-8">
      <div className="space-y-2 text-center">
        <h3 className="text-3xl font-serif">Welcome Back</h3>
        <p className="text-charcoal/40 uppercase tracking-widest text-xs font-bold">Sign in to your account</p>
      </div>

      <form onSubmit={handleSignIn} className="space-y-6">
        <div className="p-4 bg-sage/5 rounded-xl border border-sage/10 flex items-center justify-between">
          <div className="text-sm text-charcoal/60">{email}</div>
          <button type="button" onClick={() => setStep('auth-email')} className="text-xs text-sage font-bold uppercase tracking-widest hover:underline">Change</button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Password</label>
            <button type="button" onClick={() => setStep('forgot-password')} className="text-xs text-sage font-bold uppercase tracking-widest hover:underline">Forgot?</button>
          </div>
          <div className="relative">
            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/20" size={18} />
            <input 
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full py-4 pl-12 pr-4 bg-white rounded-xl border border-charcoal/5 focus:ring-2 focus:ring-sage/20 outline-none transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm flex gap-3 items-start">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <Button variant="primary" type="submit" disabled={loading} className="w-full py-6 text-lg">
          {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
        </Button>

        <div className="text-center">
          <button 
            type="button" 
            onClick={() => setStep('auth-signup')}
            className="text-xs text-charcoal/40 hover:text-sage font-bold uppercase tracking-widest transition-colors"
          >
            Don't have an account? Sign Up
          </button>
        </div>
      </form>
    </div>
  );

  const renderAuthSignup = () => (
    <div className="space-y-8 py-8">
      <div className="space-y-2 text-center">
        <h3 className="text-3xl font-serif">Create Account</h3>
        <p className="text-charcoal/40 uppercase tracking-widest text-xs font-bold">Join the Folio community</p>
      </div>

      <form onSubmit={handleSignUp} className="space-y-6">
        <div className="p-4 bg-sage/5 rounded-xl border border-sage/10 flex items-center justify-between">
          <div className="text-sm text-charcoal/60">{email}</div>
          <button type="button" onClick={() => setStep('auth-email')} className="text-xs text-sage font-bold uppercase tracking-widest hover:underline">Change</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/20" size={16} />
              <input 
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full py-3 pl-10 pr-4 bg-white rounded-xl border border-charcoal/5 focus:ring-2 focus:ring-sage/20 outline-none transition-all text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/20 text-sm font-bold">@</span>
              <input 
                type="text"
                required
                value={username}
                maxLength={30}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_]/gi, '').toLowerCase())}
                placeholder="janedoe"
                className="w-full py-3 pl-10 pr-4 bg-white rounded-xl border border-charcoal/5 focus:ring-2 focus:ring-sage/20 outline-none transition-all text-sm"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Create Password</label>
          <div className="relative">
            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/20" size={18} />
            <input 
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full py-4 pl-12 pr-4 bg-white rounded-xl border border-charcoal/5 focus:ring-2 focus:ring-sage/20 outline-none transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm flex gap-3 items-start">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <Button variant="primary" type="submit" disabled={loading} className="w-full py-6 text-lg">
          {loading ? <Loader2 className="animate-spin" /> : 'Create Account'}
        </Button>

        <div className="text-center">
          <button 
            type="button" 
            onClick={() => setStep('auth-password')}
            className="text-xs text-charcoal/40 hover:text-sage font-bold uppercase tracking-widest transition-colors"
          >
            Already have an account? Sign In
          </button>
        </div>
      </form>
    </div>
  );

  const renderForgotPassword = () => (
    <div className="space-y-8 py-8">
      <div className="space-y-2 text-center">
        <h3 className="text-3xl font-serif">Reset Password</h3>
        <p className="text-charcoal/40 uppercase tracking-widest text-xs font-bold">We'll send you a link</p>
      </div>

      {resetSent ? (
        <div className="text-center space-y-6 py-8">
          <div className="w-20 h-20 bg-sage/10 rounded-full flex items-center justify-center mx-auto text-sage">
            <CheckCircle2 size={40} />
          </div>
          <div className="space-y-2">
            <h4 className="font-bold">Email Sent</h4>
            <p className="text-charcoal/60 text-sm">Check your inbox for instructions to reset your password.</p>
          </div>
          <Button variant="ghost" onClick={() => setStep('auth-password')} className="w-full">Back to Login</Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 bg-sage/5 rounded-xl border border-sage/10 text-sm text-charcoal/60">
            Resetting password for: <span className="font-bold">{email}</span>
          </div>
          
          <Button variant="primary" onClick={handleForgotPassword} disabled={loading} className="w-full py-6">
            {loading ? <Loader2 className="animate-spin" /> : 'Send Reset Link'}
          </Button>
          
          <Button variant="ghost" onClick={() => setStep('auth-password')} className="w-full">Cancel</Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
        className="relative w-full max-w-lg bg-canvas rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-charcoal/20 hover:text-charcoal transition-colors z-10"
        >
          <X size={24} />
        </button>

        <div className="flex-1 overflow-y-auto px-8 py-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 'welcome' && renderWelcome()}
              {step === 'concepts' && renderConcepts()}
              {step === 'privacy' && renderPrivacy()}
              {step === 'auth-email' && renderAuthEmail()}
              {step === 'auth-password' && renderAuthPassword()}
              {step === 'auth-signup' && renderAuthSignup()}
              {step === 'forgot-password' && renderForgotPassword()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress Dots */}
        {['welcome', 'concepts', 'privacy', 'auth-email'].includes(step) && (
          <div className="px-8 pb-8 flex justify-center gap-2">
            {['welcome', 'concepts', 'privacy', 'auth-email'].map((s, i) => (
              <div 
                key={s} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === s ? 'w-8 bg-sage' : 'w-1.5 bg-charcoal/10'
                }`} 
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};
