import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { User, MapPin, Loader2, ArrowLeft, Globe, Calendar, UserPlus, UserMinus, Share2, Check } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { FolioGrid } from './FolioGrid';
import { Button } from './ui/Button';
import { onAuthStateChanged } from 'firebase/auth';
import { socialService } from '../services/socialService';

export const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [publicFolios, setPublicFolios] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleShareProfile = () => {
    copyToClipboard(window.location.href, 'profile');
  };

  const handleShareCollection = (folio: any) => {
    const url = `${window.location.origin}/s/${folio.id}`;
    copyToClipboard(url, folio.id);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(null);

    // 1. Find user by username in public_profiles
    const profileRef = doc(db, 'public_profiles', username);
    
    const unsubscribe = onSnapshot(profileRef, async (profileSnapshot) => {
      try {
        let userData: any = null;
        let userId: string = '';

        if (profileSnapshot.exists()) {
          userData = profileSnapshot.data();
          userId = userData.uid;
        } else {
          // Fallback: Check users collection for legacy users (one-time check)
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('username', '==', username), where('profilePrivacy', '==', 'public'));
          const querySnapshot = await getDocs(q);
          
          if (querySnapshot.empty) {
            setError('User not found or profile is private');
            setLoading(false);
            return;
          }
          
          userData = querySnapshot.docs[0].data();
          userId = querySnapshot.docs[0].id;
        }

        setUserProfile({ id: userId, ...userData });

        // 2. Fetch public folios for this user
        const foliosRef = collection(db, 'folios');
        const foliosQuery = query(
          foliosRef, 
          where('creatorId', '==', userId),
          where('visibility', '==', 'public')
        );
        const foliosSnapshot = await getDocs(foliosQuery);
        const folios = foliosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          folioDate: doc.data().folioDate || doc.data().createdAt?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        }));

        setPublicFolios(folios);

        // 3. Check if following
        if (auth.currentUser) {
          const following = await socialService.isFollowing(userId);
          setIsFollowing(following);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching public profile:', err);
        setError('An error occurred while loading the profile');
        setLoading(false);
      }
    }, (err) => {
      console.error('Profile snapshot error:', err);
      setError('Failed to connect to profile updates');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [username, currentUser]);

  const handleFollow = async () => {
    if (!currentUser || !userProfile) return;
    setFollowLoading(true);

    try {
      const isNowFollowing = await socialService.toggleFollow(userProfile.id, userProfile.username);
      setIsFollowing(isNowFollowing);
      // Update local count for immediate feedback
      setUserProfile(prev => ({
        ...prev,
        follower_count: (prev.follower_count || 0) + (isNowFollowing ? 1 : -1)
      }));
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

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
      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/explore')}
          className="gap-2 text-charcoal/40 hover:text-charcoal transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Explore
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareProfile}
            className="gap-2"
          >
            {copied === 'profile' ? <Check size={16} className="text-sage" /> : <Share2 size={16} />}
            {copied === 'profile' ? 'Link Copied' : 'Share Profile'}
          </Button>

          {currentUser && userProfile && currentUser.uid !== userProfile.id && (
            <Button
              variant={isFollowing ? "outline" : "primary"}
              size="sm"
              onClick={handleFollow}
              disabled={followLoading}
              className="gap-2"
            >
              {followLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isFollowing ? (
                <UserMinus size={16} />
              ) : (
                <UserPlus size={16} />
              )}
              {isFollowing ? 'Following' : 'Follow Curator'}
            </Button>
          )}
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-white border-b border-charcoal/5 mt-8">
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
                  {publicFolios.length} Public Collections
                </div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-charcoal/40">
                  <User size={14} className="text-sage" />
                  {userProfile.follower_count || 0} Followers
                </div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-charcoal/40">
                  <UserPlus size={14} className="text-sage" />
                  {userProfile.following_count || 0} Following
                </div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-charcoal/40">
                  <Calendar size={14} className="text-sage" />
                  Joined {userProfile.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'}
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
              navigate(`/v/${id}/public`);
            }} 
            onShare={handleShareCollection}
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
