import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import type { ReminderChannels, ReminderPreferences, ThemeSettings } from '../types/todo';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  themeSettings: jsonb('theme_settings').$type<ThemeSettings | null>(),
  reminderPrefs: jsonb('reminder_prefs').$type<ReminderPreferences | null>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const taskTabs = pgTable('task_tabs', {
  id: text('id').primaryKey(),
  userUid: text('user_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  userUid: text('user_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  notes: text('notes'),
  date: text('date').notNull(),
  time: text('time'),
  tabId: text('tab_id').notNull(),
  completed: boolean('completed').notNull().default(false),
  completedAt: text('completed_at'),
  order: integer('order').notNull().default(0),
  highlighted: boolean('highlighted').notNull().default(false),
  reminderEnabled: boolean('reminder_enabled').notNull().default(false),
  reminderChannels: jsonb('reminder_channels').$type<Partial<ReminderChannels> | null>(),
  reminderDismissedAt: text('reminder_dismissed_at'),
  snoozedUntil: text('snoozed_until'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const recurringRules = pgTable('recurring_rules', {
  id: text('id').primaryKey(),
  userUid: text('user_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  notes: text('notes'),
  tabId: text('tab_id').notNull(),
  frequency: text('frequency').notNull(),
  daysOfWeek: jsonb('days_of_week').$type<number[] | null>(),
  dayOfMonth: integer('day_of_month'),
  intervalDays: integer('interval_days'),
  startDate: text('start_date').notNull(),
  time: text('time'),
  active: boolean('active').notNull().default(true),
  reminderEnabled: boolean('reminder_enabled').notNull().default(false),
  reminderChannels: jsonb('reminder_channels').$type<Partial<ReminderChannels> | null>(),
  completedDates: jsonb('completed_dates').$type<string[]>().notNull().default([]),
  dismissedDates: jsonb('dismissed_dates').$type<string[]>().notNull().default([]),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  tabs: many(taskTabs),
  tasks: many(tasks),
  recurringRules: many(recurringRules),
}));

export const taskTabsRelations = relations(taskTabs, ({ one }) => ({
  owner: one(users, {
    fields: [taskTabs.userUid],
    references: [users.uid],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  owner: one(users, {
    fields: [tasks.userUid],
    references: [users.uid],
  }),
}));

export const recurringRulesRelations = relations(recurringRules, ({ one }) => ({
  owner: one(users, {
    fields: [recurringRules.userUid],
    references: [users.uid],
  }),
}));
