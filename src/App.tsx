import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { FolioGrid } from './components/FolioGrid';
import { Postcard } from './components/Postcard';
import { GuestView } from './components/GuestView';
import { Button } from './components/ui/Button';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus } from 'lucide-react';
import { auth, db } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';

// Mock Data
const MOCK_FOLIOS = [
  {
    id: '1',
    title: 'Summer in Tuscany',
    description: 'A collection of moments from our road trip through the rolling hills of Italy.',
    coverImage: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&q=80&w=800',
    createdAt: '2025-07-15T10:00:00Z',
    postcardCount: 12,
  },
  {
    id: '2',
    title: 'Kyoto Zen',
    description: 'Finding peace in the temples and gardens of the ancient capital.',
    coverImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800',
    createdAt: '2025-11-20T10:00:00Z',
    postcardCount: 8,
  },
  {
    id: '3',
    title: 'Nordic Winter',
    description: 'Chasing the northern lights across the snowy landscapes of Iceland.',
    coverImage: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800',
    createdAt: '2026-01-05T10:00:00Z',
    postcardCount: 15,
  },
];

const MOCK_POSTCARDS = [
  {
    id: 'p1',
    folioId: '1',
    mediaUrls: ['https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&q=80&w=800'],
    caption: 'The golden hour in Val d\'Orcia. We spent the afternoon wandering through cypress-lined paths, the air smelling of wild rosemary and sun-warmed earth. It felt like time had slowed down just for us.',
    location: 'Val d\'Orcia, Italy',
    date: '2025-07-18T18:30:00Z',
    musicTrack: {
      title: 'Einaudi: Experience',
      artist: 'Ludovico Einaudi',
    },
  },
  {
    id: 'p2',
    folioId: '1',
    mediaUrls: ['https://images.unsplash.com/photo-1464151746983-32459637cc7d?auto=format&fit=crop&q=80&w=800'],
    caption: 'Morning coffee in Pienza. The locals were already out, chatting in the piazza. We sat there for hours, just watching the world wake up.',
    location: 'Pienza, Italy',
    date: '2025-07-19T09:00:00Z',
  },
];

function CreatorDashboard() {
  const [user, setUser] = useState<any>(null);
  const [selectedFolioId, setSelectedFolioId] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'postcard'>('grid');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = () => signOut(auth);

  const selectedFolio = MOCK_FOLIOS.find(f => f.id === selectedFolioId);
  const postcards = MOCK_POSTCARDS.filter(p => p.folioId === selectedFolioId);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar 
        user={user} 
        onLogin={handleLogin} 
        onLogout={handleLogout} 
        onCreate={() => console.log('Create')} 
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

              <FolioGrid 
                folios={MOCK_FOLIOS} 
                onSelect={(id) => {
                  setSelectedFolioId(id);
                  setView('postcard');
                }} 
              />
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
                  <Button variant="secondary" size="sm" className="gap-2">
                    <Plus size={16} />
                    Add to {selectedFolio?.title}
                  </Button>
                )}
              </div>

              <header className="text-center space-y-2">
                <h2 className="text-4xl">{selectedFolio?.title}</h2>
                <p className="text-charcoal/40 text-sm uppercase tracking-[0.2em] font-bold">
                  {selectedFolio?.postcardCount} Moments Captured
                </p>
              </header>

              <div className="space-y-24 pb-24">
                {postcards.map((postcard) => (
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
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

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
        <Route path="/v/:folioId/:secureToken" element={<GuestView />} />
      </Routes>
    </Router>
  );
}
