import React, { useMemo, useRef, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  LogIn,
  Moon,
  Plus,
  Sun,
  SunMoon,
  Trash2,
} from 'lucide-react';
import {
  RecurringRule,
  Task,
  TaskTab,
  ThemeMode,
  ThemeSettings,
} from '../types/todo';
import {
  doesRuleOccurOnDate,
  formatTimeDisplay,
  getGreeting,
  getTodayKey,
} from '../utils/dateUtils';
import { PWAInstallButton } from './PWAInstallButton';
import { RepeatlyLogo } from './RepeatlyLogo';
import { DisplayTaskItem, SwipeableTaskCard } from './SwipeableTaskCard';
import { TaskTabsBar } from './TaskTabsBar';

interface TasksViewProps {
  tasks: Task[];
  recurringRules: RecurringRule[];
  tabs: TaskTab[];
  selectedTabId: string;
  onSelectTab: (tabId: string) => void;
  onOpenTabManager: () => void;
  onOpenNewTask: (preset?: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  onQuickAddTask: (title: string, tabId: string, date: string) => void;
  onToggleTaskComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onReorderTasks: (orderedIds: string[]) => void;
  onToggleRecurringComplete: (ruleId: string, dateKey: string) => void;
  onNavigateRecurring: () => void;
  themeSettings: ThemeSettings;
  resolvedTheme: 'light' | 'dark';
  onChangeThemeMode: (mode: ThemeMode) => void;
  trashCount: number;
  onOpenTrash: () => void;
  userEmail: string | null;
  displayName: string | null;
  onSignIn: () => void;
}

type DateScope = 'today' | 'upcoming' | 'all';

export function TasksView({
  tasks,
  recurringRules,
  tabs,
  selectedTabId,
  onSelectTab,
  onOpenTabManager,
  onOpenNewTask,
  onEditTask,
  onQuickAddTask,
  onToggleTaskComplete,
  onDeleteTask,
  onReorderTasks,
  onToggleRecurringComplete,
  onNavigateRecurring,
  themeSettings,
  resolvedTheme,
  onChangeThemeMode,
  trashCount,
  onOpenTrash,
  userEmail,
  displayName,
  onSignIn,
}: TasksViewProps) {
  const [dateScope, setDateScope] = useState<DateScope>('all');
  const [quickTitle, setQuickTitle] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  // Drag reorder state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const todayKey = getTodayKey();

  const tabMap = useMemo(() => {
    const map: Record<string, TaskTab> = {};
    for (const t of tabs) map[t.id] = t;
    return map;
  }, [tabs]);

  // Count pending tasks per tab for the tabs bar
  const countsByTab = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tabs) counts[t.id] = 0;
    for (const task of tasks) {
      if (!task.completed) {
        counts[task.tabId] = (counts[task.tabId] ?? 0) + 1;
      }
    }
    return counts;
  }, [tasks, tabs]);

  const totalPendingCount = useMemo(
    () => tasks.filter((t) => !t.completed).length,
    [tasks]
  );

  // Filter regular tasks
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (selectedTabId !== 'all' && t.tabId !== selectedTabId) return false;
        if (dateScope === 'today') return t.date === todayKey;
        if (dateScope === 'upcoming') return t.date >= todayKey;
        return true;
      })
      .sort((a, b) => a.order - b.order);
  }, [tasks, selectedTabId, dateScope, todayKey]);

  const pendingTasks = useMemo(
    () => filteredTasks.filter((t) => !t.completed),
    [filteredTasks]
  );

  const completedTasks = useMemo(
    () => filteredTasks.filter((t) => t.completed),
    [filteredTasks]
  );

  // Today's recurring items matching active tab
  const todayRecurringItems = useMemo(() => {
    return recurringRules.filter((rule) => {
      if (selectedTabId !== 'all' && rule.tabId !== selectedTabId) return false;
      return doesRuleOccurOnDate(rule, todayKey);
    });
  }, [recurringRules, selectedTabId, todayKey]);

  const upcomingReminders = useMemo(() => {
    return tasks
      .filter((t) => !t.completed && t.reminderEnabled && t.date >= todayKey)
      .sort((a, b) => `${a.date} ${a.time ?? '99:99'}`.localeCompare(`${b.date} ${b.time ?? '99:99'}`))
      .slice(0, 4);
  }, [tasks, todayKey]);

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed) return;
    const targetTab = selectedTabId === 'all' ? (tabs[0]?.id ?? 'home') : selectedTabId;
    onQuickAddTask(trimmed, targetTab, todayKey);
    setQuickTitle('');
  };

  // Pointer reorder handlers
  const handleReorderStart = (id: string) => {
    setDraggingId(id);
  };

  const handleReorderMove = (clientY: number) => {
    if (!draggingId) return;
    const currentIndex = pendingTasks.findIndex((t) => t.id === draggingId);
    if (currentIndex === -1) return;

    for (let i = 0; i < pendingTasks.length; i++) {
      if (i === currentIndex) continue;
      const candidate = pendingTasks[i];
      const el = itemRefs.current.get(candidate.id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;

      if (i < currentIndex && clientY < midY) {
        const nextOrder = pendingTasks.map((t) => t.id);
        const [moved] = nextOrder.splice(currentIndex, 1);
        nextOrder.splice(i, 0, moved);
        onReorderTasks(nextOrder);
        break;
      }
      if (i > currentIndex && clientY > midY) {
        const nextOrder = pendingTasks.map((t) => t.id);
        const [moved] = nextOrder.splice(currentIndex, 1);
        nextOrder.splice(i, 0, moved);
        onReorderTasks(nextOrder);
        break;
      }
    }
  };

  const handleReorderEnd = () => {
    setDraggingId(null);
  };

  const cycleThemeMode = () => {
    const order: ThemeMode[] = ['system', 'dark', 'light'];
    const idx = order.indexOf(themeSettings.mode);
    onChangeThemeMode(order[(idx + 1) % order.length]);
  };

  return (
    <div className="space-y-6">
      {/* Header Zone */}
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="md:hidden">
            <RepeatlyLogo size={38} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Hi, {getGreeting()}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
              {displayName?.trim() || themeSettings.userName.trim() || 'Repeatly'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!userEmail && (
            <button
              type="button"
              onClick={onSignIn}
              aria-label="Sign in to sync"
              className="md:hidden min-h-[42px] px-3 rounded-2xl border flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-hairline)',
                color: 'var(--text-primary)',
              }}
            >
              <LogIn className="w-4 h-4" />
              <span>Sync</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenTrash}
            aria-label="Open recently deleted tasks"
            title="Recently Deleted (30-day recovery)"
            className="md:hidden min-w-[42px] min-h-[42px] px-2.5 rounded-2xl border flex items-center justify-center gap-1 text-xs font-mono-tabular cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
              color: 'var(--text-secondary)',
            }}
          >
            <Trash2 className="w-4 h-4" />
            {trashCount > 0 && <span>{trashCount}</span>}
          </button>

          <button
            type="button"
            onClick={cycleThemeMode}
            title={`Theme: ${themeSettings.mode} (${resolvedTheme})`}
            aria-label="Cycle theme mode"
            className="min-h-[42px] px-3.5 rounded-2xl border flex items-center gap-2 text-xs font-medium cursor-pointer theme-transition"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
              color: 'var(--text-primary)',
            }}
          >
            {themeSettings.mode === 'system' ? (
              <SunMoon className="w-4 h-4" />
            ) : resolvedTheme === 'dark' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
            <span className="capitalize hidden sm:inline">{themeSettings.mode}</span>
          </button>
        </div>
      </header>

      <div className="md:hidden">
        <PWAInstallButton compact />
      </div>

      {/* Custom Task Tabs */}
      <TaskTabsBar
        tabs={tabs}
        selectedTabId={selectedTabId}
        onSelectTab={onSelectTab}
        onOpenTabManager={onOpenTabManager}
        countsByTab={countsByTab}
        totalCount={totalPendingCount}
      />

      {/* Responsive Desktop Split: Main Task Feed + Side Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_350px] gap-6 items-start">
        {/* Main Column */}
        <div className="space-y-5 min-w-0">
          {/* Quick Capture + Date Scope Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <form onSubmit={handleQuickAddSubmit} className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder={
                  selectedTabId === 'all'
                    ? 'Quick add a task for today...'
                    : `Add to ${tabMap[selectedTabId]?.name ?? 'tab'}...`
                }
                className="flex-1 min-h-[46px] px-4 rounded-2xl border text-sm outline-none theme-transition focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-hairline)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="submit"
                aria-label="Quick save task"
                className="min-h-[46px] px-4 rounded-2xl font-semibold text-sm flex items-center gap-1.5 cursor-pointer shrink-0 transition-transform active:scale-95"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-fg)',
                }}
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add</span>
              </button>
            </form>

            {/* Segmented Date Scope */}
            <div
              className="inline-flex items-center p-1 rounded-2xl border self-start sm:self-auto"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-hairline)',
              }}
            >
              {(['all', 'today', 'upcoming'] as DateScope[]).map((scope) => {
                const active = dateScope === scope;
                return (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setDateScope(scope)}
                    className="min-h-[36px] px-3 rounded-xl text-xs font-medium capitalize cursor-pointer whitespace-nowrap theme-transition"
                    style={{
                      backgroundColor: active ? 'var(--bg-surface-muted)' : 'transparent',
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {scope}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subtle Gesture Hint */}
          {pendingTasks.length > 0 && (
            <p className="text-xs px-1" style={{ color: 'var(--text-secondary)' }}>
              Swipe right to complete · Swipe left to delete · Hold or drag grip to reorder · Tap to edit time
            </p>
          )}

          {/* Pending Tasks List */}
          {pendingTasks.length === 0 ? (
            <div
              className="rounded-3xl border p-8 text-center space-y-3"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-hairline)',
              }}
            >
              <CheckCircle2 className="w-8 h-8 mx-auto opacity-60" />
              <div className="space-y-1">
                <p className="text-base font-semibold">No pending tasks here</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Use the quick bar above or tap + to log a task with date, optional time, and persistent alarm.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onOpenNewTask({
                    tabId: selectedTabId === 'all' ? tabs[0]?.id ?? 'home' : selectedTabId,
                    date: todayKey,
                  })
                }
                className="min-h-[44px] px-5 rounded-2xl text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-fg)',
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Create Detailed Task</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTasks.map((task) => {
                const displayItem: DisplayTaskItem = {
                  id: task.id,
                  title: task.title,
                  notes: task.notes,
                  date: task.date,
                  time: task.time,
                  tabId: task.tabId,
                  completed: task.completed,
                  highlighted: task.highlighted,
                  reminderEnabled: task.reminderEnabled,
                };
                return (
                  <div
                    key={task.id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(task.id, el);
                      else itemRefs.current.delete(task.id);
                    }}
                  >
                    <SwipeableTaskCard
                      item={displayItem}
                      tab={tabMap[task.tabId]}
                      timeFormat={themeSettings.timeFormat}
                      canReorder={pendingTasks.length > 1}
                      isDragging={draggingId === task.id}
                      onToggleComplete={() => onToggleTaskComplete(task.id)}
                      onDelete={() => onDeleteTask(task.id)}
                      onEdit={() => onEditTask(task)}
                      onReorderStart={handleReorderStart}
                      onReorderMove={handleReorderMove}
                      onReorderEnd={handleReorderEnd}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Today's Recurring Chores Section */}
          {todayRecurringItems.length > 0 && (
            <section className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Today’s Recurring
                </h2>
                <button
                  type="button"
                  onClick={onNavigateRecurring}
                  className="text-xs font-medium underline underline-offset-4 cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Manage All
                </button>
              </div>
              <div className="space-y-2.5">
                {todayRecurringItems.map((rule) => {
                  const isDone = rule.completedDates.includes(todayKey);
                  const displayItem: DisplayTaskItem = {
                    id: `rec-${rule.id}`,
                    title: rule.title,
                    notes: rule.notes,
                    date: todayKey,
                    time: rule.time,
                    tabId: rule.tabId,
                    completed: isDone,
                    reminderEnabled: rule.reminderEnabled,
                    isRecurring: true,
                    recurringRuleId: rule.id,
                  };
                  return (
                    <SwipeableTaskCard
                      key={rule.id}
                      item={displayItem}
                      tab={tabMap[rule.tabId]}
                      timeFormat={themeSettings.timeFormat}
                      canReorder={false}
                      onToggleComplete={() => onToggleRecurringComplete(rule.id, todayKey)}
                      onEdit={onNavigateRecurring}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Completed Collapsible */}
          {completedTasks.length > 0 && (
            <section className="pt-2 space-y-3">
              <button
                type="button"
                onClick={() => setShowCompleted((s) => !s)}
                className="min-h-[40px] px-2 flex items-center gap-2 text-sm font-medium cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span>
                  {showCompleted ? 'Hide' : 'Show'} Completed ({completedTasks.length})
                </span>
              </button>

              {showCompleted && (
                <div className="space-y-2.5">
                  {completedTasks.map((task) => (
                    <SwipeableTaskCard
                      key={task.id}
                      item={{
                        id: task.id,
                        title: task.title,
                        notes: task.notes,
                        date: task.date,
                        time: task.time,
                        tabId: task.tabId,
                        completed: task.completed,
                        reminderEnabled: task.reminderEnabled,
                      }}
                      tab={tabMap[task.tabId]}
                      timeFormat={themeSettings.timeFormat}
                      canReorder={false}
                      onToggleComplete={() => onToggleTaskComplete(task.id)}
                      onDelete={() => onDeleteTask(task.id)}
                      onEdit={() => onEditTask(task)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right Side Overview Column (Visible cleanly on Desktop & below on tablet) */}
        <aside className="space-y-4">
          <div
            className="rounded-3xl border p-5 space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Upcoming Alarms</h2>
              <BellRing className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </div>

            {upcomingReminders.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                No active persistent reminders scheduled. Enable a reminder on any timed task.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingReminders.map((rem) => (
                  <button
                    key={rem.id}
                    type="button"
                    onClick={() => onEditTask(rem)}
                    className="w-full text-left p-3 rounded-2xl border cursor-pointer theme-transition hover:opacity-90"
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-hairline)',
                    }}
                  >
                    <p className="text-sm font-medium truncate">{rem.title}</p>
                    <p
                      className="text-xs mt-1 font-mono-tabular"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {rem.date === todayKey ? 'Today' : rem.date}
                      {rem.time ? ` · ${formatTimeDisplay(rem.time, themeSettings.timeFormat)}` : ''}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
