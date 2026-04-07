import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { FolioGrid } from './components/FolioGrid';
import { Postcard } from './components/Postcard';
import { GuestView } from './components/GuestView';
import { CreatePostcard } from './components/CreatePostcard';
import { EditFolio } from './components/EditFolio';
import { ProfilePage } from './components/ProfilePage';
import { PublicProfile } from './components/PublicProfile';
import { Explore } from './components/Explore';
import { MapView } from './components/MapView';
import { Button } from './components/ui/Button';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Share2, Settings } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

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

function CreatorDashboard() {
  const [user, setUser] = useState<any>(null);
  const [selectedFolioId, setSelectedFolioId] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'postcard'>('grid');
  const [isCreating, setIsCreating] = useState(false);
  const [isEditingFolio, setIsEditingFolio] = useState(false);
  const [realPostcards, setRealPostcards] = useState<any[]>([]);
  const [realFolios, setRealFolios] = useState<any[]>([]);
  const [looseStats, setLooseStats] = useState({ postcards: 0, photos: 0 });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Loose Leaves Stats
  useEffect(() => {
    if (!user) {
      setLooseStats({ postcards: 0, photos: 0 });
      return;
    }

    const q = query(
      collection(db, 'postcards'),
      where('creatorId', '==', user.uid),
      where('folioId', '==', 'loose-leaves')
    );

    return onSnapshot(q, (snapshot) => {
      let photos = 0;
      snapshot.docs.forEach(doc => {
        photos += doc.data().mediaUrls?.length || 0;
      });
      setLooseStats({ postcards: snapshot.size, photos });
    });
  }, [user]);

  // Fetch Folios
  useEffect(() => {
    if (!user) {
      setRealFolios([]);
      return;
    }

    const q = query(
      collection(db, 'folios'),
      where('creatorId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        folioDate: doc.data().folioDate || doc.data().createdAt?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      }));
      
      // Add "Loose Leaves" if it doesn't exist in the list
      const hasLooseLeaves = docs.some(d => d.id === 'loose-leaves');
      const finalFolios = hasLooseLeaves ? docs : [
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
      setRealFolios(finalFolios);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch Postcards for selected folio
  useEffect(() => {
    if (!selectedFolioId || !user) return;

    const q = query(
      collection(db, 'postcards'),
      where('folioId', '==', selectedFolioId),
      where('creatorId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().postcardDate || doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      }));
      setRealPostcards(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'postcards');
    });

    return () => unsubscribe();
  }, [selectedFolioId, user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = () => signOut(auth);

  const selectedFolio = realFolios.find(f => f.id === selectedFolioId);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar 
        user={user} 
        onLogin={handleLogin} 
        onLogout={handleLogout} 
        onCreate={() => setIsCreating(true)} 
      />

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
              <header className="px-6 text-center space-y-4">
                <h2 className="text-5xl md:text-7xl">The Folio</h2>
                <p className="text-charcoal/60 max-w-xl mx-auto italic">
                  A curated collection of digital postcards. Private memories, shared with intention.
                </p>
              </header>

              {user ? (
                <FolioGrid 
                  folios={realFolios.map(f => ({
                    ...f,
                    coverImage: f.coverImage || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=800',
                    description: f.description || 'A new collection of memories.',
                    postcardCount: f.id === 'loose-leaves' ? looseStats.postcards : f.postcardCount || 0,
                    photoCount: f.id === 'loose-leaves' ? looseStats.photos : f.photoCount || 0
                  }))} 
                  onSelect={(id) => {
                    setSelectedFolioId(id);
                    setView('postcard');
                  }} 
                />
              ) : (
                <div className="text-center py-20">
                  <p className="text-charcoal/40 italic mb-8">Login to view your private collections.</p>
                  <Button variant="primary" onClick={handleLogin}>Get Started</Button>
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
                  Back to Folios
                </Button>
                
                {user && (
                  <div className="flex gap-4">
                    {selectedFolioId !== 'loose-leaves' && (
                      <Button variant="ghost" size="sm" className="gap-2" onClick={() => setIsEditingFolio(true)}>
                        <Settings size={16} />
                        Edit Collection
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                      const shareUrl = `${window.location.origin}/v/${selectedFolioId}/${realPostcards[0]?.secureToken || 'invite'}`;
                      navigator.clipboard.writeText(shareUrl);
                      alert('Share link copied to clipboard!');
                    }}>
                      <Share2 size={16} />
                      Share Folio
                    </Button>
                    <Button variant="secondary" size="sm" className="gap-2" onClick={() => setIsCreating(true)}>
                      <Plus size={16} />
                      Add to {selectedFolio?.title}
                    </Button>
                  </div>
                )}
              </div>

              <header className="text-center space-y-2">
                <h2 className="text-4xl">{selectedFolio?.title}</h2>
                <p className="text-charcoal/40 text-sm uppercase tracking-[0.2em] font-bold">
                  {realPostcards.length} Moments Captured
                </p>
              </header>

              <div className="space-y-24 pb-24">
                {realPostcards.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-charcoal/10">
                    <p className="text-charcoal/40 italic">No postcards in this folio yet.</p>
                    {user && (
                      <Button variant="ghost" className="mt-4" onClick={() => setIsCreating(true)}>
                        Create your first postcard
                      </Button>
                    )}
                  </div>
                ) : (
                  realPostcards.map((postcard) => (
                    <Postcard 
                      key={postcard.id} 
                      id={postcard.id}
                      folioId={postcard.folioId}
                      mediaUrls={postcard.mediaUrls}
                      caption={postcard.caption}
                      location={postcard.location}
                      date={postcard.date}
                      musicTrack={postcard.musicTrack}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isCreating && (
          <CreatePostcard 
            onClose={() => setIsCreating(false)}
            onSuccess={() => setIsCreating(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditingFolio && selectedFolio && (
          <EditFolio 
            folio={selectedFolio}
            onClose={() => setIsEditingFolio(false)}
            onSuccess={() => setIsEditingFolio(false)}
          />
        )}
      </AnimatePresence>

      <footer className="py-12 border-t border-charcoal/5 text-center">
        <div className="text-charcoal/30 text-xs uppercase tracking-widest font-bold">
          &copy; 2026 Folio &mdash; Privacy First Sharing
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CreatorDashboard />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/u/:username" element={<PublicProfile />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/v/:folioId/:secureToken" element={<GuestView />} />
      </Routes>
    </Router>
  );
}
