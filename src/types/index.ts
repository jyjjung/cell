
export enum EventCategory {
  QT = "QT", // Quiet Time
  Event = "Event",
  Birthday = "Birthday",
  Snack = "Snack",
}

export interface AppEvent {
  id: string; // Firestore document ID
  date: string; // ISO string for date
  category: EventCategory;
  title: string;
  details?: string;
  createdAt?: firebase.firestore.Timestamp; // Optional: for Firestore server timestamp
  updatedAt?: firebase.firestore.Timestamp; // Optional: for Firestore server timestamp
}

export interface DailyReading {
  date: string; // YYYY-MM-DD, not a Sunday
  passages: string[]; // Array of scripture references, e.g., ["Genesis 1", "Genesis 2", "Exodus 1:1-15"]
}

export interface BibleReadingPlan {
  id?: string; // Firestore document ID (e.g., "current")
  originalReferenceInput: string; // The raw input string from admin
  startDate: string; // ISO string for plan's start date
  dailyReadings: DailyReading[];
  generatedDate: string; // ISO string of when this plan was generated
  updatedAt?: firebase.firestore.Timestamp; // Optional: for Firestore server timestamp
}
