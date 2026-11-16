import { useMemo } from 'react';
import { BellRing, ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';
import { RecurringRule, Task, TaskTab } from '../types/todo';
import {
  addDays,
  doesRuleOccurOnDate,
  formatMonthYear,
  formatTimeDisplay,
  getTodayKey,
  getWeekStrip,
} from '../utils/dateUtils';
import { DisplayTaskItem, SwipeableTaskCard } from './SwipeableTaskCard';

interface ScheduleViewProps {
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  tasks: Task[];
  recurringRules: RecurringRule[];
  tabs: TaskTab[];
  timeFormat: '12h' | '24h';
  onOpenNewTask: (preset?: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  onToggleTaskComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleRecurringComplete: (ruleId: string, dateKey: string) => void;
  onNavigateRecurring: () => void;
}

export function ScheduleView({
  selectedDate,
  onSelectDate,
  tasks,
  recurringRules,
  tabs,
  timeFormat,
  onOpenNewTask,
  onEditTask,
  onToggleTaskComplete,
  onDeleteTask,
  onToggleRecurringComplete,
  onNavigateRecurring,
}: ScheduleViewProps) {
  const weekDays = useMemo(() => getWeekStrip(selectedDate), [selectedDate]);
  const todayKey = getTodayKey();

  const tabMap = useMemo(() => {
    const map: Record<string, TaskTab> = {};
    for (const t of tabs) map[t.id] = t;
    return map;
  }, [tabs]);

  // Combine tasks and recurring instances for selectedDate
  const dayItems = useMemo(() => {
    const regular: Array<{ item: DisplayTaskItem; rawTask?: Task }> = tasks
      .filter((t) => t.date === selectedDate)
      .map((t) => ({
        item: {
          id: t.id,
          title: t.title,
          notes: t.notes,
          date: t.date,
          time: t.time,
          tabId: t.tabId,
          completed: t.completed,
          highlighted: t.highlighted,
          reminderEnabled: t.reminderEnabled,
        },
        rawTask: t,
      }));

    const recurring: Array<{ item: DisplayTaskItem; rawTask?: Task }> = recurringRules
      .filter((r) => doesRuleOccurOnDate(r, selectedDate))
      .map((r) => ({
        item: {
          id: `rec-${r.id}-${selectedDate}`,
          title: r.title,
          notes: r.notes,
          date: selectedDate,
          time: r.time,
          tabId: r.tabId,
          completed: r.completedDates.includes(selectedDate),
          reminderEnabled: r.reminderEnabled,
          isRecurring: true,
          recurringRuleId: r.id,
        },
      }));

    const combined = [...regular, ...recurring];
    const timed = combined
      .filter((entry) => !!entry.item.time)
      .sort((a, b) => (a.item.time ?? '').localeCompare(b.item.time ?? ''));
    const anytime = combined.filter((entry) => !entry.item.time);

    return { timed, anytime };
  }, [tasks, recurringRules, selectedDate]);

  return (
    <div className="space-y-6">
      {/* Header matching reference right screen: Today's Reminders / Schedule */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {selectedDate === todayKey ? 'Today’s Schedule' : 'Day Planner'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Tasks & Reminders
          </h1>
        </div>

        <button
          type="button"
          onClick={() => onSelectDate(todayKey)}
          className="min-h-[42px] px-4 rounded-2xl border text-xs font-semibold cursor-pointer theme-transition"
          style={{
            backgroundColor: selectedDate === todayKey ? 'var(--accent)' : 'var(--bg-surface)',
            color: selectedDate === todayKey ? 'var(--accent-fg)' : 'var(--text-primary)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          Today
        </button>
      </header>

      {/* Month Navigator & Horizontal 7-day Strip (Reference Image Centerpiece) */}
      <section
        className="rounded-3xl border p-4 sm:p-5 space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
        }}
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onSelectDate(addDays(selectedDate, -7))}
            aria-label="Previous week"
            className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center border cursor-pointer theme-transition"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-hairline)',
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-sm font-semibold tracking-wide">
            {formatMonthYear(selectedDate)}
          </span>

          <button
            type="button"
            onClick={() => onSelectDate(addDays(selectedDate, 7))}
            aria-label="Next week"
            className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center border cursor-pointer theme-transition"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-hairline)',
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
          {weekDays.map((day) => {
            const isSelected = day.dateKey === selectedDate;
            return (
              <button
                key={day.dateKey}
                type="button"
                onClick={() => onSelectDate(day.dateKey)}
                className="min-h-[68px] py-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer theme-transition"
                style={{
                  backgroundColor: isSelected
                    ? 'var(--accent)'
                    : day.isToday
                    ? 'var(--bg-surface-muted)'
                    : 'transparent',
                  color: isSelected ? 'var(--accent-fg)' : 'var(--text-primary)',
                }}
              >
                <span className="text-base sm:text-lg font-bold font-mono-tabular leading-none">
                  {day.dayNum}
                </span>
                <span
                  className="text-[10px] font-semibold tracking-wider"
                  style={{
                    color: isSelected ? 'var(--accent-fg)' : 'var(--text-secondary)',
                  }}
                >
                  {day.dayShort}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Scheduled Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Scheduled Timeline
            </h2>
            <button
              type="button"
              onClick={() => onOpenNewTask({ date: selectedDate, time: '09:00', reminderEnabled: true })}
              className="min-h-[36px] px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              style={{
                backgroundColor: 'var(--accent-soft)',
                color: 'var(--text-primary)',
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Timed Reminder</span>
            </button>
          </div>

          {dayItems.timed.length === 0 ? (
            <div
              className="rounded-3xl border p-6 text-center space-y-2"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-hairline)',
              }}
            >
              <Clock className="w-6 h-6 mx-auto opacity-60" />
              <p className="text-sm font-medium">No timed tasks scheduled for this date</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Tap “Add Timed Reminder” to schedule a specific hour and persistent alarm.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dayItems.timed.map(({ item, rawTask }) => (
                <div key={item.id} className="grid grid-cols-[64px_minmax(0,1fr)] sm:grid-cols-[76px_minmax(0,1fr)] gap-3 items-start">
                  <div className="pt-4 text-right pr-1">
                    <span
                      className="text-xs font-medium font-mono-tabular whitespace-nowrap"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {formatTimeDisplay(item.time, timeFormat)}
                    </span>
                  </div>
                  <SwipeableTaskCard
                    item={item}
                    tab={tabMap[item.tabId]}
                    timeFormat={timeFormat}
                    canReorder={false}
                    onToggleComplete={() => {
                      if (item.isRecurring && item.recurringRuleId) {
                        onToggleRecurringComplete(item.recurringRuleId, selectedDate);
                      } else if (rawTask) {
                        onToggleTaskComplete(rawTask.id);
                      }
                    }}
                    onDelete={rawTask ? () => onDeleteTask(rawTask.id) : undefined}
                    onEdit={() => {
                      if (rawTask) onEditTask(rawTask);
                      else onNavigateRecurring();
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Anytime / Flexible Tasks for the Day */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Anytime ({dayItems.anytime.length})
            </h2>
            <button
              type="button"
              onClick={() => onOpenNewTask({ date: selectedDate })}
              className="text-xs font-semibold underline underline-offset-4 cursor-pointer"
            >
              + Add Flexible
            </button>
          </div>

          {dayItems.anytime.length === 0 ? (
            <div
              className="rounded-3xl border p-5 text-sm"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-hairline)',
                color: 'var(--text-secondary)',
              }}
            >
              No untimed tasks on this date.
            </div>
          ) : (
            <div className="space-y-2.5">
              {dayItems.anytime.map(({ item, rawTask }) => (
                <SwipeableTaskCard
                  key={item.id}
                  item={item}
                  tab={tabMap[item.tabId]}
                  timeFormat={timeFormat}
                  canReorder={false}
                  onToggleComplete={() => {
                    if (item.isRecurring && item.recurringRuleId) {
                      onToggleRecurringComplete(item.recurringRuleId, selectedDate);
                    } else if (rawTask) {
                      onToggleTaskComplete(rawTask.id);
                    }
                  }}
                  onDelete={rawTask ? () => onDeleteTask(rawTask.id) : undefined}
                  onEdit={() => {
                    if (rawTask) onEditTask(rawTask);
                    else onNavigateRecurring();
                  }}
                />
              ))}
            </div>
          )}

          <div
            className="rounded-3xl border p-4 flex items-start gap-3 text-xs"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
              color: 'var(--text-secondary)',
            }}
          >
            <BellRing className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Tasks with Persistent Alarm enabled play a continuous tone until you manually acknowledge and dismiss them.
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
