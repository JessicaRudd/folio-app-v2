import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, MapPin, Share2, Heart, ChevronLeft, ChevronRight, MessageCircle, Check, Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { socialService } from '../services/socialService';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Comments } from './Comments';
import { TruncatedText } from './ui/TruncatedText';
import { EditPostcard } from './EditPostcard';
import { Edit2 } from 'lucide-react';

import { MusicVibePlayer } from './MusicVibePlayer';

interface MusicVibe {
  service: 'spotify' | 'apple-music';
  type: 'track' | 'playlist' | 'album';
  id: string;
  url: string;
  title?: string;
  artist?: string;
  artworkUrl?: string;
}

interface PostcardProps {
  key?: string;
  id: string;
  collectionId: string;
  creatorId: string;
  mediaUrls: string[];
  caption: string;
  location?: string;
  date: string;
  isPremium?: boolean;
  musicVibe?: MusicVibe | null;
  collectionPrivacy?: string;
  collectionVisibility?: string;
  folioToken?: string;
  profilePrivacy?: string;
}

export const Postcard = ({ 
  id, 
  creatorId, 
  collectionId,
  mediaUrls, 
  caption, 
  location, 
  date, 
  musicVibe, 
  isPremium = false,
  collectionPrivacy,
  collectionVisibility,
  folioToken,
  profilePrivacy
}: PostcardProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPhotoDeleteConfirm, setShowPhotoDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localMediaUrls, setLocalMediaUrls] = useState(mediaUrls);

  useEffect(() => {
    setLocalMediaUrls(mediaUrls);
  }, [mediaUrls]);

  const isOwner = auth.currentUser?.uid === creatorId;
  const isPublic = (collectionPrivacy === 'public' || collectionVisibility === 'public') && profilePrivacy === 'public';
  const showShare = isOwner || isPublic || (folioToken && profilePrivacy === 'public');

  const handleShare = () => {
    const baseUrl = window.location.origin;
    let path = '';
    
    // If the collection is fully public or has a public link enabled, use the premium public view
    if ((collectionPrivacy === 'public' || collectionVisibility === 'public') && profilePrivacy === 'public') {
      path = `/s/${collectionId}`;
    } 
    // Default to private guest view
    else {
      path = `/v/${collectionId}`;
    }

    let shareUrl = `${baseUrl}${path}?postcardId=${id}`;
    if (folioToken) shareUrl += `&folioToken=${folioToken}`;
    
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const fetchSocialData = async () => {
      try {
        const [hasLiked, count] = await Promise.all([
          socialService.hasLiked(id),
          socialService.getLikeCount(id)
        ]);
        setLiked(hasLiked);
        setLikeCount(count);
      } catch (err) {
        console.error('Failed to fetch social data:', err);
      }
    };
    fetchSocialData();
  }, [id]);

  const handleLike = async () => {
    try {
      const isLiked = await socialService.toggleLike(id, creatorId);
      setLiked(isLiked);
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const formatDate = (dateStr: string, options: Intl.DateTimeFormatOptions) => {
    if (!dateStr) return '';
    
    // If it's a date-only string (YYYY-MM-DD)
    if (dateStr.includes('-') && !dateStr.includes('T')) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString('en-US', options);
    }
    
    // Fallback for full ISO strings
    return new Date(dateStr).toLocaleDateString('en-US', options);
  };

  const handleDeletePostcard = async () => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'postcards', id));
      setShowDeleteConfirm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `postcards/${id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (localMediaUrls.length <= 1) {
      alert("A postcard must have at least one photo. Delete the entire postcard instead.");
      setShowPhotoDeleteConfirm(false);
      return;
    }

    const index = currentIndex;
    const newUrls = [...localMediaUrls];
    newUrls.splice(index, 1);
    
    setIsDeleting(true);
    try {
      await updateDoc(doc(db, 'postcards', id), {
        mediaUrls: newUrls
      });
      setLocalMediaUrls(newUrls);
      if (currentIndex >= newUrls.length) {
        setCurrentIndex(newUrls.length - 1);
      }
      setShowPhotoDeleteConfirm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `postcards/${id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const next = () => setCurrentIndex((prev) => (prev + 1) % localMediaUrls.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + localMediaUrls.length) % localMediaUrls.length);

  if (isDeleting && !showDeleteConfirm) return null;

  return (
    <div id={`postcard-${id}`} className="max-w-2xl mx-auto bg-white shadow-2xl rounded-sm overflow-hidden border-[12px] border-white">
      {/* Media Carousel */}
      <div className="aspect-square relative bg-canvas overflow-hidden group">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={localMediaUrls[currentIndex]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            alt="Postcard media"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>

        {isOwner && localMediaUrls.length > 1 && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowPhotoDeleteConfirm(true);
            }}
            className="absolute top-4 left-4 p-2 bg-white/80 rounded-full shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors z-10 opacity-0 group-hover:opacity-100"
            title="Delete this photo"
          >
            <X size={16} />
          </button>
        )}

        {localMediaUrls.length > 1 && (
          <>
            <button 
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={20} />
            </button>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {localMediaUrls.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    i === currentIndex ? "bg-white w-4" : "bg-white/40"
                  )} 
                />
              ))}
            </div>
          </>
        )}
        
        {/* Stamp/Postmark Overlay */}
        {!isPremium && (
          <div className="absolute top-6 right-6 w-24 h-24 opacity-40 pointer-events-none rotate-12">
            <svg viewBox="0 0 100 100" className="w-full h-full fill-charcoal">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
              <text x="50" y="45" textAnchor="middle" className="text-[10px] font-serif uppercase tracking-tighter">Folio</text>
              <text x="50" y="60" textAnchor="middle" className="text-[8px] font-sans uppercase tracking-widest">
                {formatDate(date, { month: 'short', year: '2-digit' })}
              </text>
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            {location && (
              <div className="flex items-center gap-1 text-sage text-sm font-medium">
                <MapPin size={14} />
                {location}
              </div>
            )}
            <div className="text-charcoal/40 text-xs uppercase tracking-widest font-bold">
              {formatDate(date, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-charcoal/30">{likeCount}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="rounded-full p-2"
                onClick={handleLike}
              >
                <Heart 
                  size={20} 
                  className={cn(
                    "transition-all duration-300",
                    liked ? "fill-red-500 text-red-500 scale-110" : "text-charcoal/40 hover:text-red-500"
                  )} 
                />
              </Button>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-full p-2"
              onClick={() => setShowComments(true)}
            >
              <MessageCircle size={20} className="text-charcoal/40 hover:text-sage transition-colors" />
            </Button>
            {showShare && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="rounded-full p-2"
                onClick={handleShare}
              >
                {copied ? <Check size={20} className="text-sage" /> : <Share2 size={20} className="text-charcoal/40" />}
              </Button>
            )}
            {isOwner && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="rounded-full p-2 text-charcoal/40 hover:text-sage"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit2 size={20} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="rounded-full p-2 text-charcoal/40 hover:text-red-600"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={20} />
                </Button>
              </>
            )}
          </div>
        </div>

        <TruncatedText 
          text={caption} 
          className="editorial-text border-l-2 border-sage/20 pl-6 py-2" 
        />

        {musicVibe && (
          <MusicVibePlayer vibe={musicVibe} />
        )}

        <AnimatePresence>
          {showComments && (
            <Comments 
              postcardId={id} 
              creatorId={creatorId} 
              onClose={() => setShowComments(false)} 
            />
          )}
          {showEditModal && (
            <EditPostcard
              postcard={{
                id,
                caption,
                location,
                mediaUrls: localMediaUrls,
                postcardDate: date,
                musicVibe,
                collectionId
              }}
              onClose={() => setShowEditModal(false)}
              onSuccess={() => {
                setShowEditModal(false);
                // The parent component or onSnapshot will handle the update
              }}
            />
          )}
        </AnimatePresence>

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-lg p-8 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertTriangle size={28} />
                <h3 className="text-xl font-bold">Delete Postcard?</h3>
              </div>
              <p className="text-charcoal/60 mb-8 leading-relaxed">
                This action cannot be undone. All photos and comments associated with this postcard will be permanently removed.
              </p>
              <div className="flex gap-4">
                <Button 
                  variant="ghost" 
                  className="flex-1 font-bold uppercase tracking-widest text-xs" 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none font-bold uppercase tracking-widest text-xs"
                  onClick={handleDeletePostcard}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="animate-spin" size={18} /> : 'Delete'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {showPhotoDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none font-bold uppercase tracking-widest text-xs"
                  onClick={handleDeletePhoto}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="animate-spin" size={18} /> : 'Remove'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Removed old musicTrack display */}
      </div>
    </div>
  );
};
