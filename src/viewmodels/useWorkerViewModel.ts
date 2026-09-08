/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { AttendanceStatus, PermissionStatus } from "../types.js";
import { playCheckInSound } from "../utils/soundSynth.js";
import { calculateShiftSeconds, calculatePerformanceIndex, formatDurationHHMMSS } from "../utils/timeFormatter.ts";
import {
  addOfflineAttendanceAction,
  getPendingQueueCount,
  syncOfflineQueue,
  registerOfflineSyncListeners,
} from "../utils/offlineAttendanceQueue.js";

function getLocalDateString(dateInput?: Date): string {
  const d = dateInput || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface UseWorkerViewModelProps {
  initialUser: any;
  tenant: any;
  translations: any;
  onNotifyAdmin: (title: string, msg: string) => void;
  onUserUpdate?: (updatedUser: any) => void;
  onSettingsChange?: (newSettings: any) => void;
  onSubscriptionChange?: (newSubscription: any) => void;
  onTenantChange?: (newTenant: any) => void;
  settings?: any;
}

/**
 * WorkerViewModel encapsulates the state management and business logic for
 * the Worker Dashboard, fulfilling the clean boundaries of MVVM (Model-View-ViewModel) architecture.
 */
export function useWorkerViewModel({
  initialUser,
  tenant,
  translations,
  onNotifyAdmin,
  onUserUpdate,
  onSettingsChange,
  onSubscriptionChange,
  onTenantChange,
  settings
}: UseWorkerViewModelProps) {
  const [user, setUser] = useState(initialUser);
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<"scan" | "history" | "permission">("scan");
  
  // Model Synchronization state - initialized from localStorage cache for instant offline viewing
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem(`cached_attendance_${tenant.id}_${user.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(0);
  
  // Camera & Scanning process flows
  const [cameraState, setCameraState] = useState<"closed" | "viewing" | "simulating">("closed");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannerFeedback, setScannerFeedback] = useState<string | null>(null);
  const [isSuccessScan, setIsSuccessScan] = useState<boolean | null>(null);

  // Offline Queue State
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(getPendingQueueCount());
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);

  // Permission Request Form State

  const [exemptionReason, setExemptionReason] = useState<"Medical" | "Official" | "Vacation" | "Personal" | "Mandatory">("Medical");
  const [exemptionStart, setExemptionStart] = useState("");
  const [exemptionEnd, setExemptionEnd] = useState("");
  const [exemptionRemarks, setExemptionRemarks] = useState("");
  const [exemptionStatus, setExemptionStatus] = useState<string | null>(null);

  // Profile Picture Upload VM flows
  const [uploadingDp, setUploadingDp] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Splash display timing
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  // Sync state computed counts
  useEffect(() => {
    setNotificationsCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  // Fetch / Sync core models
  const syncWorkerLogs = async () => {
    setIsRefreshingLogs(true);
    try {
      const resLogs = await fetch(`/api/attendance/records?tenant_id=${tenant.id}&worker_id=${user.id}`);
      const dataLogs = await resLogs.json();
      if (resLogs.ok && Array.isArray(dataLogs.records)) {
        const userRecords = dataLogs.records.filter((r: any) => r.worker_id === user.id);
        setAttendanceRecords(userRecords);
        try {
          localStorage.setItem(`cached_attendance_${tenant.id}_${user.id}`, JSON.stringify(userRecords));
        } catch (e) {}
      }

      const resW = await fetch(`/api/tenant/workers?tenant_id=${tenant.id}&worker_id=${user.id}`);
      if (resW.ok) {
        const dataW = await resW.json();
        const matched = dataW.workers.find((w: any) => w.id === user.id);
        if (matched) {
          const roleChanged = matched.role !== user.role;
          const deptChanged = matched.department_id !== user.department_id;
          
          if (roleChanged || deptChanged) {
            let changeMsg = "Your profile details have been updated by the administrator.";
            if (roleChanged && deptChanged) {
              const roleLabel = matched.role === "team_lead" ? "Team Lead" : matched.role === "company_admin" ? "Company Admin" : "Team Member";
              const deptName = matched.departmentName || "Unassigned";
              changeMsg = `Your role is now ${roleLabel} and department is updated to ${deptName}.`;
            } else if (roleChanged) {
              const roleLabel = matched.role === "team_lead" ? "Team Lead" : matched.role === "company_admin" ? "Company Admin" : "Team Member";
              changeMsg = `Your administrative role has been updated to ${roleLabel}.`;
            } else if (deptChanged) {
              const deptName = matched.departmentName || "Unassigned";
              changeMsg = `Your department assignment has been updated to ${deptName}.`;
            }
            onNotifyAdmin("Profile Updated", changeMsg);
          }

          setUser(matched);
          if (onUserUpdate) {
            onUserUpdate(matched);
          }
        }
      }

      const resSettings = await fetch(`/api/tenant/settings?tenant_id=${tenant.id}`);
      if (resSettings.ok) {
        const dataSettings = await resSettings.json();
        if (dataSettings.settings && onSettingsChange) {
          onSettingsChange(dataSettings.settings);
        }
      }

      const resNotifs = await fetch(`/api/notifications?tenant_id=${tenant.id}&worker_id=${user.id}`);
      const dataNotifs = await resNotifs.json();
      if (resNotifs.ok) {
        setNotifications(dataNotifs.notifications);
      }

      const resPerms = await fetch(`/api/permissions?tenant_id=${tenant.id}&worker_id=${user.id}`);
      if (resPerms.ok) {
        const dataPerms = await resPerms.json();
        setPermissions(dataPerms.permissions || []);
      }
    } catch (e) {
      console.warn("Worker offline cache fallback:", e);
      try {
        const cached = localStorage.getItem(`cached_attendance_${tenant.id}_${user.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAttendanceRecords(parsed);
          }
        }
      } catch (err) {}
    } finally {
      setIsRefreshingLogs(false);
    }
  };

  useEffect(() => {
    syncWorkerLogs();
    
    // Subscribe to SSE for real-time adjustments if records, roles or settings change
    const eventSource = new EventSource(`/api/events/subscribe?tenant_id=${tenant.id}`);
    
    eventSource.addEventListener("SETTINGS_SAVED", (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        if (onSettingsChange) {
          onSettingsChange(payload);
        }
        syncWorkerLogs();
      } catch (err) {
        console.warn("Error parsing SETTINGS_SAVED event on worker side:", err);
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
        console.warn("Error parsing TENANT_UPDATED event on worker side:", err);
      }
    });

    eventSource.addEventListener("PERMISSION_EVALUATED", (e: any) => {
      syncWorkerLogs();
    });

    eventSource.addEventListener("PROFILE_SYNCED", (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.worker_id === user.id) {
          setUser((prev: any) => {
            const next = { ...prev, profilePhoto: payload.profilePhotos };
            if (onUserUpdate) onUserUpdate(next);
            return next;
          });
        } else {
          syncWorkerLogs();
        }
      } catch (err) {
        console.warn("Error parsing PROFILE_SYNCED event on worker side:", err);
      }
    });

    eventSource.addEventListener("WORKERS_UPDATED", (e: any) => {
      syncWorkerLogs();
    });

    eventSource.addEventListener("LEAD_ASSIGNED", (e: any) => {
      syncWorkerLogs();
    });

    eventSource.addEventListener("ATTENDANCE_CREATED", (e: any) => {
      syncWorkerLogs();
    });

    eventSource.addEventListener("ATTENDANCE_UPDATED", (e: any) => {
      syncWorkerLogs();
    });

    eventSource.addEventListener("ATTENDANCE_DELETED", (e: any) => {
      syncWorkerLogs();
    });

    eventSource.addEventListener("SUBSCRIPTION_UPDATED", (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        if (onSubscriptionChange) {
          onSubscriptionChange(payload);
        }
      } catch (err) {
        console.warn("Error parsing SUBSCRIPTION_UPDATED on worker side:", err);
      }
    });

    // 3-second polling interval alongside SSE ensures immediate updates on worker terminals
    const pollInterval = setInterval(() => {
      if (typeof navigator === "undefined" || navigator.onLine) {
        syncWorkerLogs();
      }
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      eventSource.close();
    };
  }, [user.id, tenant.id]);

  // Offline Synchronization & Network State Listeners
  useEffect(() => {
    const handleStatusChange = () => {
      setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
      setPendingOfflineCount(getPendingQueueCount());
    };

    const handleQueueChange = () => {
      setPendingOfflineCount(getPendingQueueCount());
    };

    const handleSynced = (e: any) => {
      setPendingOfflineCount(getPendingQueueCount());
      syncWorkerLogs();
      if (e?.detail?.successCount > 0) {
        onNotifyAdmin("Offline Sync Restored", `Successfully synchronized ${e.detail.successCount} queued attendance logs to cloud.`);
      }
    };

    window.addEventListener("online", handleStatusChange);
    window.addEventListener("offline", handleStatusChange);
    window.addEventListener("offline-attendance-queue-changed", handleQueueChange);
    window.addEventListener("offline-attendance-synced", handleSynced);

    // Register offline background sync engine
    const cleanupSync = registerOfflineSyncListeners(tenant.id);

    return () => {
      window.removeEventListener("online", handleStatusChange);
      window.removeEventListener("offline", handleStatusChange);
      window.removeEventListener("offline-attendance-queue-changed", handleQueueChange);
      window.removeEventListener("offline-attendance-synced", handleSynced);
      cleanupSync();
    };
  }, [tenant.id]);

  // Manual Trigger for Offline Synchronization
  const handleManualSyncOffline = async () => {
    if (!navigator.onLine) {
      alert("Device is currently offline. Please connect to Wi-Fi or cellular network to synchronize queued logs.");
      return;
    }
    const res = await syncOfflineQueue(tenant.id);
    setPendingOfflineCount(getPendingQueueCount());
    syncWorkerLogs();
    return res;
  };

  // Handle Photo Sync & Thumbnail Generation locally via Canvas
  const handleDpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image exceeds 5MB specification guidelines code.");
      return;
    }

    setUploadingDp(true);
    setSyncFeedback(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvasSmall = document.createElement("canvas");
          const canvasMedium = document.createElement("canvas");
          const canvasOriginal = document.createElement("canvas");

          const ctxSmall = canvasSmall.getContext("2d");
          const ctxMedium = canvasMedium.getContext("2d");
          const ctxOriginal = canvasOriginal.getContext("2d");

          const drawCover = (ctx: CanvasRenderingContext2D | null, targetW: number, targetH: number) => {
            if (!ctx) return;
            const iw = img.width;
            const ih = img.height;
            const ratio = Math.max(targetW / iw, targetH / ih);
            const nw = iw * ratio;
            const nh = ih * ratio;
            const cx = (targetW - nw) / 2;
            const cy = (targetH - nh) / 2;
            ctx.drawImage(img, cx, cy, nw, nh);
          };

          // Resizing Small (50x50)
          canvasSmall.width = 50;
          canvasSmall.height = 50;
          drawCover(ctxSmall, 50, 50);
          const smallThumb = canvasSmall.toDataURL("image/webp", 0.6);

          // Resizing Medium (140x140)
          canvasMedium.width = 140;
          canvasMedium.height = 140;
          drawCover(ctxMedium, 140, 140);
          const mediumThumb = canvasMedium.toDataURL("image/webp", 0.7);

          // Original (Max 500 width optimized)
          const scale = Math.min(1, 500 / img.width);
          canvasOriginal.width = img.width * scale;
          canvasOriginal.height = img.height * scale;
          ctxOriginal?.drawImage(img, 0, 0, canvasOriginal.width, canvasOriginal.height);
          const originalOptimized = canvasOriginal.toDataURL("image/webp", 0.85);

          const payload = {
            worker_id: user.id,
            tenant_id: tenant.id,
            profilePhotos: {
              small: smallThumb,
              medium: mediumThumb,
              original: originalOptimized
            }
          };

          const res = await fetch("/api/profile/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          if (!res.ok) throw new Error("Synchronization upload failed.");
          
          setUser((prev: any) => {
            const next = { ...prev, profilePhoto: payload.profilePhotos };
            if (onUserUpdate) onUserUpdate(next);
            return next;
          });
          setSyncFeedback("Aesthetic Profile Pictures Synchronized!");
          setTimeout(() => setSyncFeedback(null), 3000);
        } catch (err: any) {
          alert("Image processing failed: " + err.message);
        } finally {
          setUploadingDp(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Check In Scan Logic
  const triggerCheckInHandshake = async (simulateMismatchedCompany = false) => {
    setScannerFeedback(null);
    setIsSuccessScan(null);

    if (simulateMismatchedCompany) {
      setIsSuccessScan(false);
      setScannerFeedback(translations.wrongQr || "Unrecognized Company Identity QR");
      return;
    }

    const localDate = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
    const localTime = new Date().toTimeString().split(" ")[0];

    // If device is offline, new attendance records cannot be created/updated without internet connection
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsSuccessScan(false);
      const msg = "Internet connection required. New attendance records can only be recorded when connected to the internet. Existing records remain available for offline viewing.";
      setScannerFeedback(msg);
      onNotifyAdmin("Network Connection Required", msg);
      return;
    }

    try {
      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worker_id: user.id, tenant_id: tenant.id, localDate, localTime })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setIsSuccessScan(false);
        if (data.error === "trial_expired_lockout") {
          setScannerFeedback(translations.trialExpired);
        } else {
          setScannerFeedback(data.error || "Handshake verification lock failed");
        }
        return;
      }

      if (data.ऑलरेडीचेकडइन || data.alreadyCheckedIn) {
        setIsSuccessScan(true);
        setScannerFeedback("Already Clocked In");
        return;
      }

      setIsSuccessScan(true);
      setScannerFeedback(translations.checkInSuccess);
      
      // Trigger the configured audible handshake beep
      if (data && data.soundName) {
        playCheckInSound(data.soundName);
      } else {
        playCheckInSound("beep"); // default fallback
      }

      onNotifyAdmin("Check-In Registered", `${user.firstName} authorized entry check-in`);
      syncWorkerLogs();
    } catch (e: any) {
      setIsSuccessScan(false);
      const msg = "Internet connection failed. New attendance records can only be updated when connected to the internet. Please reconnect and try again.";
      setScannerFeedback(msg);
      onNotifyAdmin("Network Required", msg);
    }
  };


  const triggerCheckOutHandshake = async () => {
    const localDate = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
    const localTime = new Date().toTimeString().split(" ")[0];

    // If device is offline, attendance check-out cannot be recorded without internet connection
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsSuccessScan(false);
      const msg = "Internet connection required. Attendance records can only be updated when connected to the internet. Existing records remain available for offline viewing.";
      setScannerFeedback(msg);
      onNotifyAdmin("Network Connection Required", msg);
      return null;
    }

    try {
      const res = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worker_id: user.id, tenant_id: tenant.id, localDate, localTime })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return null;
      }
      setIsSuccessScan(true);
      setScannerFeedback(translations.checkOutSuccess);
      onNotifyAdmin("Check-Out Registered", `${user.firstName} authorized exit signout`);
      syncWorkerLogs();
      return data.attendance;
    } catch (e: any) {
      setIsSuccessScan(false);
      const msg = "Internet connection failed. Attendance check-out requires an active internet connection to update. Please reconnect and try again.";
      setScannerFeedback(msg);
      onNotifyAdmin("Network Required", msg);
      return null;
    }
  };


  // Exemption requests
  const handleExemptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exemptionStart || !exemptionEnd) return;

    try {
      const res = await fetch("/api/permissions/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenant.id,
          worker_id: user.id,
          reason: exemptionReason,
          startDate: exemptionStart,
          endDate: exemptionEnd,
          remarks: exemptionRemarks
        })
      });
      if (res.ok) {
        setExemptionStatus("Pending Assessment");
        setExemptionRemarks("");
        setExemptionStart("");
        setExemptionEnd("");
        onNotifyAdmin("Exemption Requested", `${user.firstName} requested ${exemptionReason} permission`);
        syncWorkerLogs();
        setTimeout(() => setExemptionStatus(null), 4000);
      }
    } catch (err) {
      alert("Registration request failed.");
    }
  };

  const handleMarkRead = async (notifId: string) => {
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenant.id, notification_id: notifId })
    });
    syncWorkerLogs();
  };

  const handleMarkAllRead = async () => {
    await fetch("/api/notifications/mark-all-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenant.id, worker_id: user.id })
    });
    syncWorkerLogs();
  };

  const handleClearNotif = async () => {
    await fetch("/api/notifications/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenant.id, worker_id: user.id })
    });
    syncWorkerLogs();
  };

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
        onNotifyAdmin("Evaluation Success", `Permission was ${decisionStatus.toLowerCase()}`);
        syncWorkerLogs();
      }
    } catch (e) {
      alert("Evaluating failure");
    }
  };

  const getPersonalWorkerMetrics = (tf: "daily" | "weekly" | "monthly" | "yearly" | "cumulative" = "monthly") => {
    // 1. Worker registration date
    const regDateStr = user.createdAt ? user.createdAt.substring(0, 10) : "2026-06-11";
    const registrationDate = new Date(regDateStr);

    // 2. Worker active work days
    const activeDays = (user?.activityDays && Object.keys(user.activityDays).length > 0)
      ? user.activityDays
      : ((settings?.activityDays && Object.keys(settings.activityDays).length > 0)
        ? settings.activityDays
        : {
            Monday: true,
            Tuesday: true,
            Wednesday: true,
            Thursday: true,
            Friday: true,
            Saturday: false,
            Sunday: false
          });

    const dayOfWeekNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const latestDateStr = attendanceRecords.reduce(
      (max, r) => (r.date > max ? r.date : max),
      getLocalDateString()
    );
    const latestDate = new Date(latestDateStr);

    // Determine date range based on calendar period tf
    let startDate: Date;
    let endDate: Date;

    if (tf === "daily") {
      startDate = new Date(latestDateStr);
      endDate = new Date(latestDateStr);
    } else if (tf === "weekly") {
      // Sunday to Saturday of the calendar week containing latestDate
      const day = latestDate.getDay();
      startDate = new Date(latestDate);
      startDate.setDate(latestDate.getDate() - day);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else if (tf === "monthly") {
      // Precise calendar month of latestDate
      startDate = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
      endDate = new Date(latestDate.getFullYear(), latestDate.getMonth() + 1, 0); // last day of month
    } else if (tf === "yearly") {
      // Calendar year of latestDate
      startDate = new Date(latestDate.getFullYear(), 0, 1);
      endDate = new Date(latestDate.getFullYear(), 11, 31);
    } else { // cumulative
      startDate = new Date(registrationDate);
      endDate = new Date(latestDate);
    }

    // Align times
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Adjust start range to not be earlier than registration date
    const actualStart = startDate < registrationDate ? registrationDate : startDate;
    const actualEnd = endDate;

    let expectedDays = 0;
    let attendedDays = 0;
    let lateCount = 0;
    let approvedPermissionDays = 0;
    let totalCoveredSeconds = 0;

    const defaultShiftHours = (() => {
      const [inH, inM] = (settings?.checkIn?.time || "08:00").split(":").map(Number);
      const [outH, outM] = (settings?.checkOut?.time || "17:00").split(":").map(Number);
      return Math.max(0, (outH * 60 + outM) - (inH * 60 + inM)) / 60 || 8;
    })();

    // Evaluate all calendar days within the timeframe range for worker
    const userRecords = attendanceRecords.filter(r => 
      r.worker_id === user.id && 
      r.date >= getLocalDateString(actualStart) && 
      r.date <= getLocalDateString(actualEnd)
    );

    const cur = new Date(actualStart);
    while (cur <= actualEnd) {
      const dateStr = getLocalDateString(cur);
      const dayName = dayOfWeekNames[cur.getDay()];
      const isActiveWorkDay = activeDays[dayName] === true;

      if (isActiveWorkDay) {
        const hasPermission = permissions.some(p => 
          p.worker_id === user.id && 
          (p.status || "").toLowerCase() === "approved" && 
          p.startDate <= dateStr && 
          p.endDate >= dateStr
        );

        if (hasPermission) {
          approvedPermissionDays++;
        } else {
          expectedDays++;
        }
      }

      // Attendance check
      const atts = userRecords.filter(r => r.date === dateStr);
      if (atts.length > 0) {
        const hasSuccessfulCheckin = atts.some(r => 
          r.statusIn === "PRESENT" || r.statusIn === "present" || 
          r.statusIn === "LATE" || r.statusIn === "late"
        );
        if (hasSuccessfulCheckin) {
          attendedDays++;
          if (atts.some(r => r.statusIn === "LATE" || r.statusIn === "late")) {
            lateCount++;
          }

          // Calculate hours worked for this day adhering to workday closing rules
          const r = atts[0];
          const shiftSecs = calculateShiftSeconds(r, settings);
          totalCoveredSeconds += shiftSecs;
        }
      }

      cur.setDate(cur.getDate() + 1);
    }

    const absentDays = Math.max(0, expectedDays - attendedDays);

    const attendancePercentage = (expectedDays > 0 && attendedDays > 0) ? Number(((attendedDays / expectedDays) * 100).toFixed(2)) : 0;
    const availabilityPercentage = (expectedDays + approvedPermissionDays > 0 && attendedDays > 0) 
      ? Number((((attendedDays + approvedPermissionDays) / (expectedDays + approvedPermissionDays)) * 100).toFixed(2)) 
      : 0;

    const perfScore = calculatePerformanceIndex(attendedDays, expectedDays);

    const workHours = Number((totalCoveredSeconds / 3600).toFixed(2));

    return {
      expectedDays,
      attendedDays,
      lateCount,
      approvedPermissionDays,
      absentDays,
      attendancePercentage,
      availabilityPercentage,
      performancePercentage: perfScore,
      performanceIndex: perfScore,
      workHours,
      totalSeconds: totalCoveredSeconds,
      workHoursFormatted: formatDurationHHMMSS(totalCoveredSeconds),
      registrationDate: regDateStr,
      activeDays
    };
  };

  const computeStats = () => {
    const m = getPersonalWorkerMetrics("monthly");
    return {
      present: m.attendedDays,
      late: m.lateCount,
      perf: m.performancePercentage,
      eligible: m.expectedDays
    };
  };

  const statsObj = computeStats();

  return {
    user,
    setUser,
    showSplash,
    setShowSplash,
    activeTab,
    setActiveTab,
    attendanceRecords,
    setAttendanceRecords,
    notifications,
    setNotifications,
    permissions,
    setPermissions,
    showNotifDrawer,
    setShowNotifDrawer,
    notificationsCount,
    cameraState,
    setCameraState,
    cameraError,
    setCameraError,
    scannerFeedback,
    setScannerFeedback,
    isSuccessScan,
    setIsSuccessScan,
    exemptionReason,
    setExemptionReason,
    exemptionStart,
    setExemptionStart,
    exemptionEnd,
    setExemptionEnd,
    exemptionRemarks,
    setExemptionRemarks,
    exemptionStatus,
    setExemptionStatus,
    uploadingDp,
    setUploadingDp,
    syncFeedback,
    setSyncFeedback,
    fileInputRef,
    handleDpUpload,
    triggerCheckInHandshake,
    triggerCheckOutHandshake,
    handleExemptionSubmit,
    handleMarkRead,
    handleMarkAllRead,
    handleClearNotif,
    handleEvaluatePermission,
    statsObj,
    getPersonalWorkerMetrics,
    syncWorkerLogs,
    isRefreshingLogs,
    pendingOfflineCount,
    isOnline,
    handleManualSyncOffline
  };
}

