import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';

export type FeedbackStatus = 'pending' | 'under_review' | 'planned' | 'in_progress' | 'completed' | 'declined';

export interface Feedback {
  id: string;
  type: 'bug' | 'suggestion';
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  status: FeedbackStatus;
  upvotes: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export function useFeedback() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      setFeedbackList([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'feedback'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Feedback[];
      setFeedbackList(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching feedback:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const submitFeedback = useCallback(async (data: { type: 'bug' | 'suggestion', title: string, description: string }) => {
    if (!currentUser) throw new Error("Must be logged in to submit feedback");
    
    await addDoc(collection(db, 'feedback'), {
      ...data,
      authorId: currentUser.uid,
      authorName: currentUser.firstName || 'Anonymous',
      status: 'pending',
      upvotes: [currentUser.uid], // Automatically upvote your own submission
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }, [currentUser]);

  const toggleUpvote = useCallback(async (feedbackId: string, currentUpvotes: string[]) => {
    if (!currentUser) return;
    
    const feedbackRef = doc(db, 'feedback', feedbackId);
    let newUpvotes;
    
    if (currentUpvotes.includes(currentUser.uid)) {
      newUpvotes = currentUpvotes.filter(id => id !== currentUser.uid);
    } else {
      newUpvotes = [...currentUpvotes, currentUser.uid];
    }
    
    await updateDoc(feedbackRef, {
      upvotes: newUpvotes,
      updatedAt: serverTimestamp()
    });
  }, [currentUser]);

  const updateStatus = useCallback(async (feedbackId: string, status: FeedbackStatus) => {
    const feedbackRef = doc(db, 'feedback', feedbackId);
    await updateDoc(feedbackRef, {
      status,
      updatedAt: serverTimestamp()
    });
  }, []);

  const deleteFeedbackItem = useCallback(async (feedbackId: string) => {
    await deleteDoc(doc(db, 'feedback', feedbackId));
  }, []);

  return {
    feedbackList,
    loading,
    submitFeedback,
    toggleUpvote,
    updateStatus,
    deleteFeedbackItem
  };
}
