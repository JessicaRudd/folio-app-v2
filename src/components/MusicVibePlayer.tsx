import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Play, Pause, Volume2, VolumeX, ExternalLink, X } from 'lucide-react';

interface MusicVibe {
  service: 'spotify' | 'apple-music';
  type: 'track' | 'playlist' | 'album';
  id: string;
  url: string;
  title?: string;
  artist?: string;
  artworkUrl?: string;
  previewUrl?: string;
}

interface MusicVibePlayerProps {
  vibe: MusicVibe;
  compact?: boolean;
}

export const MusicVibePlayer = ({ vibe, compact = false }: MusicVibePlayerProps) => {
  const [isUnmuted, setIsUnmuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.error('Audio playback failed:', err));
    }
    setIsPlaying(!isPlaying);
  };

  const getEmbedUrl = () => {
    if (vibe.service === 'spotify') {
      return `https://open.spotify.com/embed/${vibe.type}/${vibe.id}?utm_source=generator&theme=0`;
    } else {
      // Apple Music embed
      return `https://embed.music.apple.com/us/${vibe.type}/${vibe.id}`;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-lg">
        <Music size={14} className="text-white/80" />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate max-w-[100px]">
            {vibe.title || 'Music Vibe'}
          </span>
        </div>
        <a 
          href={vibe.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-white/60 hover:text-white transition-colors"
        >
          <ExternalLink size={12} />
        </a>
      </div>
    );
  }

  return (
    <div className="relative group">
      <AnimatePresence mode="wait">
        {!isUnmuted ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-4 bg-charcoal/5 hover:bg-charcoal/10 p-4 rounded-2xl transition-all cursor-pointer border border-charcoal/5"
            onClick={() => {
              if (vibe.previewUrl) {
                setIsUnmuted(true);
                setIsPlaying(true);
              } else {
                setIsUnmuted(true);
              }
            }}
          >
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-charcoal/10 flex-shrink-0">
              {vibe.artworkUrl ? (
                <img 
                  src={vibe.artworkUrl} 
                  alt={vibe.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music size={20} className="text-charcoal/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play size={20} className="text-white fill-current" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-0.5">Music Vibe</p>
              <h4 className="text-sm font-serif truncate text-charcoal">{vibe.title || 'Unknown Track'}</h4>
              <p className="text-[10px] text-charcoal/60 truncate">{vibe.artist || 'Unknown Artist'}</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-sage/10 text-sage">
                {vibe.previewUrl ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="player"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="rounded-2xl overflow-hidden bg-black shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-2 bg-charcoal text-white/60">
              <div className="flex items-center gap-2">
                <Music size={12} />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {vibe.previewUrl ? (isPlaying ? 'Playing Preview' : 'Paused') : 'Music Embed'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {vibe.previewUrl && (
                  <button 
                    onClick={togglePlay}
                    className="hover:text-white transition-colors p-1"
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                )}
                <button 
                  onClick={() => {
                    setIsUnmuted(false);
                    setIsPlaying(false);
                  }}
                  className="hover:text-white transition-colors p-1"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {vibe.previewUrl ? (
              <div className="p-6 bg-charcoal flex flex-col items-center text-center space-y-4">
                <audio 
                  ref={audioRef}
                  src={vibe.previewUrl}
                  autoPlay
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl relative group">
                  <img 
                    src={vibe.artworkUrl} 
                    alt={vibe.title} 
                    className={`w-full h-full object-cover transition-transform duration-1000 ${isPlaying ? 'scale-110' : 'scale-100'}`}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <button 
                      onClick={togglePlay}
                      className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all"
                    >
                      {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-white font-serif text-lg">{vibe.title}</h4>
                  <p className="text-white/60 text-xs uppercase tracking-widest">{vibe.artist}</p>
                </div>
                
                {/* Visualizer simulation */}
                <div className="flex items-end gap-1 h-8">
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        height: isPlaying ? [8, 24, 12, 32, 16, 28, 8][(i % 7)] : 4
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.5 + (i * 0.1),
                        ease: "easeInOut"
                      }}
                      className="w-1 bg-sage rounded-full"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <iframe
                src={getEmbedUrl()}
                width="100%"
                height={vibe.service === 'spotify' ? "80" : "150"}
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="bg-transparent"
              />
            )}
            
            <div className="p-3 bg-charcoal/95 flex items-center justify-between">
              <a 
                href={vibe.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] text-white/40 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                Open in {vibe.service === 'spotify' ? 'Spotify' : 'Apple Music'}
                <ExternalLink size={10} />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
