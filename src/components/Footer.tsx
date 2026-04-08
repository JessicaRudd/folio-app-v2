import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';

interface FooterProps {
  user?: any;
  message?: string;
}

export const Footer = ({ user, message }: FooterProps) => {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <footer className="py-12 border-t border-charcoal/5 text-center space-y-4">
      <div className="text-charcoal/30 text-xs uppercase tracking-widest font-bold">
        {message || <>&copy; 2026 Folio &mdash; Privacy First Sharing</>}
      </div>
      <button 
        onClick={() => setIsFeedbackOpen(true)}
        className="text-[10px] font-bold uppercase tracking-widest text-charcoal/20 hover:text-sage transition-colors flex items-center gap-2 mx-auto"
      >
        <MessageSquare size={12} />
        Send Feedback
      </button>

      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
        user={user}
      />
    </footer>
  );
};
