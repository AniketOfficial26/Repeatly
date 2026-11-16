import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, parseLocalDateKey, toLocalDateKey } from '../utils/dateUtils';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const selected = parseLocalDateKey(value);
  const [year, month] = [selected.getFullYear(), selected.getMonth()];
  const firstDay = new Date(year, month, 1);
  const firstGridDay = new Date(year, month, 1 - firstDay.getDay());
  const todayKey = toLocalDateKey(new Date());
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstGridDay);
    day.setDate(firstGridDay.getDate() + index);
    return day;
  });

  const moveMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    const nextDay = Math.min(selected.getDate(), new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate());
    onChange(toLocalDateKey(new Date(next.getFullYear(), next.getMonth(), nextDay)));
  };

  return (
    <div
      className="rounded-2xl border p-3 space-y-3"
      style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-hairline)' }}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          aria-label="Previous month"
          className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold">
          {selected.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          aria-label="Next month"
          className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <span key={`${day}-${index}`} className="py-1 text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
            {day}
          </span>
        ))}
        {days.map((day) => {
          const dayKey = toLocalDateKey(day);
          const isSelected = dayKey === value;
          const isToday = dayKey === todayKey;
          const isCurrentMonth = monthKey(day) === `${year}-${month}`;
          return (
            <button
              key={dayKey}
              type="button"
              onClick={() => onChange(dayKey)}
              className="relative aspect-square rounded-xl text-xs font-semibold cursor-pointer theme-transition"
              style={{
                backgroundColor: isSelected ? 'var(--accent)' : isToday ? 'var(--accent-soft)' : 'transparent',
                color: isSelected ? 'var(--accent-fg)' : isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {day.getDate()}
              {isToday && !isSelected && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onChange(todayKey)}
        className="text-xs font-semibold cursor-pointer"
        style={{ color: 'var(--text-secondary)' }}
      >
        Today · {addDays(todayKey, 0)}
      </button>
    </div>
  );
}
