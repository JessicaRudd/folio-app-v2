import React, { useState, useEffect } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { socialService, Notification } from '../services/socialService';
import { Button } from './ui/Button';
import { useNavigate } from 'react-router-dom';

import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';

export const Notifications = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let unsubscribeNotifications: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeNotifications) {
        unsubscribeNotifications();
        unsubscribeNotifications = undefined;
      }

      if (user) {
        unsubscribeNotifications = socialService.subscribeToNotifications((data) => {
          setNotifications(data);
          setUnreadCount(data.filter(n => !n.read).length);
        });
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeNotifications) unsubscribeNotifications();
    };
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await socialService.markNotificationAsRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart size={14} className="text-red-500 fill-red-500" />;
      case 'comment': return <MessageCircle size={14} className="text-sage" />;
      case 'follow': return <UserPlus size={14} className="text-blue-500" />;
      default: return <Bell size={14} />;
    }
  };

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 rounded-full"
      >
        <Bell size={20} className={unreadCount > 0 ? "text-sage" : "text-charcoal/60"} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-charcoal/5 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-charcoal/5 flex items-center justify-between bg-canvas/50">
                <h3 className="text-xs font-bold uppercase tracking-widest">Notifications</h3>
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="p-1 rounded-full">
                  <X size={16} />
                </Button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-12 flex items-center justify-center">
                    <Loader2 className="animate-spin text-sage" size={24} />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-12 text-center text-charcoal/40 italic editorial-text">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id}
                      onClick={() => {
                        if (n.id) handleMarkAsRead(n.id);
                        if (n.postcardId) navigate(`/explore?q=${n.postcardId}`);
                        setIsOpen(false);
                      }}
                      className={`p-4 flex gap-3 hover:bg-canvas transition-colors cursor-pointer border-b border-charcoal/5 last:border-0 ${!n.read ? 'bg-sage/5' : ''}`}
                    >
                      <div className="mt-1">{getIcon(n.type)}</div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm leading-snug">
                          <span className="font-bold">{n.fromUserName}</span>
                          {n.type === 'like' && ' liked your postcard.'}
                          {n.type === 'comment' && ` commented: "${n.text}"`}
                          {n.type === 'follow' && ' started following you.'}
                        </p>
                        <p className="text-[10px] text-charcoal/40 uppercase tracking-tighter">
                          {new Date(n.createdAt?.toDate?.() || n.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {!n.read && (
                        <div className="w-2 h-2 bg-sage rounded-full mt-2" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
