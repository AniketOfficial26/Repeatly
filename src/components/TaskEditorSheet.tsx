import React, { useEffect, useState } from 'react';
import { BellRing, Clock, Sparkles, Trash2, X } from 'lucide-react';
import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';
import { ReminderChannels, ReminderPreferences, Task, TaskTab } from '../types/todo';
import { addDays, formatTimeDisplay, getTodayKey } from '../utils/dateUtils';
import { TabIcon } from './TabIcon';

interface TaskEditorSheetProps {
  isOpen: boolean;
  editingTask: Task | null;
  preset?: Partial<Task>;
  tabs: TaskTab[];
  timeFormat: '12h' | '24h';
  globalReminderPrefs: ReminderPreferences;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

const TIME_PRESETS = ['08:00', '09:30', '12:00', '15:00', '18:00', '20:30'];

function shiftTimeByMinutes(timeStr: string, deltaMins: number): string {
  const [hh, mm] = timeStr.split(':').map(Number);
  const total = ((Number.isNaN(hh) ? 9 : hh) * 60 + (Number.isNaN(mm) ? 0 : mm) + deltaMins + 1440) % 1440;
  const nh = String(Math.floor(total / 60)).padStart(2, '0');
  const nm = String(total % 60).padStart(2, '0');
  return `${nh}:${nm}`;
}

export function TaskEditorSheet({
  isOpen,
  editingTask,
  preset,
  tabs,
  timeFormat,
  globalReminderPrefs,
  onClose,
  onSave,
  onDelete,
}: TaskEditorSheetProps) {
  const todayKey = getTodayKey();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(todayKey);
  const [hasTime, setHasTime] = useState(false);
  const [time, setTime] = useState('09:00');
  const [tabId, setTabId] = useState(tabs[0]?.id ?? 'home');
  const [highlighted, setHighlighted] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [customDelivery, setCustomDelivery] = useState(false);
  const [channels, setChannels] = useState<ReminderChannels>(globalReminderPrefs.channels);

  useEffect(() => {
    if (!isOpen) return;
    if (editingTask) {
      setTitle(editingTask.title);
      setNotes(editingTask.notes ?? '');
      setDate(editingTask.date);
      setHasTime(!!editingTask.time);
      setTime(editingTask.time ?? '09:00');
      setTabId(editingTask.tabId);
      setHighlighted(!!editingTask.highlighted);
      setReminderEnabled(editingTask.reminderEnabled);
      if (editingTask.reminderChannels) {
        setCustomDelivery(true);
        setChannels({ ...globalReminderPrefs.channels, ...editingTask.reminderChannels });
      } else {
        setCustomDelivery(false);
        setChannels(globalReminderPrefs.channels);
      }
    } else {
      setTitle(preset?.title ?? '');
      setNotes(preset?.notes ?? '');
      setDate(preset?.date ?? todayKey);
      const presetHasTime = !!preset?.time;
      setHasTime(presetHasTime);
      setTime(preset?.time ?? '09:00');
      setTabId(preset?.tabId ?? tabs[0]?.id ?? 'home');
      setHighlighted(!!preset?.highlighted);
      setReminderEnabled(!!preset?.reminderEnabled);
      setCustomDelivery(false);
      setChannels(globalReminderPrefs.channels);
    }
  }, [isOpen, editingTask, preset, tabs, todayKey, globalReminderPrefs.channels]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const effectiveTime = hasTime ? time : undefined;
    const effectiveReminder = effectiveTime ? reminderEnabled : false;

    const nextTask: Task = {
      id: editingTask?.id ?? `task-${Date.now()}`,
      title: trimmed,
      notes: notes.trim() || undefined,
      date,
      time: effectiveTime,
      tabId,
      completed: editingTask?.completed ?? false,
      completedAt: editingTask?.completedAt,
      order: editingTask?.order ?? Date.now(),
      highlighted,
      reminderEnabled: effectiveReminder,
      reminderChannels: effectiveReminder && customDelivery ? channels : undefined,
      // Reset dismissedAt if user edited the reminder time/date
      reminderDismissedAt:
        editingTask &&
        editingTask.date === date &&
        editingTask.time === effectiveTime &&
        editingTask.reminderEnabled === effectiveReminder
          ? editingTask.reminderDismissedAt
          : undefined,
      snoozedUntil: undefined,
      createdAt: editingTask?.createdAt ?? new Date().toISOString(),
    };

    onSave(nextTask);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full sm:max-w-lg max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden theme-transition"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Mobile Sheet Handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1.5 rounded-full opacity-25" style={{ backgroundColor: 'var(--text-primary)' }} />
        </div>

        {/* Sheet Header */}
        <div
          className="px-5 py-3.5 flex items-center justify-between border-b"
          style={{ borderColor: 'var(--border-hairline)' }}
        >
          <h2 className="text-lg font-bold">
            {editingTask ? 'Edit Task & Time' : 'New Task'}
          </h2>
          <div className="flex items-center gap-1">
            {editingTask && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(editingTask.id);
                  onClose();
                }}
                aria-label="Delete task"
                className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-red-500 hover:bg-red-500/10 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close editor"
              className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Title & Notes */}
          <div className="space-y-3">
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to get done?"
              className="w-full min-h-[48px] px-4 rounded-2xl border text-base font-medium outline-none"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-hairline)',
                color: 'var(--text-primary)',
              }}
            />
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes or checklist details..."
              className="w-full p-4 rounded-2xl border text-sm outline-none resize-none"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-hairline)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Tab Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>
              Tab Category
            </label>
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const active = tabId === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTabId(tab.id)}
                    className="min-h-[40px] px-3.5 rounded-2xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer theme-transition"
                    style={{
                      backgroundColor: active ? 'var(--accent)' : 'var(--bg-surface-elevated)',
                      color: active ? 'var(--accent-fg)' : 'var(--text-primary)',
                      borderColor: active ? 'transparent' : 'var(--border-hairline)',
                    }}
                  >
                    <TabIcon name={tab.icon} className="w-3.5 h-3.5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Picker + Quick Shortcuts */}
          <div className="space-y-2">
            <label className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>
              Date
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:flex-1 min-w-[220px]">
                <DatePicker value={date} onChange={setDate} />
              </div>
              {[
                { label: 'Today', val: todayKey },
                { label: 'Tomorrow', val: addDays(todayKey, 1) },
                { label: '+3 Days', val: addDays(todayKey, 3) },
              ].map((quick) => (
                <button
                  key={quick.label}
                  type="button"
                  onClick={() => setDate(quick.val)}
                  className="min-h-[44px] px-3 rounded-2xl border text-xs font-medium cursor-pointer"
                  style={{
                    backgroundColor:
                      date === quick.val ? 'var(--accent-soft)' : 'var(--bg-surface-elevated)',
                    borderColor:
                      date === quick.val ? 'var(--accent)' : 'var(--border-hairline)',
                  }}
                >
                  {quick.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Time Editor & Persistent Reminder */}
          <div
            className="rounded-2xl border p-4 space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-hairline)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 text-sm font-semibold cursor-pointer">
                <Clock className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <span>Include Specific Time</span>
              </label>
              <input
                type="checkbox"
                checked={hasTime}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setHasTime(checked);
                  if (!checked) setReminderEnabled(false);
                }}
                className="w-4 h-4"
              />
            </div>

            {hasTime && (
              <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                {/* Exact Time Input + Quick +/- Steppers */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-full">
                    <TimePicker value={time} format={timeFormat} onChange={setTime} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setTime((t) => shiftTimeByMinutes(t, -15))}
                    className="min-h-[44px] px-3 rounded-xl border text-xs font-mono-tabular cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-hairline)',
                    }}
                  >
                    -15m
                  </button>
                  <button
                    type="button"
                    onClick={() => setTime((t) => shiftTimeByMinutes(t, 15))}
                    className="min-h-[44px] px-3 rounded-xl border text-xs font-mono-tabular cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-hairline)',
                    }}
                  >
                    +15m
                  </button>
                  <button
                    type="button"
                    onClick={() => setTime((t) => shiftTimeByMinutes(t, 60))}
                    className="min-h-[44px] px-3 rounded-xl border text-xs font-mono-tabular cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-hairline)',
                    }}
                  >
                    +1h
                  </button>
                </div>

                {/* Quick Time Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {TIME_PRESETS.map((presetTime) => (
                    <button
                      key={presetTime}
                      type="button"
                      onClick={() => setTime(presetTime)}
                      className="min-h-[34px] px-2.5 rounded-xl border text-xs font-mono-tabular cursor-pointer"
                      style={{
                        backgroundColor:
                          time === presetTime ? 'var(--accent)' : 'var(--bg-surface)',
                        color:
                          time === presetTime ? 'var(--accent-fg)' : 'var(--text-secondary)',
                        borderColor:
                          time === presetTime ? 'transparent' : 'var(--border-hairline)',
                      }}
                    >
                      {formatTimeDisplay(presetTime, timeFormat)}
                    </button>
                  ))}
                </div>

                {/* Continuous Persistent Reminder Toggle */}
                <div className="pt-2 border-t space-y-3" style={{ borderColor: 'var(--border-hairline)' }}>
                  <label className="flex items-start justify-between gap-3 cursor-pointer">
                    <div>
                      <span className="text-sm font-semibold flex items-center gap-1.5">
                        <BellRing className="w-4 h-4" />
                        <span>Persistent Continuous Reminder</span>
                      </span>
                      <span className="text-xs block mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        Loops notification sound until manually acknowledged & dismissed.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={(e) => setReminderEnabled(e.target.checked)}
                      className="w-4 h-4 mt-1"
                    />
                  </label>

                  {reminderEnabled && (
                    <div className="space-y-2.5">
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                        <input
                          type="checkbox"
                          checked={customDelivery}
                          onChange={(e) => setCustomDelivery(e.target.checked)}
                        />
                        <span>Customize delivery method for this task</span>
                      </label>

                      {customDelivery && (
                        <div className="flex flex-wrap gap-2">
                          {(
                            [
                              { key: 'sound', label: 'Continuous Sound' },
                              { key: 'vibration', label: 'Vibration' },
                              { key: 'persistentAlert', label: 'On-Screen Alert' },
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
                                className="min-h-[36px] px-3 rounded-xl border text-xs font-medium cursor-pointer"
                                style={{
                                  backgroundColor: active
                                    ? 'var(--accent-soft)'
                                    : 'var(--bg-surface)',
                                  borderColor: active
                                    ? 'var(--accent)'
                                    : 'var(--border-hairline)',
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
              </div>
            )}
          </div>

          {/* Highlight Card Toggle */}
          <label
            className="rounded-2xl border p-3.5 flex items-center justify-between gap-3 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-hairline)',
            }}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <span>Highlight card with accent surface</span>
            </span>
            <input
              type="checkbox"
              checked={highlighted}
              onChange={(e) => setHighlighted(e.target.checked)}
              className="w-4 h-4"
            />
          </label>

          {/* Save Button */}
          <div className="pt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-5 rounded-2xl border text-sm font-semibold cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-hairline)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 min-h-[48px] px-6 rounded-2xl text-sm font-bold cursor-pointer transition-transform active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-fg)',
              }}
            >
              {editingTask ? 'Save Changes' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
