import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { CollectionGrid } from './components/CollectionGrid';
import { Postcard } from './components/Postcard';
import { GuestView } from './components/GuestView';
import { CreatePostcard } from './components/CreatePostcard';
import { EditCollection } from './components/EditCollection';
import { ProfilePage } from './components/ProfilePage';
import { PublicProfile } from './components/PublicProfile';
import { Explore } from './components/Explore';
import { MapView } from './components/MapView';
import { Onboarding } from './components/Onboarding';
import { PublicCollectionView } from './components/PublicCollectionView';
import { CollectionView } from './components/CollectionView';
import { ShareModal } from './components/ShareModal';
import { FolioShareModal } from './components/FolioShareModal';
import { LimitReachedModal } from './components/LimitReachedModal';
import { AlertRibbon } from './components/AlertRibbon';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FeedbackModal } from './components/FeedbackModal';
import { WaitingRoom } from './components/WaitingRoom';
import { AdminOnboarding } from './components/AdminOnboarding';
import { Button } from './components/ui/Button';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Share2, Settings, Loader2 } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { APP_LIMITS } from './constants';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, getDoc, doc } from 'firebase/firestore';

// Mock Data for initial view
const MOCK_FOLIOS = [
  {
    id: '1',
    title: 'Summer in Tuscany',
    description: 'A collection of moments from our road trip through the rolling hills of Italy.',
    coverImage: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&q=80&w=800',
    createdAt: '2025-07-15T10:00:00Z',
    postcardCount: 12,
  },
];

function Gatekeeper({ children }: { children: React.ReactNode }) {
  const [accessState, setAccessState] = useState<{ granted: boolean; isDevGated: boolean } | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoginOverride, setIsLoginOverride] = useState(() => {
    return new URLSearchParams(window.location.search).get('login') === 'true';
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (u) setIsLoginOverride(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch user profile to check for Admin role
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setUserProfile(snap.data());
      }
    });
  }, [user]);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch('/api/auth/check-access');
        const data = await response.json();
        setAccessState({ granted: data.accessGranted, isDevGated: data.isDevGated });
      } catch (err) {
        setAccessState({ granted: false, isDevGated: false });
      }
    };
    checkAccess();

    // Safety timeout for access check
    const timeout = setTimeout(() => {
      setAccessState(prev => prev === null ? { granted: false, isDevGated: false } : prev);
    }, 3000);
    
    return () => clearTimeout(timeout);
  }, []);

  // Logic to automatically set dev cookie for admins
  useEffect(() => {
    if (accessState?.isDevGated && !accessState.granted && user) {
      // Check both hardcoded admin email and the Firestore user profile role
      const isHardcodedAdmin = user.email === 'jess@irudd.com' || user.email === 'jessica.rudd@gmail.com';
      const isRoleAdmin = userProfile?.role === 'admin';
      
      if (isHardcodedAdmin || isRoleAdmin) {
        console.log("Admin identity verified. Granting dev access...");
        document.cookie = "folio_dev_access=true; path=/; max-age=31536000";
        setAccessState(prev => prev ? { ...prev, granted: true } : prev);
      }
    }
  }, [accessState, userProfile, user]);

  if ((accessState === null || !isAuthReady) && !isLoginOverride) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb]">
        <Loader2 className="animate-spin text-sage" size={32} />
      </div>
    );
  }

  // In dev gated mode, strictly require the grant (or admin identity)
  if (accessState?.isDevGated) {
    if (accessState.granted || isLoginOverride) return <>{children}</>;
    
    // Provide a secure login prompt for dev access
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb] px-6">
        <div className="max-w-md w-full text-center space-y-8">
          <header className="space-y-4">
            <h1 className="text-4xl">Dev Access Required</h1>
            <p className="text-charcoal/60 italic">
              This environment is restricted. Please sign in with an authorized admin account to proceed.
            </p>
          </header>
          <div className="bg-white p-8 rounded-2xl border border-charcoal/5 shadow-sm space-y-6">
            {!user ? (
              <Button 
                variant="primary" 
                className="w-full"
                onClick={async () => {
                  try {
                    await signInWithPopup(auth, new GoogleAuthProvider());
                  } catch (err: any) {
                    console.error("Login Error:", err);
                    alert(`Login failed: ${err.message}. If this is a new deployment, ensure the domain is added to Firebase Authorized Domains.`);
                  }
                }}
              >
                Sign In with Google
              </Button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-red-500">
                  Account <strong>{user.email}</strong> is not authorized for dev access.
                </p>
                <Button variant="ghost" onClick={() => signOut(auth)}>Sign Out</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // In production, grant access if cookie is present OR user is logged in OR we are trying to login
  if (accessState?.granted || user || isLoginOverride) {
    return <>{children}</>;
  }

  return <WaitingRoom />;
}

function CreatorDashboard() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'postcard'>('grid');
  const [isCreating, setIsCreating] = useState(false);
  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [isSharingCollection, setIsSharingCollection] = useState(false);
  const [isSharingFullFolio, setIsSharingFullFolio] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [limitReachedType, setLimitReachedType] = useState<'folios' | 'postcards' | 'photos' | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<any>('welcome');
  const [realPostcards, setRealPostcards] = useState<any[]>([]);
  const [realCollections, setRealCollections] = useState<any[]>([]);
  const [looseStats, setLooseStats] = useState({ postcards: 0, photos: 0 });
  const [dismissedAlert, setDismissedAlert] = useState<string | null>(null);

  // Handle auto-login from query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === 'true') {
      setOnboardingStep('auth-email');
      setIsOnboarding(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Fetch User Profile and Stats
  useEffect(() => {
    let userUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      
      // Clean up previous user listener if it exists
      if (userUnsubscribe) {
        userUnsubscribe();
        userUnsubscribe = null;
      }

      if (user) {
        userUnsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUserProfile({ uid: user.uid, ...data });
            
            // Check for limits and show ribbon
            const postcards = data.total_postcard_count || 0;
            const collections = data.total_collection_count || data.total_folio_count || 0;
            
            const limits = data.role === 'admin' ? APP_LIMITS.ADMIN : (data.isPremium ? APP_LIMITS.PREMIUM : APP_LIMITS.FREE);
            
            let newMessage: string | null = null;
            if (postcards >= limits.MAX_POSTCARDS && limits.MAX_POSTCARDS !== Infinity) {
              newMessage = `You've reached the ${limits.MAX_POSTCARDS} postcard limit.`;
            } else if (collections >= limits.MAX_FOLIOS && limits.MAX_FOLIOS !== Infinity) {
              newMessage = `You've reached the ${limits.MAX_FOLIOS} collection limit.`;
            } else if (limits.MAX_POSTCARDS !== Infinity && postcards >= limits.MAX_POSTCARDS * 0.9) {
              newMessage = `You're approaching your limit (${postcards}/${limits.MAX_POSTCARDS} postcards used).`;
            } else if (limits.MAX_FOLIOS !== Infinity && collections >= limits.MAX_FOLIOS * 0.9) {
              newMessage = `You're approaching your limit (${collections}/${limits.MAX_FOLIOS} collections used).`;
            }

            // Only show if it's a new message or hasn't been dismissed
            if (newMessage !== dismissedAlert) {
              setAlertMessage(newMessage);
              if (!newMessage) setDismissedAlert(null);
            }
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        });
      } else {
        setUserProfile(null);
        setAlertMessage(null);
        setDismissedAlert(null);
      }
    });

    return () => {
      authUnsubscribe();
      if (userUnsubscribe) userUnsubscribe();
    };
  }, [dismissedAlert]);

  // Fetch Loose Leaves Stats
  useEffect(() => {
    if (!user) {
      setLooseStats({ postcards: 0, photos: 0 });
      return;
    }

    const q = query(
      collection(db, 'postcards'),
      where('creatorId', '==', user.uid),
      where('collectionId', '==', 'loose-leaves')
    );

    return onSnapshot(q, (snapshot) => {
      let photos = 0;
      snapshot.docs.forEach(doc => {
        photos += doc.data().mediaUrls?.length || 0;
      });
      setLooseStats({ postcards: snapshot.size, photos });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'postcards_loose_leaves');
    });
  }, [user]);

  // Fetch Collections
  useEffect(() => {
    if (!user) {
      setRealCollections([]);
      return;
    }

    // Query for collections created by user
    const q1 = query(
      collection(db, 'collections'),
      where('creatorId', '==', user.uid)
    );

    // Query for collections where user is a curator
    const q2 = query(
      collection(db, 'collections'),
      where('curatorIds', 'array-contains', user.uid)
    );

    let collections1: any[] = [];
    let collections2: any[] = [];

    const updateCollections = () => {
      const combined = [...collections1];
      collections2.forEach(f => {
        if (!combined.some(c => c.id === f.id)) combined.push(f);
      });
      
      const sorted = combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const docs = sorted.map(f => ({
        ...f,
        collectionDate: f.collectionDate || f.createdAt?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        createdAt: f.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      }));

      const hasLooseLeaves = docs.some(d => d.id === 'loose-leaves');
      const finalCollections = hasLooseLeaves ? docs : [
        {
          id: 'loose-leaves',
          title: 'Loose Leaves',
          description: 'A collection of unorganized memories and fleeting moments.',
          coverImage: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=800',
          createdAt: new Date().toISOString(),
          postcardCount: 0,
        },
        ...docs
      ];
      setRealCollections(finalCollections);
    };

    const unsub1 = onSnapshot(q1, (snap) => {
      collections1 = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateCollections();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'collections_created');
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      collections2 = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateCollections();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'collections_curated');
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  // Fetch Postcards for selected collection
  useEffect(() => {
    if (!selectedCollectionId || !user) return;

    const q = selectedCollectionId === 'loose-leaves' 
      ? query(
          collection(db, 'postcards'),
          where('collectionId', '==', selectedCollectionId),
          where('creatorId', '==', user.uid)
        )
      : query(
          collection(db, 'postcards'),
          where('collectionId', '==', selectedCollectionId)
        );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().postcardDate || doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      })).sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate?.()?.getTime() || new Date(a.createdAt).getTime() || 0;
        const dateB = b.createdAt?.toDate?.()?.getTime() || new Date(b.createdAt).getTime() || 0;
        return dateB - dateA;
      });
      setRealPostcards(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'postcards');
    });

    return () => unsubscribe();
  }, [selectedCollectionId, user]);

  const handleLogout = () => signOut(auth);

  const handleCreatePostcard = () => {
    if (!userProfile?.isPremium && userProfile?.role !== 'admin') {
      if ((userProfile?.total_postcard_count || 0) >= 100) {
        setLimitReachedType('postcards');
        return;
      }
    }
    setIsCreating(true);
  };

  const handleShareCollection = (collection: any) => {
    setSelectedCollectionId(collection.id);
    setIsSharingCollection(true);
  };

  const selectedCollection = realCollections.find(f => f.id === selectedCollectionId);

  useEffect(() => {
    const testModal = localStorage.getItem('test_limit_modal');
    if (testModal === 'true') {
      setLimitReachedType('postcards');
      localStorage.removeItem('test_limit_modal');
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar 
        user={user} 
        userProfile={userProfile}
        onLogin={(step = 'auth-email') => {
          setOnboardingStep(step);
          setIsOnboarding(true);
        }} 
        onLogout={handleLogout} 
        onCreate={handleCreatePostcard} 
        onFeedback={() => setIsFeedbackOpen(true)}
        onLogoClick={() => setView('grid')}
      />

      <AnimatePresence>
        {alertMessage && (
          <AlertRibbon 
            message={alertMessage} 
            onClose={() => {
              setDismissedAlert(alertMessage);
              setAlertMessage(null);
            }}
            actionLabel="View Plans"
            onAction={() => setLimitReachedType('postcards')}
          />
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-7xl mx-auto w-full py-12">
        <AnimatePresence mode="wait">
          {view === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              <header className="px-6 text-center space-y-4 relative">
                <h2 className="text-5xl md:text-7xl">Collections</h2>
                <p className="text-charcoal/60 max-w-xl mx-auto italic">
                  A curated space for your digital postcards. Private memories, shared with intention.
                </p>
                {user && (
                  <div className="flex justify-center pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2" 
                      onClick={() => setIsSharingFullFolio(true)}
                    >
                      <Share2 size={16} />
                      Share Collections
                    </Button>
                  </div>
                )}
              </header>

              {user ? (
                <CollectionGrid 
                  collections={realCollections.map(f => ({
                    ...f,
                    coverImage: f.coverImage || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=800',
                    description: f.description || 'A new collection of memories.',
                    postcardCount: f.id === 'loose-leaves' ? looseStats.postcards : f.postcardCount || 0,
                    photoCount: f.id === 'loose-leaves' ? looseStats.photos : f.photoCount || 0
                  }))} 
                  onSelect={(id) => {
                    setSelectedCollectionId(id);
                    setView('postcard');
                  }} 
                  onShare={handleShareCollection}
                  isOwner={true}
                />
              ) : (
                <div className="text-center py-20">
                  <p className="text-charcoal/40 italic mb-8">Login to view your private collections.</p>
                  <Button variant="primary" onClick={() => {
                    setOnboardingStep('welcome');
                    setIsOnboarding(true);
                  }}>Get Started</Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="postcards"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12 px-6"
            >
              <div className="flex items-center justify-between">
                <Button 
                  variant="ghost" 
                  onClick={() => setView('grid')}
                  className="gap-2 -ml-4"
                >
                  <ArrowLeft size={18} />
                  Back to Collections
                </Button>
                
                {user && selectedCollection && (
                  <div className="flex gap-4">
                    {selectedCollectionId !== 'loose-leaves' && user.uid === selectedCollection.creatorId && (
                      <Button variant="ghost" size="sm" className="gap-2" onClick={() => setIsEditingCollection(true)}>
                        <Settings size={16} />
                        Edit Collection
                      </Button>
                    )}
                    {user.uid === selectedCollection.creatorId && (
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsSharingCollection(true)}>
                        <Share2 size={16} />
                        Share Collection
                      </Button>
                    )}
                    {(user.uid === selectedCollection.creatorId || (selectedCollection.curators && selectedCollection.curators[user.uid] === 'editor')) && (
                      <Button variant="secondary" size="sm" className="gap-2" onClick={handleCreatePostcard}>
                        <Plus size={16} />
                        Add to {selectedCollection?.title}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <header className="text-center space-y-2">
                <h2 className="text-4xl">{selectedCollection?.title}</h2>
                <p className="text-charcoal/40 text-sm uppercase tracking-[0.2em] font-bold">
                  {realPostcards.length} Moments Captured
                </p>
              </header>

              <div className="space-y-24 pb-24">
                {realPostcards.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-charcoal/10">
                    <p className="text-charcoal/40 italic">No postcards in this collection yet.</p>
                    {user && (
                      <Button variant="ghost" className="mt-4" onClick={handleCreatePostcard}>
                        Create your first postcard
                      </Button>
                    )}
                  </div>
                ) : (
                  realPostcards.map((postcard) => (
                    <Postcard 
                      key={postcard.id} 
                      id={postcard.id}
                      creatorId={postcard.creatorId}
                      collectionId={postcard.collectionId}
                      mediaUrls={postcard.mediaUrls}
                      caption={postcard.caption}
                      location={postcard.location}
                      date={postcard.date}
                      musicVibe={postcard.musicVibe}
                      isPremium={userProfile?.isPremium || userProfile?.role === 'admin'}
                      collectionPrivacy={postcard.collectionPrivacy}
                      collectionVisibility={postcard.collectionVisibility}
                      folioToken={postcard.folioToken}
                      profilePrivacy={userProfile?.profilePrivacy}
                      showStamp={postcard.showStamp}
                      creatorRole={postcard.creatorRole}
                      creatorIsPremium={postcard.creatorIsPremium}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isOnboarding && (
          <Onboarding 
            onClose={() => setIsOnboarding(false)}
            onSuccess={() => setIsOnboarding(false)}
            initialStep={onboardingStep}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCreating && (
          <CreatePostcard 
            onClose={() => setIsCreating(false)}
            onSuccess={() => setIsCreating(false)}
            onLimitReached={(type) => setLimitReachedType(type)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {limitReachedType && (
          <LimitReachedModal 
            type={limitReachedType} 
            onClose={() => setLimitReachedType(null)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditingCollection && selectedCollection && (
          <EditCollection 
            collection={selectedCollection}
            onClose={() => setIsEditingCollection(false)}
            onSuccess={() => setIsEditingCollection(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSharingCollection && selectedCollection && (
          <ShareModal 
            collection={selectedCollection}
            onClose={() => setIsSharingCollection(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSharingFullFolio && userProfile && (
          <FolioShareModal 
            user={userProfile}
            onClose={() => setIsSharingFullFolio(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFeedbackOpen && (
          <FeedbackModal 
            isOpen={isFeedbackOpen} 
            onClose={() => setIsFeedbackOpen(false)} 
            user={user}
          />
        )}
      </AnimatePresence>

      <Footer user={user} onFeedback={() => setIsFeedbackOpen(true)} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Gatekeeper><CreatorDashboard /></Gatekeeper>} />
          <Route path="/admin/onboarding" element={<AdminOnboarding />} />
          <Route path="/profile" element={<Gatekeeper><ProfilePage /></Gatekeeper>} />
          <Route path="/u/:username" element={<PublicProfile />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/map" element={<Gatekeeper><MapView /></Gatekeeper>} />
          <Route path="/v/:collectionId" element={<GuestView />} />
          <Route path="/v/:collectionId/:secureToken" element={<GuestView />} />
          <Route path="/s/:collectionId" element={<PublicCollectionView />} />
          <Route path="/f/:username" element={<CollectionView />} />
          <Route path="/f/:username/invite/:shareId" element={<CollectionView />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
