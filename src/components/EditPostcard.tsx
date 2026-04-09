import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Music, MapPin, Send, Loader2, ChevronLeft, ChevronRight, Navigation, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';

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
  };
  onClose: () => void;
  onSuccess: () => void;
}

export const EditPostcard = ({ postcard, onClose, onSuccess }: EditPostcardProps) => {
  const [loading, setLoading] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>(postcard.mediaUrls);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [caption, setCaption] = useState(postcard.caption);
  const [location, setLocation] = useState(postcard.location || '');
  const [postcardDate, setPostcardDate] = useState(postcard.postcardDate);
  const [musicVibe, setMusicVibe] = useState<MusicVibe | null>(postcard.musicVibe || null);
  
  const [showPhotoDeleteConfirm, setShowPhotoDeleteConfirm] = useState(false);

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
    if (mediaUrls.length <= 1) {
      alert("A postcard must have at least one photo.");
      return;
    }
    setShowPhotoDeleteConfirm(true);
  };

  const confirmDeletePhoto = () => {
    const newUrls = [...mediaUrls];
    newUrls.splice(currentPreviewIndex, 1);
    setMediaUrls(newUrls);
    if (currentPreviewIndex >= newUrls.length) {
      setCurrentPreviewIndex(Math.max(0, newUrls.length - 1));
    }
    setShowPhotoDeleteConfirm(false);
  };

  const handleSubmit = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      const postcardRef = doc(db, 'postcards', postcard.id);
      
      const updates: any = {
        caption,
        location,
        mediaUrls,
        postcardDate,
        musicVibe,
        updatedAt: new Date().toISOString()
      };

      if (coordinates) {
        updates.lat = coordinates.lat;
        updates.lng = coordinates.lng;
      }

      await updateDoc(postcardRef, updates);

      // If photos were deleted, update the collection count
      const photoDiff = postcard.mediaUrls.length - mediaUrls.length;
      if (photoDiff > 0 && postcard.collectionId !== 'loose-leaves') {
        const { increment } = await import('firebase/firestore');
        await updateDoc(doc(db, 'collections', postcard.collectionId), {
          photoCount: increment(-photoDiff)
        });
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
          {/* Preview Carousel */}
          <div className="relative group aspect-square rounded-lg overflow-hidden bg-white shadow-inner border border-charcoal/5">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentPreviewIndex}
                src={mediaUrls[currentPreviewIndex]}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>
            
            {mediaUrls.length > 1 && (
              <>
                <button 
                  onClick={() => setCurrentPreviewIndex(prev => (prev > 0 ? prev - 1 : mediaUrls.length - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => setCurrentPreviewIndex(prev => (prev < mediaUrls.length - 1 ? prev + 1 : 0))}
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
              {mediaUrls.map((_, i) => (
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

          {/* Form */}
          <div className="space-y-6">
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
            disabled={loading || !caption || mediaUrls.length === 0}
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
