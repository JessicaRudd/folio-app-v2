import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { User, MapPin, Loader2, ArrowLeft, Globe, Calendar } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { FolioGrid } from './FolioGrid';
import { Button } from './ui/Button';

export const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [publicFolios, setPublicFolios] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicProfile = async () => {
      if (!username) return;
      setLoading(true);
      setError(null);

      try {
        // 1. Find user by username
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError('User not found');
          setLoading(false);
          return;
        }

        const userData = querySnapshot.docs[0].data();
        const userId = querySnapshot.docs[0].id;

        if (userData.profilePrivacy === 'private') {
          setError('This profile is private');
          setLoading(false);
          return;
        }

        setUserProfile({ id: userId, ...userData });

        // 2. Fetch public folios for this user
        const foliosRef = collection(db, 'folios');
        const foliosQuery = query(
          foliosRef, 
          where('creatorId', '==', userId),
          where('privacy', '==', 'public')
        );
        const foliosSnapshot = await getDocs(foliosQuery);
        const folios = foliosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          folioDate: doc.data().folioDate || doc.data().createdAt?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        }));

        setPublicFolios(folios);
      } catch (err) {
        console.error('Error fetching public profile:', err);
        setError('An error occurred while loading the profile');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfile();
  }, [username]);

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
          <User className="text-sage/20" size={32} />
        </div>
        <h2 className="text-4xl font-serif">{error}</h2>
        <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
          <ArrowLeft size={18} /> Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Profile Header */}
      <div className="bg-white border-b border-charcoal/5">
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
              <div className="space-y-1">
                <h1 className="text-4xl md:text-5xl font-serif">{userProfile.displayName}</h1>
                <p className="text-sage font-bold tracking-widest text-sm uppercase">@{userProfile.username}</p>
              </div>
              
              {userProfile.bio && (
                <p className="text-charcoal/60 max-w-2xl italic editorial-text text-lg">
                  "{userProfile.bio}"
                </p>
              )}

              <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-charcoal/40">
                  <Globe size={14} className="text-sage" />
                  {publicFolios.length} Public Folios
                </div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-charcoal/40">
                  <Calendar size={14} className="text-sage" />
                  Joined {new Date(userProfile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Public Collections */}
      <main className="max-w-7xl mx-auto py-16 px-6 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-serif">Public Collections</h2>
          <div className="w-12 h-px bg-sage/20 mx-auto" />
        </div>

        {publicFolios.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-charcoal/10">
            <p className="text-charcoal/40 italic">No public collections shared yet.</p>
          </div>
        ) : (
          <FolioGrid 
            folios={publicFolios} 
            onSelect={(id) => {
              // For public profiles, we might want a different view or just link to guest view
              // For now, let's assume we can navigate to a public view of the folio
              navigate(`/v/${id}/public`);
            }} 
          />
        )}
      </main>

      <footer className="py-12 border-t border-charcoal/5 text-center">
        <div className="text-charcoal/30 text-xs uppercase tracking-widest font-bold">
          Curated by {userProfile.displayName} &mdash; Powered by Folio
        </div>
      </footer>
    </div>
  );
};
