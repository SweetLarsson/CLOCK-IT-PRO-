/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  SUPER_ADMIN = "super_admin",
  COMPANY_ADMIN = "company_admin",
  TEAM_LEAD = "team_lead",
  TEAM_MEMBER = "team_member"
}

export enum AttendanceStatus {
  PRESENT = "present", // Counts as On Time
  LATE = "late",       // Counts as Late, both are PRESENT
  PERMISSION = "permission",
  ABSENT = "absent"
}

export enum PermissionStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  EXPIRED = "expired"
}

export enum SubscriptionPlanCode {
  STARTER = "starter",
  BUSINESS = "business",
  GROWTH = "growth",
  ENTERPRISE = "enterprise"
}

export interface ThumbnailSet {
  original: string;
  medium: string;
  small: string;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  fingerprint?: string;
  createdAt: string;
}

export interface User {
  id: string;
  uid?: string;
  tenant_id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  department_id?: string;
  profilePhoto?: ThumbnailSet;
  status: "active" | "suspended";
  gender?: string;
  title?: string; // Team member / Team lead title
  createdAt: string;
  activityDays?: { [key: string]: boolean };
  deviceBinding?: {
    deviceId: string;
    boundAt: string;
    verifiedFields: {
      email: string;
      userId: string;
      name: string;
      phone: string;
    };
  };
}

export interface Department {
  id: string;
  tenant_id: string;
  name: string;
  leadId?: string; // current active Lead User ID
}

export interface DepartmentLeadHistory {
  id: string;
  department_id: string;
  worker_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string | null;
  appointed_by: string;
  active: boolean;
  timestamp?: string;
}

export interface Attendance {
  id: string;
  tenant_id: string;
  worker_id: string;
  department_id: string; // Preservation of department at time of attendance
  date: string; // YYYY-MM-DD
  timeIn: string; // HH:MM:SS
  statusIn: AttendanceStatus.PRESENT | AttendanceStatus.LATE;
  timeOut?: string; // HH:MM:SS
  statusOut?: string;
  coveredTime?: number; // In seconds
  snapshotPhoto?: string; // attendance_snapshot_photo
}

export interface Permission {
  id: string;
  tenant_id: string;
  worker_id: string;
  reason: "Medical" | "Official" | "Vacation" | "Personal" | "Mandatory";
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  remarks: string;
  status: PermissionStatus;
}

export interface Notification {
  id: string;
  tenant_id: string;
  worker_id?: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  permission_id?: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  planCode: SubscriptionPlanCode;
  price: number;
  status: "trial" | "active" | "expired";
  startDate: string;
  endDate: string;
  paymentMethod?: "opay" | "paystack" | "manual" | "admin_authorization";
  verified: boolean;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  timestamp: string;
  details: string;
}

export interface CheckInSettings {
  time: string; // HH:MM
  latenessThreshold: number; // minutes
  soundEnabled: boolean;
  soundName?: string; // e.g., 'beep' | 'chime' | 'gong' | 'laser' | 'ping'
  latenessActive?: boolean;
}

export interface CheckOutSettings {
  time: string; // HH:MM
  soundEnabled: boolean;
}

export interface TenantSettings {
  tenant_id: string;
  theme: "light" | "dark" | "army" | "navy";
  language: "en" | "fr" | "es";
  activityDays: { [key: string]: boolean }; // e.g. { Monday: true, Tuesday: true, ... }
  dailyShiftTimes?: { [key: string]: string }; // e.g. { Monday: "08:00", ... }
  dailyShiftOutTimes?: { [key: string]: string }; // e.g. { Monday: "17:00", ... }
  checkIn: CheckInSettings;
  checkOut: CheckOutSettings;
  locationTracking?: {
    enabled: boolean;
    latitude: number;
    longitude: number;
    radius: number;
  };
  overtimeHours: number; // 1 | 2 | 3 | 4 | 5 | 6
  overtimeEnabled?: boolean;
  onlyShowTimeIn?: boolean;
  selectedIntervalDays?: number;
  companyLogoUrl?: string;
}

export interface ReportJob {
  id: string;
  tenant_id: string;
  type: "attendance" | "permissions" | "workers";
  format: "csv" | "pdf";
  status: "queued" | "completed" | "failed";
  timestamp: string;
  downloadUrl?: string;
}

export interface VisitorLog {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  department: string;
  whoToSee: string;
  purpose: string;
  timestamp: string;
  passId: string;
}
