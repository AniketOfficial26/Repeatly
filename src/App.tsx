import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { LoginScreen } from './components/LoginScreen';
import { PersistentAlertOverlay } from './components/PersistentAlertOverlay';
import { RecurringView } from './components/RecurringView';
import { ScheduleView } from './components/ScheduleView';
import { SettingsView } from './components/SettingsView';
import { TabManagerModal } from './components/TabManagerModal';
import { TaskEditorSheet } from './components/TaskEditorSheet';
import { TasksView } from './components/TasksView';
import { TrashModal } from './components/TrashModal';
import {
  createStarterRecurring,
  createStarterTasks,
  DEFAULT_REMINDER_PREFERENCES,
  DEFAULT_TABS,
  DEFAULT_THEME_SETTINGS,
} from './data/defaults';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useReminderEngine } from './hooks/useReminderEngine';
import { useTheme } from './hooks/useTheme';
import { auth, googleAuthProvider } from './lib/firebase';
import {
  NavSection,
  RecurringRule,
  ReminderPreferences,
  Task,
  TaskTab,
  ThemeMode,
  ThemeSettings,
} from './types/todo';
import { getTodayKey } from './utils/dateUtils';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MIGRATION_OWNER_KEY = 'repeatly_migration_owner_v1';

function filterNotExpiredTrash(items: Task[]): Task[] {
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  return items.filter((item) => {
    if (!item.deletedAt) return true;
    return new Date(item.deletedAt).getTime() >= cutoff;
  });
}

export default function App() {
  const [tasks, setTasks] = useLocalStorage<Task[]>(
    'repeatly_tasks_v1',
    createStarterTasks,
    { persist: false }
  );
  const [trashTasks, setTrashTasks] = useLocalStorage<Task[]>(
    'repeatly_trash_v1',
    [],
    { persist: false }
  );
  const [recurringRules, setRecurringRules] = useLocalStorage<RecurringRule[]>(
    'repeatly_recurring_v1',
    createStarterRecurring,
    { persist: false }
  );
  const [tabs, setTabs] = useLocalStorage<TaskTab[]>(
    'repeatly_tabs_v1',
    DEFAULT_TABS,
    { persist: false }
  );
  const [themeSettings, setThemeSettings] = useLocalStorage<ThemeSettings>(
    'lumendo_theme_v1',
    DEFAULT_THEME_SETTINGS
  );
  const [reminderPrefs, setReminderPrefs] = useLocalStorage<ReminderPreferences>(
    'repeatly_reminders_v1',
    DEFAULT_REMINDER_PREFERENCES
  );

  // Firebase Auth Continuous Login State
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<NavSection>('tasks');
  const [selectedTabId, setSelectedTabId] = useState<string>('all');
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<string>(getTodayKey);

  // Modals / Sheets
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editorPreset, setEditorPreset] = useState<Partial<Task> | undefined>(undefined);
  const [isTabManagerOpen, setIsTabManagerOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);

  const { resolvedTheme, systemPrefersDark } = useTheme(themeSettings);

  // Keep latest local state accessible during initial cloud bootstrap
  const localSnapshotRef = useRef({ tabs, tasks, recurringRules, themeSettings, reminderPrefs });
  localSnapshotRef.current = { tabs, tasks, recurringRules, themeSettings, reminderPrefs };
  const pendingLocalSnapshotRef = useRef<typeof localSnapshotRef.current | null>(null);
  const signingOutRef = useRef(false);
  const authUserRef = useRef<User | null>(authUser);
  authUserRef.current = authUser;

  const clearPrivateState = useCallback(() => {
    setTasks([]);
    setTrashTasks([]);
    setRecurringRules([]);
    setTabs(DEFAULT_TABS);
    setThemeSettings(DEFAULT_THEME_SETTINGS);
    setReminderPrefs(DEFAULT_REMINDER_PREFERENCES);
    setIsEditorOpen(false);
    setIsTabManagerOpen(false);
    setIsTrashOpen(false);
    window.localStorage.removeItem('repeatly_tasks_v1');
    window.localStorage.removeItem('repeatly_trash_v1');
    window.localStorage.removeItem('repeatly_recurring_v1');
    window.localStorage.removeItem('repeatly_tabs_v1');
    window.localStorage.removeItem('repeatly_reminders_v1');
    window.localStorage.removeItem(MIGRATION_OWNER_KEY);
  }, [setReminderPrefs, setRecurringRules, setTabs, setTasks, setThemeSettings, setTrashTasks]);

  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}, explicitUser?: User | null) => {
      const targetUser = explicitUser ?? authUserRef.current;
      if (!targetUser) return null;
      const token = await targetUser.getIdToken();
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${res.status})`);
      }
      return res.json();
    },
    []
  );

  // Purge expired (>30 days) local trash items on startup
  useEffect(() => {
    setTrashTasks((prev) => filterNotExpiredTrash(prev));
  }, [setTrashTasks]);

  // Listen to Firebase Auth continuous login state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      setAuthLoading(true);
      if (!user) {
        const hasStoredPrivateState = [
          'repeatly_tasks_v1',
          'repeatly_trash_v1',
          'repeatly_recurring_v1',
          'repeatly_tabs_v1',
          'lumendo_theme_v1',
          'repeatly_reminders_v1',
        ].some((key) => localStorage.getItem(key) !== null);
        if (!signingOutRef.current && hasStoredPrivateState) {
          pendingLocalSnapshotRef.current = localSnapshotRef.current;
        }
        signingOutRef.current = false;
        clearPrivateState();
        setAuthLoading(false);
        return;
      }
      const requestUser = user;
      try {
        const storedMigrationOwner = window.localStorage.getItem(MIGRATION_OWNER_KEY);
        const localSnapshot =
          pendingLocalSnapshotRef.current ??
          (storedMigrationOwner === null || storedMigrationOwner === requestUser.uid
            ? localSnapshotRef.current
            : null);
        pendingLocalSnapshotRef.current = null;
        clearPrivateState();
        const data = await apiFetch('/api/bootstrap', { method: 'GET' }, user);
        if (!data) return;
        window.localStorage.setItem(MIGRATION_OWNER_KEY, requestUser.uid);

        // If cloud workspace has zero tasks and zero recurring rules, migrate local items once
        const snap = localSnapshot;
        if (
          snap &&
          data.tasks.length === 0 &&
          data.trashTasks.length === 0 &&
          data.recurringRules.length === 0 &&
          (snap.tasks.length > 0 || snap.recurringRules.length > 0)
        ) {
          const imported = await apiFetch(
            '/api/import-local',
            {
              method: 'POST',
              body: JSON.stringify({
                tabs: snap.tabs,
                tasks: snap.tasks,
                recurringRules: snap.recurringRules,
                themeSettings: snap.themeSettings,
                reminderPrefs: snap.reminderPrefs,
              }),
            },
            user
          );
          if (imported) {
            setTabs(imported.tabs);
            setTasks(imported.tasks);
            setTrashTasks(imported.trashTasks);
            setRecurringRules(imported.recurringRules);
            return;
          }
        }

        if (requestUser.uid !== auth.currentUser?.uid) return;
        if (Array.isArray(data.tabs) && data.tabs.length > 0) setTabs(data.tabs);
        setTasks(data.tasks ?? []);
        setTrashTasks(data.trashTasks ?? []);
        setRecurringRules(data.recurringRules ?? []);
        if (data.user?.themeSettings) setThemeSettings(data.user.themeSettings);
        if (data.user?.reminderPrefs) setReminderPrefs(data.user.reminderPrefs);
      } catch (err) {
        console.error('Cloud bootstrap error:', err);
      } finally {
        if (requestUser.uid === auth.currentUser?.uid) setAuthLoading(false);
      }
    });
    return () => unsub();
  }, [apiFetch, clearPrivateState, setRecurringRules, setReminderPrefs, setTabs, setTasks, setThemeSettings, setTrashTasks]);

  const handleSignIn = useCallback(async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      setAuthError((err as Error).message || 'Sign in failed');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setAuthError(null);
    setAuthLoading(true);
    signingOutRef.current = true;
    try {
      await signOut(auth);
      pendingLocalSnapshotRef.current = null;
      clearPrivateState();
    } catch (err) {
      signingOutRef.current = false;
      setAuthError((err as Error).message || 'Sign out failed');
    } finally {
      setAuthLoading(false);
    }
  }, [clearPrivateState]);

  // Task Handlers (optimistic local + PostgreSQL sync)
  const syncTask = useCallback(
    (task: Task) => {
      if (!authUser) return;
      apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(task) }).catch(console.error);
    },
    [apiFetch, authUser]
  );

  const handleSaveTask = useCallback(
    (saved: Task) => {
      setTasks((prev) => {
        const exists = prev.some((t) => t.id === saved.id);
        return exists ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...prev];
      });
      syncTask(saved);
    },
    [setTasks, syncTask]
  );

  const handleQuickAddTask = useCallback(
    (title: string, tabId: string, date: string) => {
      const nextOrder = tasks.reduce((min, t) => Math.min(min, t.order), 0) - 1;
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title,
        date,
        tabId,
        completed: false,
        order: nextOrder,
        reminderEnabled: false,
        createdAt: new Date().toISOString(),
      };
      setTasks((prev) => [newTask, ...prev]);
      syncTask(newTask);
    },
    [setTasks, syncTask, tasks]
  );

  const handleToggleTaskComplete = useCallback(
    (taskId: string) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const updated: Task = {
            ...t,
            completed: !t.completed,
            completedAt: !t.completed ? new Date().toISOString() : undefined,
          };
          syncTask(updated);
          return updated;
        })
      );
    },
    [setTasks, syncTask]
  );

  const handleCompleteTaskStrict = useCallback(
    (taskId: string) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const updated: Task = {
            ...t,
            completed: true,
            completedAt: new Date().toISOString(),
            reminderDismissedAt: new Date().toISOString(),
          };
          syncTask(updated);
          return updated;
        })
      );
    },
    [setTasks, syncTask]
  );

  // Soft-delete moves task into 30-day Trash retention
  const handleDeleteTask = useCallback(
    (taskId: string) => {
      const deletedAt = new Date().toISOString();
      setTasks((prev) => {
        const target = prev.find((t) => t.id === taskId);
        if (target) {
          setTrashTasks((tPrev) => [{ ...target, deletedAt }, ...tPrev]);
        }
        return prev.filter((t) => t.id !== taskId);
      });
      if (authUser) {
        apiFetch(`/api/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' }).catch(
          console.error
        );
      }
    },
    [apiFetch, authUser, setTasks, setTrashTasks]
  );

  const handleRestoreTask = useCallback(
    (taskId: string) => {
      setTrashTasks((prev) => {
        const target = prev.find((t) => t.id === taskId);
        if (target) {
          const restored: Task = { ...target, deletedAt: undefined };
          setTasks((tPrev) => [restored, ...tPrev]);
        }
        return prev.filter((t) => t.id !== taskId);
      });
      if (authUser) {
        apiFetch(`/api/tasks/${encodeURIComponent(taskId)}/restore`, { method: 'POST' }).catch(
          console.error
        );
      }
    },
    [apiFetch, authUser, setTasks, setTrashTasks]
  );

  const handlePermanentDeleteTask = useCallback(
    (taskId: string) => {
      setTrashTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (authUser) {
        apiFetch(`/api/tasks/${encodeURIComponent(taskId)}/permanent`, {
          method: 'DELETE',
        }).catch(console.error);
      }
    },
    [apiFetch, authUser, setTrashTasks]
  );

  const handleReorderTasks = useCallback(
    (orderedPendingIds: string[]) => {
      setTasks((prev) => {
        const orderIndex = new Map<string, number>();
        orderedPendingIds.forEach((id, idx) => orderIndex.set(id, idx));
        return prev.map((t) =>
          orderIndex.has(t.id) ? { ...t, order: orderIndex.get(t.id)! } : t
        );
      });
      if (authUser) {
        apiFetch('/api/tasks/reorder', {
          method: 'PUT',
          body: JSON.stringify({ orderedIds: orderedPendingIds }),
        }).catch(console.error);
      }
    },
    [apiFetch, authUser, setTasks]
  );

  const handleDismissTaskReminder = useCallback(
    (taskId: string) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const updated = { ...t, reminderDismissedAt: new Date().toISOString() };
          syncTask(updated);
          return updated;
        })
      );
    },
    [setTasks, syncTask]
  );

  const handleSnoozeTask = useCallback(
    (taskId: string, untilIso: string) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const updated = { ...t, snoozedUntil: untilIso };
          syncTask(updated);
          return updated;
        })
      );
    },
    [setTasks, syncTask]
  );

  // Recurring Handlers
  const syncRecurring = useCallback(
    (rule: RecurringRule) => {
      if (!authUser) return;
      apiFetch('/api/recurring', { method: 'POST', body: JSON.stringify(rule) }).catch(
        console.error
      );
    },
    [apiFetch, authUser]
  );

  const handleSaveRecurringRule = useCallback(
    (rule: RecurringRule) => {
      setRecurringRules((prev) => {
        const exists = prev.some((r) => r.id === rule.id);
        return exists ? prev.map((r) => (r.id === rule.id ? rule : r)) : [rule, ...prev];
      });
      syncRecurring(rule);
    },
    [setRecurringRules, syncRecurring]
  );

  const handleDeleteRecurringRule = useCallback(
    (ruleId: string) => {
      setRecurringRules((prev) => prev.filter((r) => r.id !== ruleId));
      if (authUser) {
        apiFetch(`/api/recurring/${encodeURIComponent(ruleId)}`, { method: 'DELETE' }).catch(
          console.error
        );
      }
    },
    [apiFetch, authUser, setRecurringRules]
  );

  const handleToggleRuleActive = useCallback(
    (ruleId: string) => {
      setRecurringRules((prev) =>
        prev.map((r) => {
          if (r.id !== ruleId) return r;
          const updated = { ...r, active: !r.active };
          syncRecurring(updated);
          return updated;
        })
      );
    },
    [setRecurringRules, syncRecurring]
  );

  const handleToggleRecurringComplete = useCallback(
    (ruleId: string, dateKey: string) => {
      setRecurringRules((prev) =>
        prev.map((r) => {
          if (r.id !== ruleId) return r;
          const already = r.completedDates.includes(dateKey);
          const updated: RecurringRule = {
            ...r,
            completedDates: already
              ? r.completedDates.filter((d) => d !== dateKey)
              : [...r.completedDates, dateKey],
          };
          syncRecurring(updated);
          return updated;
        })
      );
    },
    [setRecurringRules, syncRecurring]
  );

  const handleCompleteRecurringStrict = useCallback(
    (ruleId: string, dateKey: string) => {
      setRecurringRules((prev) =>
        prev.map((r) => {
          if (r.id !== ruleId) return r;
          const updated: RecurringRule = {
            ...r,
            completedDates: r.completedDates.includes(dateKey)
              ? r.completedDates
              : [...r.completedDates, dateKey],
            dismissedDates: r.dismissedDates.includes(dateKey)
              ? r.dismissedDates
              : [...r.dismissedDates, dateKey],
          };
          syncRecurring(updated);
          return updated;
        })
      );
    },
    [setRecurringRules, syncRecurring]
  );

  const handleDismissRecurringReminder = useCallback(
    (ruleId: string, dateKey: string) => {
      setRecurringRules((prev) =>
        prev.map((r) => {
          if (r.id !== ruleId || r.dismissedDates.includes(dateKey)) return r;
          const updated = { ...r, dismissedDates: [...r.dismissedDates, dateKey] };
          syncRecurring(updated);
          return updated;
        })
      );
    },
    [setRecurringRules, syncRecurring]
  );

  // Custom Tab Handlers
  const handleAddTab = useCallback(
    (name: string, icon: string) => {
      const id = `tab-${Date.now()}`;
      const newTab: TaskTab = { id, name, icon, order: tabs.length };
      setTabs((prev) => [...prev, newTab]);
      if (authUser) {
        apiFetch('/api/tabs', { method: 'POST', body: JSON.stringify(newTab) }).catch(
          console.error
        );
      }
    },
    [apiFetch, authUser, setTabs, tabs.length]
  );

  const handleUpdateTab = useCallback(
    (tabId: string, name: string, icon: string) => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId) return t;
          const updated = { ...t, name, icon };
          if (authUser) {
            apiFetch('/api/tabs', { method: 'POST', body: JSON.stringify(updated) }).catch(
              console.error
            );
          }
          return updated;
        })
      );
    },
    [apiFetch, authUser, setTabs]
  );

  const handleDeleteTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        if (prev.length <= 1) return prev;
        const remaining = prev.filter((t) => t.id !== tabId);
        const fallbackId = remaining[0].id;
        setTasks((tPrev) =>
          tPrev.map((t) => (t.tabId === tabId ? { ...t, tabId: fallbackId } : t))
        );
        setRecurringRules((rPrev) =>
          rPrev.map((r) => (r.tabId === tabId ? { ...r, tabId: fallbackId } : r))
        );
        if (selectedTabId === tabId) setSelectedTabId('all');
        if (authUser) {
          apiFetch(
            `/api/tabs/${encodeURIComponent(tabId)}?fallbackTabId=${encodeURIComponent(fallbackId)}`,
            { method: 'DELETE' }
          ).catch(console.error);
        }
        return remaining;
      });
    },
    [apiFetch, authUser, selectedTabId, setRecurringRules, setTabs, setTasks]
  );

  // Preferences Sync
  const handleUpdateTheme = useCallback(
    (patch: Partial<ThemeSettings>) => {
      setThemeSettings((prev) => {
        const next = { ...prev, ...patch };
        if (authUser) {
          apiFetch('/api/preferences', {
            method: 'PUT',
            body: JSON.stringify({ themeSettings: next }),
          }).catch(console.error);
        }
        return next;
      });
    },
    [apiFetch, authUser, setThemeSettings]
  );

  const handleUpdateReminderPrefs = useCallback(
    (patch: Partial<ReminderPreferences>) => {
      setReminderPrefs((prev) => {
        const next = { ...prev, ...patch };
        if (authUser) {
          apiFetch('/api/preferences', {
            method: 'PUT',
            body: JSON.stringify({ reminderPrefs: next }),
          }).catch(console.error);
        }
        return next;
      });
    },
    [apiFetch, authUser, setReminderPrefs]
  );

  const handleClearCompleted = useCallback(() => {
    const deletedAt = new Date().toISOString();
    setTasks((prev) => {
      const done = prev.filter((t) => t.completed);
      if (done.length > 0) {
        setTrashTasks((tPrev) => [...done.map((d) => ({ ...d, deletedAt })), ...tPrev]);
        if (authUser) {
          done.forEach((d) => {
            apiFetch(`/api/tasks/${encodeURIComponent(d.id)}`, { method: 'DELETE' }).catch(
              console.error
            );
          });
        }
      }
      return prev.filter((t) => !t.completed);
    });
  }, [apiFetch, authUser, setTasks, setTrashTasks]);

  // Reminder Engine
  const {
    activeAlert,
    acknowledgeAlert,
    completeFromAlert,
    snoozeAlert,
    triggerTestAlert,
  } = useReminderEngine({
    tasks,
    recurringRules,
    tabs,
    preferences: reminderPrefs,
    onDismissTaskReminder: handleDismissTaskReminder,
    onCompleteTask: handleCompleteTaskStrict,
    onSnoozeTask: handleSnoozeTask,
    onDismissRecurringReminder: handleDismissRecurringReminder,
    onCompleteRecurring: handleCompleteRecurringStrict,
    enabled: !!authUser && !authLoading,
  });

  const pendingCount = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks]);
  const completedCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);

  if (authLoading) {
    return (
      <main className="min-h-dvh flex items-center justify-center" style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
        <div className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Checking your session...</div>
      </main>
    );
  }

  if (!authUser) {
    return <LoginScreen loading={authLoading} error={authError} onSignIn={handleSignIn} />;
  }

  const openNewTask = (preset?: Partial<Task>) => {
    setEditingTask(null);
    setEditorPreset({
      tabId: selectedTabId === 'all' ? tabs[0]?.id ?? 'home' : selectedTabId,
      date: activeSection === 'schedule' ? selectedScheduleDate : getTodayKey(),
      ...preset,
    });
    setIsEditorOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setEditorPreset(undefined);
    setIsEditorOpen(true);
  };

  return (
    <div
      className="min-h-dvh flex flex-col md:flex-row relative theme-transition"
      style={{
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Ambient Radial Warm Glow */}
      {themeSettings.ambientGlow && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        >
          <div
            className="absolute -top-28 -right-24 w-[460px] h-[460px] rounded-full blur-[110px]"
            style={{ backgroundColor: 'var(--ambient-glow)' }}
          />
          <div
            className="absolute top-1/3 -left-28 w-[420px] h-[420px] rounded-full blur-[120px]"
            style={{ backgroundColor: 'var(--ambient-glow-secondary)' }}
          />
        </div>
      )}

      {/* Navigation Rail (Desktop) & Bottom Dock (Mobile) */}
      <BottomNav
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onOpenNewTask={() => openNewTask()}
        tabs={tabs}
        selectedTabId={selectedTabId}
        onSelectTab={setSelectedTabId}
        pendingCount={pendingCount}
        recurringCount={recurringRules.filter((r) => r.active).length}
        trashCount={trashTasks.length}
        onOpenTrash={() => setIsTrashOpen(true)}
        userEmail={authUser?.email ?? null}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      {/* Main Content Workspace */}
      <main className="relative z-10 flex-1 min-w-0 px-4 sm:px-6 lg:px-10 pt-5 sm:pt-8 pb-28 md:pb-12 max-w-6xl w-full mx-auto">
        {activeSection === 'tasks' && (
          <TasksView
            tasks={tasks}
            recurringRules={recurringRules}
            tabs={tabs}
            selectedTabId={selectedTabId}
            onSelectTab={setSelectedTabId}
            onOpenTabManager={() => setIsTabManagerOpen(true)}
            onOpenNewTask={openNewTask}
            onEditTask={openEditTask}
            onQuickAddTask={handleQuickAddTask}
            onToggleTaskComplete={handleToggleTaskComplete}
            onDeleteTask={handleDeleteTask}
            onReorderTasks={handleReorderTasks}
            onToggleRecurringComplete={handleToggleRecurringComplete}
            onNavigateRecurring={() => setActiveSection('recurring')}
            themeSettings={themeSettings}
            resolvedTheme={resolvedTheme}
            onChangeThemeMode={(mode: ThemeMode) => handleUpdateTheme({ mode })}
            trashCount={trashTasks.length}
            onOpenTrash={() => setIsTrashOpen(true)}
            userEmail={authUser?.email ?? null}
            displayName={
              authUser?.displayName?.trim() ||
              authUser?.email?.split('@')[0]?.trim() ||
              null
            }
            onSignIn={handleSignIn}
          />
        )}

        {activeSection === 'schedule' && (
          <ScheduleView
            selectedDate={selectedScheduleDate}
            onSelectDate={setSelectedScheduleDate}
            tasks={tasks}
            recurringRules={recurringRules}
            tabs={tabs}
            timeFormat={themeSettings.timeFormat}
            onOpenNewTask={openNewTask}
            onEditTask={openEditTask}
            onToggleTaskComplete={handleToggleTaskComplete}
            onDeleteTask={handleDeleteTask}
            onToggleRecurringComplete={handleToggleRecurringComplete}
            onNavigateRecurring={() => setActiveSection('recurring')}
          />
        )}

        {activeSection === 'recurring' && (
          <RecurringView
            rules={recurringRules}
            tabs={tabs}
            timeFormat={themeSettings.timeFormat}
            globalReminderPrefs={reminderPrefs}
            onSaveRule={handleSaveRecurringRule}
            onDeleteRule={handleDeleteRecurringRule}
            onToggleRuleActive={handleToggleRuleActive}
            onToggleCompleteToday={handleToggleRecurringComplete}
          />
        )}

        {activeSection === 'settings' && (
          <SettingsView
            themeSettings={themeSettings}
            resolvedTheme={resolvedTheme}
            systemPrefersDark={systemPrefersDark}
            onUpdateTheme={handleUpdateTheme}
            reminderPrefs={reminderPrefs}
            onUpdateReminderPrefs={handleUpdateReminderPrefs}
            onTestPersistentReminder={triggerTestAlert}
            onOpenTabManager={() => setIsTabManagerOpen(true)}
            onClearCompleted={handleClearCompleted}
            completedCount={completedCount}
            trashCount={trashTasks.length}
            onOpenTrash={() => setIsTrashOpen(true)}
            userEmail={authUser?.email ?? null}
            authLoading={authLoading}
            authError={authError}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
          />
        )}
      </main>

      {/* Task Add / Edit Bottom Sheet */}
      <TaskEditorSheet
        isOpen={isEditorOpen}
        editingTask={editingTask}
        preset={editorPreset}
        tabs={tabs}
        timeFormat={themeSettings.timeFormat}
        globalReminderPrefs={reminderPrefs}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      {/* Custom Tabs Manager Modal */}
      <TabManagerModal
        isOpen={isTabManagerOpen}
        tabs={tabs}
        onClose={() => setIsTabManagerOpen(false)}
        onAddTab={handleAddTab}
        onUpdateTab={handleUpdateTab}
        onDeleteTab={handleDeleteTab}
      />

      {/* 30-Day Recently Deleted Trash Modal */}
      <TrashModal
        isOpen={isTrashOpen}
        trashTasks={trashTasks}
        tabs={tabs}
        onClose={() => setIsTrashOpen(false)}
        onRestoreTask={handleRestoreTask}
        onPermanentDeleteTask={handlePermanentDeleteTask}
      />

      {/* Continuous Persistent Reminder Overlay */}
      <PersistentAlertOverlay
        alert={activeAlert}
        timeFormat={themeSettings.timeFormat}
        snoozeMinutes={reminderPrefs.snoozeMinutes}
        onAcknowledgeDismiss={acknowledgeAlert}
        onCompleteTask={completeFromAlert}
        onSnooze={() => snoozeAlert()}
      />
    </div>
  );
}
