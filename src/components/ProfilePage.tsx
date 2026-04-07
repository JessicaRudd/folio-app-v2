import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Globe, Lock, Save, Loader2, Camera, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from './ui/Button';
import { auth, db, storage } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
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
    photoURL: ''
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfile({
            displayName: data.displayName || auth.currentUser.displayName || '',
            bio: data.bio || '',
            username: data.username || '',
            profilePrivacy: data.profilePrivacy || 'private',
            photoURL: data.photoURL || auth.currentUser.photoURL || ''
          });
          setAvatarPreview(data.photoURL || auth.currentUser.photoURL || '');
        } else {
          // Initialize profile if it doesn't exist
          const initialProfile = {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email,
            displayName: auth.currentUser.displayName || '',
            bio: '',
            username: '',
            photoURL: auth.currentUser.photoURL || '',
            profilePrivacy: 'private',
            role: 'creator',
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', auth.currentUser.uid), initialProfile);
          setProfile(initialProfile);
          setAvatarPreview(auth.currentUser.photoURL || '');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

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

      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        ...profile,
        photoURL,
        updatedAt: new Date().toISOString()
      });

      // Sync Public Profile
      if (profile.profilePrivacy === 'public' && profile.username) {
        await setDoc(doc(db, 'public_profiles', profile.username), {
          uid: auth.currentUser.uid,
          displayName: profile.displayName,
          photoURL,
          bio: profile.bio,
          username: profile.username,
          createdAt: profile.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else if (profile.username) {
        // If switched to private, we could delete the public profile
        // For now, let's just not update it, or we could explicitly delete it
        // await deleteDoc(doc(db, 'public_profiles', profile.username));
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
            <button className="w-full flex items-center justify-between p-3 bg-white rounded-lg shadow-sm text-sm font-bold uppercase tracking-widest text-sage">
              Profile Settings <ChevronRight size={16} />
            </button>
            <button className="w-full flex items-center justify-between p-3 text-sm font-bold uppercase tracking-widest text-charcoal/40 hover:text-charcoal transition-colors">
              Account <ChevronRight size={16} />
            </button>
            <button className="w-full flex items-center justify-between p-3 text-sm font-bold uppercase tracking-widest text-charcoal/40 hover:text-charcoal transition-colors">
              Notifications <ChevronRight size={16} />
            </button>
            {profile.username && profile.profilePrivacy === 'public' && (
              <button 
                onClick={() => window.open(`/u/${profile.username}`, '_blank')}
                className="w-full flex items-center justify-between p-3 text-sm font-bold uppercase tracking-widest text-sage hover:bg-sage/5 transition-all rounded-lg mt-4"
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
              {profile.username && profile.profilePrivacy === 'public' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => window.open(`/u/${profile.username}`, '_blank')}
                  className="text-sage gap-2"
                >
                  <Globe size={16} /> View Public Profile
                </Button>
              )}
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
        </main>
      </div>
    </div>
  );
};
