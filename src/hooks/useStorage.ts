import React, { useState, useEffect } from 'react';
import { BugStory, Tip, Concern, Proposal, Notification, Comment } from '../types';
import { INITIAL_BUGS, INITIAL_TIPS, INITIAL_CONCERNS } from '../constants';
import { db, auth, createBugStory, updateBugReactions, updateBugStory, addComment, deleteCommentDoc, updateCommentDoc, reactToComment as firebaseReactToComment, replyToComment as firebaseReplyToComment, createNotification, markNotificationRead, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, where, writeBatch, doc, setDoc, serverTimestamp, updateDoc, deleteDoc, collectionGroup } from 'firebase/firestore';

export function useStorage() {
  const [bugs, setBugs] = useState<BugStory[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Real-time listeners
  useEffect(() => {
    if (!auth.currentUser) {
      setBugs(INITIAL_BUGS);
      setTips(INITIAL_TIPS);
      setConcerns(INITIAL_CONCERNS);
      setProposals([]);
      setNotifications([]);
      return;
    }

    const bugsQuery = query(collection(db, 'bugs'), orderBy('createdAt', 'desc'));
    const unsubscribeBugs = onSnapshot(bugsQuery, (snapshot) => {
      const bugsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return { ...data, id: doc.id, comments: data.comments || [] } as BugStory;
      });
      setBugs(prevBugs => {
        return (bugsData.length > 0 ? bugsData : INITIAL_BUGS).map(bug => {
          const existingBug = prevBugs.find(b => b.id === bug.id);
          // We'll merge subcollection comments later in the comments listener
          return { ...bug, comments: existingBug?.comments || bug.comments || [] };
        });
      });
    }, (error) => handleFirestoreError(error, OperationType.GET, 'bugs'));

    // Listen to all comments across all bugs
    const commentsQuery = query(collectionGroup(db, 'comments'));
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      const allComments = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
      
      setBugs(prevBugs => {
        return prevBugs.map(bug => {
          const subComments = allComments.filter(c => c.bugId === bug.id);
          // Merge with legacy comments if any, using ID to avoid duplicates
          const legacyComments = bug.comments?.filter(c => !subComments.find(sc => sc.id === c.id)) || [];
          return { ...bug, comments: [...legacyComments, ...subComments].sort((a, b) => 
            new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime()
          ) };
        });
      });
    }, (error) => {
      // If index is missing, it will show a link in console
      console.error("Collection group query error:", error);
      handleFirestoreError(error, OperationType.GET, 'all-comments');
    });

    const tipsQuery = query(collection(db, 'tips'), orderBy('createdAt', 'desc'));
    const unsubscribeTips = onSnapshot(tipsQuery, (snapshot) => {
      const tipsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Tip));
      setTips(tipsData.length > 0 ? tipsData : INITIAL_TIPS);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'tips'));

    const concernsQuery = query(collection(db, 'concerns'), orderBy('createdAt', 'desc'));
    const unsubscribeConcerns = onSnapshot(concernsQuery, (snapshot) => {
      const concernsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Concern));
      setConcerns(concernsData.length > 0 ? concernsData : INITIAL_CONCERNS);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'concerns'));

    const proposalsQuery = query(collection(db, 'proposals'), orderBy('createdAt', 'desc'));
    const unsubscribeProposals = onSnapshot(proposalsQuery, (snapshot) => {
      const proposalsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Proposal));
      setProposals(proposalsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'proposals'));

    const notifQuery = query(
      collection(db, 'notifications'),
      where('recipientId', 'in', [auth.currentUser.uid, 'all']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeNotifs = onSnapshot(notifQuery, (snapshot) => {
      const notifsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Notification));
      setNotifications(notifsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'notifications'));

    return () => {
      unsubscribeBugs();
      unsubscribeComments();
      unsubscribeTips();
      unsubscribeConcerns();
      unsubscribeProposals();
      unsubscribeNotifs();
    };
  }, [auth.currentUser]);

  const addBug = async (bug: Omit<BugStory, 'id' | 'date' | 'reactions' | 'comments'>) => {
    const bugId = await createBugStory({
      ...bug,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      reactions: {},
      comments: [],
    });

    // Notify everyone
    await createNotification({
      type: 'system',
      title: 'New Bug Story',
      desc: `${bug.author} shared a new story: "${bug.title}"`,
      targetId: bugId,
      targetScreen: 'bug-wall',
      recipientId: 'all',
      isRead: false,
      time: 'Just now'
    });
  };

  const addTip = async (tip: Omit<Tip, 'id' | 'time'>) => {
    const tipRef = doc(collection(db, 'tips'));
    await setDoc(tipRef, {
      ...tip,
      id: tipRef.id,
      authorId: auth.currentUser?.uid || null,
      time: 'Just now',
      createdAt: serverTimestamp(),
    });

    // Notify everyone
    await createNotification({
      type: 'system',
      title: 'New Tip & Trick',
      desc: `${tip.author} shared a new tip: "${tip.title}"`,
      targetId: tipRef.id,
      targetScreen: 'tips-tricks',
      recipientId: 'all',
      isRead: false,
      time: 'Just now'
    });
  };

  const addConcern = async (concern: Omit<Concern, 'id' | 'date' | 'status' | 'helpfulCount'>) => {
    const concernRef = doc(collection(db, 'concerns'));
    await setDoc(concernRef, {
      ...concern,
      id: concernRef.id,
      authorId: auth.currentUser?.uid || null,
      date: 'Just now',
      status: 'Under Review',
      helpfulCount: 0,
      createdAt: serverTimestamp(),
    });

    // Notify everyone
    await createNotification({
      type: 'system',
      title: 'New Concern Raised',
      desc: `A new concern was raised in ${concern.category}`,
      targetId: concernRef.id,
      targetScreen: 'concerns',
      recipientId: 'all',
      isRead: false,
      time: 'Just now'
    });
  };

  const addProposal = async (proposal: Omit<Proposal, 'id' | 'date' | 'author'>) => {
    const proposalRef = doc(collection(db, 'proposals'));
    const author = auth.currentUser?.displayName || 'Anonymous';
    await setDoc(proposalRef, {
      ...proposal,
      id: proposalRef.id,
      authorId: auth.currentUser?.uid || null,
      date: 'Just now',
      author,
      createdAt: serverTimestamp(),
    });

    // Notify everyone
    await createNotification({
      type: 'system',
      title: 'New Knowledge Sharing',
      desc: `${author} proposed a new session: "${proposal.title}"`,
      targetId: proposalRef.id,
      targetScreen: 'knowledge-sharing',
      recipientId: 'all',
      isRead: false,
      time: 'Just now'
    });
  };

  const reactToBug = async (bugId: string, emoji: string, currentUserName?: string) => {
    const bug = bugs.find(b => b.id === bugId);
    if (!bug) return;

    const reactions = { ...bug.reactions };
    reactions[emoji] = (reactions[emoji] || 0) + 1;
    
    await updateBugReactions(bugId, reactions);

    // Trigger notification
    if (currentUserName && bug.authorId && bug.authorId !== auth.currentUser?.uid) {
      await createNotification({
        type: 'like',
        title: 'New Bug Reaction',
        desc: `${currentUserName} reacted ${emoji} to your story: "${bug.title}"`,
        targetId: bug.id,
        targetScreen: 'bug-wall',
        recipientId: bug.authorId,
        isRead: false,
        time: 'Just now'
      });
    }
  };

  const addCommentToBug = async (bugId: string, text: string, author: string, isAnonymous: boolean = false, authorPhotoURL?: string, authorId?: string, imageUrl?: string, gifUrl?: string, imageUrls?: string[]) => {
    const bug = bugs.find(b => b.id === bugId);
    if (!bug) return;

    await addComment(bugId, {
      author,
      authorId: authorId || null,
      authorPhotoURL: authorPhotoURL || null,
      text,
      date: 'Just now',
      isAnonymous,
      imageUrl: imageUrl || null,
      imageUrls: imageUrls || null,
      gifUrl: gifUrl || null
    });

    // Trigger notification
    try {
      if (authorId && bug.authorId && bug.authorId !== authorId && !isAnonymous) {
        await createNotification({
          type: 'comment',
          title: 'New Comment',
          desc: `${author} commented on your story: "${bug.title}"`,
          targetId: bug.id,
          targetScreen: 'bug-wall',
          recipientId: bug.authorId,
          isRead: false,
          time: 'Just now'
        });
      }
    } catch (notifError) {
      console.error("Failed to create notification for comment", notifError);
      // Don't throw here, the comment was successful
    }
  };

  const reactToComment = async (bugId: string, commentId: string, currentUserId: string) => {
    const bug = bugs.find(b => b.id === bugId);
    if (!bug) return;
    const comment = bug.comments?.find(c => c.id === commentId);
    if (!comment) return;

    const likes = comment.likes || [];
    const newLikes = likes.includes(currentUserId) 
      ? likes.filter(id => id !== currentUserId)
      : [...likes, currentUserId];

    await firebaseReactToComment(bugId, commentId, newLikes);

    // Notify comment author if it's a new like
    if (!likes.includes(currentUserId) && comment.authorId && comment.authorId !== currentUserId) {
      await createNotification({
        type: 'like',
        title: 'New Comment Reaction',
        desc: `Someone liked your comment on "${bug.title}"`,
        targetId: bug.id,
        targetScreen: 'bug-wall',
        recipientId: comment.authorId,
        isRead: false,
        time: 'Just now'
      });
    }
  };

  const replyToComment = async (bugId: string, commentId: string, reply: Omit<Comment, 'id' | 'createdAt'>) => {
    const bug = bugs.find(b => b.id === bugId);
    if (!bug) return;
    const comment = bug.comments?.find(c => c.id === commentId);
    if (!comment) return;

    const newReply = {
      ...reply,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

    const replies = [...(comment.replies || []), newReply];
    await firebaseReplyToComment(bugId, commentId, replies);

    // Notify comment author
    if (comment.authorId && comment.authorId !== reply.authorId) {
      await createNotification({
        type: 'comment',
        title: 'New Reply',
        desc: `${reply.author} replied to your comment on "${bug.title}"`,
        targetId: bug.id,
        targetScreen: 'bug-wall',
        recipientId: comment.authorId,
        isRead: false,
        time: 'Just now'
      });
    }
  };

  const markNotificationAsRead = async (id: string) => {
    await markNotificationRead(id);
  };

  const markAllNotificationsAsRead = async () => {
    if (!auth.currentUser) return;
    const unreadNotifs = notifications.filter(n => !n.isRead);
    if (unreadNotifs.length === 0) return;

    const batch = writeBatch(db);
    unreadNotifs.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { isRead: true });
    });
    await batch.commit();
  };

  const updateUserAvatars = async (uid: string, newPhotoURL: string, authorName?: string) => {
    // Update bugs where this user is the author
    const batch = writeBatch(db);
    let count = 0;

    bugs.forEach(bug => {
      const isAuthor = bug.authorId === uid || (!bug.authorId && authorName && bug.author === authorName);
      if (isAuthor && bug.authorPhotoURL !== newPhotoURL) {
        batch.update(doc(db, 'bugs', bug.id), { 
          authorPhotoURL: newPhotoURL,
          authorId: uid // Ensure UID is set for future syncs
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }
  };

  const markConcernHelpful = async (concernId: string) => {
    const concern = concerns.find(c => c.id === concernId);
    if (!concern) return;
    await updateDoc(doc(db, 'concerns', concernId), { helpfulCount: concern.helpfulCount + 1 });
  };

  const deleteBug = async (bugId: string) => {
    try {
      await deleteDoc(doc(db, 'bugs', bugId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bugs/${bugId}`);
    }
  };

  const editBug = async (bugId: string, bug: Partial<BugStory>) => {
    await updateBugStory(bugId, bug);
  };

  const deleteTip = async (tipId: string) => {
    try {
      await deleteDoc(doc(db, 'tips', tipId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tips/${tipId}`);
    }
  };

  const editTip = async (tipId: string, tip: Partial<Tip>) => {
    try {
      await updateDoc(doc(db, 'tips', tipId), tip);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tips/${tipId}`);
    }
  };

  const deleteConcern = async (concernId: string) => {
    try {
      await deleteDoc(doc(db, 'concerns', concernId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `concerns/${concernId}`);
    }
  };

  const editConcern = async (concernId: string, concern: Partial<Concern>) => {
    try {
      await updateDoc(doc(db, 'concerns', concernId), concern);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `concerns/${concernId}`);
    }
  };

  const deleteProposal = async (proposalId: string) => {
    try {
      await deleteDoc(doc(db, 'proposals', proposalId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `proposals/${proposalId}`);
    }
  };

  const editProposal = async (proposalId: string, proposal: Partial<Proposal>) => {
    try {
      await updateDoc(doc(db, 'proposals', proposalId), proposal);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `proposals/${proposalId}`);
    }
  };

  const deleteComment = async (bugId: string, commentId: string) => {
    try {
      await deleteCommentDoc(bugId, commentId);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bugs/${bugId}/comments/${commentId}`);
    }
  };

  const editComment = async (bugId: string, commentId: string, newText: string) => {
    try {
      await updateCommentDoc(bugId, commentId, newText);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bugs/${bugId}/comments/${commentId}`);
    }
  };

  return {
    bugs,
    tips,
    concerns,
    proposals,
    notifications,
    addBug,
    deleteBug,
    editBug,
    addTip,
    deleteTip,
    editTip,
    addConcern,
    deleteConcern,
    editConcern,
    addProposal,
    deleteProposal,
    editProposal,
    reactToBug,
    addCommentToBug,
    reactToComment,
    replyToComment,
    deleteComment,
    editComment,
    updateUserAvatars,
    markConcernHelpful,
    markNotificationAsRead,
    markAllNotificationsAsRead
  };
}
