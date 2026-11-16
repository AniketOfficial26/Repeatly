import { Clock3 } from 'lucide-react';
import { formatTimeDisplay } from '../utils/dateUtils';

interface TimePickerProps {
  value: string;
  format: '12h' | '24h';
  onChange: (value: string) => void;
}

function parseTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return {
    hours: Number.isFinite(hours) ? hours : 9,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  };
}

export function TimePicker({ value, format, onChange }: TimePickerProps) {
  const parsed = parseTime(value);
  const is12Hour = format === '12h';
  const displayHour = is12Hour ? (parsed.hours % 12 || 12) : parsed.hours;
  const period = parsed.hours >= 12 ? 'PM' : 'AM';
  const setTime = (hour: number, minute: number, nextPeriod = period) => {
    const nextHour = is12Hour ? (hour % 12) + (nextPeriod === 'PM' ? 12 : 0) : hour;
    onChange(`${String(nextHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  };
  const hourOptions = Array.from({ length: is12Hour ? 12 : 24 }, (_, index) => (is12Hour ? index + 1 : index));
  const minuteOptions = [0, 15, 30, 45];

  return (
    <div className="rounded-2xl border p-3 space-y-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}>
      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
        <Clock3 className="w-4 h-4" />
        <span>{formatTimeDisplay(value, format)}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
        <select
          value={displayHour}
          onChange={(event) => setTime(Number(event.target.value), parsed.minutes)}
          className="min-h-11 rounded-xl border px-3 text-sm font-semibold outline-none"
          style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-hairline)', color: 'var(--text-primary)' }}
        >
          {hourOptions.map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}</option>)}
        </select>
        <span className="font-bold">:</span>
        <select
          value={parsed.minutes}
          onChange={(event) => setTime(displayHour, Number(event.target.value))}
          className="min-h-11 rounded-xl border px-3 text-sm font-semibold outline-none"
          style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-hairline)', color: 'var(--text-primary)' }}
        >
          {minuteOptions.map((minute) => <option key={minute} value={minute}>{String(minute).padStart(2, '0')}</option>)}
        </select>
        {is12Hour && (
          <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-hairline)' }}>
            {(['AM', 'PM'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTime(displayHour, parsed.minutes, option)}
                className="px-2.5 py-2 rounded-lg text-xs font-bold cursor-pointer"
                style={{ backgroundColor: period === option ? 'var(--accent)' : 'transparent', color: period === option ? 'var(--accent-fg)' : 'var(--text-secondary)' }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
