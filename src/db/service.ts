import { db, isPgConfigured } from './index.ts';
import { 
  tenants, 
  users, 
  departments, 
  departmentLeadHistory, 
  attendance, 
  permissions, 
  notifications, 
  subscriptions, 
  settings, 
  reportJobs, 
  auditLogs, 
  visitorLogs, 
  pendingSubscriptions 
} from './schema.ts';
import { eq } from 'drizzle-orm';
import { 
  Tenant, 
  User, 
  Department, 
  DepartmentLeadHistory, 
  Attendance, 
  Permission, 
  Notification, 
  Subscription, 
  TenantSettings, 
  ReportJob, 
  AuditLog, 
  VisitorLog 
} from '../types.js';

function mapTenant(t: any) {
  return {
    id: t.id,
    name: t.name || '',
    email: t.email || '',
    phone: t.phone || '',
    fingerprint: t.fingerprint || null,
    createdAt: t.createdAt || new Date().toISOString(),
  };
}

function mapUser(u: any) {
  return {
    id: u.id,
    uid: u.uid || null,
    tenant_id: u.tenant_id,
    firstName: u.firstName || '',
    lastName: u.lastName || '',
    email: u.email || '',
    phone: u.phone || null,
    role: u.role || 'team_member',
    department_id: u.department_id || null,
    profilePhoto: u.profilePhoto || null,
    status: u.status || 'active',
    gender: u.gender || null,
    title: u.title || null,
    createdAt: u.createdAt || new Date().toISOString(),
    activityDays: u.activityDays || null,
    deviceBinding: u.deviceBinding || null,
  };
}

function mapDepartment(d: any) {
  return {
    id: d.id,
    tenant_id: d.tenant_id,
    name: d.name || '',
    leadId: d.leadId || null,
  };
}

function mapDepartmentLeadHistory(h: any) {
  return {
    id: h.id,
    department_id: h.department_id,
    worker_id: h.worker_id,
    tenant_id: h.tenant_id,
    start_date: h.start_date || h.startDate || null,
    end_date: h.end_date || h.endDate || null,
    appointed_by: h.appointed_by || h.appointedBy || null,
    active: h.active !== undefined ? Boolean(h.active) : true,
    timestamp: h.timestamp || null,
  };
}

function mapAttendance(a: any) {
  return {
    id: a.id,
    tenant_id: a.tenant_id,
    worker_id: a.worker_id,
    department_id: a.department_id || null,
    date: a.date,
    timeIn: a.timeIn || null,
    statusIn: a.statusIn || null,
    timeOut: a.timeOut || null,
    statusOut: a.statusOut || null,
    coveredTime: a.coveredTime !== undefined ? a.coveredTime : null,
    snapshotPhoto: a.snapshotPhoto || null,
  };
}

function mapPermission(p: any) {
  return {
    id: p.id,
    tenant_id: p.tenant_id,
    worker_id: p.worker_id,
    reason: p.reason || null,
    startDate: p.startDate || null,
    endDate: p.endDate || null,
    remarks: p.remarks || null,
    status: p.status || 'pending',
  };
}

function mapNotification(n: any) {
  return {
    id: n.id,
    tenant_id: n.tenant_id,
    worker_id: n.worker_id || null,
    title: n.title || null,
    message: n.message || null,
    timestamp: n.timestamp || new Date().toISOString(),
    read: n.read !== undefined ? Boolean(n.read) : false,
    permission_id: n.permission_id || null,
  };
}

function mapSubscription(s: any) {
  return {
    id: s.id,
    tenant_id: s.tenant_id,
    planCode: s.planCode || 'starter',
    price: s.price !== undefined ? s.price : null,
    status: s.status || 'active',
    startDate: s.startDate || null,
    endDate: s.endDate || null,
    paymentMethod: s.paymentMethod || null,
    verified: s.verified !== undefined ? Boolean(s.verified) : false,
  };
}

function mapSettings(st: any) {
  return {
    tenant_id: st.tenant_id,
    theme: st.theme || 'light',
    language: st.language || 'en',
    activityDays: st.activityDays || null,
    dailyShiftTimes: st.dailyShiftTimes || null,
    dailyShiftOutTimes: st.dailyShiftOutTimes || null,
    checkIn: st.checkIn || null,
    checkOut: st.checkOut || null,
    locationTracking: st.locationTracking || null,
    overtimeHours: st.overtimeHours !== undefined ? st.overtimeHours : 2,
    overtimeEnabled: Boolean(st.overtimeEnabled),
    onlyShowTimeIn: Boolean(st.onlyShowTimeIn),
    selectedIntervalDays: st.selectedIntervalDays !== undefined ? st.selectedIntervalDays : 30,
    companyLogoUrl: st.companyLogoUrl || null,
  };
}

function mapReportJob(r: any) {
  return {
    id: r.id,
    tenant_id: r.tenant_id,
    type: r.type || null,
    format: r.format || null,
    status: r.status || null,
    timestamp: r.timestamp || null,
    downloadUrl: r.downloadUrl || null,
  };
}

function mapAuditLog(al: any) {
  return {
    id: al.id,
    tenant_id: al.tenant_id,
    user_id: al.user_id || null,
    action: al.action || null,
    timestamp: al.timestamp || null,
    details: al.details || null,
  };
}

function mapVisitorLog(vl: any) {
  return {
    id: vl.id,
    tenant_id: vl.tenant_id,
    name: vl.name || null,
    email: vl.email || null,
    phone: vl.phone || null,
    company: vl.company || null,
    department: vl.department || null,
    whoToSee: vl.whoToSee || null,
    purpose: vl.purpose || null,
    timestamp: vl.timestamp || null,
    passId: vl.passId || null,
  };
}

function mapPendingSubscription(ps: any) {
  return {
    id: ps.id,
    tenant_id: ps.tenant_id || null,
    planCode: ps.planCode || 'starter',
    price: ps.price !== undefined ? ps.price : null,
    status: ps.status || 'paid',
    startDate: ps.startDate || null,
    endDate: ps.endDate || null,
    paymentMethod: ps.paymentMethod || null,
    receiptPhoto: ps.receiptPhoto || null,
    submittedAt: ps.submittedAt || ps.createdAt || new Date().toISOString(),
    createdAt: ps.createdAt || new Date().toISOString(),
  };
}

/**
 * Seed PostgreSQL database with initial state if empty.
 */
export async function seedPostgresDatabase(initialState: any) {
  if (!isPgConfigured()) return;
  try {
    const existingTenants = await db.select().from(tenants);
    if (existingTenants.length > 0) {
      console.log('PostgreSQL database already initialized with tenants.');
      return;
    }

    console.log('Seeding PostgreSQL database with initial data...');

    if (initialState.tenants && initialState.tenants.length > 0) {
      for (const t of initialState.tenants) {
        await db.insert(tenants).values(mapTenant(t)).onConflictDoNothing();
      }
    }

    if (initialState.users && initialState.users.length > 0) {
      for (const u of initialState.users) {
        await db.insert(users).values(mapUser(u)).onConflictDoNothing();
      }
    }

    if (initialState.departments && initialState.departments.length > 0) {
      for (const d of initialState.departments) {
        await db.insert(departments).values(mapDepartment(d)).onConflictDoNothing();
      }
    }

    if (initialState.departmentLeadHistory && initialState.departmentLeadHistory.length > 0) {
      for (const h of initialState.departmentLeadHistory) {
        await db.insert(departmentLeadHistory).values(mapDepartmentLeadHistory(h)).onConflictDoNothing();
      }
    }

    if (initialState.attendance && initialState.attendance.length > 0) {
      for (const a of initialState.attendance) {
        await db.insert(attendance).values(mapAttendance(a)).onConflictDoNothing();
      }
    }

    if (initialState.permissions && initialState.permissions.length > 0) {
      for (const p of initialState.permissions) {
        await db.insert(permissions).values(mapPermission(p)).onConflictDoNothing();
      }
    }

    if (initialState.notifications && initialState.notifications.length > 0) {
      for (const n of initialState.notifications) {
        await db.insert(notifications).values(mapNotification(n)).onConflictDoNothing();
      }
    }

    if (initialState.subscriptions && initialState.subscriptions.length > 0) {
      for (const s of initialState.subscriptions) {
        await db.insert(subscriptions).values(mapSubscription(s)).onConflictDoNothing();
      }
    }

    if (initialState.settings && initialState.settings.length > 0) {
      for (const st of initialState.settings) {
        await db.insert(settings).values(mapSettings(st)).onConflictDoNothing();
      }
    }

    if (initialState.reportJobs && initialState.reportJobs.length > 0) {
      for (const r of initialState.reportJobs) {
        await db.insert(reportJobs).values(mapReportJob(r)).onConflictDoNothing();
      }
    }

    if (initialState.auditLogs && initialState.auditLogs.length > 0) {
      for (const al of initialState.auditLogs) {
        await db.insert(auditLogs).values(mapAuditLog(al)).onConflictDoNothing();
      }
    }

    if (initialState.visitorLogs && initialState.visitorLogs.length > 0) {
      for (const vl of initialState.visitorLogs) {
        await db.insert(visitorLogs).values(mapVisitorLog(vl)).onConflictDoNothing();
      }
    }

    if (initialState.pendingSubscriptions && initialState.pendingSubscriptions.length > 0) {
      for (const ps of initialState.pendingSubscriptions) {
        await db.insert(pendingSubscriptions).values(mapPendingSubscription(ps)).onConflictDoNothing();
      }
    }

    console.log('PostgreSQL database seeded successfully.');
  } catch (error: any) {
    console.warn('PostgreSQL database unavailable or timed out during seeding (continuing with local data store):', error?.message || error);
  }
}

/**
 * Synchronizes entire DBState to PostgreSQL table storage.
 */
export async function syncStateToPostgres(state: any) {
  if (!isPgConfigured()) return;
  try {
    if (state.tenants && state.tenants.length > 0) {
      for (const t of state.tenants) {
        const val = mapTenant(t);
        await db.insert(tenants).values(val).onConflictDoUpdate({ target: tenants.id, set: val });
      }
    }
    if (state.users && state.users.length > 0) {
      for (const u of state.users) {
        const val = mapUser(u);
        await db.insert(users).values(val).onConflictDoUpdate({ target: users.id, set: val });
      }
    }
    if (state.departments && state.departments.length > 0) {
      for (const d of state.departments) {
        const val = mapDepartment(d);
        await db.insert(departments).values(val).onConflictDoUpdate({ target: departments.id, set: val });
      }
    }
    if (state.departmentLeadHistory && state.departmentLeadHistory.length > 0) {
      for (const h of state.departmentLeadHistory) {
        const val = mapDepartmentLeadHistory(h);
        await db.insert(departmentLeadHistory).values(val).onConflictDoUpdate({ target: departmentLeadHistory.id, set: val });
      }
    }
    if (state.attendance && state.attendance.length > 0) {
      for (const a of state.attendance) {
        const val = mapAttendance(a);
        await db.insert(attendance).values(val).onConflictDoUpdate({ target: attendance.id, set: val });
      }
    }
    if (state.permissions && state.permissions.length > 0) {
      for (const p of state.permissions) {
        const val = mapPermission(p);
        await db.insert(permissions).values(val).onConflictDoUpdate({ target: permissions.id, set: val });
      }
    }
    if (state.notifications && state.notifications.length > 0) {
      for (const n of state.notifications) {
        const val = mapNotification(n);
        await db.insert(notifications).values(val).onConflictDoUpdate({ target: notifications.id, set: val });
      }
    }
    if (state.subscriptions && state.subscriptions.length > 0) {
      for (const s of state.subscriptions) {
        const val = mapSubscription(s);
        await db.insert(subscriptions).values(val).onConflictDoUpdate({ target: subscriptions.id, set: val });
      }
    }
    if (state.settings && state.settings.length > 0) {
      for (const st of state.settings) {
        const val = mapSettings(st);
        await db.insert(settings).values(val).onConflictDoUpdate({ target: settings.tenant_id, set: val });
      }
    }
    if (state.reportJobs && state.reportJobs.length > 0) {
      for (const r of state.reportJobs) {
        const val = mapReportJob(r);
        await db.insert(reportJobs).values(val).onConflictDoUpdate({ target: reportJobs.id, set: val });
      }
    }
    if (state.auditLogs && state.auditLogs.length > 0) {
      for (const al of state.auditLogs) {
        const val = mapAuditLog(al);
        await db.insert(auditLogs).values(val).onConflictDoUpdate({ target: auditLogs.id, set: val });
      }
    }
    if (state.visitorLogs && state.visitorLogs.length > 0) {
      for (const vl of state.visitorLogs) {
        const val = mapVisitorLog(vl);
        await db.insert(visitorLogs).values(val).onConflictDoUpdate({ target: visitorLogs.id, set: val });
      }
    }
    if (state.pendingSubscriptions && state.pendingSubscriptions.length > 0) {
      for (const ps of state.pendingSubscriptions) {
        const val = mapPendingSubscription(ps);
        await db.insert(pendingSubscriptions).values(val).onConflictDoUpdate({ target: pendingSubscriptions.id, set: val });
      }
    }
  } catch (error) {
    console.error("Failed to sync state to PostgreSQL:", error);
  }
}

// =======================
// TENANTS
// =======================
export async function getTenants(): Promise<Tenant[]> {
  try {
    return await db.select().from(tenants);
  } catch (error) {
    console.error("Failed to fetch tenants:", error);
    throw new Error("Failed to fetch tenants from database.", { cause: error });
  }
}

export async function getTenantById(tenant_id: string): Promise<Tenant | undefined> {
  try {
    const res = await db.select().from(tenants).where(eq(tenants.id, tenant_id));
    return res[0];
  } catch (error) {
    console.error(`Failed to fetch tenant ${tenant_id}:`, error);
    throw new Error("Failed to fetch tenant from database.", { cause: error });
  }
}

export async function saveTenant(tenantData: Tenant): Promise<Tenant> {
  try {
    const val = mapTenant(tenantData);
    const res = await db.insert(tenants)
      .values(val)
      .onConflictDoUpdate({
        target: tenants.id,
        set: val,
      })
      .returning();
    return res[0];
  } catch (error) {
    console.error("Failed to save tenant:", error);
    throw new Error("Failed to save tenant into database.", { cause: error });
  }
}

// =======================
// USERS
// =======================
export async function getUsers(tenant_id: string, worker_id?: string): Promise<User[]> {
  try {
    let query = db.select().from(users).where(eq(users.tenant_id, tenant_id));
    let result = await query;

    if (worker_id) {
      const userObj = result.find(u => u.id === worker_id);
      if (userObj) {
        if (userObj.role === "team_member") {
          result = result.filter(u => u.id === worker_id);
        } else if (userObj.role === "team_lead") {
          const leadDeptId = userObj.department_id;
          result = result.filter(u => u.id === worker_id || (leadDeptId && u.department_id === leadDeptId));
        }
      } else {
        result = result.filter(u => u.id === worker_id);
      }
    }

    return result as User[];
  } catch (error) {
    console.error("Failed to fetch users:", error);
    throw new Error("Failed to fetch users from database.", { cause: error });
  }
}

export async function getUserById(user_id: string): Promise<User | undefined> {
  try {
    const res = await db.select().from(users).where(eq(users.id, user_id));
    return res[0] as User | undefined;
  } catch (error) {
    console.error(`Failed to fetch user ${user_id}:`, error);
    throw new Error("Failed to fetch user from database.", { cause: error });
  }
}

export async function getUserByUid(uid: string): Promise<User | undefined> {
  try {
    const res = await db.select().from(users).where(eq(users.uid, uid));
    return res[0] as User | undefined;
  } catch (error) {
    console.error(`Failed to fetch user by UID ${uid}:`, error);
    throw new Error("Failed to fetch user by UID from database.", { cause: error });
  }
}

export async function upsertUser(userData: User): Promise<User> {
  try {
    const val = mapUser(userData);

    const res = await db.insert(users)
      .values(val)
      .onConflictDoUpdate({
        target: users.id,
        set: val,
      })
      .returning();

    return res[0] as User;
  } catch (error) {
    console.error("Failed to save user:", error);
    throw new Error("Failed to save user in database.", { cause: error });
  }
}

export async function deleteUser(user_id: string): Promise<void> {
  try {
    await db.delete(users).where(eq(users.id, user_id));
  } catch (error) {
    console.error(`Failed to delete user ${user_id}:`, error);
    throw new Error("Failed to delete user from database.", { cause: error });
  }
}

// =======================
// DEPARTMENTS
// =======================
export async function getDepartments(tenant_id: string): Promise<Department[]> {
  try {
    return await db.select().from(departments).where(eq(departments.tenant_id, tenant_id));
  } catch (error) {
    console.error("Failed to fetch departments:", error);
    throw new Error("Failed to fetch departments from database.", { cause: error });
  }
}

export async function upsertDepartment(deptData: Department): Promise<Department> {
  try {
    const val = mapDepartment(deptData);
    const res = await db.insert(departments)
      .values(val)
      .onConflictDoUpdate({
        target: departments.id,
        set: val,
      })
      .returning();
    return res[0];
  } catch (error) {
    console.error("Failed to save department:", error);
    throw new Error("Failed to save department in database.", { cause: error });
  }
}

export async function deleteDepartment(dept_id: string): Promise<void> {
  try {
    await db.delete(departments).where(eq(departments.id, dept_id));
  } catch (error) {
    console.error(`Failed to delete department ${dept_id}:`, error);
    throw new Error("Failed to delete department from database.", { cause: error });
  }
}

// =======================
// DEPARTMENT LEAD HISTORY
// =======================
export async function getDepartmentLeadHistory(tenant_id: string): Promise<DepartmentLeadHistory[]> {
  try {
    return await db.select().from(departmentLeadHistory).where(eq(departmentLeadHistory.tenant_id, tenant_id));
  } catch (error) {
    console.error("Failed to fetch department lead history:", error);
    throw new Error("Failed to fetch department lead history from database.", { cause: error });
  }
}

export async function upsertDepartmentLeadHistory(historyData: DepartmentLeadHistory): Promise<DepartmentLeadHistory> {
  try {
    const val = mapDepartmentLeadHistory(historyData);
    const res = await db.insert(departmentLeadHistory)
      .values(val)
      .onConflictDoUpdate({
        target: departmentLeadHistory.id,
        set: val,
      })
      .returning();
    return res[0];
  } catch (error) {
    console.error("Failed to save department lead history:", error);
    throw new Error("Failed to save department lead history in database.", { cause: error });
  }
}

// =======================
// ATTENDANCE
// =======================
export async function getAttendanceRecords(tenant_id: string, worker_id?: string): Promise<Attendance[]> {
  try {
    let records = await db.select().from(attendance).where(eq(attendance.tenant_id, tenant_id));

    if (worker_id) {
      const allUsers = await db.select().from(users).where(eq(users.tenant_id, tenant_id));
      const userObj = allUsers.find(u => u.id === worker_id);
      if (userObj) {
        if (userObj.role === "team_member") {
          records = records.filter(a => a.worker_id === worker_id);
        } else if (userObj.role === "team_lead") {
          const leadDeptId = userObj.department_id;
          records = records.filter(a => a.worker_id === worker_id || (leadDeptId && a.department_id === leadDeptId));
        }
      } else {
        records = records.filter(a => a.worker_id === worker_id);
      }
    }

    return records as Attendance[];
  } catch (error) {
    console.error("Failed to fetch attendance records:", error);
    throw new Error("Failed to fetch attendance records from database.", { cause: error });
  }
}

export async function upsertAttendance(attData: Attendance): Promise<Attendance> {
  try {
    const val = mapAttendance(attData);
    const res = await db.insert(attendance)
      .values(val)
      .onConflictDoUpdate({
        target: attendance.id,
        set: val,
      })
      .returning();
    return res[0] as Attendance;
  } catch (error) {
    console.error("Failed to save attendance record:", error);
    throw new Error("Failed to save attendance record in database.", { cause: error });
  }
}

// =======================
// PERMISSIONS
// =======================
export async function getPermissions(tenant_id: string, worker_id?: string): Promise<Permission[]> {
  try {
    let perms = await db.select().from(permissions).where(eq(permissions.tenant_id, tenant_id));

    if (worker_id) {
      const allUsers = await db.select().from(users).where(eq(users.tenant_id, tenant_id));
      const userObj = allUsers.find(u => u.id === worker_id);
      if (userObj) {
        if (userObj.role === "team_member") {
          perms = perms.filter(p => p.worker_id === worker_id);
        } else if (userObj.role === "team_lead") {
          const leadDeptId = userObj.department_id;
          perms = perms.filter(p => {
            if (p.worker_id === worker_id) return true;
            const req = allUsers.find(u => u.id === p.worker_id);
            return req && req.department_id === leadDeptId;
          });
        }
      } else {
        perms = perms.filter(p => p.worker_id === worker_id);
      }
    }

    return perms as Permission[];
  } catch (error) {
    console.error("Failed to fetch permissions:", error);
    throw new Error("Failed to fetch permissions from database.", { cause: error });
  }
}

export async function upsertPermission(permData: Permission): Promise<Permission> {
  try {
    const val = mapPermission(permData);
    const res = await db.insert(permissions)
      .values(val)
      .onConflictDoUpdate({
        target: permissions.id,
        set: val,
      })
      .returning();
    return res[0] as Permission;
  } catch (error) {
    console.error("Failed to save permission:", error);
    throw new Error("Failed to save permission in database.", { cause: error });
  }
}

// =======================
// NOTIFICATIONS
// =======================
export async function getNotifications(tenant_id: string, worker_id?: string): Promise<Notification[]> {
  try {
    let notifs = await db.select().from(notifications).where(eq(notifications.tenant_id, tenant_id));

    if (worker_id) {
      const allUsers = await db.select().from(users).where(eq(users.tenant_id, tenant_id));
      const allPerms = await db.select().from(permissions).where(eq(permissions.tenant_id, tenant_id));
      const userObj = allUsers.find(u => u.id === worker_id);

      if (userObj) {
        if (userObj.role === "team_member") {
          notifs = notifs.filter(n => n.worker_id === worker_id);
        } else if (userObj.role === "team_lead") {
          const leadDeptId = userObj.department_id;
          notifs = notifs.filter(n => {
            if (n.worker_id === worker_id) return true;
            if (n.permission_id) {
              const perm = allPerms.find(p => p.id === n.permission_id);
              if (perm) {
                const requester = allUsers.find(u => u.id === perm.worker_id);
                if (requester && requester.department_id === leadDeptId) {
                  return true;
                }
              }
            }
            return false;
          });
        }
      } else {
        notifs = notifs.filter(n => n.worker_id === worker_id);
      }
    }

    return notifs as Notification[];
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    throw new Error("Failed to fetch notifications from database.", { cause: error });
  }
}

export async function upsertNotification(notifData: Notification): Promise<Notification> {
  try {
    const val = mapNotification(notifData);
    const res = await db.insert(notifications)
      .values(val)
      .onConflictDoUpdate({
        target: notifications.id,
        set: val,
      })
      .returning();
    return res[0] as Notification;
  } catch (error) {
    console.error("Failed to save notification:", error);
    throw new Error("Failed to save notification in database.", { cause: error });
  }
}

export async function markNotificationRead(notif_id: string): Promise<void> {
  try {
    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notif_id));
  } catch (error) {
    console.error(`Failed to mark notification ${notif_id} read:`, error);
    throw new Error("Failed to mark notification read in database.", { cause: error });
  }
}

// =======================
// SUBSCRIPTIONS
// =======================
export async function getSubscriptions(tenant_id: string): Promise<Subscription[]> {
  try {
    return await db.select().from(subscriptions).where(eq(subscriptions.tenant_id, tenant_id)) as Subscription[];
  } catch (error) {
    console.error("Failed to fetch subscriptions:", error);
    throw new Error("Failed to fetch subscriptions from database.", { cause: error });
  }
}

export async function upsertSubscription(subData: Subscription): Promise<Subscription> {
  try {
    const val = mapSubscription(subData);
    const res = await db.insert(subscriptions)
      .values(val)
      .onConflictDoUpdate({
        target: subscriptions.id,
        set: val,
      })
      .returning();
    return res[0] as Subscription;
  } catch (error) {
    console.error("Failed to save subscription:", error);
    throw new Error("Failed to save subscription in database.", { cause: error });
  }
}

export async function getPendingSubscriptions(tenant_id?: string): Promise<any[]> {
  try {
    if (tenant_id) {
      return await db.select().from(pendingSubscriptions).where(eq(pendingSubscriptions.tenant_id, tenant_id));
    }
    return await db.select().from(pendingSubscriptions);
  } catch (error) {
    console.error("Failed to fetch pending subscriptions:", error);
    throw new Error("Failed to fetch pending subscriptions from database.", { cause: error });
  }
}

export async function upsertPendingSubscription(subData: any): Promise<any> {
  try {
    const val = mapPendingSubscription(subData);
    const res = await db.insert(pendingSubscriptions)
      .values(val)
      .onConflictDoUpdate({
        target: pendingSubscriptions.id,
        set: val,
      })
      .returning();
    return res[0];
  } catch (error) {
    console.error("Failed to save pending subscription:", error);
    throw new Error("Failed to save pending subscription in database.", { cause: error });
  }
}

// =======================
// SETTINGS
// =======================
export async function getSettings(tenant_id: string): Promise<TenantSettings | undefined> {
  try {
    const res = await db.select().from(settings).where(eq(settings.tenant_id, tenant_id));
    return res[0] as TenantSettings | undefined;
  } catch (error) {
    console.error(`Failed to fetch settings for tenant ${tenant_id}:`, error);
    throw new Error("Failed to fetch settings from database.", { cause: error });
  }
}

export async function upsertSettings(settingsData: TenantSettings): Promise<TenantSettings> {
  try {
    const val = mapSettings(settingsData);
    const res = await db.insert(settings)
      .values(val)
      .onConflictDoUpdate({
        target: settings.tenant_id,
        set: val,
      })
      .returning();
    return res[0] as TenantSettings;
  } catch (error) {
    console.error("Failed to save settings:", error);
    throw new Error("Failed to save settings in database.", { cause: error });
  }
}

// =======================
// REPORT JOBS
// =======================
export async function getReportJobs(tenant_id: string): Promise<ReportJob[]> {
  try {
    return await db.select().from(reportJobs).where(eq(reportJobs.tenant_id, tenant_id)) as ReportJob[];
  } catch (error) {
    console.error("Failed to fetch report jobs:", error);
    throw new Error("Failed to fetch report jobs from database.", { cause: error });
  }
}

export async function upsertReportJob(jobData: ReportJob): Promise<ReportJob> {
  try {
    const val = mapReportJob(jobData);
    const res = await db.insert(reportJobs)
      .values(val)
      .onConflictDoUpdate({
        target: reportJobs.id,
        set: val,
      })
      .returning();
    return res[0] as ReportJob;
  } catch (error) {
    console.error("Failed to save report job:", error);
    throw new Error("Failed to save report job in database.", { cause: error });
  }
}

// =======================
// AUDIT LOGS
// =======================
export async function getAuditLogs(tenant_id: string): Promise<AuditLog[]> {
  try {
    return await db.select().from(auditLogs).where(eq(auditLogs.tenant_id, tenant_id)) as AuditLog[];
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    throw new Error("Failed to fetch audit logs from database.", { cause: error });
  }
}

export async function addAuditLog(logData: AuditLog): Promise<AuditLog> {
  try {
    const val = mapAuditLog(logData);
    const res = await db.insert(auditLogs)
      .values(val)
      .onConflictDoUpdate({
        target: auditLogs.id,
        set: val,
      })
      .returning();
    return res[0] as AuditLog;
  } catch (error) {
    console.error("Failed to add audit log:", error);
    throw new Error("Failed to add audit log to database.", { cause: error });
  }
}

// =======================
// VISITOR LOGS
// =======================
export async function getVisitorLogs(tenant_id: string): Promise<VisitorLog[]> {
  try {
    return await db.select().from(visitorLogs).where(eq(visitorLogs.tenant_id, tenant_id)) as VisitorLog[];
  } catch (error) {
    console.error("Failed to fetch visitor logs:", error);
    throw new Error("Failed to fetch visitor logs from database.", { cause: error });
  }
}

export async function upsertVisitorLog(logData: VisitorLog): Promise<VisitorLog> {
  try {
    const val = mapVisitorLog(logData);
    const res = await db.insert(visitorLogs)
      .values(val)
      .onConflictDoUpdate({
        target: visitorLogs.id,
        set: val,
      })
      .returning();
    return res[0] as VisitorLog;
  } catch (error) {
    console.error("Failed to save visitor log:", error);
    throw new Error("Failed to save visitor log in database.", { cause: error });
  }
}

/**
 * Returns full DBState reconstructed from PostgreSQL tables for backward compatibility
 */
export async function getFullDBStateFromPostgres(tenant_id?: string): Promise<any> {
  if (!isPgConfigured()) return null;
  try {
    const allTenants = await db.select().from(tenants);

    const [
      allUsers,
      allDepts,
      allLeadHist,
      allAtt,
      allPerms,
      allNotifs,
      allSubs,
      allSettings,
      allJobs,
      allAudit,
      allVisitors,
      allPendingSubs
    ] = await Promise.all([
      db.select().from(users),
      db.select().from(departments),
      db.select().from(departmentLeadHistory),
      db.select().from(attendance),
      db.select().from(permissions),
      db.select().from(notifications),
      db.select().from(subscriptions),
      db.select().from(settings),
      db.select().from(reportJobs),
      db.select().from(auditLogs),
      db.select().from(visitorLogs),
      db.select().from(pendingSubscriptions)
    ]);

    return {
      tenants: allTenants,
      users: allUsers,
      departments: allDepts,
      departmentLeadHistory: allLeadHist,
      attendance: allAtt,
      permissions: allPerms,
      notifications: allNotifs,
      subscriptions: allSubs,
      settings: allSettings,
      reportJobs: allJobs,
      auditLogs: allAudit,
      visitorLogs: allVisitors,
      pendingSubscriptions: allPendingSubs
    };
  } catch (error: any) {
    console.warn("PostgreSQL not reachable or timed out (falling back to local data store):", error?.message || error);
    return null;
  }
}
