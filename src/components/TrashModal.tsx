import { RotateCcw, Trash2, X } from 'lucide-react';
import { Task, TaskTab } from '../types/todo';
import { formatDateFriendly } from '../utils/dateUtils';

interface TrashModalProps {
  isOpen: boolean;
  trashTasks: Task[];
  tabs: TaskTab[];
  onClose: () => void;
  onRestoreTask: (taskId: string) => void;
  onPermanentDeleteTask: (taskId: string) => void;
}

function getDaysLeft(deletedAtIso?: string): number {
  if (!deletedAtIso) return 30;
  const elapsedMs = Date.now() - new Date(deletedAtIso).getTime();
  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  return Math.max(0, 30 - elapsedDays);
}

export function TrashModal({
  isOpen,
  trashTasks,
  tabs,
  onClose,
  onRestoreTask,
  onPermanentDeleteTask,
}: TrashModalProps) {
  if (!isOpen) return null;

  const tabMap: Record<string, TaskTab> = {};
  for (const t of tabs) tabMap[t.id] = t;

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
        className="w-full sm:max-w-lg max-h-[86dvh] flex flex-col rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden theme-transition"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
          color: 'var(--text-primary)',
        }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between border-b"
          style={{ borderColor: 'var(--border-hairline)' }}
        >
          <div>
            <h2 className="text-lg font-bold">Recently Deleted</h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Deleted tasks are permanently removed after 30 days.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close recently deleted"
            className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {trashTasks.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Trash2 className="w-7 h-7 mx-auto opacity-50" />
              <p className="text-sm font-semibold">Trash is empty</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Tasks you delete stay recoverable here for 30 days.
              </p>
            </div>
          ) : (
            trashTasks.map((task) => {
              const daysLeft = getDaysLeft(task.deletedAt);
              const tabName = tabMap[task.tabId]?.name ?? 'General';
              return (
                <div
                  key={task.id}
                  className="rounded-2xl border p-4 flex items-center justify-between gap-3"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-hairline)',
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{task.title}</p>
                    <p
                      className="text-xs mt-1 font-mono-tabular"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {tabName} · {formatDateFriendly(task.date)} · {daysLeft}d left
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onRestoreTask(task.id)}
                      aria-label={`Restore ${task.title}`}
                      className="min-h-[38px] px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--accent)',
                        color: 'var(--accent-fg)',
                      }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onPermanentDeleteTask(task.id)}
                      aria-label={`Permanently delete ${task.title}`}
                      className="min-w-[38px] min-h-[38px] rounded-xl flex items-center justify-center cursor-pointer text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
