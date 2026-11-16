import { CalendarDays, Home, LogIn, LogOut, Plus, Repeat, Settings2, Trash2 } from 'lucide-react';
import { NavSection, TaskTab } from '../types/todo';
import { PWAInstallButton } from './PWAInstallButton';
import { RepeatlyLogo } from './RepeatlyLogo';
import { TabIcon } from './TabIcon';

interface BottomNavProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  onOpenNewTask: () => void;
  tabs: TaskTab[];
  selectedTabId: string;
  onSelectTab: (tabId: string) => void;
  pendingCount: number;
  recurringCount: number;
  trashCount: number;
  onOpenTrash: () => void;
  userEmail: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function BottomNav({
  activeSection,
  onSelectSection,
  onOpenNewTask,
  tabs,
  selectedTabId,
  onSelectTab,
  pendingCount,
  recurringCount,
  trashCount,
  onOpenTrash,
  userEmail,
  onSignIn,
  onSignOut,
}: BottomNavProps) {
  const navItems: Array<{ id: NavSection; label: string; icon: typeof Home; count?: number }> = [
    { id: 'tasks', label: 'Tasks', icon: Home, count: pendingCount },
    { id: 'schedule', label: 'Schedule', icon: CalendarDays },
    { id: 'recurring', label: 'Recurring', icon: Repeat, count: recurringCount },
    { id: 'settings', label: 'Settings', icon: Settings2 },
  ];

  return (
    <>
      {/* Desktop / Tablet Sidebar Navigation */}
      <aside
        className="hidden md:flex md:flex-col md:w-64 lg:w-72 shrink-0 h-dvh sticky top-0 border-r theme-transition px-5 py-6 justify-between"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
        }}
      >
        <div className="space-y-6">
          {/* Brand */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <RepeatlyLogo size={34} />
              <span className="text-lg font-bold tracking-tight">Repeatly</span>
            </div>
          </div>

          {/* Primary Create CTA */}
          <button
            type="button"
            onClick={onOpenNewTask}
            className="w-full min-h-[46px] px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.98] shadow-sm"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-fg)',
            }}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Task</span>
          </button>

          {/* Main Views */}
          <nav className="space-y-1" aria-label="Primary Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectSection(item.id)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl flex items-center justify-between text-sm font-medium cursor-pointer theme-transition"
                  style={{
                    backgroundColor: isActive ? 'var(--bg-surface-muted)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  <span className="flex items-center gap-3 whitespace-nowrap">
                    <Icon className="w-[18px] h-[18px]" />
                    <span>{item.label}</span>
                  </span>
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span
                      className="text-xs font-mono-tabular"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={onOpenTrash}
              className="w-full min-h-[44px] px-3.5 rounded-xl flex items-center justify-between text-sm font-medium cursor-pointer theme-transition"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span className="flex items-center gap-3 whitespace-nowrap">
                <Trash2 className="w-[18px] h-[18px]" />
                <span>Trash (30d)</span>
              </span>
              {trashCount > 0 && (
                <span className="text-xs font-mono-tabular">{trashCount}</span>
              )}
            </button>
          </nav>

          {/* Quick Jump to Custom Tabs */}
          <div className="pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
            <div
              className="px-3 mb-2 text-xs font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Task Tabs
            </div>
            <div className="space-y-1 max-h-[28vh] overflow-y-auto no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  onSelectTab('all');
                  onSelectSection('tasks');
                }}
                className="w-full min-h-[40px] px-3 rounded-xl flex items-center gap-2.5 text-sm cursor-pointer theme-transition"
                style={{
                  backgroundColor:
                    activeSection === 'tasks' && selectedTabId === 'all'
                      ? 'var(--accent-soft)'
                      : 'transparent',
                  color:
                    activeSection === 'tasks' && selectedTabId === 'all'
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)',
                }}
              >
                <span className="w-4 h-4 flex items-center justify-center text-xs font-semibold">
                  #
                </span>
                <span className="truncate">All Tasks</span>
              </button>
              {tabs.map((tab) => {
                const active = activeSection === 'tasks' && selectedTabId === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(tab.id);
                      onSelectSection('tasks');
                    }}
                    className="w-full min-h-[40px] px-3 rounded-xl flex items-center gap-2.5 text-sm cursor-pointer theme-transition"
                    style={{
                      backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    <TabIcon name={tab.icon} className="w-4 h-4 shrink-0" />
                    <span className="truncate">{tab.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
          <PWAInstallButton />
          {userEmail ? (
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{userEmail}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  Signed in
                </p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                title="Sign out"
                aria-label="Sign out"
                className="min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: 'var(--text-secondary)' }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="w-full min-h-[42px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-hairline)',
              }}
            >
              <LogIn className="w-4 h-4" />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Frosted Floating Bottom Dock (<= 15% mobile height cap) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-3 left-3 right-3 z-40 rounded-3xl border backdrop-blur-xl shadow-lg theme-transition"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-surface-elevated) 84%, transparent)',
          borderColor: 'var(--border-hairline)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="grid grid-cols-5 items-center h-[60px] px-2">
          {/* Tasks */}
          <button
            type="button"
            onClick={() => onSelectSection('tasks')}
            aria-label="Tasks"
            className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-opacity"
            style={{
              color: activeSection === 'tasks' ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            <Home
              className="w-5 h-5"
              strokeWidth={activeSection === 'tasks' ? 2.4 : 1.8}
            />
            <span className="text-[10px] font-medium tracking-tight">Tasks</span>
          </button>

          {/* Schedule */}
          <button
            type="button"
            onClick={() => onSelectSection('schedule')}
            aria-label="Schedule"
            className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-opacity"
            style={{
              color: activeSection === 'schedule' ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            <CalendarDays
              className="w-5 h-5"
              strokeWidth={activeSection === 'schedule' ? 2.4 : 1.8}
            />
            <span className="text-[10px] font-medium tracking-tight">Schedule</span>
          </button>

          {/* Center Electric Lime Add Button */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={onOpenNewTask}
              aria-label="Add New Task"
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md cursor-pointer transition-transform active:scale-95"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-fg)',
              }}
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          {/* Recurring */}
          <button
            type="button"
            onClick={() => onSelectSection('recurring')}
            aria-label="Recurring"
            className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-opacity"
            style={{
              color: activeSection === 'recurring' ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            <Repeat
              className="w-5 h-5"
              strokeWidth={activeSection === 'recurring' ? 2.4 : 1.8}
            />
            <span className="text-[10px] font-medium tracking-tight">Recurring</span>
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => onSelectSection('settings')}
            aria-label="Settings"
            className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-opacity"
            style={{
              color: activeSection === 'settings' ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            <Settings2
              className="w-5 h-5"
              strokeWidth={activeSection === 'settings' ? 2.4 : 1.8}
            />
            <span className="text-[10px] font-medium tracking-tight">Settings</span>
          </button>
        </div>
      </nav>
    </>
  );
}
