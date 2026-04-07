import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Image as ImageIcon, Music, MapPin, Send, Loader2, Plus, ChevronLeft, ChevronRight, Navigation } from 'lucide-react';
import { Button } from './ui/Button';
import { db, storage, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn } from '../lib/utils';
import EXIF from 'exif-js';

interface CreatePostcardProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Folio {
  id: string;
  title: string;
}

export const CreatePostcard = ({ onClose, onSuccess }: CreatePostcardProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [postcardDate, setPostcardDate] = useState(new Date().toISOString().split('T')[0]);
  const [musicSearch, setMusicSearch] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<{ title: string; artist: string } | null>(null);
  
  // Folio State
  const [folios, setFolios] = useState<Folio[]>([]);
  const [selectedFolioId, setSelectedFolioId] = useState<string>('loose-leaves');
  const [isCreatingNewFolio, setIsCreatingNewFolio] = useState(false);
  const [newFolioTitle, setNewFolioTitle] = useState('');

  // Geolocation State
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchFolios = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(collection(db, 'folios'), where('creatorId', '==', auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        const fetchedFolios = querySnapshot.docs.map(doc => ({ id: doc.id, title: doc.data().title }));
        setFolios(fetchedFolios);
      } catch (err) {
        console.error('Error fetching folios:', err);
      }
    };
    fetchFolios();
  }, []);

  const extractExifData = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    EXIF.getData(file as any, function(this: any) {
      // Extract Location
      const lat = EXIF.getTag(this, "GPSLatitude");
      const lon = EXIF.getTag(this, "GPSLongitude");
      const latRef = EXIF.getTag(this, "GPSLatitudeRef") || "N";
      const lonRef = EXIF.getTag(this, "GPSLongitudeRef") || "E";

      if (lat && lon) {
        const latitude = (lat[0] + lat[1]/60 + lat[2]/3600) * (latRef === "N" ? 1 : -1);
        const longitude = (lon[0] + lon[1]/60 + lon[2]/3600) * (lonRef === "E" ? 1 : -1);
        
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then(res => res.json())
          .then(data => {
            if (data.display_name) {
              const parts = data.display_name.split(', ');
              const city = parts[0] || '';
              const country = parts[parts.length - 1] || '';
              setLocation(`${city}, ${country}`);
            }
          })
          .catch(err => console.error('Reverse geocoding failed:', err));
      }

      // Extract Date
      const dateStr = EXIF.getTag(this, "DateTimeOriginal");
      if (dateStr) {
        try {
          const [d, t] = dateStr.split(' ');
          const [y, m, day] = d.split(':');
          const [h, min, s] = t.split(':');
          const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(day), parseInt(h), parseInt(min), parseInt(s));
          if (!isNaN(date.getTime())) {
            setPostcardDate(date.toISOString().split('T')[0]);
          }
        } catch (e) {
          console.error('Error parsing EXIF date:', e);
        }
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setMediaFiles(prev => [...prev, ...files]);
      const urls = files.map(file => URL.createObjectURL(file as Blob));
      setPreviewUrls(prev => [...prev, ...urls]);
      
      // Try to extract metadata from the first photo
      if (mediaFiles.length === 0) {
        extractExifData(files[0] as File);
      }
      
      setStep(2);
    }
  };

  const getCurrentLocation = () => {
    setIsLocating(true);
    setShowSuggestions(false);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
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

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    if (currentPreviewIndex >= previewUrls.length - 1) {
      setCurrentPreviewIndex(Math.max(0, previewUrls.length - 2));
    }
  };

  const handleSubmit = async () => {
    if (mediaFiles.length === 0 || !auth.currentUser) return;

    setLoading(true);
    try {
      let finalFolioId = selectedFolioId;

      // 1. Create New Folio if needed
      if (isCreatingNewFolio && newFolioTitle.trim()) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
        const userData = userDoc.data();
        
        const folioDoc = await addDoc(collection(db, 'folios'), {
          title: newFolioTitle.trim(),
          creatorId: auth.currentUser!.uid,
          creatorName: userData?.displayName || auth.currentUser!.displayName || '',
          creatorUsername: userData?.username || '',
          createdAt: serverTimestamp(),
          folioDate: postcardDate,
          postcardCount: 0,
          photoCount: 0,
          privacy: 'private'
        });
        finalFolioId = folioDoc.id;
      }

      // 2. Upload All Media
      console.log('Uploading media...');
      const uploadPromises = mediaFiles.map(async (file) => {
        const storageRef = ref(storage, `postcards/${auth.currentUser!.uid}/${Date.now()}_${file.name}`);
        const uploadResult = await uploadBytes(storageRef, file);
        return getDownloadURL(uploadResult.ref);
      });
      const downloadUrls = await Promise.all(uploadPromises);
      console.log('Media uploaded:', downloadUrls);

      // 3. Create Postcard Doc
      const secureToken = crypto.randomUUID();
      console.log('Creating Firestore document...');
      try {
        await addDoc(collection(db, 'postcards'), {
          folioId: finalFolioId,
          creatorId: auth.currentUser.uid,
          mediaUrls: downloadUrls,
          caption,
          location,
          musicTrack: selectedTrack,
          secureToken,
          createdAt: serverTimestamp(),
          postcardDate: postcardDate,
          visibilityList: [], 
        });

        // 4. Update Folio Metadata
        if (finalFolioId !== 'loose-leaves') {
          const folioRef = doc(db, 'folios', finalFolioId);
          const updates: any = {
            postcardCount: increment(1),
            photoCount: increment(downloadUrls.length)
          };
          await updateDoc(folioRef, updates);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'postcards');
      }
      console.log('Postcard created successfully');

      onSuccess();
    } catch (error) {
      console.error('Error creating postcard:', error);
      let message = 'Failed to post.';
      if (error instanceof Error) {
        try {
          const parsed = JSON.parse(error.message);
          message = `Permission Denied: ${parsed.error}`;
        } catch {
          message = error.message;
        }
      }
      alert(message);
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
          <h2 className="text-xl font-serif">Create Postcard</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-2 rounded-full">
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8 text-center py-12"
              >
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-charcoal/5">
                  <ImageIcon className="text-sage" size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-serif">Select Moments</h3>
                  <p className="text-charcoal/60 italic">Choose one or more photos from your journey.</p>
                </div>
                <div className="inline-block">
                  <Button 
                    variant="primary" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse Media
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
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
                    onClick={() => removeMedia(currentPreviewIndex)}
                    className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} />
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

                {/* Folio Selection */}
                <div className="space-y-4 p-6 bg-white rounded-xl border border-charcoal/5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Collection</label>
                    <button 
                      onClick={() => setIsCreatingNewFolio(!isCreatingNewFolio)}
                      className="text-xs text-sage font-bold uppercase tracking-widest hover:underline"
                    >
                      {isCreatingNewFolio ? 'Select Existing' : '+ New Collection'}
                    </button>
                  </div>

                  {isCreatingNewFolio ? (
                    <input
                      type="text"
                      value={newFolioTitle}
                      onChange={(e) => setNewFolioTitle(e.target.value)}
                      placeholder="Enter collection title..."
                      className="w-full p-3 bg-canvas rounded-lg border border-charcoal/5 focus:ring-2 focus:ring-sage/20 outline-none transition-all"
                    />
                  ) : (
                    <select
                      value={selectedFolioId}
                      onChange={(e) => setSelectedFolioId(e.target.value)}
                      className="w-full p-3 bg-canvas rounded-lg border border-charcoal/5 focus:ring-2 focus:ring-sage/20 outline-none transition-all appearance-none"
                    >
                      <option value="loose-leaves">Loose Leaves (Default)</option>
                      {folios.map(f => (
                        <option key={f.id} value={f.id}>{f.title}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Form */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Diary Entry</label>
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Write your story..."
                      className="w-full h-32 p-4 bg-white rounded-lg border border-charcoal/5 focus:ring-2 focus:ring-sage/20 focus:border-sage outline-none transition-all editorial-text resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      <label className="text-xs font-bold uppercase tracking-widest text-charcoal/40 flex items-center gap-2">
                        Soundtrack
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={musicSearch}
                          onChange={(e) => setMusicSearch(e.target.value)}
                          placeholder="Type a song name..."
                          className="w-full p-3 bg-white rounded-lg border border-charcoal/5 focus:ring-2 focus:ring-sage/20 focus:border-sage outline-none transition-all pr-10"
                        />
                        {selectedTrack && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sage">
                            <Music size={18} />
                          </div>
                        )}
                      </div>
                      {musicSearch && !selectedTrack && (
                        <div className="p-2 bg-white rounded-lg border border-charcoal/5 shadow-sm mt-1">
                          <button 
                            onClick={() => {
                              setSelectedTrack({ title: musicSearch, artist: 'Various Artists' });
                              setMusicSearch('');
                            }}
                            className="w-full text-left p-2 hover:bg-canvas rounded transition-colors text-sm"
                          >
                            Add "{musicSearch}"
                          </button>
                        </div>
                      )}
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step === 2 && (
          <div className="px-8 py-6 border-t border-charcoal/5 bg-white flex items-center justify-between">
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep(1)} disabled={loading}>
                Change Media
              </Button>
              <Button variant="ghost" onClick={onClose} disabled={loading}>
                Save & Exit
              </Button>
            </div>
            <Button 
              variant="primary" 
              onClick={handleSubmit} 
              disabled={loading || !caption || mediaFiles.length === 0}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Send size={18} />
              )}
              {loading ? 'Posting...' : 'Post to Folio'}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
