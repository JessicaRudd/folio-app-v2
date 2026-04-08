import { motion } from 'motion/react';
import { Card } from './ui/Card';
import { Calendar, Image as ImageIcon, MapPin, User, Share2 } from 'lucide-react';
import { Button } from './ui/Button';

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
  privacy?: string;
}

interface FolioGridProps {
  folios: Folio[];
  onSelect: (id: string) => void;
  onShare?: (folio: Folio) => void;
  showCreator?: boolean;
  isOwner?: boolean;
}

export const FolioGrid = ({ folios, onSelect, onShare, showCreator = false, isOwner = false }: FolioGridProps) => {
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
            <div className="p-8 flex-1 flex flex-col space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-3xl font-serif tracking-tight leading-tight group-hover:text-sage transition-colors truncate">
                    {folio.title}
                  </h3>
                  {folio.location && (
                    <div className="flex items-center gap-1 text-[9px] text-charcoal/30 uppercase font-bold tracking-[0.2em] pt-2">
                      <MapPin size={10} />
                      {folio.location}
                    </div>
                  )}
                </div>
                {onShare && (isOwner || folio.privacy === 'public') && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShare(folio);
                    }}
                  >
                    <Share2 size={16} />
                  </Button>
                )}
              </div>
              
              <p className="text-charcoal/50 text-sm line-clamp-3 italic editorial-text flex-1 leading-relaxed">
                {folio.description}
              </p>

              <div className="pt-4 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-[10px] text-charcoal/30 uppercase tracking-[0.2em] font-bold">
                  <Calendar size={12} className="text-sage/40" />
                  {formatFolioDate(folio.folioDate, folio.createdAt)}
                </div>

                {showCreator && (folio.creatorName || folio.creatorUsername) && (
                  <div className="pt-4 border-t border-charcoal/5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-canvas flex items-center justify-center border border-charcoal/5">
                      <User size={14} className="text-charcoal/20" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-charcoal/20">Curator</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal">
                        {folio.creatorName || `@${folio.creatorUsername}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
