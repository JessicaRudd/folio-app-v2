import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Postcard } from './Postcard';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';

export const GuestView = () => {
  const { folioId, secureToken } = useParams<{ folioId: string; secureToken: string }>();
  const [postcards, setPostcards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPostcards = async () => {
      if (!folioId || !secureToken) return;

      try {
        const q = query(
          collection(db, 'postcards'),
          where('folioId', '==', folioId),
          where('secureToken', '==', secureToken)
        );
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (docs.length === 0) {
          setError(true);
        } else {
          setPostcards(docs);
        }
      } catch (err) {
        console.error('Error fetching postcards:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPostcards();
  }, [folioId, secureToken]);

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
            This Folio is private. If you were invited, please ensure you have the correct link.
          </p>
        </div>
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
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-sage mb-2">Shared with you</div>
          <h1 className="text-5xl md:text-7xl font-serif">A Special Folio</h1>
          <div className="w-24 h-px bg-sage/20 mx-auto" />
        </header>

        <div className="space-y-32">
          {postcards.map((postcard) => (
            <Postcard 
              key={postcard.id} 
              id={postcard.id}
              folioId={postcard.folioId}
              mediaUrls={postcard.mediaUrls}
              caption={postcard.caption}
              location={postcard.location}
              date={postcard.createdAt}
              musicTrack={postcard.musicTrack}
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
