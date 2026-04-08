import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Button } from './ui/Button';
import { Database, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';

export const Seeder = () => {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const seedTestData = async () => {
    if (!user) {
      alert('Please login first to seed test data.');
      return;
    }

    setLoading(true);
    try {
      // Use a fixed fake UID for the test user
      const fakeUid = 'fake-curator-uid-999';
      const fakeUsername = 'the_traveler';

      // 1. Create Fake User Document
      await setDoc(doc(db, 'users', fakeUid), {
        uid: fakeUid,
        email: 'traveler@folio.app',
        displayName: 'The Traveler',
        username: fakeUsername,
        bio: 'A digital nomad sharing fleeting moments from around the globe.',
        photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
        role: 'creator',
        isPremium: false,
        total_folio_count: 2,
        total_postcard_count: 7,
        follower_count: 450,
        following_count: 120,
        profilePrivacy: 'public',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 2. Create Fake Public Profile
      await setDoc(doc(db, 'public_profiles', fakeUsername), {
        uid: fakeUid,
        displayName: 'The Traveler',
        username: fakeUsername,
        bio: 'A digital nomad sharing fleeting moments from around the globe.',
        photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
        follower_count: 450,
        following_count: 120,
        createdAt: new Date().toISOString()
      });

      // 3. Create Public Folio for Fake User
      const publicFolioId = `folio-public-traveler-${Date.now()}`;
      await setDoc(doc(db, 'folios', publicFolioId), {
        creatorId: fakeUid,
        creatorName: 'The Traveler',
        creatorUsername: fakeUsername,
        title: 'Postcards from Iceland',
        description: 'The land of fire and ice. A visual diary of my solo trek.',
        location: 'Reykjavík, Iceland',
        coverImage: 'https://images.unsplash.com/photo-1504893524553-f858bce33c79?auto=format&fit=crop&q=80&w=800',
        privacy: 'public',
        createdAt: serverTimestamp(),
        folioDate: '2025-09-10',
        postcardCount: 5,
        photoCount: 12
      });

      // 4. Create Private Folio for Fake User
      const privateFolioId = `folio-private-traveler-${Date.now()}`;
      await setDoc(doc(db, 'folios', privateFolioId), {
        creatorId: fakeUid,
        creatorName: 'The Traveler',
        creatorUsername: fakeUsername,
        title: 'Unpublished Sketches',
        description: 'Private drafts and personal notes.',
        location: 'Studio',
        coverImage: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=800',
        privacy: 'private',
        createdAt: serverTimestamp(),
        folioDate: '2025-10-01',
        postcardCount: 2,
        photoCount: 4
      });

      setDone(true);
    } catch (err: any) {
      console.error('Seeding failed:', err);
      const errorMessage = err?.message || 'Unknown error';
      alert(`Seeding failed: ${errorMessage}. If this is a permission error, ensure you are logged in with the admin email and it is verified.`);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sage font-bold text-[10px] uppercase tracking-widest">
        <CheckCircle2 size={14} /> Test Data Seeded
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center md:items-start gap-1">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={seedTestData} 
        disabled={loading}
        className="gap-2 text-charcoal/20 hover:text-sage transition-colors"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
        Seed Test Data
      </Button>
      {!user && (
        <span className="text-[8px] text-charcoal/20 uppercase tracking-tighter">Login required to seed</span>
      )}
    </div>
  );
};
