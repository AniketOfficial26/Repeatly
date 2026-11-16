export type NavSection = 'tasks' | 'schedule' | 'recurring' | 'settings';

export type ThemeMode = 'system' | 'light' | 'dark';

export type SurfaceStyle = 'espresso' | 'slate' | 'contrast';

export type FontScale = 'compact' | 'standard' | 'comfortable';

export type AccentId = 'lime' | 'amber' | 'mint' | 'coral' | 'sky';

export type AlarmTone = 'chime' | 'beacon' | 'bell' | 'pulse';

export interface ReminderChannels {
  sound: boolean;
  vibration: boolean;
  persistentAlert: boolean;
  browserNotification: boolean;
}

export interface ReminderPreferences {
  channels: ReminderChannels;
  tone: AlarmTone;
  volume: number; // 0.1 to 1.0
  snoozeMinutes: number;
}

export interface ThemeSettings {
  mode: ThemeMode;
  accentId: AccentId;
  surfaceStyle: SurfaceStyle;
  timeFormat: '12h' | '24h';
  fontScale: FontScale;
  ambientGlow: boolean;
  userName: string;
}

export interface TaskTab {
  id: string;
  name: string;
  icon: string;
  order: number;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  date: string; // YYYY-MM-DD local date
  time?: string; // Optional HH:mm (24h)
  tabId: string;
  completed: boolean;
  completedAt?: string;
  order: number;
  highlighted?: boolean;
  reminderEnabled: boolean;
  reminderChannels?: Partial<ReminderChannels>; // Optional per-task override
  reminderDismissedAt?: string; // ISO string when acknowledged for current schedule
  snoozedUntil?: string; // ISO string if snoozed
  deletedAt?: string; // ISO string when soft-deleted (purged after 30 days)
  createdAt: string;
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'interval';

export interface RecurringRule {
  id: string;
  title: string;
  notes?: string;
  tabId: string;
  frequency: RecurrenceFrequency;
  daysOfWeek?: number[]; // 0=Sun..6=Sat for weekly
  dayOfMonth?: number; // 1..31 for monthly
  intervalDays?: number; // N days for interval
  startDate: string; // YYYY-MM-DD
  time?: string; // Optional HH:mm
  active: boolean;
  reminderEnabled: boolean;
  reminderChannels?: Partial<ReminderChannels>;
  completedDates: string[]; // YYYY-MM-DD list
  dismissedDates: string[]; // YYYY-MM-DD list where alarm was acknowledged
  createdAt: string;
}

export interface ActiveAlert {
  alertId: string;
  sourceType: 'task' | 'recurring' | 'test';
  sourceId: string;
  title: string;
  notes?: string;
  tabName: string;
  scheduledDate: string;
  scheduledTime?: string;
  channels: ReminderChannels;
  triggeredAt: string;
}
