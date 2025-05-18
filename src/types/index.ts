export enum EventCategory {
  QT = "QT", // Quiet Time
  Event = "Event",
  Birthday = "Birthday",
  Snack = "Snack",
}

export interface AppEvent {
  id: string;
  date: string; // ISO string for date
  category: EventCategory;
  title: string;
  details?: string;
}

export interface BibleReadingPlan {
  startDate: string; // ISO string for date
  reference: string;
  planText: string;
  generatedDate: string; // ISO string
}
