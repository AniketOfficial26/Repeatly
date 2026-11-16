import {
  AccentId,
  RecurringRule,
  ReminderPreferences,
  Task,
  TaskTab,
  ThemeSettings,
} from '../types/todo';
import { addDays, getTodayKey } from '../utils/dateUtils';

export const ACCENT_PALETTES: Record<
  AccentId,
  {
    name: string;
    lightAccent: string;
    darkAccent: string;
    fg: string;
    cardBg: string;
    cardFg: string;
    softLight: string;
    softDark: string;
  }
> = {
  lime: {
    name: 'Acid Lime',
    lightAccent: '#C5DC2B',
    darkAccent: '#DDF247',
    fg: '#14160D',
    cardBg: '#E4F28A',
    cardFg: '#14160D',
    softLight: 'rgba(197, 220, 43, 0.22)',
    softDark: 'rgba(221, 242, 71, 0.16)',
  },
  amber: {
    name: 'Warm Amber',
    lightAccent: '#E2A025',
    darkAccent: '#F5B841',
    fg: '#1A1308',
    cardBg: '#F6D78F',
    cardFg: '#1A1308',
    softLight: 'rgba(226, 160, 37, 0.20)',
    softDark: 'rgba(245, 184, 65, 0.16)',
  },
  mint: {
    name: 'Sage Mint',
    lightAccent: '#52C484',
    darkAccent: '#7FE3A6',
    fg: '#0B1B12',
    cardBg: '#B8F0CD',
    cardFg: '#0B1B12',
    softLight: 'rgba(82, 196, 132, 0.20)',
    softDark: 'rgba(127, 227, 166, 0.16)',
  },
  coral: {
    name: 'Terracotta',
    lightAccent: '#DF6D50',
    darkAccent: '#F28A6F',
    fg: '#1B0C08',
    cardBg: '#F7C2B2',
    cardFg: '#1B0C08',
    softLight: 'rgba(223, 109, 80, 0.18)',
    softDark: 'rgba(242, 138, 111, 0.16)',
  },
  sky: {
    name: 'Sky Ice',
    lightAccent: '#489EE6',
    darkAccent: '#7CC6FE',
    fg: '#0A1622',
    cardBg: '#BCE0FD',
    cardFg: '#0A1622',
    softLight: 'rgba(72, 158, 230, 0.18)',
    softDark: 'rgba(124, 198, 254, 0.16)',
  },
};

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: 'system',
  accentId: 'lime',
  surfaceStyle: 'espresso',
  timeFormat: '12h',
  fontScale: 'standard',
  ambientGlow: true,
  userName: 'Alex',
};

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  channels: {
    sound: true,
    vibration: true,
    persistentAlert: true,
    browserNotification: false,
  },
  tone: 'chime',
  volume: 0.8,
  snoozeMinutes: 5,
};

export const DEFAULT_TABS: TaskTab[] = [
  { id: 'home', name: 'Home', icon: 'home', order: 0 },
  { id: 'work', name: 'Work', icon: 'briefcase', order: 1 },
  { id: 'personal', name: 'Personal', icon: 'sparkles', order: 2 },
];

export function createStarterTasks(): Task[] {
  const today = getTodayKey();
  const tomorrow = addDays(today, 1);
  const nowIso = new Date().toISOString();

  return [
    {
      id: 'starter-1',
      title: 'Morning kitchen & living room reset',
      notes: 'Wipe counters, run dishwasher, and clear coffee table.',
      date: today,
      time: '09:00',
      tabId: 'home',
      completed: false,
      order: 0,
      highlighted: true,
      reminderEnabled: true,
      createdAt: nowIso,
    },
    {
      id: 'starter-2',
      title: 'Grocery shopping run',
      notes: 'Oat milk, leafy greens, sourdough, espresso beans, avocados.',
      date: today,
      time: '17:30',
      tabId: 'home',
      completed: false,
      order: 1,
      highlighted: false,
      reminderEnabled: true,
      createdAt: nowIso,
    },
    {
      id: 'starter-3',
      title: 'Check HVAC filter & balcony drain maintenance',
      notes: 'Monthly home maintenance chore before weekend.',
      date: tomorrow,
      tabId: 'home',
      completed: false,
      order: 2,
      highlighted: false,
      reminderEnabled: false,
      createdAt: nowIso,
    },
    {
      id: 'starter-4',
      title: 'Review sprint priorities & design notes',
      notes: 'Finalize Q4 deliverable checklist and sync with team.',
      date: today,
      time: '11:00',
      tabId: 'work',
      completed: false,
      order: 3,
      highlighted: false,
      reminderEnabled: false,
      createdAt: nowIso,
    },
  ];
}

export function createStarterRecurring(): RecurringRule[] {
  const today = getTodayKey();
  const nowIso = new Date().toISOString();

  return [
    {
      id: 'rec-starter-1',
      title: 'Evening hydration & vitamins',
      notes: 'Persistent chime until acknowledged.',
      tabId: 'personal',
      frequency: 'daily',
      startDate: today,
      time: '21:00',
      active: true,
      reminderEnabled: true,
      completedDates: [],
      dismissedDates: [],
      createdAt: nowIso,
    },
    {
      id: 'rec-starter-2',
      title: 'Deep clean bathroom & laundry',
      notes: 'Weekly home upkeep schedule.',
      tabId: 'home',
      frequency: 'weekly',
      daysOfWeek: [0, 3], // Sun & Wed
      startDate: today,
      time: '10:00',
      active: true,
      reminderEnabled: false,
      completedDates: [],
      dismissedDates: [],
      createdAt: nowIso,
    },
  ];
}
