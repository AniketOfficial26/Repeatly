import React, { useRef, useState } from 'react';
import {
  BellRing,
  Check,
  GripVertical,
  Repeat,
  Trash2,
} from 'lucide-react';
import { TaskTab } from '../types/todo';
import { formatDateFriendly, formatTimeDisplay } from '../utils/dateUtils';
import { alarmEngine } from '../utils/soundEngine';
import { TabIcon } from './TabIcon';

export interface DisplayTaskItem {
  id: string;
  title: string;
  notes?: string;
  date: string;
  time?: string;
  tabId: string;
  completed: boolean;
  highlighted?: boolean;
  reminderEnabled: boolean;
  isRecurring?: boolean;
  recurringRuleId?: string;
}

interface SwipeableTaskCardProps {
  item: DisplayTaskItem;
  tab?: TaskTab;
  timeFormat: '12h' | '24h';
  canReorder: boolean;
  isDragging?: boolean;
  onToggleComplete: () => void;
  onDelete?: () => void;
  onEdit: () => void;
  onReorderStart?: (id: string, clientY: number) => void;
  onReorderMove?: (clientY: number) => void;
  onReorderEnd?: () => void;
}

const SWIPE_THRESHOLD = 78;

export function SwipeableTaskCard({
  item,
  tab,
  timeFormat,
  canReorder,
  isDragging = false,
  onToggleComplete,
  onDelete,
  onEdit,
  onReorderStart,
  onReorderMove,
  onReorderEnd,
}: SwipeableTaskCardProps) {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const pointerStartRef = useRef<{
    x: number;
    y: number;
    pointerId: number;
    time: number;
    mode: 'idle' | 'swipe' | 'reorder';
  } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore right-clicks or clicks directly on explicit action buttons
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-no-gesture="true"]')) return;

    suppressClickRef.current = false;
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      time: Date.now(),
      mode: 'idle',
    };

    if (canReorder && onReorderStart) {
      clearLongPress();
      const startY = e.clientY;
      longPressTimerRef.current = window.setTimeout(() => {
        if (!pointerStartRef.current || pointerStartRef.current.mode !== 'idle') return;
        pointerStartRef.current.mode = 'reorder';
        suppressClickRef.current = true;
        alarmEngine.triggerHapticTap(18);
        try {
          e.currentTarget.setPointerCapture(pointerStartRef.current.pointerId);
        } catch {
          // Ignore if target unmounted
        }
        onReorderStart(item.id, startY);
      }, 360);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const state = pointerStartRef.current;
    if (!state) return;

    const dx = e.clientX - state.x;
    const dy = e.clientY - state.y;

    if (state.mode === 'reorder') {
      e.preventDefault();
      onReorderMove?.(e.clientY);
      return;
    }

    if (state.mode === 'idle') {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        // User is scrolling vertically; cancel long-press and swipe
        clearLongPress();
        pointerStartRef.current = null;
        return;
      }

      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        clearLongPress();
        state.mode = 'swipe';
        suppressClickRef.current = true;
        setIsSwiping(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Ignore
        }
      }
    }

    if (state.mode === 'swipe') {
      // Limit swipe-left if item cannot be deleted (recurring occurrence)
      const clampedX = !onDelete && dx < 0 ? Math.max(-28, dx * 0.25) : Math.max(-130, Math.min(130, dx));
      setSwipeX(clampedX);
    }
  };

  const handlePointerEnd = () => {
    clearLongPress();
    const state = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!state) return;

    if (state.mode === 'reorder') {
      onReorderEnd?.();
      return;
    }

    if (state.mode === 'swipe') {
      setIsSwiping(false);
      if (swipeX >= SWIPE_THRESHOLD) {
        alarmEngine.triggerHapticTap(15);
        setSwipeX(0);
        onToggleComplete();
      } else if (swipeX <= -SWIPE_THRESHOLD && onDelete) {
        alarmEngine.triggerHapticTap(20);
        setSwipeX(0);
        onDelete();
      } else {
        setSwipeX(0);
      }
    }
  };

  const handleGripPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!canReorder || !onReorderStart) return;
    e.stopPropagation();
    suppressClickRef.current = true;
    alarmEngine.triggerHapticTap(14);
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      time: Date.now(),
      mode: 'reorder',
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    onReorderStart(item.id, e.clientY);
  };

  // Use reference-inspired bright lime card for highlighted active reminder items
  const isAccentCard = !item.completed && (item.highlighted || item.reminderEnabled);

  const cardBg = isAccentCard ? 'var(--accent-card)' : 'var(--bg-surface)';
  const cardText = isAccentCard ? 'var(--accent-card-fg)' : 'var(--text-primary)';
  const cardMutedText = isAccentCard ? 'rgba(20, 22, 13, 0.72)' : 'var(--text-secondary)';
  const cardBorder = isAccentCard ? 'transparent' : 'var(--border-hairline)';

  return (
    <div className="relative rounded-3xl overflow-hidden select-none touch-pan-y">
      {/* Swipe Action Reveal Backdrop */}
      <div
        className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none"
        style={{
          backgroundColor:
            swipeX > 15
              ? 'var(--accent)'
              : swipeX < -15 && onDelete
              ? '#D94B38'
              : 'var(--bg-surface-muted)',
          opacity: Math.abs(swipeX) > 6 ? 1 : 0,
        }}
      >
        <div
          className="flex items-center gap-2 text-sm font-semibold"
          style={{
            color: 'var(--accent-fg)',
            opacity: swipeX > 20 ? Math.min(1, swipeX / SWIPE_THRESHOLD) : 0,
          }}
        >
          <Check className="w-5 h-5 stroke-[2.5]" />
          <span>{item.completed ? 'Reopen' : 'Done'}</span>
        </div>
        {onDelete && (
          <div
            className="flex items-center gap-2 text-sm font-semibold text-white"
            style={{
              opacity: swipeX < -20 ? Math.min(1, Math.abs(swipeX) / SWIPE_THRESHOLD) : 0,
            }}
          >
            <span>Delete</span>
            <Trash2 className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Foreground Card */}
      <div
        role="button"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          onEdit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onEdit();
          }
        }}
        className={`relative rounded-3xl p-4 sm:p-5 border cursor-pointer theme-transition ${
          isDragging ? 'scale-[1.02] shadow-xl z-20 ring-2' : 'shadow-sm'
        } ${item.completed ? 'opacity-65' : ''}`}
        style={{
          backgroundColor: cardBg,
          color: cardText,
          borderColor: cardBorder,
          transform: `translate3d(${swipeX}px, 0, 0)`,
          transition: isSwiping ? 'none' : 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease',
        }}
      >
        <div className="flex items-start gap-3.5">
          {/* Complete Checkbox Hitbox >= 44px */}
          <button
            type="button"
            data-no-gesture="true"
            onClick={(e) => {
              e.stopPropagation();
              alarmEngine.triggerHapticTap(12);
              onToggleComplete();
            }}
            aria-label={item.completed ? `Mark ${item.title} incomplete` : `Mark ${item.title} complete`}
            className="min-w-[44px] min-h-[44px] -m-1.5 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <span
              className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
              style={{
                borderColor: item.completed
                  ? isAccentCard
                    ? 'var(--accent-card-fg)'
                    : 'var(--accent)'
                  : isAccentCard
                  ? 'rgba(20, 22, 13, 0.45)'
                  : 'var(--text-secondary)',
                backgroundColor: item.completed
                  ? isAccentCard
                    ? 'var(--accent-card-fg)'
                    : 'var(--accent)'
                  : 'transparent',
                color: item.completed
                  ? isAccentCard
                    ? 'var(--accent-card)'
                    : 'var(--accent-fg)'
                  : 'transparent',
              }}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </span>
          </button>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={`text-base font-semibold leading-snug break-words ${
                  item.completed ? 'line-through' : ''
                }`}
              >
                {item.title}
              </h3>

              {/* Reorder Grip / Delete Affordance */}
              <div className="flex items-center gap-1 shrink-0 -mr-1 -mt-1">
                {canReorder && (
                  <button
                    type="button"
                    data-no-gesture="true"
                    onPointerDown={handleGripPointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerEnd}
                    onPointerCancel={handlePointerEnd}
                    aria-label="Drag to reorder task"
                    title="Hold or drag to reorder"
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl cursor-grab active:cursor-grabbing opacity-60 hover:opacity-100"
                    style={{ color: cardMutedText }}
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {item.notes && (
              <p
                className="text-sm mt-1 line-clamp-2 leading-relaxed"
                style={{ color: cardMutedText }}
              >
                {item.notes}
              </p>
            )}

            {/* Clean Unboxed Metadata Row (Zero-Pill Discipline) */}
            <div
              className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium"
              style={{ color: cardMutedText }}
            >
              {tab && (
                <span className="inline-flex items-center gap-1">
                  <TabIcon name={tab.icon} className="w-3.5 h-3.5" />
                  <span>{tab.name}</span>
                </span>
              )}

              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">{formatDateFriendly(item.date)}</span>

              {item.time && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">{formatTimeDisplay(item.time, timeFormat)}</span>
                </>
              )}

              {item.reminderEnabled && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <BellRing className="w-3.5 h-3.5" />
                    <span>Persistent Alarm</span>
                  </span>
                </>
              )}

              {item.isRecurring && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Repeat className="w-3.5 h-3.5" />
                    <span>Recurring</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
