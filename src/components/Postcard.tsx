import { motion } from 'motion/react';
import { Music, MapPin, Share2, Heart } from 'lucide-react';
import { Button } from './ui/Button';

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
  return (
    <div className="max-w-2xl mx-auto bg-white shadow-2xl rounded-sm overflow-hidden border-[12px] border-white">
      {/* Media Carousel (Simplified for V1) */}
      <div className="aspect-square relative bg-canvas overflow-hidden">
        <img
          src={mediaUrls[0]}
          alt="Postcard media"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        
        {/* Stamp/Postmark Overlay */}
        <div className="absolute top-6 right-6 w-24 h-24 opacity-20 pointer-events-none rotate-12">
          <svg viewBox="0 0 100 100" className="w-full h-full fill-charcoal">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
            <text x="50" y="45" textAnchor="middle" className="text-[10px] font-serif uppercase tracking-tighter">Folio</text>
            <text x="50" y="60" textAnchor="middle" className="text-[8px] font-sans uppercase tracking-widest">{date}</text>
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
              {new Date(date).toLocaleDateString('en-US', {
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
