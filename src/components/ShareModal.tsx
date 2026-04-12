import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Globe, 
  Lock, 
  UserPlus, 
  Mail, 
  Copy, 
  Check, 
  Trash2, 
  ShieldCheck, 
  Loader2,
  ExternalLink,
  Users
} from 'lucide-react';
import { Button } from './ui/Button';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Timestamp,
  doc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc,
  serverTimestamp,
  getDocs,
  getDoc,
  setDoc,
  writeBatch,
  deleteField,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { cn } from '../lib/utils';

interface ShareModalProps {
  collection: any;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ collection: collectionData, onClose }) => {
  const [activeTab, setActiveTab] = useState<'public' | 'private' | 'curators'>('public');
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shares, setShares] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteType, setInviteType] = useState<'guest' | 'curator'>('guest');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor'>('viewer');
  const [expiration, setExpiration] = useState<'24h' | '7d' | '30d' | 'never'>('7d');

  const publicUrl = `${window.location.origin}/s/${collectionData.id}`;

  useEffect(() => {
    const q = query(
      collection(db, 'shares'),
      where('collectionId', '==', collectionData.id)
    );

    const unsubShares = onSnapshot(q, (snapshot) => {
      setShares(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubShares();
    };
  }, [collectionData.id]);

  const togglePublic = async () => {
    // Check if profile is public first
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
    const userData = userDoc.data();
    
    if (collectionData.visibility !== 'public' && userData?.profilePrivacy !== 'public') {
      alert('You must set your profile to "Public" in settings before enabling a public link.');
      return;
    }

    setLoading(true);
    try {
      const newVisibility = collectionData.visibility === 'public' ? 'private' : 'public';
      const batch = writeBatch(db);
      
      // Generate folioToken if missing
      const folioToken = collectionData.folioToken || Math.random().toString(36).substring(2, 15);

      // 1. Update Collection
      batch.update(doc(db, 'collections', collectionData.id), {
        visibility: newVisibility,
        folioToken: folioToken
      });
      
      // 2. Update Postcards
      const postcardsQuery = query(collection(db, 'postcards'), where('collectionId', '==', collectionData.id));
      const postcardsSnap = await getDocs(postcardsQuery);
      
      postcardsSnap.docs.forEach(p => {
        batch.update(p.ref, {
          collectionVisibility: newVisibility,
          folioToken: folioToken
        });
      });

      await batch.commit();
    } catch (err: any) {
      console.error('Error toggling visibility:', err);
      handleFirestoreError(err, OperationType.UPDATE, `collections/${collectionData.id}`);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const createShare = async () => {
    if (!inviteEmail.trim()) return;
    setLoading(true);
    try {
      if (inviteType === 'curator') {
        // Find user by email
        const userQuery = query(collection(db, 'users'), where('email', '==', inviteEmail.trim()));
        const userSnap = await getDocs(userQuery);
        
        if (userSnap.empty) {
          alert('User not found. Curators must have a Folio account.');
          return;
        }

        const targetUid = userSnap.docs[0].id;
        try {
          await updateDoc(doc(db, 'collections', collectionData.id), {
            [`curators.${targetUid}`]: inviteRole,
            curatorIds: arrayUnion(targetUid)
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `collections/${collectionData.id}`);
        }
      } else {
        // Ensure collection has a folioToken for guest access
        let currentFolioToken = collectionData.folioToken;
        if (!currentFolioToken) {
          currentFolioToken = Math.random().toString(36).substring(2, 15);
          const batch = writeBatch(db);
          batch.update(doc(db, 'collections', collectionData.id), {
            folioToken: currentFolioToken
          });
          
          const postcardsQuery = query(collection(db, 'postcards'), where('collectionId', '==', collectionData.id));
          const postcardsSnap = await getDocs(postcardsQuery);
          postcardsSnap.docs.forEach(p => {
            batch.update(p.ref, { folioToken: currentFolioToken });
          });
          
          try {
            await batch.commit();
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, 'batch_update_folio_token');
          }
        }

        // Create Guest Share with Token and Expiration
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        let expiresAt: Date | null = null;
        if (expiration !== 'never') {
          expiresAt = new Date();
          if (expiration === '24h') expiresAt.setHours(expiresAt.getHours() + 24);
          if (expiration === '7d') expiresAt.setDate(expiresAt.getDate() + 7);
          if (expiration === '30d') expiresAt.setDate(expiresAt.getDate() + 30);
        }

        if (!collectionData?.id) {
          throw new Error('Collection ID is missing.');
        }

        const shareId = Math.random().toString(36).substring(2, 15);
        try {
          await setDoc(doc(db, 'shares', shareId), {
            id: shareId,
            userId: auth.currentUser!.uid,
            collectionId: collectionData.id,
            collectionTitle: collectionData.title,
            collectionDescription: collectionData.description || '',
            collectionCoverImage: collectionData.coverImage || '',
            folioToken: currentFolioToken || '',
            type: 'guest',
            email: inviteEmail.trim().toLowerCase(),
            token,
            expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
            status: 'active',
            createdAt: serverTimestamp(),
            accessedBy: []
          });

          // Send invite email
          const shareUrl = `${window.location.origin}/v/${collectionData.id}/${shareId}?token=${token}`;
          fetch('/api/shares/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shareId,
              email: inviteEmail.trim().toLowerCase(),
              collectionTitle: collectionData.title,
              creatorName: auth.currentUser?.displayName || 'A Folio user',
              shareUrl
            })
          }).catch(err => console.error('Failed to send invite email:', err));

        } catch (e) {
          handleFirestoreError(e, OperationType.CREATE, `shares/${shareId}`);
        }
      }
      setInviteEmail('');
    } catch (err: any) {
      console.error('Error creating share:', err);
      // Error already handled by handleFirestoreError if it was a Firestore error
    } finally {
      setLoading(false);
    }
  };

  const revokeShare = async (shareId: string) => {
    try {
      await deleteDoc(doc(db, 'shares', shareId));
    } catch (err) {
      console.error('Error revoking share:', err);
    }
  };

  const removeCurator = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'collections', collectionData.id), {
        [`curators.${uid}`]: deleteField(),
        curatorIds: arrayRemove(uid)
      });
    } catch (err: any) {
      console.error('Error removing curator:', err);
      handleFirestoreError(err, OperationType.UPDATE, `collections/${collectionData.id}`);
    }
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
            <h2 className="text-3xl font-serif">Share Collection</h2>
            <button onClick={onClose} className="p-2 hover:bg-canvas rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="flex gap-1 p-1 bg-canvas rounded-xl overflow-x-auto no-scrollbar">
            {(['public', 'private', 'curators'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-2 px-3 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap",
                  activeTab === tab ? "bg-white text-sage shadow-sm" : "text-charcoal/40 hover:text-charcoal"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'public' && (
              <motion.div
                key="public"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between p-4 bg-canvas rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      collectionData.visibility === 'public' ? "bg-sage/10 text-sage" : "bg-charcoal/5 text-charcoal/40"
                    )}>
                      <Globe size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-sm">Public Link</div>
                      <div className="text-[10px] text-charcoal/40 uppercase tracking-widest font-bold">
                        {collectionData.visibility === 'public' ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={togglePublic}
                    disabled={loading}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      collectionData.visibility === 'public' ? "bg-sage" : "bg-charcoal/20"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      collectionData.visibility === 'public' ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                {collectionData.visibility === 'public' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-sage/5 border border-sage/10 rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex-1 truncate text-sm text-sage font-mono">
                        {publicUrl}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => copyLink(publicUrl, 'public-link')}>
                        {copied === 'public-link' ? <Check size={16} className="text-sage" /> : <Copy size={16} />}
                      </Button>
                    </div>
                    <p className="text-xs text-charcoal/40 italic text-center">
                      Warning: Anyone with this link can view this collection.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 bg-canvas rounded-full flex items-center justify-center mx-auto text-charcoal/20">
                      <Lock size={32} />
                    </div>
                    <p className="text-sm text-charcoal/60 max-w-xs mx-auto">
                      Enable public sharing to generate a frictionless link for anyone to view.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'private' && (
              <motion.div
                key="private"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="space-y-4">
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
                        onClick={() => {
                          setInviteType('guest');
                          createShare();
                        }}
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
                  <p className="text-[10px] text-charcoal/40 uppercase tracking-widest font-bold text-center">
                    Generates a private, OTP-protected link
                  </p>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Guest List</h3>
                  {shares.filter(s => s.type === 'guest').length === 0 ? (
                    <div className="text-center py-8 text-charcoal/20 italic text-sm">
                      No guests invited yet.
                    </div>
                  ) : (
                    shares.filter(s => s.type === 'guest').map((share) => (
                      <div key={share.id} className="flex items-center justify-between p-3 bg-canvas rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg text-sage shadow-sm">
                            <ShieldCheck size={16} />
                          </div>
                          <div>
                            <div className="text-sm font-bold">{share.email}</div>
                            <div className="text-[9px] text-charcoal/40 uppercase tracking-widest font-bold">
                              {share.expiresAt ? `Expires: ${
                                (share.expiresAt.toDate ? share.expiresAt.toDate() : new Date(share.expiresAt)).toLocaleDateString()
                              }` : 'Never expires'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => copyLink(`${window.location.origin}/v/${share.collectionId}/${share.id}?token=${share.token}`, share.id)}>
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
              </motion.div>
            )}

            {activeTab === 'curators' && (
              <motion.div
                key="curators"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/30" size={18} />
                        <input 
                          type="email"
                          placeholder="curator@folio.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-canvas rounded-xl border-none focus:ring-2 focus:ring-sage/20 outline-none transition-all"
                        />
                      </div>
                      <Button 
                        variant="primary" 
                        onClick={() => {
                          setInviteType('curator');
                          createShare();
                        }}
                        disabled={loading || !inviteEmail}
                      >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : 'Add'}
                      </Button>
                    </div>
                    
                    <div className="flex gap-2 p-1 bg-canvas rounded-lg">
                      {(['viewer', 'editor'] as const).map((role) => (
                        <button
                          key={role}
                          onClick={() => setInviteRole(role)}
                          className={cn(
                            "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all",
                            inviteRole === role ? "bg-white text-sage shadow-sm" : "text-charcoal/40 hover:text-charcoal"
                          )}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-charcoal/40 uppercase tracking-widest font-bold text-center">
                    {inviteRole === 'editor' 
                      ? 'Can add/delete their own photos' 
                      : 'View only access to this collection'}
                  </p>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Active Curators</h3>
                  <div className="space-y-2">
                    {/* Owner */}
                    <div className="flex items-center justify-between p-3 bg-sage/5 border border-sage/10 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-sage text-white rounded-full flex items-center justify-center font-bold text-xs">
                          O
                        </div>
                        <div>
                          <div className="text-sm font-bold">Owner</div>
                          <div className="text-[10px] text-sage uppercase tracking-widest font-bold">Full Access</div>
                        </div>
                      </div>
                    </div>

                    {/* Other Curators */}
                    {Object.entries(collectionData.curators || {}).map(([uid, role]: [string, any]) => (
                      <CuratorItem key={uid} uid={uid} role={role} onRemove={() => removeCurator(uid)} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

interface CuratorItemProps {
  uid: string;
  role: string;
  onRemove: () => void;
}

const CuratorItem: React.FC<CuratorItemProps> = ({ uid, role, onRemove }) => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    getDoc(doc(db, 'users', uid)).then(snap => {
      if (snap.exists()) setUser(snap.data());
    });
  }, [uid]);

  if (!user) return null;

  return (
    <div className="flex items-center justify-between p-3 bg-canvas rounded-xl">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-white">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-charcoal/20">
              <Users size={16} />
            </div>
          )}
        </div>
        <div>
          <div className="text-sm font-bold">{user.displayName || 'Folio User'}</div>
          <div className="text-[10px] text-charcoal/40 uppercase tracking-widest font-bold">{role}</div>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={onRemove}>
        <Trash2 size={16} />
      </Button>
    </div>
  );
};
