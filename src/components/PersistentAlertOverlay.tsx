import { AlarmClock, BellRing, Check, Clock, Volume2, X } from 'lucide-react';
import { ActiveAlert } from '../types/todo';
import { formatTimeDisplay } from '../utils/dateUtils';

interface PersistentAlertOverlayProps {
  alert: ActiveAlert | null;
  timeFormat: '12h' | '24h';
  snoozeMinutes: number;
  onAcknowledgeDismiss: () => void;
  onCompleteTask: () => void;
  onSnooze: () => void;
}

export function PersistentAlertOverlay({
  alert,
  timeFormat,
  snoozeMinutes,
  onAcknowledgeDismiss,
  onCompleteTask,
  onSnooze,
}: PersistentAlertOverlayProps) {
  if (!alert) return null;

  // If user disabled persistent on-screen modal, show a compact persistent banner
  // so they can still manually acknowledge and stop the continuous sound/vibration.
  if (!alert.channels.persistentAlert) {
    return (
      <div
        role="alertdialog"
        aria-live="assertive"
        className="fixed top-3 left-3 right-3 z-50 max-w-xl mx-auto rounded-3xl border p-4 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{
          backgroundColor: 'var(--accent-card)',
          color: 'var(--accent-card-fg)',
          borderColor: 'rgba(20, 22, 13, 0.2)',
        }}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-black/10 flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold opacity-75">
              {alert.tabName}
              {alert.scheduledTime
                ? ` · ${formatTimeDisplay(alert.scheduledTime, timeFormat)}`
                : ''}
            </p>
            <p className="text-base font-bold truncate">{alert.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {alert.sourceType !== 'test' && (
            <button
              type="button"
              onClick={onCompleteTask}
              className="min-h-[42px] px-3.5 rounded-xl bg-black/10 hover:bg-black/15 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Done</span>
            </button>
          )}
          <button
            type="button"
            onClick={onAcknowledgeDismiss}
            className="min-h-[42px] px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            style={{ backgroundColor: 'var(--accent-fg)', color: 'var(--accent)' }}
          >
            <X className="w-4 h-4" />
            <span>Acknowledge & Dismiss</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
    >
      <div
        className="w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 border"
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          color: 'var(--text-primary)',
          borderColor: 'var(--border-hairline)',
        }}
      >
        {/* Top Alarm Indicator */}
        <div className="flex items-center justify-between">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-fg)',
            }}
          >
            <AlarmClock className="w-7 h-7 animate-bounce" />
          </div>

          <div className="text-right">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {alert.tabName}
            </p>
            {alert.scheduledTime && (
              <p className="text-lg font-bold font-mono-tabular">
                {formatTimeDisplay(alert.scheduledTime, timeFormat)}
              </p>
            )}
          </div>
        </div>

        {/* Task Message */}
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            Continuous Reminder Active
          </p>
          <h2 className="text-2xl font-bold leading-tight text-balance">{alert.title}</h2>
          {alert.notes && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {alert.notes}
            </p>
          )}
        </div>

        {/* Active Channel Info (Unboxed Metadata) */}
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium py-3 border-y"
          style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
        >
          {alert.channels.sound && (
            <span className="inline-flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Continuous tone playing</span>
            </span>
          )}
          {alert.channels.vibration && (
            <span className="inline-flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5" />
              <span>Vibration active</span>
            </span>
          )}
        </div>

        {/* Primary Manual Acknowledge & Dismiss Action */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onAcknowledgeDismiss}
            className="w-full min-h-[52px] px-5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.98]"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-fg)',
            }}
          >
            <X className="w-5 h-5 stroke-[2.5]" />
            <span>Acknowledge & Dismiss Alarm</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            {alert.sourceType !== 'test' && (
              <button
                type="button"
                onClick={onCompleteTask}
                className="min-h-[46px] px-4 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-hairline)',
                  color: 'var(--text-primary)',
                }}
              >
                <Check className="w-4 h-4" />
                <span>Complete Task</span>
              </button>
            )}

            <button
              type="button"
              onClick={onSnooze}
              className={`min-h-[46px] px-4 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                alert.sourceType === 'test' ? 'col-span-2' : ''
              }`}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-hairline)',
                color: 'var(--text-secondary)',
              }}
            >
              <Clock className="w-4 h-4" />
              <span>Snooze {snoozeMinutes}m</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
