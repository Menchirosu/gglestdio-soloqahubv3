import React, { useState, useEffect } from 'react';
import { BugStory, Tip, Proposal, Notification, Comment, Achievement } from '../types';
import { db, auth, createBugStory, updateBugReactions, updateTipReactions, updateBugStory, addComment, deleteCommentDoc, updateCommentDoc, reactToComment as firebaseReactToComment, addReply as firebaseReplyToComment, createNotification, markNotificationRead, handleFirestoreError, OperationType, getFirebaseDebugInfo } from '../firebase';
import { collection, onSnapshot, query, orderBy, where, writeBatch, doc, setDoc, serverTimestamp, updateDoc, deleteDoc, collectionGroup } from 'firebase/firestore';
import { sendBroadcastEmail, sendUserEmail } from '../utils/emailNotifier';
import { useAuth } from '../AuthContext';

function toDate(ts: any): number {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  return new Date(ts).getTime() || 0;
}

export function useStorage(activeScreen?: string) {
  const { user, loading } = useAuth();
  const [bugs, setBugs] = useState<BugStory[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchAchievements = async () => {
    try {
      const response = await fetch('/api/achievements');
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          JSON.stringify({
            error: result?.error || 'Failed to fetch achievements',
            operationType: OperationType.GET,
            path: result?.path || 'api/achievements',
          })
        );
      }

      setAchievements((result?.achievements || []) as Achievement[]);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'achievements');
    }
  };

  // Real-time listeners
  useEffect(() => {
    let unsubscribers: Array<() => void> = [];
    let cancelled = false;

    if (loading) {
      return () => {
        cancelled = true;
      };
    }

    if (!user) {
      setBugs([]);
      setTips([]);
      setProposals([]);
      setAchievements([]);
      setNotifications([]);
      return () => {
        cancelled = true;
      };
    }

    const startListeners = async () => {
      try {
        await user.getIdToken();
      } catch (error) {
        if (!cancelled) {
          handleFirestoreError(error, OperationType.GET, 'auth-token');
        }
        return;
      }

      if (cancelled) return;

      const bugsQuery = query(collection(db, 'bugs'), orderBy('createdAt', 'desc'));
      const unsubscribeBugs = onSnapshot(bugsQuery, (snapshot) => {
        const bugsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return { ...data, id: doc.id, comments: data.comments || [] } as BugStory;
        });
        setBugs(prevBugs => {
          return bugsData.map(bug => {
            const existingBug = prevBugs.find(b => b.id === bug.id);
            return { ...bug, comments: existingBug?.comments || bug.comments || [] };
          });
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'bugs'));

      const tipsQuery = query(collection(db, 'tips'), orderBy('createdAt', 'desc'));
      const unsubscribeTips = onSnapshot(tipsQuery, (snapshot) => {
        const tipsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Tip));
        setTips(tipsData);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'tips'));

      const proposalsQuery = query(collection(db, 'proposals'), orderBy('createdAt', 'desc'));
      const unsubscribeProposals = onSnapshot(proposalsQuery, (snapshot) => {
        const proposalsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Proposal));
        setProposals(proposalsData);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'proposals'));

      const notifQuery = query(
        collection(db, 'notifications'),
        where('recipientId', 'in', [user.uid, 'all']),
        orderBy('createdAt', 'desc')
      );

      const unsubscribeNotifs = onSnapshot(notifQuery, (snapshot) => {
        const notifsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Notification));
        setNotifications(notifsData);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'notifications'));

      unsubscribers = [
        unsubscribeBugs,
        unsubscribeTips,
        unsubscribeProposals,
        unsubscribeNotifs,
      ];

      await fetchAchievements();
    };

    startListeners();

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [loading, user?.uid]);

  // Deferred: comments + replies collectionGroup listeners — only active on bug-wall
  // These are the most expensive queries (fan-out across all documents) so we defer
  // them until the user actually navigates to the Bug Wall screen.
  useEffect(() => {
    if (!user || loading || activeScreen !== 'bug-wall') return;

    const unsubscribers: Array<() => void> = [];

    const commentsQuery = query(collectionGroup(db, 'comments'));
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      const allComments = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
      setBugs(prevBugs =>
        prevBugs.map(bug => {
          const subComments = allComments.filter(c => c.bugId === bug.id);
          const legacyComments = bug.comments?.filter(c => !subComments.find(sc => sc.id === c.id)) || [];
          return {
            ...bug,
            comments: [...legacyComments, ...subComments].sort(
              (a, b) => toDate(a.createdAt || a.date) - toDate(b.createdAt || b.date)
            ),
          };
        })
      );
    }, (error) => {
      console.error('Collection group query error (comments):', error);
      handleFirestoreError(error, OperationType.GET, 'all-comments');
    });

    const repliesQuery = query(collectionGroup(db, 'replies'));
    const unsubscribeReplies = onSnapshot(repliesQuery, (snapshot) => {
      const allReplies = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
      setBugs(prevBugs =>
        prevBugs.map(bug => {
          if (!bug.comments) return bug;
          return {
            ...bug,
            comments: bug.comments.map(comment => {
              const subReplies = allReplies.filter(r => r.commentId === comment.id);
              const legacyReplies = comment.replies?.filter(r => !subReplies.find(sr => sr.id === r.id)) || [];
              return {
                ...comment,
                replies: [...legacyReplies, ...subReplies].sort(
                  (a, b) => toDate(a.createdAt || a.date) - toDate(b.createdAt || b.date)
                ),
              };
            }),
          };
        })
      );
    }, (error) => {
      console.error('Collection group query error (replies):', error);
      handleFirestoreError(error, OperationType.GET, 'all-replies');
    });

    unsubscribers.push(unsubscribeComments, unsubscribeReplies);
    return () => unsubscribers.forEach(u => u());
  }, [user?.uid, loading, activeScreen]);

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
    sendBroadcastEmail(
      `🐛 New Bug Story on QHUB`,
      bug.author,
      `${bug.author} shared a new bug story: "${bug.title}". Check it out on the Bug Wall!`,
      auth.currentUser?.uid,
    );
  };

  const addTip = async (tip: Omit<Tip, 'id' | 'time'>) => {
    const tipRef = doc(collection(db, 'tips'));
    await setDoc(tipRef, {
      ...tip,
      id: tipRef.id,
      authorId: auth.currentUser?.uid || null,
      time: 'Just now',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
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
    sendBroadcastEmail(
      `💡 New Tip & Trick on QHUB`,
      tip.author,
      `${tip.author} shared a new tip: "${tip.title}". Check it out in Tips & Tricks!`,
      auth.currentUser?.uid,
    );
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
    sendBroadcastEmail(
      `📚 New Knowledge Sharing on QHUB`,
      author,
      `${author} proposed a new knowledge sharing session: "${proposal.title}". Check it out!`,
      auth.currentUser?.uid,
    );
  };

  const addAchievement = async (achievement: Omit<Achievement, 'id' | 'date' | 'author'>) => {
    const idToken = await auth.currentUser?.getIdToken();

    console.info('Achievement create attempt', {
      firebase: getFirebaseDebugInfo(),
      uid: auth.currentUser?.uid || null,
      path: 'api/achievements',
      hasIdToken: Boolean(idToken),
      payload: achievement,
    });

    const response = await fetch('/api/achievements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({
        achievement,
        auth: {
          uid: auth.currentUser?.uid || null,
          displayName: auth.currentUser?.displayName || null,
          photoURL: auth.currentUser?.photoURL || null,
        },
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      console.error('Achievement proxy create failed', result);
      throw new Error(
        JSON.stringify({
          error: result?.error || 'Achievement proxy create failed',
          operationType: OperationType.CREATE,
          path: result?.path || 'api/achievements',
          firebase: getFirebaseDebugInfo(),
          proxy: result,
        })
      );
    }

    await fetchAchievements();
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
      sendUserEmail(
        bug.authorId,
        auth.currentUser?.uid || '',
        `${emoji} Someone reacted to your story on QHUB`,
        currentUserName,
        `${currentUserName} reacted ${emoji} to your bug story: "${bug.title}".`,
      );
    }
  };

  const reactToTip = async (tipId: string, emoji: string, currentUserName?: string) => {
    const tip = tips.find(t => t.id === tipId);
    if (!tip) return;

    const reactions = { ...(tip.reactions || {}) };
    reactions[emoji] = (reactions[emoji] || 0) + 1;

    await updateTipReactions(tipId, reactions);

    if (currentUserName && tip.authorId && tip.authorId !== auth.currentUser?.uid) {
      await createNotification({
        type: 'like',
        title: 'New Tip Reaction',
        desc: `${currentUserName} reacted ${emoji} to your tip: "${tip.title}"`,
        targetId: tip.id,
        targetScreen: 'tips-tricks',
        recipientId: tip.authorId,
        isRead: false,
        time: 'Just now'
      });
      sendUserEmail(
        tip.authorId,
        auth.currentUser?.uid || '',
        `${emoji} Someone reacted to your tip on QHUB`,
        currentUserName,
        `${currentUserName} reacted ${emoji} to your tip: "${tip.title}".`,
      );
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
        sendUserEmail(
          bug.authorId,
          authorId,
          `💬 New comment on your story on QHUB`,
          author,
          `${author} commented on your bug story: "${bug.title}".`,
        );
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
      const actor = auth.currentUser?.displayName || 'Someone';
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
      sendUserEmail(
        comment.authorId,
        currentUserId,
        `❤️ Someone liked your comment on QHUB`,
        actor,
        `${actor} liked your comment on the bug story: "${bug.title}".`,
      );
    }
  };

  const replyToComment = async (bugId: string, commentId: string, reply: Omit<Comment, 'id' | 'createdAt'>) => {
    const bug = bugs.find(b => b.id === bugId);
    if (!bug) return;
    const comment = bug.comments?.find(c => c.id === commentId);
    if (!comment) return;

    await firebaseReplyToComment(bugId, commentId, reply);

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
      sendUserEmail(
        comment.authorId,
        reply.authorId || '',
        `↩️ New reply to your comment on QHUB`,
        reply.author,
        `${reply.author} replied to your comment on the bug story: "${bug.title}".`,
      );
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

  const deleteAchievement = async (achievementId: string) => {
    const idToken = await auth.currentUser?.getIdToken();

    try {
      const response = await fetch(`/api/achievements?id=${encodeURIComponent(achievementId)}`, {
        method: 'DELETE',
        headers: {
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          JSON.stringify({
            error: result?.error || 'Achievement proxy delete failed',
            operationType: OperationType.DELETE,
            path: result?.path || `api/achievements?id=${achievementId}`,
          })
        );
      }

      await fetchAchievements();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `achievements/${achievementId}`);
    }
  };

  const editAchievement = async (achievementId: string, achievement: Partial<Achievement>) => {
    try {
      await updateDoc(doc(db, 'achievements', achievementId), achievement);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `achievements/${achievementId}`);
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
    proposals,
    achievements,
    notifications,
    addBug,
    deleteBug,
    editBug,
    addTip,
    deleteTip,
    editTip,
    addProposal,
    deleteProposal,
    editProposal,
    addAchievement,
    deleteAchievement,
    editAchievement,
    reactToBug,
    reactToTip,
    addCommentToBug,
    reactToComment,
    replyToComment,
    deleteComment,
    editComment,
    updateUserAvatars,
    markNotificationAsRead,
    markAllNotificationsAsRead
  };
}
