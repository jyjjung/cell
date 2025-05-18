
"use client";

import { useState, useEffect } from 'react';
import type { BibleReadingPlan } from '@/types';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

const BIBLE_PLAN_COLLECTION = 'config'; // Using a general 'config' collection
const BIBLE_PLAN_DOC_ID = 'biblePlan';    // Specific document for the plan

export function useBiblePlan() {
  const [plan, setPlan] = useState<BibleReadingPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const planDocRef = doc(db, BIBLE_PLAN_COLLECTION, BIBLE_PLAN_DOC_ID);
    const unsubscribe = onSnapshot(planDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data() as Omit<BibleReadingPlan, 'id'>; // Cast, assuming data matches
        // Ensure dates are correctly formatted if they come from Firestore Timestamps
        const formattedData: BibleReadingPlan = {
            ...data,
            id: docSnapshot.id,
            startDate: typeof data.startDate === 'string' ? data.startDate : (data.startDate as unknown as Timestamp)?.toDate().toISOString(),
            generatedDate: typeof data.generatedDate === 'string' ? data.generatedDate : (data.generatedDate as unknown as Timestamp)?.toDate().toISOString(),
            dailyReadings: Array.isArray(data.dailyReadings) ? data.dailyReadings.map(dr => ({
                ...dr,
                date: typeof dr.date === 'string' ? dr.date : (dr.date as unknown as Timestamp)?.toDate().toISOString().split('T')[0], // ensure YYYY-MM-DD
            })) : [] // Default to empty array if not an array or missing
        };
        setPlan(formattedData);
      } else {
        setPlan(null); // No plan set by admin yet
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching Bible reading plan:", error);
      setPlan(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const saveBiblePlan = async (newPlanData: Omit<BibleReadingPlan, 'id' | 'updatedAt'>) => {
    const planDocRef = doc(db, BIBLE_PLAN_COLLECTION, BIBLE_PLAN_DOC_ID);
    try {
      await setDoc(planDocRef, {
        ...newPlanData,
        updatedAt: serverTimestamp(),
      });
      // The onSnapshot listener will update the local state automatically
    } catch (error) {
      console.error("Error saving Bible reading plan. Data:", newPlanData, "Error:", error);
      throw error; // Re-throw to be caught by caller
    }
  };

  return { plan, loading, saveBiblePlan };
}

