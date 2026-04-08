import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Loader2, ArrowLeft, ImageIcon, Calendar, Music } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Button } from './ui/Button';
import { useNavigate } from 'react-router-dom';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface PostcardLocation {
  id: string;
  lat: number;
  lng: number;
  caption: string;
  locationName: string;
  mediaUrl: string;
  date: string;
  collectionId: string;
}

export const MapView = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<PostcardLocation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      if (!auth.currentUser) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'postcards'),
          where('creatorId', '==', auth.currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const postcards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const geocodedLocations: PostcardLocation[] = [];
        
        // Geocode each location
        // Note: In a real app, we should store coordinates in Firestore to avoid geocoding on every load
        for (const postcard of postcards as any[]) {
          // Use stored coordinates if available
          if (postcard.lat !== null && postcard.lng !== null && postcard.lat !== undefined && postcard.lng !== undefined) {
            geocodedLocations.push({
              id: postcard.id,
              lat: postcard.lat,
              lng: postcard.lng,
              caption: postcard.caption || '',
              locationName: postcard.location || 'Untitled',
              mediaUrl: postcard.mediaUrls?.[0] || '',
              date: postcard.postcardDate || postcard.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
              collectionId: postcard.collectionId
            });
            continue;
          }

          if (postcard.location && postcard.location.trim()) {
            try {
              // Add a small delay to respect Nominatim's rate limit (1 request per second)
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(postcard.location)}&limit=1`);
              if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
              
              const data = await response.json();
              if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                geocodedLocations.push({
                  id: postcard.id,
                  lat: lat,
                  lng: lng,
                  caption: postcard.caption || '',
                  locationName: postcard.location,
                  mediaUrl: postcard.mediaUrls?.[0] || '',
                  date: postcard.postcardDate || postcard.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                  collectionId: postcard.collectionId
                });

                // Update Firestore with coordinates for future loads
                try {
                  await updateDoc(doc(db, 'postcards', postcard.id), { lat, lng });
                } catch (updateErr) {
                  console.warn('Failed to update postcard coordinates:', updateErr);
                }
              }
            } catch (err) {
              console.error(`Error geocoding ${postcard.location}:`, err);
            }
          }
        }
        setLocations(geocodedLocations);
      } catch (err) {
        console.error('Error fetching locations:', err);
        setError('Failed to load memory map.');
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-canvas space-y-4">
        <Loader2 className="animate-spin text-sage" size={32} />
        <p className="text-charcoal/40 italic animate-pulse">Plotting your memories on the map...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-canvas overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-charcoal/5 px-6 py-4 flex items-center justify-between z-[1000]">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft size={18} /> Back
          </Button>
          <div className="h-6 w-px bg-charcoal/5" />
          <div className="flex items-center gap-2">
            <MapPin className="text-sage" size={20} />
            <h1 className="text-xl font-serif">Memory Map</h1>
          </div>
        </div>
        <div className="text-xs font-bold uppercase tracking-widest text-charcoal/40">
          {locations.length} Locations Discovered
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer 
          center={[20, 0]} 
          zoom={3} 
          className="h-full w-full"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {locations.map((loc) => (
            <Marker key={loc.id} position={[loc.lat, loc.lng]}>
              <Popup className="custom-popup">
                <div className="w-64 space-y-3 p-1">
                  <div className="aspect-video rounded-lg overflow-hidden bg-canvas">
                    <img 
                      src={loc.mediaUrl} 
                      alt={loc.locationName} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-sage font-bold text-[10px] uppercase tracking-wider">
                      <MapPin size={10} />
                      {loc.locationName}
                    </div>
                    <p className="text-sm text-charcoal line-clamp-2 italic">"{loc.caption}"</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-charcoal/40 font-medium">
                      <Calendar size={10} />
                      {new Date(loc.date).toLocaleDateString()}
                    </div>
                  </div>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="w-full text-[10px] h-8"
                    onClick={() => navigate(`/?collection=${loc.collectionId}`)}
                  >
                    View Collection
                  </Button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Legend/Overlay */}
        <div className="absolute bottom-6 left-6 z-[1000] bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-charcoal/5 shadow-xl max-w-xs">
          <p className="text-xs text-charcoal/60 leading-relaxed">
            Every pin represents a moment captured. Zoom in to explore the specific trails of your journeys.
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-popup-content-wrapper {
          border-radius: 1rem;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        .leaflet-popup-content {
          margin: 0;
          width: auto !important;
        }
        .leaflet-popup-tip-container {
          display: none;
        }
      `}} />
    </div>
  );
};
