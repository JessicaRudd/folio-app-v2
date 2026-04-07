import { motion } from 'motion/react';
import { Card } from './ui/Card';
import { Calendar, Image as ImageIcon } from 'lucide-react';

interface Folio {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  createdAt: string;
  postcardCount: number;
}

interface FolioGridProps {
  folios: Folio[];
  onSelect: (id: string) => void;
}

export const FolioGrid = ({ folios, onSelect }: FolioGridProps) => {
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
              <div className="absolute top-4 right-4 glass px-3 py-1 rounded-full flex items-center gap-2 text-xs font-medium">
                <ImageIcon size={14} />
                {folio.postcardCount} Postcards
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="text-2xl mb-2">{folio.title}</h3>
              <p className="text-charcoal/60 text-sm line-clamp-2 mb-4 flex-1">
                {folio.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-charcoal/40 uppercase tracking-widest font-semibold">
                <Calendar size={12} />
                {new Date(folio.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
