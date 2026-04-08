import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { User, MapPin, Loader2, ArrowLeft, Globe, Calendar, Lock, Users, Mail, ShieldCheck, Share2, Check } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, onSnapshot, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { FolioGrid } from './FolioGrid';
import { Button } from './ui/Button';
import { AnimatePresence, motion } from 'motion/react';

export const FolioView = () => {
  const { username, shareId } = useParams<{ username: string; shareId?: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [folios, setFolios] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // OTP State
  const [isVerified, setIsVerified] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [authLoading, setAuthLoading] = useState(false);
  const [shareData, setShareData] = useState<any>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleShareFolio = () => {
    const url = window.location.href;
    copyToClipboard(url, 'folio');
  };

  const handleShareCollection = (folio: any) => {
    const baseUrl = window.location.origin;
    let shareUrl = '';
    
    // If it's a public collection or has a public link enabled, use the premium public view
    if ((folio.privacy === 'public' || folio.visibility === 'public') && userProfile?.profilePrivacy === 'public') {
      shareUrl = `${baseUrl}/s/${folio.id}`;
    } 
    // Otherwise, use the private guest view link
    else {
      shareUrl = `${baseUrl}/v/${folio.id}`;
    }

    copyToClipboard(shareUrl, folio.id);
  };

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(null);

    const checkAccess = async () => {
      try {
        // 1. Find user by username
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef, 
          where('username', '==', username)
        );
        
        let userSnap: any = null;
        try {
          userSnap = await getDocs(q);
        } catch (e) {
          console.warn('Could not query users (profile might be private):', e);
        }

        let userData: any = null;
        let userId: string = '';

        if (userSnap && !userSnap.empty) {
          userData = userSnap.docs[0].data();
          userId = userSnap.docs[0].id;
        }

        // If we have a token, we can try to get user info from the token if userSnap is empty or denied
        if (token) {
          const tokenSnap = await getDoc(doc(db, 'folio_tokens', token));
          
          if (!tokenSnap.exists()) {
            setError('Invalid or expired folio link');
            setLoading(false);
            return;
          }

          const tokenData = tokenSnap.data();
          userId = tokenData.userId;
          
          // If we couldn't get userData from the username query (because it's private),
          // use the data from the token
          if (!userData) {
            userData = {
              uid: userId,
              displayName: tokenData.displayName || 'Curator',
              username: tokenData.username || username,
              profilePrivacy: 'private' // We know it's private if the query failed
            };
          }
          
          if (tokenData.userId !== userId) {
             // This should match if we got userId from tokenData
          }
          setIsVerified(true);
        } else if (!userData) {
          setError('User not found or profile is private');
          setLoading(false);
          return;
        }

        // Check profile privacy for public links (only if no token and no shareId)
        if (!shareId && !token && userData.profilePrivacy !== 'public') {
          setError('This folio is private');
          setLoading(false);
          return;
        }

        setUserProfile({ id: userId, ...userData });

        // 2. Check Share ID if present
        if (shareId) {
          const shareDoc = await getDoc(doc(db, 'shares', shareId));
          if (shareDoc.exists() && shareDoc.data().status === 'active' && shareDoc.data().type === 'folio') {
            setShareData({ id: shareDoc.id, ...shareDoc.data() });
            setLoading(false);
            return;
          } else {
            setError('Invalid or expired folio invite');
            setLoading(false);
            return;
          }
        }

        await fetchFolios(userId, token);
      } catch (err) {
        console.error('Error checking folio access:', err);
        setError('Access denied');
        setLoading(false);
      }
    };

    checkAccess();
  }, [username, shareId, token]);

  const fetchFolios = async (userId: string, folioToken?: string | null) => {
    try {
      const foliosRef = collection(db, 'folios');
      let foliosQuery;
      
      const isPrivateInvite = !!shareId;
      const isPublicFolioLink = !!folioToken;

      if (isPrivateInvite) {
        // Private invite: Can see Public + Private (not Personal)
        foliosQuery = query(
          foliosRef, 
          where('creatorId', '==', userId)
        );
      } else {
        // Public link or just profile: All collections (we filter in memory)
        foliosQuery = query(
          foliosRef, 
          where('creatorId', '==', userId)
        );
      }

      const foliosSnapshot = await getDocs(foliosQuery);
      const fetchedFolios = foliosSnapshot.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
        .filter((f: any) => {
          if (isPrivateInvite) {
            // Filter out personal collections for private invites
            return f.privacy !== 'personal';
          }
          // Public view: must be public or have public link enabled
          return f.privacy === 'public' || f.visibility === 'public';
        });

      setFolios(fetchedFolios);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching folios:', err);
      setError('Access denied or collection not found');
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setAuthLoading(true);
    // Simulate OTP send
    setTimeout(() => {
      setStep('otp');
      setAuthLoading(false);
    }, 1000);
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setAuthLoading(true);
    
    // Simulate verification
    setTimeout(async () => {
      if (otp === '123456' || email === shareData?.email) {
        setIsVerified(true);
        await fetchFolios(userProfile.id);
        // Track access
        await updateDoc(doc(db, 'shares', shareData.id), {
          accessedBy: arrayUnion(email)
        });
      } else {
        alert('Invalid code. Try 123456 for demo.');
      }
      setAuthLoading(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <Loader2 className="animate-spin text-sage" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-6 text-center space-y-6">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm">
          <Lock className="text-sage/20" size={32} />
        </div>
        <h2 className="text-4xl font-serif">{error}</h2>
        <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
          <ArrowLeft size={18} /> Back to Home
        </Button>
      </div>
    );
  }

  if (!isVerified && shareData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-xl space-y-8 text-center"
        >
          <div className="w-16 h-16 bg-sage/10 text-sage rounded-2xl flex items-center justify-center mx-auto">
            <Users size={32} />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-serif">Folio Guest Pass</h2>
            <p className="text-sm text-charcoal/60 italic">
              Verification required to view <span className="font-bold text-charcoal not-italic">{userProfile?.displayName}'s Folio</span>
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 'email' ? (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/30" size={20} />
                  <input 
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-canvas rounded-2xl border-none focus:ring-2 focus:ring-sage/20 outline-none transition-all text-lg"
                  />
                </div>
                <Button 
                  variant="primary" 
                  size="lg" 
                  className="w-full py-6 text-lg"
                  onClick={handleSendOtp}
                  disabled={authLoading || !email}
                >
                  {authLoading ? <Loader2 className="animate-spin" /> : 'Send Access Code'}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <input 
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full py-4 bg-canvas rounded-2xl border-none focus:ring-2 focus:ring-sage/20 outline-none transition-all text-4xl text-center tracking-[0.5em] font-mono"
                  />
                  <p className="text-xs text-charcoal/40">
                    Enter the 6-digit code sent to <span className="text-charcoal font-bold">{email}</span>
                  </p>
                </div>
                <Button 
                  variant="primary" 
                  size="lg" 
                  className="w-full py-6 text-lg"
                  onClick={handleVerifyOtp}
                  disabled={authLoading || otp.length !== 6}
                >
                  {authLoading ? <Loader2 className="animate-spin" /> : 'Verify & Enter'}
                </Button>
                <button 
                  onClick={() => setStep('email')}
                  className="text-xs font-bold uppercase tracking-widest text-charcoal/40 hover:text-charcoal transition-colors"
                >
                  Change Email
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-[10px] text-charcoal/30 uppercase tracking-[0.2em] font-bold">
            Secure Private Link &bull; Folio Guest Pass
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-7xl mx-auto px-6 pt-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/')}
          className="gap-2 text-charcoal/40 hover:text-charcoal transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Button>
      </div>

      <div className="bg-white border-b border-charcoal/5 mt-8">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-canvas shadow-xl bg-canvas shrink-0">
              {userProfile.photoURL ? (
                <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-charcoal/10">
                  <User size={48} />
                </div>
              )}
            </div>
            
            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                  <h1 className="text-4xl md:text-5xl font-serif">{userProfile.displayName}'s Folio</h1>
                  <p className="text-sage font-bold tracking-widest text-sm uppercase">Shared Access View</p>
                </div>
                {userProfile.profilePrivacy === 'public' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 self-center md:self-auto"
                    onClick={handleShareFolio}
                  >
                    {copied === 'folio' ? <Check size={16} className="text-sage" /> : <Share2 size={16} />}
                    {copied === 'folio' ? 'Link Copied' : 'Share Folio'}
                  </Button>
                )}
              </div>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-charcoal/40">
                  <Users size={14} className="text-sage" />
                  {folios.length} Shared Collections
                </div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-charcoal/40">
                  <Calendar size={14} className="text-sage" />
                  Last Updated {userProfile.updatedAt ? new Date(userProfile.updatedAt).toLocaleDateString() : 'Recently'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-16 px-6 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-serif">Shared Collections</h2>
          <p className="text-charcoal/40 text-sm italic">You have access to view these collections via the shared folio link.</p>
          <div className="w-12 h-px bg-sage/20 mx-auto" />
        </div>

        {folios.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-charcoal/10">
            <p className="text-charcoal/40 italic">No collections available in this folio.</p>
          </div>
        ) : (
          <FolioGrid 
            folios={folios} 
            onSelect={(id) => {
              const folio = folios.find(f => f.id === id);
              if (folio?.privacy === 'public' || folio?.visibility === 'public') {
                navigate(`/s/${id}`);
              } else {
                navigate(`/v/${id}${token ? `?folioToken=${token}` : ''}`);
              }
            }} 
            onShare={handleShareCollection}
          />
        )}
      </main>

      <footer className="py-12 border-t border-charcoal/5 text-center">
        <div className="text-charcoal/30 text-xs uppercase tracking-widest font-bold">
          Shared Folio Access &mdash; Powered by Folio
        </div>
      </footer>
    </div>
  );
};
