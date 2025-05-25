
"use client";

import { useState, useEffect } from 'react';
import type { BibleReadingPlan, DailyReading, StructuredPassage, PlanType } from '@/types';
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
        // console.log("[useBiblePlan] Raw data from Firestore:", JSON.parse(JSON.stringify(data)));

        let planType = (data.planType as PlanType) || 'canonical';
        let planDescription = typeof data.planDescription === 'string' ? data.planDescription : "Unknown Plan";
        let startDate = "Unknown Start Date";
        let generatedDate = "Unknown Generation Date";

        try {
          startDate = data.startDate ? (typeof data.startDate === 'string' ? data.startDate : (data.startDate as Timestamp)?.toDate().toISOString()) : "Unknown Start Date";
        } catch (e) { console.error("[useBiblePlan] Error parsing startDate from Firestore:", data.startDate, e); }
        try {
          generatedDate = data.generatedDate ? (typeof data.generatedDate === 'string' ? data.generatedDate : (data.generatedDate as Timestamp)?.toDate().toISOString()) : "Unknown Generation Date";
        } catch (e) { console.error("[useBiblePlan] Error parsing generatedDate from Firestore:", data.generatedDate, e); }

        const dailyReadings: DailyReading[] = (Array.isArray(data.dailyReadings) ? data.dailyReadings.map((dr, drIndex) => {
          let readingDate = `ErrorDate-${drIndex}`;
          try {
            if (dr && dr.date) {
              readingDate = typeof dr.date === 'string' ? dr.date : (dr.date as Timestamp)?.toDate().toISOString().split('T')[0];
            } else {
              console.warn(`[useBiblePlan] SANITIZE: DailyReading at index ${drIndex} is missing a date. Original data:`, JSON.parse(JSON.stringify(dr)));
            }
          } catch (e) {
            console.error(`[useBiblePlan] SANITIZE: Error parsing date for DailyReading at index ${drIndex}. Original date:`, dr?.date, e);
          }

          const passages: StructuredPassage[] = (Array.isArray(dr?.passages) ? dr.passages.map((p, pIndex) => {
            const originalPassageForLog = p ? JSON.parse(JSON.stringify(p)) : { note: "Original passage object was null/undefined" };

            let currentBook = (typeof p?.book === 'string' && p.book.trim() !== '') ? p.book.trim() : '';
            let currentChapterNum = 0;
            if (typeof p?.chapter === 'number' && p.chapter > 0) {
                currentChapterNum = p.chapter;
            } else if (typeof p?.chapter === 'string') {
                const parsedCh = parseInt(p.chapter, 10);
                if (!isNaN(parsedCh) && parsedCh > 0) {
                    currentChapterNum = parsedCh;
                }
            }
            
            let currentStartVerse = (typeof p?.startVerse === 'number' && p.startVerse > 0) ? p.startVerse : undefined;
            let currentEndVerse : number | 'end' | undefined = undefined;
            if (typeof p?.endVerse === 'number' && p.endVerse > 0) {
                currentEndVerse = p.endVerse;
            } else if (p?.endVerse === 'end') {
                currentEndVerse = 'end';
            }

            let currentDisplayText = (typeof p?.displayText === 'string' && p.displayText.trim() !== '') ? p.displayText.trim() : '';
            
            let reconstructionNeeded = false;
            if (!currentBook) {
                currentBook = "Unknown Book";
                reconstructionNeeded = true;
                 console.warn(`[useBiblePlan] SANITIZE: Passage for date ${readingDate}, index ${pIndex}, missing valid 'book'. Original passage:`, originalPassageForLog);
            }
            if (currentChapterNum <= 0) {
                currentChapterNum = 0; // This will signal an error in reconstruction
                reconstructionNeeded = true;
                console.warn(`[useBiblePlan] SANITIZE: Passage for date ${readingDate}, index ${pIndex}, book '${currentBook}', missing valid 'chapter'. Original passage:`, originalPassageForLog);
            }

            if (!currentDisplayText || reconstructionNeeded) {
                let reconstructedText = currentBook;
                if (currentChapterNum > 0) {
                    reconstructedText += ` ${currentChapterNum}`;
                    if (currentStartVerse) {
                        reconstructedText += `:${currentStartVerse}`;
                        if (currentEndVerse) {
                            reconstructedText += `-${currentEndVerse === 'end' ? 'end' : currentEndVerse}`;
                        } else {
                            reconstructedText += '-end';
                        }
                    }
                } else {
                     reconstructedText = `${currentBook} (Chapter Data Error)`;
                }
                
                if (!currentDisplayText) { // Only overwrite if original was missing
                    console.warn(`[useBiblePlan] SANITIZE: Reconstructing displayText for passage. Date: ${readingDate}, Original:`, originalPassageForLog, `Reconstructed to: "${reconstructedText}"`);
                    currentDisplayText = reconstructedText;
                } else if (reconstructionNeeded && currentDisplayText !== reconstructedText) {
                    // Original displayText existed, but book/chapter issues forced a different reconstruction.
                    // This case is less common, usually if displayText was there but book/ch was bad for other logic.
                    // For now, we'll prefer original displayText if it existed, but log the discrepancy.
                     console.warn(`[useBiblePlan] SANITIZE: Book/Chapter issues for passage, but original displayText exists. Date: ${readingDate}, Original Display: "${currentDisplayText}", Potential Reconstruction: "${reconstructedText}". Original passage:`, originalPassageForLog);
                }
            }
            
            // Final absolute fallback if displayText somehow ended up empty.
            if (!currentDisplayText || currentDisplayText.trim() === '') {
                console.error(`[useBiblePlan] SANITIZE CRITICAL: displayText for passage is EMPTY after all checks. Date: ${readingDate}, Book: ${currentBook}, Ch: ${currentChapterNum}. Original passage:`, originalPassageForLog);
                currentDisplayText = "Error: Corrupted Passage";
            }

            return {
              book: currentBook,
              chapter: currentChapterNum,
              startVerse: currentStartVerse,
              endVerse: currentEndVerse,
              displayText: currentDisplayText,
            };
          }) : []);
          
          passages.forEach((psg, idx) => {
            if (!psg.displayText || psg.displayText.trim() === "") {
                console.error(`[useBiblePlan] SANITIZE POST-MAP CHECK: Empty displayText for passage at index ${idx} on date ${readingDate}. Passage:`, JSON.parse(JSON.stringify(psg)));
            }
          });

          return { date: readingDate, passages, originalDateKey: readingDate }; // originalDateKey added
        }) : []);

        const formattedData: BibleReadingPlan = {
            id: docSnapshot.id,
            planType: planType,
            planDescription: planDescription,
            startDate: startDate,
            generatedDate: generatedDate,
            dailyReadings: dailyReadings,
            updatedAt: data.updatedAt as Timestamp
        };
        // console.log("[useBiblePlan] Final sanitized plan data being set:", JSON.parse(JSON.stringify(formattedData)));
        setPlan(formattedData);

      } else {
        // console.log("[useBiblePlan] No Bible plan document found in Firestore.");
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
