/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { Resend } from "resend";
import { createServer as createViteServer } from "vite";
import { 
  UserRole, 
  AttendanceStatus, 
  PermissionStatus, 
  SubscriptionPlanCode,
  Tenant, 
  User, 
  Department, 
  DepartmentLeadHistory, 
  Attendance, 
  Permission, 
  Notification, 
  Subscription, 
  AuditLog, 
  TenantSettings, 
  ReportJob,
  VisitorLog,
  CentralAnnouncement,
  AnnouncementFeedbackSubmission
} from "./src/types.js";
import { 
  seedPostgresDatabase, 
  syncStateToPostgres, 
  getFullDBStateFromPostgres 
} from "./src/db/service.js";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "data-store.json");

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Server-Sent Events subscribers for real-time dashboard updates
let sseClients: { tenant_id: string; res: any }[] = [];

function broadcastToTenant(tenant_id: string, event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    if (client.tenant_id === tenant_id) {
      try {
        client.res.write(payload);
      } catch (e) {
        // stale client
      }
    }
  });
}

// Lowdb-like custom JSON File Database for persistent, multi-tenant records
interface DBState {
  tenants: Tenant[];
  users: User[];
  departments: Department[];
  departmentLeadHistory: DepartmentLeadHistory[];
  attendance: Attendance[];
  permissions: Permission[];
  notifications: Notification[];
  subscriptions: Subscription[];
  settings: TenantSettings[];
  reportJobs: ReportJob[];
  auditLogs: AuditLog[];
  visitorLogs: VisitorLog[];
  announcements?: CentralAnnouncement[];
  pendingSubscriptions?: any[];
}

function loadDB(): DBState {
  if (!fs.existsSync(DB_FILE)) {
    const initialState = getInitialState();
    fs.writeFileSync(DB_FILE, JSON.stringify(initialState, null, 2), "utf8");
    return initialState;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    parsed.visitorLogs = parsed.visitorLogs || [];
    parsed.announcements = parsed.announcements || [];
    parsed.pendingSubscriptions = parsed.pendingSubscriptions || [];
    return parsed;
  } catch (e) {
    const initialState = getInitialState();
    fs.writeFileSync(DB_FILE, JSON.stringify(initialState, null, 2), "utf8");
    return initialState;
  }
}

function saveDB(state: DBState) {
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf8");
  syncStateToPostgres(state).catch((err) => {
    console.error("Error in background PostgreSQL sync:", err);
  });
}

function formatDurationHHMMSS(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || isNaN(totalSeconds) || totalSeconds <= 0) {
    return "00:00:00";
  }
  const rounded = Math.floor(totalSeconds);
  const hrs = Math.floor(rounded / 3600);
  const mins = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

function enforceForcedCheckout(tenant_id: string) {
  const settings = db.settings.find(s => s.tenant_id === tenant_id);
  const checkoutTime = settings?.checkOut?.time || "17:00";
  const [outH, outM] = checkoutTime.split(":").map(Number);
  
  const now = new Date();
  const nowH = now.getHours();
  const nowM = now.getMinutes();
  
  const overtimeEnabled = settings?.overtimeEnabled === true;
  
  if (!overtimeEnabled && (nowH * 60 + nowM >= outH * 60 + outM)) {
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    
    let dbUpdated = false;
    db.attendance.forEach(a => {
      if (a.tenant_id === tenant_id && a.date === todayStr && !a.timeOut) {
        a.timeOut = checkoutTime + ":00";
        a.statusOut = "Forced Checkout (Overtime Protocol Disabled)";
        
        const [inH, inM, inS] = a.timeIn.split(":").map(Number);
        const totalInSecs = inH * 3600 + inM * 60 + (inS || 0);
        const totalOutSecs = outH * 3600 + outM * 60;
        // After-hours clock-in rule: if clocked in after closing time, shift duration is 0
        a.coveredTime = totalInSecs >= totalOutSecs ? 0 : Math.max(0, totalOutSecs - totalInSecs);
        
        const workerObj = db.users.find(u => u.id === a.worker_id && u.tenant_id === tenant_id);
        const wordName = workerObj ? `${workerObj.firstName} ${workerObj.lastName}` : "Worker";
        
        const notif_id = "notif-" + Math.random().toString(36).substring(2, 11);
        const notif = {
          id: notif_id,
          tenant_id,
          worker_id: a.worker_id,
          title: "Forced Check-Out Recorded",
          message: `${wordName} was automatically checked out at closing time (${checkoutTime}) because overtime protocol is not engaged.`,
          timestamp: new Date().toISOString(),
          read: false
        };
        db.notifications.push(notif);
        dbUpdated = true;
      }
    });
    if (dbUpdated) {
      saveDB(db);
    }
  }
}

function getInitialState(): DBState {
  // Sample seed data so the dashboard is immediately rich and interactive
  const defaultTenant: Tenant = {
    id: "default-tenant",
    name: "Apex Tech Global Ltd",
    email: "admin@apextech.com",
    phone: "+2348012345678",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
  };

  const adminUser: User = {
    id: "admin-user",
    tenant_id: "default-tenant",
    firstName: "Utibeabasi",
    lastName: "Essien",
    email: "admin@apextech.com",
    phone: "+2348123456789",
    role: UserRole.COMPANY_ADMIN,
    status: "active",
    password: "Password123!",
    createdAt: new Date().toISOString()
  };

  const dept1: Department = {
    id: "dept-eng",
    tenant_id: "default-tenant",
    name: "Engineering Solutions",
    leadId: "lead-alice"
  };

  const dept2: Department = {
    id: "dept-hr",
    tenant_id: "default-tenant",
    name: "Human Resources",
    leadId: ""
  };

  const dept3: Department = {
    id: "dept-sales",
    tenant_id: "default-tenant",
    name: "Enterprise Commerce",
    leadId: "lead-clara"
  };

  const worker1: User = {
    id: "lead-alice",
    tenant_id: "default-tenant",
    firstName: "Alice",
    lastName: "Mendez",
    email: "alice@apextech.com",
    phone: "+2348111222333",
    role: UserRole.TEAM_LEAD,
    department_id: "dept-eng",
    status: "active",
    password: "Password123!",
    title: "Engineering Solutions Lead",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  };

  const worker2: User = {
    id: "worker-bob",
    tenant_id: "default-tenant",
    firstName: "Bob",
    lastName: "Aris",
    email: "bob@apextech.com",
    phone: "+2348111222444",
    role: UserRole.TEAM_MEMBER,
    department_id: "dept-eng",
    status: "active",
    password: "Password123!",
    title: "Senior Fullstack Engineer",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  };

  const worker3: User = {
    id: "lead-clara",
    tenant_id: "default-tenant",
    firstName: "Clara",
    lastName: "Okon",
    email: "clara@apextech.com",
    phone: "+2348111222555",
    role: UserRole.TEAM_LEAD,
    department_id: "dept-sales",
    status: "active",
    password: "Password123!",
    title: "Global Enterprise Sales Lead",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  };

  const worker4: User = {
    id: "worker-david",
    tenant_id: "default-tenant",
    firstName: "David",
    lastName: "Ade",
    email: "david@apextech.com",
    phone: "+2348111222666",
    role: UserRole.TEAM_MEMBER,
    department_id: "dept-hr",
    status: "active",
    password: "Password123!",
    title: "HR Payroll Specialist",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  };

  // Pre-seed lead histories
  const leadHistory1: DepartmentLeadHistory = {
    id: "hist-1",
    department_id: "dept-eng",
    worker_id: "lead-alice",
    tenant_id: "default-tenant",
    start_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: null,
    appointed_by: "admin-user",
    active: true,
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  };

  const leadHistory2: DepartmentLeadHistory = {
    id: "hist-2",
    department_id: "dept-sales",
    worker_id: "lead-clara",
    tenant_id: "default-tenant",
    start_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: null,
    appointed_by: "admin-user",
    active: true,
    timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  };

  // Pre-seed 5 days of attendance logs
  const attendance: Attendance[] = [];
  const daysOfLogs = 5;
  const activityDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  
  for (let i = 0; i < daysOfLogs; i++) {
    const logDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dayName = logDate.toLocaleDateString("en-US", { weekday: "long" });
    if (!activityDays.includes(dayName)) continue;
    
    const dateStr = logDate.toISOString().split("T")[0];
    
    // Alice Mendez - On Time on present days
    attendance.push({
      id: `att-alice-${i}`,
      tenant_id: "default-tenant",
      worker_id: "lead-alice",
      department_id: "dept-eng",
      date: dateStr,
      timeIn: "07:52:12",
      statusIn: AttendanceStatus.PRESENT,
      timeOut: "17:05:00",
      statusOut: "Normal",
      coveredTime: 9 * 3600 + 13 * 60
    });

    // Bob Aris - Late on some days, on time on others
    const bobLate = i % 2 === 0;
    attendance.push({
      id: `att-bob-${i}`,
      tenant_id: "default-tenant",
      worker_id: "worker-bob",
      department_id: "dept-eng",
      date: dateStr,
      timeIn: bobLate ? "08:14:45" : "07:58:30",
      statusIn: bobLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
      timeOut: "17:15:00",
      statusOut: "Normal",
      coveredTime: bobLate ? (9 * 3600) : (9 * 3600 + 16 * 60)
    });

    // Clara Okon - Present on time
    attendance.push({
      id: `att-clara-${i}`,
      tenant_id: "default-tenant",
      worker_id: "lead-clara",
      department_id: "dept-sales",
      date: dateStr,
      timeIn: "07:44:11",
      statusIn: AttendanceStatus.PRESENT,
      timeOut: "17:00:00",
      statusOut: "Normal",
      coveredTime: 9 * 3600 + 15 * 60
    });

    // David Ade - 1 day absent (simulate by skipping record), others on time
    if (i !== 2) {
      attendance.push({
        id: `att-david-${i}`,
        tenant_id: "default-tenant",
        worker_id: "worker-david",
        department_id: "dept-hr",
        date: dateStr,
        timeIn: "07:55:00",
        statusIn: AttendanceStatus.PRESENT,
        timeOut: "17:02:00",
        statusOut: "Normal",
        coveredTime: 9 * 3600 + 7 * 60
      });
    }
  }

  // Pre-seed some permissions
  const p1: Permission = {
    id: "perm-bob-1",
    tenant_id: "default-tenant",
    worker_id: "worker-bob",
    reason: "Medical",
    startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    remarks: "Post-surgery recovery routine checkup",
    status: PermissionStatus.APPROVED
  };

  const p2: Permission = {
    id: "perm-david-1",
    tenant_id: "default-tenant",
    worker_id: "worker-david",
    reason: "Personal",
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    remarks: "Bank transaction issues",
    status: PermissionStatus.APPROVED
  };

  const p3: Permission = {
    id: "perm-alice-1",
    tenant_id: "default-tenant",
    worker_id: "lead-alice",
    reason: "Official",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    remarks: "Client site integration work",
    status: PermissionStatus.PENDING
  };

  const defaultSettings: TenantSettings = {
    tenant_id: "default-tenant",
    theme: "light",
    language: "en",
    activityDays: {
      Sunday: false,
      Monday: true,
      Tuesday: true,
      Wednesday: true,
      Thursday: true,
      Friday: true,
      Saturday: false
    },
    dailyShiftTimes: {
      Sunday: "08:00",
      Monday: "08:00",
      Tuesday: "08:00",
      Wednesday: "08:00",
      Thursday: "08:00",
      Friday: "08:00",
      Saturday: "08:00"
    },
    dailyShiftOutTimes: {
      Sunday: "17:00",
      Monday: "17:00",
      Tuesday: "17:00",
      Wednesday: "17:00",
      Thursday: "17:00",
      Friday: "17:00",
      Saturday: "17:00"
    },
    checkIn: {
      time: "08:00",
      latenessThreshold: 10,
      soundEnabled: false,
      soundName: "none",
      latenessActive: false
    },
    checkOut: {
      time: "17:00",
      soundEnabled: true
    },
    locationTracking: {
      enabled: false,
      latitude: 9.0765,
      longitude: 7.3986,
      radius: 100
    },
    onlyShowTimeIn: true,
    overtimeEnabled: false,
    overtimeHours: 2,
    selectedIntervalDays: 20
  };

  const defaultSubscription: Subscription = {
    id: "sub-default",
    tenant_id: "default-tenant",
    planCode: SubscriptionPlanCode.BUSINESS,
    price: 30000,
    status: "trial",
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // trial expires tomorrow
    paymentMethod: "paystack",
    verified: true
  };

  const auditLog: AuditLog = {
    id: "log-seed-1",
    tenant_id: "default-tenant",
    user_id: "admin-user",
    action: "TENANT_SEEDED",
    timestamp: new Date().toISOString(),
    details: "Apex Tech Seed dataset established for initial demo compliance"
  };

  return {
    tenants: [defaultTenant],
    users: [adminUser, worker1, worker2, worker3, worker4],
    departments: [dept1, dept2, dept3],
    departmentLeadHistory: [leadHistory1, leadHistory2],
    attendance,
    permissions: [p1, p2, p3],
    notifications: [],
    subscriptions: [defaultSubscription],
    settings: [defaultSettings],
    reportJobs: [],
    auditLogs: [auditLog],
    visitorLogs: [],
    announcements: []
  };
}

// Ensure database file loaded and sync/seed with PostgreSQL
let db = loadDB();

seedPostgresDatabase(db).then(async () => {
  try {
    const pgState = await getFullDBStateFromPostgres(db.tenants[0]?.id || "default-tenant");
    if (pgState && pgState.tenants && pgState.tenants.length > 0) {
      db = pgState;
      saveDB(db);
    }
  } catch (e: any) {
    console.warn("Initial load from PostgreSQL skipped:", e?.message || e);
  }
}).catch((err) => {
  console.warn("PostgreSQL boot sync skipped (database connection unavailable):", err?.message || err);
});

// ---------------- SERVER ENDPOINTS ----------------

// SYSTEM HEALTH & DATABASE MONITORING
app.get("/api/admin/system-health", async (req, res) => {
  try {
    const tenant_id = (req.query.tenant_id as string) || "default-tenant";
    let pgState = null;
    try {
      pgState = await getFullDBStateFromPostgres(tenant_id);
    } catch (e) {
      // Fall back to local DB if Postgres connection times out or fails
    }
    const activeDb = pgState || db;
    res.json({
      status: "healthy",
      database: pgState ? "PostgreSQL" : "JSON / In-Memory Data Store",
      engine: pgState ? "Cloud SQL (Drizzle ORM)" : "Local JSON Ledger",
      databaseName: process.env.SQL_DB_NAME || "scan-clock-in",
      connectionHost: process.env.SQL_HOST || "Local Data Store",
      uptimeSeconds: Math.floor(process.uptime()),
      activeSseClients: sseClients.length,
      metrics: {
        tenantsCount: activeDb.tenants?.length || 0,
        usersCount: activeDb.users?.length || 0,
        departmentsCount: activeDb.departments?.length || 0,
        attendanceRecordsCount: activeDb.attendance?.length || 0,
        permissionsCount: activeDb.permissions?.length || 0,
        notificationsCount: activeDb.notifications?.length || 0,
        subscriptionsCount: activeDb.subscriptions?.length || 0,
        settingsCount: activeDb.settings?.length || 0,
        auditLogsCount: activeDb.auditLogs?.length || 0,
        visitorLogsCount: activeDb.visitorLogs?.length || 0,
        reportJobsCount: activeDb.reportJobs?.length || 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: "degraded", error: error.message });
  }
});

// SERVER-SENT EVENTS
app.get("/api/events/subscribe", (req, res) => {
  const tenant_id = req.query.tenant_id as string;
  if (!tenant_id) {
    res.status(400).send("tenant_id required");
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const client = { tenant_id, res };
  sseClients.push(client);

  req.on("close", () => {
    sseClients = sseClients.filter((c) => c.res !== res);
  });
});

// AUTHENTICATION
app.post("/api/billing/pre-register", (req, res) => {
  const { planCode, paymentMethod } = req.body;
  if (!planCode || !paymentMethod) {
    return res.status(400).json({ error: "Subscription plan and payment method are required to pre-register." });
  }

  db = loadDB();
  db.pendingSubscriptions = db.pendingSubscriptions || [];

  const tokenId = "tok-" + Math.random().toString(36).substring(2, 11);
  const pendingSub = {
    id: tokenId,
    planCode,
    paymentMethod,
    status: "paid", // payment simulation succeeded
    createdAt: new Date().toISOString()
  };

  db.pendingSubscriptions.push(pendingSub);
  saveDB(db);

  return res.json({ success: true, token: tokenId });
});

app.post("/api/auth/register-company", (req, res) => {
  const { companyName, email, phone, password, subscriptionToken } = req.body;
  if (!companyName || !email || !phone || !password) {
    return res.status(400).json({ error: "All registration fields are required" });
  }

  db = loadDB();
  db.pendingSubscriptions = db.pendingSubscriptions || [];

  let isAuthorized = false;
  let chosenPlan = SubscriptionPlanCode.STARTER;
  let chosenPrice = 10000;
  let paymentMethod: "card" | "opay" | "paystack" | "manual" | "admin_authorization" = "manual";

  // Check administrative authorization / bypass or paid token
  if (subscriptionToken === "ADMIN_AUTH_CODE" || subscriptionToken === "ADMIN_BYPASS_TOKEN") {
    isAuthorized = true;
    chosenPlan = SubscriptionPlanCode.ENTERPRISE;
    chosenPrice = 0;
    paymentMethod = "admin_authorization";
  } else if (subscriptionToken) {
    const pendingIdx = db.pendingSubscriptions.findIndex(ps => ps.id === subscriptionToken && ps.status === "paid");
    if (pendingIdx !== -1) {
      isAuthorized = true;
      const ps = db.pendingSubscriptions[pendingIdx];
      chosenPlan = ps.planCode;
      paymentMethod = ps.paymentMethod;
      if (chosenPlan === SubscriptionPlanCode.BUSINESS) chosenPrice = 30000;
      else if (chosenPlan === SubscriptionPlanCode.GROWTH) chosenPrice = 50050;
      else if (chosenPlan === SubscriptionPlanCode.ENTERPRISE) chosenPrice = 150000;
      
      // Consume the token to prevent reuse
      db.pendingSubscriptions[pendingIdx].status = "used";
    }
  }

  if (!isAuthorized) {
    return res.status(403).json({ error: "Access denied. An active subscription or administrative authorization is required to register a company." });
  }

  // Validate company/email uniqueness
  const emailExists = db.users.some(u => u.email.toLowerCase() === email.toLowerCase());
  if (emailExists) {
    return res.status(400).json({ error: "Email already registered across platform" });
  }

  const tenant_id = "tenant-" + Math.random().toString(36).substring(2, 11);
  const user_id = "user-" + Math.random().toString(36).substring(2, 11);

  // Password Policy Validation (8 chars, lower, upper, number, special)
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ error: "Password does not comply with the safety policy." });
  }

  const newTenant: Tenant = {
    id: tenant_id,
    name: companyName,
    email,
    phone,
    createdAt: new Date().toISOString()
  };

  const newAdmin: User = {
    id: user_id,
    tenant_id,
    firstName: "Company",
    lastName: "Admin",
    email,
    phone,
    role: UserRole.COMPANY_ADMIN,
    status: "active",
    password,
    createdAt: new Date().toISOString()
  };

  // Build default settings
  const defaultSettings: TenantSettings = {
    tenant_id,
    theme: "light",
    language: "en",
    activityDays: {
      Sunday: false,
      Monday: true,
      Tuesday: true,
      Wednesday: true,
      Thursday: true,
      Friday: true,
      Saturday: false
    },
    dailyShiftTimes: {
      Sunday: "08:00",
      Monday: "08:00",
      Tuesday: "08:00",
      Wednesday: "08:00",
      Thursday: "08:00",
      Friday: "08:00",
      Saturday: "08:00"
    },
    dailyShiftOutTimes: {
      Sunday: "17:00",
      Monday: "17:00",
      Tuesday: "17:00",
      Wednesday: "17:00",
      Thursday: "17:00",
      Friday: "17:00",
      Saturday: "17:00"
    },
    checkIn: {
      time: "08:00",
      latenessThreshold: 10,
      soundEnabled: true
    },
    checkOut: {
      time: "17:00",
      soundEnabled: true
    },
    overtimeHours: 2,
    selectedIntervalDays: 20
  };

  // Build subscription (30 days duration)
  const newSub: Subscription = {
    id: "sub-" + Math.random().toString(36).substring(2, 11),
    tenant_id,
    planCode: chosenPlan,
    price: chosenPrice,
    status: "active",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    paymentMethod,
    verified: true
  };

  // Pre-seed some default departments for convenience
  const deptEngineering: Department = {
    id: "dept-eng-" + tenant_id,
    tenant_id,
    name: "Engineering Solutions"
  };
  const deptOperations: Department = {
    id: "dept-ops-" + tenant_id,
    tenant_id,
    name: "Operations & HR"
  };

  db.tenants.push(newTenant);
  db.users.push(newAdmin);
  db.settings.push(defaultSettings);
  db.subscriptions.push(newSub);
  db.departments.push(deptEngineering, deptOperations);

  db.auditLogs.push({
    id: "log-" + Math.random().toString(36).substring(2, 11),
    tenant_id,
    user_id,
    action: "COMPANY_REGISTERED",
    timestamp: new Date().toISOString(),
    details: `Registered company ${companyName} with active subscription plan ${chosenPlan}`
  });

  saveDB(db);

  return res.json({ success: true, user: newAdmin, tenant: newTenant, subscription: newSub });
});

app.post("/api/auth/register-worker", (req, res) => {
  const { firstName, lastName, phone, email, password, companyId, registeredViaQr, department_id, gender } = req.body;
  if (!firstName || !lastName || !phone || !email || !password || !companyId) {
    return res.status(400).json({ error: "All worker registration fields are required" });
  }

  db = loadDB();

  // Validate company existence with robust fuzzy name OR correct ID lookup
  const parentTenant = db.tenants.find(t => 
    t.id.toLowerCase() === companyId.toLowerCase().trim() ||
    t.name.toLowerCase() === companyId.toLowerCase().trim()
  );
  if (!parentTenant) {
    return res.status(404).json({ error: "Company invitation path not found" });
  }
  const actualCompanyId = parentTenant.id;

  // Validate emails
  const emailExists = db.users.some(u => u.email.toLowerCase() === email.toLowerCase());
  if (emailExists) {
    return res.status(400).json({ error: "Email address already exists in database" });
  }

  // Check Subscription plan limits
  const activeSub = db.subscriptions.find(s => s.tenant_id === actualCompanyId && s.status !== "expired");
  const employeeCount = db.users.filter(u => u.tenant_id === actualCompanyId && u.role !== UserRole.COMPANY_ADMIN).length;
  
  let maxEmployees = 10;
  if (activeSub) {
    if (activeSub.planCode === SubscriptionPlanCode.BUSINESS) maxEmployees = 50;
    else if (activeSub.planCode === SubscriptionPlanCode.GROWTH) maxEmployees = 100;
    else if (activeSub.planCode === SubscriptionPlanCode.ENTERPRISE) maxEmployees = 9999;
  }

  if (employeeCount >= maxEmployees) {
    return res.status(400).json({ error: "Subscription worker threshold exceeded. Upgrade needed." });
  }

  // Password Policy Check
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ error: "Password fails security matrix policies" });
  }

  const user_id = "user-" + Math.random().toString(36).substring(2, 11);
  const defaultDept = db.departments.find(d => d.tenant_id === actualCompanyId);

  // Validate department_id if supplied
  let assignedDeptId = department_id;
  if (assignedDeptId) {
    const deptExists = db.departments.some(d => d.id === assignedDeptId && d.tenant_id === actualCompanyId);
    if (!deptExists) {
      assignedDeptId = undefined;
    }
  }

  const newWorker: User = {
    id: user_id,
    tenant_id: actualCompanyId,
    firstName,
    lastName,
    email,
    phone,
    role: UserRole.TEAM_MEMBER,
    department_id: assignedDeptId || (defaultDept ? defaultDept.id : undefined),
    status: "active",
    password,
    gender,
    title: "Associated Worker",
    createdAt: new Date().toISOString(),
    deviceBinding: {
      deviceId: `device-bind-${Buffer.from(`${email}:${user_id}:${phone}`).toString("base64").substring(0, 16).toLowerCase()}`,
      boundAt: new Date().toISOString(),
      verifiedFields: {
        email,
        userId: user_id,
        name: `${firstName} ${lastName}`,
        phone
      }
    }
  };

  db.users.push(newWorker);

  // Log in registry
  db.auditLogs.push({
    id: "log-" + Math.random().toString(36).substring(2, 11),
    tenant_id: actualCompanyId,
    user_id,
    action: registeredViaQr ? "WORKER_REGISTERED_VIA_QR" : "WORKER_REGISTERED",
    timestamp: new Date().toISOString(),
    details: registeredViaQr 
      ? `Worker ${firstName} ${lastName} completed one-time registration via QR Code Gateway handshake (audited against Active Admin settings and subscription threshold of max ${maxEmployees} employees).`
      : `Worker ${firstName} ${lastName} joined company (standard web registration)`
  });

  // RECORD AUTOMATIC TODAY CHECK-IN AS REQUESTED!
  const todayStr = req.body.localDate || new Date().toISOString().split("T")[0];
  const timeInStr = req.body.localTime || new Date().toTimeString().split(" ")[0];
  
  const settings = db.settings.find(s => s.tenant_id === actualCompanyId);
  const checkInTarget = settings?.checkIn?.time || "08:00";
  const graceMins = settings?.checkIn?.latenessThreshold || 10;
  
  const currentHHMM = timeInStr.substring(0, 5); // "HH:MM"
  const [targetH, targetM] = checkInTarget.split(":").map(Number);
  const [nowH, nowM] = currentHHMM.split(":").map(Number);
  const targetTotalMins = targetH * 60 + targetM + graceMins;
  const nowTotalMins = nowH * 60 + nowM;
  
  const isLate = nowTotalMins > targetTotalMins;
  const statusIn = isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

  const att_id = "att-" + Math.random().toString(36).substring(2, 11);
  const newAttendance: Attendance = {
    id: att_id,
    tenant_id: actualCompanyId,
    worker_id: user_id,
    department_id: newWorker.department_id || "unassigned",
    date: todayStr,
    timeIn: timeInStr,
    statusIn,
    snapshotPhoto: ""
  };
  
  db.attendance.push(newAttendance);

  // Push notifications and audit reports
  const notif_id = "notif-" + Math.random().toString(36).substring(2, 11);
  const notif: Notification = {
    id: notif_id,
    tenant_id: actualCompanyId,
    worker_id: user_id,
    title: "Check-In Success",
    message: `${firstName} ${lastName} checked in (${isLate ? 'LATE' : 'ON TIME'}) at ${newAttendance.timeIn}`,
    timestamp: new Date().toISOString(),
    read: false
  };
  db.notifications.push(notif);

  db.auditLogs.push({
    id: "log-" + Math.random().toString(36).substring(2, 11),
    tenant_id: actualCompanyId,
    user_id,
    action: "QR_CHECK_IN",
    timestamp: new Date().toISOString(),
    details: `Worker ${firstName} ${lastName} auto checked-in upon successful portal registration (audited against Active Admin settings).`
  });

  saveDB(db);

  // Broadcast real-time entry sync to admin dashboard
  broadcastToTenant(actualCompanyId, "WORKER_REGISTERED", {
    worker_id: user_id,
    workerName: `${firstName} ${lastName}`,
    notification: {
      title: "Worker Registered",
      message: `${firstName} ${lastName} has joined ${parentTenant.name}`
    }
  });

  // Broadcast real-time attendance registration event to Admin update
  broadcastToTenant(actualCompanyId, "ATTENDANCE_CREATED", {
    attendance: newAttendance,
    workerName: `${firstName} ${lastName}`,
    workerPhoto: "",
    departmentName: db.departments.find(d => d.id === newWorker.department_id)?.name || "Unassigned",
    notification: notif
  });

  return res.json({ success: true, user: newWorker });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  db = loadDB();

  // Find user by email (case-insensitive)
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials recorded" });
  }

  // Strictly validate assigned password
  const expectedPassword = user.password || "Password123!";
  if (password !== expectedPassword) {
    return res.status(401).json({ error: "Invalid email or password. Please verify your credentials and try again." });
  }

  if (user.status !== "active") {
    return res.status(403).json({ error: "Account suspended by platform supervisors" });
  }

  const tenant = db.tenants.find(t => t.id === user.tenant_id);
  const settings = db.settings.find(s => s.tenant_id === user.tenant_id) || {
    theme: "light",
    language: "en"
  };

  // Find active or trial subscription to supply along
  const subscription = db.subscriptions.find(s => s.tenant_id === user.tenant_id && s.status !== "expired");

  broadcastToTenant(user.tenant_id, "USER_SIGNED_IN", {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    },
    timestamp: new Date().toISOString()
  });

  return res.json({
    success: true,
    user,
    tenant,
    settings,
    subscription
  });
});

// Resend Email Client Lazy Initializer
let resendClient: Resend | null = null;
function getResendClient(): Resend | null {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  if (!apiKey || apiKey.length < 5) return null;
  if (!resendClient) {
    try {
      resendClient = new Resend(apiKey);
    } catch {
      return null;
    }
  }
  return resendClient;
}

// In-memory store for pending password reset PIN codes (valid for 15 minutes)
interface PasswordResetToken {
  email: string;
  code: string;
  expiresAt: number;
}
const pendingResets: Map<string, PasswordResetToken> = new Map();

// RESEND API: FORGOT PASSWORD ENDPOINT
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }

  db = loadDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ 
      error: `No registered account found with the email "${email}". Please double-check for typos or contact your company administrator.` 
    });
  }

  // Generate secure 6-digit numeric PIN
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  pendingResets.set(user.email.toLowerCase(), {
    email: user.email.toLowerCase(),
    code: resetCode,
    expiresAt
  });

  const tenant = db.tenants.find(t => t.id === user.tenant_id);
  const companyName = tenant?.name || "Clock-It Pro";

  const resend = getResendClient();
  let emailSent = false;
  let emailError: string | null = null;

  if (resend) {
    try {
      let rawFrom = (process.env.RESEND_FROM_EMAIL || "").replace(/^["']|["']$/g, "").trim();
      
      // Common public webmail domains that cannot be used as Resend sender domains
      const publicWebmailDomains = [
        "gmail.com", "googlemail.com", "yahoo.", "hotmail.", "outlook.",
        "live.", "icloud.com", "aol.com", "mail.com", "proton.", "protonmail.",
        "zoho.", "yandex.", "gmx."
      ];
      
      const isPublicWebmail = publicWebmailDomains.some(domain => rawFrom.toLowerCase().includes(domain));
      
      // Default to Resend's authorized testing sender if not configured or if a public webmail is provided
      let fromEmail = (!rawFrom || !rawFrom.includes("@") || isPublicWebmail)
        ? "Clock-It Security <onboarding@resend.dev>"
        : rawFrom;

      const htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background-color: #0f172a; color: #f8fafc; border-radius: 20px; border: 1px solid #1e293b;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #38bdf8; font-size: 24px; margin: 0; font-weight: 800; letter-spacing: -0.025em;">CLOCK-IT PRO+</h1>
            <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">${companyName} Security & Authentication Services</p>
          </div>
          <div style="background-color: #1e293b; border-radius: 16px; padding: 24px; border: 1px solid #334155; margin-bottom: 24px;">
            <h2 style="font-size: 18px; color: #ffffff; margin-top: 0;">Password Reset Verification</h2>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">Hello ${user.firstName},</p>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">A password reset request was initiated for your Clock-It account (${user.email}). Please enter the following 6-digit security PIN to reset your password:</p>
            <div style="text-align: center; margin: 28px 0;">
              <div style="display: inline-block; background: linear-gradient(135deg, #0284c7, #2563eb); color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: 0.35em; padding: 14px 28px; border-radius: 12px; font-family: monospace; box-shadow: 0 10px 15px -3px rgba(2, 132, 199, 0.3);">
                ${resetCode}
              </div>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 10px;">This authorization PIN is valid for <strong>15 minutes</strong>.</p>
            </div>
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin-bottom: 0;">If you did not request this password reset, no action is needed. Your existing password remains secure.</p>
          </div>
          <div style="text-align: center; color: #64748b; font-size: 11px;">
            <p>© ${new Date().getFullYear()} ${companyName}. Secured by Clock-It Attendance & Identity Protocol.</p>
          </div>
        </div>
      `;

      let result: any = null;
      try {
        result = await resend.emails.send({
          from: fromEmail,
          to: [user.email.trim()],
          subject: `[Clock-It] Password Reset PIN: ${resetCode}`,
          html: htmlContent
        });
      } catch (sendErr: any) {
        result = { error: sendErr };
      }

      // If sending failed due to domain verification with a custom from address, retry once with onboarding@resend.dev
      if (result?.error && fromEmail !== "Clock-It Security <onboarding@resend.dev>") {
        try {
          result = await resend.emails.send({
            from: "Clock-It Security <onboarding@resend.dev>",
            to: [user.email.trim()],
            subject: `[Clock-It] Password Reset PIN: ${resetCode}`,
            html: htmlContent
          });
        } catch (retryErr: any) {
          result = { error: retryErr };
        }
      }

      if (result?.error) {
        emailError = result.error.message || (typeof result.error === 'string' ? result.error : "Email delivery notice");
        const isSandboxNotice = emailError.toLowerCase().includes("testing emails to your own email address") ||
                                emailError.toLowerCase().includes("verify a domain") ||
                                emailError.toLowerCase().includes("domain is not verified");
        if (isSandboxNotice) {
          console.log(`[Resend Notice]: Free test mode restricts delivery to verified domain/owner. Provided fallback code.`);
        } else {
          console.log(`[Resend Notice]: ${emailError}`);
        }
      } else if (result?.data) {
        emailSent = true;
      }
    } catch (err: any) {
      emailError = err.message || "Failed to dispatch email through Resend API.";
      console.log(`[Resend Notice Handled]: ${emailError}`);
    }
  }

  // Audit log
  db.auditLogs.push({
    id: "log-" + Math.random().toString(36).substring(2, 11),
    tenant_id: user.tenant_id,
    user_id: user.id,
    action: "PASSWORD_RESET_REQUESTED",
    timestamp: new Date().toISOString(),
    details: `Password reset verification PIN requested for ${user.email} (Resend Status: ${emailSent ? "Dispatched" : "Local/Fallback"}).`
  });
  saveDB(db);

  return res.json({
    success: true,
    emailSent,
    message: emailSent 
      ? `A 6-digit password reset PIN has been dispatched to ${email} via Resend. Please check your inbox and spam folder.`
      : `Password reset PIN generated for ${email}.`,
    demoResetCode: !emailSent ? resetCode : undefined
  });
});

// RESEND API: RESET PASSWORD VERIFY & COMMIT
app.post("/api/auth/reset-password", (req, res) => {
  const { email, resetCode, newPassword } = req.body;
  if (!email || !resetCode || !newPassword) {
    return res.status(400).json({ error: "Email, 6-digit reset PIN, and new password are all required." });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = resetCode.trim();

  const record = pendingResets.get(cleanEmail);
  if (!record) {
    return res.status(400).json({ 
      error: "No active password reset request was found for this email. Please request a new verification PIN." 
    });
  }

  if (Date.now() > record.expiresAt) {
    pendingResets.delete(cleanEmail);
    return res.status(400).json({ 
      error: "The 6-digit verification PIN has expired (valid for 15 minutes). Please request a new PIN code." 
    });
  }

  if (record.code !== cleanCode) {
    return res.status(400).json({ 
      error: "The 6-digit verification PIN entered is incorrect. Please verify the code and retry." 
    });
  }

  // Password Policy Check: minimum 8 characters, uppercase, lowercase, number, special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({ 
      error: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character." 
    });
  }

  db = loadDB();
  const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    return res.status(404).json({ error: "User account not found." });
  }

  user.password = newPassword;
  pendingResets.delete(cleanEmail);

  db.auditLogs.push({
    id: "log-" + Math.random().toString(36).substring(2, 11),
    tenant_id: user.tenant_id,
    user_id: user.id,
    action: "PASSWORD_RESET_COMPLETED",
    timestamp: new Date().toISOString(),
    details: `Password was successfully reset for account ${cleanEmail}.`
  });
  saveDB(db);

  return res.json({
    success: true,
    message: "Your password has been successfully updated! You can now log in with your new password."
  });
});

app.post("/api/auth/social-login", (req, res) => {
  const { provider, email, name, photo, tenant_id } = req.body;
  if (!email || !provider) {
    return res.status(400).json({ error: "Email and provider are required" });
  }

  db = loadDB();

  // Find user by email (case-insensitive)
  let user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    // If user does not exist, auto-provision a new user profile via social SSO
    const targetTenantId = tenant_id || (db.tenants[0] ? db.tenants[0].id : "default-tenant");
    const tenant = db.tenants.find(t => t.id === targetTenantId) || db.tenants[0];
    const depts = db.departments.filter(d => d.tenant_id === tenant?.id);
    const defaultDeptId = depts.length > 0 ? depts[0].id : "dept-general";

    const nameParts = (name || email.split("@")[0] || "User").split(" ");
    const firstName = nameParts[0] || "User";
    const lastName = nameParts.slice(1).join(" ") || (provider === "google" ? "Google User" : "Apple User");

    const newUserId = `usr_${provider}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const assignedRole = email.toLowerCase().includes("admin") ? UserRole.COMPANY_ADMIN : UserRole.TEAM_MEMBER;
    user = {
      id: newUserId,
      tenant_id: tenant ? tenant.id : "default-tenant",
      email: email.toLowerCase(),
      firstName: firstName,
      lastName: lastName,
      gender: "Male",
      phone: "+1-555-0199",
      role: assignedRole,
      department_id: defaultDeptId,
      status: "active",
      createdAt: new Date().toISOString()
    };

    db.users.push(user);
    saveDB(db);
    syncStateToPostgres(db).catch(() => {});
  }

  if (user.status !== "active") {
    return res.status(403).json({ error: "Account suspended by platform supervisors" });
  }

  const tenant = db.tenants.find(t => t.id === user.tenant_id);
  const settings = db.settings.find(s => s.tenant_id === user.tenant_id) || {
    theme: "light",
    language: "en"
  };

  const subscription = db.subscriptions.find(s => s.tenant_id === user.tenant_id && s.status !== "expired");

  broadcastToTenant(user.tenant_id, "USER_SIGNED_IN", {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      authProvider: provider
    },
    timestamp: new Date().toISOString()
  });

  return res.json({
    success: true,
    user,
    tenant,
    settings,
    subscription
  });
});

// DEPARTMENTS
app.get("/api/tenant/departments", (req, res) => {
  const tenant_id = req.query.tenant_id as string;
  if (!tenant_id) return res.status(400).json({ error: "tenant_id required" });

  db = loadDB();

  // Robust fallback: search by Name OR ID
  const tenant = db.tenants.find(t => 
    t.id.toLowerCase() === tenant_id.toLowerCase().trim() ||
    t.name.toLowerCase() === tenant_id.toLowerCase().trim()
  );
  
  const resolvedTenantId = tenant ? tenant.id : tenant_id;

  const depts = db.departments.filter(d => d.tenant_id === resolvedTenantId);
  const leadHistory = db.departmentLeadHistory.filter(lh => lh.tenant_id === resolvedTenantId);

  return res.json({ depts, leadHistory });
});

app.post("/api/visitor/check-in", (req, res) => {
  const { name, email, phone, company, department, whoToSee, purpose, tenant_id } = req.body;
  if (!name || !email || !phone || !company || !department || !whoToSee || !purpose) {
    return res.status(400).json({ error: "All visitor check-in fields are required" });
  }

  const activeTenantId = tenant_id || "default-tenant";
  db = loadDB();

  const tenant = db.tenants.find(t => 
    t.id.toLowerCase() === activeTenantId.toLowerCase().trim() ||
    t.name.toLowerCase() === activeTenantId.toLowerCase().trim()
  );
  const resolvedTenantId = tenant ? tenant.id : "default-tenant";

  const passId = "VSTR-" + Math.floor(10000 + Math.random() * 90000);
  const newVisitor: VisitorLog = {
    id: "vstr-" + Math.random().toString(36).substring(2, 11),
    tenant_id: resolvedTenantId,
    name,
    email,
    phone,
    company,
    department,
    whoToSee,
    purpose,
    timestamp: new Date().toISOString(),
    passId
  };

  db.visitorLogs = db.visitorLogs || [];
  db.visitorLogs.push(newVisitor);

  db.auditLogs.push({
    id: "log-" + Math.random().toString(36).substring(2, 11),
    tenant_id: resolvedTenantId,
    user_id: "visitor-gate",
    action: "VISITOR_CHECKED_IN",
    timestamp: new Date().toISOString(),
    details: `Visitor ${name} (${company}) checked in to see ${whoToSee} in ${department}`
  });

  saveDB(db);

  broadcastToTenant(resolvedTenantId, "VISITOR_UPDATED", { action: "check-in", visitor: newVisitor });

  return res.json({ success: true, visitor: newVisitor });
});

app.get("/api/visitor/logs", (req, res) => {
  const tenant_id = req.query.tenant_id as string;
  if (!tenant_id) return res.status(400).json({ error: "tenant_id required" });

  db = loadDB();

  const tenant = db.tenants.find(t => 
    t.id.toLowerCase() === tenant_id.toLowerCase().trim() ||
    t.name.toLowerCase() === tenant_id.toLowerCase().trim()
  );
  const resolvedTenantId = tenant ? tenant.id : tenant_id;

  const logs = (db.visitorLogs || []).filter(v => v.tenant_id === resolvedTenantId);
  return res.json({ logs });
});

app.post("/api/tenant/departments/add", (req, res) => {
  const { tenant_id, name } = req.body;
  if (!tenant_id || !name) return res.status(400).json({ error: "Name and tenant_id required" });

  db = loadDB();
  const dept_id = "dept-" + Math.random().toString(36).substring(2, 11);
  const newDept: Department = {
    id: dept_id,
    tenant_id,
    name
  };

  db.departments.push(newDept);
  saveDB(db);

  broadcastToTenant(tenant_id, "DEPARTMENT_UPDATED", { action: "add", department: newDept });

  return res.json({ success: true, department: newDept });
});

app.post("/api/tenant/departments/rename", (req, res) => {
  const { tenant_id, department_id, name } = req.body;
  if (!tenant_id || !department_id || !name) return res.status(400).json({ error: "All variables required" });

  db = loadDB();
  const index = db.departments.findIndex(d => d.id === department_id && d.tenant_id === tenant_id);
  if (index === -1) return res.status(404).json({ error: "Department not found" });

  db.departments[index].name = name;
  saveDB(db);

  broadcastToTenant(tenant_id, "DEPARTMENT_UPDATED", { action: "rename", department_id, name });

  return res.json({ success: true });
});

app.post("/api/tenant/departments/delete", (req, res) => {
  const { tenant_id, department_id } = req.body;
  if (!tenant_id || !department_id) return res.status(400).json({ error: "Indices required" });

  db = loadDB();
  db.departments = db.departments.filter(d => !(d.id === department_id && d.tenant_id === tenant_id));
  
  // Clean up references in users so they don't break
  db.users = db.users.map(u => {
    if (u.tenant_id === tenant_id && u.department_id === department_id) {
      return { ...u, department_id: undefined };
    }
    return u;
  });

  saveDB(db);

  broadcastToTenant(tenant_id, "DEPARTMENT_UPDATED", { action: "delete", department_id });

  return res.json({ success: true });
});

app.post("/api/tenant/departments/assign-lead", (req, res) => {
  const { tenant_id, department_id, worker_id, appointed_by } = req.body;
  if (!tenant_id || !department_id || !appointed_by) {
    return res.status(400).json({ error: "Required parameters are missing" });
  }

  db = loadDB();
  const deptIdx = db.departments.findIndex(d => d.id === department_id && d.tenant_id === tenant_id);
  if (deptIdx === -1) return res.status(404).json({ error: "Department not found" });

  const previousLeadId = db.departments[deptIdx].leadId;

  // Deactivate any previous historical leads for this department
  db.departmentLeadHistory = db.departmentLeadHistory.map(lh => {
    if (lh.department_id === department_id && lh.tenant_id === tenant_id && lh.active) {
      return { ...lh, active: false, end_date: new Date().toISOString() };
    }
    return lh;
  });

  if (worker_id) {
    // Check if worker valid
    const worker = db.users.find(u => u.id === worker_id && u.tenant_id === tenant_id);
    if (!worker) return res.status(404).json({ error: "Worker not found in tenant" });

    // Set worker is a TEAM_LEAD if they were team member
    db.users = db.users.map(u => {
      if (u.id === worker_id) {
        return { ...u, role: UserRole.TEAM_LEAD, department_id };
      }
      return u;
    });

    // Update existing attendance records for this worker to represent the newly assigned department
    db.attendance = db.attendance.map(att => {
      if (att.worker_id === worker_id && att.tenant_id === tenant_id) {
        return { ...att, department_id };
      }
      return att;
    });

    const dept = db.departments.find(d => d.id === department_id && d.tenant_id === tenant_id);
    const deptName = dept ? dept.name : "Department";

    const workerName = worker ? `${worker.firstName} ${worker.lastName}` : "Worker";

    db.notifications.push({
      id: "notif-" + Math.random().toString(36).substring(2, 11),
      tenant_id,
      worker_id,
      title: "Team Lead Appointed",
      message: `${workerName} has been appointed as the Team Lead for ${deptName}`,
      timestamp: new Date().toISOString(),
      read: false
    });

    // Add new history record
    const hist_id = "hist-" + Math.random().toString(36).substring(2, 11);
    const newHist: DepartmentLeadHistory = {
      id: hist_id,
      department_id,
      worker_id,
      tenant_id,
      start_date: new Date().toISOString(),
      end_date: null,
      appointed_by,
      active: true,
      timestamp: new Date().toISOString()
    };
    db.departmentLeadHistory.push(newHist);
    db.departments[deptIdx].leadId = worker_id;
  } else {
    // Clear lead
    db.departments[deptIdx].leadId = "";
  }

  // If previous lead exists and is no longer leading another department, we could demote to USER. Let's see:
  if (previousLeadId && previousLeadId !== worker_id) {
    const isLeadElsewhere = db.departments.some(d => d.id !== department_id && d.tenant_id === tenant_id && d.leadId === previousLeadId);
    if (!isLeadElsewhere) {
      db.users = db.users.map(u => {
        if (u.id === previousLeadId) {
          const prevWorkerName = `${u.firstName} ${u.lastName}`;
          db.notifications.push({
            id: "notif-" + Math.random().toString(36).substring(2, 11),
            tenant_id,
            worker_id: previousLeadId,
            title: "Department Lead Reassigned",
            message: `${prevWorkerName} is no longer the team lead and has been reassigned as a team member.`,
            timestamp: new Date().toISOString(),
            read: false
          });
          return { ...u, role: UserRole.TEAM_MEMBER };
        }
        return u;
      });
    }
  }

  saveDB(db);

  broadcastToTenant(tenant_id, "LEAD_ASSIGNED", { department_id, worker_id });
  broadcastToTenant(tenant_id, "WORKERS_UPDATED", { action: "assign_lead", department_id, worker_id });

  return res.json({ success: true });
});

// UPDATE TENANT PROFILE (NAME, EMAIL, PHONE)
app.post("/api/tenant/update", (req, res) => {
  const { tenant_id, name, email, phone } = req.body;
  if (!tenant_id) return res.status(400).json({ error: "tenant_id required" });

  db = loadDB();
  const tIdx = db.tenants.findIndex(t => t.id === tenant_id);
  if (tIdx !== -1) {
    if (name && name.trim()) db.tenants[tIdx].name = name.trim();
    if (email && email.trim()) db.tenants[tIdx].email = email.trim();
    if (phone && phone.trim()) db.tenants[tIdx].phone = phone.trim();
    saveDB(db);
    broadcastToTenant(tenant_id, "TENANT_UPDATED", db.tenants[tIdx]);
    return res.json({ success: true, tenant: db.tenants[tIdx] });
  }
  return res.status(404).json({ error: "Tenant not found" });
});

// SETTINGS & WORK DAYS
app.post("/api/tenant/settings/save", (req, res) => {
  const { tenant_id, theme, language, layout, sideNavCollapsed, activityDays, checkIn, checkOut, overtimeHours, overtimeEnabled, onlyShowTimeIn, selectedIntervalDays, dailyShiftTimes, dailyShiftOutTimes, companyLogoUrl } = req.body;
  if (!tenant_id) return res.status(400).json({ error: "tenant_id required" });

  db = loadDB();
  const idx = db.settings.findIndex(s => s.tenant_id === tenant_id);
  const updatedSettings: TenantSettings = {
    tenant_id,
    theme: theme || "light",
    language: language || "en",
    layout: layout || "top",
    sideNavCollapsed: Boolean(sideNavCollapsed),
    activityDays: activityDays || {},
    checkIn: checkIn || { time: "08:00", latenessThreshold: 10, soundEnabled: true },
    checkOut: checkOut || { time: "17:00", soundEnabled: true },
    overtimeHours: overtimeHours || 2,
    overtimeEnabled: overtimeEnabled !== undefined ? overtimeEnabled : false,
    onlyShowTimeIn: onlyShowTimeIn || false,
    selectedIntervalDays: selectedIntervalDays !== undefined ? Number(selectedIntervalDays) : 20,
    dailyShiftTimes: dailyShiftTimes || {},
    dailyShiftOutTimes: dailyShiftOutTimes || {},
    companyLogoUrl: companyLogoUrl || ""
  };

  if (idx !== -1) {
    db.settings[idx] = updatedSettings;
  } else {
    db.settings.push(updatedSettings);
  }

  saveDB(db);

  broadcastToTenant(tenant_id, "SETTINGS_SAVED", updatedSettings);

  return res.json({ success: true, settings: updatedSettings });
});

app.get("/api/tenant/settings", (req, res) => {
  const tenant_id = req.query.tenant_id as string;
  if (!tenant_id) return res.status(400).json({ error: "tenant_id required" });

  db = loadDB();
  const settings = db.settings.find(s => s.tenant_id === tenant_id) || {
    theme: "light",
    language: "en"
  };
  return res.json({ settings });
});

// WORKERS & PROFILE PHOTOS
app.get("/api/tenant/workers", (req, res) => {
  const tenant_id = req.query.tenant_id as string;
  const worker_id = req.query.worker_id as string;
  if (!tenant_id) return res.status(400).json({ error: "tenant_id required" });

  db = loadDB();
  let workers = db.users.filter(u => u.tenant_id === tenant_id);

  if (worker_id) {
    const userObj = db.users.find(u => u.id === worker_id && u.tenant_id === tenant_id);
    if (userObj) {
      if (userObj.role === "team_member") {
        // Regular worker: ONLY themselves
        workers = workers.filter(u => u.id === worker_id);
      } else if (userObj.role === "team_lead") {
        // Team Lead: themselves AND workers in their department
        const leadDeptId = userObj.department_id;
        workers = workers.filter(u => u.id === worker_id || (leadDeptId && u.department_id === leadDeptId));
      }
      // Admins see everyone
    } else {
      workers = workers.filter(u => u.id === worker_id);
    }
  }

  return res.json({ workers });
});

// WORKER CRUD ENDPOINTS
app.post("/api/tenant/workers/add", (req, res) => {
  const { tenant_id, firstName, lastName, email, phone, role, department_id, gender, activityDays } = req.body;
  if (!tenant_id || !firstName || !lastName || !email) {
    return res.status(400).json({ error: "Required fields: tenant_id, firstName, lastName, email" });
  }

  db = loadDB();
  const emailExists = db.users.some(u => u.email.toLowerCase() === email.toLowerCase());
  if (emailExists) {
    return res.status(400).json({ error: "Email address already exists" });
  }

  const user_id = "user-" + Math.random().toString(36).substring(2, 11);
  const newWorker: User = {
    id: user_id,
    tenant_id,
    firstName,
    lastName,
    email,
    phone: phone || "",
    role: role || UserRole.TEAM_MEMBER,
    department_id: department_id || undefined,
    status: "active",
    password: req.body.password || "Password123!",
    gender: gender || "Not Specified",
    createdAt: new Date().toISOString(),
    activityDays: activityDays || undefined,
  };

  db.users.push(newWorker);
  
  // Log action
  db.auditLogs.push({
    id: "log-" + Math.random().toString(36).substring(2, 11),
    tenant_id,
    user_id: "admin",
    action: "WORKER_ADDED_ADMIN",
    timestamp: new Date().toISOString(),
    details: `Admin added worker ${firstName} ${lastName} (${email})`
  });

  saveDB(db);

  broadcastToTenant(tenant_id, "WORKERS_UPDATED", { action: "add", worker: newWorker });
  return res.json({ success: true, worker: newWorker });
});

app.post("/api/tenant/workers/update", (req, res) => {
  const { tenant_id, worker_id, firstName, lastName, email, phone, role, department_id, status, gender, activityDays, profilePhoto, profilePhotos } = req.body;
  if (!tenant_id || !worker_id) {
    return res.status(400).json({ error: "tenant_id and worker_id are required" });
  }

  db = loadDB();
  const workerIdx = db.users.findIndex(u => u.id === worker_id && u.tenant_id === tenant_id);
  if (workerIdx === -1) {
    return res.status(404).json({ error: "Worker not found" });
  }

  const existing = db.users[workerIdx];
  
  // Check email conflict
  if (email && email.toLowerCase() !== existing.email.toLowerCase()) {
    const emailExists = db.users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      return res.status(400).json({ error: "Email address already exists" });
    }
    existing.email = email;
  }

  const oldRole = existing.role;
  const oldDeptId = existing.department_id;

  if (firstName !== undefined) existing.firstName = firstName;
  if (lastName !== undefined) existing.lastName = lastName;
  if (phone !== undefined) existing.phone = phone;
  if (role !== undefined) existing.role = role;
  if (department_id !== undefined) {
    existing.department_id = department_id || undefined;
    // Update existing attendance records for this worker to represent the newly updated department
    db.attendance = db.attendance.map(att => {
      if (att.worker_id === worker_id && att.tenant_id === tenant_id) {
        return { ...att, department_id: department_id || undefined };
      }
      return att;
    });
  }
  if (status !== undefined) existing.status = status;
  if (gender !== undefined) existing.gender = gender;
  if (req.body.password !== undefined && req.body.password) existing.password = req.body.password;
  if (activityDays !== undefined) existing.activityDays = activityDays;
  if (profilePhoto !== undefined) existing.profilePhoto = profilePhoto;
  if (profilePhotos !== undefined) existing.profilePhoto = profilePhotos;

  // Generate specific notifications if details changed
  const roleChanged = role !== undefined && role !== oldRole;
  const deptChanged = department_id !== undefined && department_id !== oldDeptId;

  if (deptChanged) {
    const dept = db.departments.find(d => d.id === department_id && d.tenant_id === tenant_id);
    const deptName = dept ? dept.name : "Unassigned";
    db.notifications.push({
      id: "notif-" + Math.random().toString(36).substring(2, 11),
      tenant_id,
      worker_id: worker_id,
      title: "Department Assignment Updated",
      message: `Your corporate department has been updated to ${deptName}.`,
      timestamp: new Date().toISOString(),
      read: false
    });
  }

  if (roleChanged) {
    const roleLabel = role === "team_lead" ? "Team Lead" : role === "company_admin" ? "Company Admin" : "Team Member";
    db.notifications.push({
      id: "notif-" + Math.random().toString(36).substring(2, 11),
      tenant_id,
      worker_id: worker_id,
      title: "Role Configuration Updated",
      message: `Your corporate administrative role has been updated to ${roleLabel}.`,
      timestamp: new Date().toISOString(),
      read: false
    });
  }

  // Log action
  db.auditLogs.push({
    id: "log-" + Math.random().toString(36).substring(2, 11),
    tenant_id,
    user_id: "admin",
    action: "WORKER_UPDATED_ADMIN",
    timestamp: new Date().toISOString(),
    details: `Admin updated worker ${existing.firstName} ${existing.lastName}`
  });

  saveDB(db);

  broadcastToTenant(tenant_id, "WORKERS_UPDATED", { action: "update", worker: existing });
  return res.json({ success: true, worker: existing });
});

app.post("/api/tenant/workers/delete", (req, res) => {
  const { tenant_id, worker_id } = req.body;
  if (!tenant_id || !worker_id) {
    return res.status(400).json({ error: "tenant_id and worker_id are required" });
  }

  db = loadDB();
  const workerIdx = db.users.findIndex(u => u.id === worker_id && u.tenant_id === tenant_id);
  if (workerIdx === -1) {
    return res.status(404).json({ error: "Worker not found" });
  }

  const deletedWorker = db.users[workerIdx];
  db.users.splice(workerIdx, 1);

  // Clean up references (e.g. if lead of a department)
  db.departments.forEach(dept => {
    if (dept.leadId === worker_id) {
      dept.leadId = undefined;
    }
  });

  // Log action
  db.auditLogs.push({
    id: "log-" + Math.random().toString(36).substring(2, 11),
    tenant_id,
    user_id: "admin",
    action: "WORKER_DELETED_ADMIN",
    timestamp: new Date().toISOString(),
    details: `Admin deleted worker ${deletedWorker.firstName} ${deletedWorker.lastName} (${deletedWorker.email})`
  });

  saveDB(db);

  broadcastToTenant(tenant_id, "WORKERS_UPDATED", { action: "delete", worker_id });
  return res.json({ success: true });
});

app.post("/api/tenant/workers/assign-department", (req, res) => {
  const { tenant_id, worker_ids, department_id } = req.body;
  if (!tenant_id || !worker_ids || !Array.isArray(worker_ids)) {
    return res.status(400).json({ error: "tenant_id and worker_ids array required" });
  }

  db = loadDB();
  let count = 0;
  const dept = db.departments.find(d => d.id === department_id && d.tenant_id === tenant_id);
  const deptName = dept ? dept.name : "Unassigned";

  worker_ids.forEach(wid => {
    const w = db.users.find(u => u.id === wid && u.tenant_id === tenant_id);
    if (w) {
      const oldDeptId = w.department_id;
      w.department_id = department_id || undefined;
      count++;

      if (oldDeptId !== w.department_id) {
        db.notifications.push({
          id: "notif-" + Math.random().toString(36).substring(2, 11),
          tenant_id,
          worker_id: wid,
          title: "Department Assignment Updated",
          message: `Your corporate department has been updated to ${deptName}.`,
          timestamp: new Date().toISOString(),
          read: false
        });
      }

      // Update existing attendance records for this worker to represent the newly assigned department
      db.attendance = db.attendance.map(att => {
        if (att.worker_id === wid && att.tenant_id === tenant_id) {
          return { ...att, department_id: department_id || undefined };
        }
        return att;
      });
    }
  });

  if (count > 0) {
    db.auditLogs.push({
      id: "log-" + Math.random().toString(36).substring(2, 11),
      tenant_id,
      user_id: "admin",
      action: "WORKERS_ASSIGN_DEPT",
      timestamp: new Date().toISOString(),
      details: `Admin assigned ${count} worker(s) to department ${department_id || "Unassigned"}`
    });
    saveDB(db);
    broadcastToTenant(tenant_id, "WORKERS_UPDATED", { action: "assign_dept", department_id });
  }

  return res.json({ success: true, count });
});

app.post("/api/profile/upload", (req, res) => {
  const { worker_id, tenant_id, profilePhotos } = req.body; // profilePhotos: { original, medium, small }
  if (!worker_id || !tenant_id || !profilePhotos) {
    return res.status(400).json({ error: "Missing file/references for sync" });
  }

  db = loadDB();
  const userIdx = db.users.findIndex(u => u.id === worker_id && u.tenant_id === tenant_id);
  if (userIdx === -1) return res.status(404).json({ error: "Worker trace failed" });

  db.users[userIdx].profilePhoto = profilePhotos;
  saveDB(db);

  // Real-time broadcast so any watching admins get the new photo instantly
  broadcastToTenant(tenant_id, "PROFILE_SYNCED", { worker_id, profilePhotos });

  return res.json({ success: true, profilePhoto: profilePhotos });
});

// ATTENDANCE LOGICAL ENGINE
app.get("/api/attendance/records", (req, res) => {
  const tenant_id = req.query.tenant_id as string;
  const worker_id = req.query.worker_id as string;
  if (!tenant_id) return res.status(400).json({ error: "tenant_id index required" });

  try {
    runAutoCheckout();
  } catch (err) {
    console.warn("Auto checkout runner skipped inside route:", err);
  }

  db = loadDB();
  let records = db.attendance.filter(a => a.tenant_id === tenant_id);

  if (worker_id) {
    const userObj = db.users.find(u => u.id === worker_id && u.tenant_id === tenant_id);
    if (userObj) {
      if (userObj.role === "team_member") {
        // Regular worker: ONLY their own attendance records
        records = records.filter(a => a.worker_id === worker_id);
      } else if (userObj.role === "team_lead") {
        // Team Lead: their own attendance records OR those from workers in their department
        const leadDeptId = userObj.department_id;
        records = records.filter(a => a.worker_id === worker_id || (leadDeptId && a.department_id === leadDeptId));
      }
      // Admins see everyone
    } else {
      records = records.filter(a => a.worker_id === worker_id);
    }
  }

  return res.json({ records });
});

app.post("/api/attendance/check-in", (req, res) => {
  const { worker_id, tenant_id, localDate, localTime } = req.body;
  if (!worker_id || !tenant_id) return res.status(400).json({ error: "Worker and tenant credentials required" });

  try {
    runAutoCheckout();
  } catch (err) {
    console.warn("Auto checkout runner skipped inside route:", err);
  }

  db = loadDB();

  // Validate Subscription and free trials
  const activeSub = db.subscriptions.find(s => s.tenant_id === tenant_id && s.status !== "expired");
  if (!activeSub) {
    return res.status(403).json({ error: "All features locked. Unpaid / Expired billing." });
  }

  // Ensure current time is not expired trial
  if (activeSub.status === "trial" && new Date(activeSub.endDate).getTime() < Date.now()) {
    activeSub.status = "expired";
    saveDB(db);
    return res.status(403).json({ error: "trial_expired_lockout" });
  }

  const todayStr = localDate || new Date().toISOString().split("T")[0];

  // Prevent duplicate scan check in
  const existingRecord = db.attendance.find(a => a.tenant_id === tenant_id && a.worker_id === worker_id && a.date === todayStr);
  if (existingRecord) {
    if (existingRecord.timeOut) {
      return res.status(400).json({ error: "already_checked_out_for_today", message: "You have already completed your shift today! You are exempted until tomorrow." });
    }
    return res.status(200).json({ 
      alreadyCheckedIn: true, 
      existingTime: existingRecord.timeIn,
      recordId: existingRecord.id
    });
  }

  // Lookup worker info to capture department at point of index: Requirements state: "Attendance records must preserve department_id at time of attendance"
  const workerObj = db.users.find(u => u.id === worker_id && u.tenant_id === tenant_id);
  if (!workerObj) {
    return res.status(404).json({ error: "Worker entity missing" });
  }

  const workerDept = workerObj.department_id || "unassigned";

  // Check in Lateness configuration
  const settings = db.settings.find(s => s.tenant_id === tenant_id);
  const checkInTarget = settings?.checkIn?.time || "08:00";
  const graceMins = settings?.checkIn?.latenessThreshold || 10;

  const currentHHMM = localTime ? localTime.substring(0, 5) : new Date().toTimeString().split(" ")[0].substring(0, 5); // "HH:MM"
  const timeInStr = localTime || new Date().toTimeString().split(" ")[0];
  
  // Calculate if late
  const [targetH, targetM] = checkInTarget.split(":").map(Number);
  const [nowH, nowM] = currentHHMM.split(":").map(Number);
  const targetTotalMins = targetH * 60 + targetM + graceMins;
  const nowTotalMins = nowH * 60 + nowM;

  const isLate = nowTotalMins > targetTotalMins;
  const statusIn = isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

  const att_id = "att-" + Math.random().toString(36).substring(2, 11);
  const newAttendance: Attendance = {
    id: att_id,
    tenant_id,
    worker_id,
    department_id: workerDept,
    date: todayStr,
    timeIn: timeInStr,
    statusIn,
    snapshotPhoto: workerObj.profilePhoto?.small || "" // preserving profile at time of attendance
  };

  db.attendance.push(newAttendance);

  // Log in notifications
  const notif_id = "notif-" + Math.random().toString(36).substring(2, 11);
  const notif: Notification = {
    id: notif_id,
    tenant_id,
    worker_id,
    title: "Check-In Success",
    message: `${workerObj.firstName} ${workerObj.lastName} checked in (${isLate ? 'LATE' : 'ON TIME'}) at ${newAttendance.timeIn}`,
    timestamp: new Date().toISOString(),
    read: false
  };
  db.notifications.push(notif);

  // Record audit trail in database pertaining to the active admin settings
  db.auditLogs.push({
    id: "log-" + Math.random().toString(36).substring(2, 11),
    tenant_id,
    user_id: worker_id,
    action: "QR_CHECK_IN",
    timestamp: new Date().toISOString(),
    details: `Worker ${workerObj.firstName} ${workerObj.lastName} checked in via contactless QR terminal. Inspected against admin lateness bound ${checkInTarget} (grace period: ${graceMins} minutes). Calculated status: ${statusIn}.`
  });

  saveDB(db);

  // Broadcast real-time SSE to Admin to display top notification toasts
  broadcastToTenant(tenant_id, "ATTENDANCE_CREATED", {
    attendance: newAttendance,
    workerName: `${workerObj.firstName} ${workerObj.lastName}`,
    workerPhoto: workerObj.profilePhoto?.small || "",
    departmentName: db.departments.find(d => d.id === workerDept)?.name || "Unassigned",
    notification: notif
  });

  return res.json({ 
    success: true, 
    attendance: newAttendance,
    soundName: settings?.checkIn?.soundName || "beep"
  });
});

app.post("/api/attendance/check-out", (req, res) => {
  const { worker_id, tenant_id, localDate, localTime } = req.body;
  if (!worker_id || !tenant_id) return res.status(400).json({ error: "Missing values" });

  db = loadDB();
  const todayStr = localDate || new Date().toISOString().split("T")[0];

  const attIdx = db.attendance.findIndex(a => a.tenant_id === tenant_id && a.worker_id === worker_id && a.date === todayStr);
  if (attIdx === -1) {
    return res.status(404).json({ error: "No active check-in trace for today." });
  }

  if (db.attendance[attIdx].timeOut) {
    return res.status(400).json({ error: "already_checked_out", message: "You have already checked out for today!" });
  }

  const timeOutStr = localTime || new Date().toTimeString().split(" ")[0];

  // Determine departure status based on shift closing time & overtime settings
  const settings = db.settings.find(s => s.tenant_id === tenant_id);
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dateParts = todayStr.split("-").map(Number);
  const recDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
  const dayName = daysOfWeek[recDate.getDay()];
  const closingTime = settings?.dailyShiftOutTimes?.[dayName] || settings?.checkOut?.time || "17:00";
  const [cH, cM] = closingTime.split(":").map(Number);
  const closingSecs = (cH || 17) * 3600 + (cM || 0) * 60;

  const [outH, outM, outS] = timeOutStr.split(":").map(Number);
  const outSecs = (outH || 0) * 3600 + (outM || 0) * 60 + (outS || 0);

  const overtimeEnabled = settings ? (settings.overtimeEnabled === true) : false;

  let statusOut = "Normal Checkout";
  if (outSecs >= closingSecs) {
    if (overtimeEnabled) {
      statusOut = "Overtime";
    } else {
      statusOut = "Closing Time";
    }
  }

  db.attendance[attIdx].timeOut = timeOutStr;
  db.attendance[attIdx].statusOut = statusOut;

  // Calculate duration
  const [inH, inM, inS] = db.attendance[attIdx].timeIn.split(":").map(Number);
  const totalInSecs = (inH || 0) * 3600 + (inM || 0) * 60 + (inS || 0);
  
  // Workday closing rule: clock-in after configured workday close results in 00:00:00 shift hours
  let durationSecs = 0;
  if (totalInSecs < closingSecs) {
    durationSecs = outSecs - totalInSecs;
    if (durationSecs < 0) durationSecs += 86400;
  }
  
  db.attendance[attIdx].coveredTime = Math.max(0, durationSecs);

  const workerObj = db.users.find(u => u.id === worker_id && u.tenant_id === tenant_id);
  const wordName = workerObj ? `${workerObj.firstName} ${workerObj.lastName}` : "Someone";

  const notif_id = "notif-" + Math.random().toString(36).substring(2, 11);
  const notif: Notification = {
    id: notif_id,
    tenant_id,
    worker_id,
    title: "Check-Out Recorded",
    message: `${wordName} checked out at ${timeOutStr}`,
    timestamp: new Date().toISOString(),
    read: false
  };
  db.notifications.push(notif);

  saveDB(db);

  broadcastToTenant(tenant_id, "ATTENDANCE_UPDATED", {
    attendance: db.attendance[attIdx],
    workerName: wordName,
    notification: notif
  });

  return res.json({ success: true, attendance: db.attendance[attIdx] });
});


app.post("/api/attendance/manual-create", (req, res) => {
  const worker_id = req.body.worker_id || req.body.workerId;
  const { tenant_id, date, timeIn, statusIn, timeOut, statusOut, coveredTime } = req.body;
  if (!tenant_id || !worker_id || !date || !timeIn) {
    return res.status(400).json({ error: "Missing required attendance parameters (tenant_id, worker_id, date, timeIn)" });
  }

  // Reject future dates
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (date > todayStr) {
    return res.status(400).json({ error: "Attendance records cannot be created for future dates." });
  }

  db = loadDB();
  const worker = db.users.find(u => u.id === worker_id && u.tenant_id === tenant_id);
  if (!worker) {
    return res.status(404).json({ error: "Worker not found in tenant organization" });
  }

  // Ensure no duplicate attendance record for the same employee on the same date
  const existingRecord = db.attendance.find(a => a.tenant_id === tenant_id && a.worker_id === worker_id && a.date === date);
  if (existingRecord) {
    return res.status(400).json({ error: `An attendance record already exists for this employee on ${date}. Duplicate records on the same date are not permitted.` });
  }

  let calculatedDuration = coveredTime !== undefined && coveredTime !== null ? Number(coveredTime) : 0;
  if (timeOut && (!calculatedDuration || calculatedDuration === 0)) {
    try {
      const [inH, inM, inS] = timeIn.split(":").map(Number);
      const [outH, outM, outS] = timeOut.split(":").map(Number);
      const inSecs = (inH || 0) * 3600 + (inM || 0) * 60 + (inS || 0);
      const outSecs = (outH || 0) * 3600 + (outM || 0) * 60 + (outS || 0);
      let diff = outSecs - inSecs;
      if (diff < 0) diff += 86400;
      calculatedDuration = Math.max(0, diff);
    } catch (e) {}
  }

  const newRecord: Attendance = {
    id: "att-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    tenant_id,
    worker_id,
    department_id: worker.department_id || "unassigned",
    date,
    timeIn,
    statusIn: statusIn || "Normal Arrival",
    timeOut: timeOut || undefined,
    statusOut: statusOut || (timeOut ? "Normal Checkout" : undefined),
    coveredTime: calculatedDuration,
  };

  db.attendance.push(newRecord);
  saveDB(db);

  const workerName = `${worker.firstName} ${worker.lastName}`;
  const notif_id = "notif-" + Math.random().toString(36).substring(2, 11);
  const notif: Notification = {
    id: notif_id,
    tenant_id,
    worker_id,
    title: "Attendance Record Created",
    message: `Admin created attendance record for ${workerName} on ${date}`,
    timestamp: new Date().toISOString(),
    read: false
  };
  db.notifications.push(notif);
  saveDB(db);

  broadcastToTenant(tenant_id, "ATTENDANCE_CREATED", {
    attendance: newRecord,
    workerName,
    notification: notif
  });

  return res.json({ success: true, record: newRecord });
});
app.post("/api/attendance/manual-update", (req, res) => {
  const record_id = req.body.record_id || req.body.id || req.body.recordId;
  const { tenant_id, date, timeIn, statusIn, timeOut, statusOut, coveredTime } = req.body;
  if (!tenant_id || !record_id) {
    return res.status(400).json({ error: "tenant_id and record_id are required" });
  }

  // Reject future dates
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (date && date > todayStr) {
    return res.status(400).json({ error: "Attendance records cannot be updated to future dates." });
  }

  db = loadDB();
  const attIdx = db.attendance.findIndex(a => a.id === record_id && a.tenant_id === tenant_id);
  if (attIdx === -1) {
    return res.status(404).json({ error: "Attendance record not found" });
  }

  const rec = db.attendance[attIdx];

  // If changing the date, ensure no duplicate record on the target date for this worker
  if (date !== undefined) {
    const existingRecord = db.attendance.find(
      a => a.tenant_id === tenant_id && a.worker_id === rec.worker_id && a.date === date && a.id !== record_id
    );
    if (existingRecord) {
      return res.status(400).json({ error: `An attendance record already exists for this employee on ${date}. Duplicate records on the same date are not permitted.` });
    }
    rec.date = date;
  }

  if (timeIn !== undefined) rec.timeIn = timeIn;
  if (statusIn !== undefined) rec.statusIn = statusIn;
  if (timeOut !== undefined) rec.timeOut = timeOut;
  if (statusOut !== undefined) rec.statusOut = statusOut;
  
  if (rec.timeIn && rec.timeOut) {
    try {
      const [inH, inM, inS] = rec.timeIn.split(":").map(Number);
      const [outH, outM, outS] = rec.timeOut.split(":").map(Number);
      const inSecs = (inH || 0) * 3600 + (inM || 0) * 60 + (inS || 0);
      const outSecs = (outH || 0) * 3600 + (outM || 0) * 60 + (outS || 0);
      let diff = outSecs - inSecs;
      if (diff < 0) diff += 86400;
      rec.coveredTime = coveredTime !== undefined && coveredTime !== null ? Number(coveredTime) : Math.max(0, diff);
    } catch (e) {
      if (coveredTime !== undefined) rec.coveredTime = Number(coveredTime);
    }
  } else if (coveredTime !== undefined && coveredTime !== null) {
    rec.coveredTime = Number(coveredTime);
  }

  saveDB(db);

  const workerObj = db.users.find(u => u.id === rec.worker_id && u.tenant_id === tenant_id);
  const workerName = workerObj ? `${workerObj.firstName} ${workerObj.lastName}` : "Employee";
  const notif_id = "notif-" + Math.random().toString(36).substring(2, 11);
  const notif: Notification = {
    id: notif_id,
    tenant_id,
    worker_id: rec.worker_id,
    title: "Attendance Record Updated",
    message: `Attendance log for ${workerName} on ${rec.date} was updated by administrator.`,
    timestamp: new Date().toISOString(),
    read: false
  };
  db.notifications.push(notif);
  saveDB(db);

  broadcastToTenant(tenant_id, "ATTENDANCE_UPDATED", {
    attendance: rec,
    workerName,
    notification: notif
  });

  return res.json({ success: true, record: rec });
});
app.post("/api/attendance/manual-delete", (req, res) => {
  const record_id = req.body.record_id || req.body.id || req.body.recordId;
  const { tenant_id } = req.body;
  if (!tenant_id || !record_id) {
    return res.status(400).json({ error: "tenant_id and record_id are required" });
  }
  db = loadDB();
  const attIdx = db.attendance.findIndex(a => a.id === record_id && a.tenant_id === tenant_id);
  if (attIdx === -1) {
    return res.status(404).json({ error: "Attendance record not found" });
  }

  const [deletedRec] = db.attendance.splice(attIdx, 1);
  saveDB(db);

  const workerObj = db.users.find(u => u.id === deletedRec.worker_id && u.tenant_id === tenant_id);
  const workerName = workerObj ? `${workerObj.firstName} ${workerObj.lastName}` : "Employee";
  const notif_id = "notif-" + Math.random().toString(36).substring(2, 11);
  const notif: Notification = {
    id: notif_id,
    tenant_id,
    worker_id: deletedRec.worker_id,
    title: "Attendance Record Removed",
    message: `Attendance record for ${workerName} on ${deletedRec.date} was deleted.`,
    timestamp: new Date().toISOString(),
    read: false
  };
  db.notifications.push(notif);
  saveDB(db);

  broadcastToTenant(tenant_id, "ATTENDANCE_UPDATED", {
    action: "delete",
    record_id,
    workerName,
    notification: notif
  });

  return res.json({ success: true, deleted_id: record_id });
});

app.post("/api/attendance/sync-offline", (req, res) => {
  const { tenant_id, queue } = req.body;
  if (!tenant_id || !Array.isArray(queue)) {
    return res.status(400).json({ error: "tenant_id and queue array are required" });
  }
  db = loadDB();
  const results: any[] = [];
  let syncedCount = 0;

  for (const item of queue) {
    try {
      const { id, type, worker_id, localDate, localTime } = item;
      const todayStr = localDate || new Date().toISOString().split("T")[0];
      const timeStr = localTime || new Date().toTimeString().split(" ")[0];

      if (type === "check-in") {
        const existingRecord = db.attendance.find(a => a.tenant_id === tenant_id && a.worker_id === worker_id && a.date === todayStr);
        if (existingRecord) {
          results.push({ id, status: "already_exists", recordId: existingRecord.id });
          continue;
        }
        const workerObj = db.users.find(u => u.id === worker_id && u.tenant_id === tenant_id);
        if (!workerObj) {
          results.push({ id, status: "error", message: "Worker not found" });
          continue;
        }
        const settings = db.settings.find(s => s.tenant_id === tenant_id);
        const checkInTarget = settings?.checkIn?.time || "08:00";
        const graceMins = settings?.checkIn?.latenessThreshold || 10;
        const currentHHMM = timeStr.substring(0, 5);
        const [targetH, targetM] = checkInTarget.split(":").map(Number);
        const [nowH, nowM] = currentHHMM.split(":").map(Number);
        const targetTotalMinutes = (targetH || 8) * 60 + (targetM || 0);
        const nowTotalMinutes = (nowH || 0) * 60 + (nowM || 0);
        const isLatenessActive = settings?.checkIn?.latenessActive !== false;
        let statusIn: any = "Normal Arrival";
        if (isLatenessActive && nowTotalMinutes > (targetTotalMinutes + graceMins)) {
          statusIn = "Late Arrival";
        }

        const newRec: Attendance = {
          id: "att-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
          tenant_id,
          worker_id,
          department_id: workerObj.department_id || "unassigned",
          date: todayStr,
          timeIn: timeStr,
          statusIn,
          coveredTime: 0
        };
        db.attendance.push(newRec);
        syncedCount++;
        results.push({ id, status: "synced", record: newRec });
        
        broadcastToTenant(tenant_id, "ATTENDANCE_CREATED", {
          attendance: newRec,
          workerName: `${workerObj.firstName} ${workerObj.lastName}`
        });
      } else if (type === "check-out") {
        const attIdx = db.attendance.findIndex(a => a.tenant_id === tenant_id && a.worker_id === worker_id && a.date === todayStr);
        if (attIdx === -1) {
          results.push({ id, status: "no_checkin_found" });
          continue;
        }
        if (db.attendance[attIdx].timeOut) {
          results.push({ id, status: "already_checked_out" });
          continue;
        }
        db.attendance[attIdx].timeOut = timeStr;
        db.attendance[attIdx].statusOut = "Normal Checkout";
        try {
          const [inH, inM, inS] = db.attendance[attIdx].timeIn.split(":").map(Number);
          const [outH, outM, outS] = timeStr.split(":").map(Number);
          const inSecs = (inH || 0) * 3600 + (inM || 0) * 60 + (inS || 0);
          const outSecs = (outH || 0) * 3600 + (outM || 0) * 60 + (outS || 0);
          let diff = outSecs - inSecs;
          if (diff < 0) diff += 86400;
          db.attendance[attIdx].coveredTime = Math.max(0, diff);
        } catch (e) {}
        syncedCount++;
        results.push({ id, status: "synced", record: db.attendance[attIdx] });

        const workerObj = db.users.find(u => u.id === worker_id && u.tenant_id === tenant_id);
        broadcastToTenant(tenant_id, "ATTENDANCE_UPDATED", {
          attendance: db.attendance[attIdx],
          workerName: workerObj ? `${workerObj.firstName} ${workerObj.lastName}` : "Employee"
        });
      }
    } catch (itemErr: any) {
      results.push({ id: item.id, status: "error", message: itemErr.message });
    }
  }

  saveDB(db);
  return res.json({ success: true, syncedCount, results });
});
app.get("/api/tenant/subscription", (req, res) => {
  const tenant_id = req.query.tenant_id as string;
  if (!tenant_id) return res.status(400).json({ error: "tenant_id required" });

  db = loadDB();
  const subscription = db.subscriptions.find(s => s.tenant_id === tenant_id && s.status !== "expired");
  return res.json({ subscription: subscription || null });
});

// PERMISSION EXEMPTIONS
app.get("/api/permissions", (req, res) => {
  const tenant_id = req.query.tenant_id as string;
  const worker_id = req.query.worker_id as string;
  if (!tenant_id) return res.status(400).json({ error: "tenant_id required" });

  db = loadDB();
  let perms = db.permissions.filter(p => p.tenant_id === tenant_id);

  if (worker_id) {
    const userObj = db.users.find(u => u.id === worker_id && u.tenant_id === tenant_id);
    if (userObj) {
      if (userObj.role === "team_member") {
        // Regular worker: ONLY their own permission requests
        perms = perms.filter(p => p.worker_id === worker_id);
      } else if (userObj.role === "team_lead") {
        // Team Lead: their own permission requests OR those from workers in their department
        const leadDeptId = userObj.department_id;
        perms = perms.filter(p => {
          if (p.worker_id === worker_id) return true;
          const requester = db.users.find(u => u.id === p.worker_id && u.tenant_id === tenant_id);
          return requester && requester.department_id === leadDeptId;
        });
      }
      // Admins see everyone
    } else {
      perms = perms.filter(p => p.worker_id === worker_id);
    }
  }

  return res.json({ permissions: perms });
});

app.post("/api/permissions/request", (req, res) => {
  const { tenant_id, worker_id, reason, startDate, endDate, remarks } = req.body;
  if (!tenant_id || !worker_id || !reason || !startDate || !endDate) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  db = loadDB();

  const newPerm: Permission = {
    id: "perm-" + Math.random().toString(36).substring(2, 11),
    tenant_id,
    worker_id,
    reason,
    startDate,
    endDate,
    remarks: remarks || "",
    status: PermissionStatus.PENDING
  };

  db.permissions.push(newPerm);

  // Audit Logs & Notifications
  const workerObj = db.users.find(u => u.id === worker_id && u.tenant_id === tenant_id);
  const labelName = workerObj ? `${workerObj.firstName} ${workerObj.lastName}` : "Worker";

  const notif_id = "notif-" + Math.random().toString(36).substring(2, 11);
  const notif: Notification = {
    id: notif_id,
    tenant_id,
    title: "New Permission Request",
    message: `${labelName} requests ${reason} exemption from ${startDate} to ${endDate}`,
    timestamp: new Date().toISOString(),
    read: false,
    permission_id: newPerm.id
  };
  db.notifications.push(notif);

  saveDB(db);

  broadcastToTenant(tenant_id, "PERMISSION_REQUESTED", {
    permission: newPerm,
    workerName: labelName,
    workerPhoto: workerObj?.profilePhoto?.small || "",
    departmentName: db.departments.find(d => d.id === workerObj?.department_id)?.name || "Unassigned",
    notification: notif
  });

  return res.json({ success: true, permission: newPerm });
});

app.post("/api/permissions/update", (req, res) => {
  const { tenant_id, permission_id, status } = req.body; // status: APPROVED or REJECTED
  if (!tenant_id || !permission_id || !status) {
    return res.status(400).json({ error: "Indices are mismatching" });
  }

  db = loadDB();
  const idx = db.permissions.findIndex(p => p.id === permission_id && p.tenant_id === tenant_id);
  if (idx === -1) return res.status(404).json({ error: "Request not found" });

  const normStatus = status.toLowerCase();
  db.permissions[idx].status = normStatus;

  // Add notification to notify worker about status
  const pm = db.permissions[idx];
  const notif_id = "notif-" + Math.random().toString(36).substring(2, 11);
  db.notifications.push({
    id: notif_id,
    tenant_id,
    worker_id: pm.worker_id,
    title: `Permission Request ${status.toUpperCase()}`,
    message: `Your requested absence for ${pm.reason} (${pm.startDate}) was ${normStatus}`,
    timestamp: new Date().toISOString(),
    read: false
  });

  saveDB(db);

  broadcastToTenant(tenant_id, "PERMISSION_EVALUATED", {
    permission: db.permissions[idx]
  });

  return res.json({ success: true });
});

app.get("/api/notifications", (req, res) => {
  const tenant_id = req.query.tenant_id as string;
  const worker_id = req.query.worker_id as string;
  if (!tenant_id) return res.status(400).json({ error: "tenant_id required" });

  db = loadDB();
  let notifs = db.notifications.filter(n => n.tenant_id === tenant_id);

  if (worker_id) {
    const userObj = db.users.find(u => u.id === worker_id && u.tenant_id === tenant_id);
    if (userObj) {
      if (userObj.role === "team_member") {
        // Regular team member: ONLY their own notifications
        notifs = notifs.filter(n => n.worker_id === worker_id);
      } else if (userObj.role === "team_lead") {
        // Team Lead: their own notifications OR permission requests from their department
        const leadDeptId = userObj.department_id;
        notifs = notifs.filter(n => {
          // If it's their own notification, let them see it
          if (n.worker_id === worker_id) return true;
          
          // If it's a permission request notification
          if (n.permission_id) {
            const perm = db.permissions.find(p => p.id === n.permission_id && p.tenant_id === tenant_id);
            if (perm) {
              const requester = db.users.find(u => u.id === perm.worker_id && u.tenant_id === tenant_id);
              if (requester && requester.department_id === leadDeptId) {
                return true;
              }
            }
          }
          return false;
        });
      }
      // Admins see all notifications
    } else {
      notifs = notifs.filter(n => n.worker_id === worker_id);
    }
  }

  return res.json({ notifications: notifs });
});

app.post("/api/notifications/clear", (req, res) => {
  const { tenant_id, worker_id } = req.body;
  if (!tenant_id) return res.status(400).json({ error: "tenant_id required" });

  db = loadDB();
  if (worker_id) {
    db.notifications = db.notifications.filter(n => !(n.tenant_id === tenant_id && n.worker_id === worker_id));
  } else {
    db.notifications = db.notifications.filter(n => n.tenant_id !== tenant_id);
  }
  saveDB(db);
  return res.json({ success: true });
});

app.post("/api/notifications/mark-read", (req, res) => {
  const { tenant_id, notification_id } = req.body;
  if (!tenant_id || !notification_id) return res.status(400).json({ error: "Missing parameters" });

  db = loadDB();
  const idx = db.notifications.findIndex(n => n.id === notification_id && n.tenant_id === tenant_id);
  if (idx !== -1) {
    db.notifications[idx].read = true;
    saveDB(db);
  }
  return res.json({ success: true });
});

app.post("/api/notifications/mark-all-read", (req, res) => {
  const { tenant_id, worker_id } = req.body;
  if (!tenant_id) return res.status(400).json({ error: "tenant_id required" });

  db = loadDB();
  db.notifications.forEach(n => {
    if (n.tenant_id === tenant_id && (!worker_id || n.worker_id === worker_id)) {
      n.read = true;
    }
  });
  saveDB(db);
  return res.json({ success: true });
});

// SUBSCRIPTION MANAGEMENT (PAYMENT WEBHOOK SIMULATION)
app.post("/api/billing/subscribe", (req, res) => {
  const { tenant_id, planCode, paymentMethod } = req.body;
  if (!tenant_id || !planCode || !paymentMethod) {
    return res.status(400).json({ error: "Tenant, plan and verification required" });
  }

  db = loadDB();
  
  let price = 10000;
  if (planCode === SubscriptionPlanCode.BUSINESS) price = 30000;
  else if (planCode === SubscriptionPlanCode.GROWTH) price = 50000;
  else if (planCode === SubscriptionPlanCode.ENTERPRISE) price = 150000;

  // Set subscription active for 30 days
  const newSub: Subscription = {
    id: "sub-" + Math.random().toString(36).substring(2, 11),
    tenant_id,
    planCode,
    price,
    status: "active",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    paymentMethod,
    verified: true
  };

  // Remove existing subscriptions or mark them inactive/expired
  db.subscriptions = db.subscriptions.map(s => {
    if (s.tenant_id === tenant_id) {
      return { ...s, status: "expired" as const };
    }
    return s;
  });

  db.subscriptions.push(newSub);

  db.auditLogs.push({
    id: "log-" + Math.random().toString(36).substring(2, 11),
    tenant_id,
    user_id: "admin-user",
    action: "SUBSCRIPTION_RENEWAL",
    timestamp: new Date().toISOString(),
    details: `Successfully verified Opay/Paystack checkout for plan ${planCode}`
  });

  saveDB(db);

  broadcastToTenant(tenant_id, "SUBSCRIPTION_UPDATED", newSub);

  return res.json({ success: true, subscription: newSub });
});

// REPORT COMPILATION WORKERS (QUEUE & EXPORT LOGIC SIMULATION)
app.post("/api/reports/request", (req, res) => {
  const { tenant_id, type, format } = req.body; // type: attendance, permissions, workers; format: csv, pdf
  if (!tenant_id || !type || !format) {
    return res.status(400).json({ error: "Missing instructions for compiler job" });
  }

  db = loadDB();
  const job_id = "job-" + Math.random().toString(36).substring(2, 11);
  const newJob: ReportJob = {
    id: job_id,
    tenant_id,
    type,
    format,
    status: "queued",
    timestamp: new Date().toISOString()
  };

  db.reportJobs.push(newJob);
  saveDB(db);

  // Background worker delay simulation (4 seconds to compile)
  setTimeout(() => {
    const freshDb = loadDB();
    const jobIdx = freshDb.reportJobs.findIndex(j => j.id === job_id);
    if (jobIdx !== -1) {
      freshDb.reportJobs[jobIdx].status = "completed";
      freshDb.reportJobs[jobIdx].downloadUrl = `/api/reports/download/${job_id}`;
      
      // Add success notification
      const notif_id = "notif-" + Math.random().toString(36).substring(2, 11);
      freshDb.notifications.push({
        id: notif_id,
        tenant_id,
        title: "Report Job Compiled",
        message: `${type.toUpperCase()} list compiled successfully in ${format.toUpperCase()} format. Download now!`,
        timestamp: new Date().toISOString(),
        read: false
      });

      saveDB(freshDb);
      
      // Broadcast completeness alert
      broadcastToTenant(tenant_id, "REPORT_JOB_COMPLETED", freshDb.reportJobs[jobIdx]);
    }
  }, 4000);

  return res.json({ success: true, job: newJob });
});

app.get("/api/reports/jobs", (req, res) => {
  const tenant_id = req.query.tenant_id as string;
  if (!tenant_id) return res.status(400).json({ error: "tenant_id required" });

  db = loadDB();
  const jobs = db.reportJobs.filter(j => j.tenant_id === tenant_id);
  return res.json({ jobs });
});

// CSV and PDF dynamic generator simulation with proper response content-types
app.get("/api/reports/download/:job_id", (req, res) => {
  const { job_id } = req.params;
  db = loadDB();
  const job = db.reportJobs.find(j => j.id === job_id);
  if (!job) {
    return res.status(404).send("Report compile file expired or untraceable.");
  }

  const tenant = db.tenants.find(t => t.id === job.tenant_id);
  const companyName = tenant?.name || "CLOCK-IT PRO+";

  const todayStr = new Date().toISOString().split("T")[0];

  if (job.format === "csv") {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=ClockIt_${job.type}_${todayStr}.csv`);
    
    // Formulate real-looking CSV content based on report type
    let csvContent = "";
    if (job.type === "attendance") {
      csvContent = "S/N,Date,Worker,Time In,Arrival Status,Time Out,Departure Status,Covered Hours,Assigned Unit\n";
      const records = db.attendance.filter(a => a.tenant_id === job.tenant_id);
      records.forEach((r, idx) => {
        const worker = db.users.find(u => u.id === r.worker_id);
        const name = worker ? `${worker.firstName} ${worker.lastName}` : "Unknown";
        const dept = db.departments.find(d => d.id === r.department_id)?.name || "Unassigned";
        const hr = formatDurationHHMMSS(r.coveredTime);
        csvContent += `${idx + 1},${r.date},"${name}",${r.timeIn},${r.statusIn},${r.timeOut || "-"},${r.statusOut || "-"},${hr},"${dept}"\n`;
      });
    } else if (job.type === "permissions") {
      csvContent = "S/N,Worker Name,Assigned Unit,Reason,Start Date,End Date,Remarks,Status\n";
      const permits = db.permissions.filter(p => p.tenant_id === job.tenant_id);
      permits.forEach((p, idx) => {
        const worker = db.users.find(u => u.id === p.worker_id);
        const name = worker ? `${worker.firstName} ${worker.lastName}` : "Unknown";
        const dept = db.departments.find(d => d.id === worker?.department_id)?.name || "Unassigned";
        csvContent += `${idx + 1},"${name}","${dept}",${p.reason},${p.startDate},${p.endDate},"${p.remarks}",${p.status}\n`;
      });
    } else {
      // workers
      csvContent = "S/N,Worker Name,Phone,Email,Role,Assigned Unit,Status,Created At\n";
      const workers = db.users.filter(u => u.tenant_id === job.tenant_id);
      workers.forEach((w, idx) => {
        const dept = db.departments.find(d => d.id === w.department_id)?.name || "Unassigned";
        csvContent += `${idx + 1},"${w.firstName} ${w.lastName}",${w.phone},${w.email},${w.role},"${dept}",${w.status},${w.createdAt}\n`;
      });
    }
    
    return res.send(csvContent);
  } else {
    // Generate simulated elegant text-based HTML PDF representation
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", `attachment; filename=ClockIt_${job.type}_${todayStr}.pdf`);

    let htmlPDF = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; }
            h1 { font-family: 'Space Grotesk', 'Inter', sans-serif; color: #1a1a1a; margin-bottom: 5px; }
            .subtitle { font-size: 14px; color: #666; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f5f5f7; font-weight: bold; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; }
            .badge-present { background-color: #e6fcf5; color: #0ca678; }
            .badge-late { background-color: #fff4e6; color: #f76707; }
            .badge-absent { background-color: #fff5f5; color: #fa5252; }
            .badge-permission { background-color: #edf2ff; color: #4c6ef5; }
          </style>
        </head>
        <body>
          <h1>CLOCK-IT PRO+</h1>
          <div class="subtitle">Compiled Report: <strong>${job.type.toUpperCase()} EXPORT</strong> | Company: ${companyName} | Date Compiled: ${todayStr}</div>
          
          <table>
    `;

    if (job.type === "attendance") {
      htmlPDF += `
        <thead>
          <tr>
            <th>S/N</th>
            <th>Date</th>
            <th>Worker Name</th>
            <th>Checked In</th>
            <th>Status</th>
            <th>Checked Out</th>
            <th>Status Out</th>
            <th>Covered Hours</th>
            <th>Assigned Unit</th>
          </tr>
        </thead>
        <tbody>
      `;
      const records = db.attendance.filter(a => a.tenant_id === job.tenant_id);
      records.forEach((r, idx) => {
        const worker = db.users.find(u => u.id === r.worker_id);
        const name = worker ? `${worker.firstName} ${worker.lastName}` : "Unknown";
        const dept = db.departments.find(d => d.id === r.department_id)?.name || "Unassigned";
        const hr = formatDurationHHMMSS(r.coveredTime);
        htmlPDF += `
          <tr>
            <td>${idx + 1}</td>
            <td>${r.date}</td>
            <td><strong>${name}</strong></td>
            <td>${r.timeIn}</td>
            <td><span class="badge badge-${r.statusIn}">${r.statusIn.toUpperCase()}</span></td>
            <td>${r.timeOut || "Active Shift"}</td>
            <td>${r.statusOut || "Pending Check-out"}</td>
            <td>${hr}</td>
            <td>${dept}</td>
          </tr>
        `;
      });
    } else if (job.type === "permissions") {
      htmlPDF += `
        <thead>
          <tr>
            <th>S/N</th>
            <th>Worker Name</th>
            <th>Assigned Unit</th>
            <th>Reason</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Remarks</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
      `;
      const permits = db.permissions.filter(p => p.tenant_id === job.tenant_id);
      permits.forEach((p, idx) => {
        const worker = db.users.find(u => u.id === p.worker_id);
        const name = worker ? `${worker.firstName} ${worker.lastName}` : "Unknown";
        const dept = db.departments.find(d => d.id === worker?.department_id)?.name || "Unassigned";
        htmlPDF += `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${name}</strong></td>
            <td>${dept}</td>
            <td>${p.reason}</td>
            <td>${p.startDate}</td>
            <td>${p.endDate}</td>
            <td style="color:#666; font-style:italic;">"${p.remarks}"</td>
            <td><span class="badge badge-${p.status}">${p.status.toUpperCase()}</span></td>
          </tr>
        `;
      });
    } else {
      // workers
      htmlPDF += `
        <thead>
          <tr>
            <th>S/N</th>
            <th>Worker Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Role</th>
            <th>Assigned Unit</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
      `;
      const workers = db.users.filter(u => u.tenant_id === job.tenant_id);
      workers.forEach((w, idx) => {
        const dept = db.departments.find(d => d.id === w.department_id)?.name || "Unassigned";
        htmlPDF += `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${w.firstName} ${w.lastName}</strong></td>
            <td>${w.phone}</td>
            <td>${w.email}</td>
            <td>${w.role.toUpperCase()}</td>
            <td>${dept}</td>
            <td><span style="color:${w.status === 'active' ? '#0ca678' : '#fa5252'}" font-weight:bold;">${w.status.toUpperCase()}</span></td>
          </tr>
        `;
      });
    }

    htmlPDF += `
        </tbody>
      </table>
      <div style="margin-top:40px; text-align:center; font-size:10px; color:#999; border-top:1px solid #eee; padding-top:15px;">
        CLOCK-IT PRO+ Enterprise Security Verification &copy; 2026. This report was generated securely via certified tenant gateway web services.
      </div>
    </body>
    </html>
    `;

    return res.send(htmlPDF);
  }
});


// FRONTEND ASSET SERVING INTEGRATION (Dev: Vite, Prod: dist/static)
function runAutoCheckout() {
  try {
    const freshDb = loadDB();
    let updated = false;
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    freshDb.attendance.forEach((record: any) => {
      if (!record.timeOut) {
        // Find tenant settings
        const settings = freshDb.settings.find((s: any) => s.tenant_id === record.tenant_id);
        const overtimeEnabled = settings ? (settings.overtimeEnabled === true) : false;
        const overtimeHours = (overtimeEnabled && settings?.overtimeHours) ? Number(settings.overtimeHours) : 0;
        
        // Parse date to find day of week
        const dateParts = record.date.split("-").map(Number);
        if (dateParts.length === 3) {
          const recDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
          const dayName = daysOfWeek[recDate.getDay()];
          
          const closingTime = settings?.dailyShiftOutTimes?.[dayName] || settings?.checkOut?.time || "17:00";
          const [cH, cM] = closingTime.split(":").map(Number);
          const closingDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], cH || 17, cM || 0, 0);

          // If overtime is active and hours frame selected, count is sustained until closing time + overtime hours
          const cutoffDate = (overtimeEnabled && overtimeHours > 0)
            ? new Date(closingDate.getTime() + overtimeHours * 3600 * 1000)
            : closingDate;

          const isOvertimeLogout = overtimeEnabled && overtimeHours > 0;

          if (!isNaN(cutoffDate.getTime()) && Date.now() >= cutoffDate.getTime()) {
            const outH = String(cutoffDate.getHours()).padStart(2, "0");
            const outM = String(cutoffDate.getMinutes()).padStart(2, "0");
            const timeOutStr = `${outH}:${outM}:00`;

            record.timeOut = timeOutStr;
            record.statusOut = isOvertimeLogout ? "Overtime" : "Closing Time";

            // Calculate duration
            const [inH, inM, inS] = record.timeIn.split(":").map(Number);
            const totalInSecs = (inH || 0) * 3600 + (inM || 0) * 60 + (inS || 0);
            const closingSecs = (cH || 17) * 3600 + (cM || 0) * 60;
            const totalOutSecs = cutoffDate.getHours() * 3600 + cutoffDate.getMinutes() * 60;
            
            let durationSecs = 0;
            if (totalInSecs < closingSecs) {
              durationSecs = totalOutSecs - totalInSecs;
              if (durationSecs < 0) durationSecs += 86400;
            }
            record.coveredTime = Math.max(0, durationSecs);

            updated = true;

            const workerObj = freshDb.users.find((u: any) => u.id === record.worker_id && u.tenant_id === record.tenant_id);
            const wordName = workerObj ? `${workerObj.firstName} ${workerObj.lastName}` : "Someone";

            const notif_id = "notif-" + Math.random().toString(36).substring(2, 11);
            const notif = {
              id: notif_id,
              tenant_id: record.tenant_id,
              worker_id: record.worker_id,
              title: "Auto Check-Out Recorded",
              message: isOvertimeLogout
                ? `${wordName} was automatically logged out at end of shift overtime (${timeOutStr})`
                : `${wordName} was automatically logged out at closing time (${closingTime})`,
              timestamp: new Date().toISOString(),
              read: false
            };
            freshDb.notifications.push(notif);

            broadcastToTenant(record.tenant_id, "ATTENDANCE_UPDATED", {
              attendance: record,
              workerName: wordName,
              notification: notif,
              autoLoggedOutWorkerId: record.worker_id
            });
          }
        }
      }
    });

    if (updated) {
      saveDB(freshDb);
      db = freshDb; // Sync memory db
    }
  } catch (err) {
    console.error("Error running auto-checkout job:", err);
  }
}

// ---------------- APPLICATION CENTRAL ANNOUNCEMENTS ----------------

// Get announcements for a tenant
app.get("/api/tenant/announcements", (req, res) => {
  try {
    const tenant_id = (req.query.tenant_id as string) || "default-tenant";
    db.announcements = db.announcements || [];
    const tenantAnnouncements = db.announcements
      .filter((a) => a.tenant_id === tenant_id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const activeAnnouncement = tenantAnnouncements.find((a) => a.isActive) || null;
    res.json({
      success: true,
      announcements: tenantAnnouncements,
      activeAnnouncement
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create or update announcement
app.post("/api/tenant/announcements", (req, res) => {
  try {
    const {
      id,
      tenant_id = "default-tenant",
      type = "text",
      title,
      content,
      imageUrl,
      isActive = true,
      priority = "normal",
      enableRating = false,
      ratingPrompt = "How would you rate this announcement / initiative?",
      formFields = [],
      expiresAt
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: "Title is required" });
    }

    db.announcements = db.announcements || [];

    // If making this active, deactivate all existing announcements for this tenant
    if (isActive) {
      db.announcements.forEach((a) => {
        if (a.tenant_id === tenant_id) {
          a.isActive = false;
        }
      });
    }

    let announcement: CentralAnnouncement;
    const existingIndex = id ? db.announcements.findIndex((a) => a.id === id && a.tenant_id === tenant_id) : -1;

    if (existingIndex >= 0) {
      // Update existing
      announcement = {
        ...db.announcements[existingIndex],
        type,
        title,
        content: content || "",
        imageUrl: imageUrl || "",
        isActive,
        priority,
        enableRating,
        ratingPrompt,
        formFields,
        expiresAt,
        updatedAt: new Date().toISOString()
      };
      db.announcements[existingIndex] = announcement;
    } else {
      // Create new
      announcement = {
        id: "announcement-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
        tenant_id,
        type,
        title,
        content: content || "",
        imageUrl: imageUrl || "",
        isActive,
        priority,
        enableRating,
        ratingPrompt,
        formFields,
        feedbackSubmissions: [],
        acknowledgedWorkerIds: [],
        createdAt: new Date().toISOString()
      };
      db.announcements.unshift(announcement);
    }

    saveDB(db);

    // Real-time broadcast to all connected tenant workers & admins
    broadcastToTenant(tenant_id, "ANNOUNCEMENT_UPDATED", {
      announcement,
      activeAnnouncement: announcement.isActive ? announcement : null
    });

    res.json({
      success: true,
      announcement
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete announcement
app.delete("/api/tenant/announcements/:id", (req, res) => {
  try {
    const { id } = req.params;
    const tenant_id = (req.query.tenant_id as string) || "default-tenant";

    db.announcements = db.announcements || [];
    const index = db.announcements.findIndex((a) => a.id === id && a.tenant_id === tenant_id);

    if (index >= 0) {
      db.announcements.splice(index, 1);
      saveDB(db);

      const activeAnnouncement = db.announcements.find((a) => a.tenant_id === tenant_id && a.isActive) || null;
      broadcastToTenant(tenant_id, "ANNOUNCEMENT_UPDATED", {
        activeAnnouncement
      });
      return res.json({ success: true, message: "Announcement deleted" });
    }

    res.status(404).json({ success: false, error: "Announcement not found" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Worker response / rating / form submission
app.post("/api/tenant/announcements/:id/respond", (req, res) => {
  try {
    const { id } = req.params;
    const {
      tenant_id = "default-tenant",
      worker_id,
      worker_name = "Worker",
      worker_email,
      worker_department,
      rating,
      feedback,
      formAnswers = {}
    } = req.body;

    if (!worker_id) {
      return res.status(400).json({ success: false, error: "worker_id is required" });
    }

    db.announcements = db.announcements || [];
    const announcement = db.announcements.find((a) => a.id === id && a.tenant_id === tenant_id);

    if (!announcement) {
      return res.status(404).json({ success: false, error: "Announcement not found" });
    }

    announcement.feedbackSubmissions = announcement.feedbackSubmissions || [];
    announcement.acknowledgedWorkerIds = announcement.acknowledgedWorkerIds || [];

    // Check if worker already submitted, update or add
    const existingSubmissionIdx = announcement.feedbackSubmissions.findIndex((s) => s.worker_id === worker_id);
    const submission: AnnouncementFeedbackSubmission = {
      id: "resp-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      worker_id,
      worker_name,
      worker_email,
      worker_department,
      rating: typeof rating === "number" ? rating : undefined,
      feedback: feedback || "",
      formAnswers,
      submittedAt: new Date().toISOString()
    };

    if (existingSubmissionIdx >= 0) {
      announcement.feedbackSubmissions[existingSubmissionIdx] = submission;
    } else {
      announcement.feedbackSubmissions.push(submission);
    }

    if (!announcement.acknowledgedWorkerIds.includes(worker_id)) {
      announcement.acknowledgedWorkerIds.push(worker_id);
    }

    saveDB(db);

    broadcastToTenant(tenant_id, "ANNOUNCEMENT_FEEDBACK_RECEIVED", {
      announcement_id: id,
      submission,
      totalSubmissions: announcement.feedbackSubmissions.length
    });

    res.json({
      success: true,
      message: "Feedback submitted successfully",
      submission
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Worker simple acknowledgment
app.post("/api/tenant/announcements/:id/acknowledge", (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id = "default-tenant", worker_id } = req.body;

    if (!worker_id) {
      return res.status(400).json({ success: false, error: "worker_id is required" });
    }

    db.announcements = db.announcements || [];
    const announcement = db.announcements.find((a) => a.id === id && a.tenant_id === tenant_id);

    if (!announcement) {
      return res.status(404).json({ success: false, error: "Announcement not found" });
    }

    announcement.acknowledgedWorkerIds = announcement.acknowledgedWorkerIds || [];
    if (!announcement.acknowledgedWorkerIds.includes(worker_id)) {
      announcement.acknowledgedWorkerIds.push(worker_id);
      saveDB(db);
    }

    res.json({
      success: true,
      message: "Announcement acknowledged"
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle announcement active status
app.post("/api/tenant/announcements/:id/toggle-active", (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id = "default-tenant" } = req.body;

    db.announcements = db.announcements || [];
    const announcement = db.announcements.find((a) => a.id === id && a.tenant_id === tenant_id);

    if (!announcement) {
      return res.status(404).json({ success: false, error: "Announcement not found" });
    }

    const nextState = !announcement.isActive;
    if (nextState) {
      // Deactivate all others
      db.announcements.forEach((a) => {
        if (a.tenant_id === tenant_id) a.isActive = false;
      });
    }
    announcement.isActive = nextState;
    saveDB(db);

    broadcastToTenant(tenant_id, "ANNOUNCEMENT_UPDATED", {
      announcement,
      activeAnnouncement: nextState ? announcement : null
    });

    res.json({
      success: true,
      announcement
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// -------------------------------------------------------------
// PWA Infrastructure: Dynamic Web Manifest, Service Worker & Icons
// -------------------------------------------------------------

app.get("/sw.js", (req, res) => {
  const swPath = path.join(process.cwd(), "public", "sw.js");
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Service-Worker-Allowed", "/");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  if (fs.existsSync(swPath)) {
    res.sendFile(swPath);
  } else {
    res.send(`
      self.addEventListener('install', e => self.skipWaiting());
      self.addEventListener('activate', e => self.clients.claim());
      self.addEventListener('fetch', e => e.respondWith(fetch(e.request)));
    `);
  }
});

function generatePwaManifest(role: string = "guest", tenantName?: string, workerName?: string, theme: string = "dark") {
  const isAdmin = role === "admin";
  const isWorker = role === "worker";

  let name = "CLOCK-IT PRO+ | SaaS Workforce Management";
  let short_name = "CLOCK-IT";
  let start_url = "/";
  let description = "Enterprise Workforce Attendance & Shift Operations Management";
  let theme_color = "#06b6d4";
  const background_color = theme === "light" ? "#f8fafc" : theme === "army" ? "#141C10" : theme === "navy" ? "#0B132B" : "#0a0a0a";

  if (isAdmin) {
    name = tenantName ? `${tenantName} - Admin Portal` : "CLOCK-IT Admin Portal";
    short_name = tenantName ? `${tenantName.slice(0, 10)} Admin` : "Admin Portal";
    start_url = "/?pwa=admin";
    description = `Enterprise Admin Dashboard & Workforce Operations Terminal for ${tenantName || "Organization"}`;
    theme_color = "#06b6d4";
  } else if (isWorker) {
    name = tenantName ? `${tenantName} - Staff Workspace${workerName ? ` (${workerName})` : ""}` : "CLOCK-IT Staff Workspace";
    short_name = tenantName ? `${tenantName.slice(0, 10)} Staff` : "Staff Portal";
    start_url = "/?pwa=worker";
    description = `Worker Attendance Terminal, Shift Check-In & Permission Portal for ${workerName || "Staff"}`;
    theme_color = "#10b981";
  }

  return {
    name,
    short_name,
    description,
    start_url,
    scope: "/",
    display: "standalone",
    orientation: isWorker ? "portrait-primary" : "any",
    theme_color,
    background_color,
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: `/api/pwa-icon?role=${role}&size=192`,
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any maskable"
      },
      {
        src: `/api/pwa-icon?role=${role}&size=512`,
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any maskable"
      }
    ],
    shortcuts: isAdmin
      ? [
          {
            name: "Attendance Logs",
            short_name: "Logs",
            description: "View real-time attendance logs",
            url: "/?pwa=admin&tab=logs"
          },
          {
            name: "Shift Register",
            short_name: "Register",
            description: "View daily shift roster & roll calls",
            url: "/?pwa=admin&tab=register"
          },
          {
            name: "Terminal QR Code",
            short_name: "QR Code",
            description: "Display live check-in terminal QR code",
            url: "/?pwa=admin&action=qr"
          }
        ]
      : isWorker
      ? [
          {
            name: "Check In / Out",
            short_name: "Check-In",
            description: "Scan terminal QR code or submit attendance code",
            url: "/?pwa=worker&action=checkin"
          },
          {
            name: "My Shift History",
            short_name: "My Logs",
            description: "Inspect personal attendance records",
            url: "/?pwa=worker&tab=logs"
          },
          {
            name: "Request Permission",
            short_name: "Permission",
            description: "Submit leave / exemption request",
            url: "/?pwa=worker&action=permission"
          }
        ]
      : []
  };
}

app.get(["/manifest.webmanifest", "/manifest.json", "/api/manifest"], (req, res) => {
  const role = (req.query.role as string) || (req.query.pwa as string) || "guest";
  const tenantName = req.query.tenant as string;
  const workerName = req.query.worker as string;
  const theme = (req.query.theme as string) || "dark";

  const manifest = generatePwaManifest(role, tenantName, workerName, theme);
  res.setHeader("Content-Type", "application/manifest+json");
  res.setHeader("Cache-Control", "no-cache");
  res.json(manifest);
});

app.get("/api/pwa-icon", (req, res) => {
  const role = (req.query.role as string) || "guest";
  const size = parseInt((req.query.size as string) || "512", 10);
  const isAdmin = role === "admin";
  const isWorker = role === "worker";

  const primaryColor = isAdmin ? "#06b6d4" : isWorker ? "#10b981" : "#06b6d4";
  const secondaryColor = isAdmin ? "#3b82f6" : isWorker ? "#06b6d4" : "#3b82f6";
  const labelText = isAdmin ? "ADMIN" : isWorker ? "WORKER" : "CLOCK-IT";

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}" />
      <stop offset="100%" stop-color="${secondaryColor}" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.2)}" fill="url(#bgGrad)" />
  <rect width="${size - 16}" height="${size - 16}" x="8" y="8" rx="${Math.floor(size * 0.18)}" fill="none" stroke="${primaryColor}" stroke-opacity="0.3" stroke-width="6" />

  <circle cx="${size / 2}" cy="${size * 0.44}" r="${size * 0.28}" fill="none" stroke="url(#primaryGrad)" stroke-width="12" filter="url(#glow)" opacity="0.4" />
  <circle cx="${size / 2}" cy="${size * 0.44}" r="${size * 0.28}" fill="none" stroke="url(#primaryGrad)" stroke-width="10" />

  ${
    isAdmin
      ? `
  <path d="M ${size * 0.5} ${size * 0.22} L ${size * 0.68} ${size * 0.3} L ${size * 0.68} ${size * 0.46} C ${size * 0.68} ${size * 0.6} ${size * 0.5} ${size * 0.66} ${size * 0.5} ${size * 0.66} C ${size * 0.5} ${size * 0.66} ${size * 0.32} ${size * 0.6} ${size * 0.32} ${size * 0.46} L ${size * 0.32} ${size * 0.3} Z" fill="url(#primaryGrad)" opacity="0.2" />
  <path d="M ${size * 0.5} ${size * 0.24} L ${size * 0.66} ${size * 0.31} L ${size * 0.66} ${size * 0.45} C ${size * 0.66} ${size * 0.58} ${size * 0.5} ${size * 0.64} ${size * 0.5} ${size * 0.64} C ${size * 0.5} ${size * 0.64} ${size * 0.34} ${size * 0.58} ${size * 0.34} ${size * 0.45} L ${size * 0.34} ${size * 0.31} Z" fill="none" stroke="url(#primaryGrad)" stroke-width="12" stroke-linejoin="round" />
  <circle cx="${size * 0.5}" cy="${size * 0.44}" r="${size * 0.08}" fill="url(#primaryGrad)" />
  `
      : isWorker
      ? `
  <circle cx="${size * 0.5}" cy="${size * 0.38}" r="${size * 0.09}" fill="url(#primaryGrad)" />
  <path d="M ${size * 0.34} ${size * 0.58} C ${size * 0.34} ${size * 0.48} ${size * 0.66} ${size * 0.48} ${size * 0.66} ${size * 0.58}" fill="none" stroke="url(#primaryGrad)" stroke-width="14" stroke-linecap="round" />
  <circle cx="${size * 0.5}" cy="${size * 0.44}" r="${size * 0.22}" fill="none" stroke="url(#primaryGrad)" stroke-width="6" stroke-dasharray="10 14" opacity="0.6" />
  <path d="M ${size * 0.5} ${size * 0.32} L ${size * 0.5} ${size * 0.44} L ${size * 0.58} ${size * 0.44}" fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round" />
  `
      : `
  <circle cx="${size * 0.5}" cy="${size * 0.44}" r="${size * 0.22}" fill="none" stroke="url(#primaryGrad)" stroke-width="12" />
  <path d="M ${size * 0.3} ${size * 0.44} L ${size * 0.5} ${size * 0.44} L ${size * 0.5} ${size * 0.3}" fill="none" stroke="url(#primaryGrad)" stroke-width="12" stroke-linecap="round" />
  `
  }

  <rect x="${size * 0.18}" y="${size * 0.78}" width="${size * 0.64}" height="${size * 0.13}" rx="${size * 0.065}" fill="url(#primaryGrad)" />
  <text x="${size * 0.5}" y="${size * 0.865}" font-family="system-ui, -apple-system, sans-serif" font-size="${size * 0.055}" font-weight="900" fill="#000000" text-anchor="middle" letter-spacing="4">${labelText}</text>
</svg>
  `.trim();

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(svg);
});

async function startServer() {
  // Start the background checkout monitor
  setInterval(() => {
    try {
      runAutoCheckout();
    } catch (e) {
      console.warn("Background auto checkout exception:", e);
    }
  }, 10000);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR === 'true' ? false : undefined },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CLOCK-IT PRO+ SaaS server initialized on http://localhost:${PORT}`);
  });
}

startServer();
