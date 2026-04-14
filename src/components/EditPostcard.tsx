import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Music, MapPin, Send, Loader2, ChevronLeft, ChevronRight, Navigation, Trash2, AlertTriangle, Plus, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/Button';
import { db, auth, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, getDoc, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn } from '../lib/utils';
import { APP_LIMITS } from '../constants';

import { MusicVibeSelector } from './MusicVibeSelector';

interface MusicVibe {
  service: 'spotify' | 'apple-music';
  type: 'track' | 'playlist' | 'album';
  id: string;
  url: string;
  title?: string;
  artist?: string;
  artworkUrl?: string;
}

interface EditPostcardProps {
  postcard: {
    id: string;
    caption: string;
    location?: string;
    mediaUrls: string[];
    postcardDate: string;
    musicVibe?: MusicVibe | null;
    collectionId: string;
    showStamp?: boolean;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export const EditPostcard = ({ postcard, onClose, onSuccess }: EditPostcardProps) => {
  const [loading, setLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState<(string | File)[]>(postcard.mediaUrls);
  const [previewUrls, setPreviewUrls] = useState<string[]>(postcard.mediaUrls);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [caption, setCaption] = useState(postcard.caption);
  const [location, setLocation] = useState(postcard.location || '');
  const [postcardDate, setPostcardDate] = useState(postcard.postcardDate);
  const [musicVibe, setMusicVibe] = useState<MusicVibe | null>(postcard.musicVibe || null);
  const [showStamp, setShowStamp] = useState(postcard.showStamp !== false);
  
  const [showPhotoDeleteConfirm, setShowPhotoDeleteConfirm] = useState(false);
  const [userStats, setUserStats] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!auth.currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserStats(userDoc.data());
        }
      } catch (err) {
        console.error('Error fetching user stats:', err);
      }
    };
    fetchUserStats();
  }, []);

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          }, 'image/jpeg', 0.7); // 70% quality
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const limits = userStats?.role === 'admin' ? APP_LIMITS.ADMIN : (userStats?.isPremium ? APP_LIMITS.PREMIUM : APP_LIMITS.FREE);
      const totalItems = mediaItems.length + files.length;
      
      if (totalItems > limits.MAX_PHOTOS_PER_POSTCARD) {
        alert(`Your account is limited to ${limits.MAX_PHOTOS_PER_POSTCARD} photos per postcard.`);
        const allowedCount = limits.MAX_PHOTOS_PER_POSTCARD - mediaItems.length;
        if (allowedCount <= 0) return;
        
        const allowedFiles = files.slice(0, allowedCount);
        setMediaItems(prev => [...prev, ...allowedFiles]);
        const urls = allowedFiles.map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...urls]);
      } else {
        setMediaItems(prev => [...prev, ...files]);
        const urls = files.map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...urls]);
      }
    }
  };

  // Geolocation State
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getCurrentLocation = () => {
    setIsLocating(true);
    setShowSuggestions(false);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ lat: latitude, lng: longitude });
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then(res => res.json())
          .then(data => {
            if (data.display_name) {
              const parts = data.display_name.split(', ');
              const city = parts[0] || '';
              const country = parts[parts.length - 1] || '';
              setLocation(`${city}, ${country}`);
            }
            setIsLocating(false);
          })
          .catch(() => setIsLocating(false));
      },
      () => setIsLocating(false)
    );
  };

  const handleLocationChange = (val: string) => {
    setLocation(val);
    setCoordinates(null);
    
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
    setCoordinates({ lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) });
    setShowSuggestions(false);
    setLocationSuggestions([]);
  };

  const handleDeletePhoto = () => {
    if (mediaItems.length <= 1) {
      alert("A postcard must have at least one photo.");
      return;
    }
    setShowPhotoDeleteConfirm(true);
  };

  const confirmDeletePhoto = () => {
    const newItems = [...mediaItems];
    const newPreviews = [...previewUrls];
    
    // Revoke object URL if it's a File
    if (newItems[currentPreviewIndex] instanceof File) {
      URL.revokeObjectURL(newPreviews[currentPreviewIndex]);
    }
    
    newItems.splice(currentPreviewIndex, 1);
    newPreviews.splice(currentPreviewIndex, 1);
    
    setMediaItems(newItems);
    setPreviewUrls(newPreviews);
    
    if (currentPreviewIndex >= newItems.length) {
      setCurrentPreviewIndex(Math.max(0, newItems.length - 1));
    }
    setShowPhotoDeleteConfirm(false);
  };

  const handleSubmit = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      // 1. Upload any new Files
      const uploadPromises = mediaItems.map(async (item) => {
        if (typeof item === 'string') return item;
        
        let uploadData: Blob | File = item;
        if (item.type.startsWith('image/')) {
          try {
            uploadData = await compressImage(item);
          } catch (e) {
            console.error('Compression failed, uploading original:', e);
          }
        }
        
        const storageRef = ref(storage, `postcards/${auth.currentUser!.uid}/${Date.now()}_${item.name}`);
        const uploadResult = await uploadBytes(storageRef, uploadData);
        return getDownloadURL(uploadResult.ref);
      });

      const finalMediaUrls = await Promise.all(uploadPromises);

      const postcardRef = doc(db, 'postcards', postcard.id);
      
      const updates: any = {
        caption: caption || '',
        location: location || '',
        mediaUrls: finalMediaUrls,
        postcardDate: postcardDate || new Date().toISOString().split('T')[0],
        musicVibe: musicVibe || null,
        updatedAt: new Date().toISOString(),
        showStamp: (userStats?.role === 'admin' || userStats?.isPremium) ? showStamp : true,
        creatorRole: userStats?.role || 'user',
        creatorIsPremium: userStats?.isPremium || false
      };

      if (coordinates) {
        updates.lat = coordinates.lat;
        updates.lng = coordinates.lng;
      }

      await updateDoc(postcardRef, updates);

      // 2. Update collection photo count
      if (postcard.collectionId !== 'loose-leaves') {
        const photoDiff = finalMediaUrls.length - postcard.mediaUrls.length;
        if (photoDiff !== 0) {
          await updateDoc(doc(db, 'collections', postcard.collectionId), {
            photoCount: increment(photoDiff)
          });
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Error updating postcard:', error);
      handleFirestoreError(error, OperationType.UPDATE, `postcards/${postcard.id}`);
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
        {/* Header */}
        <div className="px-6 py-4 border-b border-charcoal/5 flex items-center justify-between bg-white">
          <h2 className="text-xl font-serif">Edit Postcard</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-2 rounded-full">
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          {/* Preview Carousel */}
          <div className="relative group aspect-square rounded-lg overflow-hidden bg-white shadow-inner border border-charcoal/5">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentPreviewIndex}
                src={previewUrls[currentPreviewIndex]}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>
            
            {previewUrls.length > 1 && (
              <>
                <button 
                  onClick={() => setCurrentPreviewIndex(prev => (prev > 0 ? prev - 1 : previewUrls.length - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => setCurrentPreviewIndex(prev => (prev < previewUrls.length - 1 ? prev + 1 : 0))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            <button 
              onClick={handleDeletePhoto}
              className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove this photo"
            >
              <Trash2 size={16} />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {previewUrls.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    i === currentPreviewIndex ? "bg-white w-4" : "bg-white/40"
                  )} 
                />
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Plus size={16} /> Add More Photos
            </Button>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40 flex items-center gap-2">
                  <MapPin size={14} /> Location
                </label>
                <button 
                  onClick={getCurrentLocation}
                  disabled={isLocating}
                  className="text-[10px] text-sage font-bold uppercase tracking-widest flex items-center gap-1 hover:underline disabled:opacity-50"
                >
                  {isLocating ? <Loader2 className="animate-spin" size={10} /> : <Navigation size={10} />}
                  Current
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  onFocus={() => locationSuggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Where was this?"
                  className="w-full p-3 bg-white rounded-lg border border-charcoal/5 focus:ring-2 focus:ring-sage/20 focus:border-sage outline-none transition-all"
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

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Diary Entry</label>
              <textarea
                value={caption}
                maxLength={2000}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write your story..."
                className="w-full h-32 p-4 bg-white rounded-lg border border-charcoal/5 focus:ring-2 focus:ring-sage/20 focus:border-sage outline-none transition-all editorial-text resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2 md:col-span-2">
                <MusicVibeSelector 
                  onSelect={setMusicVibe}
                  initialVibe={musicVibe}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40 flex items-center gap-2">
                  Date
                </label>
                <input
                  type="date"
                  value={postcardDate}
                  onChange={(e) => setPostcardDate(e.target.value)}
                  className="w-full p-3 bg-white rounded-lg border border-charcoal/5 focus:ring-2 focus:ring-sage/20 focus:border-sage outline-none transition-all"
                />
              </div>
            </div>

            {(userStats?.role === 'admin' || userStats?.isPremium) && (
              <div className="flex items-center gap-2 p-4 bg-sage/5 rounded-xl border border-sage/10">
                <input 
                  type="checkbox" 
                  id="showStamp" 
                  checked={showStamp}
                  onChange={(e) => setShowStamp(e.target.checked)}
                  className="w-4 h-4 rounded border-charcoal/20 text-sage focus:ring-sage"
                />
                <label htmlFor="showStamp" className="text-xs font-bold text-charcoal/60 cursor-pointer flex items-center gap-2">
                  Display Postcard Stamp
                  <span className="text-[10px] font-normal italic opacity-60">(Custom location stamp)</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-charcoal/5 bg-white flex items-center justify-between">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit} 
            disabled={loading || !caption || mediaItems.length === 0}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Send size={18} />
            )}
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Photo Delete Confirmation Modal */}
        {showPhotoDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-lg p-8 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertTriangle size={28} />
                <h3 className="text-xl font-bold">Remove Photo?</h3>
              </div>
              <p className="text-charcoal/60 mb-8 leading-relaxed">
                Are you sure you want to remove this photo from the postcard? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <Button 
                  variant="ghost" 
                  className="flex-1 font-bold uppercase tracking-widest text-xs" 
                  onClick={() => setShowPhotoDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none font-bold uppercase tracking-widest text-xs"
                  onClick={confirmDeletePhoto}
                >
                  Remove
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
