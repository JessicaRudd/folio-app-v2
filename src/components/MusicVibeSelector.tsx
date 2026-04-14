import React, { useState, useEffect, useRef } from 'react';
import { Music, Search, X, Check, AlertCircle, Loader2, Play } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

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
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<MusicVibe | null>(initialVibe || null);
  const [searchResults, setSearchResults] = useState<MusicVibe[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (initialVibe) {
      setUrl(initialVibe.url);
    }
  }, [initialVibe]);

  const searchAppleMusic = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5`);
      const data = await response.json();
      
      if (data.results) {
        const vibes: MusicVibe[] = data.results.map((item: any) => ({
          service: 'apple-music',
          type: 'track',
          id: item.trackId.toString(),
          url: item.trackViewUrl,
          title: item.trackName,
          artist: item.artistName,
          artworkUrl: item.artworkUrl100?.replace('100x100', '600x600'),
          previewUrl: item.previewUrl
        }));
        setSearchResults(vibes);
        setShowResults(vibes.length > 0);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

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
        if (parts.length >= 4) {
          const type = parts[1] as any;
          const id = parts[3];
          if (['track', 'playlist', 'album'].includes(type) || type === 'album') {
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
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Check if it's a URL
    const isUrl = val.startsWith('http://') || val.startsWith('https://');

    if (isUrl) {
      const parsed = parseUrl(val);
      if (parsed) {
        setPreview(parsed);
        fetchMetadata(parsed);
        setShowResults(false);
      } else {
        setPreview(null);
        if (val.length > 15) {
          setError('Invalid Spotify or Apple Music URL');
        }
      }
    } else {
      // It's a search query
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        searchAppleMusic(val);
      }, 500);
    }
  };

  const selectResult = (vibe: MusicVibe) => {
    setPreview(vibe);
    setUrl(vibe.url);
    onSelect(vibe);
    setShowResults(false);
  };

  const clear = () => {
    setUrl('');
    setPreview(null);
    setError(null);
    onSelect(null);
    setSearchResults([]);
    setShowResults(false);
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
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Search Apple Music or paste a link..."
            className="w-full bg-charcoal/5 border border-transparent focus:border-sage/20 focus:bg-white rounded-xl py-3 pl-10 pr-10 text-sm outline-none transition-all"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/30">
            {isParsing || isSearching ? <Loader2 size={16} className="animate-spin text-sage" /> : <Search size={16} />}
          </div>
          
          {showResults && (
            <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-charcoal/5 overflow-hidden">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => selectResult(result)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-canvas transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-charcoal/5 shrink-0">
                    {result.artworkUrl && <img src={result.artworkUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-serif truncate">{result.title}</div>
                    <div className="text-[10px] text-charcoal/40 truncate italic">{result.artist}</div>
                  </div>
                  <Play size={12} className="text-sage opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}

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
        Link a song or search Apple Music to set the mood.
      </p>
    </div>
  );
};
