import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Globe, Search, Loader2, User, MapPin, Calendar, ArrowLeft, ChevronRight, Heart, MessageCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { CollectionGrid } from './CollectionGrid';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from './ui/Button';
import { Postcard } from './Postcard';
import { socialService } from '../services/socialService';

import { Seeder } from './Seeder';
import { Navbar } from './Navbar';
import { Onboarding } from './Onboarding';
import { Footer } from './Footer';
import { FeedbackModal } from './FeedbackModal';
import { auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { AnimatePresence } from 'motion/react';

export const Explore = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publicCollections, setPublicCollections] = useState<any[]>([]);
  const [publicCurators, setPublicCurators] = useState<any[]>([]);
  const [publicPostcards, setPublicPostcards] = useState<any[]>([]);
  const [feedPostcards, setFeedPostcards] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        getDoc(doc(db, 'users', user.uid)).then(snap => {
          if (snap.exists()) setUserProfile(snap.data());
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => signOut(auth);
  const handleCreate = () => navigate('/'); // Redirect to home to create

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    const fetchExploreData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch Public Collections
        try {
          const collectionsRef = collection(db, 'collections');
          const collectionsQuery = query(
            collectionsRef,
            where('privacy', '==', 'public'),
            where('visibility', '==', 'public'),
            where('profilePrivacy', '==', 'public'),
            limit(20)
          );
          
          const collectionsSnapshot = await getDocs(collectionsQuery);
          const collections = collectionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            collectionDate: doc.data().collectionDate || doc.data().createdAt?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
          }));

          setPublicCollections(collections);
        } catch (err) {
          console.error('Error fetching public collections:', err);
          // Don't throw, just continue
        }

        // 2. Fetch Public Curators
        try {
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
          console.error('Error fetching public curators:', err);
        }

        // 3. Fetch Public Postcards (for everyone)
        try {
          const publicPostcardsQuery = query(
            collection(db, 'postcards'),
            where('collectionVisibility', '==', 'public'),
            where('profilePrivacy', '==', 'public'),
            limit(20)
          );
          const publicPostcardsSnap = await getDocs(publicPostcardsQuery);
          const publicPostcards = publicPostcardsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().postcardDate || doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
          }));
          setPublicPostcards(publicPostcards);
        } catch (err) {
          console.error('Error fetching public postcards:', err);
        }

        // 4. Fetch Personalized Feed if logged in
        if (auth.currentUser) {
          try {
            const followedIds = await socialService.getFollowedUserIds();
            
            // Fetch postcards from followed users
            let followedPostcards: any[] = [];
            if (followedIds.length > 0) {
              const chunks = [];
              for (let i = 0; i < followedIds.length; i += 10) {
                chunks.push(followedIds.slice(i, i + 10));
              }
              
              for (const chunk of chunks) {
                const q = query(
                  collection(db, 'postcards'),
                  where('creatorId', 'in', chunk),
                  where('collectionVisibility', '==', 'public'),
                  where('profilePrivacy', '==', 'public'),
                  limit(10)
                );
                try {
                  const snap = await getDocs(q);
                  followedPostcards.push(...snap.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data(),
                    date: doc.data().postcardDate || doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
                  })));
                } catch (err) {
                  console.error('Error fetching followed postcards chunk:', err);
                }
              }
            }

            // Fetch postcards from invited private collections
            let invitedPostcards: any[] = [];
            try {
              const invitedCollectionsQuery = query(
                collection(db, 'collections'),
                where('privacy', '==', 'personal'),
                where('allowedUsers', 'array-contains', auth.currentUser.email),
                limit(10)
              );
              const invitedCollectionsSnap = await getDocs(invitedCollectionsQuery);
              const invitedCollectionIds = invitedCollectionsSnap.docs.map(doc => doc.id);

              if (invitedCollectionIds.length > 0) {
                const chunks = [];
                for (let i = 0; i < invitedCollectionIds.length; i += 10) {
                  chunks.push(invitedCollectionIds.slice(i, i + 10));
                }
                for (const chunk of chunks) {
                  const q = query(
                    collection(db, 'postcards'),
                    where('collectionId', 'in', chunk),
                    limit(10)
                  );
                  try {
                    const snap = await getDocs(q);
                    invitedPostcards.push(...snap.docs.map(doc => ({ 
                      id: doc.id, 
                      ...doc.data(),
                      date: doc.data().postcardDate || doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
                    })));
                  } catch (err) {
                    console.error('Error fetching invited postcards chunk:', err);
                  }
                }
                
                // Sort client-side
                invitedPostcards.sort((a: any, b: any) => {
                  const dateA = a.createdAt?.toDate?.()?.getTime() || new Date(a.createdAt).getTime() || 0;
                  const dateB = b.createdAt?.toDate?.()?.getTime() || new Date(b.createdAt).getTime() || 0;
                  return dateB - dateA;
                });
              }
            } catch (err) {
              console.error('Error fetching invited collections/postcards:', err);
            }

            // Combine and sort by date
            const combined = [...followedPostcards, ...invitedPostcards]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            setFeedPostcards(combined);
          } catch (err) {
            console.error('Error in personalized feed logic:', err);
          }
        }

      } catch (err) {
        console.error('Error fetching explore data:', err);
        setError('Failed to load explore data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchExploreData();
  }, [user]);

  const filteredCollections = publicCollections.filter(collection => 
    collection.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collection.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collection.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collection.creatorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collection.creatorUsername?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCurators = publicCurators.filter(curator => 
    curator.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    curator.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    curator.bio?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <Navbar 
        user={user} 
        onLogin={() => setIsOnboarding(true)} 
        onLogout={handleLogout} 
        onCreate={handleCreate} 
        onFeedback={() => setIsFeedbackOpen(true)}
      />

      <AnimatePresence>
        {isOnboarding && (
          <Onboarding 
            onClose={() => setIsOnboarding(false)}
            onSuccess={() => setIsOnboarding(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Navigation Bar / Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 pt-12 flex items-center justify-between">
        <Link 
          to="/"
          className="text-[10px] font-bold uppercase tracking-[0.3em] text-charcoal/40 hover:text-charcoal transition-colors flex items-center gap-2 group"
        >
          <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
          Home
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
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-center italic editorial-text">
            {error}
          </div>
        )}
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

            {/* Collections Section */}
            <section className="space-y-12">
              <div className="flex items-baseline justify-between border-b border-charcoal/5 pb-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-charcoal/30">Public Collections</h2>
                <div className="text-[10px] font-bold uppercase tracking-widest text-charcoal/20">
                  {filteredCollections.length} Collections Found
                </div>
              </div>

              {filteredCollections.length === 0 ? (
                <div className="py-32 text-center space-y-4">
                  <p className="text-charcoal/40 italic editorial-text text-lg">No collections found matching your search.</p>
                  <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="text-sage">Clear Search</Button>
                </div>
              ) : (
                <CollectionGrid 
                  collections={filteredCollections} 
                  onSelect={(id) => navigate(`/s/${id}`)} 
                  onShare={(collection) => {
                    const url = `${window.location.origin}/s/${collection.id}`;
                    navigator.clipboard.writeText(url);
                    alert('Link copied to clipboard!');
                  }}
                  showCreator={true}
                />
              )}
            </section>

            {/* Global Gallery (Public Postcards) */}
            {publicPostcards.length > 0 && !searchQuery && (
              <section className="space-y-12">
                <div className="flex items-baseline justify-between border-b border-charcoal/5 pb-4">
                  <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-charcoal/30">Global Gallery</h2>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-charcoal/20">
                    Moments from public collections
                  </div>
                </div>

                <div className="space-y-24">
                  {publicPostcards.map((postcard) => (
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
                      collectionPrivacy={postcard.collectionPrivacy || 'public'}
                      collectionVisibility={postcard.collectionVisibility || 'public'}
                      profilePrivacy={postcard.profilePrivacy || 'public'}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Personalized Feed */}
            {user && feedPostcards.length > 0 && !searchQuery && (
              <section className="space-y-12">
                <div className="flex items-baseline justify-between border-b border-charcoal/5 pb-4">
                  <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-charcoal/30">Your Feed</h2>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-charcoal/20">
                    Recent from curators you follow
                  </div>
                </div>

                <div className="space-y-24">
                  {feedPostcards.map((postcard) => (
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
                      collectionPrivacy={postcard.collectionPrivacy || 'public'}
                      collectionVisibility={postcard.collectionVisibility || 'public'}
                      profilePrivacy={postcard.profilePrivacy || 'public'}
                    />
                  ))}
                </div>
              </section>
            )}

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

      <AnimatePresence>
        {isFeedbackOpen && (
          <FeedbackModal 
            isOpen={isFeedbackOpen} 
            onClose={() => setIsFeedbackOpen(false)} 
            user={user}
          />
        )}
      </AnimatePresence>

      <Footer user={user} message="&copy; 2026 Folio &mdash; The Discovery Engine" onFeedback={() => setIsFeedbackOpen(true)} />
    </div>
  );
};
