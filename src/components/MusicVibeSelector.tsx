import React, { useState, useEffect } from 'react';
import { Music, Search, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';

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

interface MusicVibeSelectorProps {
  onSelect: (vibe: MusicVibe | null) => void;
  initialVibe?: MusicVibe | null;
}

export const MusicVibeSelector = ({ onSelect, initialVibe }: MusicVibeSelectorProps) => {
  const [url, setUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<MusicVibe | null>(initialVibe || null);

  useEffect(() => {
    if (initialVibe) {
      setUrl(initialVibe.url);
    }
  }, [initialVibe]);

  const fetchMetadata = async (vibe: MusicVibe) => {
    setIsParsing(true);
    setError(null);
    try {
      if (vibe.service === 'apple-music') {
        const response = await fetch(`https://itunes.apple.com/lookup?id=${vibe.id}&entity=${vibe.type === 'track' ? 'song' : vibe.type}`);
        const data = await response.json();
        if (data.results && data.results[0]) {
          const result = data.results[0];
          const updatedVibe = {
            ...vibe,
            title: result.trackName || result.collectionName || vibe.title,
            artist: result.artistName || vibe.artist,
            artworkUrl: result.artworkUrl100?.replace('100x100', '600x600') || vibe.artworkUrl,
            previewUrl: result.previewUrl || vibe.previewUrl
          };
          setPreview(updatedVibe);
          onSelect(updatedVibe);
        }
      } else if (vibe.service === 'spotify') {
        const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(vibe.url)}`);
        const data = await response.json();
        if (data) {
          const updatedVibe = {
            ...vibe,
            title: data.title || vibe.title,
            artist: data.author_name || vibe.artist,
            artworkUrl: data.thumbnail_url || vibe.artworkUrl,
          };
          setPreview(updatedVibe);
          onSelect(updatedVibe);
        }
      }
    } catch (err) {
      console.error('Error fetching music metadata:', err);
      // Fallback to basic parsed data if fetch fails
      setPreview(vibe);
      onSelect(vibe);
    } finally {
      setIsParsing(false);
    }
  };

  const parseUrl = (inputUrl: string): MusicVibe | null => {
    try {
      const urlObj = new URL(inputUrl);
      
      // Spotify
      if (urlObj.hostname.includes('spotify.com')) {
        const parts = urlObj.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          const type = parts[0] as any;
          const id = parts[1];
          if (['track', 'playlist', 'album'].includes(type)) {
            return {
              service: 'spotify',
              type,
              id,
              url: inputUrl,
              title: `Spotify ${type.charAt(0).toUpperCase() + type.slice(1)}`,
              artist: 'Open in Spotify to view details'
            };
          }
        }
      }

      // Apple Music
      if (urlObj.hostname.includes('music.apple.com')) {
        const parts = urlObj.pathname.split('/').filter(Boolean);
        // /us/album/name/id or /us/playlist/name/id
        if (parts.length >= 4) {
          const type = parts[1] as any;
          const id = parts[3];
          if (['track', 'playlist', 'album'].includes(type) || type === 'album') {
            // Apple Music track IDs are often in the query param ?i=...
            const trackId = urlObj.searchParams.get('i');
            return {
              service: 'apple-music',
              type: trackId ? 'track' : (type === 'album' ? 'album' : 'playlist'),
              id: trackId || id,
              url: inputUrl,
              title: `Apple Music ${trackId ? 'Track' : (type === 'album' ? 'Album' : 'Playlist')}`,
              artist: 'Open in Apple Music to view details'
            };
          }
        }
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrl(val);
    setError(null);

    if (!val) {
      setPreview(null);
      onSelect(null);
      return;
    }

    const parsed = parseUrl(val);
    if (parsed) {
      setPreview(parsed);
      fetchMetadata(parsed);
    } else {
      setPreview(null);
      if (val.length > 10) {
        setError('Invalid Spotify or Apple Music URL');
      }
    }
  };

  const clear = () => {
    setUrl('');
    setPreview(null);
    setError(null);
    onSelect(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40 flex items-center gap-2">
          <Music size={12} />
          Music Vibe
        </label>
        {preview && (
          <button 
            onClick={clear}
            className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      {!preview ? (
        <div className="relative">
          <input
            type="text"
            value={url}
            onChange={handleUrlChange}
            placeholder="Paste a Spotify or Apple Music link..."
            className="w-full bg-charcoal/5 border border-transparent focus:border-sage/20 focus:bg-white rounded-xl py-3 pl-10 pr-10 text-sm outline-none transition-all"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/30">
            {isParsing ? <Loader2 size={16} className="animate-spin text-sage" /> : <Search size={16} />}
          </div>
          {error && (
            <div className="flex items-center gap-1.5 mt-2 text-red-500">
              <AlertCircle size={12} />
              <span className="text-[10px] font-medium">{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-4 bg-sage/5 border border-sage/10 p-4 rounded-2xl">
          <div className="w-12 h-12 rounded-lg bg-sage/10 overflow-hidden flex items-center justify-center text-sage">
            {preview.artworkUrl ? (
              <img src={preview.artworkUrl} alt={preview.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Music size={24} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-sage">
                {preview.service === 'spotify' ? 'Spotify' : 'Apple Music'} {preview.type}
              </span>
              {isParsing ? <Loader2 size={10} className="animate-spin" /> : <Check size={12} className="text-sage" />}
            </div>
            <h4 className="text-sm font-serif truncate text-charcoal">
              {preview.title}
            </h4>
            <p className="text-[10px] text-charcoal/40 truncate italic">
              {preview.artist}
            </p>
          </div>
          <button 
            onClick={clear}
            className="p-2 hover:bg-red-50 text-charcoal/20 hover:text-red-500 rounded-full transition-all"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <p className="text-[10px] text-charcoal/30 italic">
        Link a song or playlist to set the mood. Visitors can unmute to hear a preview.
      </p>
    </div>
  );
};
