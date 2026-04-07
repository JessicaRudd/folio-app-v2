import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Globe, Search, Loader2, User, MapPin, Calendar, ArrowLeft, ChevronRight } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { FolioGrid } from './FolioGrid';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from './ui/Button';

export const Explore = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [publicFolios, setPublicFolios] = useState<any[]>([]);
  const [publicCurators, setPublicCurators] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    const fetchExploreData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Public Folios
        const foliosRef = collection(db, 'folios');
        const foliosQuery = query(
          foliosRef,
          where('privacy', '==', 'public'),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        
        const foliosSnapshot = await getDocs(foliosQuery);
        const folios = foliosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          folioDate: doc.data().folioDate || doc.data().createdAt?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        }));

        setPublicFolios(folios);

        // 2. Fetch Public Curators
        const curatorsRef = collection(db, 'public_profiles');
        const curatorsQuery = query(
          curatorsRef,
          limit(10)
        );
        const curatorsSnapshot = await getDocs(curatorsQuery);
        const curators = curatorsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPublicCurators(curators);

      } catch (err) {
        console.error('Error fetching explore data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExploreData();
  }, []);

  const filteredFolios = publicFolios.filter(folio => 
    folio.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folio.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folio.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folio.creatorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folio.creatorUsername?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCurators = publicCurators.filter(curator => 
    curator.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    curator.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    curator.bio?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Navigation Bar / Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 pt-12 flex items-center justify-between">
        <Link 
          to="/"
          className="text-[10px] font-bold uppercase tracking-[0.3em] text-charcoal/40 hover:text-charcoal transition-colors flex items-center gap-2 group"
        >
          <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
          Folio Home
        </Link>
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-charcoal/10">
          Discovery Engine &mdash; Curated Collections
        </div>
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 space-y-12">
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h1 className="text-7xl md:text-9xl text-charcoal font-serif tracking-tighter leading-[0.85]">
              Explore<span className="text-sage">.</span>
            </h1>
            <p className="text-charcoal/40 max-w-xl italic editorial-text text-xl leading-relaxed">
              A curated window into the fleeting moments and visual stories captured by our global community of curators.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-xl relative pt-8"
          >
            <Search className="absolute left-0 top-[calc(50%+16px)] -translate-y-1/2 text-charcoal/20" size={20} />
            <input 
              type="text"
              placeholder="Search locations, aesthetics, or curators..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchParams({ q: e.target.value });
              }}
              className="w-full bg-transparent border-b border-charcoal/10 py-6 pl-10 pr-4 text-charcoal placeholder:text-charcoal/20 focus:border-sage outline-none transition-all text-lg"
            />
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 space-y-32">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="animate-spin text-sage" size={32} />
          </div>
        ) : (
          <>
            {/* Curators Section */}
            {filteredCurators.length > 0 && (
              <section className="space-y-12">
                <div className="flex items-baseline justify-between border-b border-charcoal/5 pb-4">
                  <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-charcoal/30">Featured Curators</h2>
                  <div className="w-1/3 h-px bg-charcoal/5" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
                  {filteredCurators.map((curator) => (
                    <motion.div
                      key={curator.id}
                      onClick={() => navigate(`/u/${curator.username}`)}
                      className="group cursor-pointer space-y-6"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-white shadow-sm grayscale group-hover:grayscale-0 transition-all duration-700">
                          {curator.photoURL ? (
                            <img src={curator.photoURL} alt={curator.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-charcoal/10">
                              <User size={32} />
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-2xl font-serif group-hover:text-sage transition-colors">{curator.displayName}</h3>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sage">@{curator.username}</p>
                        </div>
                      </div>
                      {curator.bio && (
                        <p className="text-sm text-charcoal/60 leading-relaxed italic editorial-text line-clamp-3 pl-2 border-l border-sage/20">
                          "{curator.bio}"
                        </p>
                      )}
                      <div className="pt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-charcoal/20 group-hover:text-charcoal transition-colors">
                        View Profile <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Folios Section */}
            <section className="space-y-12">
              <div className="flex items-baseline justify-between border-b border-charcoal/5 pb-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-charcoal/30">Public Collections</h2>
                <div className="text-[10px] font-bold uppercase tracking-widest text-charcoal/20">
                  {filteredFolios.length} Folios Found
                </div>
              </div>

              {filteredFolios.length === 0 ? (
                <div className="py-32 text-center space-y-4">
                  <p className="text-charcoal/40 italic editorial-text text-lg">No collections found matching your search.</p>
                  <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="text-sage">Clear Search</Button>
                </div>
              ) : (
                <FolioGrid 
                  folios={filteredFolios} 
                  onSelect={(id) => navigate(`/v/${id}/public`)} 
                  showCreator={true}
                />
              )}
            </section>

            {/* About Section */}
            <section className="py-24 border-t border-charcoal/5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                <div className="space-y-6">
                  <h2 className="text-4xl font-serif leading-tight">A new way to share <br/> with intention.</h2>
                  <p className="text-charcoal/60 leading-relaxed italic editorial-text text-lg">
                    Folio is built on the belief that memories are sacred. We provide a space for curators to organize their visual stories and share them with the world—or just a chosen few—without the noise of traditional social media.
                  </p>
                  <div className="flex items-center gap-8 pt-4">
                    <div className="space-y-1">
                      <div className="text-2xl font-serif">100%</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-charcoal/30">Privacy Focused</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-serif">Global</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-charcoal/30">Community</div>
                    </div>
                  </div>
                </div>
                <div className="aspect-square rounded-3xl overflow-hidden grayscale opacity-50">
                  <img 
                    src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1200" 
                    alt="Atmospheric landscape" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-charcoal/5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-charcoal/20">
          &copy; 2026 Folio &mdash; The Discovery Engine
        </div>
        <div className="flex gap-8 text-[10px] font-bold uppercase tracking-[0.3em] text-charcoal/40">
          <Link to="/" className="hover:text-charcoal transition-colors">Home</Link>
          <Link to="/explore" className="hover:text-charcoal transition-colors">Explore</Link>
          <Link to="/map" className="hover:text-charcoal transition-colors">Map</Link>
        </div>
      </footer>
    </div>
  );
};
