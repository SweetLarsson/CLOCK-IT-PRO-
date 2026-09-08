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
  Shield,
  Menu,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Users,
  Settings,
  Maximize,
  Minimize,
  KeyRound,
  Binary,
  ToggleLeft,
  ToggleRight,
  Copy,
  Check,
  Megaphone,
  WifiOff,
} from "lucide-react";
import { AttendanceStatus, PermissionStatus, CentralAnnouncement } from "../types.js";
import { formatDateToCustomString, groupNotificationsByDate } from "../utils/dateFormatter.js";
import { formatPhoneNumber } from "../utils/phoneFormatter.js";
import { formatDurationHHMMSS } from "../utils/timeFormatter.js";
import { getAlternativeAttendanceCode, validateAlternativeAttendanceCode } from "../utils/alternativeCode.js";
import { useFullscreenShortcut } from "../utils/useFullscreenShortcut.js";
import CustomSelect from "./CustomSelect";
import CustomDatePicker from "./CustomDatePicker";
import { useWorkerViewModel } from "../viewmodels/useWorkerViewModel.js";
import { IMAGES } from "../assets/assets.js";
import { WorkerCentralAnnouncementModal } from "./WorkerCentralAnnouncementModal";
import { PwaInstallComponent } from "./PwaInstallButton.js";

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
  onTenantChange?: (newTenant: any) => void;
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
  onTenantChange,
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
    isRefreshingLogs,
    pendingOfflineCount,
    isOnline,
    handleManualSyncOffline
  } = useWorkerViewModel({
    initialUser,
    tenant,
    translations,
    onNotifyAdmin,
    onUserUpdate,
    onSettingsChange,
    onSubscriptionChange,
    onTenantChange,
    settings
  });

  const [workerActiveSummaryTab, setWorkerActiveSummaryTab] = React.useState<"info" | "analytics" | "hours" | "history" | "actions">("info");
  const [isShiftAssessmentExpanded, setIsShiftAssessmentExpanded] = React.useState<boolean>(false);
  const [isAssessmentHistoryExpanded, setIsAssessmentHistoryExpanded] = React.useState<boolean>(false);
  const [isCompanyEmailRevealed, setIsCompanyEmailRevealed] = React.useState<boolean>(false);
  const workerSummaryTabRowRef = React.useRef<HTMLDivElement>(null);
  const workerPunchHistoryRef = React.useRef<HTMLDivElement>(null);

  const formatEllipsisEmail = (emailStr?: string) => {
    if (!emailStr || emailStr === "N/A") return "N/A";
    const atIdx = emailStr.indexOf("@");
    if (atIdx > 0) {
      const userPart = emailStr.substring(0, atIdx);
      const domainPart = emailStr.substring(atIdx + 1);
      const truncatedUser = userPart.length > 3 ? `${userPart.substring(0, 3)}...` : `${userPart}...`;
      const truncatedDomain = domainPart.length > 4 ? `${domainPart.substring(0, 3)}...` : domainPart;
      return `${truncatedUser}@${truncatedDomain}`;
    }
    return emailStr.length > 6 ? `${emailStr.substring(0, 6)}...` : `${emailStr}...`;
  };

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
  const [activeAnnouncement, setActiveAnnouncement] = React.useState<CentralAnnouncement | null>(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = React.useState(false);

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

    const fetchAnnouncements = async () => {
      try {
        const res = await fetch(`/api/tenant/announcements?tenant_id=${tenant.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.activeAnnouncement) {
            setActiveAnnouncement(data.activeAnnouncement);
            const isAlreadyAck = data.activeAnnouncement.acknowledgedWorkerIds?.includes(user.id);
            if (!isAlreadyAck) {
              setShowAnnouncementModal(true);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch central announcements", err);
      }
    };

    fetchDepts();
    fetchAnnouncements();
  }, [tenant.id, user.department_id, user.id]);

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
          dashedBorder: "border-dashed border-emerald-500/40",
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
          dashedBorder: "border-dashed border-cyan-500/40",
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
          dashedBorder: "border-dashed border-cyan-500/35",
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
          dashedBorder: "border-dashed border-cyan-500/40",
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
  const [showConfirmLogout, setShowConfirmLogout] = React.useState(false);
  const groupedNotifications = React.useMemo(() => {
    return groupNotificationsByDate(notifications);
  }, [notifications]);
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

  // Alternative 6-character code check-in state
  const [isAltCheckIn, setIsAltCheckIn] = React.useState(false);
  const [altCodeDigits, setAltCodeDigits] = React.useState<string[]>(["", "", "", "", "", ""]);
  const [altCodeError, setAltCodeError] = React.useState<string | null>(null);
  const [isVerifyingAltCode, setIsVerifyingAltCode] = React.useState(false);
  const altInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const handleAltCodeDigitChange = (index: number, value: string) => {
    const clean = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const newDigits = [...altCodeDigits];
    
    if (clean.length > 1) {
      // User typed or pasted multiple characters in a single box
      const chars = clean.slice(0, 6).split("");
      for (let i = 0; i < 6; i++) {
        newDigits[i] = chars[i] || "";
      }
      setAltCodeDigits(newDigits);
      setAltCodeError(null);
      
      const lastIndex = Math.min(chars.length, 5);
      altInputRefs.current[lastIndex]?.focus();
      
      if (chars.length === 6) {
        handleVerifyAltCode(newDigits);
      }
      return;
    }

    newDigits[index] = clean;
    setAltCodeDigits(newDigits);
    setAltCodeError(null);

    // Auto advance to next field if a character was entered
    if (clean && index < 5) {
      altInputRefs.current[index + 1]?.focus();
    }

    // If all 6 fields are now populated, automatically verify
    if (clean && index === 5 && newDigits.every(d => d.trim().length === 1)) {
      handleVerifyAltCode(newDigits);
    }
  };

  const handleAltCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!altCodeDigits[index] && index > 0) {
        e.preventDefault();
        const newDigits = [...altCodeDigits];
        newDigits[index - 1] = "";
        setAltCodeDigits(newDigits);
        altInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      altInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      altInputRefs.current[index + 1]?.focus();
    }
  };

  const handleAltCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const clean = pastedText.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
    if (!clean) return;

    const newDigits = ["", "", "", "", "", ""];
    for (let i = 0; i < clean.length; i++) {
      newDigits[i] = clean[i];
    }
    setAltCodeDigits(newDigits);
    setAltCodeError(null);

    const targetIndex = Math.min(clean.length, 5);
    altInputRefs.current[targetIndex]?.focus();

    if (clean.length === 6) {
      handleVerifyAltCode(newDigits);
    }
  };

  const handleVerifyAltCode = (codeArray = altCodeDigits) => {
    const fullCode = codeArray.join("").trim().toUpperCase();
    if (fullCode.length < 6) {
      setAltCodeError(translations.enterSixCharAltCode || "Please enter all 6 alphanumeric characters.");
      return;
    }

    setIsVerifyingAltCode(true);
    setAltCodeError(null);

    const isValid = validateAlternativeAttendanceCode(fullCode, tenant.id);
    setTimeout(() => {
      setIsVerifyingAltCode(false);
      if (isValid) {
        setIsSuccessScan(true);
        setScannerFeedback(translations.authorizedCodeDetected || "Authorized code token verified!");
        setScannedActionType(isCheckedInToday ? "check-out" : "check-in");
        setShowVerifyAttendanceModal(true);
      } else {
        setIsSuccessScan(false);
        setAltCodeError(translations.invalidAltCode || "Invalid 6-character attendance code. Please verify and retry.");
      }
    }, 350);
  };

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

  // Auto checkout monitor: triggers checkout when closing time or overtime cutoff is reached (without logging out)
  const isAutoCheckedOutRef = React.useRef(false);

  React.useEffect(() => {
    if (!todayRecord || todayRecord.timeOut || isAutoCheckedOutRef.current) return;

    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = daysOfWeek[currentTime.getDay()];

    const closingTime = settings?.dailyShiftOutTimes?.[dayName] || settings?.checkOut?.time || "17:00";
    const [cH, cM] = closingTime.split(":").map(Number);
    const closingDate = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), cH || 17, cM || 0, 0);

    const overtimeEnabled = settings ? (settings.overtimeEnabled === true) : false;
    const overtimeHours = (overtimeEnabled && settings?.overtimeHours) ? Number(settings.overtimeHours) : 0;

    // Shift overtime sustains count until selected overtime time frame is reached
    const cutoffDate = (overtimeEnabled && overtimeHours > 0)
      ? new Date(closingDate.getTime() + overtimeHours * 3600 * 1000)
      : closingDate;

    if (currentTime.getTime() >= cutoffDate.getTime()) {
      isAutoCheckedOutRef.current = true;
      triggerCheckOutHandshake().then(() => {
        const isOvertime = overtimeEnabled && overtimeHours > 0;
        const alertMsg = isOvertime
          ? `Shift Overtime Reached: Your extended shift overtime limit (${closingTime} + ${overtimeHours}h) has been reached. You have been automatically checked out for today. You can continue using the application for other activities.`
          : `Company Closing Time Reached: The company closing time (${closingTime}) has been reached. You have been automatically checked out for today. You can continue using the application for other activities.`;
        
        alert(alertMsg);
      }).catch((err) => {
        console.error("Auto checkout error:", err);
      });
    }
  }, [currentTime, todayRecord, settings]);

  // Handle server-triggered background auto checkouts (notify without logging out)
  React.useEffect(() => {
    if (todayRecord && todayRecord.timeOut && !isAutoCheckedOutRef.current) {
      if (todayRecord.statusOut === "Overtime" || todayRecord.statusOut === "Closing Time" || todayRecord.statusOut === "Auto Checkout") {
        isAutoCheckedOutRef.current = true;
        const alertMsg = todayRecord.statusOut === "Overtime"
          ? "Shift Overtime Ended: You have been automatically checked out at the end of your shift overtime. Departure status recorded as 'Overtime'."
          : "Company Closing Time Reached: You have been automatically checked out at company closing time. Hours recorded.";
        alert(alertMsg);
      }
    }
  }, [todayRecord]);

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

      // Only days that appear within the punch history tab are valid to be evaluated
      const punchDates: string[] = Array.from(new Set(records.map((r: any) => r.date as string)));

      if (punchDates.length > 0) {
        for (const dStr of punchDates) {
          const cur = parseLocalDate(dStr);
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
          } else {
            expectedDays++;
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
        }

        if (expectedDays > 0 && attendedDays > 0) {
          perf = Math.max(0, Math.min(100, Math.round(((attendedDays - (lateCount * 0.1)) / expectedDays) * 100)));
        } else {
          perf = 0;
        }
      } else {
        perf = 0;
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
              <span className={`text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md border ${
                user.role === "team_lead"
                  ? "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/15"
                  : user.role === "company_admin" || user.role === "super_admin"
                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/15"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/15"
              }`}>
                {user.role === "team_lead" 
                  ? (translations.teamLead || "team lead") 
                  : user.role === "company_admin" 
                    ? "company admin" 
                    : user.role === "super_admin" 
                      ? "super admin" 
                      : (translations.teamMember || "team member")}
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

                      <div className="space-y-4 overflow-y-auto max-h-72 scrollbar-none pr-1">
                        {notifications.length === 0 ? (
                          <div className={`py-6 text-center text-xs font-light leading-relaxed ${themeClass.textMuted}`}>
                            Broadcaster queue is clear. All workspace channels verified.
                          </div>
                        ) : (
                          groupedNotifications.map((group, gIdx) => (
                            <div key={gIdx} className="space-y-2">
                              <div className={`sticky top-0 z-10 py-1 px-2.5 rounded-lg backdrop-blur-md text-[10px] font-bold uppercase tracking-wider ${themeClass.accentText} ${themeClass.navBg} border border-cyan-500/20 flex items-center justify-between`}>
                                <span>{group.label}</span>
                                <span className={`text-[9px] font-mono font-normal ${themeClass.textMuted}`}>
                                  {group.items.length} alert{group.items.length > 1 ? "s" : ""}
                                </span>
                              </div>
                              <div className="space-y-2">
                                {group.items.map((n, idx) => (
                                  <div key={n.id || idx} className={`p-3 rounded-xl border flex items-start justify-between space-x-2.5 text-[11px] leading-relaxed transition-all ${
                                    n.read 
                                      ? `${themeClass.innerBg} ${themeClass.accentBorder} ${themeClass.textMuted}` 
                                      : `${themeClass.accentBg} border-cyan-500/30`
                                  }`}>
                                    <div className="flex-1 min-w-0">
                                      <strong className={`block font-semibold mb-0.5 truncate ${themeClass.textTitle}`}>{n.title}</strong>
                                      <p className={n.read ? `${themeClass.textMuted} line-clamp-2` : `${themeClass.textHighlight} font-medium`}>{n.message}</p>
                                      <span className={`block text-[9px] tracking-wider font-mono mt-1.5 ${themeClass.textMuted}`}>
                                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>

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
                                ))}
                              </div>
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
                      {/* PWA Mobile & Desktop App */}
                      <div className="space-y-1.5 flex flex-col">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider block ${themeClass.textMuted}`}>
                          PWA Mobile & Desktop App
                        </span>
                        <PwaInstallComponent
                          role="worker"
                          tenantName={tenant?.name || tenant?.companyName}
                          workerName={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
                          theme={tempTheme || "dark"}
                          variant="menu-item"
                        />
                      </div>

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
                            setShowConfirmLogout(true);
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

      {/* Offline Status & Pending Sync Alert Banner */}
      {(!isOnline || pendingOfflineCount > 0) && (
        <div className={`px-4 sm:px-6 py-2.5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
          !isOnline 
            ? "bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200" 
            : "bg-cyan-500/15 border-cyan-500/30 text-cyan-900 dark:text-cyan-200"
        }`}>
          <div className="flex items-center space-x-2 text-xs">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span className="font-semibold">
              {!isOnline
                ? `Offline Mode Active — Check-in/out actions are queued safely on this device (${pendingOfflineCount} pending).`
                : `${pendingOfflineCount} offline attendance record(s) queued for synchronization.`}
            </span>
          </div>
          {isOnline && pendingOfflineCount > 0 && (
            <button
              type="button"
              onClick={handleManualSyncOffline}
              className="self-start sm:self-auto px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black text-[11px] font-bold rounded-lg cursor-pointer transition-all shadow-sm flex items-center space-x-1"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Synchronize Now</span>
            </button>
          )}
        </div>
      )}

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
        <div className={`flex rounded-2xl p-1 shadow-xl sticky top-[73px] z-10 border ${themeClass.dashedBorder} ${themeClass.navBg}`}>
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
            ) : isAltCheckIn ? (
              /* ALTERNATIVE 6-CHARACTER CODE CHECK-IN MODE */
              <div className={`rounded-3xl p-6 sm:p-8 text-center space-y-6 flex flex-col items-center border shadow-md relative ${themeClass.cardBg}`}>
                
                {/* Center switch button: Click to switch back to Camera QR Scanner */}
                <button
                  id="worker_center_switch_to_qr"
                  type="button"
                  onClick={() => {
                    setIsAltCheckIn(false);
                    setAltCodeError(null);
                    setScannerFeedback(null);
                  }}
                  className={`h-16 w-16 sm:h-20 sm:w-20 rounded-3xl flex items-center justify-center border shadow-inner transition-all duration-300 cursor-pointer group hover:scale-105 active:scale-95 relative ${themeClass.innerBg} border-cyan-500/30 hover:border-cyan-400 text-cyan-400`}
                  title={translations.switchToScanner || "Click to switch to Camera QR Scanner"}
                  aria-label="Switch to QR Code Scanner"
                >
                  <KeyRound className="h-8 w-8 sm:h-9 sm:w-9 text-cyan-400 transition-transform duration-300 group-hover:scale-110" />
                </button>

                <div>
                  <h3 className={`font-semibold text-lg mb-1.5 ${themeClass.textTitle}`}>
                    {translations.verifyActiveAttendance || "Verify Active Attendance"}
                  </h3>
                  <p className={`text-xs font-light max-w-sm mx-auto leading-relaxed ${themeClass.textMuted}`}>
                    {translations.alternativeCheckInDesc || "Enter the 6-character attendance code provided by your administrator or displayed below the terminal QR."}
                  </p>
                </div>

                {/* Six fields separated by only one dash between the first 3 and last 3 fields - Strictly Square */}
                <div className="w-full max-w-md flex flex-col items-center">
                  <div 
                    className="flex items-center justify-center gap-1.5 sm:gap-2.5 my-2 w-full select-none"
                    onPaste={handleAltCodePaste}
                  >
                    {altCodeDigits.map((digit, idx) => (
                      <React.Fragment key={idx}>
                        <input
                          ref={(el) => (altInputRefs.current[idx] = el)}
                          id={`alt_code_field_${idx}`}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleAltCodeDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleAltCodeKeyDown(idx, e)}
                          className={`w-11 h-11 sm:w-14 sm:h-14 aspect-square flex items-center justify-center text-center text-lg sm:text-2xl font-mono font-black uppercase rounded-2xl border-2 transition-all outline-none shadow-sm caret-transparent ${
                            digit
                              ? "border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-cyan-500/20 ring-1 ring-cyan-500/40"
                              : `${themeClass.inputBg} border-neutral-700/50 text-slate-100 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30`
                          }`}
                          autoComplete="off"
                          spellCheck="false"
                        />
                        {idx === 2 && (
                          <span className={`text-lg sm:text-2xl font-black font-mono select-none px-1 sm:px-2 ${themeClass.textMuted}`}>
                            -
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Error feedback */}
                  {altCodeError && (
                    <div className="w-full max-w-sm mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-semibold flex items-center justify-center space-x-2">
                      <XCircle className="h-4 w-4 shrink-0" />
                      <span>{altCodeError}</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="w-full max-w-sm flex flex-col sm:flex-row gap-2.5 mt-5">
                    <button
                      id="worker_verify_alt_code_btn"
                      type="button"
                      disabled={isVerifyingAltCode || altCodeDigits.some(d => !d)}
                      onClick={() => handleVerifyAltCode()}
                      className="flex-1 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 min-h-[44px]"
                    >
                      {isVerifyingAltCode ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Verifying Code...</span>
                        </>
                      ) : (
                        <span>{translations.verifyAltCodeBtn || "Verify Code & Submit Attendance"}</span>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setAltCodeDigits(["", "", "", "", "", ""]);
                        setAltCodeError(null);
                        altInputRefs.current[0]?.focus();
                      }}
                      className={`px-4 py-3.5 rounded-xl border text-xs font-semibold cursor-pointer ${themeClass.innerBg} ${themeClass.textMuted} hover:${themeClass.textTitle}`}
                    >
                      {translations.clearCode || "Clear"}
                    </button>
                  </div>
                </div>
              </div>
            ) : cameraState === "closed" ? (
              <div className={`rounded-3xl p-8 text-center space-y-6 flex flex-col items-center border shadow-md relative ${themeClass.cardBg}`}>
                
                {/* Center switch button: Click to switch to 6-character PIN code check-in */}
                <button
                  id="worker_center_switch_to_pin"
                  type="button"
                  onClick={() => {
                    setIsAltCheckIn(true);
                    setScannerFeedback(null);
                    setAltCodeError(null);
                    setTimeout(() => {
                      altInputRefs.current[0]?.focus();
                    }, 100);
                  }}
                  className={`h-16 w-16 sm:h-20 sm:w-20 rounded-3xl flex items-center justify-center border shadow-inner transition-all duration-300 cursor-pointer group hover:scale-105 active:scale-95 relative ${themeClass.innerBg} ${themeClass.accentBorder} hover:border-cyan-400`}
                  title={translations.switchToAltCode || "Click to switch to 6-Character PIN verification"}
                  aria-label="Switch to PIN Code Check-In"
                >
                  <QrCode className={`h-8 w-8 sm:h-9 sm:w-9 ${themeClass.accentText} transition-transform duration-300 group-hover:scale-110`} />
                </button>
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
                
                {/* Switch at top right of the container */}
                <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
                  <button
                    id="worker_toggle_alt_checkin_viewing"
                    type="button"
                    onClick={() => {
                      setCameraState("closed");
                      setIsAltCheckIn(true);
                      setScannerFeedback(null);
                      setAltCodeError(null);
                      setTimeout(() => {
                        altInputRefs.current[0]?.focus();
                      }, 100);
                    }}
                    className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-1 shadow-sm ${themeClass.innerBg} ${themeClass.accentBorder} ${themeClass.textMuted} hover:${themeClass.accentText}`}
                    title="Switch to 6-Character Alternative Code Check-In"
                  >
                    <KeyRound className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-[10px] font-bold font-mono">Code</span>
                  </button>

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
              <div className="flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-3 border-b border-neutral-100 dark:border-neutral-850 pb-3">
                <div className="w-full sm:w-auto">
                  <span className={`text-[10px] uppercase font-bold tracking-wider font-mono block ${themeClass.textMuted}`}>{translations.loggedShiftSession || "Logged Shift Session"}</span>
                  <p className={`text-[11px] font-light ${themeClass.textMuted}`}>{translations.officialRecordedClock || "Official recorded clock-in and clock-out logs"}</p>
                </div>
                <div className="flex justify-center w-full sm:w-auto">
                  <span className={`text-xs px-3.5 py-1 rounded-full font-bold select-none text-center ${
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

            {/* Company Details Banner Container */}
            <div className={`p-4 rounded-3xl border shadow-md flex items-center justify-between gap-4 ${themeClass.cardBg} ${themeClass.accentBorder}`}>
              <div className="flex items-center space-x-4 w-full justify-between sm:justify-start">
                <div className="flex items-center space-x-3 shrink-0">
                  {/* Company Logo */}
                  <div className="h-10 w-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white overflow-hidden shadow-lg shadow-cyan-950/45 transition-all select-none shrink-0">
                    {settings?.companyLogoUrl || localStorage.getItem(`company_logo_${tenant.id}`) ? (
                      <img
                        src={settings?.companyLogoUrl || localStorage.getItem(`company_logo_${tenant.id}`) || ""}
                        alt="Company Logo"
                        className="h-full w-full object-cover select-none pointer-events-none"
                      />
                    ) : (
                      <Shield className="h-5 w-5" />
                    )}
                  </div>
                  {/* Company Name & Tag */}
                  <div>
                    <h4 className={`font-bold text-sm tracking-tight ${themeClass.textTitle}`}>
                      {tenant.name}
                    </h4>
                    <p className={`text-[10px] uppercase font-bold tracking-wider font-mono ${themeClass.textMuted}`}>
                      {translations.companyDetails || "Company Profile"}
                    </p>
                  </div>
                </div>

                {/* Company Details in a single straight line */}
                <div className="hidden sm:flex items-center space-x-4 text-xs font-light">
                  <span className={`h-4 w-px bg-neutral-200/10`} />
                  <div className="flex flex-col pr-2">
                    <span className={`text-[9px] uppercase font-bold tracking-wider block font-mono ${themeClass.textMuted}`}>
                      {translations.companyEmail || "Company Email"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCompanyEmailRevealed(prev => !prev)}
                      className={`text-left cursor-pointer transition-all hover:underline flex items-center gap-1 group outline-none font-mono text-xs ${themeClass.textHighlight}`}
                      title={isCompanyEmailRevealed ? "Click to conceal email" : "Click to reveal full email"}
                    >
                      <span className="font-mono text-xs select-none">
                        {isCompanyEmailRevealed ? (tenant.email || "N/A") : formatEllipsisEmail(tenant.email)}
                      </span>
                    </button>
                  </div>
                  <span className={`h-4 w-px bg-neutral-200/10`} />
                  <div className="flex flex-col">
                    <span className={`text-[9px] uppercase font-bold tracking-wider block font-mono ${themeClass.textMuted}`}>
                      {translations.companyPhone || "Company Phone"}
                    </span>
                    <span className={themeClass.textHighlight}>{formatPhoneNumber(tenant.phone) || "N/A"}</span>
                  </div>
                  <span className={`h-4 w-px bg-neutral-200/10`} />
                  <div className="flex flex-col">
                    <span className={`text-[9px] uppercase font-bold tracking-wider block font-mono ${themeClass.textMuted}`}>
                      {translations.companyCode || "Company Code"}
                    </span>
                    <span className="font-mono text-[11px] font-semibold">{tenant.id}</span>
                  </div>
                </div>

                {/* Mobile visible fallback */}
                <div className="flex sm:hidden flex-col text-right pr-2">
                  <button
                    type="button"
                    onClick={() => setIsCompanyEmailRevealed(prev => !prev)}
                    className={`text-[10px] cursor-pointer hover:underline text-right outline-none font-mono ${themeClass.textHighlight}`}
                    title={isCompanyEmailRevealed ? "Click to conceal email" : "Click to reveal full email"}
                  >
                    {isCompanyEmailRevealed ? (tenant.email || "N/A") : formatEllipsisEmail(tenant.email)}
                  </button>
                  <span className={`text-[9px] ${themeClass.textMuted}`}>{formatPhoneNumber(tenant.phone)}</span>
                </div>
              </div>
            </div>

            {/* Worker Profile Collapsible Container (Profile Only) */}
            <div className={`rounded-3xl border shadow-md overflow-hidden transition-all duration-300 ${themeClass.cardBg} ${themeClass.accentBorder}`}>
              {/* List Stripe Header (Interactive Expand/Collapse Row) */}
              <div
                onClick={() => setIsShiftAssessmentExpanded((prev) => !prev)}
                className={`p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors hover:bg-neutral-500/5 ${
                  isShiftAssessmentExpanded ? "border-b border-neutral-200/10" : ""
                }`}
                title={isShiftAssessmentExpanded ? "Click to collapse Worker Profile" : "Click to expand Worker Profile"}
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                    isShiftAssessmentExpanded ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" : `${themeClass.innerBg} ${themeClass.accentBorder}`
                  }`}>
                    {isShiftAssessmentExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                  <h3 className={`font-display font-semibold text-base sm:text-lg ${themeClass.textTitle}`}>
                    {translations.workerProfile || translations.shiftAssessment || "Worker Profile"}
                  </h3>
                </div>

                <div className="flex items-center space-x-2.5 shrink-0 ml-auto">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider hidden md:inline-block ${themeClass.textMuted}`}>
                    {isShiftAssessmentExpanded ? (translations.clickToCollapse || "Click to Collapse") : (translations.clickToExpand || "Click to Expand")}
                  </span>
                </div>
              </div>

              {/* Expandable Body: Worker Profile Box ONLY */}
              <AnimatePresence initial={false}>
                {isShiftAssessmentExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 sm:p-6">
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
                              {user.email} &bull; {user.phone ? formatPhoneNumber(user.phone) : (translations.noPhoneLinked || "No phone linked")}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-1.5">
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Separate Collapsible Container for Assessment History, Calendar, Work Hours, Punch History & Settings */}
            <div className={`rounded-3xl border shadow-md overflow-hidden transition-all duration-300 ${themeClass.cardBg} ${themeClass.accentBorder}`}>
              {/* List Stripe Header for Assessment Details */}
              <div
                onClick={() => setIsAssessmentHistoryExpanded((prev) => !prev)}
                className={`p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors hover:bg-neutral-500/5 ${
                  isAssessmentHistoryExpanded ? "border-b border-neutral-200/10" : ""
                }`}
                title={isAssessmentHistoryExpanded ? "Click to collapse assessment records" : "Click to expand assessment records"}
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                    isAssessmentHistoryExpanded ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" : `${themeClass.innerBg} ${themeClass.accentBorder}`
                  }`}>
                    {isAssessmentHistoryExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                  <h3 className={`font-display font-semibold text-base sm:text-lg ${themeClass.textTitle}`}>
                    {translations.assessmentRecordsHistory || "Assessment Records & History"}
                  </h3>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:inline-block ${themeClass.textMuted}`}>
                    {isAssessmentHistoryExpanded ? (translations.clickToCollapse || "Click to Collapse") : (translations.clickToExpand || "Click to Expand")}
                  </span>
                </div>
              </div>

              {/* Expandable Body for Sub-tabs & Sub-tab Contents */}
              <AnimatePresence initial={false}>
                {isAssessmentHistoryExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 sm:p-6 space-y-6">
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
              <div className="space-y-6 flex flex-col items-center w-full">
                {/* Worker Metrics Timeframe Basis - between Summary Tab and Present / Performance Index containers */}
                <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-2xl gap-4 ${themeClass.cardBg} w-full max-w-2xl mx-auto`}>
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

                {/* Quick Metrics display */}
                <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mx-auto">
                  <div className={`rounded-2xl p-5 border shadow-md font-bold ${themeClass.cardBg}`}>
                    <span className={`text-[10px] uppercase font-extrabold tracking-wide ${themeClass.textMuted}`}>{translations.presentStatus || "Present Status"}</span>
                    <h3 className={`text-2xl font-display font-extrabold tracking-tight mt-1 ${themeClass.textTitle}`}>
                      {workerTimeframe === "daily" 
                        ? (computedWorkerStats.present > 0 ? "Present" : "Absent")
                        : `${computedWorkerStats.present}/${computedWorkerStats.eligible} ${computedWorkerStats.eligible === 1 ? "Day" : "Days"}`
                      }
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
              const activeDays = (user?.activityDays && Object.keys(user.activityDays).length > 0)
                ? user.activityDays
                : ((settings?.activityDays && Object.keys(settings.activityDays).length > 0)
                  ? settings.activityDays
                  : {
                      Monday: true, Tuesday: true, Wednesday: true, Thursday: true, Friday: true, Saturday: false, Sunday: false
                    });
              const daysList = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
              const personalPermissions = permissions.filter(p => p.worker_id === user.id && (p.status || "").toLowerCase() === "approved");
              
              const formatTimeStr = (raw: string) => {
                const parts = raw.split(":");
                let hours = parseInt(parts[0], 10);
                let minutes = parseInt(parts[1], 10);
                if (isNaN(hours)) hours = 8;
                if (isNaN(minutes)) minutes = 0;
                const ampm = hours >= 12 ? "PM" : "AM";
                const hour12 = hours % 12 === 0 ? 12 : hours % 12;
                return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;
              };

              const getShiftTimeForDay = (day: string) => {
                const rawIn = settings?.dailyShiftTimes?.[day] || settings?.checkIn?.time || "08:00";
                const rawOut = settings?.dailyShiftOutTimes?.[day] || settings?.checkOut?.time || "17:00";
                const inStr = formatTimeStr(rawIn);
                const outStr = formatTimeStr(rawOut);
                if (settings?.onlyShowTimeIn !== false) {
                  return `In: ${inStr}`;
                }
                return `In: ${inStr} | Out: ${outStr}`;
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
                              {isScheduled ? shiftTime : (translations.offDay || "Off-Day")}
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
              const selectedM = getPersonalWorkerMetrics(workerTimeframe);

              const getTimeframeLabel = (tf: string) => {
                switch (tf) {
                  case "daily": return translations.tfDaily || "Daily";
                  case "weekly": return translations.tfWeekly || "Weekly";
                  case "monthly": return translations.tfMonthly || "Monthly";
                  case "yearly": return translations.tfYearly || "Yearly";
                  default: return tf;
                }
              };

              const getPerformanceBadge = (score: number) => {
                if (score >= 90) {
                  return { label: translations.perfOptimal || "Optimal Standing", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" };
                } else if (score >= 75) {
                  return { label: translations.perfGood || "Good Standing", bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/25" };
                } else if (score >= 50) {
                  return { label: translations.perfSatisfactory || "Satisfactory", bg: "bg-amber-500/10 text-amber-400 border-amber-500/25" };
                } else {
                  return { label: translations.perfNeedsImprovement || "Needs Attention", bg: "bg-red-500/10 text-red-400 border-red-500/25" };
                }
              };

              const perfBadge = getPerformanceBadge(selectedM.performancePercentage);

              return (
                <div className="space-y-4 font-sans">
                  {/* Worker Metrics Timeframe Basis Selector */}
                  <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-2xl gap-4 ${themeClass.cardBg} w-full`}>
                    <div>
                      <span className={`text-[10px] uppercase font-bold tracking-wider font-mono block mb-1 ${themeClass.textMuted}`}>
                        {translations.workerMetricsTimeframeBasis || "Worker Metrics Timeframe Basis"}
                      </span>
                      <p className={`text-xs font-light ${themeClass.textMuted}`}>
                        {translations.dynamicallyRecalculateHours || "Dynamically calculate work hours, performance score, and shift metrics across timeframes."}
                      </p>
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
                          {getTimeframeLabel(tf)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Timeframe Performance & Work Hours Focus Overview */}
                  <div className={`p-6 rounded-3xl border shadow-md space-y-5 ${themeClass.cardBg}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200/50 dark:border-neutral-800 pb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] uppercase font-bold tracking-wider font-mono ${themeClass.textMuted}`}>
                            {translations.activeTimeframeEvaluation || "Active Timeframe Evaluation"}
                          </span>
                          <span className="inline-block h-1 w-1 rounded-full bg-cyan-400" />
                          <span className="text-[10px] font-mono font-semibold uppercase text-cyan-400">
                            {getTimeframeLabel(workerTimeframe)} {translations.basis || "Basis"}
                          </span>
                        </div>
                        <h4 className={`text-base font-bold mt-0.5 ${themeClass.textTitle}`}>
                          {getTimeframeLabel(workerTimeframe)} {translations.workHoursAndPerformance || "Work Hours & Performance Overview"}
                        </h4>
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold self-start sm:self-auto ${perfBadge.bg}`}>
                        {perfBadge.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Work Hours Logged */}
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between ${themeClass.innerBg} ${themeClass.accentBorder}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${themeClass.textMuted}`}>
                            {translations.loggedWorkHours || "Logged Work Hours"}
                          </span>
                          <Clock className="h-3.5 w-3.5 text-cyan-400" />
                        </div>
                        <div className="mt-3 flex items-baseline space-x-1.5">
                          <strong className="text-2xl sm:text-3xl text-cyan-400 font-mono font-bold tracking-tight">
                            {selectedM.workHours.toFixed(2)}
                          </strong>
                          <span className="text-xs font-medium text-neutral-400">{translations.hoursSuffix || "hrs"}</span>
                        </div>
                        <span className={`text-[10px] font-mono mt-1 ${themeClass.textMuted}`}>
                          {translations.duration || "Duration"}: {selectedM.workHoursFormatted || "00:00:00"}
                        </span>
                      </div>

                      {/* Performance Score */}
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between ${themeClass.innerBg} ${themeClass.accentBorder}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${themeClass.textMuted}`}>
                            {translations.performanceScore || "Performance Score"}
                          </span>
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                        </div>
                        <div className="mt-3 flex items-baseline space-x-1.5">
                          <strong className={`text-2xl sm:text-3xl font-mono font-bold tracking-tight ${
                            selectedM.performancePercentage >= 75 ? "text-emerald-400" : selectedM.performancePercentage >= 50 ? "text-amber-400" : "text-red-400"
                          }`}>
                            {selectedM.performancePercentage.toFixed(1)}%
                          </strong>
                        </div>
                        <div className="w-full bg-neutral-200/40 dark:bg-neutral-800 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, selectedM.performancePercentage))}%` }}
                          />
                        </div>
                      </div>

                      {/* Attended vs Expected Days */}
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between ${themeClass.innerBg} ${themeClass.accentBorder}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${themeClass.textMuted}`}>
                            {translations.shiftAttendance || "Shift Attendance"}
                          </span>
                          <Calendar className="h-3.5 w-3.5 text-amber-400" />
                        </div>
                        <div className="mt-3 flex items-baseline space-x-1.5">
                          <strong className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-amber-400">
                            {selectedM.attendedDays}
                          </strong>
                          <span className="text-xs font-medium text-neutral-400">/ {selectedM.expectedDays} {translations.days || "days"}</span>
                        </div>
                        <span className={`text-[10px] font-mono mt-1 ${themeClass.textMuted}`}>
                          {selectedM.attendancePercentage.toFixed(1)}% {translations.attendanceRate || "attendance rate"}
                        </span>
                      </div>

                      {/* Punctuality / Late Status */}
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between ${themeClass.innerBg} ${themeClass.accentBorder}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${themeClass.textMuted}`}>
                            {translations.punctualityRecord || "Punctuality Record"}
                          </span>
                          <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
                        </div>
                        <div className="mt-3 flex items-baseline space-x-1.5">
                          <strong className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-indigo-400">
                            {Math.max(0, selectedM.attendedDays - selectedM.lateCount)}
                          </strong>
                          <span className="text-xs font-medium text-neutral-400">{translations.onTime || "on-time"}</span>
                        </div>
                        <span className={`text-[10px] font-mono mt-1 ${selectedM.lateCount > 0 ? "text-amber-400" : themeClass.textMuted}`}>
                          {selectedM.lateCount} {translations.latePunches || "late punch(es)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Comparative Hours and Performance Matrix Across Daily, Weekly, Monthly, Yearly & Cumulative */}
                  <div className={`p-6 rounded-3xl border shadow-md space-y-4 ${themeClass.cardBg}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] uppercase font-bold tracking-wider font-mono ${themeClass.textMuted}`}>
                        {translations.cumulativeHoursMatrix || "Timeframe Comparative Performance & Hours Matrix"}
                      </span>
                      <span className={`text-[10px] font-mono ${themeClass.textMuted}`}>
                        {translations.clickToSelectBasis || "Click a card to set active basis"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Daily Card */}
                      <div 
                        onClick={() => setWorkerTimeframe("daily")}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${themeClass.innerBg} ${
                          workerTimeframe === "daily" 
                            ? "border-cyan-400 shadow-md ring-1 ring-cyan-400/40" 
                            : `${themeClass.accentBorder} hover:border-cyan-500/40`
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${themeClass.textMuted}`}>
                            {translations.dailyShiftHours || "Daily Period"}
                          </span>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md font-bold ${
                            dailyM.performancePercentage >= 75 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {dailyM.performancePercentage.toFixed(1)}% {translations.perfAbbr || "Perf"}
                          </span>
                        </div>
                        <div className="mt-3 flex items-baseline space-x-1">
                          <strong className="text-2xl text-emerald-500 font-mono font-bold">{dailyM.workHours.toFixed(2)}</strong>
                          <span className="text-[10px] font-medium text-gray-400">{translations.hoursSuffix || "hours"}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                          <span>{dailyM.attendedDays}/{dailyM.expectedDays} {translations.days || "days"}</span>
                          <span>{dailyM.lateCount} {translations.late || "late"}</span>
                        </div>
                      </div>

                      {/* Weekly Card */}
                      <div 
                        onClick={() => setWorkerTimeframe("weekly")}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${themeClass.innerBg} ${
                          workerTimeframe === "weekly" 
                            ? "border-cyan-400 shadow-md ring-1 ring-cyan-400/40" 
                            : `${themeClass.accentBorder} hover:border-cyan-500/40`
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${themeClass.textMuted}`}>
                            {translations.weeklyAccumulated || "Weekly Period"}
                          </span>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md font-bold ${
                            weeklyM.performancePercentage >= 75 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {weeklyM.performancePercentage.toFixed(1)}% {translations.perfAbbr || "Perf"}
                          </span>
                        </div>
                        <div className="mt-3 flex items-baseline space-x-1">
                          <strong className="text-2xl text-amber-500 font-mono font-bold">{weeklyM.workHours.toFixed(2)}</strong>
                          <span className="text-[10px] font-medium text-gray-400">{translations.hoursSuffix || "hours"}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                          <span>{weeklyM.attendedDays}/{weeklyM.expectedDays} {translations.days || "days"}</span>
                          <span>{weeklyM.lateCount} {translations.late || "late"}</span>
                        </div>
                      </div>

                      {/* Monthly Card */}
                      <div 
                        onClick={() => setWorkerTimeframe("monthly")}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${themeClass.innerBg} ${
                          workerTimeframe === "monthly" 
                            ? "border-cyan-400 shadow-md ring-1 ring-cyan-400/40" 
                            : `${themeClass.accentBorder} hover:border-cyan-500/40`
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${themeClass.textMuted}`}>
                            {translations.monthlyTotalHours || "Monthly Period"}
                          </span>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md font-bold ${
                            monthlyM.performancePercentage >= 75 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {monthlyM.performancePercentage.toFixed(1)}% {translations.perfAbbr || "Perf"}
                          </span>
                        </div>
                        <div className="mt-3 flex items-baseline space-x-1">
                          <strong className="text-2xl text-indigo-400 font-mono font-bold">{monthlyM.workHours.toFixed(2)}</strong>
                          <span className="text-[10px] font-medium text-gray-400">{translations.hoursSuffix || "hours"}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                          <span>{monthlyM.attendedDays}/{monthlyM.expectedDays} {translations.days || "days"}</span>
                          <span>{monthlyM.lateCount} {translations.late || "late"}</span>
                        </div>
                      </div>

                      {/* Yearly Card */}
                      <div 
                        onClick={() => setWorkerTimeframe("yearly")}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${themeClass.innerBg} ${
                          workerTimeframe === "yearly" 
                            ? "border-cyan-400 shadow-md ring-1 ring-cyan-400/40" 
                            : `${themeClass.accentBorder} hover:border-cyan-500/40`
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${themeClass.textMuted}`}>
                            {translations.yearlyAggregatedTotal || "Yearly Period"}
                          </span>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md font-bold ${
                            yearlyM.performancePercentage >= 75 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {yearlyM.performancePercentage.toFixed(1)}% {translations.perfAbbr || "Perf"}
                          </span>
                        </div>
                        <div className="mt-3 flex items-baseline space-x-1">
                          <strong className={`text-2xl font-mono font-bold ${themeClass.accentText}`}>{yearlyM.workHours.toFixed(2)}</strong>
                          <span className="text-[10px] font-medium text-gray-400">{translations.hoursSuffix || "hours"}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                          <span>{yearlyM.attendedDays}/{yearlyM.expectedDays} {translations.days || "days"}</span>
                          <span>{yearlyM.lateCount} {translations.late || "late"}</span>
                        </div>
                      </div>

                      {/* Cumulative All-Time Card */}
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between sm:col-span-2 lg:col-span-2 ${themeClass.innerBg} ${themeClass.accentBorder}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${themeClass.textMuted}`}>
                            {translations.totalCumulativeHours || "Total Cumulative All-Time"}
                          </span>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-md font-bold bg-cyan-500/10 text-cyan-400">
                            {cumulativeM.performancePercentage.toFixed(1)}% {translations.perfAbbr || "Perf"}
                          </span>
                        </div>
                        <div className="mt-3 flex items-baseline space-x-1">
                          <strong className="text-2xl text-cyan-400 font-mono font-bold">{cumulativeM.workHours.toFixed(2)}</strong>
                          <span className="text-[10px] font-medium text-gray-400">{translations.hoursSuffix || "hours"}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                          <span>{cumulativeM.attendedDays}/{cumulativeM.expectedDays} {translations.cumulativeDays || "lifetime expected days"}</span>
                          <span>{cumulativeM.workHoursFormatted || "00:00:00"} {translations.totalDuration || "total duration"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {workerActiveSummaryTab === "history" && (() => {
              const latestDateStr = attendanceRecords.reduce(
                (max, r: any) => (r.date > max ? r.date : max),
                getLocalDateString()
              );
              const latestDate = parseLocalDate(latestDateStr);

              let startStr = "";
              let endStr = "";

              if (workerTimeframe === "daily") {
                startStr = latestDateStr;
                endStr = latestDateStr;
              } else if (workerTimeframe === "weekly") {
                const day = latestDate.getDay();
                const dStart = new Date(latestDate);
                dStart.setDate(latestDate.getDate() - day);
                const dEnd = new Date(dStart);
                dEnd.setDate(dStart.getDate() + 6);
                startStr = getLocalDateString(dStart);
                endStr = getLocalDateString(dEnd);
              } else if (workerTimeframe === "monthly") {
                const dStart = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
                const dEnd = new Date(latestDate.getFullYear(), latestDate.getMonth() + 1, 0);
                startStr = getLocalDateString(dStart);
                endStr = getLocalDateString(dEnd);
              } else if (workerTimeframe === "yearly") {
                const dStart = new Date(latestDate.getFullYear(), 0, 1);
                const dEnd = new Date(latestDate.getFullYear(), 11, 31);
                startStr = getLocalDateString(dStart);
                endStr = getLocalDateString(dEnd);
              }

              const workerLogs = attendanceRecords
                .filter((r: any) => r.date >= startStr && r.date <= endStr)
                .sort((a, b) => b.date.localeCompare(a.date));
              return (
                <div className="space-y-4 font-sans w-full">
                  {/* Worker Metrics Timeframe Basis - captured below Punch History tab, just above Attendance Log table */}
                  <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-2xl gap-4 ${themeClass.cardBg} w-full`}>
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
                              <th className="p-3">{translations.colDate || "Date"}</th>
                              <th className="p-3">{translations.colIn || "Check-in Time"}</th>
                              {!settings?.onlyShowTimeIn && <th className="p-3">{translations.colOut || "Check-out Time"}</th>}
                              <th className="p-3">{translations.attendanceStatusLabel || "Attendance Status"}</th>
                              <th className="p-3">{(settings?.onlyShowTimeIn !== false) ? (translations.arrivalTrackedLabel || "Arrival Record") : (translations.colCovered || "Shift Duration")}</th>
                              {!settings?.onlyShowTimeIn && <th className="p-3">{translations.colStatusOut || "Departure Status"}</th>}
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
                                  (p.startDate || p.date) <= log.date && 
                                  (p.endDate || p.date || p.startDate) >= log.date
                                );
                                const isOnLeaveAttended = Boolean(permission && (log.timeIn || log.statusIn));
                                const permissionStatus = permission 
                                  ? `${translations.approvedStatus || "Approved"} (${permission.type})` 
                                  : (translations.standardShiftLabel || "Standard Shift");
                                
                                return (
                                  <tr key={idx} className={`border-b duration-100 ${
                                    isOnLeaveAttended 
                                      ? "bg-amber-500/15 dark:bg-amber-950/40 border-amber-500/40 text-amber-900 dark:text-amber-200" 
                                      : themeClass.tableRowHover
                                  }`}>
                                    <td className={`p-3 font-sans font-medium ${themeClass.textTitle}`}>
                                      {formatPunchDate(log.date)}
                                    </td>
                                    <td className={`p-3 font-mono ${themeClass.textHighlight}`}>{log.timeIn || "--"}</td>
                                    {!settings?.onlyShowTimeIn && (
                                      <td className={`p-3 font-mono ${themeClass.textHighlight}`}>{log.timeOut || (translations.activeShiftLabel || "Active Shift")}</td>
                                    )}
                                    <td className="p-3">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {(() => {
                                          const statusUpper = (log.statusIn || "").toString().toUpperCase();
                                          if (statusUpper === "LATE") {
                                            return (
                                              <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold border uppercase bg-amber-500/10 text-amber-500 border-amber-500/20">
                                                LATE
                                              </span>
                                            );
                                          }
                                          if (statusUpper === "ABSENT") {
                                            return (
                                              <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold border uppercase bg-red-500/10 text-red-500 border-red-500/20">
                                                ABSENT
                                              </span>
                                            );
                                          }
                                          return (
                                            <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold border uppercase bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                              ON TIME
                                            </span>
                                          );
                                        })()}
                                        {isOnLeaveAttended && (
                                          <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40">
                                            On Leave
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className={`p-3 font-mono font-bold ${themeClass.accentText}`}>
                                    {settings?.onlyShowTimeIn !== false ? (translations.arrivalTrackedLabel || "Arrival Tracked") : `${hoursWorked} hrs`}
                                    </td>
                                    {!settings?.onlyShowTimeIn && (
                                      <td className="p-3">
                                        {log.statusOut === "Overtime" ? (
                                          <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                            Overtime
                                          </span>
                                        ) : log.statusOut === "Closing Time" || log.statusOut === "Auto Checkout" ? (
                                          <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                            {log.statusOut}
                                          </span>
                                        ) : (
                                          <span className={`text-[10px] ${themeClass.textMuted}`}>
                                            {log.statusOut || (log.timeOut ? "Normal Checkout" : "Active Shift")}
                                          </span>
                                        )}
                                      </td>
                                    )}
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
                                <td colSpan={settings?.onlyShowTimeIn !== false ? 5 : 7} className="p-8 text-center text-neutral-500 font-light">
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
                    theme={theme}
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

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showConfirmLogout && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 select-none"
            onClick={() => setShowConfirmLogout(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${themeClass.cardBg} rounded-3xl max-w-sm w-full p-6 text-center space-y-6 shadow-2xl border ${themeClass.accentBorder}`}
            >
              <div className="h-14 w-14 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl mx-auto flex items-center justify-center">
                <LogOut className="h-6 w-6" />
              </div>
              <div>
                <h4 className={`font-bold text-lg leading-snug ${themeClass.textTitle}`}>
                  {translations.confirmLogout || "Are you sure you want to sign out?"}
                </h4>
                <p className={`text-xs mt-1 ${themeClass.textMuted}`}>
                  Your shift session logs and pending activity will be saved securely.
                </p>
              </div>
              <div className="flex space-x-3 w-full">
                <button
                  id="worker_logout_yes"
                  onClick={() => {
                    setShowConfirmLogout(false);
                    onLogout();
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer min-h-[44px]"
                >
                  {translations.yes || "Yes, Sign Out"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmLogout(false)}
                  className={`flex-1 py-3 font-semibold text-xs rounded-xl active:scale-95 transition-all cursor-pointer min-h-[44px] ${
                    isDark
                      ? "bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800"
                      : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800"
                  }`}
                >
                  {translations.cancel || "Cancel"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Central Announcement Modal for Workers */}
      <WorkerCentralAnnouncementModal
        announcement={showAnnouncementModal ? activeAnnouncement : null}
        workerId={user.id}
        workerName={`${user.firstName} ${user.lastName}`}
        workerEmail={user.email}
        workerDepartment={user.department_id}
        tenantId={tenant.id}
        themeClass={themeClass}
        translations={translations}
        onDismiss={() => setShowAnnouncementModal(false)}
        onSubmitted={() => {
          setShowAnnouncementModal(false);
          setActiveAnnouncement(null);
        }}
      />

    </div>
  );
}
