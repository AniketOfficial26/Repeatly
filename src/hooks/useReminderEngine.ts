import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActiveAlert,
  RecurringRule,
  ReminderChannels,
  ReminderPreferences,
  Task,
  TaskTab,
} from '../types/todo';
import { doesRuleOccurOnDate, toLocalDateKey } from '../utils/dateUtils';
import { alarmEngine } from '../utils/soundEngine';

interface UseReminderEngineProps {
  tasks: Task[];
  recurringRules: RecurringRule[];
  tabs: TaskTab[];
  preferences: ReminderPreferences;
  onDismissTaskReminder: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onSnoozeTask: (taskId: string, untilIso: string) => void;
  onDismissRecurringReminder: (ruleId: string, dateKey: string) => void;
  onCompleteRecurring: (ruleId: string, dateKey: string) => void;
  enabled: boolean;
}

function resolveChannels(
  globalChannels: ReminderChannels,
  override?: Partial<ReminderChannels>
): ReminderChannels {
  if (!override) return globalChannels;
  return {
    sound: override.sound ?? globalChannels.sound,
    vibration: override.vibration ?? globalChannels.vibration,
    persistentAlert: override.persistentAlert ?? globalChannels.persistentAlert,
    browserNotification: override.browserNotification ?? globalChannels.browserNotification,
  };
}

export function useReminderEngine({
  tasks,
  recurringRules,
  tabs,
  preferences,
  onDismissTaskReminder,
  onCompleteTask,
  onSnoozeTask,
  onDismissRecurringReminder,
  onCompleteRecurring,
  enabled,
}: UseReminderEngineProps) {
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);
  const firedKeysRef = useRef<Set<string>>(new Set());

  // Unlock Web Audio on first user interaction anywhere in the app
  useEffect(() => {
    const unlock = () => {
      const ready = alarmEngine.unlockAudio();
      if (ready) setAudioUnlocked(true);
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const triggerAlert = useCallback(
    (alert: ActiveAlert) => {
      setActiveAlert(alert);

      alarmEngine.startContinuous({
        sound: alert.channels.sound,
        vibration: alert.channels.vibration,
        tone: preferences.tone,
        volume: preferences.volume,
      });

      if (
        alert.channels.browserNotification &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(`Reminder: ${alert.title}`, {
            body: `${alert.tabName}${alert.scheduledTime ? ` · ${alert.scheduledTime}` : ''}`,
            requireInteraction: true,
          });
        } catch {
          // Ignore notification failure in restricted environments
        }
      }
    },
    [preferences.tone, preferences.volume]
  );

  // Stop continuous audio/vibration on unmount
  useEffect(() => {
    return () => {
      alarmEngine.stop();
    };
  }, []);

  // Poll every 1 second to catch scheduled tasks & recurring reminders
  useEffect(() => {
    if (!enabled) {
      alarmEngine.stop();
      setActiveAlert(null);
      return;
    }

    const checkDueReminders = () => {
      if (activeAlert) return; // Wait until current alert is acknowledged

      const now = new Date();
      const todayKey = toLocalDateKey(now);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      // 1. Check regular tasks
      for (const task of tasks) {
        if (task.completed || !task.reminderEnabled || !task.time) continue;
        if (task.date !== todayKey) continue;
        if (task.reminderDismissedAt) continue;

        if (task.snoozedUntil && new Date(task.snoozedUntil).getTime() > now.getTime()) {
          continue;
        }

        const [hh, mm] = task.time.split(':').map(Number);
        if (Number.isNaN(hh) || Number.isNaN(mm)) continue;
        const scheduledMinutes = hh * 60 + mm;

        // Trigger if scheduled minute has arrived (within same day, not already fired in this session unless snooze expired)
        if (nowMinutes >= scheduledMinutes) {
          const fireKey = `task:${task.id}:${task.date}:${task.time}:${task.snoozedUntil ?? 'base'}`;
          if (firedKeysRef.current.has(fireKey)) continue;
          firedKeysRef.current.add(fireKey);

          const tabName = tabs.find((t) => t.id === task.tabId)?.name ?? 'General';
          const channels = resolveChannels(preferences.channels, task.reminderChannels);

          triggerAlert({
            alertId: fireKey,
            sourceType: 'task',
            sourceId: task.id,
            title: task.title,
            notes: task.notes,
            tabName,
            scheduledDate: task.date,
            scheduledTime: task.time,
            channels,
            triggeredAt: now.toISOString(),
          });
          return;
        }
      }

      // 2. Check recurring rules occurring today
      for (const rule of recurringRules) {
        if (!rule.active || !rule.reminderEnabled || !rule.time) continue;
        if (!doesRuleOccurOnDate(rule, todayKey)) continue;
        if (rule.completedDates.includes(todayKey)) continue;
        if (rule.dismissedDates.includes(todayKey)) continue;

        const [hh, mm] = rule.time.split(':').map(Number);
        if (Number.isNaN(hh) || Number.isNaN(mm)) continue;
        const scheduledMinutes = hh * 60 + mm;

        if (nowMinutes >= scheduledMinutes) {
          const fireKey = `rec:${rule.id}:${todayKey}:${rule.time}`;
          if (firedKeysRef.current.has(fireKey)) continue;
          firedKeysRef.current.add(fireKey);

          const tabName = tabs.find((t) => t.id === rule.tabId)?.name ?? 'Recurring';
          const channels = resolveChannels(preferences.channels, rule.reminderChannels);

          triggerAlert({
            alertId: fireKey,
            sourceType: 'recurring',
            sourceId: rule.id,
            title: rule.title,
            notes: rule.notes,
            tabName,
            scheduledDate: todayKey,
            scheduledTime: rule.time,
            channels,
            triggeredAt: now.toISOString(),
          });
          return;
        }
      }
    };

    checkDueReminders();
    const interval = window.setInterval(checkDueReminders, 1000);
    return () => window.clearInterval(interval);
  }, [activeAlert, enabled, tasks, recurringRules, tabs, preferences, triggerAlert]);

  const acknowledgeAlert = useCallback(() => {
    if (!activeAlert) return;
    alarmEngine.stop();

    if (activeAlert.sourceType === 'task') {
      onDismissTaskReminder(activeAlert.sourceId);
    } else if (activeAlert.sourceType === 'recurring') {
      onDismissRecurringReminder(activeAlert.sourceId, activeAlert.scheduledDate);
    }
    setActiveAlert(null);
  }, [activeAlert, onDismissTaskReminder, onDismissRecurringReminder]);

  const completeFromAlert = useCallback(() => {
    if (!activeAlert) return;
    alarmEngine.stop();

    if (activeAlert.sourceType === 'task') {
      onCompleteTask(activeAlert.sourceId);
    } else if (activeAlert.sourceType === 'recurring') {
      onCompleteRecurring(activeAlert.sourceId, activeAlert.scheduledDate);
    }
    setActiveAlert(null);
  }, [activeAlert, onCompleteTask, onCompleteRecurring]);

  const snoozeAlert = useCallback(
    (minutes?: number) => {
      if (!activeAlert) return;
      alarmEngine.stop();
      const mins = minutes ?? preferences.snoozeMinutes;

      if (activeAlert.sourceType === 'task') {
        const until = new Date(Date.now() + mins * 60 * 1000).toISOString();
        onSnoozeTask(activeAlert.sourceId, until);
      } else if (activeAlert.sourceType === 'test') {
        // Test alert just closes on snooze
      } else if (activeAlert.sourceType === 'recurring') {
        // Re-fire after snooze via temporary timer
        const snapshot = { ...activeAlert };
        window.setTimeout(() => {
          triggerAlert({
            ...snapshot,
            alertId: `${snapshot.alertId}:snooze:${Date.now()}`,
            triggeredAt: new Date().toISOString(),
          });
        }, mins * 60 * 1000);
      }
      setActiveAlert(null);
    },
    [activeAlert, preferences.snoozeMinutes, onSnoozeTask, triggerAlert]
  );

  const triggerTestAlert = useCallback(() => {
    alarmEngine.unlockAudio();
    setAudioUnlocked(true);
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');

    triggerAlert({
      alertId: `test:${Date.now()}`,
      sourceType: 'test',
      sourceId: 'test',
      title: 'Persistent Reminder Check',
      notes: 'Continuous sound & alert will persist until you manually acknowledge and dismiss.',
      tabName: 'System Test',
      scheduledDate: toLocalDateKey(now),
      scheduledTime: `${hh}:${mm}`,
      channels: preferences.channels,
      triggeredAt: now.toISOString(),
    });
  }, [preferences.channels, triggerAlert]);

  const silenceOnly = useCallback(() => {
    alarmEngine.stop();
  }, []);

  return {
    activeAlert,
    audioUnlocked,
    acknowledgeAlert,
    completeFromAlert,
    snoozeAlert,
    triggerTestAlert,
    silenceOnly,
  };
}
