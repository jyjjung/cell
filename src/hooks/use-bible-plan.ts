
"use client";

import { useState, useEffect } from 'react';
import type { BibleReadingPlan, PlanType } from '@/types'; // Ensure PlanType is imported
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

const BIBLE_PLAN_COLLECTION = 'config'; 
const BIBLE_PLAN_DOC_ID = 'biblePlan';    

export function useBiblePlan() {
  const [plan, setPlan] = useState<BibleReadingPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const planDocRef = doc(db, BIBLE_PLAN_COLLECTION, BIBLE_PLAN_DOC_ID);
    const unsubscribe = onSnapshot(planDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        
        // Basic validation for essential fields
        const planType = data.planType as PlanType;
        const planDescription = typeof data.planDescription === 'string' ? data.planDescription : "Unknown Plan";

        const formattedData: BibleReadingPlan = {
            id: docSnapshot.id,
            planType: planType || 'canonical', // Default to canonical if undefined
            planDescription: planDescription,
            startDate: typeof data.startDate === 'string' ? data.startDate : (data.startDate as Timestamp)?.toDate().toISOString(),
            generatedDate: typeof data.generatedDate === 'string' ? data.generatedDate : (data.generatedDate as Timestamp)?.toDate().toISOString(),
            dailyReadings: Array.isArray(data.dailyReadings) ? data.dailyReadings.map(dr => ({
                ...dr,
                date: typeof dr.date === 'string' ? dr.date : (dr.date as Timestamp)?.toDate().toISOString().split('T')[0],
            })) : [],
            updatedAt: data.updatedAt as Timestamp // keep as Timestamp or convert if needed elsewhere
        };
        setPlan(formattedData);
      } else {
        setPlan(null); 
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
    } catch (error) {
      console.error("Error saving Bible reading plan. Data:", newPlanData, "Error:", error);
      throw error; 
    }
  };

  return { plan, loading, saveBiblePlan };
}
