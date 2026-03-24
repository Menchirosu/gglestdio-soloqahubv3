import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocs, setDoc, onSnapshot, collection, query, where, updateDoc, serverTimestamp, Timestamp, arrayUnion, deleteDoc, orderBy, collectionGroup, getDocFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Connection Test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
    // Skip logging for other errors, as this is simply a connection test.
  }
}
testConnection();

export const uploadImage = async (file: File, path: string): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dq5kvfglj';
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'soloqahub';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', path);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to upload image to Cloudinary');
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    throw error;
  }
};

// Auth Helpers
export const signInWithGoogle = () => {
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, googleProvider);
};
export const logout = () => signOut(auth);

// Types
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  status: 'pending' | 'approved' | 'rejected';
  role: 'user' | 'admin';
  createdAt: Timestamp;
}

// Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null;
    emailVerified: boolean;
    isAnonymous: boolean;
    tenantId: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Firestore Helpers
export const getUserProfile = async (uid: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? (userDoc.data() as UserProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
};

export const createUserProfile = async (user: FirebaseUser) => {
  const userRef = doc(db, 'users', user.uid);
  const userProfile: UserProfile = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    status: 'pending',
    role: 'user',
    createdAt: serverTimestamp() as Timestamp,
  };
  try {
    await setDoc(userRef, userProfile);
    return userProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
};

export const approveUser = async (uid: string) => {
  try {
    await updateDoc(doc(db, 'users', uid), { status: 'approved' });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
};

export const rejectUser = async (uid: string) => {
  try {
    await updateDoc(doc(db, 'users', uid), { status: 'rejected' });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
};

export const updateDisplayName = async (uid: string, displayName: string) => {
  try {
    await updateDoc(doc(db, 'users', uid), { displayName });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
};

export const updatePhotoURL = async (uid: string, photoURL: string) => {
  try {
    await updateDoc(doc(db, 'users', uid), { photoURL });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
};

// Bug Stories
export const createBugStory = async (bug: any) => {
  const bugRef = doc(collection(db, 'bugs'));
  try {
    await setDoc(bugRef, {
      ...bug,
      id: bugRef.id,
      createdAt: serverTimestamp(),
    });
    return bugRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'bugs');
  }
};

export const updateBugReactions = async (bugId: string, reactions: any) => {
  try {
    await updateDoc(doc(db, 'bugs', bugId), { reactions });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `bugs/${bugId}`);
  }
};

export const updateBugStory = async (bugId: string, bug: any) => {
  try {
    await updateDoc(doc(db, 'bugs', bugId), {
      ...bug,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `bugs/${bugId}`);
  }
};

// Comments
export const addComment = async (bugId: string, comment: any) => {
  try {
    const commentRef = doc(collection(db, 'bugs', bugId, 'comments'));
    const newComment = {
      ...comment,
      id: commentRef.id,
      bugId, // Store bugId for collection group queries if needed
      createdAt: new Date().toISOString(),
    };
    await setDoc(commentRef, newComment);
    return newComment.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `bugs/${bugId}/comments`);
  }
};

export const getComments = (bugId: string, callback: (comments: any[]) => void) => {
  const commentsQuery = query(collection(db, 'bugs', bugId, 'comments'));
  return onSnapshot(commentsQuery, (snapshot) => {
    const comments = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).sort((a: any, b: any) => 
      new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime()
    );
    callback(comments);
  }, (error) => handleFirestoreError(error, OperationType.GET, `bugs/${bugId}/comments`));
};

export const deleteCommentDoc = async (bugId: string, commentId: string) => {
  try {
    await deleteDoc(doc(db, 'bugs', bugId, 'comments', commentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `bugs/${bugId}/comments/${commentId}`);
  }
};

export const updateCommentDoc = async (bugId: string, commentId: string, text: string) => {
  try {
    await updateDoc(doc(db, 'bugs', bugId, 'comments', commentId), { text });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bugs/${bugId}/comments/${commentId}`);
  }
};

export const reactToComment = async (bugId: string, commentId: string, likes: string[]) => {
  try {
    await updateDoc(doc(db, 'bugs', bugId, 'comments', commentId), { likes });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bugs/${bugId}/comments/${commentId}`);
  }
};

export const addReply = async (bugId: string, commentId: string, reply: any) => {
  try {
    const replyRef = doc(collection(db, 'bugs', bugId, 'comments', commentId, 'replies'));
    const newReply = {
      ...reply,
      id: replyRef.id,
      bugId,
      commentId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(replyRef, newReply);
    return newReply.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `bugs/${bugId}/comments/${commentId}/replies`);
  }
};

export const getReplies = (bugId: string, commentId: string, callback: (replies: any[]) => void) => {
  const repliesQuery = query(collection(db, 'bugs', bugId, 'comments', commentId, 'replies'));
  return onSnapshot(repliesQuery, (snapshot) => {
    const replies = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).sort((a: any, b: any) => 
      new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime()
    );
    callback(replies);
  }, (error) => handleFirestoreError(error, OperationType.GET, `bugs/${bugId}/comments/${commentId}/replies`));
};

// Notifications
export const createNotification = async (notification: any) => {
  const notifRef = doc(collection(db, 'notifications'));
  try {
    await setDoc(notifRef, {
      ...notification,
      id: notifRef.id,
      createdAt: serverTimestamp(),
    });
    return notifRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'notifications');
  }
};

export const markNotificationRead = async (notifId: string) => {
  try {
    await updateDoc(doc(db, 'notifications', notifId), { isRead: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `notifications/${notifId}`);
  }
};

export const markAllNotificationsRead = async (uid: string) => {
  // This is a bit inefficient without a batch, but for small scale it's okay.
  // In a real app, we'd use a batch or a cloud function.
};

// Knowledge Sharing - Presenter Picker
export const updateCurrentPresenter = async (presenter: { name: string, photoURL?: string, uid?: string }) => {
  try {
    await setDoc(doc(db, 'knowledgeSharing', 'currentPresenter'), {
      ...presenter,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'knowledgeSharing/currentPresenter');
  }
};

export const getCurrentPresenter = (callback: (presenter: any) => void) => {
  return onSnapshot(doc(db, 'knowledgeSharing', 'currentPresenter'), (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    } else {
      callback(null);
    }
  }, (error) => handleFirestoreError(error, OperationType.GET, 'knowledgeSharing/currentPresenter'));
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const q = query(collection(db, 'users'), where('status', '==', 'approved'));
    const usersSnapshot = await getDocs(q);
    return usersSnapshot.docs.map(doc => doc.data() as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return [];
  }
};
