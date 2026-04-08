import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Loader2, User } from 'lucide-react';
import { Button } from './ui/Button';
import { socialService } from '../services/socialService';
import { auth } from '../lib/firebase';

interface CommentsProps {
  postcardId: string;
  creatorId: string;
  onClose: () => void;
}

export const Comments = ({ postcardId, creatorId, onClose }: CommentsProps) => {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const data = await socialService.getComments(postcardId);
        setComments(data);
      } catch (err) {
        console.error('Failed to fetch comments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, [postcardId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !auth.currentUser) return;

    setSubmitting(true);
    try {
      const comment = await socialService.addComment(postcardId, creatorId, newComment.trim());
      if (comment) {
        setComments([...comments, comment]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-0 z-50 bg-white flex flex-col"
    >
      <div className="px-6 py-4 border-b border-charcoal/5 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest">Comments</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="p-1 rounded-full">
          <X size={20} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-sage" size={24} />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 text-charcoal/40 italic editorial-text">
            No comments yet. Be the first to share your thoughts.
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-4">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-canvas flex-shrink-0">
                {comment.userPhotoURL ? (
                  <img src={comment.userPhotoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-charcoal/20">
                    <User size={16} />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold">{comment.userDisplayName}</span>
                  <span className="text-[10px] text-charcoal/30 uppercase tracking-tighter">
                    {new Date(comment.createdAt?.toDate?.() || comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-charcoal/80 leading-relaxed">{comment.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-charcoal/5 bg-canvas">
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={auth.currentUser ? "Add a comment..." : "Login to comment"}
            disabled={!auth.currentUser || submitting}
            className="flex-1 bg-white border border-charcoal/5 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-sage/20 transition-all"
          />
          <Button 
            type="submit" 
            variant="primary" 
            size="sm" 
            disabled={!auth.currentUser || !newComment.trim() || submitting}
            className="rounded-full w-10 h-10 p-0 flex items-center justify-center"
          >
            {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          </Button>
        </div>
      </form>
    </motion.div>
  );
};
