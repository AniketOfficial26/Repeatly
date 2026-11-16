import { FolderPlus } from 'lucide-react';
import { TaskTab } from '../types/todo';
import { TabIcon } from './TabIcon';

interface TaskTabsBarProps {
  tabs: TaskTab[];
  selectedTabId: string;
  onSelectTab: (tabId: string) => void;
  onOpenTabManager: () => void;
  countsByTab: Record<string, number>;
  totalCount: number;
}

export function TaskTabsBar({
  tabs,
  selectedTabId,
  onSelectTab,
  onOpenTabManager,
  countsByTab,
  totalCount,
}: TaskTabsBarProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
      <button
        type="button"
        onClick={() => onSelectTab('all')}
        className="min-h-[42px] px-4 rounded-2xl text-sm font-medium flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer border theme-transition"
        style={{
          backgroundColor: selectedTabId === 'all' ? 'var(--accent)' : 'var(--bg-surface)',
          color: selectedTabId === 'all' ? 'var(--accent-fg)' : 'var(--text-secondary)',
          borderColor: selectedTabId === 'all' ? 'transparent' : 'var(--border-hairline)',
        }}
      >
        <span>All</span>
        <span className="text-xs font-mono-tabular opacity-80">{totalCount}</span>
      </button>

      {tabs.map((tab) => {
        const isSelected = selectedTabId === tab.id;
        const count = countsByTab[tab.id] ?? 0;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className="min-h-[42px] px-4 rounded-2xl text-sm font-medium flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer border theme-transition"
            style={{
              backgroundColor: isSelected ? 'var(--accent)' : 'var(--bg-surface)',
              color: isSelected ? 'var(--accent-fg)' : 'var(--text-secondary)',
              borderColor: isSelected ? 'transparent' : 'var(--border-hairline)',
            }}
          >
            <TabIcon name={tab.icon} className="w-4 h-4 shrink-0" />
            <span>{tab.name}</span>
            <span className="text-xs font-mono-tabular opacity-80">{count}</span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={onOpenTabManager}
        aria-label="Manage custom tabs"
        className="min-h-[42px] px-3.5 rounded-2xl text-sm font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer border theme-transition hover:opacity-90"
        style={{
          backgroundColor: 'var(--bg-surface-muted)',
          color: 'var(--text-primary)',
          borderColor: 'var(--border-hairline)',
        }}
      >
        <FolderPlus className="w-4 h-4 shrink-0" />
        <span>Tabs</span>
      </button>
    </div>
  );
}
