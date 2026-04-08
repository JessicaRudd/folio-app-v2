import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Postcard } from './Postcard';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Globe, ArrowLeft, Mail, ShieldCheck, Loader2, CheckCircle2, Share2, Check } from 'lucide-react';
import { Button } from './ui/Button';

export const GuestView = () => {
  const { folioId, secureToken } = useParams<{ folioId: string; secureToken: string }>();
  const [searchParams] = useSearchParams();
  const folioToken = searchParams.get('folioToken');
  const navigate = useNavigate();
  const [postcards, setPostcards] = useState<any[]>([]);
  const [folio, setFolio] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // OTP State
  const [isVerified, setIsVerified] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [authLoading, setAuthLoading] = useState(false);
  const [shareData, setShareData] = useState<any>(null);

  useEffect(() => {
    const checkShare = async () => {
      if (!folioId) return;

      try {
        // 1. If it's a folioToken link (Public Folio Link)
        if (folioToken) {
          await fetchData();
          setIsVerified(true);
          return;
        }

        // 2. If it's a public link (from Explore or Public Profile)
        if (secureToken === 'public') {
          await fetchData();
          setIsVerified(true);
          return;
        }

        // 3. If it's an old-style secureToken link or direct ID
        if (secureToken && secureToken !== 'invite') {
          await fetchData();
          setIsVerified(true);
          return;
        }

        // 4. Check if it's a new-style Share link (folioId here might actually be the shareId)
        try {
          const shareDoc = await getDoc(doc(db, 'shares', folioId!));
          if (shareDoc.exists() && shareDoc.data().status === 'active') {
            setShareData({ id: shareDoc.id, ...shareDoc.data() });
            
            // Fetch Folio
            const fDoc = await getDoc(doc(db, 'folios', shareDoc.data().folioId));
            if (fDoc.exists()) {
              setFolio(fDoc.data());
              const cDoc = await getDoc(doc(db, 'users', fDoc.data().creatorId));
              if (cDoc.exists()) setCreator(cDoc.data());
            }
            setLoading(false);
            return;
          }
        } catch (shareErr) {
          // Not a share ID, continue to direct lookup
        }

        // 5. Fallback to direct folio lookup (for public folios or direct links)
        await fetchData();
        setIsVerified(true);
      } catch (err) {
        console.error('Error checking share:', err);
        setError(true);
        setLoading(false);
      }
    };

    checkShare();
  }, [folioId, secureToken, folioToken]);

  const [copied, setCopied] = useState(false);
  const isProfilePublic = creator?.profilePrivacy === 'public';

  const handleShare = () => {
    const baseUrl = window.location.origin;
    let shareUrl = '';
    
    // If it's a public collection or has a public link enabled, use the premium public view
    if ((folio?.privacy === 'public' || folio?.visibility === 'public') && isProfilePublic) {
      shareUrl = `${baseUrl}/s/${folioId}`;
    } 
    // Otherwise, use the current URL (which might be a private invite link)
    else {
      shareUrl = window.location.href;
    }

    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchData = async (targetFolioId?: string) => {
    const id = targetFolioId || folioId;
    if (!id) return;

    try {
      let folioDoc;
      try {
        folioDoc = await getDoc(doc(db, 'folios', id));
      } catch (e) {
        console.warn('Permission denied fetching folio:', e);
        setError(true);
        setLoading(false);
        return;
      }

      if (folioDoc.exists()) {
        const folioData = folioDoc.data();
        
        // Fetch Creator Data (Optional, might fail if profile is private)
        let creatorData = null;
        try {
          const creatorDoc = await getDoc(doc(db, 'users', folioData.creatorId));
          creatorData = creatorDoc.exists() ? creatorDoc.data() : null;
        } catch (e) {
          console.warn('Could not fetch creator data (profile might be private):', e);
        }

        // Access Control Logic
        const hasValidFolioToken = folioToken && folioData.folioToken === folioToken;
        const isProfilePublic = creatorData?.profilePrivacy === 'public';

        // 1. If accessed via Public Folio Link (folioToken provided)
        if (hasValidFolioToken) {
          // Public Folio Link is ONLY valid if profile is public AND collection is public
          if (!isProfilePublic || folioData.privacy !== 'public') {
            setError(true);
            setLoading(false);
            return;
          }
        } 
        // 2. If accessed via Public Link (secureToken === 'public' or direct ID)
        else if (secureToken === 'public' || (!secureToken && !folioToken)) {
          // A collection is viewable publicly if:
          // - It's privacy is 'public' AND the profile is public
          // - OR it's privacy is 'private' but 'Public Link' (visibility) is enabled AND profile is public
          const canAccessPublicly = (folioData.privacy === 'public' && isProfilePublic) || 
                                   (folioData.privacy === 'private' && folioData.visibility === 'public' && isProfilePublic);
          
          if (!canAccessPublicly) {
            setError(true);
            setLoading(false);
            return;
          }
        }
        // 3. If accessed via old secureToken (not 'public' or 'invite')
        else if (secureToken && secureToken !== 'invite') {
           // Old secure tokens were for private sharing, they bypass profile privacy but still need valid token
           if (folioData.secureToken !== secureToken) {
             setError(true);
             setLoading(false);
             return;
           }
        }

        setFolio(folioData);
        
        if (!creatorData || creatorData.profilePrivacy !== 'public') {
          // Use denormalized data if profile is private
          creatorData = {
            displayName: folioData.creatorName || 'Curator',
            username: folioData.creatorUsername || '',
            profilePrivacy: 'private'
          };
        }
        
        setCreator(creatorData);

        const q = (folioToken && folioData.privacy !== 'public') 
          ? query(
              collection(db, 'postcards'),
              where('folioId', '==', id),
              where('folioToken', '==', folioToken)
            )
          : query(
              collection(db, 'postcards'),
              where('folioId', '==', id)
            );
        
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          date: doc.data().postcardDate || doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        }));
        setPostcards(docs);

        // Scroll to postcard if ID provided
        const postcardId = searchParams.get('postcardId');
        if (postcardId) {
          setTimeout(() => {
            const element = document.getElementById(`postcard-${postcardId}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 500);
        }
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(true);
    } finally {
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
        await fetchData(shareData.folioId);
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
        <div className="w-12 h-12 border-4 border-sage border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
            <Lock className="text-sage" size={32} />
          </div>
          <h2 className="text-4xl font-serif">Private Invite Only</h2>
          <p className="text-charcoal/60 italic">
            This Collection is private. If you were invited, please ensure you have the correct link.
          </p>
        </div>
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
            <ShieldCheck size={32} />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-serif">Guest Pass</h2>
            <p className="text-sm text-charcoal/60 italic">
              Verification required to view <span className="font-bold text-charcoal not-italic">{folio?.title}</span>
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
            Secure Private Link &bull; Collection Guest Pass
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas py-20 px-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-4xl mx-auto space-y-24"
      >
        <header className="text-center space-y-4 mb-20">
          <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-sage mb-2">
            {folio?.privacy === 'public' ? <Globe size={12} /> : <Lock size={12} />}
            {folio?.privacy === 'public' ? 'Public Collection' : 'Private Guest View'}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
            {folio?.privacy === 'public' && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={handleShare}
              >
                {copied ? <Check size={16} className="text-sage" /> : <Share2 size={16} />}
                {copied ? 'Link Copied' : 'Share Collection'}
              </Button>
            )}
            {creator?.username && (
              <Button 
                variant="ghost" 
                size="sm" 
                asChild
                className="gap-2 text-charcoal/40 hover:text-charcoal transition-colors group"
              >
                <Link to={`/f/${creator.username}${folioToken ? `?token=${folioToken}` : ''}`}>
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  Back to Folio
                </Link>
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(-1)}
              className="gap-2 text-charcoal/40 hover:text-charcoal transition-colors group"
            >
              Back
            </Button>
          </div>
          <h1 className="text-5xl md:text-7xl font-serif">{folio?.title || 'A Special Folio'}</h1>
          {folio?.description && (
            <p className="text-charcoal/60 max-w-xl mx-auto italic editorial-text">
              {folio.description}
            </p>
          )}
          <div className="w-24 h-px bg-sage/20 mx-auto" />
        </header>

        <div className="space-y-32">
          {postcards.map((postcard) => (
            <Postcard 
              key={postcard.id} 
              {...postcard}
              isPremium={creator?.isPremium || creator?.role === 'admin'}
              folioPrivacy={folio?.privacy}
              folioVisibility={folio?.visibility}
              folioToken={folioToken || folio?.folioToken}
              profilePrivacy={creator?.profilePrivacy}
            />
          ))}
        </div>

        <footer className="pt-20 text-center">
          <div className="text-charcoal/30 text-xs uppercase tracking-widest font-bold">
            Shared via Folio &mdash; Privacy First
          </div>
        </footer>
      </motion.div>
    </div>
  );
};
