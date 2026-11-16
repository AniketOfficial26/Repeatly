import React, { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { TaskTab } from '../types/todo';
import { TAB_ICON_OPTIONS, TabIcon } from './TabIcon';

interface TabManagerModalProps {
  isOpen: boolean;
  tabs: TaskTab[];
  onClose: () => void;
  onAddTab: (name: string, icon: string) => void;
  onUpdateTab: (tabId: string, name: string, icon: string) => void;
  onDeleteTab: (tabId: string) => void;
}

export function TabManagerModal({
  isOpen,
  tabs,
  onClose,
  onAddTab,
  onUpdateTab,
  onDeleteTab,
}: TabManagerModalProps) {
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState<string>('home');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('home');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAddTab(trimmed, newIcon);
    setNewName('');
  };

  const startEdit = (tab: TaskTab) => {
    setEditingId(tab.id);
    setEditName(tab.name);
    setEditIcon(tab.icon);
  };

  const saveEdit = (tabId: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    onUpdateTab(tabId, trimmed, editIcon);
    setEditingId(null);
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
        className="w-full sm:max-w-md max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden theme-transition"
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
            <h2 className="text-lg font-bold">Manage Custom Tabs</h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Organize chores, errands, or projects in dedicated views.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tab manager"
            className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Create Tab Form */}
          <form
            onSubmit={handleCreate}
            className="rounded-2xl border p-4 space-y-3"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-hairline)',
            }}
          >
            <label className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>
              Create New Tab
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Groceries, Maintenance, Fitness"
                className="flex-1 min-h-[44px] px-3.5 rounded-xl border text-sm outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-hairline)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="submit"
                className="min-h-[44px] px-4 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-fg)',
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {TAB_ICON_OPTIONS.map((opt) => {
                const active = newIcon === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setNewIcon(opt.id)}
                    title={opt.label}
                    className="min-w-[38px] min-h-[38px] rounded-xl border flex items-center justify-center cursor-pointer"
                    style={{
                      backgroundColor: active ? 'var(--accent)' : 'var(--bg-surface)',
                      color: active ? 'var(--accent-fg)' : 'var(--text-secondary)',
                      borderColor: active ? 'transparent' : 'var(--border-hairline)',
                    }}
                  >
                    <TabIcon name={opt.id} className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </form>

          {/* Existing Tabs List */}
          <div className="space-y-2">
            {tabs.map((tab) => {
              const isEditing = editingId === tab.id;
              return (
                <div
                  key={tab.id}
                  className="rounded-2xl border p-3 flex items-center justify-between gap-2"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-hairline)',
                  }}
                >
                  {isEditing ? (
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 min-h-[40px] px-3 rounded-xl border text-sm outline-none"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-hairline)',
                            color: 'var(--text-primary)',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => saveEdit(tab.id)}
                          aria-label="Save tab"
                          className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center cursor-pointer"
                          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {TAB_ICON_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setEditIcon(opt.id)}
                            className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer"
                            style={{
                              backgroundColor:
                                editIcon === opt.id ? 'var(--accent)' : 'var(--bg-surface)',
                              color:
                                editIcon === opt.id ? 'var(--accent-fg)' : 'var(--text-secondary)',
                              borderColor: 'var(--border-hairline)',
                            }}
                          >
                            <TabIcon name={opt.id} className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: 'var(--bg-surface-muted)' }}
                        >
                          <TabIcon name={tab.icon} className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-semibold truncate">{tab.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(tab)}
                          aria-label={`Rename ${tab.name}`}
                          className="min-w-[38px] min-h-[38px] rounded-xl flex items-center justify-center cursor-pointer"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {tabs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteTab(tab.id)}
                            aria-label={`Delete ${tab.name}`}
                            className="min-w-[38px] min-h-[38px] rounded-xl flex items-center justify-center cursor-pointer text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
