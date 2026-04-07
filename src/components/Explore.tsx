import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Globe, Search, Loader2, User, MapPin, Calendar } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { FolioGrid } from './FolioGrid';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const Explore = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [publicFolios, setPublicFolios] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    const fetchExploreFolios = async () => {
      setLoading(true);
      try {
        const foliosRef = collection(db, 'folios');
        const q = query(
          foliosRef,
          where('privacy', '==', 'public'),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        
        const querySnapshot = await getDocs(q);
        const folios = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          folioDate: doc.data().folioDate || doc.data().createdAt?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        }));

        setPublicFolios(folios);
      } catch (err) {
        console.error('Error fetching explore folios:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExploreFolios();
  }, []);

  const filteredFolios = publicFolios.filter(folio => 
    folio.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folio.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folio.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folio.creatorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folio.creatorUsername?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Hero Section */}
      <section className="relative h-[40vh] flex items-center justify-center overflow-hidden bg-charcoal">
        <div className="absolute inset-0 opacity-40">
          <img 
            src="https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?auto=format&fit=crop&q=80&w=2000" 
            alt="Explore" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-10 text-center space-y-6 px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="text-sage font-bold tracking-[0.4em] text-xs uppercase">Discovery Engine</div>
            <h1 className="text-5xl md:text-7xl text-white font-serif">Explore Folios</h1>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="max-w-xl mx-auto relative"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
            <input 
              type="text"
              placeholder="Search by location, aesthetic, or curator..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchParams({ q: e.target.value });
              }}
              className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-full py-4 pl-12 pr-6 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-sage/50 transition-all"
            />
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 -mt-12 relative z-20">
        {loading ? (
          <div className="bg-white rounded-3xl shadow-xl p-20 flex items-center justify-center">
            <Loader2 className="animate-spin text-sage" size={32} />
          </div>
        ) : filteredFolios.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-xl p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-canvas rounded-full flex items-center justify-center mx-auto">
              <Search className="text-charcoal/20" size={24} />
            </div>
            <h3 className="text-2xl font-serif">No results found</h3>
            <p className="text-charcoal/40 italic">Try searching for something else or explore all public folios.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 space-y-12">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif">Featured Collections</h2>
              <div className="text-xs font-bold uppercase tracking-widest text-charcoal/40">
                {filteredFolios.length} Folios Found
              </div>
            </div>

            <FolioGrid 
              folios={filteredFolios} 
              onSelect={(id) => navigate(`/v/${id}/public`)} 
              showCreator={true}
            />
          </div>
        )}
      </main>
    </div>
  );
};
