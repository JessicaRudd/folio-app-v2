import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Postcard } from './Postcard';
import { motion } from 'motion/react';
import { Globe, ArrowLeft, Share2 } from 'lucide-react';
import { Button } from './ui/Button';

export const PublicFolioView = () => {
  const { folioId } = useParams<{ folioId: string }>();
  const [postcards, setPostcards] = useState<any[]>([]);
  const [folio, setFolio] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!folioId) return;

      try {
        const folioDoc = await getDoc(doc(db, 'folios', folioId));
        if (!folioDoc.exists() || folioDoc.data().visibility !== 'public') {
          setError(true);
          setLoading(false);
          return;
        }

        const folioData = folioDoc.data();
        setFolio(folioData);
        
        // Fetch Creator Data
        const creatorDoc = await getDoc(doc(db, 'users', folioData.creatorId));
        if (creatorDoc.exists()) {
          setCreator(creatorDoc.data());
        }

        // Fetch Postcards
        const q = query(
          collection(db, 'postcards'),
          where('folioId', '==', folioId),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          date: doc.data().postcardDate || doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        }));
        setPostcards(docs);

        // Update Meta Tags for SEO/Social Preview
        document.title = `${folioData.title} | Folio`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', folioData.description || 'A curated collection of digital postcards.');
        
        // OpenGraph
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', folioData.title);
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) ogImage.setAttribute('content', folioData.coverImage || '');

      } catch (err) {
        console.error('Error fetching public folio:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [folioId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-sage border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-canvas rounded-full flex items-center justify-center mx-auto shadow-sm">
            <Globe className="text-charcoal/20" size={32} />
          </div>
          <h2 className="text-4xl font-serif">Collection Not Found</h2>
          <p className="text-charcoal/60 italic">
            This collection may be private or no longer exists.
          </p>
          <Button variant="ghost" asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Premium Editorial Header */}
      <div className="relative h-[70vh] w-full overflow-hidden">
        <img 
          src={folio?.coverImage || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=1920'} 
          alt="" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white" />
        
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-20 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-w-4xl"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-px bg-charcoal/20" />
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-charcoal/60">Public Gallery</span>
              <div className="w-12 h-px bg-charcoal/20" />
            </div>
            <h1 className="text-6xl md:text-8xl font-serif tracking-tight text-charcoal leading-none">
              {folio?.title}
            </h1>
            <p className="text-xl md:text-2xl text-charcoal/70 italic font-serif max-w-2xl mx-auto">
              {folio?.description}
            </p>
            <div className="flex items-center justify-center gap-6 pt-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-lg bg-canvas">
                  {creator?.photoURL ? (
                    <img src={creator.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-charcoal/20 font-bold">
                      {creator?.displayName?.[0] || 'C'}
                    </div>
                  )}
                </div>
                <div className="text-left">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40">Curated by</div>
                  <div className="text-sm font-serif">{creator?.displayName || 'Folio Curator'}</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto py-32 px-6 space-y-48">
        {postcards.map((postcard, index) => (
          <motion.div
            key={postcard.id}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
          >
            <Postcard 
              {...postcard}
              isPremium={creator?.isPremium || creator?.role === 'admin'}
            />
          </motion.div>
        ))}
      </main>

      <footer className="py-32 bg-canvas/30 border-t border-charcoal/5 text-center px-6">
        <div className="max-w-xl mx-auto space-y-8">
          <h3 className="text-3xl font-serif">Create your own Folio</h3>
          <p className="text-charcoal/60 italic">
            Capture moments, curate memories, and share them with intention.
          </p>
          <Button variant="primary" size="lg" asChild>
            <Link to="/">Get Started</Link>
          </Button>
          <div className="pt-12 text-charcoal/30 text-[10px] uppercase tracking-[0.3em] font-bold">
            &copy; 2026 Folio &mdash; Digital Postcards
          </div>
        </div>
      </footer>
    </div>
  );
};
