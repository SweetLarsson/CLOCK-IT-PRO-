import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  fingerprint: text('fingerprint'),
  createdAt: text('created_at'),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  uid: text('uid').unique(), // Auth UID (nullable for initial seeded users)
  tenant_id: text('tenant_id').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  role: text('role').notNull(),
  department_id: text('department_id'),
  profilePhoto: jsonb('profile_photo'),
  status: text('status').notNull().default('active'),
  gender: text('gender'),
  title: text('title'),
  password: text('password'),
  createdAt: text('created_at'),
  activityDays: jsonb('activity_days'),
  deviceBinding: jsonb('device_binding'),
});

export const departments = pgTable('departments', {
  id: text('id').primaryKey(),
  tenant_id: text('tenant_id').notNull(),
  name: text('name').notNull(),
  leadId: text('lead_id'),
});

export const departmentLeadHistory = pgTable('department_lead_history', {
  id: text('id').primaryKey(),
  department_id: text('department_id').notNull(),
  worker_id: text('worker_id').notNull(),
  tenant_id: text('tenant_id').notNull(),
  start_date: text('start_date'),
  end_date: text('end_date'),
  appointed_by: text('appointed_by'),
  active: boolean('active').notNull().default(true),
  timestamp: text('timestamp'),
});

export const attendance = pgTable('attendance', {
  id: text('id').primaryKey(),
  tenant_id: text('tenant_id').notNull(),
  worker_id: text('worker_id').notNull(),
  department_id: text('department_id'),
  date: text('date').notNull(),
  timeIn: text('time_in'),
  statusIn: text('status_in'),
  timeOut: text('time_out'),
  statusOut: text('status_out'),
  coveredTime: integer('covered_time'),
  snapshotPhoto: text('snapshot_photo'),
});

export const permissions = pgTable('permissions', {
  id: text('id').primaryKey(),
  tenant_id: text('tenant_id').notNull(),
  worker_id: text('worker_id').notNull(),
  reason: text('reason'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  remarks: text('remarks'),
  status: text('status'),
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  tenant_id: text('tenant_id').notNull(),
  worker_id: text('worker_id'),
  title: text('title'),
  message: text('message'),
  timestamp: text('timestamp'),
  read: boolean('read').notNull().default(false),
  permission_id: text('permission_id'),
});

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  tenant_id: text('tenant_id').notNull(),
  planCode: text('plan_code').notNull(),
  price: integer('price'),
  status: text('status'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  paymentMethod: text('payment_method'),
  verified: boolean('verified').notNull().default(false),
});

export const settings = pgTable('settings', {
  tenant_id: text('tenant_id').primaryKey(),
  theme: text('theme').notNull().default('light'),
  language: text('language').notNull().default('en'),
  activityDays: jsonb('activity_days'),
  dailyShiftTimes: jsonb('daily_shift_times'),
  dailyShiftOutTimes: jsonb('daily_shift_out_times'),
  checkIn: jsonb('check_in'),
  checkOut: jsonb('check_out'),
  locationTracking: jsonb('location_tracking'),
  overtimeHours: integer('overtime_hours').default(2),
  overtimeEnabled: boolean('overtime_enabled').default(false),
  onlyShowTimeIn: boolean('only_show_time_in').default(false),
  selectedIntervalDays: integer('selected_interval_days').default(30),
  companyLogoUrl: text('company_logo_url'),
  layout: text('layout').default('top'),
  sideNavCollapsed: boolean('side_nav_collapsed').default(false),
});

export const reportJobs = pgTable('report_jobs', {
  id: text('id').primaryKey(),
  tenant_id: text('tenant_id').notNull(),
  type: text('type'),
  format: text('format'),
  status: text('status'),
  timestamp: text('timestamp'),
  downloadUrl: text('download_url'),
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  tenant_id: text('tenant_id').notNull(),
  user_id: text('user_id'),
  action: text('action'),
  timestamp: text('timestamp'),
  details: text('details'),
});

export const visitorLogs = pgTable('visitor_logs', {
  id: text('id').primaryKey(),
  tenant_id: text('tenant_id').notNull(),
  name: text('name'),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  department: text('department'),
  whoToSee: text('who_to_see'),
  purpose: text('purpose'),
  timestamp: text('timestamp'),
  passId: text('pass_id'),
});

export const pendingSubscriptions = pgTable('pending_subscriptions', {
  id: text('id').primaryKey(),
  tenant_id: text('tenant_id'),
  planCode: text('plan_code').notNull(),
  price: integer('price'),
  status: text('status').notNull(),
  startDate: text('start_date'),
  endDate: text('end_date'),
  paymentMethod: text('payment_method'),
  receiptPhoto: text('receipt_photo'),
  submittedAt: text('submitted_at'),
  createdAt: text('created_at'),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  attendance: many(attendance),
  permissions: many(permissions),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  worker: one(users, {
    fields: [attendance.worker_id],
    references: [users.id],
  }),
}));
