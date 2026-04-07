import { motion } from 'motion/react';
import { Card } from './ui/Card';
import { Calendar, Image as ImageIcon, MapPin, User } from 'lucide-react';

interface Folio {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  createdAt: string;
  folioDate?: string;
  postcardCount: number;
  photoCount?: number;
  location?: string;
  creatorName?: string;
  creatorUsername?: string;
}

interface FolioGridProps {
  folios: Folio[];
  onSelect: (id: string) => void;
  showCreator?: boolean;
}

export const FolioGrid = ({ folios, onSelect, showCreator = false }: FolioGridProps) => {
  const formatFolioDate = (dateStr?: string, createdAt?: string) => {
    const target = dateStr || createdAt;
    if (!target) return '';
    
    // If it's a date-only string (YYYY-MM-DD)
    if (target.includes('-') && !target.includes('T')) {
      const [year, month, day] = target.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    }
    
    // Fallback for full ISO strings
    return new Date(target).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-6">
      {folios.map((folio, index) => (
        <motion.div
          key={folio.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onSelect(folio.id)}
          className="cursor-pointer"
        >
          <Card className="h-full flex flex-col">
            <div className="aspect-[4/5] relative overflow-hidden">
              <img
                src={folio.coverImage}
                alt={folio.title}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 right-4 glass px-3 py-1 rounded-full flex flex-col items-end gap-0.5 text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <ImageIcon size={12} className="text-sage" />
                  {folio.photoCount || 0} Photos
                </div>
                <div className="text-[8px] opacity-40">
                  {folio.postcardCount || 0} Postcards
                </div>
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl">{folio.title}</h3>
                {folio.location && (
                  <div className="flex items-center gap-1 text-[10px] text-charcoal/40 uppercase font-bold">
                    <MapPin size={10} />
                    {folio.location}
                  </div>
                )}
              </div>
              <p className="text-charcoal/60 text-sm line-clamp-2 mb-4 flex-1">
                {folio.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-charcoal/40 uppercase tracking-widest font-semibold">
                <Calendar size={12} />
                {formatFolioDate(folio.folioDate, folio.createdAt)}
              </div>

              {showCreator && (folio.creatorName || folio.creatorUsername) && (
                <div className="mt-4 pt-4 border-t border-charcoal/5 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-sage/10 flex items-center justify-center">
                    <User size={12} className="text-sage" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40">
                    Curated by <span className="text-charcoal">{folio.creatorName || `@${folio.creatorUsername}`}</span>
                  </span>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
