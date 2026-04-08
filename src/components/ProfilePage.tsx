import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Globe, Lock, Save, Loader2, Camera, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from './ui/Button';
import { auth, db, storage } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export const ProfilePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>({
    displayName: '',
    bio: '',
    username: '',
    profilePrivacy: 'private',
    photoURL: '',
    role: 'creator',
    isPremium: false,
    follower_count: 0,
    following_count: 0
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  // Admin Panel State
  const [adminSearch, setAdminSearch] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    const userRef = doc(db, 'users', auth.currentUser.uid);
    
    const unsubscribe = onSnapshot(userRef, async (userDoc) => {
      try {
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfile({
            displayName: data.displayName || auth.currentUser?.displayName || '',
            bio: data.bio || '',
            username: data.username || '',
            profilePrivacy: data.profilePrivacy || 'private',
            photoURL: data.photoURL || auth.currentUser?.photoURL || '',
            role: data.role || 'creator',
            isPremium: data.isPremium || false,
            follower_count: data.follower_count || 0,
            following_count: data.following_count || 0
          });
          setAvatarPreview(data.photoURL || auth.currentUser?.photoURL || '');
        } else {
          // Initialize profile if it doesn't exist
          const initialProfile = {
            uid: auth.currentUser?.uid,
            email: auth.currentUser?.email,
            displayName: auth.currentUser?.displayName || '',
            bio: '',
            username: '',
            photoURL: auth.currentUser?.photoURL || '',
            profilePrivacy: 'private',
            role: 'creator',
            isPremium: false,
            follower_count: 0,
            following_count: 0,
            createdAt: new Date().toISOString(),
            total_folio_count: 0,
            total_postcard_count: 0
          };
          await setDoc(userRef, initialProfile);
          // Snapshot will fire again with the new data
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const searchUser = async () => {
    if (!adminSearch.trim()) return;
    setSearchingUser(true);
    setFoundUser(null);
    try {
      // Search by username in public_profiles
      const profileDoc = await getDoc(doc(db, 'public_profiles', adminSearch.trim()));
      if (profileDoc.exists()) {
        const uid = profileDoc.data().uid;
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          setFoundUser({ id: userDoc.id, ...userDoc.data() });
        }
      } else {
        alert('User not found. Search by exact username.');
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearchingUser(false);
    }
  };

  const toggleAdminRole = async () => {
    if (!foundUser) return;
    setUpdatingRole(true);
    try {
      const newRole = foundUser.role === 'admin' ? 'creator' : 'admin';
      await updateDoc(doc(db, 'users', foundUser.id), {
        role: newRole
      });
      setFoundUser({ ...foundUser, role: newRole });
      alert(`User role updated to ${newRole}`);
    } catch (err) {
      console.error('Role update failed:', err);
      alert('Failed to update role. Permission denied.');
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      let photoURL = profile.photoURL;
      if (avatarFile) {
        const storageRef = ref(storage, `avatars/${auth.currentUser.uid}`);
        const uploadResult = await uploadBytes(storageRef, avatarFile);
        photoURL = await getDownloadURL(uploadResult.ref);
      }

      // Only update editable fields to avoid overwriting counts
      const editableData = {
        displayName: profile.displayName,
        bio: profile.bio,
        username: profile.username,
        profilePrivacy: profile.profilePrivacy,
        photoURL,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'users', auth.currentUser.uid), editableData);

      // Sync Public Profile
      if (profile.profilePrivacy === 'public' && profile.username) {
        await setDoc(doc(db, 'public_profiles', profile.username), {
          uid: auth.currentUser.uid,
          ...editableData,
          follower_count: profile.follower_count || 0,
          following_count: profile.following_count || 0,
          createdAt: profile.createdAt || new Date().toISOString()
        }, { merge: true });

        // Update all folios and postcards with public profile privacy
        const { collection, query, where, getDocs, writeBatch } = await import('firebase/firestore');
        const foliosQuery = query(collection(db, 'folios'), where('creatorId', '==', auth.currentUser.uid));
        const foliosSnap = await getDocs(foliosQuery);
        
        const postcardsQuery = query(collection(db, 'postcards'), where('creatorId', '==', auth.currentUser.uid));
        const postcardsSnap = await getDocs(postcardsQuery);

        const batch = writeBatch(db);
        
        if (!foliosSnap.empty) {
          foliosSnap.docs.forEach(fDoc => {
            batch.update(fDoc.ref, { profilePrivacy: 'public' });
          });
        }

        if (!postcardsSnap.empty) {
          postcardsSnap.docs.forEach(pDoc => {
            batch.update(pDoc.ref, { profilePrivacy: 'public' });
          });
        }

        await batch.commit();
      } else if (profile.profilePrivacy === 'private' && profile.username) {
        // Remove from public profiles if it exists
        try {
          const { deleteDoc, collection, query, where, getDocs, writeBatch } = await import('firebase/firestore');
          await deleteDoc(doc(db, 'public_profiles', profile.username));
          
          // Also update all folios and postcards with the new profile privacy
          const foliosQuery = query(collection(db, 'folios'), where('creatorId', '==', auth.currentUser.uid));
          const foliosSnap = await getDocs(foliosQuery);
          
          const postcardsQuery = query(collection(db, 'postcards'), where('creatorId', '==', auth.currentUser.uid));
          const postcardsSnap = await getDocs(postcardsQuery);

          const batch = writeBatch(db);
          
          if (!foliosSnap.empty) {
            foliosSnap.docs.forEach(fDoc => {
              const updates: any = { profilePrivacy: 'private' };
              updates.visibility = 'private'; // Profile private = all collections private
              batch.update(fDoc.ref, updates);
            });
          }

          if (!postcardsSnap.empty) {
            postcardsSnap.docs.forEach(pDoc => {
              batch.update(pDoc.ref, { 
                profilePrivacy: 'private',
                folioVisibility: 'private'
              });
            });
          }

          await batch.commit();
        } catch (e) {
          console.warn('Could not delete public profile or update folios:', e);
        }
      }
      
      setProfile(prev => ({ ...prev, photoURL }));
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-sage" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row gap-12">
        {/* Sidebar */}
        <aside className="w-full md:w-64 space-y-8">
          <div className="relative group w-32 h-32 mx-auto md:mx-0">
            <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-lg bg-canvas">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-charcoal/20">
                  <User size={48} />
                </div>
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              <Camera size={24} />
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </label>
          </div>

          <nav className="space-y-1">
            <div className="w-full flex items-center justify-between p-3 bg-white rounded-lg shadow-sm text-sm font-bold uppercase tracking-widest text-sage border border-sage/10">
              Profile Settings <ChevronRight size={16} />
            </div>
            {profile.username && profile.profilePrivacy === 'public' && (
              <button 
                onClick={() => window.open(`/u/${profile.username}`, '_blank')}
                className="w-full flex items-center justify-between p-3 text-sm font-bold uppercase tracking-widest text-charcoal/60 hover:text-sage hover:bg-sage/5 transition-all rounded-lg mt-4"
              >
                View Public Profile <Globe size={16} />
              </button>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-12">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 -ml-4">
              <ArrowLeft size={18} /> Back
            </Button>
          </div>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-serif">Curator Profile</h2>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-xl font-bold">{profile.follower_count}</div>
                  <div className="text-[10px] text-charcoal/40 uppercase font-bold tracking-widest">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{profile.following_count}</div>
                  <div className="text-[10px] text-charcoal/40 uppercase font-bold tracking-widest">Following</div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Display Name</label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                  className="w-full p-3 bg-white rounded-lg border border-charcoal/5 focus:ring-2 focus:ring-sage/20 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/30 text-sm">@</span>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    className="w-full p-3 pl-8 bg-white rounded-lg border border-charcoal/5 focus:ring-2 focus:ring-sage/20 outline-none transition-all"
                    placeholder="username"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Bio</label>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="w-full h-32 p-4 bg-white rounded-lg border border-charcoal/5 focus:ring-2 focus:ring-sage/20 outline-none transition-all resize-none editorial-text"
                placeholder="Tell your story..."
              />
            </div>
          </section>

          <section className="space-y-6 pt-12 border-t border-charcoal/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-serif">Folio Privacy</h3>
                <p className="text-sm text-charcoal/60">Control how others discover your profile.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setProfile({ ...profile, profilePrivacy: 'private' })}
                className={cn(
                  "p-6 rounded-2xl border-2 text-left transition-all flex flex-col gap-3",
                  profile.profilePrivacy === 'private' ? "border-sage bg-sage/5" : "border-charcoal/5 hover:border-charcoal/10"
                )}
              >
                <Lock size={24} className={profile.profilePrivacy === 'private' ? "text-sage" : "text-charcoal/40"} />
                <div>
                  <div className="font-bold">Private Profile</div>
                  <div className="text-xs text-charcoal/40 mt-1">Only visible to those with your direct link. Collections default to private.</div>
                </div>
              </button>

              <button
                onClick={() => setProfile({ ...profile, profilePrivacy: 'public' })}
                className={cn(
                  "p-6 rounded-2xl border-2 text-left transition-all flex flex-col gap-3",
                  profile.profilePrivacy === 'public' ? "border-sage bg-sage/5" : "border-charcoal/5 hover:border-charcoal/10"
                )}
              >
                <Globe size={24} className={profile.profilePrivacy === 'public' ? "text-sage" : "text-charcoal/40"} />
                <div>
                  <div className="font-bold">Public Profile</div>
                  <div className="text-xs text-charcoal/40 mt-1">Visible on the Explore page. Allows you to set collections to public.</div>
                </div>
              </button>
            </div>
          </section>

          <div className="flex justify-end pt-6">
            <Button 
              variant="primary" 
              size="lg" 
              onClick={handleSave} 
              disabled={saving}
              className="gap-2 px-8"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {saving ? 'Saving Changes...' : 'Save Profile'}
            </Button>
          </div>

          {(profile.role === 'admin' || auth.currentUser?.email === 'jess@irudd.com') && (
            <section className="space-y-6 pt-12 border-t border-charcoal/5">
              <div className="flex items-center gap-3 text-sage">
                <Lock size={24} />
                <h3 className="text-xl font-serif">Admin Panel</h3>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-charcoal/5 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Manage User Roles</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      placeholder="Search by username..."
                      className="flex-1 p-3 bg-canvas rounded-lg border border-charcoal/5 focus:ring-2 focus:ring-sage/20 outline-none transition-all"
                    />
                    <Button onClick={searchUser} disabled={searchingUser}>
                      {searchingUser ? <Loader2 className="animate-spin" size={18} /> : 'Search'}
                    </Button>
                  </div>
                </div>

                {foundUser && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-canvas rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-white">
                        {foundUser.photoURL ? (
                          <img src={foundUser.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-charcoal/20">
                            <User size={24} />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold">{foundUser.displayName}</div>
                        <div className="text-xs text-charcoal/40">@{foundUser.username} • {foundUser.role}</div>
                      </div>
                    </div>
                    <Button 
                      variant={foundUser.role === 'admin' ? 'ghost' : 'primary'}
                      size="sm"
                      onClick={toggleAdminRole}
                      disabled={updatingRole}
                    >
                      {updatingRole ? <Loader2 className="animate-spin" size={16} /> : (foundUser.role === 'admin' ? 'Revoke Admin' : 'Make Admin')}
                    </Button>
                  </motion.div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};
