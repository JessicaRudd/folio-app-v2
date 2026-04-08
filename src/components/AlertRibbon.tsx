import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, ArrowRight } from 'lucide-react';

interface AlertRibbonProps {
  message: string;
  onClose: () => void;
  onAction?: () => void;
  actionLabel?: string;
}

export const AlertRibbon = ({ message, onClose, onAction, actionLabel }: AlertRibbonProps) => {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-sage text-white overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle size={16} className="shrink-0" />
          <p className="text-xs font-bold uppercase tracking-widest leading-none">
            {message}
          </p>
        </div>
        
        <div className="flex items-center gap-6">
          {onAction && actionLabel && (
            <button 
              onClick={onAction}
              className="text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-1 hover:opacity-80 transition-opacity"
            >
              {actionLabel} <ArrowRight size={12} />
            </button>
          )}
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
