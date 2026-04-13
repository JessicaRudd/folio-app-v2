import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Copy, Check, Loader2, Users, Mail, ShieldCheck, Trash2, Lock, Globe } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Timestamp,
  doc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp, 
  getDocs, 
  setDoc, 
  writeBatch,
  addDoc,
  deleteDoc
} from 'firebase/firestore';

interface FolioShareModalProps {
  user: any;
  onClose: () => void;
}

export const FolioShareModal: React.FC<FolioShareModalProps> = ({ user, onClose }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [folioMetadata, setFolioMetadata] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [shares, setShares] = useState<any[]>([]);
  const [expiration, setExpiration] = useState<'24h' | '7d' | '30d' | 'never'>('7d');

  const folioUrl = folioMetadata ? `${window.location.origin}/f/${user.username}?token=${folioMetadata.shareToken}` : '';
  const isProfilePublic = user.profilePrivacy === 'public';

  useEffect(() => {
    if (!user.uid) return;

    const unsubMetadata = onSnapshot(doc(db, 'folio_metadata', user.uid), (snap) => {
      if (snap.exists()) {
        setFolioMetadata(snap.data());
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `folio_metadata/${user.uid}`);
    });

    const q = query(
      collection(db, 'shares'),
      where('userId', '==', user.uid),
      where('type', '==', 'folio')
    );

    const unsubShares = onSnapshot(q, (snapshot) => {
      setShares(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'shares');
    });

    return () => {
      unsubMetadata();
      unsubShares();
    };
  }, [user.uid]);

  const generateFolioToken = async () => {
    if (!isProfilePublic) return;
    setLoading(true);
    try {
      // Delete old token if exists
      if (folioMetadata?.shareToken) {
        try {
          await deleteDoc(doc(db, 'folio_tokens', folioMetadata.shareToken));
        } catch (e) {
          console.warn('Could not delete old folio token:', e);
        }
      }

      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // 1. Update/Create Folio Metadata
      const metaRef = doc(db, 'folio_metadata', user.uid);
      try {
        await setDoc(metaRef, {
          userId: user.uid,
          shareToken: token,
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `folio_metadata/${user.uid}`);
      }

      // 1b. Create Folio Token for secure lookup
      const tokenRef = doc(db, 'folio_tokens', token);
      try {
        await setDoc(tokenRef, {
          userId: user.uid,
          displayName: user.displayName || '',
          username: user.username || '',
          createdAt: serverTimestamp()
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `folio_tokens/${token}`);
      }

      // 2. Propagate token to all user's collections
      const collectionsQuery = query(collection(db, 'collections'), where('creatorId', '==', user.uid));
      const collectionsSnap = await getDocs(collectionsQuery);
      
      const batch = writeBatch(db);
      
      collectionsSnap.docs.forEach(f => {
        batch.update(f.ref, { folioToken: token });
      });

      // 3. Propagate token to all user's postcards
      const postcardsQuery = query(collection(db, 'postcards'), where('creatorId', '==', user.uid));
      const postcardsSnap = await getDocs(postcardsQuery);
      
      postcardsSnap.docs.forEach(p => {
        batch.update(p.ref, { folioToken: token });
      });

      try {
        await batch.commit();
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, 'batch_update_folio_token');
      }
      
      setFolioMetadata({ userId: user.uid, shareToken: token });
    } catch (err) {
      console.error('Error generating folio token:', err);
      // Error already handled
    } finally {
      setLoading(false);
    }
  };

  const createShare = async () => {
    if (!inviteEmail.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      alert('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      let token = folioMetadata?.shareToken;
      if (!token) {
        token = await generateFolioToken();
      }
      
      const shareToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      let expiresAt: Date | null = null;
      if (expiration !== 'never') {
        expiresAt = new Date();
        if (expiration === '24h') expiresAt.setHours(expiresAt.getHours() + 24);
        if (expiration === '7d') expiresAt.setDate(expiresAt.getDate() + 7);
        if (expiration === '30d') expiresAt.setDate(expiresAt.getDate() + 30);
      }

      if (!user?.uid) {
        throw new Error('User ID is missing. Please try logging in again.');
      }

      const shareId = Math.random().toString(36).substring(2, 15);
      const shareUrl = `${window.location.origin}/f/${user.username}/invite/${shareId}?token=${shareToken}`;

      try {
        await setDoc(doc(db, 'shares', shareId), {
          id: shareId,
          userId: user.uid,
          username: user.username || '',
          collectionTitle: 'Folio',
          folioToken: token || '',
          type: 'folio',
          email: inviteEmail.trim().toLowerCase(),
          token: shareToken,
          expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
          status: 'active',
          createdAt: serverTimestamp(),
          accessedBy: []
        });

        // Send invite email
        fetch('/api/shares/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shareId,
            email: inviteEmail.trim().toLowerCase(),
            collectionTitle: 'Folio',
            creatorName: user.displayName || 'A Folio user',
            shareUrl
          })
        }).catch(err => console.error('Failed to send folio invite email:', err));

      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `shares/${shareId}`);
      }
      setInviteEmail('');
    } catch (err) {
      console.error('Error creating folio share:', err);
      // Error already handled
    } finally {
      setLoading(false);
    }
  };

  const revokeShare = async (shareId: string) => {
    try {
      await deleteDoc(doc(db, 'shares', shareId));
    } catch (err) {
      console.error('Error revoking share:', err);
      handleFirestoreError(err, OperationType.DELETE, `shares/${shareId}`);
    }
  };

  const copyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-serif">Share Collections</h2>
            <button onClick={onClose} className="p-2 hover:bg-canvas rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-sage/10 text-sage rounded-full flex items-center justify-center mx-auto">
                <Users size={24} />
              </div>
              <h3 className="font-serif text-xl">Private Collections Invite</h3>
              <p className="text-xs text-charcoal/60 italic">
                Invite specific guests to view your entire collection set via email verification.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/30" size={18} />
                  <input 
                    type="email"
                    placeholder="guest@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-canvas rounded-xl border-none focus:ring-2 focus:ring-sage/20 outline-none transition-all"
                  />
                </div>
                <Button 
                  variant="primary" 
                  onClick={createShare}
                  disabled={loading || !inviteEmail}
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : 'Invite'}
                </Button>
              </div>

              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40">Expires in:</span>
                <div className="flex gap-2 p-1 bg-canvas rounded-lg">
                  {(['24h', '7d', '30d', 'never'] as const).map((exp) => (
                    <button
                      key={exp}
                      onClick={() => setExpiration(exp)}
                      className={cn(
                        "px-2 py-1 text-[9px] font-bold uppercase tracking-widest rounded-md transition-all",
                        expiration === exp ? "bg-white text-sage shadow-sm" : "text-charcoal/40 hover:text-charcoal"
                      )}
                    >
                      {exp}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40">Collections Guest List</h4>
              {shares.length === 0 ? (
                <div className="text-center py-4 text-charcoal/20 italic text-xs">
                  No guests invited yet.
                </div>
              ) : (
                shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between p-3 bg-canvas rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg text-sage shadow-sm">
                        <ShieldCheck size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{share.email}</div>
                        <div className="text-[9px] text-charcoal/40 uppercase tracking-widest font-bold">
                          {share.expiresAt ? `Expires: ${
                            (share.expiresAt.toDate ? share.expiresAt.toDate() : new Date(share.expiresAt)).toLocaleDateString()
                          }` : 'Never expires'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => copyLink(`${window.location.origin}/f/${user.username}/invite/${share.id}?token=${share.token}`, share.id)}>
                        {copied === share.id ? <Check size={16} className="text-sage" /> : <Copy size={16} />}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => revokeShare(share.id)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-charcoal/5 space-y-4">
            <div className="text-center space-y-1">
              <h3 className="font-serif text-lg">Public Collections Link</h3>
              <p className="text-[10px] text-charcoal/40 uppercase tracking-widest font-bold">
                Frictionless access for anyone with the link
              </p>
            </div>

            {!isProfilePublic ? (
              <div className="p-6 bg-canvas rounded-2xl text-center space-y-4">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <Lock className="text-charcoal/20" size={20} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold">Profile is Private</p>
                  <p className="text-xs text-charcoal/60 italic">
                    Public collection links require a public profile. Change this in your profile settings.
                  </p>
                </div>
              </div>
            ) : folioMetadata ? (
              <div className="space-y-4">
                <div className="p-4 bg-sage/5 border border-sage/10 rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex-1 truncate text-sm text-sage font-mono">
                    {folioUrl}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyLink(folioUrl, 'public-folio')}>
                    {copied === 'public-folio' ? <Check size={16} className="text-sage" /> : <Copy size={16} />}
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-red-500 hover:bg-red-50"
                  onClick={generateFolioToken}
                  disabled={loading}
                >
                  Reset Public Link
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={generateFolioToken}
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    <Globe size={18} />
                    Generate Public Collections Link
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
