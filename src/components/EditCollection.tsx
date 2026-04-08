import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Image as ImageIcon, Loader2, Save, MapPin, Lock, Users, Globe, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/Button';
import { db, storage, auth } from '../lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs, getDoc, deleteDoc, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { cn } from '../lib/utils';

interface EditCollectionProps {
  collection: {
    id: string;
    title: string;
    description: string;
    coverImage: string;
    location?: string;
    privacy?: 'private' | 'personal' | 'public';
    visibility?: 'private' | 'public';
    allowedUsers?: string[];
    collectionDate?: string;
    postcardCount?: number;
    photoCount?: number;
    creatorName?: string;
    creatorUsername?: string;
    folioToken?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export const EditCollection = ({ collection: collectionData, onClose, onSuccess }: EditCollectionProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(collectionData.title || '');
  const [description, setDescription] = useState(collectionData.description || '');
  const [location, setLocation] = useState(collectionData.location || '');
  const [collectionDate, setCollectionDate] = useState(collectionData.collectionDate || new Date().toISOString().split('T')[0]);
  const [privacy, setPrivacy] = useState<'private' | 'personal' | 'public'>(collectionData.privacy || 'private');
  const [visibility, setVisibility] = useState<'private' | 'public'>(collectionData.visibility || 'private');
  const [allowedUsers, setAllowedUsers] = useState<string[]>(collectionData.allowedUsers || []);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(collectionData.coverImage);
  const [collectionPhotos, setCollectionPhotos] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPostcardDeleteConfirm, setShowPostcardDeleteConfirm] = useState<string | null>(null);
  const [showPhotoDeleteConfirm, setShowPhotoDeleteConfirm] = useState<{postcardId: string, photoUrl: string} | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [postcards, setPostcards] = useState<any[]>([]);
  const [folioMetadata, setFolioMetadata] = useState<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      
      // Fetch user profile to check privacy status
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }

      // Fetch Folio Metadata
      const metaDoc = await getDoc(doc(db, 'folio_metadata', auth.currentUser.uid));
      if (metaDoc.exists()) {
        setFolioMetadata(metaDoc.data());
      }

      // Fetch postcards to get photos for cover selection
      const q = query(
        collection(db, 'postcards'), 
        where('collectionId', '==', collectionData.id)
      );
      const querySnapshot = await getDocs(q);
      const fetchedPostcards: any[] = [];
      const photos: string[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedPostcards.push({ id: doc.id, ...data });
        if (data.mediaUrls && data.mediaUrls.length > 0) {
          photos.push(...data.mediaUrls);
        }
      });
      setPostcards(fetchedPostcards);
      setCollectionPhotos(Array.from(new Set(photos))); // Unique photos

      // Sync counts if needed (fix for existing collections or drift)
      const updates: any = {};
      if (collectionData.postcardCount !== fetchedPostcards.length) updates.postcardCount = fetchedPostcards.length;
      if (collectionData.photoCount !== photos.length) updates.photoCount = photos.length;
      
      // Ensure creator info is present for Explore page
      if (!collectionData.creatorName || !collectionData.creatorUsername) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
        const userData = userDoc.data();
        updates.creatorName = userData?.displayName || auth.currentUser!.displayName || '';
        updates.creatorUsername = userData?.username || '';
      }

      if (Object.keys(updates).length > 0 && collectionData.id !== 'loose-leaves') {
        updateDoc(doc(db, 'collections', collectionData.id), updates);
      }
    };
    fetchData();
  }, [collectionData.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAddUser = () => {
    if (newUserEmail && !allowedUsers.includes(newUserEmail)) {
      setAllowedUsers([...allowedUsers, newUserEmail]);
      setNewUserEmail('');
    }
  };

  const handleRemoveUser = (email: string) => {
    setAllowedUsers(allowedUsers.filter(u => u !== email));
  };

  const handleLocationChange = (val: string) => {
    setLocation(val);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (val.length < 3) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`);
        const data = await response.json();
        setLocationSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch (err) {
        console.error('Location search failed:', err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 500);
  };

  const selectLocation = (suggestion: any) => {
    setLocation(suggestion.display_name);
    setShowSuggestions(false);
    setLocationSuggestions([]);
  };

  const handleDelete = async () => {
    if (!auth.currentUser) return;
    setDeleting(true);

    try {
      // 1. Get all postcards in this collection
      const postcardsQuery = query(
        collection(db, 'postcards'),
        where('collectionId', '==', collectionData.id)
      );
      const postcardsSnapshot = await getDocs(postcardsQuery);

      // 2. Delete all postcards in a batch
      const batch = writeBatch(db);
      postcardsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // 3. Delete the collection document
      await deleteDoc(doc(db, 'collections', collectionData.id));

      // 4. Try to delete cover image if it's in storage
      if (collectionData.coverImage.includes('firebasestorage.googleapis.com')) {
        try {
          const coverRef = ref(storage, `collections/${auth.currentUser.uid}/${collectionData.id}_cover`);
          await deleteObject(coverRef);
        } catch (e) {
          console.warn('Cover image not found in storage or could not be deleted:', e);
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Error deleting collection:', error);
      alert('Failed to delete collection. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeletePostcard = async (postcardId: string) => {
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'postcards', postcardId));
      
      // Update collection count
      if (collectionData.id !== 'loose-leaves') {
        const postcardToDelete = postcards.find(p => p.id === postcardId);
        await updateDoc(doc(db, 'collections', collectionData.id), {
          postcardCount: increment(-1),
          photoCount: increment(-(postcardToDelete?.mediaUrls?.length || 0))
        });
      }

      setPostcards(prev => prev.filter(p => p.id !== postcardId));
      // Refresh collection photos
      const allPhotos = postcards
        .filter(p => p.id !== postcardId)
        .flatMap(p => p.mediaUrls || []);
      setCollectionPhotos(Array.from(new Set(allPhotos)));
      setShowPostcardDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting postcard:', error);
      alert('Failed to delete postcard.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeletePhoto = async (postcardId: string, photoUrl: string) => {
    setDeleting(true);
    try {
      const postcard = postcards.find(p => p.id === postcardId);
      if (!postcard) return;

      const newMediaUrls = postcard.mediaUrls.filter((url: string) => url !== photoUrl);
      
      if (newMediaUrls.length === 0) {
        // If no photos left, delete the postcard
        await handleDeletePostcard(postcardId);
        return;
      }

      await updateDoc(doc(db, 'postcards', postcardId), {
        mediaUrls: newMediaUrls
      });

      // Update collection photo count
      if (collectionData.id !== 'loose-leaves') {
        await updateDoc(doc(db, 'collections', collectionData.id), {
          photoCount: increment(-1)
        });
      }

      setPostcards(prev => prev.map(p => p.id === postcardId ? { ...p, mediaUrls: newMediaUrls } : p));
      
      // Refresh collection photos
      const allPhotos = postcards
        .flatMap(p => p.id === postcardId ? newMediaUrls : (p.mediaUrls || []));
      setCollectionPhotos(Array.from(new Set(allPhotos)));
      setShowPhotoDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo.');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdatePostcard = async (postcardId: string, updates: any) => {
    try {
      await updateDoc(doc(db, 'postcards', postcardId), updates);
      setPostcards(prev => prev.map(p => p.id === postcardId ? { ...p, ...updates } : p));
    } catch (error) {
      console.error('Error updating postcard:', error);
      alert('Failed to update postcard.');
    }
  };

  const handleSubmit = async () => {
    if (!auth.currentUser) return;

    if (privacy === 'public' && userProfile?.profilePrivacy !== 'public') {
      alert('You must set your profile to "Public" in settings before making a collection public.');
      return;
    }

    setLoading(true);
    try {
      let finalCoverUrl = previewUrl;

      if (coverImage) {
        const storageRef = ref(storage, `collections/${auth.currentUser.uid}/${collectionData.id}_cover`);
        const uploadResult = await uploadBytes(storageRef, coverImage);
        finalCoverUrl = await getDownloadURL(uploadResult.ref);
      }

      const collectionRef = doc(db, 'collections', collectionData.id);
      const currentFolioToken = folioMetadata?.shareToken || '';
      const newVisibility = privacy === 'public' ? 'public' : 'private';
      
      await updateDoc(collectionRef, {
        title,
        description,
        location,
        collectionDate,
        coverImage: finalCoverUrl,
        privacy,
        visibility: newVisibility,
        profilePrivacy: userProfile?.profilePrivacy || 'private',
        allowedUsers: privacy === 'personal' ? allowedUsers : [],
        folioToken: currentFolioToken,
        updatedAt: serverTimestamp()
      });

      // Update denormalized fields in postcards
      if (privacy !== collectionData.privacy || newVisibility !== collectionData.visibility || currentFolioToken !== collectionData.folioToken) {
        const batch = writeBatch(db);
        postcards.forEach(p => {
          batch.update(doc(db, 'postcards', p.id), {
            collectionPrivacy: privacy,
            collectionVisibility: newVisibility,
            folioToken: currentFolioToken
          });
        });
        await batch.commit();
      }

      onSuccess();
    } catch (error) {
      console.error('Error updating collection:', error);
      alert('Failed to update collection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-canvas rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-charcoal/5 flex items-center justify-between bg-white">
          <h2 className="text-xl font-serif">Edit Collection</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-2 rounded-full">
            <X size={20} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Cover Image Selection */}
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Cover Image</label>
            <div className="aspect-video rounded-lg overflow-hidden bg-white shadow-inner border border-charcoal/5 relative">
              <img src={previewUrl} alt="Cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <ImageIcon size={16} /> Upload New
                </Button>
              </div>
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            
            {collectionPhotos.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-charcoal/40 uppercase font-bold">Or select from collection</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {collectionPhotos.map((photo, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setPreviewUrl(photo);
                        setCoverImage(null);
                      }}
                      className={cn(
                        "w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all",
                        previewUrl === photo ? "border-sage scale-105 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                      )}
                    >
                      <img src={photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 bg-white rounded-lg border border-charcoal/5 focus:ring-2 focus:ring-sage/20 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40 flex items-center gap-2">
                <MapPin size={14} /> Location
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  onFocus={() => locationSuggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Collection location..."
                  className="w-full p-3 bg-white rounded-lg border border-charcoal/5 focus:ring-2 focus:ring-sage/20 outline-none transition-all"
                />
                {isSearchingLocation && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="animate-spin text-sage" size={16} />
                  </div>
                )}
                
                <AnimatePresence>
                  {showSuggestions && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-lg border border-charcoal/5 shadow-xl overflow-hidden"
                    >
                      {locationSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectLocation(suggestion)}
                          className="w-full text-left px-4 py-3 hover:bg-canvas transition-colors text-sm border-b border-charcoal/5 last:border-0 flex items-start gap-3"
                        >
                          <MapPin size={14} className="text-sage mt-0.5 shrink-0" />
                          <span className="truncate">{suggestion.display_name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Collection Date</label>
              <input
                type="date"
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                className="w-full p-3 bg-white rounded-lg border border-charcoal/5 focus:ring-2 focus:ring-sage/20 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-24 p-3 bg-white rounded-lg border border-charcoal/5 focus:ring-2 focus:ring-sage/20 outline-none transition-all resize-none"
            />
          </div>

          {/* Manage Postcards */}
          <div className="space-y-4 pt-4 border-t border-charcoal/5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Manage Postcards</label>
              <div className="text-[10px] text-charcoal/40 uppercase font-bold tracking-widest">
                {postcards.length} Total
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {postcards.map((postcard) => (
                <div key={postcard.id} className="flex flex-col md:flex-row gap-6 p-4 bg-white rounded-xl border border-charcoal/5 group relative hover:shadow-md transition-all">
                  <div className="w-full md:w-48 space-y-2 flex-shrink-0">
                    <div className="aspect-square rounded-lg overflow-hidden relative group/photo">
                      <img 
                        src={postcard.mediaUrls?.[0]} 
                        alt="Postcard" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button 
                        onClick={() => setShowPhotoDeleteConfirm({ postcardId: postcard.id, photoUrl: postcard.mediaUrls[0] })}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover/photo:opacity-100 transition-opacity shadow-lg"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {postcard.mediaUrls?.length > 1 && (
                      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                        {postcard.mediaUrls.slice(1).map((url: string, idx: number) => (
                          <div key={idx} className="w-12 h-12 rounded bg-white border border-charcoal/5 relative flex-shrink-0 group/subphoto">
                            <img src={url} className="w-full h-full object-cover rounded" referrerPolicy="no-referrer" />
                            <button 
                              onClick={() => setShowPhotoDeleteConfirm({ postcardId: postcard.id, photoUrl: url })}
                              className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover/subphoto:opacity-100 transition-opacity shadow-sm"
                            >
                              <Trash2 size={8} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40">Date</label>
                          <input
                            type="date"
                            value={postcard.postcardDate || new Date().toISOString().split('T')[0]}
                            onChange={(e) => handleUpdatePostcard(postcard.id, { postcardDate: e.target.value })}
                            className="w-full p-2 bg-canvas rounded border border-charcoal/5 text-xs outline-none focus:ring-1 focus:ring-sage/20"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40">Location</label>
                          <input
                            type="text"
                            value={postcard.location || ''}
                            onChange={(e) => handleUpdatePostcard(postcard.id, { location: e.target.value })}
                            placeholder="Add location..."
                            className="w-full p-2 bg-canvas rounded border border-charcoal/5 text-xs outline-none focus:ring-1 focus:ring-sage/20"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowPostcardDeleteConfirm(postcard.id)}
                        className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete Postcard"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40">Caption</label>
                      <textarea
                        value={postcard.caption || ''}
                        onChange={(e) => handleUpdatePostcard(postcard.id, { caption: e.target.value })}
                        placeholder="Add a caption..."
                        className="w-full h-20 p-2 bg-canvas rounded border border-charcoal/5 text-xs outline-none focus:ring-1 focus:ring-sage/20 resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {postcards.length === 0 && (
              <p className="text-sm text-charcoal/40 italic text-center py-8 bg-charcoal/5 rounded-xl border border-dashed border-charcoal/10">
                No postcards in this collection yet.
              </p>
            )}
          </div>

          {/* Privacy Options */}
          <div className="space-y-4 pt-4 border-t border-charcoal/5">
            <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Privacy Status</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => setPrivacy('private')}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all flex flex-col gap-2",
                  privacy === 'private' ? "border-sage bg-sage/5" : "border-charcoal/5 hover:border-charcoal/10"
                )}
              >
                <Lock size={18} className={privacy === 'private' ? "text-sage" : "text-charcoal/40"} />
                <div>
                  <div className="text-sm font-bold">Private</div>
                  <div className="text-[10px] text-charcoal/40">Visible with Collection link</div>
                </div>
              </button>

              <button
                onClick={() => setPrivacy('personal')}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all flex flex-col gap-2",
                  privacy === 'personal' ? "border-sage bg-sage/5" : "border-charcoal/5 hover:border-charcoal/10"
                )}
              >
                <Users size={18} className={privacy === 'personal' ? "text-sage" : "text-charcoal/40"} />
                <div>
                  <div className="text-sm font-bold">Personal</div>
                  <div className="text-[10px] text-charcoal/40">Requires specific invite</div>
                </div>
              </button>

              <button
                onClick={() => setPrivacy('public')}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all flex flex-col gap-2",
                  privacy === 'public' ? "border-sage bg-sage/5" : "border-charcoal/5 hover:border-charcoal/10",
                  userProfile?.profilePrivacy !== 'public' && "opacity-50 cursor-not-allowed"
                )}
              >
                <Globe size={18} className={privacy === 'public' ? "text-sage" : "text-charcoal/40"} />
                <div>
                  <div className="text-sm font-bold">Public</div>
                  <div className="text-[10px] text-charcoal/40">Visible on Explore</div>
                </div>
              </button>
            </div>

            {privacy === 'personal' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-charcoal/5 rounded-xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-widest">Allowed Guests</h4>
                  <div className="text-[10px] text-charcoal/40">{allowedUsers.length} Users</div>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="Enter email or username..."
                    className="flex-1 p-2 bg-white rounded-lg border border-charcoal/5 text-sm outline-none"
                  />
                  <Button variant="secondary" size="sm" onClick={handleAddUser}>
                    <Plus size={16} />
                  </Button>
                </div>

                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {allowedUsers.map(email => (
                    <div key={email} className="flex items-center justify-between bg-white p-2 rounded-md text-xs">
                      <span>{email}</span>
                      <button onClick={() => handleRemoveUser(email)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <div className="px-8 py-6 border-t border-charcoal/5 bg-white flex justify-between items-center">
          <Button 
            variant="ghost" 
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 size={18} className="mr-2" /> Delete Collection
          </Button>
          
          <div className="flex gap-3">
            <Button 
              variant="primary" 
              onClick={handleSubmit} 
              disabled={loading}
              className="gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Delete Confirmation Overlay */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[110] bg-white/95 backdrop-blur-md flex items-center justify-center p-8 text-center"
            >
              <div className="max-w-xs space-y-6">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-serif">Delete Collection?</h3>
                  <p className="text-sm text-charcoal/60">
                    This will permanently delete <span className="font-bold text-charcoal">"{collectionData.title}"</span> and all its postcards. This action cannot be undone.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="primary" 
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-red-500 hover:bg-red-600 text-white border-none"
                  >
                    {deleting ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                    {deleting ? 'Deleting...' : 'Yes, Delete Everything'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {showPostcardDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[110] bg-white/95 backdrop-blur-md flex items-center justify-center p-8 text-center"
            >
              <div className="max-w-xs space-y-6">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-serif">Delete Postcard?</h3>
                  <p className="text-sm text-charcoal/60">
                    This will permanently delete this postcard and all its photos. This action cannot be undone.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="primary" 
                    onClick={() => handleDeletePostcard(showPostcardDeleteConfirm)}
                    disabled={deleting}
                    className="bg-red-500 hover:bg-red-600 text-white border-none"
                  >
                    {deleting ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                    {deleting ? 'Deleting...' : 'Yes, Delete Postcard'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowPostcardDeleteConfirm(null)}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {showPhotoDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[110] bg-white/95 backdrop-blur-md flex items-center justify-center p-8 text-center"
            >
              <div className="max-w-xs space-y-6">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-serif">Remove Photo?</h3>
                  <p className="text-sm text-charcoal/60">
                    Are you sure you want to remove this photo from the postcard?
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="primary" 
                    onClick={() => handleDeletePhoto(showPhotoDeleteConfirm.postcardId, showPhotoDeleteConfirm.photoUrl)}
                    disabled={deleting}
                    className="bg-red-500 hover:bg-red-600 text-white border-none"
                  >
                    {deleting ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                    {deleting ? 'Deleting...' : 'Yes, Remove Photo'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowPhotoDeleteConfirm(null)}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
