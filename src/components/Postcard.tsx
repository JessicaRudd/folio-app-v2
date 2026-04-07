import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, MapPin, Share2, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

interface PostcardProps {
  key?: string;
  id: string;
  folioId: string;
  mediaUrls: string[];
  caption: string;
  location?: string;
  date: string;
  musicTrack?: {
    title: string;
    artist: string;
  };
}

export const Postcard = ({ mediaUrls, caption, location, date, musicTrack }: PostcardProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const next = () => setCurrentIndex((prev) => (prev + 1) % mediaUrls.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);

  return (
    <div className="max-w-2xl mx-auto bg-white shadow-2xl rounded-sm overflow-hidden border-[12px] border-white">
      {/* Media Carousel */}
      <div className="aspect-square relative bg-canvas overflow-hidden group">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={mediaUrls[currentIndex]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            alt="Postcard media"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>

        {mediaUrls.length > 1 && (
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
              {mediaUrls.map((_, i) => (
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
        <div className="absolute top-6 right-6 w-24 h-24 opacity-20 pointer-events-none rotate-12">
          <svg viewBox="0 0 100 100" className="w-full h-full fill-charcoal">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
            <text x="50" y="45" textAnchor="middle" className="text-[10px] font-serif uppercase tracking-tighter">Folio</text>
            <text x="50" y="60" textAnchor="middle" className="text-[8px] font-sans uppercase tracking-widest">
              {formatDate(date, { month: 'short', year: '2-digit' })}
            </text>
          </svg>
        </div>
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
            <Button variant="ghost" size="sm" className="rounded-full p-2">
              <Heart size={20} className="text-charcoal/40 hover:text-red-500 transition-colors" />
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full p-2">
              <Share2 size={20} className="text-charcoal/40" />
            </Button>
          </div>
        </div>

        <div className="editorial-text border-l-2 border-sage/20 pl-6 py-2">
          {caption}
        </div>

        {musicTrack && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-full px-6 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-charcoal rounded-full flex items-center justify-center text-white">
                <Music size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold">{musicTrack.title}</div>
                <div className="text-xs text-charcoal/60">{musicTrack.artist}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-sage font-bold uppercase tracking-widest text-[10px]">
              Play Preview
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};
