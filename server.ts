/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
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
  VisitorLog
} from "./src/types.js";

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
        a.coveredTime = Math.max(0, totalOutSecs - totalInSecs);
        
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
    visitorLogs: []
  };
}

// Ensure database file loaded
let db = loadDB();

// ---------------- SERVER ENDPOINTS ----------------

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
  let paymentMethod: "opay" | "paystack" | "manual" | "admin_authorization" = "manual";

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

// SETTINGS & WORK DAYS
app.post("/api/tenant/settings/save", (req, res) => {
  const { tenant_id, theme, language, activityDays, checkIn, checkOut, overtimeHours, overtimeEnabled, onlyShowTimeIn, selectedIntervalDays, dailyShiftTimes, dailyShiftOutTimes, companyLogoUrl } = req.body;
  if (!tenant_id) return res.status(400).json({ error: "tenant_id required" });

  db = loadDB();
  const idx = db.settings.findIndex(s => s.tenant_id === tenant_id);
  const updatedSettings: TenantSettings = {
    tenant_id,
    theme: theme || "light",
    language: language || "en",
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
  const { tenant_id, worker_id, firstName, lastName, email, phone, role, department_id, status, gender, activityDays } = req.body;
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
  if (activityDays !== undefined) existing.activityDays = activityDays;

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

  db.attendance[attIdx].timeOut = timeOutStr;
  db.attendance[attIdx].statusOut = "Normal Checkout";

  // Calculate duration
  const [inH, inM, inS] = db.attendance[attIdx].timeIn.split(":").map(Number);
  const [outH, outM, outS] = timeOutStr.split(":").map(Number);
  const totalInSecs = inH * 3600 + inM * 60 + inS;
  const totalOutSecs = outH * 3600 + outM * 60 + outS;
  
  db.attendance[attIdx].coveredTime = Math.max(0, totalOutSecs - totalInSecs);

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
        const hr = r.coveredTime ? (r.coveredTime / 3600).toFixed(2) : "0.00";
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
        const hr = r.coveredTime ? (r.coveredTime / 3600).toFixed(2) : "0.00";
        htmlPDF += `
          <tr>
            <td>${idx + 1}</td>
            <td>${r.date}</td>
            <td><strong>${name}</strong></td>
            <td>${r.timeIn}</td>
            <td><span class="badge badge-${r.statusIn}">${r.statusIn.toUpperCase()}</span></td>
            <td>${r.timeOut || "Active Shift"}</td>
            <td>${r.statusOut || "Pending Check-out"}</td>
            <td>${hr} hrs</td>
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
        
        if (!overtimeEnabled) {
          // Parse date to find day of week
          const dateParts = record.date.split("-").map(Number);
          if (dateParts.length === 3) {
            const recDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            const dayName = daysOfWeek[recDate.getDay()];
            
            const closingTime = settings?.dailyShiftOutTimes?.[dayName] || settings?.checkOut?.time || "17:00";
            
            // Construct full checkout timestamp
            const checkoutTargetStr = `${record.date}T${closingTime}:00`;
            const checkoutTimeMs = new Date(checkoutTargetStr).getTime();
            
            if (!isNaN(checkoutTimeMs) && Date.now() >= checkoutTimeMs) {
              // Perform auto-checkout
              const timeOutStr = `${closingTime}:00`;
              record.timeOut = timeOutStr;
              record.statusOut = "Auto Checkout";
              
              // Calculate duration
              const [inH, inM, inS] = record.timeIn.split(":").map(Number);
              const [outH, outM, outS] = timeOutStr.split(":").map(Number);
              const totalInSecs = inH * 3600 + (inM || 0) * 60 + (inS || 0);
              const totalOutSecs = outH * 3600 + (outM || 0) * 60 + (outS || 0);
              record.coveredTime = Math.max(0, totalOutSecs - totalInSecs);
              
              updated = true;
              
              // Broadcast update
              const workerObj = freshDb.users.find((u: any) => u.id === record.worker_id && u.tenant_id === record.tenant_id);
              const wordName = workerObj ? `${workerObj.firstName} ${workerObj.lastName}` : "Someone";
              
              const notif_id = "notif-" + Math.random().toString(36).substring(2, 11);
              const notif = {
                id: notif_id,
                tenant_id: record.tenant_id,
                worker_id: record.worker_id,
                title: "Auto Check-Out Recorded",
                message: `${wordName} was automatically checked out at closing time (${closingTime})`,
                timestamp: new Date().toISOString(),
                read: false
              };
              freshDb.notifications.push(notif);
              
              broadcastToTenant(record.tenant_id, "ATTENDANCE_UPDATED", {
                attendance: record,
                workerName: wordName,
                notification: notif
              });
            }
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
      server: { middlewareMode: true },
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
