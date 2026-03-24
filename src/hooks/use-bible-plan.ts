
"use client";

import { useState, useEffect } from 'react';
import type { BibleReadingPlan, DailyReading, StructuredPassage } from '@/types';
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
        
        // Sanitize dailyReadings to handle both old (string) and new (object) passage formats.
        const dailyReadings: DailyReading[] = (Array.isArray(data.dailyReadings) ? data.dailyReadings : []).map((dr: any) => {
          const sanitizedPassages: StructuredPassage[] = (Array.isArray(dr.passages) ? dr.passages : []).map((p: any, index: number) => {
            // If passage is a string, convert it to a StructuredPassage object.
            if (typeof p === 'string') {
                const lastSpaceIndex = p.lastIndexOf(' ');
                if (lastSpaceIndex > -1) {
                    const book = p.substring(0, lastSpaceIndex).trim();
                    const chapterStr = p.substring(lastSpaceIndex + 1).trim();
                    const chapter = parseInt(chapterStr, 10);
                    if (book && !isNaN(chapter)) {
                        return { book, chapter, displayText: p };
                    }
                }
                // If parsing fails, return an error structure to make it obvious in the UI.
                return { book: "Error", chapter: 0, displayText: `Error: Invalid passage string '${p}'` };
            }
            // If it's already a valid object, return it as is.
            if (typeof p === 'object' && p !== null && p.displayText) {
                return p;
            }
            // If it's some other invalid format, flag it.
            return { book: "Error", chapter: 0, displayText: `Error: Invalid passage format` };
          });

          return {
              ...dr,
              passages: sanitizedPassages,
              date: dr.date ? (typeof dr.date === 'string' ? dr.date : (dr.date as Timestamp)?.toDate().toISOString().split('T')[0]) : '',
          }
        }).filter(dr => dr.date);


        const formattedData: BibleReadingPlan = {
            id: docSnapshot.id,
            planType: data.planType || 'canonical',
            planDescription: data.planDescription || "Unknown Plan",
            startDate: data.startDate ? (typeof data.startDate === 'string' ? data.startDate : (data.startDate as Timestamp)?.toDate().toISOString().split('T')[0]) : "Unknown Start Date",
            generatedDate: data.generatedDate ? (typeof data.generatedDate === 'string' ? data.generatedDate : (data.generatedDate as Timestamp)?.toDate().toISOString().split('T')[0]) : "Unknown Generation Date",
            dailyReadings: dailyReadings,
            updatedAt: data.updatedAt as Timestamp,
            readingsPerDay: data.readingsPerDay,
            readingDays: data.readingDays,
        };
        setPlan(formattedData);

      } else {
        setPlan(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("[useBiblePlan] Firestore onSnapshot error:", error);
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
      console.error("[useBiblePlan] Error saving Bible reading plan to Firestore. Data:", newPlanData, "Error:", error);
      throw error;
    }
  };

  return { plan, loading, saveBiblePlan };
}
