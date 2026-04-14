import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Postcard } from './Postcard';
import { ShareModal } from './ShareModal';
import { MusicVibePlayer } from './MusicVibePlayer';
import { motion } from 'motion/react';
import { Globe, ArrowLeft, Share2, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { AnimatePresence } from 'motion/react';

export const PublicCollectionView = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const [searchParams] = useSearchParams();
  const postcardId = searchParams.get('postcardId');
  const [postcards, setPostcards] = useState<any[]>([]);
  const [collectionData, setCollectionData] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!collectionId) return;

      try {
        const collectionDoc = await getDoc(doc(db, 'collections', collectionId));
        if (!collectionDoc.exists()) {
          setError(true);
          setLoading(false);
          return;
        }

        const data = collectionDoc.data();
        
        // Access Control: Public Collection View requires (public collection OR public link enabled)
        const isPublicCollection = data.privacy === 'public' || data.visibility === 'public';

        if (!isPublicCollection) {
          setError(true);
          setLoading(false);
          return;
        }

        // Fetch Creator Data (Optional, might fail if profile is private)
        let creatorData = null;
        try {
          const creatorDoc = await getDoc(doc(db, 'users', data.creatorId));
          creatorData = creatorDoc.exists() ? creatorDoc.data() : null;
        } catch (e) {
          console.warn('Could not fetch creator data (profile might be private):', e);
        }

        // If profile is private, we must ensure the collection is indeed public
        if (!creatorData || creatorData.profilePrivacy !== 'public') {
          // Use denormalized data if profile is private
          creatorData = {
            displayName: data.creatorName || 'Curator',
            username: data.creatorUsername || '',
            profilePrivacy: 'private'
          };
        }

        setCollectionData(data);
        setCreator(creatorData);

        // Fetch Postcards
        const q = query(
          collection(db, 'postcards'),
          where('collectionId', '==', collectionId),
          where('collectionVisibility', '==', 'public'),
          where('profilePrivacy', '==', 'public')
        );
        
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          date: doc.data().postcardDate || doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        })).sort((a: any, b: any) => {
          const dateA = a.createdAt?.toDate?.()?.getTime() || new Date(a.createdAt).getTime() || 0;
          const dateB = b.createdAt?.toDate?.()?.getTime() || new Date(b.createdAt).getTime() || 0;
          return dateB - dateA;
        });
        setPostcards(docs);

        // Update Meta Tags for SEO/Social Preview
        document.title = `${data.title} | Folio`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', data.description || 'A curated collection of digital postcards.');
        
        // OpenGraph
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', data.title);
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) ogImage.setAttribute('content', data.coverImage || '');

      } catch (err) {
        console.error('Error fetching public collection:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [collectionId]);

  useEffect(() => {
    if (!loading && postcardId && postcards.length > 0) {
      const element = document.getElementById(`postcard-${postcardId}`);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
      }
    }
  }, [loading, postcardId, postcards]);

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
      {/* Navigation */}
      <div className="absolute top-0 left-0 right-0 z-50 px-6 py-8 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group bg-black/20 backdrop-blur-md px-4 py-2 rounded-full">
            <div className="w-6 h-6 bg-white rounded-sm rotate-45 flex items-center justify-center text-charcoal group-hover:bg-sage group-hover:text-white transition-all duration-500">
              <span className="rotate-[-45deg] text-[10px] font-serif font-bold">F</span>
            </div>
            <span className="text-lg font-serif tracking-tighter text-white group-hover:text-sage transition-colors duration-500">Folio</span>
          </Link>
          
          <Link 
            to="/"
            className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60 hover:text-white transition-colors flex items-center gap-2 group bg-black/20 backdrop-blur-md px-4 py-2 rounded-full"
          >
            <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
            Home
          </Link>
        </div>
      </div>

      {/* Premium Editorial Header */}
      <div className="relative h-[70vh] w-full overflow-hidden">
        <img 
          src={collectionData?.coverImage || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=1920'} 
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
              {collectionData?.title}
            </h1>
            <p className="text-xl md:text-2xl text-charcoal/70 italic font-serif max-w-2xl mx-auto">
              {collectionData?.description}
            </p>

            {collectionData?.musicVibe && (
              <div className="max-w-md mx-auto pt-4">
                <MusicVibePlayer vibe={collectionData.musicVibe} compact />
              </div>
            )}

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

              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 bg-white/80 backdrop-blur-sm"
                onClick={() => {
                  if (currentUser && currentUser.uid === collectionData.creatorId) {
                    setIsSharing(true);
                  } else {
                    handleShare();
                  }
                }}
              >
                {copied ? <Check size={16} className="text-sage" /> : <Share2 size={16} />}
                {copied ? 'Link Copied' : 'Share Collection'}
              </Button>
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
              collectionPrivacy={collectionData?.privacy}
              collectionVisibility={collectionData?.visibility}
              profilePrivacy={creator?.profilePrivacy}
              showStamp={postcard.showStamp}
              creatorRole={postcard.creatorRole}
              creatorIsPremium={postcard.creatorIsPremium}
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

      <AnimatePresence>
        {isSharing && collectionData && (
          <ShareModal 
            collection={{ id: collectionId, ...collectionData }}
            onClose={() => setIsSharing(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
