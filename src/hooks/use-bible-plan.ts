
"use client";

import { useState, useEffect } from 'react';
import type { BibleReadingPlan, DailyReading, StructuredPassage, PlanType } from '@/types';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { parsePassageString } from '@/lib/plan-generator'; // Import the parser
import { BIBLE_BOOKS_DATA } from '@/lib/bible-data'; // For fallback book/chapter validation

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
          startDate = data.startDate ? (typeof data.startDate === 'string' ? data.startDate : (data.startDate as Timestamp)?.toDate().toISOString().split('T')[0]) : "Unknown Start Date";
        } catch (e) { console.error("[useBiblePlan] Error parsing startDate from Firestore:", data.startDate, e); }
        
        try {
          generatedDate = data.generatedDate ? (typeof data.generatedDate === 'string' ? data.generatedDate : (data.generatedDate as Timestamp)?.toDate().toISOString().split('T')[0]) : "Unknown Generation Date";
        } catch (e) { console.error("[useBiblePlan] Error parsing generatedDate from Firestore:", data.generatedDate, e); }

        const dailyReadings: DailyReading[] = (Array.isArray(data.dailyReadings) ? data.dailyReadings.map((dr_raw, drIndex) => {
          let readingDate = `ErrorDate-${drIndex}`;
          try {
            if (dr_raw && dr_raw.date) {
              readingDate = typeof dr_raw.date === 'string' ? dr_raw.date : (dr_raw.date as Timestamp)?.toDate().toISOString().split('T')[0];
            } else {
              console.warn(`[useBiblePlan] SANITIZE: DailyReading at index ${drIndex} is missing a date. Original data:`, dr_raw ? JSON.parse(JSON.stringify(dr_raw)) : "null/undefined dailyReading object");
            }
          } catch (e) {
            console.error(`[useBiblePlan] SANITIZE: Error parsing date for DailyReading at index ${drIndex}. Original date:`, dr_raw?.date, e);
          }

          const passages: StructuredPassage[] = (Array.isArray(dr_raw?.passages) ? dr_raw.passages.flatMap((p_raw_from_firestore, pIndex) => {
            const originalPassageForLog = p_raw_from_firestore !== undefined && p_raw_from_firestore !== null ? JSON.parse(JSON.stringify(p_raw_from_firestore)) : { note: "Original passage object was null/undefined" };

            if (typeof p_raw_from_firestore === 'string') {
              // Attempt to parse the string into StructuredPassage objects
              console.warn(`[useBiblePlan] SANITIZE: Passage at Date ${readingDate}, Index ${pIndex} is a STRING: "${p_raw_from_firestore}". Attempting to parse.`);
              const parsedUnits = parsePassageString(p_raw_from_firestore);
              if (parsedUnits.length > 0) {
                return parsedUnits.map(unit => ({ // Ensure all fields, though parsePassageString should provide them
                  book: unit.book,
                  chapter: unit.chapter,
                  startVerse: unit.startVerse,
                  endVerse: unit.endVerse,
                  displayText: unit.displayText || `${unit.book} ${unit.chapter}${unit.startVerse ? `:${unit.startVerse}` : ''}${unit.endVerse && unit.endVerse !== unit.startVerse ? `-${unit.endVerse === 'end' ? 'end' : unit.endVerse}` : ''}`,
                }));
              } else {
                console.error(`[useBiblePlan] SANITIZE CRITICAL: Failed to parse string passage "${p_raw_from_firestore}" for Date ${readingDate}, Index ${pIndex}.`);
                return [{
                  book: "Error",
                  chapter: 0,
                  startVerse: undefined,
                  endVerse: undefined,
                  displayText: `Error: Unparseable String "${p_raw_from_firestore.substring(0,30)}..."`,
                }];
              }
            } else if (typeof p_raw_from_firestore === 'object' && p_raw_from_firestore !== null) {
              // Existing object sanitization logic
              let currentBook = (typeof p_raw_from_firestore.book === 'string' && p_raw_from_firestore.book.trim() !== '') ? p_raw_from_firestore.book.trim() : '';
              let currentChapterNum = 0;
              if (typeof p_raw_from_firestore.chapter === 'number' && p_raw_from_firestore.chapter > 0) {
                  currentChapterNum = p_raw_from_firestore.chapter;
              } else if (typeof p_raw_from_firestore.chapter === 'string') {
                  const parsedCh = parseInt(p_raw_from_firestore.chapter, 10);
                  if (!isNaN(parsedCh) && parsedCh > 0) {
                      currentChapterNum = parsedCh;
                  }
              }
              
              let currentStartVerse = (typeof p_raw_from_firestore.startVerse === 'number' && p_raw_from_firestore.startVerse > 0) ? p_raw_from_firestore.startVerse : undefined;
              let currentEndVerse : number | 'end' | undefined = undefined;
              if (typeof p_raw_from_firestore.endVerse === 'number' && p_raw_from_firestore.endVerse > 0) {
                  currentEndVerse = p_raw_from_firestore.endVerse;
              } else if (p_raw_from_firestore.endVerse === 'end') {
                  currentEndVerse = 'end';
              }

              let currentDisplayText = (typeof p_raw_from_firestore.displayText === 'string' && p_raw_from_firestore.displayText.trim() !== '') ? p_raw_from_firestore.displayText.trim() : '';
              
              let reconstructionNeeded = false;
              if (!currentBook || !BIBLE_BOOKS_DATA[currentBook]) {
                  currentBook = "Unknown Book";
                  reconstructionNeeded = true;
              }
              if (currentChapterNum <= 0 || (BIBLE_BOOKS_DATA[currentBook] && currentChapterNum > BIBLE_BOOKS_DATA[currentBook]!.chapters)) {
                  reconstructionNeeded = true;
                  currentChapterNum = 0; // Mark as invalid for reconstruction
              }

              if (!currentDisplayText || reconstructionNeeded) {
                  let reconstructedText = currentBook;
                  if (currentChapterNum > 0) {
                      reconstructedText += ` ${currentChapterNum}`;
                      if (currentStartVerse) {
                          reconstructedText += `:${currentStartVerse}`;
                          if (currentEndVerse && currentEndVerse !== currentStartVerse) {
                              reconstructedText += `-${currentEndVerse === 'end' ? 'end' : currentEndVerse}`;
                          } else if (currentEndVerse === undefined && currentStartVerse > 0){ // Only start verse exists
                             reconstructedText += '-end';
                          }
                      } else if (currentEndVerse === undefined) { // No start or end verse, whole chapter
                        // It's already just Book Chapter
                      }
                  } else {
                       reconstructedText = `${currentBook} (Chapter Data Error)`;
                  }
                  
                  if (!currentDisplayText || currentDisplayText.trim() === '') {
                      console.warn(`[useBiblePlan] SANITIZE: Reconstructing displayText for passage. Date: ${readingDate}, Original:`, originalPassageForLog, `Reconstructed to: "${reconstructedText}"`);
                      currentDisplayText = reconstructedText;
                  } else if (reconstructionNeeded && currentDisplayText !== reconstructedText) {
                       console.warn(`[useBiblePlan] SANITIZE: Book/Chapter issues for passage, but original displayText exists. Date: ${readingDate}, Original Display: "${currentDisplayText}", Potential Reconstruction: "${reconstructedText}". Original passage:`, originalPassageForLog);
                  }
              }
              
              if (!currentDisplayText || currentDisplayText.trim() === '') {
                  console.error(`[useBiblePlan] SANITIZE CRITICAL: displayText for passage is EMPTY after all checks. Date: ${readingDate}, Book: ${currentBook}, Ch: ${currentChapterNum}. Original passage:`, originalPassageForLog);
                  currentDisplayText = "Error: Corrupted Passage Object";
              }

              return [{ // Return as an array for flatMap
                book: currentBook,
                chapter: currentChapterNum,
                startVerse: currentStartVerse,
                endVerse: currentEndVerse,
                displayText: currentDisplayText,
              }];
            } else {
              console.error(`[useBiblePlan] SANITIZE CRITICAL: Passage data is not an object or string. Date: ${readingDate}, Index: ${pIndex}. Original:`, p_raw_from_firestore);
              return [{ // Return as an array for flatMap
                book: "Error",
                chapter: 0,
                startVerse: undefined,
                endVerse: undefined,
                displayText: "Error: Corrupted Passage Data Structure",
              }];
            }
          }) : []);
          
          // Final check on passages for this day
          passages.forEach((psg, idx) => {
            if (!psg.displayText || psg.displayText.trim() === "") {
                console.error(`[useBiblePlan] SANITIZE POST-MAP CHECK: Empty displayText for passage at index ${idx} on date ${readingDate}. Passage:`, psg ? JSON.parse(JSON.stringify(psg)): "null/undefined passage");
            }
          });

          return { date: readingDate, passages, originalDateKey: readingDate };
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

    