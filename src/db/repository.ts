import { and, asc, eq, isNotNull, isNull, lt } from 'drizzle-orm';
import { DEFAULT_TABS } from '../data/defaults.ts';
import type {
  RecurringRule,
  ReminderPreferences,
  Task,
  TaskTab,
  ThemeSettings,
} from '../types/todo.ts';
import { db } from './index.ts';
import { recurringRules, tasks, taskTabs, users } from './schema.ts';

const RETENTION_DAYS = 30;

async function assertTabOwnership(uid: string, tabId: string): Promise<void> {
  const [tab] = await db
    .select({ userUid: taskTabs.userUid })
    .from(taskTabs)
    .where(eq(taskTabs.id, tabId));
  if (!tab || tab.userUid !== uid) {
    throw new Error('Task tab does not belong to the authenticated user.');
  }
}

function getRetentionCutoffDate(): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  return cutoff;
}

export async function purgeExpiredDeletedItems(userUid?: string): Promise<{
  purgedTasks: number;
  purgedRecurring: number;
}> {
  try {
    const cutoff = getRetentionCutoffDate();

    const taskCondition = userUid
      ? and(eq(tasks.userUid, userUid), isNotNull(tasks.deletedAt), lt(tasks.deletedAt, cutoff))
      : and(isNotNull(tasks.deletedAt), lt(tasks.deletedAt, cutoff));

    const recCondition = userUid
      ? and(
          eq(recurringRules.userUid, userUid),
          isNotNull(recurringRules.deletedAt),
          lt(recurringRules.deletedAt, cutoff)
        )
      : and(isNotNull(recurringRules.deletedAt), lt(recurringRules.deletedAt, cutoff));

    const deletedTasks = await db.delete(tasks).where(taskCondition).returning({ id: tasks.id });
    const deletedRules = await db
      .delete(recurringRules)
      .where(recCondition)
      .returning({ id: recurringRules.id });

    return {
      purgedTasks: deletedTasks.length,
      purgedRecurring: deletedRules.length,
    };
  } catch (error) {
    console.error('Database purge failed:', error);
    throw new Error('Failed to purge expired deleted tasks.', { cause: error });
  }
}

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName || null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('User upsert failed:', error);
    throw new Error('Database user sync failed.', { cause: error });
  }
}

export async function bootstrapUserData(uid: string, email: string, displayName?: string) {
  try {
    const user = await getOrCreateUser(uid, email, displayName);
    await purgeExpiredDeletedItems(uid);

    let userTabs = await db
      .select()
      .from(taskTabs)
      .where(eq(taskTabs.userUid, uid))
      .orderBy(asc(taskTabs.order));

    if (userTabs.length === 0) {
      const seedTabs = DEFAULT_TABS.map((t) => ({
        id: `${uid}_${t.id}`,
        userUid: uid,
        name: t.name,
        icon: t.icon,
        order: t.order,
      }));
      await db.insert(taskTabs).values(seedTabs).onConflictDoNothing();
      userTabs = await db
        .select()
        .from(taskTabs)
        .where(eq(taskTabs.userUid, uid))
        .orderBy(asc(taskTabs.order));
    }

    const activeTaskRows = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userUid, uid), isNull(tasks.deletedAt)))
      .orderBy(asc(tasks.order));

    const trashTaskRows = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userUid, uid), isNotNull(tasks.deletedAt)));

    const activeRuleRows = await db
      .select()
      .from(recurringRules)
      .where(and(eq(recurringRules.userUid, uid), isNull(recurringRules.deletedAt)));

    return {
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        themeSettings: user.themeSettings,
        reminderPrefs: user.reminderPrefs,
      },
      tabs: userTabs.map((t) => ({
        id: t.id,
        name: t.name,
        icon: t.icon,
        order: t.order,
      })),
      tasks: activeTaskRows.map(mapTaskRow),
      trashTasks: trashTaskRows.map(mapTaskRow),
      recurringRules: activeRuleRows.map(mapRecurringRow),
    };
  } catch (error) {
    console.error('Bootstrap query failed:', error);
    throw new Error('Failed to load workspace from database.', { cause: error });
  }
}

function mapTaskRow(row: typeof tasks.$inferSelect): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? undefined,
    date: row.date,
    time: row.time ?? undefined,
    tabId: row.tabId,
    completed: row.completed,
    completedAt: row.completedAt ?? undefined,
    order: row.order,
    highlighted: row.highlighted,
    reminderEnabled: row.reminderEnabled,
    reminderChannels: row.reminderChannels ?? undefined,
    reminderDismissedAt: row.reminderDismissedAt ?? undefined,
    snoozedUntil: row.snoozedUntil ?? undefined,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapRecurringRow(row: typeof recurringRules.$inferSelect): RecurringRule {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? undefined,
    tabId: row.tabId,
    frequency: row.frequency as RecurringRule['frequency'],
    daysOfWeek: row.daysOfWeek ?? undefined,
    dayOfMonth: row.dayOfMonth ?? undefined,
    intervalDays: row.intervalDays ?? undefined,
    startDate: row.startDate,
    time: row.time ?? undefined,
    active: row.active,
    reminderEnabled: row.reminderEnabled,
    reminderChannels: row.reminderChannels ?? undefined,
    completedDates: row.completedDates ?? [],
    dismissedDates: row.dismissedDates ?? [],
    createdAt: row.createdAt.toISOString(),
  };
}

export async function upsertTask(uid: string, task: Task): Promise<Task> {
  try {
    await assertTabOwnership(uid, task.tabId);
    const [existing] = await db
      .select({ userUid: tasks.userUid })
      .from(tasks)
      .where(eq(tasks.id, task.id));
    if (existing && existing.userUid !== uid) {
      throw new Error('Task does not belong to the authenticated user.');
    }

    const [row] = await db
      .insert(tasks)
      .values({
        id: task.id,
        userUid: uid,
        title: task.title,
        notes: task.notes ?? null,
        date: task.date,
        time: task.time ?? null,
        tabId: task.tabId,
        completed: task.completed,
        completedAt: task.completedAt ?? null,
        order: task.order,
        highlighted: !!task.highlighted,
        reminderEnabled: task.reminderEnabled,
        reminderChannels: task.reminderChannels ?? null,
        reminderDismissedAt: task.reminderDismissedAt ?? null,
        snoozedUntil: task.snoozedUntil ?? null,
        deletedAt: task.deletedAt ? new Date(task.deletedAt) : null,
      })
      .onConflictDoUpdate({
        target: tasks.id,
        set: {
          title: task.title,
          notes: task.notes ?? null,
          date: task.date,
          time: task.time ?? null,
          tabId: task.tabId,
          completed: task.completed,
          completedAt: task.completedAt ?? null,
          order: task.order,
          highlighted: !!task.highlighted,
          reminderEnabled: task.reminderEnabled,
          reminderChannels: task.reminderChannels ?? null,
          reminderDismissedAt: task.reminderDismissedAt ?? null,
          snoozedUntil: task.snoozedUntil ?? null,
          deletedAt: task.deletedAt ? new Date(task.deletedAt) : null,
        },
      })
      .returning();
    return mapTaskRow(row);
  } catch (error) {
    console.error('Upsert task failed:', error);
    throw new Error('Failed to save task.', { cause: error });
  }
}

export async function reorderTasksInDb(uid: string, orderedIds: string[]): Promise<void> {
  try {
    await Promise.all(
      orderedIds.map((id, idx) =>
        db
          .update(tasks)
          .set({ order: idx })
          .where(and(eq(tasks.id, id), eq(tasks.userUid, uid)))
      )
    );
  } catch (error) {
    console.error('Reorder tasks failed:', error);
    throw new Error('Failed to reorder tasks.', { cause: error });
  }
}

export async function softDeleteTaskInDb(uid: string, taskId: string): Promise<string | null> {
  try {
    const now = new Date();
    const [row] = await db
      .update(tasks)
      .set({ deletedAt: now })
      .where(and(eq(tasks.id, taskId), eq(tasks.userUid, uid)))
      .returning({ deletedAt: tasks.deletedAt });
    return row?.deletedAt ? row.deletedAt.toISOString() : null;
  } catch (error) {
    console.error('Soft delete task failed:', error);
    throw new Error('Failed to move task to 30-day trash.', { cause: error });
  }
}

export async function restoreTaskInDb(uid: string, taskId: string): Promise<Task | null> {
  try {
    const [row] = await db
      .update(tasks)
      .set({ deletedAt: null })
      .where(and(eq(tasks.id, taskId), eq(tasks.userUid, uid)))
      .returning();
    return row ? mapTaskRow(row) : null;
  } catch (error) {
    console.error('Restore task failed:', error);
    throw new Error('Failed to restore task.', { cause: error });
  }
}

export async function permanentDeleteTaskInDb(uid: string, taskId: string): Promise<void> {
  try {
    await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userUid, uid)));
  } catch (error) {
    console.error('Permanent delete task failed:', error);
    throw new Error('Failed to permanently delete task.', { cause: error });
  }
}

export async function upsertRecurringRule(uid: string, rule: RecurringRule): Promise<RecurringRule> {
  try {
    await assertTabOwnership(uid, rule.tabId);
    const [existing] = await db
      .select({ userUid: recurringRules.userUid })
      .from(recurringRules)
      .where(eq(recurringRules.id, rule.id));
    if (existing && existing.userUid !== uid) {
      throw new Error('Recurring rule does not belong to the authenticated user.');
    }

    const [row] = await db
      .insert(recurringRules)
      .values({
        id: rule.id,
        userUid: uid,
        title: rule.title,
        notes: rule.notes ?? null,
        tabId: rule.tabId,
        frequency: rule.frequency,
        daysOfWeek: rule.daysOfWeek ?? null,
        dayOfMonth: rule.dayOfMonth ?? null,
        intervalDays: rule.intervalDays ?? null,
        startDate: rule.startDate,
        time: rule.time ?? null,
        active: rule.active,
        reminderEnabled: rule.reminderEnabled,
        reminderChannels: rule.reminderChannels ?? null,
        completedDates: rule.completedDates,
        dismissedDates: rule.dismissedDates,
        deletedAt: null,
      })
      .onConflictDoUpdate({
        target: recurringRules.id,
        set: {
          title: rule.title,
          notes: rule.notes ?? null,
          tabId: rule.tabId,
          frequency: rule.frequency,
          daysOfWeek: rule.daysOfWeek ?? null,
          dayOfMonth: rule.dayOfMonth ?? null,
          intervalDays: rule.intervalDays ?? null,
          startDate: rule.startDate,
          time: rule.time ?? null,
          active: rule.active,
          reminderEnabled: rule.reminderEnabled,
          reminderChannels: rule.reminderChannels ?? null,
          completedDates: rule.completedDates,
          dismissedDates: rule.dismissedDates,
        },
      })
      .returning();
    return mapRecurringRow(row);
  } catch (error) {
    console.error('Upsert recurring rule failed:', error);
    throw new Error('Failed to save recurring task.', { cause: error });
  }
}

export async function softDeleteRecurringInDb(uid: string, ruleId: string): Promise<void> {
  try {
    await db
      .update(recurringRules)
      .set({ deletedAt: new Date(), active: false })
      .where(and(eq(recurringRules.id, ruleId), eq(recurringRules.userUid, uid)));
  } catch (error) {
    console.error('Soft delete recurring rule failed:', error);
    throw new Error('Failed to delete recurring task.', { cause: error });
  }
}

export async function upsertTabInDb(uid: string, tab: TaskTab): Promise<TaskTab> {
  try {
    const [existing] = await db
      .select({ userUid: taskTabs.userUid })
      .from(taskTabs)
      .where(eq(taskTabs.id, tab.id));
    if (existing && existing.userUid !== uid) {
      throw new Error('Task tab does not belong to the authenticated user.');
    }

    const [row] = await db
      .insert(taskTabs)
      .values({
        id: tab.id,
        userUid: uid,
        name: tab.name,
        icon: tab.icon,
        order: tab.order,
      })
      .onConflictDoUpdate({
        target: taskTabs.id,
        set: {
          name: tab.name,
          icon: tab.icon,
          order: tab.order,
        },
      })
      .returning();
    return {
      id: row.id,
      name: row.name,
      icon: row.icon,
      order: row.order,
    };
  } catch (error) {
    console.error('Upsert tab failed:', error);
    throw new Error('Failed to save tab.', { cause: error });
  }
}

export async function deleteTabInDb(
  uid: string,
  tabId: string,
  fallbackTabId: string
): Promise<void> {
  try {
    await db
      .update(tasks)
      .set({ tabId: fallbackTabId })
      .where(and(eq(tasks.userUid, uid), eq(tasks.tabId, tabId)));
    await db
      .update(recurringRules)
      .set({ tabId: fallbackTabId })
      .where(and(eq(recurringRules.userUid, uid), eq(recurringRules.tabId, tabId)));
    await db.delete(taskTabs).where(and(eq(taskTabs.id, tabId), eq(taskTabs.userUid, uid)));
  } catch (error) {
    console.error('Delete tab failed:', error);
    throw new Error('Failed to delete tab.', { cause: error });
  }
}

export async function saveUserPreferencesInDb(
  uid: string,
  themeSettings?: ThemeSettings,
  reminderPrefs?: ReminderPreferences
): Promise<void> {
  try {
    const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (themeSettings) patch.themeSettings = themeSettings;
    if (reminderPrefs) patch.reminderPrefs = reminderPrefs;
    await db.update(users).set(patch).where(eq(users.uid, uid));
  } catch (error) {
    console.error('Save preferences failed:', error);
    throw new Error('Failed to save user preferences.', { cause: error });
  }
}

export async function importGuestDataForNewUser(
  uid: string,
  payload: {
    tabs: TaskTab[];
    tasks: Task[];
    recurringRules: RecurringRule[];
    themeSettings?: ThemeSettings;
    reminderPrefs?: ReminderPreferences;
  }
): Promise<void> {
  try {
    for (const tab of payload.tabs) {
      await upsertTabInDb(uid, { ...tab, id: `${uid}_${tab.id}` });
    }
    for (const task of payload.tasks) {
      await upsertTask(uid, {
        ...task,
        id: `${uid}_${task.id}`,
        tabId: `${uid}_${task.tabId}`,
      });
    }
    for (const rule of payload.recurringRules) {
      await upsertRecurringRule(uid, {
        ...rule,
        id: `${uid}_${rule.id}`,
        tabId: `${uid}_${rule.tabId}`,
      });
    }
    await saveUserPreferencesInDb(uid, payload.themeSettings, payload.reminderPrefs);
  } catch (error) {
    console.error('Import guest data failed:', error);
    throw new Error('Failed to sync local tasks to cloud.', { cause: error });
  }
}
