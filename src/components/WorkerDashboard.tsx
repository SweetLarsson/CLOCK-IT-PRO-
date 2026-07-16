/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import jsQR from "jsqr";
import { 
  QrCode, 
  History, 
  FileText, 
  Bell, 
  Camera, 
  CheckCircle2, 
  XCircle, 
  Upload, 
  Calendar,
  Clock,
  LogOut,
  Sparkles,
  RefreshCw,
  Sliders,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  FolderSync,
  ShieldCheck,
  Menu,
  ChevronLeft,
  Users,
  Settings
} from "lucide-react";
import { AttendanceStatus, PermissionStatus } from "../types.js";
import { formatDateToCustomString } from "../utils/dateFormatter.js";
import CustomSelect from "./CustomSelect";
import CustomDatePicker from "./CustomDatePicker";
import { useWorkerViewModel } from "../viewmodels/useWorkerViewModel.js";
import { IMAGES } from "../assets/assets.js";

interface WorkerDashboardProps {
  user: any;
  tenant: any;
  subscription: any;
  settings: any;
  translations: any;
  onLogout: () => void;
  onNotifyAdmin: (title: string, msg: string) => void;
  onSettingsChange?: (newSettings: any) => void;
  onSubscriptionChange?: (newSubscription: any) => void;
  onUserUpdate?: (updatedUser: any) => void;
}

const formatPunchDate = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const monthIndex = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const dateObj = new Date(year, monthIndex, day);
  if (isNaN(dateObj.getTime())) return dateStr;
  
  const weekday = dateObj.toLocaleDateString("en-US", { weekday: "long" });
  const month = dateObj.toLocaleDateString("en-US", { month: "long" });
  
  // Calculate suffix (st, nd, rd, th)
  let suffix = "th";
  if (day === 1 || day === 21 || day === 31) suffix = "st";
  else if (day === 2 || day === 22) suffix = "nd";
  else if (day === 3 || day === 23) suffix = "rd";
  
  return `${weekday} ${day}${suffix} ${month} ${year}`;
};

const generateBezierPaths = (pts: { x: number; y: number }[], yFloor: number) => {
  if (pts.length === 0) return { strokeD: "", fillD: "" };
  let strokeD = `M ${pts[0].x},${pts[0].y}`;
  let curves = "";
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cp1x = prev.x + (curr.x - prev.x) / 3;
    const cp1y = prev.y;
    const cp2x = curr.x - (curr.x - prev.x) / 3;
    const cp2y = curr.y;
    curves += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
  }
  strokeD += curves;
  const fillD = `M ${pts[0].x.toFixed(1)},${yFloor} L ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}${curves} L ${pts[pts.length - 1].x.toFixed(1)},${yFloor} Z`;
  return { strokeD, fillD };
};

export default function WorkerDashboard({ 
  user: initialUser, 
  tenant, 
  subscription, 
  settings, 
  translations, 
  onLogout,
  onNotifyAdmin,
  onSettingsChange,
  onSubscriptionChange,
  onUserUpdate
}: WorkerDashboardProps) {
  
  const {
    user,
    setUser,
    showSplash,
    setShowSplash,
    activeTab,
    setActiveTab,
    attendanceRecords,
    setAttendanceRecords,
    permissions,
    notifications,
    setNotifications,
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
    isRefreshingLogs
  } = useWorkerViewModel({
    initialUser,
    tenant,
    translations,
    onNotifyAdmin,
    onUserUpdate,
    onSettingsChange,
    onSubscriptionChange,
    settings
  });

  const [workerActiveSummaryTab, setWorkerActiveSummaryTab] = React.useState<"info" | "analytics" | "hours" | "history" | "actions">("info");
  const workerSummaryTabRowRef = React.useRef<HTMLDivElement>(null);
  const workerPunchHistoryRef = React.useRef<HTMLDivElement>(null);

  const scrollContainer = (
    ref: React.RefObject<HTMLDivElement | null>,
    direction: "left" | "right"
  ) => {
    if (ref.current) {
      const amount = direction === "left" ? -280 : 280;
      ref.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  const handleNextWorkerSummaryTab = () => {
    const tabs: ("info" | "analytics" | "hours" | "history" | "actions")[] = [
      "info", "analytics", "hours", "history", "actions"
    ];
    const currentIdx = tabs.indexOf(workerActiveSummaryTab);
    const nextIdx = (currentIdx + 1) % tabs.length;
    setWorkerActiveSummaryTab(tabs[nextIdx]);
    if (workerSummaryTabRowRef.current) {
      const el = workerSummaryTabRowRef.current;
      const step = el.scrollWidth / tabs.length;
      el.scrollTo({ left: step * nextIdx - 40, behavior: "smooth" });
    }
  };

  const handlePrevWorkerSummaryTab = () => {
    const tabs: ("info" | "analytics" | "hours" | "history" | "actions")[] = [
      "info", "analytics", "hours", "history", "actions"
    ];
    const currentIdx = tabs.indexOf(workerActiveSummaryTab);
    const prevIdx = (currentIdx - 1 + tabs.length) % tabs.length;
    setWorkerActiveSummaryTab(tabs[prevIdx]);
    if (workerSummaryTabRowRef.current) {
      const el = workerSummaryTabRowRef.current;
      const step = el.scrollWidth / tabs.length;
      el.scrollTo({ left: step * prevIdx - 40, behavior: "smooth" });
    }
  };

  const [theme, setTheme] = React.useState<"light" | "dark" | "army" | "navy" | any>(() => {
    const saved = localStorage.getItem(`worker_theme_${user.id}`);
    if (saved === "light" || saved === "dark" || saved === "army" || saved === "navy") {
      return saved as "light" | "dark" | "army" | "navy";
    }
    return settings?.theme === "dark" ? "dark" : "light";
  });

  const [departments, setDepartments] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await fetch(`/api/tenant/departments?tenant_id=${tenant.id}`);
        if (res.ok) {
          const data = await res.json();
          setDepartments(data.depts || data.departments || []);
        }
      } catch (err) {
        console.error("Failed to fetch departments", err);
      }
    };
    fetchDepts();
  }, [tenant.id, user.department_id]);

  const isDark = theme !== "light";

  // Dynamic theme colors helper
  const themeClass = React.useMemo(() => {
    switch (theme) {
      case "army":
        return {
          bg: "bg-[#141C10] text-[#E5F3DD]",
          navBg: "bg-[#182313] border-[#2C3E25]",
          cardBg: "bg-[#1C2916] border-[#2D4222]",
          innerBg: "bg-[#11180D] border-[#23331D]",
          accentText: "text-emerald-400",
          accentBorder: "border-[#2D4222]",
          accentBg: "bg-emerald-500/10",
          buttonSelected: "bg-[#25361E] text-emerald-400 border border-[#436134] shadow-xs font-bold",
          inputBg: "bg-[#11180D] focus:bg-[#151F10] text-emerald-100 border-[#2D4222]",
          textHighlight: "text-white",
          textMuted: "text-[#A0BCA2]",
          textTitle: "text-white",
          tableRowHover: "hover:bg-[#25361E]/40 border-[#2C3E25]",
          tableRowDivider: "divide-[#2C3E25]"
        };
      case "navy":
        return {
          bg: "bg-[#0B132B] text-[#E1E8F0]",
          navBg: "bg-[#111A35] border-[#162244]",
          cardBg: "bg-[#1C2541] border-[#202E5A]",
          innerBg: "bg-[#0E1529] border-[#152042]",
          accentText: "text-cyan-400",
          accentBorder: "border-[#202E5A]",
          accentBg: "bg-cyan-500/10",
          buttonSelected: "bg-[#243361] text-cyan-400 border border-[#34498C] shadow-xs font-bold",
          inputBg: "bg-[#0E1529] focus:bg-[#121B35] text-cyan-100 border-[#202E5A]",
          textHighlight: "text-white",
          textMuted: "text-[#8DA9C4]",
          textTitle: "text-white",
          tableRowHover: "hover:bg-[#243361]/40 border-[#202E5A]",
          tableRowDivider: "divide-[#202E5A]"
        };
      case "dark":
        return {
          bg: "bg-[#0A0A0A] text-[#E5E5E5]",
          navBg: "bg-[#0D0D0D] border-[#262626]",
          cardBg: "bg-[#0D0D0D] border-[#262626]",
          innerBg: "bg-[#070707] border-[#262626]",
          accentText: "text-cyan-400",
          accentBorder: "border-[#262626]",
          accentBg: "bg-cyan-500/10",
          buttonSelected: "bg-[#1A1A1A] text-cyan-400 border border-[#333] shadow-xs font-bold",
          inputBg: "bg-[#111] focus:bg-[#151515] text-white border-[#262626]",
          textHighlight: "text-white",
          textMuted: "text-neutral-400",
          textTitle: "text-white",
          tableRowHover: "hover:bg-[#121212]/50 border-[#262626]",
          tableRowDivider: "divide-[#202020]"
        };
      case "light":
      default:
        return {
          bg: "bg-white text-neutral-800",
          navBg: "bg-white border-neutral-205",
          cardBg: "bg-white border-neutral-200 shadow-sm",
          innerBg: "bg-neutral-50 border-neutral-200",
          accentText: "text-cyan-600",
          accentBorder: "border-neutral-200",
          accentBg: "bg-cyan-500/10",
          buttonSelected: "bg-white text-cyan-600 border border-neutral-150 shadow-xs font-bold",
          inputBg: "bg-neutral-50 focus:bg-white text-slate-900 border-[#E5E5E5]",
          textHighlight: "text-slate-900",
          textMuted: "text-neutral-500",
          textTitle: "text-slate-900",
          tableRowHover: "hover:bg-neutral-50/50 border-neutral-100",
          tableRowDivider: "divide-neutral-150"
        };
    }
  }, [theme]);

  const [showSettingsModal, setShowSettingsModal] = React.useState(false);
  const [showClearNotifsConfirm, setShowClearNotifsConfirm] = React.useState(false);
  const [tempTheme, setTempTheme] = React.useState<any>(theme);
  const [tempLang, setTempLang] = React.useState<"en" | "fr" | "es">((settings?.language as any) || "en");
  const [tempSettingsTheme, setTempSettingsTheme] = React.useState<"light" | "dark" | "army" | "navy">(theme as any);
  const [tempSettingsLang, setTempSettingsLang] = React.useState<"en" | "fr" | "es">((settings?.language as any) || "en");
  const [isSettingsSaved, setIsSettingsSaved] = React.useState(false);
  const [showVerifyAttendanceModal, setShowVerifyAttendanceModal] = React.useState(false);
  const [scannedActionType, setScannedActionType] = React.useState<"check-in" | "check-out">("check-in");
  const [showCheckOutTimeModal, setShowCheckOutTimeModal] = React.useState(false);
  const [lastCheckOutTime, setLastCheckOutTime] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (showSettingsModal) {
      setTempTheme(theme);
      setTempLang((settings?.language as any) || "en");
    }
  }, [showSettingsModal, theme, settings?.language]);

  React.useEffect(() => {
    if (workerActiveSummaryTab === "actions") {
      setTempSettingsTheme(theme as any);
      setTempSettingsLang((settings?.language as any) || "en");
      setIsSettingsSaved(false);
    }
  }, [workerActiveSummaryTab, theme, settings?.language]);

  const getLocalDateString = (dateInput?: Date): string => {
    const d = dateInput || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseLocalDate = (dateStr: string): Date => {
    const parts = dateStr.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  };

  const isCheckedInToday = React.useMemo(() => {
    const todayStr = getLocalDateString();
    return attendanceRecords.some((r: any) => r.date === todayStr && !r.timeOut);
  }, [attendanceRecords]);

  const isCheckedOutToday = React.useMemo(() => {
    const todayStr = getLocalDateString();
    return attendanceRecords.some((r: any) => r.date === todayStr && r.timeOut);
  }, [attendanceRecords]);

  const todayRecord = React.useMemo(() => {
    const todayStr = getLocalDateString();
    return attendanceRecords.find((r: any) => r.date === todayStr);
  }, [attendanceRecords]);
  
  // Real Camera stream states
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [isCameraLoading, setIsCameraLoading] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const initRealCamera = async () => {
    setIsCameraLoading(true);
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn("Real camera access blocked or unavailable: ", err);
      setCameraError("Camera access denied. Operating simulator instead.");
      setCameraState("simulating");
    } finally {
      setIsCameraLoading(false);
    }
  };

  const killCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Assign stream to video tag as soon as it mounts to ensure immediate device camera activation
  React.useEffect(() => {
    if (stream && videoRef.current) {
      try {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn("Video stream play rejected:", e));
      } catch (err) {
        console.warn("React ref stream assign failed: ", err);
      }
    }
  }, [stream, cameraState]);

  const handleConfirmAttendance = async () => {
    setShowVerifyAttendanceModal(false);
    if (scannedActionType === "check-in") {
      await triggerCheckInHandshake(false);
    } else {
      const att = await triggerCheckOutHandshake();
      if (att && att.timeOut) {
        setLastCheckOutTime(att.timeOut);
        setShowCheckOutTimeModal(true);
      }
    }
    setTimeout(() => {
      setCameraState("closed");
      setScannerFeedback(null);
    }, 2500);
  };

  // Decode and execute the scan action
  const handleScannedCode = async (decodedVal: string) => {
    if (!decodedVal) return;

    // Check if the QR matches this tenant / company
    if (decodedVal.includes(`tenant_id=${tenant.id}`)) {
      setIsSuccessScan(true);
      setScannerFeedback("Authorized QR code detected!");
      setScannedActionType(isCheckedInToday ? "check-out" : "check-in");
      setShowVerifyAttendanceModal(true);
    } else {
      setIsSuccessScan(false);
      setScannerFeedback("Access denied. Invalid enterprise QR token.");
    }
  };

  // Main QR detection algorithm using jsQR from the video canvas context
  React.useEffect(() => {
    let active = true;
    let frameId: number;

    if (cameraState === "viewing" && stream && videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      const scanLoop = () => {
        if (!active) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataImg = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const decodedResult = jsQR(dataImg.data, dataImg.width, dataImg.height, {
              inversionAttempts: "dontInvert"
            });
            if (decodedResult) {
              const isVal = decodedResult.data.includes(`tenant_id=${tenant.id}`);
              if (isVal) {
                handleScannedCode(decodedResult.data);
                return; // Halt scanning only when a valid code is decoded
              } else {
                setScannerFeedback("Access denied. Invalid enterprise QR token.");
                setIsSuccessScan(false);
                // Do not return, continue scanning!
              }
            }
          }
        }
        frameId = requestAnimationFrame(scanLoop);
      };

      frameId = requestAnimationFrame(scanLoop);
    }

    return () => {
      active = false;
      cancelAnimationFrame(frameId);
    };
  }, [cameraState, stream, isCheckedInToday]);

  React.useEffect(() => {
    if (activeTab === "scan" && cameraState === "viewing") {
      initRealCamera();
    } else {
      killCamera();
    }
    return () => killCamera();
  }, [activeTab, cameraState]);

  const [workerTimeframe, setWorkerTimeframe] = React.useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");

  const [chartDimensions, setChartDimensions] = React.useState({ width: 500, height: 130 });
  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!chartContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setChartDimensions({
          width: width || 500,
          height: height || 130,
        });
      }
    });
    observer.observe(chartContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const dateIntervals = React.useMemo(() => {
    const latestDateStr = attendanceRecords.reduce(
      (max, r: any) => (r.date > max ? r.date : max),
      "2026-06-29"
    );
    const latestDate = parseLocalDate(latestDateStr);

    let intervals: { label: string; startDate: string; endDate: string; displayDate: string }[] = [];

    if (workerTimeframe === "daily") {
      for (let i = 0; i < 7; i++) {
        const d = new Date(latestDate);
        d.setDate(d.getDate() - (6 - i));
        const dateStr = getLocalDateString(d);
        intervals.push({
          label: dateStr,
          startDate: dateStr,
          endDate: dateStr,
          displayDate: dateStr,
        });
      }
    } else if (workerTimeframe === "weekly") {
      for (let i = 0; i < 6; i++) {
        const dEnd = new Date(latestDate);
        dEnd.setDate(dEnd.getDate() - (5 - i) * 7);
        const dStart = new Date(dEnd);
        dStart.setDate(dStart.getDate() - 6);
        
        const endStr = getLocalDateString(dEnd);
        const startStr = getLocalDateString(dStart);
        intervals.push({
          label: `Week ${i + 1}`,
          startDate: startStr,
          endDate: endStr,
          displayDate: endStr,
        });
      }
    } else if (workerTimeframe === "monthly") {
      for (let i = 0; i < 6; i++) {
        const d = new Date(latestDate.getFullYear(), latestDate.getMonth() - (5 - i), 15);
        const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
        const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        
        intervals.push({
          label: d.toLocaleString('en-US', { month: 'short' }),
          startDate: getLocalDateString(startOfMonth),
          endDate: getLocalDateString(endOfMonth),
          displayDate: getLocalDateString(startOfMonth),
        });
      }
    } else if (workerTimeframe === "yearly") {
      for (let i = 0; i < 6; i++) {
        const d = new Date(latestDate.getFullYear(), latestDate.getMonth() - (5 - i) * 2, 15);
        const startOfBiMonth = new Date(d.getFullYear(), d.getMonth(), 1);
        const endOfBiMonth = new Date(d.getFullYear(), d.getMonth() + 2, 0);
        
        intervals.push({
          label: d.getFullYear().toString(),
          startDate: getLocalDateString(startOfBiMonth),
          endDate: getLocalDateString(endOfBiMonth),
          displayDate: getLocalDateString(startOfBiMonth),
        });
      }
    }

    return intervals;
  }, [attendanceRecords, workerTimeframe]);

  const formatGraphDateLabel = React.useCallback((dateStr: string): string => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthStr = shortMonths[monthIdx] || "Jan";
        return `${monthStr} ${day}`;
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${shortMonths[d.getMonth()]} ${d.getDate()}`;
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  }, []);

  const workerTrendData = React.useMemo(() => {
    const activeDays = user?.activityDays || settings?.activityDays || {
      Monday: true,
      Tuesday: true,
      Wednesday: true,
      Thursday: true,
      Friday: true,
      Saturday: false,
      Sunday: false
    };
    const dayOfWeekNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const safePermissions = permissions || [];

    return dateIntervals.map((interval) => {
      const records = attendanceRecords.filter(
        (r: any) => r.worker_id === user?.id && r.date >= interval.startDate && r.date <= interval.endDate
      );

      let perf = 0;
      let totalCount = records.length;

      let expectedDays = 0;
      let attendedDays = 0;
      let lateCount = 0;

      const startD = parseLocalDate(interval.startDate);
      const endD = parseLocalDate(interval.endDate);

      let cur = new Date(startD);
      while (cur <= endD) {
        const dStr = getLocalDateString(cur);
        const dayName = dayOfWeekNames[cur.getDay()];

        if (activeDays[dayName] === true) {
          const hasPermission = safePermissions.some((p: any) => 
            p.worker_id === user?.id && 
            (p.status || "").toLowerCase() === "approved" && 
            p.startDate <= dStr && 
            p.endDate >= dStr
          );

          if (!hasPermission) {
            expectedDays++;
          }
        }

        const dayRecords = records.filter((r: any) => r.date === dStr);
        if (dayRecords.length > 0) {
          const hasCheckin = dayRecords.some((r: any) => 
            r.statusIn === "PRESENT" || r.statusIn === "present" || 
            r.statusIn === "LATE" || r.statusIn === "late"
          );
          if (hasCheckin) {
            attendedDays++;
            if (dayRecords.some((r: any) => r.statusIn === "LATE" || r.statusIn === "late")) {
              lateCount++;
            }
          }
        }

        cur.setDate(cur.getDate() + 1);
      }

      if (expectedDays > 0) {
        perf = Math.max(0, Math.min(100, Math.round(((attendedDays - (lateCount * 0.1)) / expectedDays) * 100)));
      } else {
        perf = attendedDays > 0 ? 100 : 100; // standard default performance is 100% for days off
      }

      return {
        date: interval.displayDate,
        dateLabel: formatGraphDateLabel(interval.displayDate),
        workerCount: totalCount,
        perf: perf,
      };
    });
  }, [dateIntervals, attendanceRecords, formatGraphDateLabel, workerTimeframe, user, settings, permissions]);

  const computedWorkerStats = React.useMemo(() => {
    const m = getPersonalWorkerMetrics(workerTimeframe);
    return {
      present: m.attendedDays,
      late: m.lateCount,
      perf: m.performancePercentage,
      eligible: m.expectedDays
    };
  }, [getPersonalWorkerMetrics, workerTimeframe]);

  return (
    <div className={`min-h-screen flex flex-col font-sans select-none pb-20 justify-start transition-colors duration-300 ${themeClass.bg}`}>
      
      {/* Header Info Panel */}
      <nav className={`px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-md transition-colors duration-300 ${themeClass.navBg}`}>
        <div className="flex items-center space-x-3">
          <img 
            src={user.profilePhoto?.medium || IMAGES.defaultWorkerAvatar} 
            alt={user.firstName}
            className={`rounded-xl bg-neutral-150 dark:bg-neutral-900 ${themeClass.accentBorder} border select-none`}
            style={{
              width: "44px",
              height: "44px",
              minWidth: "44px",
              minHeight: "44px",
              maxWidth: "44px",
              maxHeight: "44px",
              objectFit: "cover"
            }}
          />
          <div className="flex flex-col">
            <div className={`flex items-center space-x-1.5 font-display font-medium text-xs leading-none ${themeClass.textTitle}`}>
              <span>{user.firstName} {user.lastName}</span>
            </div>
            <div className="flex items-center space-x-1.5 mt-1 leading-none">
              <span className={`text-[10px] font-normal ${themeClass.textMuted}`}>
                {tenant.name}
              </span>
              <span className="inline-block h-1 w-1 rounded-full bg-neutral-400/40" />
              <span className="text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/15">
                {user.role === "team_lead" ? "team lead" : user.role === "company_admin" ? "company admin" : user.role === "super_admin" ? "super admin" : "team member"}
              </span>
            </div>
          </div>
        </div>

        {/* Action icons right */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowNotifDrawer(!showNotifDrawer);
              }}
              className={`h-10 w-10 rounded-xl border flex items-center justify-center transition-colors relative cursor-pointer z-40 ${
                isDark 
                  ? 'bg-[#1A1A1A] hover:bg-[#202020] text-neutral-350 border-[#262626]' 
                  : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border-neutral-180'
              }`}
            >
              <Bell className="h-4.5 w-4.5" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-cyan-500 text-black text-[9px] font-bold flex items-center justify-center shrink-0">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifDrawer && (
                <>
                  <div className="fixed inset-0 z-30 cursor-default" onClick={() => setShowNotifDrawer(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute right-0 mt-3 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border p-5 shadow-2xl z-40 transition-all duration-300 ${themeClass.navBg} ${themeClass.accentBorder} ${themeClass.textHighlight}`}
                  >
                    <div>
                      <div className={`flex items-center justify-between border-b pb-3 mb-4 ${themeClass.accentBorder}`}>
                        <div className="flex items-center space-x-2">
                          <Bell className={`h-4 w-4 ${themeClass.accentText}`} />
                          <span className={`font-display font-bold text-sm ${themeClass.textTitle}`}>Activity Broadcaster</span>
                        </div>
                        <button onClick={() => setShowNotifDrawer(false)} className={`font-light text-xs cursor-pointer ${themeClass.textMuted} hover:${themeClass.textHighlight}`}>&times;</button>
                      </div>

                      <div className="space-y-3 overflow-y-auto max-h-72 scrollbar-none pr-1">
                        {notifications.length === 0 ? (
                          <div className={`py-6 text-center text-xs font-light leading-relaxed ${themeClass.textMuted}`}>
                            Broadcaster queue is clear. All workspace channels verified.
                          </div>
                        ) : (
                          notifications.map((n, idx) => (
                            <div key={idx} className={`p-3 rounded-xl border flex items-start justify-between space-x-2.5 text-[11px] leading-relaxed transition-all ${
                              n.read 
                                ? `${themeClass.innerBg} ${themeClass.accentBorder} ${themeClass.textMuted}` 
                                : `${themeClass.accentBg} border-cyan-500/30`
                            }`}>
                              <div className="flex-1 min-w-0">
                                <strong className={`block font-semibold mb-0.5 truncate ${themeClass.textTitle}`}>{n.title}</strong>
                                <p className={n.read ? `${themeClass.textMuted} line-clamp-2` : `${themeClass.textHighlight} font-medium`}>{n.message}</p>
                                <span className={`block text-[9px] tracking-wider font-mono mt-1.5 ${themeClass.textMuted}`}>{new Date(n.timestamp).toLocaleTimeString()}</span>

                                {n.permission_id && (
                                  <div className="mt-2.5 border-t border-neutral-200/10 pt-2.5">
                                    {(() => {
                                      const matchingPermission = permissions.find(p => p.id === n.permission_id);
                                      if (!matchingPermission) return null;
                                      
                                      const isPending = (matchingPermission.status || "").toUpperCase() === "PENDING";
                                      
                                      if (user.role === "team_lead") {
                                        if (isPending) {
                                          return (
                                            <div className="flex items-center gap-2 mt-1.5">
                                              <button
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  await handleEvaluatePermission(matchingPermission.id, PermissionStatus.APPROVED);
                                                }}
                                                className="flex-1 py-1.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-[10px] rounded-lg tracking-wide uppercase transition-all shadow-md active:scale-95 cursor-pointer text-center"
                                              >
                                                Approve
                                              </button>
                                              <button
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  await handleEvaluatePermission(matchingPermission.id, PermissionStatus.REJECTED);
                                                }}
                                                className="flex-1 py-1.5 px-3 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[10px] rounded-lg tracking-wide uppercase transition-all shadow-md active:scale-95 cursor-pointer text-center"
                                              >
                                                Reject
                                              </button>
                                            </div>
                                          );
                                        } else {
                                          const statusText = (matchingPermission.status || "").toUpperCase();
                                          const isApp = statusText === "APPROVED";
                                          return (
                                            <div className="flex items-center justify-between text-[10px] font-semibold mt-1.5">
                                              <span className="opacity-60">Status:</span>
                                              <span className={`px-2 py-0.5 rounded-md uppercase text-[9px] font-bold ${
                                                isApp 
                                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" 
                                                  : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                                              }`}>
                                                {matchingPermission.status}
                                              </span>
                                            </div>
                                          );
                                        }
                                      } else {
                                        return (
                                          <div className="flex items-center justify-between text-[10px] font-semibold mt-1.5">
                                            <span className="opacity-60">Status:</span>
                                            <span className={`px-2 py-0.5 rounded-md uppercase text-[9px] font-bold ${
                                              matchingPermission.status === "APPROVED" || matchingPermission.status === "approved"
                                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" 
                                                : matchingPermission.status === "REJECTED" || matchingPermission.status === "rejected"
                                                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                                                  : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                                            }`}>
                                              {matchingPermission.status || "Pending"}
                                            </span>
                                          </div>
                                        );
                                      }
                                    })()}
                                  </div>
                                )}
                              </div>
                              {!n.read && (
                                <button 
                                  onClick={() => handleMarkRead(n.id)}
                                  className={`text-[9px] font-bold hover:underline shrink-0 cursor-pointer ${themeClass.accentText} bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-0.5 rounded-md`}
                                >
                                  Read
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {notifications.length > 0 && (
                      <div className="flex gap-2 mt-4">
                        <button 
                          type="button"
                          onClick={handleMarkAllRead}
                          className={`flex-1 py-2.5 border font-semibold rounded-xl text-xs transition-all cursor-pointer ${themeClass.innerBg} ${themeClass.accentBorder} ${themeClass.accentText} hover:bg-cyan-500/10 min-h-[44px] flex items-center justify-center`}
                        >
                          Mark All As Read
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setShowNotifDrawer(false);
                            setShowClearNotifsConfirm(true);
                          }}
                          className="flex-1 py-2.5 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-[#251111]/30 hover:bg-red-100 dark:hover:bg-[#251111]/65 text-red-650 dark:text-red-400 font-semibold rounded-xl text-xs transition-all cursor-pointer min-h-[44px] flex items-center justify-center"
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          
          <div className="relative">
            <button 
              id="worker_menu_settings"
              onClick={() => setShowSettingsModal(!showSettingsModal)}
              className={`h-10 w-10 rounded-xl border flex items-center justify-center transition-colors tooltip cursor-pointer ${
                isDark 
                  ? 'bg-[#1A1A1A] hover:bg-[#202020] text-neutral-350 border-[#262626]' 
                  : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border-neutral-185'
              }`}
              title={translations.settingsTitle}
            >
              <Menu className="h-4.5 w-4.5 text-cyan-400" />
            </button>

            <AnimatePresence>
              {showSettingsModal && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowSettingsModal(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute right-0 mt-3 w-80 rounded-2xl border p-5 shadow-2xl z-45 transition-all duration-300 ${themeClass.navBg} ${themeClass.accentBorder} ${themeClass.textHighlight}`}
                  >
                    <div className="mb-4">
                      <h4 className={`font-display font-bold text-sm ${themeClass.textTitle}`}>Menu Settings</h4>
                      <p className={`text-[11px] font-light mt-0.5 ${themeClass.textMuted}`}>
                        Theme display & profile avatar settings.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Avatar Upload */}
                      <div className="space-y-1.5 flex flex-col">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider block ${themeClass.textMuted}`}>Profile Photo</span>
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors group flex items-center space-x-3 ${themeClass.innerBg} ${themeClass.accentBorder} hover:opacity-90`}
                        >
                          <img 
                            src={user.profilePhoto?.medium || IMAGES.defaultWorkerAvatar} 
                            alt="avatar preview" 
                            className={`rounded-lg border shadow-sm shrink-0 bg-black/10 ${themeClass.accentBorder}`}
                            style={{
                              width: "36px",
                              height: "36px",
                              minWidth: "36px",
                              minHeight: "36px",
                              maxWidth: "36px",
                              maxHeight: "36px",
                              objectFit: "cover"
                            }}
                          />
                          <div className="text-left">
                            <span className={`text-[11px] font-semibold block group-hover:${themeClass.accentText} transition-colors`}>Click to upload photo</span>
                            <span className={`text-[9px] block font-light ${themeClass.textMuted}`}>Supports PNG, JPG</span>
                          </div>
                        </div>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleDpUpload} 
                          className="hidden" 
                          accept="image/*" 
                        />
                      </div>

                      {/* Theme selection */}
                      <div className="space-y-1.5 flex flex-col">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${themeClass.textMuted}`}>Display Mode</span>
                        <div className={`grid grid-cols-2 gap-1.5 p-1 border rounded-xl bg-black/15 ${themeClass.accentBorder}`}>
                          <button
                            type="button"
                            onClick={() => {
                              setTempTheme("light");
                            }}
                            className={`py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all flex items-center justify-center space-x-1 ${
                              tempTheme === "light"
                                ? 'bg-white text-cyan-600 border border-neutral-150 shadow-xs font-bold' 
                                : `${themeClass.textMuted} hover:${themeClass.textHighlight}`
                            }`}
                          >
                            <span>Light</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTempTheme("dark");
                            }}
                            className={`py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all flex items-center justify-center space-x-1 ${
                              tempTheme === "dark"
                                ? 'bg-[#1A1A1A] text-cyan-400 border border-[#333] shadow-xs font-bold' 
                                : `${themeClass.textMuted} hover:${themeClass.textHighlight}`
                            }`}
                          >
                            <span>Dark</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTempTheme("army");
                            }}
                            className={`py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all flex items-center justify-center space-x-1 ${
                              tempTheme === "army"
                                ? 'bg-[#25361E] text-emerald-400 border border-[#436134] shadow-xs font-bold' 
                                : `${themeClass.textMuted} hover:${themeClass.textHighlight}`
                            }`}
                          >
                            <span>Army</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTempTheme("navy");
                            }}
                            className={`py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all flex items-center justify-center space-x-1 ${
                              tempTheme === "navy"
                                ? 'bg-[#243361] text-cyan-400 border border-[#34498C] shadow-xs font-bold' 
                                : `${themeClass.textMuted} hover:${themeClass.textHighlight}`
                            }`}
                          >
                            <span>Navy</span>
                          </button>
                        </div>
                      </div>

                      {/* Language selection */}
                      <div className="space-y-1.5 flex flex-col">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${themeClass.textMuted}`}>Language / Langue / Idioma</span>
                        <div className={`grid grid-cols-3 gap-1.5 p-1 border rounded-xl bg-black/15 ${themeClass.accentBorder}`}>
                          {(["en", "fr", "es"] as const).map((lang) => {
                            const label = lang === "en" ? "English" : lang === "fr" ? "Français" : "Español";
                            return (
                              <button
                                key={lang}
                                type="button"
                                onClick={() => setTempLang(lang)}
                                className={`py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-all flex items-center justify-center ${
                                  tempLang === lang
                                    ? 'bg-cyan-600 text-white font-bold border border-cyan-500 shadow-xs'
                                    : `${themeClass.textMuted} hover:${themeClass.textHighlight}`
                                }`}
                              >
                                <span>{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sign Out Action inside Settings Dropdown */}
                      <div className="pt-4 border-t border-neutral-100 dark:border-neutral-850">
                        <button
                          id="worker_signout_menu"
                          onClick={() => {
                            setShowSettingsModal(false);
                            onLogout();
                          }}
                          className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-center space-x-2 transition-all cursor-pointer text-xs font-semibold ${
                            isDark 
                              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20' 
                              : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                          }`}
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Close Session & Logout</span>
                        </button>
                      </div>

                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-850">
                      <button
                        type="button"
                        onClick={() => {
                          setTheme(tempTheme);
                          localStorage.setItem(`worker_theme_${user.id}`, tempTheme);
                          if (onSettingsChange) {
                            onSettingsChange({
                              ...settings,
                              theme: tempTheme,
                              language: tempLang
                            });
                          }
                          onNotifyAdmin("Settings Saved", "Preferences updated successfully.");
                          setShowSettingsModal(false);
                        }}
                        className="w-full py-2.5 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold hover:brightness-110 shadow-md shadow-cyan-950/30 cursor-pointer active:scale-95 duration-200 flex items-center justify-center"
                      >
                        Apply Settings
                      </button>
                    </div>

                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      {/* Main Body Grid */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {syncFeedback && (
          <div className={`p-4 rounded-xl text-center text-xs font-medium border ${
            isDark 
              ? 'bg-emerald-950/20 border-emerald-800 text-emerald-400' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {syncFeedback}
          </div>
        )}

        {/* Tab Selection */}
        <div className={`flex rounded-2xl p-1 shadow-xl sticky top-[73px] z-10 ${themeClass.navBg}`}>
          <button 
            onClick={() => setActiveTab("scan")}
            className={`flex-1 py-3 text-xs sm:text-sm font-semibold rounded-xl text-center cursor-pointer transition-all flex items-center justify-center ${activeTab === "scan" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/40" : `hover:${themeClass.accentText} ${themeClass.textMuted}`}`}
          >
            <span>{translations.workerTabScan || "Scan"}</span>
          </button>
          <button 
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-3 text-xs sm:text-sm font-semibold rounded-xl text-center cursor-pointer transition-all flex items-center justify-center ${activeTab === "history" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/40" : `hover:${themeClass.accentText} ${themeClass.textMuted}`}`}
          >
            <span>{translations.workerTabTrend || "Trend"}</span>
          </button>
          <button 
            onClick={() => setActiveTab("permission")}
            className={`flex-1 py-3 text-xs sm:text-sm font-semibold rounded-xl text-center cursor-pointer transition-all flex items-center justify-center ${activeTab === "permission" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/40" : `hover:${themeClass.accentText} ${themeClass.textMuted}`}`}
          >
            <span>{translations.workerTabPermission || "Permission"}</span>
          </button>
        </div>

        {/* TAB ACTIVE DESK: SCANNER */}
        {activeTab === "scan" && (
          <div className="space-y-6">
            
            {isCheckedOutToday ? (
              <div className={`rounded-3xl p-8 text-center space-y-6 flex flex-col items-center border shadow-md bg-emerald-500/5 border-emerald-500/25 dark:bg-emerald-500/5 dark:border-emerald-500/10`}>
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center border bg-emerald-500/10 text-emerald-500 border-emerald-500/25 dark:bg-emerald-500/10 dark:border-emerald-500/15`}>
                  <CheckCircle2 className="h-8 w-8 animate-pulse" />
                </div>
                <div>
                  <h3 className={`font-semibold text-lg mb-1.5 text-emerald-600 dark:text-emerald-400`}>{translations.shiftCompleted || "Shift Completed"}</h3>
                  <p className={`text-xs font-light max-w-sm mx-auto leading-relaxed ${themeClass.textMuted}`}>
                    {translations.shiftCompletedDesc || "You have successfully checked out for today. You are automatically exempted from checking in or checking out again for the rest of today until tomorrow."}
                  </p>
                </div>
              </div>
            ) : cameraState === "closed" ? (
              <div className={`rounded-3xl p-8 text-center space-y-6 flex flex-col items-center border shadow-md ${themeClass.cardBg}`}>
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center border shadow-inner ${themeClass.innerBg} ${themeClass.accentText}`}>
                  <QrCode className="h-8 w-8" />
                </div>
                <div>
                  <h3 className={`font-semibold text-lg mb-1.5 ${themeClass.textTitle}`}>{translations.verifyActiveAttendance || "Verify Active Attendance"}</h3>
                  <p className={`text-xs font-light max-w-sm mx-auto leading-relaxed ${themeClass.textMuted}`}>
                    {translations.hoverCameraFrame || "Hover your camera frame over the admin dashboard's rotating QR token to complete check-in verification."}
                  </p>
                </div>
                
                <div className="flex flex-col items-center w-full max-w-sm pt-2">
                  <button 
                    id="worker_open_scanner"
                    onClick={() => setCameraState("viewing")}
                    className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-white font-semibold rounded-xl text-sm shadow-md transition-all cursor-pointer min-h-[44px]"
                  >
                    {translations.scanCode || "Scan Code"}
                  </button>
                </div>
              </div>
            ) : (
              <div className={`rounded-3xl p-6 sm:p-8 border relative overflow-hidden flex flex-col items-center shadow-lg bg-[#0F172A]/10 border-neutral-200 dark:border-neutral-800 ${themeClass.cardBg}`}>
                
                <div className="absolute top-4 right-4 z-10">
                  <button 
                    onClick={() => { setCameraState("closed"); setScannerFeedback(null); }}
                    className={`h-8 w-8 rounded-full flex items-center justify-center cursor-pointer border ${
                      isDark ? `${themeClass.innerBg} ${themeClass.textMuted} hover:${themeClass.textHighlight} ${themeClass.accentBorder}` : 'bg-neutral-50 text-neutral-500 hover:text-slate-950 border-neutral-200'
                    }`}
                  >
                    &times;
                  </button>
                </div>

                <div className="text-center mb-6">
                  <span className="text-[10px] text-cyan-400 tracking-widest uppercase font-mono font-bold block animate-pulse">&bull; {translations.liveHandshakeScanner || "Live Handshake Scanner"}</span>
                  <p className={`text-xs font-light mt-1 ${themeClass.textMuted}`}>{translations.ensureDirectAlignment || "Ensure direct alignment with the official QR token transmitter."}</p>
                </div>

                {/* Video window */}
                <div 
                  className={`w-full max-w-sm aspect-square rounded-3xl border mb-4 flex flex-col items-center justify-center relative overflow-hidden shadow-inner ${
                    isDark ? 'grid bg-[#070707] border-neutral-800' : 'bg-neutral-100 border-neutral-200'
                  }`}
                  title="Scan"
                >
                  {cameraState === "viewing" && stream ? (
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline 
                      muted 
                      className="absolute inset-0 w-full h-full object-cover rounded-3xl"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center">
                      <span className="text-xs text-cyan-400/30 font-mono tracking-wider font-light">{translations.cameraSensorStandby || "Camera Sensor Standby"}</span>
                    </div>
                  )}
                  
                  {/* Laser line effect */}
                  <div className="absolute left-6 right-6 h-0.5 bg-cyan-400 shadow-[0_0_12px_#06b6d4] animate-[scan_2.5s_ease-in-out_infinite]" />
                  
                  {/* Scope markers */}
                  <div className="absolute top-6 left-6 h-6 w-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-xl" />
                  <div className="absolute top-6 right-6 h-6 w-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-xl" />
                  <div className="absolute bottom-6 left-6 h-6 w-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-xl" />
                  <div className="absolute bottom-6 right-6 h-6 w-6 border-b-4 border-r-4 border-cyan-400 rounded-br-xl" />
                </div>

                {/* Developer Simulation Button (placed below preview, never on it) */}
                <div className="w-full max-w-sm mb-4">
                  <button
                    onClick={() => handleScannedCode(`${window.location.origin}/?action=check-in&tenant_id=${tenant.id}`)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600/10 to-blue-600/10 hover:bg-cyan-600/25 text-cyan-400 font-bold rounded-2xl text-xs border border-cyan-500/30 transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
                    <span>{translations.simulateAuthorizedQr || "Simulate Authorized QR Code Scan (Dev Mode)"}</span>
                  </button>
                </div>

                {scannerFeedback && (
                  <div className={`w-full max-w-sm p-4 rounded-xl text-center text-xs font-semibold mb-2 flex items-center justify-center space-x-2 border ${
                    isSuccessScan 
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                      : 'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    {isSuccessScan ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" /> : <XCircle className="h-4.5 w-4.5 text-red-500" />}
                    <span>{scannerFeedback}</span>
                  </div>
                )}
              </div>
            )}

            {/* Static shift state log panels */}
            <div className={`rounded-3xl p-6 border shadow-sm space-y-4 ${themeClass.cardBg}`}>
              <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-850 pb-3">
                <div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider font-mono block ${themeClass.textMuted}`}>{translations.loggedShiftSession || "Logged Shift Session"}</span>
                  <p className={`text-[11px] font-light ${themeClass.textMuted}`}>{translations.officialRecordedClock || "Official recorded clock-in and clock-out logs"}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold select-none ${
                  todayRecord 
                    ? (todayRecord.timeOut ? 'bg-neutral-500/10 text-neutral-400 border border-neutral-800' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15')
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/15'
                }`}>
                  {todayRecord 
                    ? (todayRecord.timeOut ? (translations.shiftCompleted || "Shift Completed") : (translations.shiftInProgress || "Shift In Progress"))
                    : (translations.noShiftActive || "No Shift Active")
                  }
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-neutral-400 block uppercase">{translations.clockInTime || "Clock In Time"}</span>
                  <p className={`text-sm font-mono font-bold ${todayRecord?.timeIn ? (isDark ? themeClass.textTitle : 'text-slate-900') : 'text-neutral-400'}`}>
                    {todayRecord?.timeIn ? todayRecord.timeIn : "--:--:--"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-neutral-400 block uppercase">{translations.clockOutTime || "Clock Out Time"}</span>
                  <p className={`text-sm font-mono font-bold ${todayRecord?.timeOut ? (isDark ? themeClass.textTitle : 'text-slate-900') : 'text-neutral-400'}`}>
                    {todayRecord?.timeOut ? todayRecord.timeOut : (todayRecord?.timeIn ? (translations.activeShift || "Active Shift") : "--:--:--")}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-neutral-400 block uppercase">{translations.workHours || "Work Hours"}</span>
                  <p className={`text-sm font-mono font-bold ${todayRecord?.coveredTime ? 'text-cyan-405' : (todayRecord?.timeIn ? 'text-emerald-400' : 'text-neutral-450')}`}>
                    {(() => {
                      if (todayRecord?.coveredTime) {
                        const totalSeconds = todayRecord.coveredTime;
                        const hrs = Math.floor(totalSeconds / 3600);
                        const mins = Math.floor((totalSeconds % 3600) / 60);
                        return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
                      } else if (todayRecord?.timeIn) {
                        try {
                          const parts = todayRecord.timeIn.split(":");
                          if (parts.length >= 2) {
                            const h = parseInt(parts[0], 10);
                            const m = parseInt(parts[1], 10);
                            const s = parts.length > 2 ? parseInt(parts[2], 10) : 0;
                            
                            const now = currentTime;
                            const checkInDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, s);
                            const diffSecs = Math.max(0, Math.floor((now.getTime() - checkInDate.getTime()) / 1000));
                            const hrs = Math.floor(diffSecs / 3600);
                            const mins = Math.floor((diffSecs % 3600) / 60);
                            return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
                          }
                        } catch (e) {
                          // Fallback
                        }
                        return "00:00";
                      }
                      return "00:00";
                    })()}
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB ACTIVE DESK: LOGS HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-6">

            {/* Shift Assessment Header & Profile Box */}
            <div className={`p-6 rounded-3xl border shadow-md space-y-4 ${themeClass.cardBg} ${themeClass.accentBorder}`}>
              <div className="flex justify-between items-center pb-2 border-b border-neutral-200/10">
                <h3 className={`font-display font-semibold text-lg ${themeClass.textTitle}`}>
                  {translations.shiftAssessment || "Shift Assessment"}
                </h3>
                <span className={`text-[10px] uppercase font-bold tracking-wider font-mono ${themeClass.textMuted}`}>
                  {translations.workerVerifiedView || "Worker Verified View"}
                </span>
              </div>

              {/* Profile Box */}
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${themeClass.innerBg} ${themeClass.accentBorder}`}>
                <div className="flex items-center space-x-4">
                  <img
                    src={user.profilePhoto?.medium || IMAGES.defaultWorkerAvatar}
                    alt=""
                    className={`h-14 w-14 rounded-2xl object-cover border-2 shadow-sm ${themeClass.accentBorder}`}
                  />
                  <div>
                    <h4 className={`font-bold text-sm leading-tight ${themeClass.textTitle}`}>
                      {user.firstName} {user.lastName}
                    </h4>
                    <p className={`text-[11px] ${themeClass.textMuted}`}>
                      {user.email} &bull; {user.phone || (translations.noPhoneLinked || "No phone linked")}
                    </p>
                    <div className="flex gap-2 mt-1.5">
                      <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20 uppercase`}>
                        {user.role === "team_member" 
                          ? (translations.teamMember || "team member") 
                          : user.role === "team_lead" 
                          ? (translations.teamLead || "team lead") 
                          : user.role === "company_admin" 
                          ? (translations.companyAdmin || "company admin") 
                          : user.role === "super_admin" 
                          ? (translations.superAdmin || "super admin") 
                          : user.role
                        }
                      </span>
                      <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full border bg-cyan-500/10 text-cyan-400 border-cyan-500/20 uppercase`}>
                        {departments.find((d) => d.id === user.department_id)?.name || user.departmentName || (translations.unassigned || "Unassigned")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:items-end space-y-1">
                  <span className={`text-[10px] uppercase font-bold tracking-wider block font-mono ${themeClass.textMuted}`}>{translations.joinedOn || "Joined On"}</span>
                  <span className="font-mono text-xs font-semibold">
                    {user.createdAt ? user.createdAt.substring(0, 10) : "2026-06-11"}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeframe Selector Button Row */}
            {(workerActiveSummaryTab === "info" || workerActiveSummaryTab === "history") && (
              <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-2xl gap-4 ${themeClass.cardBg}`}>
                <div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider font-mono block mb-1 ${themeClass.textMuted}`}>{translations.workerMetricsTimeframeBasis || "Worker Metrics Timeframe Basis"}</span>
                  <p className={`text-xs font-light ${themeClass.textMuted}`}>{translations.dynamicallyRecalculate || "Dynamically recalculate attendance ratios, trend index, and metrics."}</p>
                </div>
                <div className={`flex rounded-2xl p-1 border select-none max-w-sm w-full divide-x-0 ${themeClass.innerBg}`}>
                  {(["daily", "weekly", "monthly", "yearly"] as const).map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setWorkerTimeframe(tf)}
                      className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-xl text-center capitalize transition-all cursor-pointer ${
                        workerTimeframe === tf 
                          ? isDark 
                            ? `${themeClass.buttonSelected} scale-[1.02]` 
                            : "bg-white text-cyan-600 shadow-sm font-bold scale-[1.02] border border-neutral-200"
                          : isDark
                            ? `${themeClass.textMuted} hover:${themeClass.textHighlight}`
                            : "text-neutral-500 hover:text-neutral-900"
                      }`}
                    >
                      {tf === "daily" 
                        ? (translations.tfDaily || "daily") 
                        : tf === "weekly" 
                        ? (translations.tfWeekly || "weekly") 
                        : tf === "monthly" 
                        ? (translations.tfMonthly || "monthly") 
                        : (translations.tfYearly || "yearly")
                      }
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab Selector with responsive navigation arrows */}
            <div className="relative group w-full px-2">
              {/* Left Arrow */}
              <button
                type="button"
                onClick={handlePrevWorkerSummaryTab}
                className={`absolute left-0 top-[20px] -translate-y-1/2 z-20 h-7 w-7 rounded-full border shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-110 active:scale-90 cursor-pointer ${themeClass.innerBg}`}
                title="Navigate to Previous Tab"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              <div
                ref={workerSummaryTabRowRef}
                className="flex border-b border-neutral-200/20 pb-2 gap-2 overflow-x-auto scrollbar-none font-sans"
              >
                {[
                  { id: "info", label: translations.subTabSummary || "Summary", icon: Users },
                  { id: "analytics", label: translations.subTabCalendar || "Calendar", icon: Calendar },
                  { id: "hours", label: translations.subTabWorkHours || "Work-Hours", icon: Clock },
                  { id: "history", label: translations.subTabPunchHistory || "Punch History", icon: History },
                  { id: "actions", label: translations.subTabSettings || "Settings", icon: Settings },
                ].map((t) => {
                  const Icon = t.icon;
                  const isSelected = workerActiveSummaryTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setWorkerActiveSummaryTab(t.id as any)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        isSelected
                          ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/20"
                          : `${themeClass.innerBg} ${themeClass.textMuted} hover:${themeClass.textHighlight}`
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Arrow */}
              <button
                type="button"
                onClick={handleNextWorkerSummaryTab}
                className={`absolute right-0 top-[20px] -translate-y-1/2 z-20 h-7 w-7 rounded-full border shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-110 active:scale-90 cursor-pointer ${themeClass.innerBg}`}
                title="Navigate to Next Tab"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* TAB PANELS */}
            {workerActiveSummaryTab === "info" && (
              <div className="space-y-6 flex flex-col items-center">
                {/* Quick Metrics display */}
                <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mx-auto">
                  <div className={`rounded-2xl p-5 border shadow-md font-bold ${themeClass.cardBg}`}>
                    <span className={`text-[10px] uppercase font-extrabold tracking-wide ${themeClass.textMuted}`}>{translations.present || "Present"}</span>
                    <h3 className={`text-2xl font-display font-extrabold tracking-tight mt-1 ${themeClass.textTitle}`}>
                      {computedWorkerStats.present} / {computedWorkerStats.eligible} {translations.daysSuffix || "Days"}
                    </h3>
                  </div>
                  <div className={`rounded-2xl p-5 border shadow-md font-bold ${
                    isDark 
                      ? `bg-gradient-to-br from-[#121d20]/50 to-[#0A0A0A] ${themeClass.accentBorder}` 
                      : 'bg-cyan-50/40 border-cyan-200 shadow-sm'
                  }`}>
                    <span className={`text-[10px] uppercase font-extrabold tracking-wide ${isDark ? 'text-cyan-405' : 'text-cyan-600'}`}>{translations.performanceIndex || "Performance Index"}</span>
                    <h3 className={`text-3xl font-display font-extrabold ${isDark ? 'text-cyan-400' : 'text-cyan-700'} mt-1`}>
                      {computedWorkerStats.perf.toFixed(2)}%
                    </h3>
                  </div>
                </div>

                {/* Worker Trend Graph */}
                <div className={`p-6 rounded-3xl border shadow-md overflow-hidden relative w-full max-w-2xl mx-auto ${themeClass.cardBg}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className={`font-semibold text-sm truncate ${themeClass.textTitle}`}>
                        {translations.myAttendanceTrend || "My Attendance Performance Trend"}
                      </h4>
                      <p className={`text-xs font-light mt-0.5 truncate ${themeClass.textMuted}`}>
                        {translations.calculatedIndexRating 
                          ? translations.calculatedIndexRating.replace("{timeframe}", workerTimeframe) 
                          : `Calculated index rating against eligible working hours of select ${workerTimeframe} timeframe.`
                        }
                      </p>
                    </div>
                  </div>
                                   <div 
                    ref={chartContainerRef}
                    className={`w-full rounded-3xl p-4 border relative flex justify-center items-center ${themeClass.innerBg}`}
                    style={{ minHeight: "155px" }}
                  >
                    {workerTrendData.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-light text-neutral-400">
                        {translations.noActivityRecords || "No activity records found for this timeframe."}
                      </div>
                    ) : (() => {
                      const width = Math.max(chartDimensions.width, 300);
                      const height = Math.max(chartDimensions.height, 120);

                      const axisLeft = 50;
                      const axisRight = width - 50;
                      const axisTop = 15;
                      const axisBottom = height - 22;
                      const plotWidth = axisRight - axisLeft;
                      const plotHeight = axisBottom - axisTop;

                      // Line start and range
                      const lineStart = axisLeft;
                      const lineEnd = axisRight;
                      const lineWidthRange = lineEnd - lineStart;
                      const lineInterval = workerTrendData.length > 1 ? lineWidthRange / (workerTrendData.length - 1) : lineWidthRange;

                      const getX = (idx: number) => lineStart + idx * lineInterval;
                      const getY = (perfValue: number) => {
                        const ratio = Math.max(0, Math.min(100, perfValue)) / 100;
                        return axisBottom - ratio * plotHeight;
                      };

                      const ticks = [
                        { label: "100%", y: axisTop },
                        { label: "75%", y: axisTop + plotHeight * 0.25 },
                        { label: "50%", y: axisTop + plotHeight * 0.5 },
                        { label: "25%", y: axisTop + plotHeight * 0.75 },
                        { label: "0%", y: axisBottom }
                      ];

                      return (
                        <>
                          <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
                            <defs>
                              <linearGradient id="workerTrendLineGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>

                            {/* Gridlines */}
                            {ticks.map((tick, tIdx) => (
                              <g key={tIdx} className="opacity-80">
                                <line
                                  x1={axisLeft}
                                  y1={tick.y}
                                  x2={axisRight}
                                  y2={tick.y}
                                  stroke="#888888"
                                  strokeOpacity="0.12"
                                  strokeDasharray="4 3"
                                />
                                <text
                                  x={axisLeft - 12}
                                  y={tick.y + 3.5}
                                  textAnchor="end"
                                  className="text-[10px] font-mono fill-slate-500 dark:fill-neutral-400"
                                >
                                  {tick.label}
                                </text>
                              </g>
                            ))}

                            {/* Solid Axes */}
                            <line
                              x1={axisLeft}
                              y1={axisTop}
                              x2={axisLeft}
                              y2={axisBottom}
                              stroke="#888888"
                              strokeOpacity="0.2"
                              strokeWidth="1.2"
                            />
                            <line
                              x1={axisLeft}
                              y1={axisBottom}
                              x2={axisRight}
                              y2={axisBottom}
                              stroke="#888888"
                              strokeOpacity="0.2"
                              strokeWidth="1.2"
                            />

                            {/* Line path */}
                            {(() => {
                              const pts = workerTrendData.map((d, idx) => ({
                                x: getX(idx),
                                y: getY(d.perf)
                              }));
                              const { strokeD, fillD } = generateBezierPaths(pts, axisBottom);
                              return (
                                <>
                                  <path d={fillD} fill="url(#workerTrendLineGrad)" />
                                  <path
                                    d={strokeD}
                                    fill="none"
                                    stroke="#06b6d4"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </>
                              );
                            })()}

                            {/* Hover Tracers */}
                            {hoveredIdx !== null && (() => {
                              const d = workerTrendData[hoveredIdx];
                              if (!d) return null;
                              const x = getX(hoveredIdx);
                              const y = getY(d.perf);
                              return (
                                <g className="pointer-events-none">
                                  <line
                                    x1={axisLeft}
                                    y1={y}
                                    x2={x}
                                    y2={y}
                                    stroke="#06b6d4"
                                    strokeOpacity="0.3"
                                    strokeDasharray="3 3"
                                    strokeWidth="0.8"
                                  />
                                  <line
                                    x1={x}
                                    y1={axisBottom}
                                    x2={x}
                                    y2={y}
                                    stroke="#06b6d4"
                                    strokeOpacity="0.3"
                                    strokeDasharray="3 3"
                                    strokeWidth="0.8"
                                  />
                                </g>
                              );
                            })()}

                            {/* Interactive Points */}
                            {workerTrendData.map((d, idx) => {
                              const x = getX(idx);
                              const y = getY(d.perf);
                              const isHovered = hoveredIdx === idx;
                              const size = isHovered ? 5.5 : 3.5;
                              const strokeWidth = isHovered ? 2.5 : 1.5;

                              return (
                                <g
                                  key={idx}
                                  className="cursor-pointer"
                                  onMouseEnter={() => setHoveredIdx(idx)}
                                  onMouseLeave={() => setHoveredIdx(null)}
                                >
                                  {/* Invisible hit target */}
                                  <circle cx={x} cy={y} r="18" fill="transparent" />

                                  {/* Point circle */}
                                  <circle
                                    cx={x}
                                    cy={y}
                                    r={size}
                                    fill="#06b6d4"
                                    stroke={isDark ? "#0d0d0d" : "#ffffff"}
                                    strokeWidth={strokeWidth}
                                  />
                                </g>
                              );
                            })}

                            {/* X-Axis labels with responsive skipping and rotation */}
                            {workerTrendData.map((d, idx) => {
                              const x = getX(idx);
                              const isMobile = width < 480;
                              const showLabel = !isMobile || (workerTrendData.length <= 6) || (idx % 2 === 0);

                              if (!showLabel) return null;

                              const rotation = isMobile ? -25 : 0;

                              return (
                                <text
                                  key={idx}
                                  x={x}
                                  y={axisBottom + 16}
                                  textAnchor={isMobile ? "end" : "middle"}
                                  transform={isMobile ? `rotate(${rotation}, ${x}, ${axisBottom + 16})` : undefined}
                                  className="text-[9px] font-mono fill-slate-500 dark:fill-neutral-400"
                                >
                                  {d.dateLabel}
                                </text>
                              );
                            })}
                          </svg>

                          {/* Hover Tooltip Overlay */}
                          {hoveredIdx !== null && (() => {
                            const d = workerTrendData[hoveredIdx];
                            if (!d) return null;
                            const x = getX(hoveredIdx);
                            const y = getY(d.perf);

                            // Keep tooltip positioned elegantly
                            const isLeftHalf = x < width / 2;
                            const tooltipLeft = isLeftHalf 
                              ? Math.max(10, x + 12) 
                              : Math.min(width - 135, x - 132);
                            const tooltipTop = Math.max(10, Math.min(height - 75, y - 45));

                            return (
                              <div
                                className="absolute rounded-xl border p-2.5 shadow-xl pointer-events-none transition-all duration-150 text-left z-20 font-bold"
                                style={{
                                  left: `${tooltipLeft}px`,
                                  top: `${tooltipTop}px`,
                                  width: "120px",
                                  backgroundColor: isDark ? "#0d0d0d" : "#ffffff",
                                  borderColor: isDark ? "#262626" : "#e5e5e5"
                                }}
                              >
                                <span className="block text-[8px] uppercase tracking-wider font-extrabold text-neutral-450 dark:text-neutral-400">
                                  {d.dateLabel}
                                </span>
                                <div className="flex justify-between items-baseline mt-1 font-bold">
                                  <span className="text-[10px] font-extrabold text-cyan-500 font-sans">
                                    {translations.ratingLabel || "Rating:"}
                                  </span>
                                  <span className="text-xs font-mono font-extrabold text-slate-800 dark:text-white">
                                    {d.perf}%
                                  </span>
                                </div>
                                <div className="flex justify-between items-baseline mt-0.5 font-bold">
                                  <span className="text-[8px] text-neutral-400 font-sans">
                                    {translations.logsLabel || "Logs:"}
                                  </span>
                                  <span className="text-[9px] font-mono font-extrabold text-slate-600 dark:text-neutral-300">
                                    {d.workerCount} {d.workerCount === 1 ? (translations.daySingle || "day") : (translations.daysSuffix || "days")}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Attendance Performance Calculations Audit */}
                <div className={`p-6 rounded-3xl border shadow-md space-y-3 w-full max-w-2xl mx-auto ${themeClass.cardBg}`}>
                  <h4 className={`font-semibold text-xs uppercase tracking-wider ${themeClass.textMuted}`}>{translations.methodOfCalc || "Method of Calculation Audit"}</h4>
                  <p className={`text-[11px] font-light leading-relaxed ${themeClass.textMuted}`}>
                    {translations.methodOfCalcDesc || "Eligible shift intervals include solely workspace activity schedules configured by active company supervisors. Approved leave/permission exemptions deduct from calculated denominators automatically, avoiding penalty indicators on worker attendance rates."}
                  </p>
                </div>
              </div>
            )}

            {workerActiveSummaryTab === "analytics" && (() => {
              const activeDays = user.activityDays || settings?.activityDays || {
                Monday: true, Tuesday: true, Wednesday: true, Thursday: true, Friday: true, Saturday: false, Sunday: false
              };
              const daysList = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
              const personalPermissions = permissions.filter(p => p.worker_id === user.id && (p.status || "").toLowerCase() === "approved");
              
              const getShiftTimeForDay = (day: string) => {
                const rawTime = settings?.dailyShiftTimes?.[day] || settings?.checkIn?.time || "08:00";
                const parts = rawTime.split(":");
                let hours = parseInt(parts[0], 10);
                let minutes = parseInt(parts[1], 10);
                if (isNaN(hours)) hours = 8;
                if (isNaN(minutes)) minutes = 0;
                const ampm = hours >= 12 ? "PM" : "AM";
                const hour12 = hours % 12 === 0 ? 12 : hours % 12;
                return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;
              };

              return (
                <div className="space-y-5 font-sans">
                  <div className={`p-6 rounded-3xl border shadow-md ${themeClass.cardBg}`}>
                    <span className={`text-[10px] uppercase font-bold tracking-wider font-mono block mb-3 ${themeClass.textMuted}`}>{translations.assignedWorkDays || "Assigned Work Days & Schedule"}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {daysList.map(d => {
                        const isScheduled = activeDays[d] === true;
                        const shiftTime = getShiftTimeForDay(d);
                        return (
                          <div key={d} className={`p-3 rounded-xl border flex items-center justify-between text-xs ${isScheduled ? `${themeClass.innerBg} border-cyan-500/20` : "opacity-50 border-neutral-200/10"}`}>
                            <div className="flex items-center space-x-2">
                              <span className={`h-2 w-2 rounded-full ${isScheduled ? "bg-emerald-400 shadow-sm" : "bg-neutral-500"}`} />
                              <span className="font-bold">{translations[d] || d}</span>
                            </div>
                            <span className="font-mono font-medium text-[11px]">
                              {isScheduled ? `${translations.shiftColon || "Shift"}: ${shiftTime}` : (translations.offDay || "Off-Day")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className={`p-6 rounded-3xl border shadow-md ${themeClass.cardBg}`}>
                    <span className={`text-[10px] uppercase font-bold tracking-wider font-mono block mb-3 ${themeClass.textMuted}`}>{translations.approvedLeavePermissions || "Approved Leave Permissions"}</span>
                    {personalPermissions.length > 0 ? (
                      <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                        {personalPermissions.map((p, idx) => (
                          <div key={idx} className={`p-3 rounded-xl border flex justify-between items-center text-xs ${themeClass.innerBg} ${themeClass.accentBorder}`}>
                            <div>
                              <span className="font-bold block text-cyan-400 capitalize">{translations[p.type] || p.type || (translations.exemptionDuty || "Exemption Duty")}</span>
                              <span className={`text-[10px] ${themeClass.textMuted}`}>{p.reason || (translations.approvedExemptionWindow || "Approved Exemption Window")}</span>
                            </div>
                            <span className="font-mono text-[10px] font-semibold">
                              {p.startDate} {translations.toLabel || "to"} {p.endDate}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`p-4 rounded-xl text-center text-xs border border-dashed ${themeClass.textMuted}`}>
                        {translations.noApprovedPermissions || "No approved permission records."}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {workerActiveSummaryTab === "hours" && (() => {
              const dailyM = getPersonalWorkerMetrics("daily");
              const weeklyM = getPersonalWorkerMetrics("weekly");
              const monthlyM = getPersonalWorkerMetrics("monthly");
              const yearlyM = getPersonalWorkerMetrics("yearly");
              const cumulativeM = getPersonalWorkerMetrics("cumulative");

              return (
                <div className="space-y-4 font-sans">
                  <div className={`p-6 rounded-3xl border shadow-md ${themeClass.cardBg}`}>
                    <span className={`text-[10px] uppercase font-bold tracking-wider font-mono block mb-3 ${themeClass.textMuted}`}>{translations.cumulativeHoursMatrix || "Cumulative Hours matrix"}</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between ${themeClass.innerBg} ${themeClass.accentBorder}`}>
                        <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${themeClass.textMuted}`}>{translations.totalCumulativeHours || "Total Cumulative Hours"}</span>
                        <div className="mt-2 flex items-baseline space-x-1">
                          <strong className="text-2xl text-cyan-400 font-mono font-bold">{cumulativeM.workHours.toFixed(2)}</strong>
                          <span className="text-[10px] font-medium text-gray-400">{translations.hoursSuffix || "hours"}</span>
                        </div>
                      </div>
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between ${themeClass.innerBg} ${themeClass.accentBorder}`}>
                        <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${themeClass.textMuted}`}>{translations.dailyShiftHours || "Daily Shift Hours"}</span>
                        <div className="mt-2 flex items-baseline space-x-1">
                          <strong className="text-2xl text-emerald-500 font-mono font-bold">{dailyM.workHours.toFixed(2)}</strong>
                          <span className="text-[10px] font-medium text-gray-400">{translations.hoursSuffix || "hours"}</span>
                        </div>
                      </div>
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between ${themeClass.innerBg} ${themeClass.accentBorder}`}>
                        <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${themeClass.textMuted}`}>{translations.weeklyAccumulated || "Weekly Accumulated"}</span>
                        <div className="mt-2 flex items-baseline space-x-1">
                          <strong className="text-xl text-amber-500 font-mono font-bold">{weeklyM.workHours.toFixed(2)}</strong>
                          <span className="text-[10px] font-medium text-gray-400">{translations.hoursSuffix || "hours"}</span>
                        </div>
                      </div>
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between ${themeClass.innerBg} ${themeClass.accentBorder}`}>
                        <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${themeClass.textMuted}`}>{translations.monthlyTotalHours || "Monthly Total Hours"}</span>
                        <div className="mt-2 flex items-baseline space-x-1">
                          <strong className="text-xl text-indigo-400 font-mono font-bold">{monthlyM.workHours.toFixed(2)}</strong>
                          <span className="text-[10px] font-medium text-gray-400">{translations.hoursSuffix || "hours"}</span>
                        </div>
                      </div>
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between ${themeClass.innerBg} ${themeClass.accentBorder} col-span-2`}>
                        <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${themeClass.textMuted}`}>{translations.yearlyAggregatedTotal || "Yearly Aggregated Total"}</span>
                        <div className="mt-2 flex items-baseline space-x-1">
                          <strong className={`text-2xl font-mono font-bold ${themeClass.accentText}`}>{yearlyM.workHours.toFixed(2)}</strong>
                          <span className="text-[10px] font-medium text-gray-400">{translations.hoursSuffix || "hours"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {workerActiveSummaryTab === "history" && (() => {
              const workerLogs = attendanceRecords.sort((a, b) => b.date.localeCompare(a.date));
              return (
                <div className="space-y-3 font-sans">
                  <div className={`p-6 rounded-3xl border shadow-md ${themeClass.cardBg}`}>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] uppercase font-bold tracking-wider font-mono block ${themeClass.textMuted}`}>{translations.tabAttendance || "Attendance Logs"}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider font-mono ${
                          settings?.onlyShowTimeIn !== false
                            ? "bg-amber-500/10 text-amber-500 border border-amber-500/25"
                            : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25"
                        }`}>
                          {translations.policyLabel || "Policy:"} {settings?.onlyShowTimeIn !== false ? (translations.timeInOnlyLabel || "Time-In Only") : (translations.timeInTimeOutLabel || "Time-In / Time-Out")}
                        </span>
                      </div>
                      <RefreshCw className={`h-4 w-4 cursor-pointer transition-colors ${themeClass.textMuted} hover:${themeClass.textHighlight} ${isRefreshingLogs ? "animate-spin text-cyan-400" : ""}`} onClick={syncWorkerLogs} />
                    </div>
                    
                    <div className="relative group/scroll w-full">
                      {/* Left invisible/hover scroll icon */}
                      <button
                        type="button"
                        onClick={() => scrollContainer(workerPunchHistoryRef, "left")}
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/40 dark:bg-black/40 border border-neutral-200 dark:border-neutral-850 backdrop-blur-md opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-200 cursor-pointer text-slate-700 dark:text-neutral-300 hover:scale-110 active:scale-95 shadow-sm"
                        title="Scroll Left"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      <div ref={workerPunchHistoryRef} className="overflow-x-auto w-full scrollbar-none rounded-2xl">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                          <thead>
                            <tr className={`text-[11px] font-bold uppercase tracking-wider border-b ${themeClass.innerBg} ${themeClass.textMuted}`}>
                              <th className="p-3">{translations.colDate || "Date & Day"}</th>
                              <th className="p-3">{translations.colIn || "Check-in Time"}</th>
                              {!settings?.onlyShowTimeIn && <th className="p-3">{translations.colOut || "Check-out Time"}</th>}
                              <th className="p-3">{(settings?.onlyShowTimeIn !== false) ? (translations.colStatusIn || "Arrival Status") : (translations.colCovered || "Shift Duration")}</th>
                              <th className="p-3">{translations.colStatusIn || "Attendance Status"}</th>
                              <th className="p-3">{translations.activeExemptionCol || "Permission Status"}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200/10 text-[11px]">
                            {workerLogs.length > 0 ? (
                              workerLogs.map((log, idx) => {
                                const hoursWorked = log.coveredTime ? (log.coveredTime / 3600).toFixed(2) : "0.00";
                                
                                // Check if there was an approved leave/permission for this date
                                const permission = permissions.find(p => 
                                  p.worker_id === user.id && 
                                  (p.status || "").toLowerCase() === "approved" && 
                                  p.startDate <= log.date && 
                                  p.endDate >= log.date
                                );
                                const permissionStatus = permission 
                                  ? `${translations.approvedStatus || "Approved"} (${permission.type})` 
                                  : (translations.standardShiftLabel || "Standard Shift");
                                
                                return (
                                  <tr key={idx} className={`border-b ${themeClass.tableRowHover} duration-100`}>
                                    <td className={`p-3 font-mono font-medium ${themeClass.textTitle}`}>
                                      {formatPunchDate(log.date)}
                                    </td>
                                    <td className={`p-3 font-mono ${themeClass.textHighlight}`}>{log.timeIn || "--"}</td>
                                    {!settings?.onlyShowTimeIn && (
                                      <td className={`p-3 font-mono ${themeClass.textHighlight}`}>{log.timeOut || (translations.activeShiftLabel || "Active Shift")}</td>
                                    )}
                                    <td className={`p-3 font-mono font-bold ${themeClass.accentText}`}>
                                    {settings?.onlyShowTimeIn !== false ? (translations.arrivalTrackedLabel || "Arrival Tracked") : `${hoursWorked} hrs`}
                                    </td>
                                    <td className="p-3">
                                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold border uppercase ${
                                        log.statusIn === 'PRESENT' || log.statusIn === 'present'
                                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                          : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                      }`}>
                                        {log.statusIn === 'PRESENT' || log.statusIn === 'present' ? (translations.approvedStatus || "PRESENT") : (translations.pendingStatus || log.statusIn)}
                                      </span>
                                    </td>
                                    <td className="p-3">
                                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold ${
                                        permission ? 'bg-cyan-500/10 text-cyan-400' : 'bg-neutral-500/10 text-neutral-400'
                                      }`}>
                                        {permissionStatus}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={settings?.onlyShowTimeIn !== false ? 5 : 6} className="p-8 text-center text-neutral-500 font-light">
                                  {translations.noHistoricalAttendance || "No historical attendance records logged."}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Right invisible/hover scroll icon */}
                      <button
                        type="button"
                        onClick={() => scrollContainer(workerPunchHistoryRef, "right")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/40 dark:bg-black/40 border border-neutral-200 dark:border-neutral-850 backdrop-blur-md opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-200 cursor-pointer text-slate-700 dark:text-neutral-300 hover:scale-110 active:scale-95 shadow-sm"
                        title="Scroll Right"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {workerActiveSummaryTab === "actions" && (
              <div className="space-y-6">
                <div className={`p-6 rounded-3xl border shadow-md space-y-4 ${themeClass.cardBg} pb-8`}>
                  <h4 className={`font-semibold text-xs uppercase tracking-wider ${themeClass.textMuted}`}>{translations.personalSettings || "Personal Settings & Preferences"}</h4>
                  
                  <div className="flex flex-col space-y-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-neutral-200/10 pb-4">
                      <div>
                        <span className={`text-xs font-semibold block ${themeClass.textTitle}`}>{translations.applicationColorTheme || "Application Color Theme"}</span>
                        <span className={`text-[10px] ${themeClass.textMuted}`}>{translations.switchLookAndFeel || "Switch look & feel for current user session."}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(["light", "dark", "army", "navy"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTempSettingsTheme(t)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold capitalize border transition-all cursor-pointer ${
                              tempSettingsTheme === t
                                ? "bg-cyan-600 text-white border-cyan-500 shadow-md scale-[1.03]"
                                : `${themeClass.innerBg} ${themeClass.textMuted} border-neutral-200/10 hover:${themeClass.textHighlight}`
                            }`}
                          >
                            {translations[t] || t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-neutral-200/10 pb-4">
                      <div>
                        <span className={`text-xs font-semibold block ${themeClass.textTitle}`}>{translations.workspaceLocalization || "Workspace Localization"}</span>
                        <span className={`text-[10px] ${themeClass.textMuted}`}>{translations.chooseActiveInterface || "Choose active interface translation schema."}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(["en", "fr", "es"] as const).map((lang) => {
                          const label = lang === "en" ? "English" : lang === "fr" ? "Français" : "Español";
                          return (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => setTempSettingsLang(lang)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                tempSettingsLang === lang
                                  ? "bg-cyan-600 text-white border-cyan-500 shadow-md scale-[1.03]"
                                  : `${themeClass.innerBg} ${themeClass.textMuted} border-neutral-200/10 hover:${themeClass.textHighlight}`
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="min-h-[1.5rem] flex items-center">
                        {isSettingsSaved && (
                          <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1.5 animate-bounce">
                            <span>✓</span>
                            <span>{translations.preferencesSaved || "Preferences validated and saved successfully!"}</span>
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          // Validate
                          if (!["light", "dark", "army", "navy"].includes(tempSettingsTheme)) {
                            alert(translations.invalidThemeSelected || "Invalid theme selected");
                            return;
                          }
                          if (!["en", "fr", "es"].includes(tempSettingsLang)) {
                            alert(translations.invalidLanguageSelected || "Invalid language selected");
                            return;
                          }

                          // Save
                          setTheme(tempSettingsTheme);
                          localStorage.setItem(`worker_theme_${user.id}`, tempSettingsTheme);

                          if (onSettingsChange) {
                            onSettingsChange({
                              ...settings,
                              theme: tempSettingsTheme,
                              language: tempSettingsLang
                            });
                          }

                          // Confirm
                          setIsSettingsSaved(true);
                          onNotifyAdmin("Settings Saved", `Worker display customized: theme=${tempSettingsTheme}, lang=${tempSettingsLang}`);
                          
                          setTimeout(() => {
                            setIsSettingsSaved(false);
                          }, 3000);
                        }}
                        className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold hover:brightness-110 shadow-lg shadow-cyan-950/20 active:scale-95 duration-200 transition-all cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <span>{translations.applyChanges || "Apply Changes"}</span>
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB ACTIVE DESK: EXEMPTIONS LEAVE REQUEST */}
        {activeTab === "permission" && (
          <div className="space-y-6">
            
            <div className={`rounded-3xl p-6 sm:p-8 border shadow-lg space-y-6 ${themeClass.cardBg}`}>
              
              <div>
                <h3 className={`font-semibold text-lg mb-1 ${themeClass.textTitle}`}>{translations.attendanceExemptionDrawer || "Attendance Exemption Drawer"}</h3>
                <p className={`text-xs font-light ${themeClass.textMuted}`}>{translations.submitLeavesDescription || "Submit medical, vacation, or official leaves with persistent audit references."}</p>
              </div>

              {exemptionStatus && (
                <div className={`p-4 rounded-xl text-center text-xs font-medium border ${
                  isDark 
                    ? 'bg-emerald-950/20 border-emerald-800 text-emerald-400' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  {translations.requirementSubmitted || "Requirement submitted! Admin notification sounded successfully."}
                </div>
              )}

              <form onSubmit={handleExemptionSubmit} className="space-y-4">
                
                <div className="flex flex-col space-y-1.5">
                  <label className={`text-xs font-semibold ${themeClass.textMuted}`}>{translations.reason}</label>
                  <CustomSelect 
                    value={exemptionReason} 
                    onChange={(val) => setExemptionReason(val as any)}
                    className={`w-full border rounded-xl py-3 px-4 text-sm outline-none focus:border-cyan-500 min-h-[44px] ${themeClass.inputBg}`}
                    options={[
                      { value: "Medical", label: translations.medicalLeaveLabel || "Medical Leave" },
                      { value: "Official", label: translations.officialDutyLabel || "Official Duty" },
                      { value: "Vacation", label: translations.vacationExemptionLabel || "Vacation Exemption" },
                      { value: "Personal", label: translations.personalAbsenteeLabel || "Personal Absentee" },
                      { value: "Mandatory", label: translations.mandatoryExemptionLabel || "Mandatory Exemption" }
                    ]}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className={`text-xs font-semibold ${themeClass.textMuted}`}>{translations.drStart}</label>
                    <CustomDatePicker
                      value={exemptionStart}
                      onChange={setExemptionStart}
                      className={themeClass.inputBg}
                      placeholder={translations.startDatePlaceholder || "Start date"}
                      theme={theme}
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <label className={`text-xs font-semibold ${themeClass.textMuted}`}>{translations.drEnd}</label>
                    <CustomDatePicker
                      value={exemptionEnd}
                      onChange={setExemptionEnd}
                      alignRight={true}
                      className={themeClass.inputBg}
                      placeholder={translations.endDatePlaceholder || "End date"}
                      theme={theme}
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className={`text-xs font-semibold ${themeClass.textMuted}`}>{translations.remarks}</label>
                  <textarea 
                    value={exemptionRemarks}
                    onChange={(e) => setExemptionRemarks(e.target.value)}
                    placeholder={translations.provideComplianceDetails || "Provide compliance details or references..."}
                    className={`w-full border rounded-xl py-3.5 px-4 text-sm font-medium outline-none focus:border-cyan-500 min-h-[100px] ${themeClass.inputBg}`}
                    required
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 active:scale-98 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-cyan-950/45 cursor-pointer min-h-[44px]"
                >
                  {translations.submitExemption}
                </button>

              </form>

            </div>

          </div>
        )}

      </main>

      <AnimatePresence>
        {showVerifyAttendanceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-xs"
              onClick={() => setShowVerifyAttendanceModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`relative w-full max-w-sm p-6 rounded-3xl border shadow-2xl z-[51] max-h-[90vh] overflow-y-auto overflow-x-auto ${themeClass.cardBg} ${themeClass.accentBorder}`}
            >
              <div className="text-center space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center border border-cyan-500/20">
                  <ShieldCheck className="h-6 w-6" stroke="currentColor" />
                </div>
                <div>
                  <h3 className={`font-display font-bold text-lg ${themeClass.textTitle}`}>{translations.verifyActiveAttendance || "Verify Active Attendance"}</h3>
                  <p className={`text-xs font-light mt-1.5 leading-relaxed ${themeClass.textMuted}`}>
                    {translations.language === "Langue" 
                      ? `Un jeton de code QR autorisé de l'entreprise a été scanné et vérifié. Voulez-vous soumettre votre confirmation ${scannedActionType} ?` 
                      : translations.language === "Idioma" 
                        ? `Se ha escaneado y verificado un token de código QR autorizado de la empresa. ¿Desea enviar su confirmación de ${scannedActionType}?` 
                        : `An authorized company QR code token has been scanned and verified. Do you want to submit your ${scannedActionType} handshake?`}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button
                    onClick={() => setShowVerifyAttendanceModal(false)}
                    className={`py-3 px-4 border rounded-xl text-xs font-semibold hover:bg-neutral-100/10 active:scale-95 transition-all text-center cursor-pointer ${themeClass.accentBorder} ${themeClass.textMuted}`}
                  >
                    {translations.cancel || "Cancel"}
                  </button>
                  <button
                    onClick={handleConfirmAttendance}
                    className="py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-950/40 cursor-pointer"
                  >
                    {translations.confirmSubmit || "Confirm & Submit"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheckOutTimeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-xs"
              onClick={() => setShowCheckOutTimeModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`relative w-full max-w-sm p-6 rounded-3xl border shadow-2xl z-[51] text-center max-h-[90vh] overflow-y-auto overflow-x-auto ${themeClass.cardBg} ${themeClass.accentBorder}`}
            >
              <div className="space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <CheckCircle2 className="h-6 w-6" stroke="currentColor" />
                </div>
                <div>
                  <h3 className={`font-display font-bold text-lg ${themeClass.textTitle}`}>{translations.checkedOut || "Checked Out"}</h3>
                  <p className={`text-xs font-light mt-1.5 leading-relaxed ${themeClass.textMuted}`}>
                    {translations.checkoutSequenceAuthorized || "Check-out sequence has been authorized. Your official checkout time registered is:"}
                  </p>
                  <div className="mt-4 p-4 rounded-2xl bg-black/20 border border-neutral-800 inline-block font-mono text-xl font-bold text-cyan-400 tracking-wider">
                    {lastCheckOutTime || "--:--:--" || (translations.activeShiftLabel || "Active Shift")}
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setShowCheckOutTimeModal(false)}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-cyan-950/40 cursor-pointer"
                  >
                    {translations.acknowledge || "Acknowledge"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showClearNotifsConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-xs"
              onClick={() => setShowClearNotifsConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`relative w-full max-w-sm p-6 rounded-3xl border shadow-2xl z-[51] text-center max-h-[90vh] overflow-y-auto overflow-x-auto ${themeClass.cardBg} ${themeClass.accentBorder}`}
            >
              <div className="space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
                  <XCircle className="h-6 w-6" stroke="currentColor" />
                </div>
                <div>
                  <h3 className={`font-display font-bold text-lg ${themeClass.textTitle}`}>{translations.clearAllNotifsTitle || "Clear All Notifications?"}</h3>
                  <p className={`text-xs font-light mt-1.5 leading-relaxed ${themeClass.textMuted}`}>
                    {translations.clearAllNotifsDesc || "Are you sure you want to clear your entire activity log feed? This action is permanent."}
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      handleClearNotif();
                      setShowClearNotifsConfirm(false);
                    }}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer min-h-[44px]"
                  >
                    {translations.yesClear || "Yes, Clear"}
                  </button>
                  <button
                    onClick={() => setShowClearNotifsConfirm(false)}
                    className={`flex-1 py-3 border font-semibold text-xs rounded-xl active:scale-95 transition-all cursor-pointer min-h-[44px] ${themeClass.innerBg} ${themeClass.accentBorder} ${themeClass.textHighlight}`}
                  >
                    {translations.cancel || "Cancel"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-neutral-50 dark:bg-[#070708] z-50 overflow-y-auto p-6 space-y-6 select-none font-sans"
          >
            {/* Shimmering Navigation Bar */}
            <div className="flex items-center justify-between border-b pb-4 border-neutral-200/50 dark:border-neutral-800/40">
              <div className="flex items-center space-x-3">
                <div className="h-11 w-11 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                  <div className="h-2.5 w-20 bg-neutral-200/65 dark:bg-neutral-800/60 rounded-md animate-pulse" />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
                <div className="h-9 w-9 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
                <div className="h-9 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
              </div>
            </div>

            {/* Shimmering Status Card + Performance Graph Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: QR checkin / handshake skeleton */}
              <div className="lg:col-span-1 p-6 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/40 bg-white dark:bg-neutral-900/40 shadow-sm space-y-6 flex flex-col items-center">
                <div className="h-4 w-2/3 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                <div className="w-full max-w-sm aspect-square bg-neutral-200/50 dark:bg-[#070707] rounded-3xl animate-pulse flex items-center justify-center">
                  <QrCode className="h-12 w-12 text-neutral-300 dark:text-neutral-700 animate-pulse" />
                </div>
                <div className="h-9 w-full max-w-sm bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
              </div>

              {/* Right Column: Performance Trend and metrics */}
              <div className="lg:col-span-2 space-y-6">
                <div className="p-6 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/40 bg-white dark:bg-neutral-900/40 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-44 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                    <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                  </div>
                  {/* Mock Shimmering graph line or bars */}
                  <div className="h-40 bg-neutral-100/50 dark:bg-[#070707]/30 rounded-2xl animate-pulse border border-neutral-200/30 dark:border-neutral-800/30 flex items-end justify-between p-6">
                    {[35, 60, 40, 80, 55, 90, 70].map((h, idx) => (
                      <div
                        key={idx}
                        className="w-4 bg-cyan-500/20 dark:bg-cyan-500/10 rounded-t-sm animate-pulse"
                        style={{ height: `${h}%`, animationDelay: `${idx * 120}ms` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Shimmering Statistics cards */}
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-5 rounded-2xl border border-neutral-200/50 dark:border-neutral-800/40 bg-white dark:bg-neutral-900/40 shadow-sm space-y-2">
                      <div className="h-3 w-12 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                      <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent activity list skeleton */}
            <div className="p-6 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/40 bg-white dark:bg-neutral-900/40 shadow-sm space-y-4">
              <div className="h-4 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((row) => (
                  <div key={row} className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-900/60 last:border-0 last:pb-0">
                    <div className="flex items-center space-x-3 w-1/2">
                      <div className="h-9 w-9 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
                      <div className="space-y-1.5 w-2/3">
                        <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                        <div className="h-2 w-1/2 bg-neutral-100 dark:bg-neutral-900 rounded-md animate-pulse" />
                      </div>
                    </div>
                    <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
