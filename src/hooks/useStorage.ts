import React, { useState, useEffect } from 'react';
import { BugStory, Tip, Proposal, Notification, Comment, Achievement, BugTriage } from '../types';
import { db, auth, updateBugReactions, updateTipReactions, updateBugStory, addComment, deleteCommentDoc, updateCommentDoc, reactToComment as firebaseReactToComment, addReply as firebaseReplyToComment, createNotification, markNotificationRead, handleFirestoreError, OperationType, getFirebaseDebugInfo } from '../firebase';
import { collection, onSnapshot, query, orderBy, where, writeBatch, doc, setDoc, serverTimestamp, updateDoc, deleteDoc, collectionGroup } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { createE2ESeedBugs, e2eMockUser, isE2EMode } from '../e2e';

function toDate(ts: any): number {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  return new Date(ts).getTime() || 0;
}

export function useStorage(activeScreen?: string) {
  const { user, loading } = useAuth();
  const e2eMode = isE2EMode();
  const actor = e2eMode ? e2eMockUser : user;
  const [bugs, setBugs] = useState<BugStory[]>(() => (e2eMode ? createE2ESeedBugs() : []));
  const [tips, setTips] = useState<Tip[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!e2eMode) return;
    setBugs(createE2ESeedBugs());
    setTips([]);
    setProposals([]);
    setAchievements([]);
    setNotifications([]);
  }, [e2eMode]);

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

    if (e2eMode) {
      return () => {
        cancelled = true;
      };
    }

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
            return {
              ...bug,
              comments: existingBug?.comments || bug.comments || [],
              triage: existingBug?.triage,
            };
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
  }, [e2eMode, loading, user?.uid]);

  // Deferred: comments + replies collectionGroup listeners — only active on bug-wall
  // These are the most expensive queries (fan-out across all documents) so we defer
  // them until the user actually navigates to the Bug Wall screen.
  useEffect(() => {
    if (e2eMode) return;
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
  }, [e2eMode, user?.uid, loading, activeScreen]);

  const addBug = async (bug: Omit<BugStory, 'id' | 'date' | 'reactions' | 'comments'>): Promise<string> => {
    if (e2eMode) {
      const bugId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      setBugs(prev => [
        {
          ...bug,
          id: bugId,
          date: 'Just now',
          reactions: {},
          reactedBy: {},
          comments: [],
          createdAt,
        } as BugStory,
        ...prev,
      ]);
      return bugId;
    }

    const idToken = await actor?.getIdToken();
    const response = await fetch('/api/bugs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({ bug }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        JSON.stringify({
          error: result?.error || 'Failed to create bug story',
          operationType: OperationType.WRITE,
          path: result?.path || 'api/bugs',
        })
      );
    }

    return result?.id as string;
  };

  const setBugTriage = (bugId: string, triage: BugTriage) => {
    const normalizedTriage: BugTriage = {
      review_status: triage.needs_human_review ? 'review_required' : 'pending',
      review_history: triage.review_history ?? [],
      ...triage,
    };
    setBugs(prev => prev.map(item => (item.id === bugId ? { ...item, triage: normalizedTriage } : item)));
  };

  const updateBugTriageState = (bugId: string, updater: (triage: BugTriage) => BugTriage) => {
    setBugs(prev => prev.map(item => {
      if (item.id !== bugId || !item.triage) return item;
      return { ...item, triage: updater(item.triage) };
    }));
  };

  const requestBugTriage = async (bugId: string, postText: string) => {
    const response = await fetch('/api/triage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bugId, postText }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.triage) {
      throw new Error(
        JSON.stringify({
          error: result?.error || 'Failed to triage bug story',
          operationType: OperationType.WRITE,
          path: result?.path || 'api/triage',
        })
      );
    }

    setBugTriage(bugId, result.triage as BugTriage);
    return result.triage as BugTriage;
  };

  const persistBugTriageReview = async (bugId: string, action: 'mark_for_review' | 'mark_reviewed') => {
    const bug = bugs.find(item => item.id === bugId);
    if (!bug?.triage) {
      throw new Error(
        JSON.stringify({
          error: 'Missing triage state for bug review action',
          operationType: OperationType.WRITE,
          path: 'local/triage',
        })
      );
    }

    const response = await fetch('/api/triage/review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bugId,
        triage: bug.triage,
        action,
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.triage) {
      throw new Error(
        JSON.stringify({
          error: result?.error || 'Failed to persist triage review state',
          operationType: OperationType.WRITE,
          path: result?.path || 'api/triage/review',
        })
      );
    }

    updateBugTriageState(bugId, () => result.triage as BugTriage);
    return result.triage as BugTriage;
  };

  const markBugForHumanReview = async (bugId: string) => {
    return persistBugTriageReview(bugId, 'mark_for_review');
  };

  const markBugTriageReviewed = async (bugId: string) => {
    return persistBugTriageReview(bugId, 'mark_reviewed');
  };

  const addTip = async (tip: Omit<Tip, 'id' | 'time'>) => {
    const tipRef = doc(collection(db, 'tips'));
    await setDoc(tipRef, {
      ...tip,
      id: tipRef.id,
      authorId: actor?.uid || null,
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
  };

const addProposal = async (proposal: Omit<Proposal, 'id' | 'date' | 'author'>) => {
    const proposalRef = doc(collection(db, 'proposals'));
    const author = actor?.displayName || 'Anonymous';
    const payload = {
      ...proposal,
      summary: proposal.summary || proposal.scope || '',
      content: proposal.content || proposal.scope || '',
      scope: proposal.scope || proposal.summary || '',
      status: proposal.status || (proposal.meeting ? 'scheduled' : 'idea'),
      presenterId: proposal.presenterId || actor?.uid || null,
      presenterName: proposal.presenterName || author,
      meeting: proposal.meeting || null,
    };

    await setDoc(proposalRef, {
      ...payload,
      id: proposalRef.id,
      authorId: actor?.uid || null,
      authorPhotoURL: actor?.photoURL || null,
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

    if (payload.meeting?.scheduledFor) {
      await createNotification({
        type: 'meeting',
        title: 'Knowledge session scheduled',
        desc: `${author} scheduled "${proposal.title}" for ${payload.meeting.scheduledFor}.`,
        targetId: proposalRef.id,
        targetScreen: 'knowledge-sharing',
        recipientId: 'all',
        isRead: false,
        time: 'Just now',
      });
    }
  };

  const addAchievement = async (achievement: Omit<Achievement, 'id' | 'date' | 'author'>) => {
    const idToken = await actor?.getIdToken();

    console.info('Achievement create attempt', {
      firebase: getFirebaseDebugInfo(),
      uid: actor?.uid || null,
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
          uid: actor?.uid || null,
          displayName: actor?.displayName || null,
          photoURL: actor?.photoURL || null,
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
    const uid = actor?.uid;
    if (!uid) return;
    const bug = bugs.find(b => b.id === bugId);
    if (!bug) return;

    const reactions = { ...bug.reactions };
    const reactedBy = { ...(bug.reactedBy ?? {}) };
    const alreadyReacted = (reactedBy[emoji] ?? []).includes(uid);

    if (alreadyReacted) {
      reactions[emoji] = Math.max(0, (reactions[emoji] || 1) - 1);
      if (!reactions[emoji]) delete reactions[emoji];
      reactedBy[emoji] = (reactedBy[emoji] ?? []).filter(id => id !== uid);
      if (!reactedBy[emoji].length) delete reactedBy[emoji];
    } else {
      reactions[emoji] = (reactions[emoji] || 0) + 1;
      reactedBy[emoji] = [...(reactedBy[emoji] ?? []), uid];
      if (currentUserName && bug.authorId && bug.authorId !== uid) {
        if (e2eMode) {
          setNotifications(prev => [
            {
              id: crypto.randomUUID(),
              type: 'like',
              title: 'New Bug Reaction',
              desc: `${currentUserName} reacted ${emoji} to your story: "${bug.title}"`,
              targetId: bug.id,
              targetScreen: 'bug-wall',
              recipientId: bug.authorId,
              isRead: false,
              time: 'Just now',
            },
            ...prev,
          ]);
        } else {
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
      }
    }

    if (e2eMode) {
      setBugs(prev => prev.map(item => item.id === bugId ? { ...item, reactions, reactedBy } : item));
      return;
    }

    await updateBugReactions(bugId, reactions, reactedBy);
  };

  const reactToTip = async (tipId: string, emoji: string, currentUserName?: string) => {
    const uid = actor?.uid;
    if (!uid) return;
    const tip = tips.find(t => t.id === tipId);
    if (!tip) return;

    const reactions = { ...(tip.reactions || {}) };
    const reactedBy = { ...(tip.reactedBy ?? {}) };
    const alreadyReacted = (reactedBy[emoji] ?? []).includes(uid);

    if (alreadyReacted) {
      reactions[emoji] = Math.max(0, (reactions[emoji] || 1) - 1);
      if (!reactions[emoji]) delete reactions[emoji];
      reactedBy[emoji] = (reactedBy[emoji] ?? []).filter(id => id !== uid);
      if (!reactedBy[emoji].length) delete reactedBy[emoji];
    } else {
      reactions[emoji] = (reactions[emoji] || 0) + 1;
      reactedBy[emoji] = [...(reactedBy[emoji] ?? []), uid];
    }

    await updateTipReactions(tipId, reactions, reactedBy);

    if (!alreadyReacted && currentUserName && tip.authorId && tip.authorId !== uid) {
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
    }
  };

  const addCommentToBug = async (bugId: string, text: string, author: string, isAnonymous: boolean = false, authorPhotoURL?: string, authorId?: string, imageUrl?: string, gifUrl?: string, imageUrls?: string[]) => {
    const bug = bugs.find(b => b.id === bugId);
    if (!bug) return;

    if (e2eMode) {
      const newComment: Comment = {
        id: crypto.randomUUID(),
        author,
        authorId: authorId || actor?.uid || null || undefined,
        authorPhotoURL: authorPhotoURL || actor?.photoURL || undefined,
        text,
        date: 'Just now',
        createdAt: new Date().toISOString(),
        isAnonymous,
        imageUrl: imageUrl || null || undefined,
        imageUrls: imageUrls || null || undefined,
        gifUrl: gifUrl || null || undefined,
        likes: [],
        replies: [],
      };
      setBugs(prev => prev.map(item => item.id === bugId ? { ...item, comments: [...(item.comments || []), newComment] } : item));
      return;
    }

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

    if (e2eMode) {
      setBugs(prevBugs =>
        prevBugs.map(item =>
          item.id === bugId
            ? {
                ...item,
                comments: (item.comments || []).map(entry =>
                  entry.id === commentId ? { ...entry, likes: newLikes } : entry
                ),
              }
            : item
        )
      );
      return;
    }

    await firebaseReactToComment(bugId, commentId, newLikes);

    // Notify comment author if it's a new like
    if (!likes.includes(currentUserId) && comment.authorId && comment.authorId !== currentUserId) {
      const actorName = actor?.displayName || 'Someone';
      await createNotification({
        type: 'like',
        title: 'New Comment Reaction',
        desc: `${actorName} liked your comment on "${bug.title}"`,
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

    if (e2eMode) {
      const newReply: Comment = {
        ...reply,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      setBugs(prevBugs =>
        prevBugs.map(item =>
          item.id === bugId
            ? {
                ...item,
                comments: (item.comments || []).map(entry =>
                  entry.id === commentId
                    ? { ...entry, replies: [...(entry.replies || []), newReply] }
                    : entry
                ),
              }
            : item
        )
      );
      return;
    }

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
    }
  };

  const markNotificationAsRead = async (id: string) => {
    if (e2eMode) {
      setNotifications(prev => prev.map(item => item.id === id ? { ...item, isRead: true } : item));
      return;
    }
    await markNotificationRead(id);
  };

  const markAllNotificationsAsRead = async () => {
    if (!actor) return;
    if (e2eMode) {
      setNotifications(prev => prev.map(item => ({ ...item, isRead: true })));
      return;
    }
    const unreadNotifs = notifications.filter(n => !n.isRead);
    if (unreadNotifs.length === 0) return;

    const batch = writeBatch(db);
    unreadNotifs.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { isRead: true });
    });
    await batch.commit();
  };

  const updateUserAvatars = async (uid: string, newPhotoURL: string, authorName?: string) => {
    if (e2eMode) {
      setBugs(prev =>
        prev.map(bug => {
          const isAuthor = bug.authorId === uid || (!bug.authorId && authorName && bug.author === authorName);
          return isAuthor ? { ...bug, authorPhotoURL: newPhotoURL, authorId: uid } : bug;
        })
      );
      return;
    }

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
    if (e2eMode) {
      setBugs(prev => prev.filter(item => item.id !== bugId));
      return;
    }
    try {
      await deleteDoc(doc(db, 'bugs', bugId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bugs/${bugId}`);
    }
  };

  const editBug = async (bugId: string, bug: Partial<BugStory>) => {
    if (e2eMode) {
      setBugs(prev => prev.map(item => item.id === bugId ? { ...item, ...bug } : item));
      return;
    }
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

      const existing = proposals.find((item) => item.id === proposalId);
      const nextMeeting = proposal.meeting;
      const hadMeeting = Boolean(existing?.meeting?.scheduledFor);
      const hasMeeting = Boolean(nextMeeting?.scheduledFor);

      if (hasMeeting) {
        await createNotification({
          type: 'meeting',
          title: hadMeeting ? 'Knowledge session updated' : 'Knowledge session scheduled',
          desc: `${proposal.presenterName || existing?.presenterName || existing?.author || 'A teammate'} scheduled "${proposal.title || existing?.title || 'Knowledge session'}" for ${nextMeeting?.scheduledFor}.`,
          targetId: proposalId,
          targetScreen: 'knowledge-sharing',
          recipientId: 'all',
          isRead: false,
          time: 'Just now',
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `proposals/${proposalId}`);
    }
  };

  const deleteAchievement = async (achievementId: string) => {
    if (e2eMode) {
      setAchievements(prev => prev.filter(item => item.id !== achievementId));
      return;
    }
    const idToken = await actor?.getIdToken();

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
    if (e2eMode) {
      setBugs(prev =>
        prev.map(item =>
          item.id === bugId
            ? { ...item, comments: (item.comments || []).filter(comment => comment.id !== commentId) }
            : item
        )
      );
      return;
    }
    try {
      await deleteCommentDoc(bugId, commentId);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bugs/${bugId}/comments/${commentId}`);
    }
  };

  const editComment = async (bugId: string, commentId: string, newText: string) => {
    if (e2eMode) {
      setBugs(prev =>
        prev.map(item =>
          item.id === bugId
            ? {
                ...item,
                comments: (item.comments || []).map(comment =>
                  comment.id === commentId ? { ...comment, text: newText } : comment
                ),
              }
            : item
        )
      );
      return;
    }
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
    requestBugTriage,
    markBugForHumanReview,
    markBugTriageReviewed,
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
