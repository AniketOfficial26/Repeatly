import { RecurringRule } from '../types/todo';

export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

export function addDays(dateKey: string, delta: number): string {
  const dt = parseLocalDateKey(dateKey);
  dt.setDate(dt.getDate() + delta);
  return toLocalDateKey(dt);
}

export function getTodayKey(): string {
  return toLocalDateKey(new Date());
}

export function formatTimeDisplay(time24: string | undefined, format: '12h' | '24h'): string {
  if (!time24) return 'Anytime';
  const [hhStr, mmStr] = time24.split(':');
  const hh = parseInt(hhStr, 10);
  const mm = parseInt(mmStr, 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return time24;
  if (format === '24h') {
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}:${String(mm).padStart(2, '0')} ${suffix}`;
}

export function formatDateFriendly(dateKey: string): string {
  const today = getTodayKey();
  if (dateKey === today) return 'Today';
  if (dateKey === addDays(today, 1)) return 'Tomorrow';
  if (dateKey === addDays(today, -1)) return 'Yesterday';
  const dt = parseLocalDateKey(dateKey);
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatMonthYear(dateKey: string): string {
  const dt = parseLocalDateKey(dateKey);
  return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function getWeekStrip(centerDateKey: string): Array<{
  dateKey: string;
  dayNum: number;
  dayShort: string;
  isToday: boolean;
}> {
  const center = parseLocalDateKey(centerDateKey);
  // Show 7 days centered on week starting Sunday or 3 days before/after center
  const start = new Date(center);
  start.setDate(center.getDate() - 3);
  const todayKey = getTodayKey();

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = toLocalDateKey(d);
    return {
      dateKey: key,
      dayNum: d.getDate(),
      dayShort: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      isToday: key === todayKey,
    };
  });
}

export function doesRuleOccurOnDate(rule: RecurringRule, dateKey: string): boolean {
  if (!rule.active) return false;
  if (dateKey < rule.startDate) return false;

  const target = parseLocalDateKey(dateKey);
  const start = parseLocalDateKey(rule.startDate);

  switch (rule.frequency) {
    case 'daily':
      return true;
    case 'weekly': {
      const days = rule.daysOfWeek && rule.daysOfWeek.length > 0 ? rule.daysOfWeek : [start.getDay()];
      return days.includes(target.getDay());
    }
    case 'monthly': {
      const targetDay = rule.dayOfMonth ?? start.getDate();
      return target.getDate() === targetDay;
    }
    case 'interval': {
      const every = Math.max(1, rule.intervalDays ?? 2);
      const diffMs = target.getTime() - start.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays % every === 0;
    }
    default:
      return false;
  }
}

export function describeRecurrence(rule: RecurringRule): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  switch (rule.frequency) {
    case 'daily':
      return 'Every day';
    case 'weekly': {
      const days = (rule.daysOfWeek && rule.daysOfWeek.length > 0 ? rule.daysOfWeek : [0])
        .slice()
        .sort((a, b) => a - b)
        .map((d) => dayNames[d]);
      return `Weekly · ${days.join(', ')}`;
    }
    case 'monthly': {
      const d = rule.dayOfMonth ?? 1;
      const mod10 = d % 10;
      const mod100 = d % 100;
      const suffix =
        mod10 === 1 && mod100 !== 11
          ? 'st'
          : mod10 === 2 && mod100 !== 12
          ? 'nd'
          : mod10 === 3 && mod100 !== 13
          ? 'rd'
          : 'th';
      return `Monthly · ${d}${suffix}`;
    }
    case 'interval': {
      const n = Math.max(1, rule.intervalDays ?? 2);
      return `Every ${n} days`;
    }
    default:
      return 'Custom';
  }
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}
