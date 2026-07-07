"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CleaningDay, CleaningRosterEntry, QTRosterEntry, WorshipRoster } from '@/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

type ScheduleDataContextValue = {
  cleaningRoster: CleaningRosterEntry[];
  cleaningRosterLoading: boolean;
  qtRoster: QTRosterEntry[];
  qtRosterLoading: boolean;
  cleaningDays: CleaningDay[];
  cleaningDaysLoading: boolean;
  worshipRosters: WorshipRoster[];
  worshipRostersLoading: boolean;
};

const ScheduleDataContext = createContext<ScheduleDataContextValue | null>(null);

export function ScheduleDataProvider({ children }: { children: ReactNode }) {
  const { currentUser, loadingAuth } = useAuth();
  const [cleaningRoster, setCleaningRoster] = useState<CleaningRosterEntry[]>([]);
  const [cleaningRosterLoading, setCleaningRosterLoading] = useState(true);
  const [qtRoster, setQtRoster] = useState<QTRosterEntry[]>([]);
  const [qtRosterLoading, setQtRosterLoading] = useState(true);
  const [cleaningDays, setCleaningDays] = useState<CleaningDay[]>([]);
  const [cleaningDaysLoading, setCleaningDaysLoading] = useState(true);
  const [worshipRosters, setWorshipRosters] = useState<WorshipRoster[]>([]);
  const [worshipRostersLoading, setWorshipRostersLoading] = useState(true);

  useEffect(() => {
    if (loadingAuth) return;

    if (!currentUser?.uid) {
      setCleaningRoster([]);
      setQtRoster([]);
      setCleaningDays([]);
      setWorshipRosters([]);
      setCleaningRosterLoading(false);
      setQtRosterLoading(false);
      setCleaningDaysLoading(false);
      setWorshipRostersLoading(false);
      return;
    }

    const unsubs = [
      onSnapshot(
        query(collection(db, 'cleaningRosters')),
        (snapshot) => {
          setCleaningRoster(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CleaningRosterEntry)));
          setCleaningRosterLoading(false);
        },
        () => setCleaningRosterLoading(false),
      ),
      onSnapshot(
        query(collection(db, 'qtRosters'), orderBy('date', 'asc')),
        (snapshot) => {
          setQtRoster(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as QTRosterEntry)));
          setQtRosterLoading(false);
        },
        () => setQtRosterLoading(false),
      ),
      onSnapshot(
        query(collection(db, 'cleaningDays'), orderBy('order', 'asc')),
        (snapshot) => {
          setCleaningDays(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CleaningDay)));
          setCleaningDaysLoading(false);
        },
        () => setCleaningDaysLoading(false),
      ),
      onSnapshot(
        query(collection(db, 'worshipRosters'), orderBy('date', 'desc')),
        (snapshot) => {
          setWorshipRosters(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as WorshipRoster)));
          setWorshipRostersLoading(false);
        },
        () => setWorshipRostersLoading(false),
      ),
    ];

    return () => unsubs.forEach((u) => u());
  }, [loadingAuth, currentUser?.uid]);

  const value = useMemo(
    () => ({
      cleaningRoster,
      cleaningRosterLoading,
      qtRoster,
      qtRosterLoading,
      cleaningDays,
      cleaningDaysLoading,
      worshipRosters,
      worshipRostersLoading,
    }),
    [
      cleaningRoster,
      cleaningRosterLoading,
      qtRoster,
      qtRosterLoading,
      cleaningDays,
      cleaningDaysLoading,
      worshipRosters,
      worshipRostersLoading,
    ],
  );

  return <ScheduleDataContext.Provider value={value}>{children}</ScheduleDataContext.Provider>;
}

export function useScheduleData() {
  return useContext(ScheduleDataContext);
}
