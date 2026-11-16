import React, { useMemo, useState } from 'react';
import {
  BellRing,
  Check,
  Pause,
  Play,
  Plus,
  Repeat,
  Trash2,
  X,
} from 'lucide-react';
import {
  RecurrenceFrequency,
  RecurringRule,
  ReminderChannels,
  ReminderPreferences,
  TaskTab,
} from '../types/todo';
import {
  describeRecurrence,
  formatTimeDisplay,
  getTodayKey,
} from '../utils/dateUtils';
import { TabIcon } from './TabIcon';
import { TimePicker } from './TimePicker';

interface RecurringViewProps {
  rules: RecurringRule[];
  tabs: TaskTab[];
  timeFormat: '12h' | '24h';
  globalReminderPrefs: ReminderPreferences;
  onSaveRule: (rule: RecurringRule) => void;
  onDeleteRule: (ruleId: string) => void;
  onToggleRuleActive: (ruleId: string) => void;
  onToggleCompleteToday: (ruleId: string, dateKey: string) => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function RecurringView({
  rules,
  tabs,
  timeFormat,
  globalReminderPrefs,
  onSaveRule,
  onDeleteRule,
  onToggleRuleActive,
  onToggleCompleteToday,
}: RecurringViewProps) {
  const todayKey = getTodayKey();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [tabId, setTabId] = useState(tabs[0]?.id ?? 'home');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 3, 5]);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [intervalDays, setIntervalDays] = useState<number>(3);
  const [hasTime, setHasTime] = useState(true);
  const [time, setTime] = useState('09:00');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [channels, setChannels] = useState<ReminderChannels>(globalReminderPrefs.channels);

  const tabMap = useMemo(() => {
    const map: Record<string, TaskTab> = {};
    for (const t of tabs) map[t.id] = t;
    return map;
  }, [tabs]);

  const openCreateForm = () => {
    setEditingId(null);
    setTitle('');
    setNotes('');
    setTabId(tabs[0]?.id ?? 'home');
    setFrequency('daily');
    setDaysOfWeek([1, 3, 5]);
    setDayOfMonth(new Date().getDate());
    setIntervalDays(3);
    setHasTime(true);
    setTime('09:00');
    setReminderEnabled(true);
    setChannels(globalReminderPrefs.channels);
    setIsFormOpen(true);
  };

  const openEditForm = (rule: RecurringRule) => {
    setEditingId(rule.id);
    setTitle(rule.title);
    setNotes(rule.notes ?? '');
    setTabId(rule.tabId);
    setFrequency(rule.frequency);
    setDaysOfWeek(rule.daysOfWeek ?? [1, 3, 5]);
    setDayOfMonth(rule.dayOfMonth ?? 1);
    setIntervalDays(rule.intervalDays ?? 3);
    setHasTime(!!rule.time);
    setTime(rule.time ?? '09:00');
    setReminderEnabled(rule.reminderEnabled);
    setChannels({
      ...globalReminderPrefs.channels,
      ...rule.reminderChannels,
    });
    setIsFormOpen(true);
  };

  const toggleWeekday = (dayIdx: number) => {
    setDaysOfWeek((prev) => {
      if (prev.includes(dayIdx)) {
        return prev.length > 1 ? prev.filter((d) => d !== dayIdx) : prev;
      }
      return [...prev, dayIdx].sort((a, b) => a - b);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const existing = editingId ? rules.find((r) => r.id === editingId) : undefined;
    const nextRule: RecurringRule = {
      id: existing?.id ?? `rec-${Date.now()}`,
      title: trimmed,
      notes: notes.trim() || undefined,
      tabId,
      frequency,
      daysOfWeek: frequency === 'weekly' ? daysOfWeek : undefined,
      dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
      intervalDays: frequency === 'interval' ? Math.max(1, intervalDays) : undefined,
      startDate: existing?.startDate ?? todayKey,
      time: hasTime ? time : undefined,
      active: existing?.active ?? true,
      reminderEnabled: hasTime ? reminderEnabled : false,
      reminderChannels: hasTime && reminderEnabled ? channels : undefined,
      completedDates: existing?.completedDates ?? [],
      dismissedDates: existing?.dismissedDates ?? [],
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };

    onSaveRule(nextRule);
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Automated Routines
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Recurring Tasks & Reminders
          </h1>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="min-h-[44px] px-4 rounded-2xl font-semibold text-sm flex items-center gap-2 cursor-pointer shrink-0 transition-transform active:scale-95"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-fg)',
          }}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Routine</span>
        </button>
      </header>

      {/* Create / Edit Inline Panel or Drawer */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border p-5 sm:p-6 space-y-5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">
              {editingId ? 'Edit Recurring Task' : 'Create Recurring Task'}
            </h2>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              aria-label="Close form"
              className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Task Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Water plants, Take vitamins, Weekly groceries"
                className="w-full min-h-[46px] px-4 rounded-2xl border text-sm outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-hairline)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Assign to Tab
              </label>
              <select
                value={tabId}
                onChange={(e) => setTabId(e.target.value)}
                className="w-full min-h-[46px] px-4 rounded-2xl border text-sm outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-hairline)',
                  color: 'var(--text-primary)',
                }}
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any details or checklist notes..."
              className="w-full min-h-[44px] px-4 rounded-2xl border text-sm outline-none"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-hairline)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Recurrence Frequency */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>
              Repeat Frequency
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'daily', label: 'Daily' },
                  { id: 'weekly', label: 'Weekly' },
                  { id: 'monthly', label: 'Monthly' },
                  { id: 'interval', label: 'Every N Days' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFrequency(opt.id)}
                  className="min-h-[42px] px-3 rounded-2xl border text-xs font-semibold cursor-pointer theme-transition"
                  style={{
                    backgroundColor:
                      frequency === opt.id ? 'var(--accent)' : 'var(--bg-surface-elevated)',
                    color:
                      frequency === opt.id ? 'var(--accent-fg)' : 'var(--text-primary)',
                    borderColor:
                      frequency === opt.id ? 'transparent' : 'var(--border-hairline)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {frequency === 'weekly' && (
              <div className="flex flex-wrap gap-2 pt-2">
                {WEEKDAY_LABELS.map((label, idx) => {
                  const selected = daysOfWeek.includes(idx);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleWeekday(idx)}
                      className="min-w-[44px] min-h-[44px] px-2.5 rounded-2xl border text-xs font-semibold cursor-pointer theme-transition"
                      style={{
                        backgroundColor: selected ? 'var(--accent)' : 'var(--bg-surface-elevated)',
                        color: selected ? 'var(--accent-fg)' : 'var(--text-secondary)',
                        borderColor: selected ? 'transparent' : 'var(--border-hairline)',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {frequency === 'monthly' && (
              <div className="flex items-center gap-3 pt-2">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Day of month:
                </span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-24 min-h-[42px] px-3 rounded-xl border text-sm font-mono-tabular outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-hairline)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            )}

            {frequency === 'interval' && (
              <div className="flex items-center gap-3 pt-2">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Repeat every
                </span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(Math.max(1, Number(e.target.value) || 1))}
                  className="w-24 min-h-[42px] px-3 rounded-xl border text-sm font-mono-tabular outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-hairline)',
                    color: 'var(--text-primary)',
                  }}
                />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  days
                </span>
              </div>
            )}
          </div>

          {/* Time & Reminder Delivery Options */}
          <div
            className="rounded-2xl border p-4 space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-hairline)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 text-sm font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasTime}
                  onChange={(e) => setHasTime(e.target.checked)}
                  className="w-4 h-4 accent-current"
                />
                <span>Schedule specific time</span>
              </label>

              {hasTime && <TimePicker value={time} format={timeFormat} onChange={setTime} />}
            </div>

            {hasTime && (
              <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="text-sm font-medium">
                    Trigger persistent reminder at scheduled time
                  </span>
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                </label>

                {reminderEnabled && (
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { key: 'sound', label: 'Continuous Sound' },
                        { key: 'vibration', label: 'Vibration' },
                        { key: 'persistentAlert', label: 'Persistent Screen Alert' },
                      ] as const
                    ).map((ch) => {
                      const active = channels[ch.key];
                      return (
                        <button
                          key={ch.key}
                          type="button"
                          onClick={() =>
                            setChannels((prev) => ({ ...prev, [ch.key]: !prev[ch.key] }))
                          }
                          className="min-h-[38px] px-3.5 rounded-xl border text-xs font-medium cursor-pointer theme-transition"
                          style={{
                            backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-surface)',
                            borderColor: active ? 'var(--accent)' : 'var(--border-hairline)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {active ? '✓ ' : ''}
                          {ch.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="min-h-[44px] px-5 rounded-2xl border text-sm font-medium cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-hairline)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-6 rounded-2xl text-sm font-semibold cursor-pointer"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-fg)',
              }}
            >
              {editingId ? 'Save Changes' : 'Create Routine'}
            </button>
          </div>
        </form>
      )}

      {/* Rules List */}
      {rules.length === 0 ? (
        <div
          className="rounded-3xl border p-8 text-center space-y-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <Repeat className="w-8 h-8 mx-auto opacity-60" />
          <p className="text-base font-semibold">No recurring routines yet</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Create daily chores, weekly maintenance schedules, or persistent daily reminders.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule) => {
            const tab = tabMap[rule.tabId];
            const doneToday = rule.completedDates.includes(todayKey);

            return (
              <div
                key={rule.id}
                className={`rounded-3xl border p-5 flex flex-col justify-between gap-4 theme-transition ${
                  !rule.active ? 'opacity-60' : ''
                }`}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-hairline)',
                }}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => openEditForm(rule)}
                      className="text-left flex-1 min-w-0 cursor-pointer"
                    >
                      <h3 className="text-base font-semibold leading-snug break-words">
                        {rule.title}
                      </h3>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleCompleteToday(rule.id, todayKey)}
                      aria-label={doneToday ? 'Mark incomplete today' : 'Mark complete today'}
                      className="min-w-[40px] min-h-[40px] rounded-full border flex items-center justify-center shrink-0 cursor-pointer theme-transition"
                      style={{
                        backgroundColor: doneToday ? 'var(--accent)' : 'transparent',
                        borderColor: doneToday ? 'transparent' : 'var(--border-hairline)',
                        color: doneToday ? 'var(--accent-fg)' : 'var(--text-secondary)',
                      }}
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>

                  {rule.notes && (
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {rule.notes}
                    </p>
                  )}

                  {/* Unboxed Metadata */}
                  <div
                    className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium pt-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {tab && (
                      <span className="inline-flex items-center gap-1">
                        <TabIcon name={tab.icon} className="w-3.5 h-3.5" />
                        <span>{tab.name}</span>
                      </span>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>{describeRecurrence(rule)}</span>
                    {rule.time && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">
                          {formatTimeDisplay(rule.time, timeFormat)}
                        </span>
                      </>
                    )}
                    {rule.reminderEnabled && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <BellRing className="w-3.5 h-3.5" />
                          <span>Alarm</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action Row */}
                <div
                  className="pt-3 border-t flex items-center justify-between gap-2"
                  style={{ borderColor: 'var(--border-hairline)' }}
                >
                  <button
                    type="button"
                    onClick={() => onToggleRuleActive(rule.id)}
                    className="min-h-[38px] px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {rule.active ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Resume</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(rule)}
                      className="min-h-[38px] px-3 rounded-xl text-xs font-medium cursor-pointer"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRule(rule.id)}
                      aria-label={`Delete ${rule.title}`}
                      className="min-w-[38px] min-h-[38px] rounded-xl flex items-center justify-center cursor-pointer text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
