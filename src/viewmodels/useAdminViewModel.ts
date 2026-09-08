/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { AttendanceStatus, PermissionStatus, UserRole } from "../types.js";

const compressImage = (file: File, maxWidth: number = 200, maxHeight: number = 200): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.73));
        } else {
          resolve(e.target?.result as string || "");
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

interface UseAdminViewModelProps {
  user: any;
  tenant: any;
  initialSub: any;
  initialSettings: any;
  translations: any;
  onNotifyAdmin: (title: string, msg: string) => void;
  onSettingsChange?: (newSettings: any) => void;
  onSubscriptionChange?: (newSubscription: any) => void;
  onTenantChange?: (newTenant: any) => void;
}

export function useAdminViewModel({
  user,
  tenant,
  initialSub,
  initialSettings,
  translations,
  onNotifyAdmin,
  onSettingsChange,
  onSubscriptionChange,
  onTenantChange
}: UseAdminViewModelProps) {
  // Main UI Tabs
  const [activeTab, setActiveTab] = useState<"attendance" | "analytics" | "permissions" | "profiles" | "billing">("attendance");
  
  // Real-time Database arrays - initialized from local storage cache for instant offline viewing
  const [workers, setWorkers] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem(`cached_admin_workers_${tenant.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem(`cached_admin_attendance_${tenant.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [permissions, setPermissions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem(`cached_admin_depts_${tenant.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [leadHistory, setLeadHistory] = useState<any[]>([]);
  const [settings, setSettings] = useState(initialSettings);
  const [subscription, setSubscription] = useState(initialSub);
  const [jobs, setJobs] = useState<any[]>([]);
  const [visitorLogs, setVisitorLogs] = useState<any[]>([]);

  // Modals & Menu triggers
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [activeLeaderModal, setActiveLeaderModal] = useState<any | null>(null);
  const [isDeptManagementExpanded, setIsDeptManagementExpanded] = useState(false);
  const [adminPhotoUrl, setAdminPhotoUrl] = useState(() => {
    return localStorage.getItem(`admin_dp_${user.id}`) || user.profilePhoto?.medium || "";
  });
  const adminFileInputRef = useRef<HTMLInputElement>(null);

  const handleAdminDpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file, 200, 200);
        setAdminPhotoUrl(compressedBase64);
        localStorage.setItem(`admin_dp_${user.id}`, compressedBase64);
        
        // Also update the company logo with the exact same file
        setCompanyLogoUrl(compressedBase64);
        localStorage.setItem(`company_logo_${tenant.id}`, compressedBase64);
        
        onNotifyAdmin("Profile Picture & Logo Synchronized", "Your custom identity and company logo are now matched.");

        // Persist to server
        await handleSaveSettings({
          ...settings,
          companyLogoUrl: compressedBase64
        });
      } catch (err) {
        console.error("Image compression error:", err);
      }
    }
  };

  const handleAdminDpDelete = async () => {
    setAdminPhotoUrl("");
    localStorage.removeItem(`admin_dp_${user.id}`);
    setCompanyLogoUrl("");
    localStorage.removeItem(`company_logo_${tenant.id}`);
    onNotifyAdmin("Profile Image & Logo Reset", "Reverted identity and shield emblem assets.");

    // Persist to server
    await handleSaveSettings({
      ...settings,
      companyLogoUrl: ""
    });
  };

  const [companyLogoUrl, setCompanyLogoUrl] = useState(() => {
    return initialSettings?.companyLogoUrl || localStorage.getItem(`company_logo_${tenant.id}`) || "";
  });
  const companyLogoFileInputRef = useRef<HTMLInputElement>(null);

  const handleCompanyLogoUpload = async (file: File) => {
    if (file) {
      try {
        const compressedBase64 = await compressImage(file, 200, 200);
        setCompanyLogoUrl(compressedBase64);
        localStorage.setItem(`company_logo_${tenant.id}`, compressedBase64);
        onNotifyAdmin("Company Logo Synchronized", "Your official corporate asset is now active.");

        // Persist to server
        await handleSaveSettings({
          ...settings,
          companyLogoUrl: compressedBase64
        });
      } catch (err) {
        console.error("Logo compression error:", err);
      }
    }
  };

  const handleCompanyLogoDelete = async () => {
    setCompanyLogoUrl("");
    localStorage.removeItem(`company_logo_${tenant.id}`);
    onNotifyAdmin("Company Logo Reset", "Reverted to default shield emblem visual.");

    // Persist to server
    await handleSaveSettings({
      ...settings,
      companyLogoUrl: ""
    });
  };

  // Department CRUD states
  const [newDeptName, setNewDeptName] = useState("");
  const [renamingDeptId, setRenamingDeptId] = useState("");
  const [renamingDeptName, setRenamingDeptName] = useState("");
  const [confirmDeleteDeptId, setConfirmDeleteDeptId] = useState("");

  // Filters State
  const [filterName, setFilterName] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStatusOut, setFilterStatusOut] = useState("all");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");

  // Billing simulation states
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>("");
  const [gatewaySelected, setGatewaySelected] = useState<"opay" | "paystack" | null>(null);
  const [billingProgress, setBillingProgress] = useState<string | null>(null);

  // Background Job report tracker
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);

  // Dynamic QR Code generation state
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  // Admin notifications state
  const [notifications, setNotifications] = useState<any[]>([]);

  const handleMarkNotifRead = async (id: string) => {
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenant.id, notification_id: id })
    });
    syncAdminResources();
  };

  const handleMarkAllNotifsRead = async () => {
    await fetch("/api/notifications/mark-all-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenant.id })
    });
    syncAdminResources();
  };

  const handleClearNotifs = async () => {
    await fetch("/api/notifications/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenant.id })
    });
    syncAdminResources();
  };

  useEffect(() => {
    if (showQrModal) {
      const qrPayload = `${window.location.origin}/?action=check-in&tenant_id=${tenant.id}`;
      
      QRCode.toDataURL(
        qrPayload, 
        { 
          width: 320, 
          margin: 2, 
          color: {
            dark: "#0a0a0a",
            light: "#ffffff"
          }
        }, 
        (err, url) => {
          if (!err) {
            setQrDataUrl(url);
          } else {
            console.error("QR Code generation error", err);
          }
        }
      );
    }
  }, [showQrModal, tenant.id, tenant.name]);

  // Synchronize database records from Express API
  const syncAdminResources = async () => {
    try {
      const resW = await fetch(`/api/tenant/workers?tenant_id=${tenant.id}`);
      const dataW = await resW.json();
      if (resW.ok && Array.isArray(dataW.workers)) {
        setWorkers(dataW.workers);
        try {
          localStorage.setItem(`cached_admin_workers_${tenant.id}`, JSON.stringify(dataW.workers));
        } catch (e) {}
      }

      const resAtt = await fetch(`/api/attendance/records?tenant_id=${tenant.id}`);
      const dataAtt = await resAtt.json();
      if (resAtt.ok && Array.isArray(dataAtt.records)) {
        setAttendanceRecords(dataAtt.records);
        try {
          localStorage.setItem(`cached_admin_attendance_${tenant.id}`, JSON.stringify(dataAtt.records));
        } catch (e) {}
      }

      const resPerm = await fetch(`/api/permissions?tenant_id=${tenant.id}`);
      const dataPerm = await resPerm.json();
      if (resPerm.ok) setPermissions(dataPerm.permissions);

      const resDepts = await fetch(`/api/tenant/departments?tenant_id=${tenant.id}`);
      const dataDepts = await resDepts.json();
      if (resDepts.ok) {
        const sortedDepts = (dataDepts.depts || []).sort((a: any, b: any) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        );
        setDepartments(sortedDepts);
        setLeadHistory(dataDepts.leadHistory);
        try {
          localStorage.setItem(`cached_admin_depts_${tenant.id}`, JSON.stringify(sortedDepts));
        } catch (e) {}
      }

      const resJobs = await fetch(`/api/reports/jobs?tenant_id=${tenant.id}`);
      const dataJobs = await resJobs.json();
      if (resJobs.ok) setJobs(dataJobs.jobs);

      const resV = await fetch(`/api/visitor/logs?tenant_id=${tenant.id}`);
      const dataV = await resV.json();
      if (resV.ok) setVisitorLogs(dataV.logs || []);

      const resNotifs = await fetch(`/api/notifications?tenant_id=${tenant.id}`);
      const dataNotifs = await resNotifs.json();
      if (resNotifs.ok) {
        setNotifications(dataNotifs.notifications || dataNotifs || []);
      }
    } catch (e) {
      console.warn("Express synchronization anomaly (restoring cached data if available):", e);
      try {
        const cachedAtt = localStorage.getItem(`cached_admin_attendance_${tenant.id}`);
        if (cachedAtt) {
          const parsed = JSON.parse(cachedAtt);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAttendanceRecords(parsed);
          }
        }
      } catch (err) {}
    }
  };

  useEffect(() => {
    if (activeLeaderModal) {
      const fresh = workers.find((w: any) => w.id === activeLeaderModal.id);
      if (fresh) {
        setActiveLeaderModal(fresh);
      }
    }
  }, [workers]);

  useEffect(() => {
    syncAdminResources();

    // 3-second interval polling fallback for instant data synchronization across tabs
    const pollInterval = setInterval(() => {
      syncAdminResources();
    }, 3000);

    // SSE connection for immediate real-time dashboard refresh
    const eventSource = new EventSource(`/api/events/subscribe?tenant_id=${tenant.id}`);
    
    eventSource.addEventListener("USER_SIGNED_IN", (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.user?.role !== UserRole.COMPANY_ADMIN) {
          onNotifyAdmin("User Signed In", `${payload.user.firstName} ${payload.user.lastName} signed in to the portal.`);
        }
      } catch (err) {
        console.warn("Error parsing USER_SIGNED_IN event:", err);
      }
      syncAdminResources();
    });

    eventSource.addEventListener("ATTENDANCE_CREATED", (e: any) => {
      const payload = JSON.parse(e.data);
      onNotifyAdmin(payload.notification.title, payload.notification.message);
      syncAdminResources();
    });

    eventSource.addEventListener("ATTENDANCE_UPDATED", (e: any) => {
      const payload = JSON.parse(e.data);
      onNotifyAdmin(payload.notification.title, payload.notification.message);
      syncAdminResources();
    });

    eventSource.addEventListener("ATTENDANCE_DELETED", (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.notification) {
          onNotifyAdmin(payload.notification.title, payload.notification.message);
        }
      } catch (err) {}
      syncAdminResources();
    });

    eventSource.addEventListener("PERMISSION_REQUESTED", (e: any) => {
      const payload = JSON.parse(e.data);
      onNotifyAdmin(payload.notification.title, payload.notification.message);
      syncAdminResources();
    });

    eventSource.addEventListener("PERMISSION_EVALUATED", (e: any) => {
      syncAdminResources();
    });

    eventSource.addEventListener("WORKER_REGISTERED", (e: any) => {
      const payload = JSON.parse(e.data);
      onNotifyAdmin(payload.notification.title, payload.notification.message);
      syncAdminResources();
    });

    eventSource.addEventListener("PROFILE_SYNCED", (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        let workerName = "A team member";
        setWorkers((prev) => {
          const match = prev.find((w) => w.id === payload.worker_id);
          if (match) {
            workerName = `${match.firstName} ${match.lastName}`;
          }
          return prev.map((w) =>
            w.id === payload.worker_id
              ? { ...w, profilePhoto: payload.profilePhotos }
              : w
          );
        });

        if (user.id === payload.worker_id) {
          setAdminPhotoUrl(payload.profilePhotos?.medium || "");
          localStorage.setItem(`admin_dp_${user.id}`, payload.profilePhotos?.medium || "");
        }

        onNotifyAdmin(
          "Profile Picture Updated",
          `${workerName} updated their profile picture.`
        );
        syncAdminResources();
      } catch (err) {
        console.warn("Error parsing PROFILE_SYNCED event in admin:", err);
      }
    });

    eventSource.addEventListener("REPORT_JOB_COMPLETED", (e: any) => {
      const payload = JSON.parse(e.data);
      onNotifyAdmin("Report Ready", `Download available for compiled ${payload.type} list`);
      syncAdminResources();
    });

    eventSource.addEventListener("SUBSCRIPTION_UPDATED", (e: any) => {
      const updatedSub = JSON.parse(e.data);
      setSubscription(updatedSub);
      if (onSubscriptionChange) {
        onSubscriptionChange(updatedSub);
      }
      syncAdminResources();
    });

    eventSource.addEventListener("VISITOR_UPDATED", (e: any) => {
      const payload = JSON.parse(e.data);
      onNotifyAdmin("Visitor Checked In", `Guest ${payload.visitor.name} (${payload.visitor.company}) arrived at reception desk.`);
      syncAdminResources();
    });

    eventSource.addEventListener("WORKERS_UPDATED", (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.action === "update" && payload.worker) {
          setWorkers((prev) =>
            prev.map((w) => (w.id === payload.worker.id ? payload.worker : w))
          );
        } else if (payload.action === "add" && payload.worker) {
          setWorkers((prev) => [...prev.filter((w) => w.id !== payload.worker.id), payload.worker]);
        }
      } catch (err) {
        console.warn("Error parsing WORKERS_UPDATED event in admin:", err);
      }
      syncAdminResources();
    });

    eventSource.addEventListener("SETTINGS_SAVED", (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        setSettings(payload);
        if (onSettingsChange) {
          onSettingsChange(payload);
        }
        if (payload.companyLogoUrl !== undefined) {
          setCompanyLogoUrl(payload.companyLogoUrl);
        }
      } catch (err) {
        console.warn("Error parsing SETTINGS_SAVED event on admin side:", err);
      }
    });

    eventSource.addEventListener("TENANT_UPDATED", (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload) {
          if (onTenantChange) {
            onTenantChange(payload);
          }
          try {
            const saved = localStorage.getItem("clock_it_session");
            if (saved) {
              const parsed = JSON.parse(saved);
              parsed.tenant = { ...parsed.tenant, ...payload };
              localStorage.setItem("clock_it_session", JSON.stringify(parsed));
            }
          } catch (e) {}
        }
      } catch (err) {
        console.warn("Error parsing TENANT_UPDATED event on admin side:", err);
      }
    });

    return () => {
      clearInterval(pollInterval);
      eventSource.close();
    };
  }, [tenant.id]);

  // Settings persistent save
  const handleSaveSettings = async (overrideSettingsObj?: any) => {
    const sObj = {
      ...(overrideSettingsObj || settings),
      tenant_id: tenant.id
    };
    try {
      const response = await fetch("/api/tenant/settings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sObj)
      });
      if (response.ok) {
        const data = await response.json();
        
        // Detect exact changes made to the settings menu
        const changes: string[] = [];
        if (sObj.language !== settings.language) changes.push(`Language`);
        if (sObj.theme !== settings.theme) changes.push(`Theme`);
        if (sObj.checkIn?.time !== settings.checkIn?.time || sObj.checkIn?.latenessThreshold !== settings.checkIn?.latenessThreshold) {
          changes.push(`Check-In`);
        }
        if (sObj.checkOut?.time !== settings.checkOut?.time) {
          changes.push(`Check-Out`);
        }
        if (sObj.overtimeEnabled !== settings.overtimeEnabled || sObj.overtimeHours !== settings.overtimeHours) {
          changes.push(`Overtime`);
        }
        if (sObj.onlyShowTimeIn !== settings.onlyShowTimeIn) {
          changes.push(`Display`);
        }

        const detailsText = changes.length > 0 
          ? `Updated: ${changes.join(", ")}` 
          : "Enterprise shift policies synchronized globally";

        setSettings(data.settings);
        if (onSettingsChange) {
          onSettingsChange(data.settings);
        }
        // Dispatch instant alert
        onNotifyAdmin("Settings Preserved", detailsText);
      }
    } catch (e) {
      alert("Settings offline saving failure");
    }
  };

  // Department CRUD executions with confirmation modals
  const handleAddDept = async () => {
    if (!newDeptName) return;
    const exists = departments.some(d => d.name.trim().toLowerCase() === newDeptName.trim().toLowerCase());
    if (exists) {
      onNotifyAdmin("Validation Alert", translations.deptExists || "Department already exists");
      return;
    }
    try {
      const response = await fetch("/api/tenant/departments/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenant.id, name: newDeptName })
      });
      if (response.ok) {
        setNewDeptName("");
         syncAdminResources();
      }
    } catch (e) {
      alert("Local DB channel obstructed.");
    }
  };

  const handleRenameDept = async () => {
    if (!renamingDeptName || !renamingDeptId) return;
    const exists = departments.some(d => d.id !== renamingDeptId && d.name.trim().toLowerCase() === renamingDeptName.trim().toLowerCase());
    if (exists) {
      onNotifyAdmin("Validation Alert", translations.deptExists || "Department already exists");
      return;
    }
    try {
      const response = await fetch("/api/tenant/departments/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenant.id,
          department_id: renamingDeptId,
          name: renamingDeptName
        })
      });
      if (response.ok) {
        setRenamingDeptId("");
        setRenamingDeptName("");
        syncAdminResources();
      }
    } catch (e) {
      alert("Obstructed rename.");
    }
  };

  const handleDeleteDept = async () => {
    if (!confirmDeleteDeptId) return;
    try {
      const response = await fetch("/api/tenant/departments/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenant.id,
          department_id: confirmDeleteDeptId
         })
      });
      if (response.ok) {
        setConfirmDeleteDeptId("");
        syncAdminResources();
      }
    } catch (e) {
      alert("Obstructed delete.");
    }
  };

  // Assign Team Lead
  const handleAssignLead = async (deptId: string, leadWorkerIdToAssign: string) => {
    try {
      const response = await fetch("/api/tenant/departments/assign-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenant.id,
          department_id: deptId,
          worker_id: leadWorkerIdToAssign,
          appointed_by: user.id
        })
      });
      if (response.ok) {
        syncAdminResources();
      }
    } catch (e) {
      alert("Lead assignment failed");
    }
  };

  // Assign Worker to Department
  const handleAssignWorkerToDept = async (workerId: string, deptId: string) => {
    try {
      const response = await fetch("/api/tenant/workers/assign-department", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenant.id,
          worker_ids: [workerId],
          department_id: deptId
        })
      });
      if (response.ok) {
        syncAdminResources();
        onNotifyAdmin("Worker Assigned", "The worker has been assigned to the department successfully.");
      } else {
        alert("Worker assignment failed");
      }
    } catch (e) {
      alert("Worker assignment error");
    }
  };

  // Evaluate Permission Request
  const handleEvaluatePermission = async (permId: string, decisionStatus: PermissionStatus) => {
    try {
      const response = await fetch("/api/permissions/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenant.id,
          permission_id: permId,
          status: decisionStatus
        })
      });
      if (response.ok) {
        syncAdminResources();
      }
    } catch (e) {
      alert("Evaluating failure");
    }
  };

  // Report background compiler trigger
  const requestReportCompile = async (type: "attendance" | "permissions" | "workers", format: "csv" | "pdf") => {
    setReportFeedback(translations.queuedExport);
    setTimeout(() => setReportFeedback(null), 4000);

    try {
      const response = await fetch("/api/reports/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenant.id, type, format })
      });
      if (response.ok) {
        syncAdminResources();
      }
    } catch (e) {
      alert("Compile job dispatch failure");
    }
  };

  // Billing webhook triggers simulation
  const handleBillingRenewalSubmit = async () => {
    if (!gatewaySelected) return;
    setBillingProgress(translations.verifyingPayment);

    setTimeout(async () => {
      try {
        const response = await fetch("/api/billing/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_id: tenant.id,
            planCode: selectedPlanCode,
            paymentMethod: gatewaySelected
          })
        });
        if (response.ok) {
          const resJson = await response.json();
          if (resJson && resJson.subscription) {
            setSubscription(resJson.subscription);
            if (onSubscriptionChange) {
              onSubscriptionChange(resJson.subscription);
            }
          }
          setBillingProgress(translations.activeSubText);
          setTimeout(() => {
            setBillingProgress(null);
            setGatewaySelected(null);
          }, 2000);
        }
      } catch (err) {
        setBillingProgress("Gateway Verification Misaligned.");
      }
    }, 2500);
  };

  // Formatting large values
  const formatCompact = (val: number) => {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + "M";
    if (val >= 1000) return (val / 1000).toFixed(1) + "K";
    return val.toString();
  };

  const filterAttendanceLogs = () => {
    let result = [...attendanceRecords];

    if (filterName) {
      result = result.filter(r => {
        const targetWorker = workers.find(w => w.id === r.worker_id);
        const fullName = targetWorker ? `${targetWorker.firstName} ${targetWorker.lastName}`.toLowerCase() : "";
        return fullName.includes(filterName.toLowerCase());
      });
    }

    if (filterDept !== "all") {
      result = result.filter(r => r.department_id === filterDept);
    }

    if (filterStatus !== "all") {
      result = result.filter(r => r.statusIn === filterStatus);
    }

    if (filterStatusOut !== "all" && filterStatusOut) {
      result = result.filter(r => {
        if (!r.statusOut) return false;
        if (filterStatusOut === "Normal Checkout") {
          return r.statusOut === "Normal Checkout" || r.statusOut === "Normal";
        }
        if (filterStatusOut === "Closing Time") {
          return r.statusOut === "Closing Time" || r.statusOut === "Auto Checkout" || r.statusOut.includes("Closing Time");
        }
        if (filterStatusOut === "Early Departure") {
          return r.statusOut.toLowerCase().includes("early");
        }
        if (filterStatusOut === "Overtime") {
          return r.statusOut.toLowerCase().includes("overtime");
        }
        return r.statusOut.toLowerCase() === filterStatusOut.toLowerCase();
      });
    }

    if (filterDateStart) {
      result = result.filter(r => r.date >= filterDateStart);
    }

    if (filterDateEnd) {
      result = result.filter(r => r.date <= filterDateEnd);
    }

    return result.sort((a,b) => b.date.localeCompare(a.date) || b.timeIn.localeCompare(a.timeIn));
  };

  const calculateWorkerAttendanceMetrics = (workerId: string) => {
    const individualAtt = attendanceRecords.filter(a => a.worker_id === workerId);
    const presentCount = individualAtt.filter(a => a.statusIn === AttendanceStatus.PRESENT || a.statusIn === "present" || a.statusIn === AttendanceStatus.LATE || a.statusIn === "late").length;
    const lateCount = individualAtt.filter(a => a.statusIn === AttendanceStatus.LATE || a.statusIn === "late").length;

    const individualExempts = permissions.filter(p => p.worker_id === workerId && p.status === PermissionStatus.APPROVED);
    
    let totalExemptDays = 0;
    individualExempts.forEach(p => {
      const diffTime = Math.abs(new Date(p.endDate).getTime() - new Date(p.startDate).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      totalExemptDays += diffDays;
    });

    const eligibleDays = 20; 
    const finalEligibleDays = Math.max(1, eligibleDays - totalExemptDays);

    const perfRatio = Number(Math.min(100, (presentCount / finalEligibleDays) * 100).toFixed(2));

    return {
      present: presentCount,
      late: lateCount,
      exempt: totalExemptDays,
      perf: perfRatio
    };
  };

  const getLeaderboardRanks = () => {
    const list = workers
      .filter(w => w.role !== UserRole.COMPANY_ADMIN)
      .map(w => {
        const stats = calculateWorkerAttendanceMetrics(w.id);
        const deptLabel = departments.find(d => d.id === w.department_id)?.name || "Unassigned";
        return {
          ...w,
          deptLabel,
          perf: stats.perf,
          present: stats.present,
          late: stats.late
        };
      });
    return list.sort((a,b) => b.perf - a.perf);
  };

  const computeDepartmentAverages = () => {
    return departments.map(d => {
      const unitWorkers = workers.filter(w => w.department_id === d.id);
      if (unitWorkers.length === 0) return { ...d, avg: 0 };
      const sum = unitWorkers.reduce((acc, curr) => {
        return acc + calculateWorkerAttendanceMetrics(curr.id).perf;
      }, 0);
      const avg = Number((sum / unitWorkers.length).toFixed(2));
      return {
        ...d,
        avg
      };
    });
  };

  const filteredLogsList = filterAttendanceLogs();
  const rankedLeaderboard = getLeaderboardRanks();
  const departmentAverages = computeDepartmentAverages();
  const isDark = settings.theme === "dark" || settings.theme === "army" || settings.theme === "navy";

  return {
    activeTab,
    setActiveTab,
    workers,
    setWorkers,
    attendanceRecords,
    setAttendanceRecords,
    permissions,
    setPermissions,
    departments,
    setDepartments,
    leadHistory,
    setLeadHistory,
    settings,
    setSettings,
    subscription,
    setSubscription,
    jobs,
    setJobs,
    visitorLogs,
    setVisitorLogs,
    showSettingsMenu,
    setShowSettingsMenu,
    showConfirmLogout,
    setShowConfirmLogout,
    activeLeaderModal,
    setActiveLeaderModal,
    isDeptManagementExpanded,
    setIsDeptManagementExpanded,
    adminPhotoUrl,
    setAdminPhotoUrl,
    adminFileInputRef,
    handleAdminDpUpload,
    handleAdminDpDelete,
    companyLogoUrl,
    setCompanyLogoUrl,
    companyLogoFileInputRef,
    handleCompanyLogoUpload,
    handleCompanyLogoDelete,
    newDeptName,
    setNewDeptName,
    renamingDeptId,
    setRenamingDeptId,
    renamingDeptName,
    setRenamingDeptName,
    confirmDeleteDeptId,
    setConfirmDeleteDeptId,
    filterName,
    setFilterName,
    filterDept,
    setFilterDept,
    filterStatus,
    setFilterStatus,
    filterStatusOut,
    setFilterStatusOut,
    filterDateStart,
    setFilterDateStart,
    filterDateEnd,
    setFilterDateEnd,
    selectedPlanCode,
    setSelectedPlanCode,
    gatewaySelected,
    setGatewaySelected,
    billingProgress,
    setBillingProgress,
    reportFeedback,
    setReportFeedback,
    showQrModal,
    setShowQrModal,
    qrDataUrl,
    setQrDataUrl,
    notifications,
    handleMarkNotifRead,
    handleMarkAllNotifsRead,
    handleClearNotifs,
    handleSaveSettings,
    handleAddDept,
    handleRenameDept,
    handleDeleteDept,
    handleAssignLead,
    handleAssignWorkerToDept,
    handleEvaluatePermission,
    requestReportCompile,
    handleBillingRenewalSubmit,
    formatCompact,
    filteredLogsList,
    rankedLeaderboard,
    departmentAverages,
    isDark,
    calculateWorkerAttendanceMetrics,
    syncAdminResources
  };
}
