import { 
  collection, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc, 
  increment,
  orderBy,
  limit,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';

export interface Like {
  id?: string;
  postcardId: string;
  userId: string;
  createdAt: any;
}

export interface Comment {
  id?: string;
  postcardId: string;
  userId: string;
  text: string;
  userDisplayName: string;
  userPhotoURL: string;
  createdAt: any;
}

export interface Notification {
  id?: string;
  userId: string;
  type: 'like' | 'comment' | 'follow';
  fromUserId: string;
  fromUserName: string;
  postcardId?: string;
  text?: string;
  read: boolean;
  createdAt: any;
}

// Helper to get a persistent guest ID for unauthenticated visitors
const getGuestId = () => {
  let id = localStorage.getItem('folio_guest_id');
  if (!id) {
    id = 'guest_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('folio_guest_id', id);
  }
  return id;
};

export const socialService = {
  // Likes
  async toggleLike(postcardId: string, creatorId: string) {
    const userId = auth.currentUser?.uid || getGuestId();
    
    const q = query(
      collection(db, 'likes'),
      where('postcardId', '==', postcardId),
      where('userId', '==', userId)
    );
    
    try {
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        // Unlike
        const likeId = snapshot.docs[0].id;
        try {
          await deleteDoc(doc(db, 'likes', likeId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `likes/${likeId}`);
        }
        return false;
      } else {
        // Like
        try {
          await addDoc(collection(db, 'likes'), {
            postcardId,
            userId,
            createdAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'likes');
        }
        
        // Notify creator (only if liked by a registered user)
        if (auth.currentUser && userId !== creatorId) {
          try {
            await this.sendNotification({
              userId: creatorId,
              type: 'like',
              fromUserId: userId,
              fromUserName: auth.currentUser.displayName || 'Someone',
              postcardId,
              read: false,
              createdAt: serverTimestamp()
            });
          } catch (err) {
            console.warn('Failed to send like notification:', err);
          }
        }
        return true;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'likes');
      return false;
    }
  },

  async getLikeCount(postcardId: string) {
    const q = query(collection(db, 'likes'), where('postcardId', '==', postcardId));
    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  async hasLiked(postcardId: string) {
    const userId = auth.currentUser?.uid || getGuestId();
    const q = query(
      collection(db, 'likes'),
      where('postcardId', '==', postcardId),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  },

  // Comments
  async addComment(postcardId: string, creatorId: string, text: string) {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    
    const commentData = {
      postcardId,
      userId,
      text,
      userDisplayName: auth.currentUser.displayName || 'Anonymous',
      userPhotoURL: auth.currentUser.photoURL || '',
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'comments'), commentData);
    
    // Notify creator
    if (userId !== creatorId) {
      await this.sendNotification({
        userId: creatorId,
        type: 'comment',
        fromUserId: userId,
        fromUserName: auth.currentUser.displayName || 'Someone',
        postcardId,
        text: text.substring(0, 50),
        read: false,
        createdAt: serverTimestamp()
      });
    }
    
    return { id: docRef.id, ...commentData };
  },

  async getComments(postcardId: string) {
    const q = query(
      collection(db, 'comments'),
      where('postcardId', '==', postcardId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => {
      const dateA = a.createdAt?.toDate?.()?.getTime() || new Date(a.createdAt).getTime() || 0;
      const dateB = b.createdAt?.toDate?.()?.getTime() || new Date(b.createdAt).getTime() || 0;
      return dateA - dateB;
    });
  },

  // Follows
  async toggleFollow(followingId: string, followingUsername?: string) {
    if (!auth.currentUser) return;
    const followerId = auth.currentUser.uid;
    if (followerId === followingId) return;

    const followDocId = `${followerId}_${followingId}`;
    const followRef = doc(db, 'follows', followDocId);
    const followSnap = await getDoc(followRef);
    const isFollowing = followSnap.exists();

    const batch = writeBatch(db);
    
    // Fetch usernames and check if public profiles exist
    // We use try-catch because we might not have permission to read the other user's doc
    let followerUsername = null;
    let targetUsername = followingUsername || null;

    try {
      const [followerSnap, followingSnap] = await Promise.all([
        getDoc(doc(db, 'users', followerId)),
        getDoc(doc(db, 'users', followingId)).catch(() => null) // Handle permission error
      ]);

      if (followerSnap.exists()) {
        followerUsername = followerSnap.data().username;
      }
      if (followingSnap?.exists()) {
        targetUsername = followingSnap.data().username;
      }
    } catch (err) {
      console.warn('Limited profile access during follow toggle');
    }

    // Fallback for target username if not provided and couldn't read user doc
    if (!targetUsername) {
      const q = query(collection(db, 'public_profiles'), where('uid', '==', followingId), limit(1));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        targetUsername = qSnap.docs[0].id;
      }
    }

    const [followerPublicSnap, followingPublicSnap] = await Promise.all([
      followerUsername ? getDoc(doc(db, 'public_profiles', followerUsername)) : Promise.resolve(null),
      targetUsername ? getDoc(doc(db, 'public_profiles', targetUsername)) : Promise.resolve(null)
    ]);

    if (isFollowing) {
      // Unfollow
      batch.delete(followRef);
      
      // Update counts in users collection
      batch.set(doc(db, 'users', followerId), { following_count: increment(-1) }, { merge: true });
      batch.set(doc(db, 'users', followingId), { follower_count: increment(-1) }, { merge: true });
      
      // Update counts in public_profiles if they exist
      if (followerUsername && followerPublicSnap?.exists()) {
        batch.set(doc(db, 'public_profiles', followerUsername), { following_count: increment(-1) }, { merge: true });
      }
      if (targetUsername && followingPublicSnap?.exists()) {
        batch.set(doc(db, 'public_profiles', targetUsername), { follower_count: increment(-1) }, { merge: true });
      }
      
      try {
        await batch.commit();
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, `follows/${followDocId}`);
      }
      return false;
    } else {
      // Follow
      batch.set(followRef, {
        followerId,
        followingId,
        createdAt: serverTimestamp()
      });
      
      // Update counts in users collection
      batch.set(doc(db, 'users', followerId), { following_count: increment(1) }, { merge: true });
      batch.set(doc(db, 'users', followingId), { follower_count: increment(1) }, { merge: true });

      // Update counts in public_profiles if they exist
      if (followerUsername && followerPublicSnap?.exists()) {
        batch.set(doc(db, 'public_profiles', followerUsername), { following_count: increment(1) }, { merge: true });
      }
      if (targetUsername && followingPublicSnap?.exists()) {
        batch.set(doc(db, 'public_profiles', targetUsername), { follower_count: increment(1) }, { merge: true });
      }
      
      try {
        await batch.commit();
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, `follows/${followDocId}`);
      }

      // Notify
      if (followerId !== followingId) {
        await this.sendNotification({
          userId: followingId,
          type: 'follow',
          fromUserId: followerId,
          fromUserName: auth.currentUser.displayName || 'Someone',
          read: false,
          createdAt: serverTimestamp()
        });
      }
      
      return true;
    }
  },

  async isFollowing(followingId: string) {
    if (!auth.currentUser) return false;
    const q = query(
      collection(db, 'follows'),
      where('followerId', '==', auth.currentUser.uid),
      where('followingId', '==', followingId)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  },

  async getFollowedUserIds() {
    if (!auth.currentUser) return [];
    const q = query(
      collection(db, 'follows'),
      where('followerId', '==', auth.currentUser.uid)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data().followingId);
  },

  // Notifications
  async sendNotification(notification: Omit<Notification, 'id'>) {
    await addDoc(collection(db, 'notifications'), notification);
  },

  async getNotifications() {
    if (!auth.currentUser) return [];
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', auth.currentUser.uid),
      limit(50)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => {
      const dateA = a.createdAt?.toDate?.()?.getTime() || new Date(a.createdAt).getTime() || 0;
      const dateB = b.createdAt?.toDate?.()?.getTime() || new Date(b.createdAt).getTime() || 0;
      return dateB - dateA;
    });
  },

  async markNotificationAsRead(notificationId: string) {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  },

  subscribeToNotifications(callback: (notifications: Notification[]) => void) {
    if (!auth.currentUser) return () => {};
    
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', auth.currentUser.uid),
      limit(50)
    );
    
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Notification[];
      
      notifications.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate?.()?.getTime() || new Date(a.createdAt).getTime() || 0;
        const dateB = b.createdAt?.toDate?.()?.getTime() || new Date(b.createdAt).getTime() || 0;
        return dateB - dateA;
      });
      
      callback(notifications);
    });
  }
};
