"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import type { CleaningDay, CleaningRosterEntry, QTRosterEntry, WorshipRoster } from '@/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import {
  COLLECTION_CACHE_TTL_MS,
  readLocalCollectionCache,
  readLocalCollectionCacheStale,
  writeLocalCollectionCache,
} from '@/lib/collection-cache';

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

const CACHE_KEYS = {
  cleaningRoster: 'schedule_cleaning_rosters_v1',
  qtRoster: 'schedule_qt_rosters_v1',
  cleaningDays: 'schedule_cleaning_days_v1',
  worshipRosters: 'schedule_worship_rosters_v1',
} as const;

function needsLiveSchedule(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname.startsWith('/qt') ||
    pathname.startsWith('/cleaning-roster') ||
    pathname.startsWith('/rosters') ||
    pathname.startsWith('/events') ||
    pathname.startsWith('/admin')
  );
}

function readCached<T>(key: string): T[] {
  return readLocalCollectionCacheStale<T[]>(key) ?? [];
}

export function ScheduleDataProvider({ children }: { children: ReactNode }) {
  const { currentUser, loadingAuth } = useAuth();
  const pathname = usePathname();
  const live = needsLiveSchedule(pathname);

  const [cleaningRoster, setCleaningRoster] = useState<CleaningRosterEntry[]>(() =>
    readCached(CACHE_KEYS.cleaningRoster),
  );
  const [cleaningRosterLoading, setCleaningRosterLoading] = useState(cleaningRoster.length === 0);
  const [qtRoster, setQtRoster] = useState<QTRosterEntry[]>(() => readCached(CACHE_KEYS.qtRoster));
  const [qtRosterLoading, setQtRosterLoading] = useState(qtRoster.length === 0);
  const [cleaningDays, setCleaningDays] = useState<CleaningDay[]>(() =>
    readCached(CACHE_KEYS.cleaningDays),
  );
  const [cleaningDaysLoading, setCleaningDaysLoading] = useState(cleaningDays.length === 0);
  const [worshipRosters, setWorshipRosters] = useState<WorshipRoster[]>(() =>
    readCached(CACHE_KEYS.worshipRosters),
  );
  const [worshipRostersLoading, setWorshipRostersLoading] = useState(worshipRosters.length === 0);

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

    if (live) {
      const unsubs = [
        onSnapshot(
          query(collection(db, 'cleaningRosters')),
          (snapshot) => {
            const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CleaningRosterEntry));
            setCleaningRoster(data);
            writeLocalCollectionCache(CACHE_KEYS.cleaningRoster, data);
            setCleaningRosterLoading(false);
          },
          () => setCleaningRosterLoading(false),
        ),
        onSnapshot(
          query(collection(db, 'qtRosters'), orderBy('date', 'asc')),
          (snapshot) => {
            const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as QTRosterEntry));
            setQtRoster(data);
            writeLocalCollectionCache(CACHE_KEYS.qtRoster, data);
            setQtRosterLoading(false);
          },
          () => setQtRosterLoading(false),
        ),
        onSnapshot(
          query(collection(db, 'cleaningDays'), orderBy('order', 'asc')),
          (snapshot) => {
            const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CleaningDay));
            setCleaningDays(data);
            writeLocalCollectionCache(CACHE_KEYS.cleaningDays, data);
            setCleaningDaysLoading(false);
          },
          () => setCleaningDaysLoading(false),
        ),
        onSnapshot(
          query(collection(db, 'worshipRosters'), orderBy('date', 'desc')),
          (snapshot) => {
            const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as WorshipRoster));
            setWorshipRosters(data);
            writeLocalCollectionCache(CACHE_KEYS.worshipRosters, data);
            setWorshipRostersLoading(false);
          },
          () => setWorshipRostersLoading(false),
        ),
      ];
      return () => unsubs.forEach((u) => u());
    }

    let cancelled = false;

    const loadOneShot = async () => {
      const load = async <T,>(
        key: string,
        fetchDocs: () => Promise<T[]>,
        setData: (v: T[]) => void,
        setLoading: (v: boolean) => void,
      ) => {
        const fresh = readLocalCollectionCache<T[]>(key, COLLECTION_CACHE_TTL_MS);
        if (fresh?.length) {
          setData(fresh);
          setLoading(false);
          return;
        }
        const stale = readCached<T>(key);
        if (stale.length > 0) {
          setData(stale);
          setLoading(false);
        }
        try {
          const data = await fetchDocs();
          if (cancelled) return;
          setData(data);
          writeLocalCollectionCache(key, data);
          setLoading(false);
        } catch {
          if (!cancelled) setLoading(false);
        }
      };

      await Promise.all([
        load(
          CACHE_KEYS.cleaningRoster,
          async () => {
            const snap = await getDocs(query(collection(db, 'cleaningRosters')));
            return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CleaningRosterEntry));
          },
          setCleaningRoster,
          setCleaningRosterLoading,
        ),
        load(
          CACHE_KEYS.qtRoster,
          async () => {
            const snap = await getDocs(query(collection(db, 'qtRosters'), orderBy('date', 'asc')));
            return snap.docs.map((d) => ({ id: d.id, ...d.data() } as QTRosterEntry));
          },
          setQtRoster,
          setQtRosterLoading,
        ),
        load(
          CACHE_KEYS.cleaningDays,
          async () => {
            const snap = await getDocs(query(collection(db, 'cleaningDays'), orderBy('order', 'asc')));
            return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CleaningDay));
          },
          setCleaningDays,
          setCleaningDaysLoading,
        ),
        load(
          CACHE_KEYS.worshipRosters,
          async () => {
            const snap = await getDocs(
              query(collection(db, 'worshipRosters'), orderBy('date', 'desc')),
            );
            return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorshipRoster));
          },
          setWorshipRosters,
          setWorshipRostersLoading,
        ),
      ]);
    };

    void loadOneShot();

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const allFresh =
        readLocalCollectionCache(CACHE_KEYS.cleaningRoster, COLLECTION_CACHE_TTL_MS) &&
        readLocalCollectionCache(CACHE_KEYS.qtRoster, COLLECTION_CACHE_TTL_MS) &&
        readLocalCollectionCache(CACHE_KEYS.cleaningDays, COLLECTION_CACHE_TTL_MS) &&
        readLocalCollectionCache(CACHE_KEYS.worshipRosters, COLLECTION_CACHE_TTL_MS);
      if (allFresh) return;
      void loadOneShot();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadingAuth, currentUser?.uid, live]);

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
