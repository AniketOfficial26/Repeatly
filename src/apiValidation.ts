import type {
  RecurringRule,
  Task,
  TaskTab,
} from './types/todo.ts';

const MAX_TEXT = 5000;
const MAX_TITLE = 200;
const MAX_TAB_NAME = 100;
const MAX_ID = 128;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_ID;
}

function isText(value: unknown, maxLength = MAX_TEXT): value is string {
  return typeof value === 'string' && value.length <= maxLength;
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isTimeKey(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));
}

function validateChannels(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isObject(value)) return false;
  const allowedKeys = ['sound', 'vibration', 'persistentAlert', 'browserNotification'];
  return Object.entries(value).every(
    ([key, item]) => allowedKeys.includes(key) && typeof item === 'boolean'
  );
}

export function validateId(value: unknown): boolean {
  return isId(value);
}

export function validateTab(value: unknown): value is TaskTab {
  if (!isObject(value)) return false;
  return (
    isId(value.id) &&
    isText(value.name, MAX_TAB_NAME) &&
    value.name.length > 0 &&
    isText(value.icon, 40) &&
    Number.isInteger(value.order) &&
    (value.order as number) >= -100000 &&
    (value.order as number) <= 100000
  );
}

export function validateTask(value: unknown): value is Task {
  if (!isObject(value)) return false;
  return (
    isId(value.id) &&
    isText(value.title, MAX_TITLE) &&
    value.title.trim().length > 0 &&
    (value.notes === undefined || isText(value.notes)) &&
    isDateKey(value.date) &&
    (value.time === undefined || value.time === null || isTimeKey(value.time)) &&
    isId(value.tabId) &&
    typeof value.completed === 'boolean' &&
    Number.isInteger(value.order) &&
    (value.order as number) >= -100000 &&
    (value.order as number) <= 100000 &&
    typeof value.reminderEnabled === 'boolean' &&
    validateChannels(value.reminderChannels) &&
    (value.completedAt === undefined || value.completedAt === null || isIsoDate(value.completedAt)) &&
    (value.reminderDismissedAt === undefined ||
      value.reminderDismissedAt === null ||
      isIsoDate(value.reminderDismissedAt)) &&
    (value.snoozedUntil === undefined ||
      value.snoozedUntil === null ||
      isIsoDate(value.snoozedUntil)) &&
    (value.deletedAt === undefined ||
      value.deletedAt === null ||
      isIsoDate(value.deletedAt)) &&
    typeof value.createdAt === 'string' &&
    value.createdAt.length <= 40
  );
}

export function validateRecurringRule(value: unknown): value is RecurringRule {
  if (!isObject(value)) return false;
  if (!['daily', 'weekly', 'monthly', 'interval'].includes(String(value.frequency))) return false;
  if (!isId(value.id) || !isText(value.title, MAX_TITLE) || value.title.trim().length === 0) return false;
  if (value.notes !== undefined && !isText(value.notes)) return false;
  if (!isId(value.tabId) || !isDateKey(value.startDate)) return false;
  if (value.time !== undefined && value.time !== null && !isTimeKey(value.time)) return false;
  if (typeof value.active !== 'boolean' || typeof value.reminderEnabled !== 'boolean') return false;
  if (!validateChannels(value.reminderChannels)) return false;
  if (!Array.isArray(value.completedDates) || value.completedDates.length > 366) return false;
  if (!Array.isArray(value.dismissedDates) || value.dismissedDates.length > 366) return false;
  if (!value.completedDates.every(isDateKey) || !value.dismissedDates.every(isDateKey)) return false;
  if (
    value.daysOfWeek !== undefined &&
    (!Array.isArray(value.daysOfWeek) ||
      value.daysOfWeek.length > 7 ||
      !value.daysOfWeek.every((day) => Number.isInteger(day) && day >= 0 && day <= 6))
  ) return false;
  if (
    value.dayOfMonth !== undefined &&
    value.dayOfMonth !== null &&
    (!Number.isInteger(value.dayOfMonth) ||
      (value.dayOfMonth as number) < 1 ||
      (value.dayOfMonth as number) > 31)
  ) return false;
  if (
    value.intervalDays !== undefined &&
    value.intervalDays !== null &&
    (!Number.isInteger(value.intervalDays) ||
      (value.intervalDays as number) < 1 ||
      (value.intervalDays as number) > 365)
  ) return false;
  return typeof value.createdAt === 'string' && value.createdAt.length <= 40;
}

export function validatePreferences(
  themeSettings: unknown,
  reminderPrefs: unknown
): boolean {
  const validTheme =
    themeSettings === undefined ||
    (isObject(themeSettings) &&
      ['system', 'light', 'dark'].includes(String(themeSettings.mode)) &&
      ['espresso', 'slate', 'contrast'].includes(String(themeSettings.surfaceStyle)) &&
      ['compact', 'standard', 'comfortable'].includes(String(themeSettings.fontScale)) &&
      ['lime', 'amber', 'mint', 'coral', 'sky'].includes(String(themeSettings.accentId)) &&
      ['12h', '24h'].includes(String(themeSettings.timeFormat)) &&
      typeof themeSettings.ambientGlow === 'boolean' &&
      isText(themeSettings.userName, 100));

  const validReminder =
    reminderPrefs === undefined ||
    (isObject(reminderPrefs) &&
      isObject(reminderPrefs.channels) &&
      Object.values(reminderPrefs.channels).every((item) => typeof item === 'boolean') &&
      ['chime', 'beacon', 'bell', 'pulse'].includes(String(reminderPrefs.tone)) &&
      typeof reminderPrefs.volume === 'number' &&
      reminderPrefs.volume >= 0 &&
      reminderPrefs.volume <= 1 &&
      Number.isInteger(reminderPrefs.snoozeMinutes) &&
      (reminderPrefs.snoozeMinutes as number) >= 1 &&
      (reminderPrefs.snoozeMinutes as number) <= 1440);

  return validTheme && validReminder;
}
