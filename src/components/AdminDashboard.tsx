/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Mail,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  Sliders,
  Menu,
  BarChart3,
  RefreshCw,
  FolderSync,
  Search,
  Filter,
  Compass,
  ArrowRight,
  TrendingUp,
  Download,
  Shield,
  Briefcase,
  Layers,
  ArrowUpDown,
  BookOpen,
  QrCode,
  LogOut,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Building,
  Phone,
  AlertTriangle,
  LayoutGrid,
  List,
  Plus,
  Edit,
  Trash2,
  Settings,
  History,
  Bell,
  Info,
  Award,
  Check,
  Copy,
  Eye,
  EyeOff,
  Gauge,
  FastForward,
  CreditCard,
  Maximize,
  Minimize,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Columns,
  Sidebar,
  Lock,
  Unlock,
  Edit3,
  ClipboardCheck,
  ShieldCheck,
} from "lucide-react";
import { AnimatedMenuIcon } from "./AnimatedMenuIcon.js";
import { AnimatedQrCodeIcon } from "./AnimatedQrCodeIcon.js";
import { AnimatedBellIcon } from "./AnimatedBellIcon.js";
import { AnimatedFullscreenIcon } from "./AnimatedFullscreenIcon.js";
import { AtAGlanceAttendanceOverlay } from "./AtAGlanceAttendanceOverlay.js";
import { ApplicationCentralAnnouncementModal } from "./ApplicationCentralAnnouncementModal.js";
import { AttendanceStatus, PermissionStatus, UserRole } from "../types.js";
import { formatDateToCustomString, groupNotificationsByDate } from "../utils/dateFormatter.js";
import { formatPhoneNumber } from "../utils/phoneFormatter.js";
import { playCheckInSound } from "../utils/soundSynth.js";
import { formatDurationHHMMSS, calculateShiftSeconds } from "../utils/timeFormatter.js";
import { getAlternativeAttendanceCode } from "../utils/alternativeCode.js";
import { useFullscreenShortcut } from "../utils/useFullscreenShortcut.js";
import { Volume2 } from "lucide-react";
import CustomSelect from "./CustomSelect";
import { PwaInstallComponent } from "./PwaInstallButton.js";
import CustomDatePicker from "./CustomDatePicker";
import CustomTimePicker from "./CustomTimePicker";
import CustomSortDropdown from "./CustomSortDropdown";
import { useAdminViewModel } from "../viewmodels/useAdminViewModel.js";
import { IMAGES } from "../assets/assets.js";

function getLocalDateString(dateInput?: Date): string {
  const d = dateInput || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

interface AdminDashboardProps {
  user: any;
  tenant: any;
  subscription: any;
  initialSettings: any;
  translations: any;
  onLogout: () => void;
  onNotifyAdmin: (title: string, msg: string) => void;
  onSettingsChange?: (newSettings: any) => void;
  onSubscriptionChange?: (newSubscription: any) => void;
}

const generateBezierPaths = (
  pts: { x: number; y: number }[],
  yFloor: number,
) => {
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

export default function AdminDashboard({
  user,
  tenant,
  subscription: initialSub,
  initialSettings,
  translations,
  onLogout,
  onNotifyAdmin,
  onSettingsChange,
  onSubscriptionChange,
}: AdminDashboardProps) {
  const [showSplash, setShowSplash] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const [currentTenant, setCurrentTenant] = React.useState(tenant);
  const [companyProfileName, setCompanyProfileName] = React.useState(tenant?.name || "");
  const [companyProfileEmail, setCompanyProfileEmail] = React.useState(tenant?.email || "");
  const [companyProfilePhone, setCompanyProfilePhone] = React.useState(tenant?.phone || "");
  const [isSavingCompanyProfile, setIsSavingCompanyProfile] = React.useState(false);
  const [companyProfileSuccess, setCompanyProfileSuccess] = React.useState<string | null>(null);

  // Brand Profile Field Lock States (Double-tap to unlock & edit)
  const [isBrandNameLocked, setIsBrandNameLocked] = React.useState(true);
  const [isBrandEmailLocked, setIsBrandEmailLocked] = React.useState(true);
  const [isBrandNumberLocked, setIsBrandNumberLocked] = React.useState(true);
  const lastTapRef = React.useRef<{ [key: string]: number }>({});

  const handleFieldDoubleTap = (field: "name" | "email" | "phone") => {
    if (field === "name") {
      setIsBrandNameLocked(false);
      setTimeout(() => document.getElementById("company_profile_name_input")?.focus(), 50);
    } else if (field === "email") {
      setIsBrandEmailLocked(false);
      setTimeout(() => document.getElementById("company_profile_email_input")?.focus(), 50);
    } else if (field === "phone") {
      setIsBrandNumberLocked(false);
      setTimeout(() => document.getElementById("company_profile_phone_input")?.focus(), 50);
    }
  };

  const handleTouchTap = (field: "name" | "email" | "phone") => {
    const now = Date.now();
    const last = lastTapRef.current[field] || 0;
    if (now - last < 350) {
      handleFieldDoubleTap(field);
    }
    lastTapRef.current[field] = now;
  };

  const handleSaveCompanyProfile = async () => {
    setIsSavingCompanyProfile(true);
    setCompanyProfileSuccess(null);
    try {
      const res = await fetch("/api/admin/company-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenant?.id,
          name: companyProfileName,
          email: companyProfileEmail,
          phone: companyProfilePhone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update company profile.");
      }
      setCompanyProfileSuccess("Company profile updated and synchronized successfully.");
      onNotifyAdmin("Company Profile", "Company profile updated and synchronized successfully.");
      setIsBrandNameLocked(true);
      setIsBrandEmailLocked(true);
      setIsBrandNumberLocked(true);
      await syncAdminResources();
      setTimeout(() => setCompanyProfileSuccess(null), 4000);
    } catch (err: any) {
      onNotifyAdmin("Profile Update Error", err.message || "Failed to save company profile.");
    } finally {
      setIsSavingCompanyProfile(false);
    }
  };

  const {
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
    syncAdminResources,
  } = useAdminViewModel({
    user,
    tenant,
    initialSub,
    initialSettings,
    translations,
    onNotifyAdmin,
    onSettingsChange,
    onSubscriptionChange,
  });

  // Update Attendance Feature States (Declared here AFTER useAdminViewModel)
  const [showUpdateAttendanceModal, setShowUpdateAttendanceModal] = React.useState(false);
  const [selectedAttendanceWorkerId, setSelectedAttendanceWorkerId] = React.useState<string>("");
  const [attendanceWorkerSearch, setAttendanceWorkerSearch] = React.useState<string>("");
  const [showAttendanceFormModal, setShowAttendanceFormModal] = React.useState(false);

  const arrivalStatusDropdownOptions = React.useMemo(() => [
    {
      value: AttendanceStatus.PRESENT,
      label: (
        <div className="flex items-center space-x-2 py-0.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-xs">On Time</span>
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Punctual
          </span>
        </div>
      )
    },
    {
      value: AttendanceStatus.LATE,
      label: (
        <div className="flex items-center space-x-2 py-0.5">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="font-semibold text-xs">Late Arrival</span>
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Tardy
          </span>
        </div>
      )
    }
  ], []);

  const checkoutStatusDropdownOptions = React.useMemo(() => [
    {
      value: "Normal Checkout",
      label: (
        <div className="flex items-center space-x-2 py-0.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-xs">Normal Checkout</span>
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Standard
          </span>
        </div>
      )
    },
    {
      value: "Overtime",
      label: (
        <div className="flex items-center space-x-2 py-0.5">
          <Clock className="h-4 w-4 text-cyan-400 shrink-0" />
          <span className="font-semibold text-xs">Overtime</span>
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            Extra Hours
          </span>
        </div>
      )
    },
    {
      value: "Closing Time",
      label: (
        <div className="flex items-center space-x-2 py-0.5">
          <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0" />
          <span className="font-semibold text-xs">Closing Time</span>
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            Closing Window
          </span>
        </div>
      )
    },
    {
      value: "Early Departure",
      label: (
        <div className="flex items-center space-x-2 py-0.5">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          <span className="font-semibold text-xs">Early Departure</span>
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
            Early Exit
          </span>
        </div>
      )
    }
  ], []);
  const [attendanceFormMode, setAttendanceFormMode] = React.useState<"create" | "edit">("create");
  const [attendanceFormRecordId, setAttendanceFormRecordId] = React.useState<string>("");
  const [attendanceFormDate, setAttendanceFormDate] = React.useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [attendanceFormTimeIn, setAttendanceFormTimeIn] = React.useState<string>("08:30:00");
  const [attendanceFormStatusIn, setAttendanceFormStatusIn] = React.useState<AttendanceStatus>(AttendanceStatus.PRESENT);
  const [attendanceFormTimeOut, setAttendanceFormTimeOut] = React.useState<string>("17:00:00");
  const [attendanceFormStatusOut, setAttendanceFormStatusOut] = React.useState<string>("Normal Checkout");
  const [attendanceFormHasCheckout, setAttendanceFormHasCheckout] = React.useState<boolean>(true);

  // Confirmation modal state for Update Attendance actions
  const [attendanceConfirmData, setAttendanceConfirmData] = React.useState<{
    isOpen: boolean;
    actionType: "create" | "update" | "delete";
    workerId: string;
    workerName: string;
    recordId?: string;
    date: string;
    timeIn: string;
    statusIn: AttendanceStatus;
    timeOut?: string;
    statusOut?: string;
  } | null>(null);
  const [isProcessingAttendanceAction, setIsProcessingAttendanceAction] = React.useState(false);
  const [attendanceActionSuccess, setAttendanceActionSuccess] = React.useState<string | null>(null);

  // Open Create Attendance modal for currently selected worker
  const handleOpenCreateAttendance = () => {
    if (!selectedAttendanceWorkerId && workers.length > 0) {
      setSelectedAttendanceWorkerId(workers[0].id);
    }
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setAttendanceFormMode("create");
    setAttendanceFormRecordId("");
    setAttendanceFormDate(todayStr);
    setAttendanceFormTimeIn("08:30:00");
    setAttendanceFormStatusIn(AttendanceStatus.PRESENT);
    setAttendanceFormTimeOut("17:00:00");
    setAttendanceFormStatusOut("Normal Checkout");
    setAttendanceFormHasCheckout(false);
    setShowAttendanceFormModal(true);
  };

  // Open Edit Attendance modal for a specific record
  const handleOpenEditAttendance = (rec: any) => {
    setAttendanceFormMode("edit");
    setAttendanceFormRecordId(rec.id);
    setAttendanceFormDate(rec.date);
    setAttendanceFormTimeIn(rec.timeIn || "08:30:00");
    setAttendanceFormStatusIn(rec.statusIn || AttendanceStatus.PRESENT);
    setAttendanceFormTimeOut(rec.timeOut || "17:00:00");
    setAttendanceFormStatusOut(rec.statusOut || "Normal Checkout");
    setAttendanceFormHasCheckout(!!rec.timeOut);
    setShowAttendanceFormModal(true);
  };

  // Trigger Confirmation Modal from the Create / Edit Form
  const handlePromptAttendanceFormConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const targetWorkerId = selectedAttendanceWorkerId || workers[0]?.id;
    const targetWorker = workers.find((w) => w.id === targetWorkerId);
    const workerName = targetWorker ? `${targetWorker.firstName} ${targetWorker.lastName}` : "Selected Employee";

    if (!attendanceFormDate) {
      alert("Please specify a valid shift date.");
      return;
    }

    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;

    if (attendanceFormDate > todayStr) {
      alert("Future dates cannot be recorded or updated. Please select today or a past date.");
      return;
    }

    // Check for duplicate attendance record on the same date for this employee
    if (attendanceFormMode === "create") {
      const isDuplicate = (attendanceRecords || []).some(
        (r: any) => r.worker_id === targetWorkerId && r.date === attendanceFormDate
      );
      if (isDuplicate) {
        alert(`An attendance record already exists for ${workerName} on ${attendanceFormDate}. Duplicate records for the same date are not allowed. Please edit the existing record instead.`);
        return;
      }
    } else if (attendanceFormMode === "update") {
      const isDuplicate = (attendanceRecords || []).some(
        (r: any) => r.worker_id === targetWorkerId && r.date === attendanceFormDate && r.id !== attendanceFormRecordId
      );
      if (isDuplicate) {
        alert(`Another attendance record already exists for ${workerName} on ${attendanceFormDate}. Duplicate records for the same date are not allowed.`);
        return;
      }
    }

    if (!attendanceFormTimeIn) {
      alert("Please specify a valid check-in time.");
      return;
    }

    setAttendanceConfirmData({
      isOpen: true,
      actionType: attendanceFormMode,
      workerId: targetWorkerId,
      workerName,
      recordId: attendanceFormRecordId,
      date: attendanceFormDate,
      timeIn: attendanceFormTimeIn,
      statusIn: attendanceFormStatusIn,
      timeOut: attendanceFormHasCheckout ? attendanceFormTimeOut : undefined,
      statusOut: attendanceFormHasCheckout ? attendanceFormStatusOut : undefined,
    });
  };

  const handlePromptDeleteAttendanceConfirm = (rec: any) => {
    const targetWorker = workers.find((w) => w.id === rec.worker_id);
    const workerName = targetWorker ? `${targetWorker.firstName} ${targetWorker.lastName}` : "Employee";

    setAttendanceConfirmData({
      isOpen: true,
      actionType: "delete",
      workerId: rec.worker_id,
      workerName,
      recordId: rec.id,
      date: rec.date,
      timeIn: rec.timeIn,
      statusIn: rec.statusIn,
      timeOut: rec.timeOut,
      statusOut: rec.statusOut,
    });
  };

  // Execute the confirmed Attendance Action against the Backend API
  const handleExecuteAttendanceAction = async () => {
    if (!attendanceConfirmData) return;
    setIsProcessingAttendanceAction(true);
    try {
      if (attendanceConfirmData.actionType === "create") {
        const res = await fetch("/api/attendance/manual-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_id: tenant.id,
            worker_id: attendanceConfirmData.workerId,
            workerId: attendanceConfirmData.workerId,
            date: attendanceConfirmData.date,
            timeIn: attendanceConfirmData.timeIn,
            statusIn: attendanceConfirmData.statusIn,
            timeOut: attendanceConfirmData.timeOut || null,
            statusOut: attendanceConfirmData.statusOut || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to create attendance record.");
        }
        setAttendanceActionSuccess(`Shift record created successfully for ${attendanceConfirmData.workerName}.`);
        onNotifyAdmin("Attendance Created", `Shift record created for ${attendanceConfirmData.workerName}.`);
      } else if (attendanceConfirmData.actionType === "update") {
        const res = await fetch("/api/attendance/manual-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            record_id: attendanceConfirmData.recordId,
            id: attendanceConfirmData.recordId,
            recordId: attendanceConfirmData.recordId,
            tenant_id: tenant.id,
            worker_id: attendanceConfirmData.workerId,
            workerId: attendanceConfirmData.workerId,
            date: attendanceConfirmData.date,
            timeIn: attendanceConfirmData.timeIn,
            statusIn: attendanceConfirmData.statusIn,
            timeOut: attendanceConfirmData.timeOut || null,
            statusOut: attendanceConfirmData.statusOut || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update attendance record.");
        }
        setAttendanceActionSuccess(`Shift record updated successfully for ${attendanceConfirmData.workerName}.`);
        onNotifyAdmin("Attendance Updated", `Shift record updated for ${attendanceConfirmData.workerName}.`);
      } else if (attendanceConfirmData.actionType === "delete") {
        const res = await fetch("/api/attendance/manual-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            record_id: attendanceConfirmData.recordId,
            id: attendanceConfirmData.recordId,
            recordId: attendanceConfirmData.recordId,
            tenant_id: tenant.id,
            worker_id: attendanceConfirmData.workerId,
            date: attendanceConfirmData.date,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to delete attendance record.");
        }
        setAttendanceActionSuccess(`Shift record deleted successfully.`);
        onNotifyAdmin("Attendance Deleted", "Shift record deleted successfully.");
      }

      // Synchronize Admin resources
      await syncAdminResources();
      setShowAttendanceFormModal(false);
      setAttendanceConfirmData(null);
      setTimeout(() => setAttendanceActionSuccess(null), 4000);
    } catch (err: any) {
      onNotifyAdmin("Attendance Action Error", err.message || "Failed to apply update.");
    } finally {
      setIsProcessingAttendanceAction(false);
    }
  };

  const [showAdminNotifDrawer, setShowAdminNotifDrawer] = React.useState(false);
  const [isAtAGlanceOpen, setIsAtAGlanceOpen] = React.useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = React.useState(false);

  const [expandedPhotoUrl, setExpandedPhotoUrl] = React.useState<string | null>(null);

  const [selectedNotificationDetail, setSelectedNotificationDetail] = React.useState<any>(null);

  const groupedNotifications = React.useMemo(() => {
    return groupNotificationsByDate(notifications);
  }, [notifications]);

  const [localSettings, setLocalSettings] = React.useState<any>(null);
  
  // Custom states for newly requested features
  const [analyticsPeriodMode, setAnalyticsPeriodMode] = React.useState<"all" | "daily" | "weekly" | "monthly" | "yearly">("all");
  const [selectedAnalyticsDay, setSelectedAnalyticsDay] = React.useState<string>("all");
  const [selectedAnalyticsWeek, setSelectedAnalyticsWeek] = React.useState<string>("all");
  const [selectedAnalyticsMonth, setSelectedAnalyticsMonth] = React.useState<string>("all");
  const [selectedAnalyticsYear, setSelectedAnalyticsYear] = React.useState<string>("all");

  const [profilesViewMode, setProfilesViewMode] = React.useState<"card" | "list">("card");
  const [profilesSortField, setProfilesSortField] = React.useState<"name" | "title_role" | "department" | "phone" | "worker_status">("name");
  const [profilesSortOrder, setProfilesSortOrder] = React.useState<"asc" | "desc">("asc");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = React.useState(false);
  const [permissionsViewMode, setPermissionsViewMode] = React.useState<"card" | "list">("card");
  const [permissionsSortField, setPermissionsSortField] = React.useState<"name" | "reason" | "department">("name");
  const [permissionsSortOrder, setPermissionsSortOrder] = React.useState<"asc" | "desc">("asc");
  const [isPermissionsSortDropdownOpen, setIsPermissionsSortDropdownOpen] = React.useState(false);
  const [deptConfirmModal, setDeptConfirmModal] = React.useState<{
    type: "create" | "rename" | "delete" | "assign_worker";
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [showAddWorkerModal, setShowAddWorkerModal] = React.useState(false);
  const [showEditWorkerModal, setShowEditWorkerModal] = React.useState<any | null>(null);
  const [activeSummaryTab, setActiveSummaryTab] = React.useState<"info" | "analytics" | "hours" | "history" | "actions">("info");
  const [isAdminShiftAssessmentExpanded, setIsAdminShiftAssessmentExpanded] = React.useState<boolean>(true);
  const [isSummaryCardsExpanded, setIsSummaryCardsExpanded] = React.useState<boolean>(true);
  const [isAttendanceLogExpanded, setIsAttendanceLogExpanded] = React.useState<boolean>(true);
  const [isSearchFiltersExpanded, setIsSearchFiltersExpanded] = React.useState<boolean>(true);
  const [isShiftRegisterExpanded, setIsShiftRegisterExpanded] = React.useState<boolean>(true);
  const [isAnalyticsDeskExpanded, setIsAnalyticsDeskExpanded] = React.useState<boolean>(true);
  const [isLeaderboardExpanded, setIsLeaderboardExpanded] = React.useState<boolean>(true);
  const [isVerifyPermissionsExpanded, setIsVerifyPermissionsExpanded] = React.useState<boolean>(true);
  const [isPermissionsListExpanded, setIsPermissionsListExpanded] = React.useState<boolean>(true);
  const [isCorporateDirectoriesExpanded, setIsCorporateDirectoriesExpanded] = React.useState<boolean>(true);
  const [isWorkerCollectionListExpanded, setIsWorkerCollectionListExpanded] = React.useState<boolean>(true);
  const [isSideNavExpanded, setIsSideNavExpanded] = React.useState<boolean>(true);
  const [showMobileSideDrawer, setShowMobileSideDrawer] = React.useState<boolean>(false);
  const [isQrSecondaryOptionsExpanded, setIsQrSecondaryOptionsExpanded] = React.useState<boolean>(false);
  const [calendarViewYear, setCalendarViewYear] = React.useState(new Date().getFullYear());
  const [calendarViewMonth, setCalendarViewMonth] = React.useState(new Date().getMonth());
  const [selectedCalendarDay, setSelectedCalendarDay] = React.useState<any>(null);
  const [showManageDeptModal, setShowManageDeptModal] = React.useState(false);
  const [localNewDeptName, setLocalNewDeptName] = React.useState("");
  const [assignWorkerId, setAssignWorkerId] = React.useState("");
  const [assignDeptId, setAssignDeptId] = React.useState("");

  // Form states for worker management:
  const [workerFormFirstName, setWorkerFormFirstName] = React.useState("");
  const [workerFormLastName, setWorkerFormLastName] = React.useState("");
  const [workerFormEmail, setWorkerFormEmail] = React.useState("");
  const [workerFormPhone, setWorkerFormPhone] = React.useState("");
  const [workerFormRole, setWorkerFormRole] = React.useState<any>(UserRole.TEAM_MEMBER);
  const [workerFormDeptId, setWorkerFormDeptId] = React.useState("");
  const [workerFormGender, setWorkerFormGender] = React.useState("Not Specified");
  const [workerFormActivityDays, setWorkerFormActivityDays] = React.useState<{[key: string]: boolean}>({});

  const [leadModalDeptId, setLeadModalDeptId] = React.useState("");
  const [isAssignDropdownOpen, setIsAssignDropdownOpen] = React.useState(false);

  const prevModalWorkerIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (activeLeaderModal) {
      if (prevModalWorkerIdRef.current !== activeLeaderModal.id) {
        prevModalWorkerIdRef.current = activeLeaderModal.id;
        setLeadModalDeptId(activeLeaderModal.department_id || "");
        setActiveSummaryTab("info");
        setCalendarViewYear(new Date().getFullYear());
        setCalendarViewMonth(new Date().getMonth());
        setSelectedCalendarDay(null);
      }
    } else {
      prevModalWorkerIdRef.current = null;
      setLeadModalDeptId("");
    }
    setIsAssignDropdownOpen(false);
  }, [activeLeaderModal]);

  // Double Confirmation state:
  const [doubleConfirmState, setDoubleConfirmState] = React.useState<{
    step: 1 | 2;
    title: string;
    message: string;
    actionType?: "add" | "update" | "delete" | string;
    payload?: any;
    onConfirm: () => void;
  } | null>(null);

  // Custom Time wheel selection:
  const [isCustomWheelOpen, setIsCustomWheelOpen] = React.useState(false);

  // Location Proximity Scanner state:
  const [isRadarScanning, setIsRadarScanning] = React.useState(false);
  const [radarResult, setRadarResult] = React.useState<any>(null);

  const [isGatewayWorkspaceSelected, setIsGatewayWorkspaceSelected] =
    React.useState(false);
  const [analyticsViewTab, setAnalyticsViewTab] = React.useState<"workers" | "departments">(
    "workers",
  );
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);
  
  // Responsive chart sizing (Scaled 0.5x, fits container for at-a-glance view)
  const [chartDimensions, setChartDimensions] = React.useState({ width: 750, height: 290 });
  const chartContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!chartContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setChartDimensions({
          width: width || 750,
          height: height || 290,
        });
      }
    });
    observer.observe(chartContainerRef.current);
    return () => observer.disconnect();
  }, []);
  const [chartViewMode, setChartViewMode] = React.useState<"bar" | "line">(
    "line",
  );
  const [showResetLogoConfirm, setShowResetLogoConfirm] = React.useState(false);
  const [showClearNotifsConfirm, setShowClearNotifsConfirm] = React.useState(false);
  const [showUploadLogoConfirm, setShowUploadLogoConfirm] =
    React.useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = React.useState<File | null>(
    null,
  );
  const [timeframe, setTimeframe] = React.useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("daily");

  const [analyticsSearchQuery, setAnalyticsSearchQuery] = React.useState("");
  const [permissionsSearchQuery, setPermissionsSearchQuery] =
    React.useState("");
  const [profilesSearchQuery, setProfilesSearchQuery] = React.useState("");
  const [permissionsQueryTab, setPermissionsQueryTab] = React.useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");

  const totalPendingPermissions = React.useMemo(() => {
    return permissions.filter((p: any) => (p.status || "").toLowerCase() === "pending").length;
  }, [permissions]);

  const [leaderboardView, setLeaderboardView] = React.useState<
    "worker" | "department"
  >("worker");
  const [selectedLeaderboardWorker, setSelectedLeaderboardWorker] =
    React.useState<any | null>(null);

  // Full-Screen Dashboard Shortcut (CTRL+F / ESC)
  const { isFullscreen, toggleFullscreen } = useFullscreenShortcut();

  // Card Payment Gateway Modal States
  const [showCardModal, setShowCardModal] = React.useState(false);
  const [cardHolderName, setCardHolderName] = React.useState("");
  const [cardNumber, setCardNumber] = React.useState("");
  const [cardExpiry, setCardExpiry] = React.useState("");
  const [cardCvv, setCardCvv] = React.useState("");
  const [cardError, setCardError] = React.useState<string | null>(null);
  const [isProcessingCard, setIsProcessingCard] = React.useState(false);

  // Alternative 6-character code copied and visibility states
  const [copiedAltCode, setCopiedAltCode] = React.useState(false);
  const [showAltCode, setShowAltCode] = React.useState(true);

  React.useEffect(() => {
    if (selectedLeaderboardWorker) {
      const fresh = workers.find((w: any) => w.id === selectedLeaderboardWorker.id);
      if (fresh) {
        setSelectedLeaderboardWorker(fresh);
      }
    }
  }, [workers]);

  React.useEffect(() => {
    if (showEditWorkerModal) {
      const fresh = workers.find((w: any) => w.id === showEditWorkerModal.id);
      if (fresh) {
        setShowEditWorkerModal(fresh);
      }
    }
  }, [workers]);
  const [selectedLeaderboardDept, setSelectedLeaderboardDept] = React.useState<
    any | null
  >(null);
  const [modalTimeframe, setModalTimeframe] = React.useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("daily");

  // HR Worker Profiles Work Hours Audit Filter States
  const [auditTimeframe, setAuditTimeframe] = React.useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("daily");
  const [showAuditPickerModal, setShowAuditPickerModal] = React.useState<boolean>(false);
  const [auditSelectedDay, setAuditSelectedDay] = React.useState<
    "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday"
  >(() => {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
    return dayNames[new Date().getDay()] as any;
  });
  const [auditSelectedWeek, setAuditSelectedWeek] = React.useState<number>(() => {
    // Current ISO week number (1-52)
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.min(52, Math.max(1, Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)));
  });
  const [auditSelectedMonth, setAuditSelectedMonth] = React.useState<number>(() => new Date().getMonth());
  const [auditSelectedYear, setAuditSelectedYear] = React.useState<number>(() => new Date().getFullYear());

  const getPersonalWorkerMetrics = React.useCallback(
    (worker: any, tf: "daily" | "weekly" | "monthly" | "yearly" | "cumulative" = "monthly") => {
      if (!worker) {
        return {
          expectedDays: 0,
          attendedDays: 0,
          lateCount: 0,
          onTimeCount: 0,
          approvedPermissionDays: 0,
          absentDays: 0,
          inactiveDays: 0,
          overdueDays: 0,
          attendancePercentage: 0,
          availabilityPercentage: 0,
          performancePercentage: 0,
          workHours: 0
        };
      }

      // 1. Worker registration date
      const regDateStr = worker.createdAt ? worker.createdAt.substring(0, 10) : "2026-06-11";
      const registrationDate = new Date(regDateStr);

      // 2. Worker active work days
      const activeDays = worker.activityDays || settings?.activityDays || {
        Monday: true,
        Tuesday: true,
        Wednesday: true,
        Thursday: true,
        Friday: true,
        Saturday: false,
        Sunday: false
      };

      const dayOfWeekNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      const latestDateStr = attendanceRecords.reduce(
        (max, r) => (r.date > max ? r.date : max),
        "2026-07-04"
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

      let expectedDays = 0;
      let elapsedExpectedDays = 0;
      let attendedDays = 0;
      let lateCount = 0;
      let onTimeCount = 0;
      let approvedPermissionDays = 0;
      let absentDays = 0;
      let totalCoveredSeconds = 0;

      const todayStr = getLocalDateString();

      const cur = new Date(startDate);
      while (cur <= endDate) {
        const dateStr = getLocalDateString(cur);
        const dayName = dayOfWeekNames[cur.getDay()];
        const isActiveWorkDay = activeDays[dayName] === true;
        const isEmployed = dateStr >= regDateStr;
        const isFuture = dateStr > todayStr;

        if (isActiveWorkDay) {
          const hasPermission = permissions.some(p => 
            p.worker_id === worker.id && 
            (p.status || "").toLowerCase() === "approved" && 
            p.startDate <= dateStr && 
            p.endDate >= dateStr
          );

          if (hasPermission) {
            approvedPermissionDays++;
          } else {
            // Count total expected workdays scheduled for this timeframe
            expectedDays++;

            if (!isFuture && isEmployed) {
              elapsedExpectedDays++;

              const atts = attendanceRecords.filter(r => r.worker_id === worker.id && r.date === dateStr);
              const hasSuccessfulCheckin = atts.length > 0 && atts.some(r => 
                r.statusIn === "PRESENT" || r.statusIn === "present" || 
                r.statusIn === "LATE" || r.statusIn === "late"
              );

              if (hasSuccessfulCheckin) {
                attendedDays++;
                if (atts.some(r => r.statusIn === "LATE" || r.statusIn === "late")) {
                  lateCount++;
                } else if (atts.some(r => r.statusIn === "PRESENT" || r.statusIn === "present")) {
                  onTimeCount++;
                }

                // Calculate hours worked for this day from Punch History
                const r = atts[0];
                let hoursWorked = 0;
                if (r.timeIn && r.timeOut) {
                  const [h1, m1, s1] = r.timeIn.split(":").map(Number);
                  const [h2, m2, s2] = r.timeOut.split(":").map(Number);
                  const sIn = h1 * 3600 + m1 * 60 + (s1 || 0);
                  const sOut = h2 * 3600 + m2 * 60 + (s2 || 0);
                  if (sOut > sIn) {
                    hoursWorked = (sOut - sIn) / 3600;
                  } else if (r.coveredTime) {
                    hoursWorked = r.coveredTime / 3600;
                  } else {
                    hoursWorked = 0;
                  }
                } else if (r.coveredTime) {
                  hoursWorked = r.coveredTime / 3600;
                } else {
                  hoursWorked = 0;
                }
                totalCoveredSeconds += hoursWorked * 3600;
              } else {
                // Missed active workday from registration date up to present without permission -> Absent Flag
                absentDays++;
              }
            }
          }
        }

        cur.setDate(cur.getDate() + 1);
      }

      const performancePercentage = expectedDays > 0 
        ? Number(((attendedDays / expectedDays) * 100).toFixed(2)) 
        : 0.00;
      const attendancePercentage = expectedDays > 0 
        ? Number(((attendedDays / expectedDays) * 100).toFixed(2)) 
        : 0.00;
      const availabilityPercentage = (expectedDays + approvedPermissionDays) > 0 
        ? Math.min(100, Number((((attendedDays + approvedPermissionDays) / (expectedDays + approvedPermissionDays)) * 100).toFixed(2))) 
        : 100.00;

      const workHours = Number((totalCoveredSeconds / 3600).toFixed(2));

      return {
        expectedDays,
        attendedDays,
        lateCount,
        onTimeCount,
        approvedPermissionDays,
        absentDays,
        inactiveDays: 0,
        overdueDays: 0,
        attendancePercentage,
        availabilityPercentage,
        performancePercentage,
        workHours,
        registrationDate: regDateStr,
        activeDays
      };
    },
    [attendanceRecords, permissions, settings]
  );

  const calculateMetricsForTimeframe = React.useCallback(
    (workerId: string, tf: "daily" | "weekly" | "monthly" | "yearly") => {
      const w = workers.find(x => x.id === workerId);
      const m = getPersonalWorkerMetrics(w, tf);
      return {
        present: m.attendedDays,
        late: m.lateCount,
        exempt: m.approvedPermissionDays,
        perf: m.performancePercentage,
        eligible: m.expectedDays
      };
    },
    [workers, getPersonalWorkerMetrics]
  );

  const rankedLeaderboardForTimeframe = React.useMemo(() => {
    const list = workers
      .filter((w) => w.role !== UserRole.COMPANY_ADMIN)
      .map((w) => {
        const stats = calculateMetricsForTimeframe(w.id, timeframe);
        const deptLabel =
          departments.find((d) => d.id === w.department_id)?.name ||
          "Unassigned";
        return {
          ...w,
          deptLabel,
          perf: stats.perf,
          present: stats.present,
          late: stats.late,
          exempt: stats.exempt,
        };
      });
    return list.sort((a, b) => b.perf - a.perf);
  }, [workers, departments, timeframe, calculateMetricsForTimeframe]);

  const departmentAveragesForTimeframe = React.useMemo(() => {
    return departments.map((d) => {
      const unitWorkers = workers.filter((w) => w.department_id === d.id);
      if (unitWorkers.length === 0) return { ...d, avg: 0 };
      const sum = unitWorkers.reduce((acc, curr) => {
        return acc + calculateMetricsForTimeframe(curr.id, timeframe).perf;
      }, 0);
      const avg = Number((sum / unitWorkers.length).toFixed(2));
      return {
        ...d,
        avg,
      };
    });
  }, [departments, workers, timeframe, calculateMetricsForTimeframe]);

  const rankedDepartmentsForTimeframe = React.useMemo(() => {
    return departmentAveragesForTimeframe
      .map((d) => {
        const leadUser = workers.find((w) => w.id === d.leadId);
        const teamSize = workers.filter((w) => w.department_id === d.id).length;
        return {
          ...d,
          leadName: leadUser
            ? `${leadUser.firstName} ${leadUser.lastName}`
            : "No Lead Assigned",
          teamSize,
        };
      })
      .sort((a, b) => b.avg - a.avg);
  }, [departmentAveragesForTimeframe, workers]);

  const filteredLeaderboardForTimeframe = React.useMemo(() => {
    if (!analyticsSearchQuery.trim()) return rankedLeaderboardForTimeframe;
    const q = analyticsSearchQuery.toLowerCase();
    return rankedLeaderboardForTimeframe.filter((w) => {
      const first = w.firstName || "";
      const last = w.lastName || "";
      const dept = w.deptLabel || "";
      return (
        first.toLowerCase().includes(q) ||
        last.toLowerCase().includes(q) ||
        dept.toLowerCase().includes(q)
      );
    });
  }, [rankedLeaderboardForTimeframe, analyticsSearchQuery]);

  const filteredDepartmentsForTimeframe = React.useMemo(() => {
    if (!analyticsSearchQuery.trim()) return rankedDepartmentsForTimeframe;
    const q = analyticsSearchQuery.toLowerCase();
    return rankedDepartmentsForTimeframe.filter((d) => {
      const name = d.name || "";
      const lead = d.leadName || "";
      return name.toLowerCase().includes(q) || lead.toLowerCase().includes(q);
    });
  }, [rankedDepartmentsForTimeframe, analyticsSearchQuery]);

  const filteredWorkersForProfiles = React.useMemo(() => {
    let list = workers.filter((w) => w.role !== UserRole.COMPANY_ADMIN);
    if (profilesSearchQuery.trim()) {
      const q = profilesSearchQuery.toLowerCase();
      list = list.filter((w) => {
        const deptLabel =
          departments.find((d) => d.id === w.department_id)?.name || "";
        const first = w.firstName || "";
        const last = w.lastName || "";
        const title = w.title || "";
        const phone = w.phone || "";
        return (
          first.toLowerCase().includes(q) ||
          last.toLowerCase().includes(q) ||
          title.toLowerCase().includes(q) ||
          deptLabel.toLowerCase().includes(q) ||
          phone.toLowerCase().includes(q)
        );
      });
    }

    return [...list].sort((a, b) => {
      let valA = "";
      let valB = "";

      if (profilesSortField === "name") {
        valA = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase();
        valB = `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase();
      } else if (profilesSortField === "worker_status") {
        const isLeadA = a.role === UserRole.TEAM_LEAD || departments.some((d) => d.leadId === a.id);
        const isLeadB = b.role === UserRole.TEAM_LEAD || departments.some((d) => d.leadId === b.id);
        const statusA = isLeadA ? "Team Lead" : (a.role === UserRole.TEAM_MEMBER ? "Team Member" : a.role || "");
        const statusB = isLeadB ? "Team Lead" : (b.role === UserRole.TEAM_MEMBER ? "Team Member" : b.role || "");
        valA = statusA.trim().toLowerCase();
        valB = statusB.trim().toLowerCase();
      } else if (profilesSortField === "title_role") {
        valA = `${a.title || ""} ${a.role || ""}`.trim().toLowerCase();
        valB = `${b.title || ""} ${b.role || ""}`.trim().toLowerCase();
      } else if (profilesSortField === "department") {
        const deptA = departments.find((d) => d.id === a.department_id)?.name || "";
        const deptB = departments.find((d) => d.id === b.department_id)?.name || "";
        valA = deptA.trim().toLowerCase();
        valB = deptB.trim().toLowerCase();
      } else if (profilesSortField === "phone") {
        valA = (a.phone || "").replace(/\D/g, "");
        valB = (b.phone || "").replace(/\D/g, "");
      }

      if (valA < valB) return profilesSortOrder === "asc" ? -1 : 1;
      if (valA > valB) return profilesSortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [workers, profilesSearchQuery, departments, profilesSortField, profilesSortOrder]);

  const groupedLogs = React.useMemo(() => {
    const groups: { [date: string]: typeof filteredLogsList } = {};
    filteredLogsList.forEach((r) => {
      if (!groups[r.date]) {
        groups[r.date] = [];
      }
      groups[r.date].push(r);
    });
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({
        date,
        records: groups[date],
      }));
  }, [filteredLogsList]);

  const availableYears = React.useMemo(() => {
    const yearsSet = new Set<string>();
    const currentYr = new Date().getFullYear().toString();
    yearsSet.add(currentYr);
    yearsSet.add("2026");
    yearsSet.add("2025");
    yearsSet.add("2024");
    attendanceRecords.forEach((r) => {
      if (r.date) {
        const yr = r.date.split("-")[0];
        if (yr && yr.length === 4) yearsSet.add(yr);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [attendanceRecords]);

  const periodModeOptions = React.useMemo(() => [
    { value: "all", label: "All Periods" },
    { value: "daily", label: "Daily (Mon - Sun)" },
    { value: "weekly", label: "Weekly (W1 - W52)" },
    { value: "monthly", label: "Monthly Query" },
    { value: "yearly", label: "Yearly Query" },
  ], []);

  const daySelectOptions = React.useMemo(() => [
    { value: "all", label: "All Days (Mon - Sun)" },
    { value: "1", label: "Monday" },
    { value: "2", label: "Tuesday" },
    { value: "3", label: "Wednesday" },
    { value: "4", label: "Thursday" },
    { value: "5", label: "Friday" },
    { value: "6", label: "Saturday" },
    { value: "0", label: "Sunday" },
  ], []);

  const weekSelectOptions = React.useMemo(() => [
    { value: "all", label: "All Weeks (W01 - W52)" },
    ...Array.from({ length: 52 }, (_, i) => {
      const w = i + 1;
      const val = String(w).padStart(2, "0");
      return {
        value: val,
        label: `Week ${w} (W${val})`,
      };
    }),
  ], []);

  const monthSelectOptions = React.useMemo(() => [
    { value: "all", label: "All Months" },
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ], []);

  const yearSelectOptions = React.useMemo(() => [
    { value: "all", label: "All Years" },
    ...availableYears.map((yr) => ({
      value: yr,
      label: yr,
    })),
  ], [availableYears]);

  const getISOWeekRange = React.useCallback((yr: number, wk: number) => {
    const simple = new Date(yr, 0, 1 + (wk - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = new Date(simple);
    if (dow <= 4) {
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    const ISOweekEnd = new Date(ISOweekStart);
    ISOweekEnd.setDate(ISOweekStart.getDate() + 6);
    return {
      startStr: getLocalDateString(ISOweekStart),
      endStr: getLocalDateString(ISOweekEnd),
    };
  }, []);

  const getQueriedPeriodLabel = React.useCallback(() => {
    const monthNames: { [key: string]: string } = {
      "01": "January", "02": "February", "03": "March", "04": "April",
      "05": "May", "06": "June", "07": "July", "08": "August",
      "09": "September", "10": "October", "11": "November", "12": "December"
    };
    const dayNames: { [key: string]: string } = {
      "1": "Monday", "2": "Tuesday", "3": "Wednesday", "4": "Thursday",
      "5": "Friday", "6": "Saturday", "0": "Sunday"
    };

    if (analyticsPeriodMode === "daily") {
      const dayLabel = selectedAnalyticsDay === "all" ? "Mon - Sun" : (dayNames[selectedAnalyticsDay] || "Day");
      const yearLabel = selectedAnalyticsYear === "all" ? "" : ` ${selectedAnalyticsYear}`;
      return `Daily: ${dayLabel}${yearLabel}`;
    }

    if (analyticsPeriodMode === "weekly") {
      const weekLabel = selectedAnalyticsWeek === "all" ? "Weeks 1 - 52" : `Week ${parseInt(selectedAnalyticsWeek, 10)}`;
      const yearLabel = selectedAnalyticsYear === "all" ? "" : ` ${selectedAnalyticsYear}`;
      return `Weekly: ${weekLabel}${yearLabel}`;
    }

    if (analyticsPeriodMode === "yearly") {
      return selectedAnalyticsYear === "all" ? "All Years" : `Year ${selectedAnalyticsYear}`;
    }

    if (selectedAnalyticsMonth !== "all" && selectedAnalyticsYear !== "all") {
      return `${monthNames[selectedAnalyticsMonth] || selectedAnalyticsMonth} ${selectedAnalyticsYear}`;
    } else if (selectedAnalyticsMonth !== "all") {
      return `${monthNames[selectedAnalyticsMonth] || selectedAnalyticsMonth}`;
    } else if (selectedAnalyticsYear !== "all") {
      return `${selectedAnalyticsYear}`;
    }
    return "All Records";
  }, [analyticsPeriodMode, selectedAnalyticsDay, selectedAnalyticsWeek, selectedAnalyticsMonth, selectedAnalyticsYear]);

  const handleExportQueriedCsv = React.useCallback(() => {
    let records = attendanceRecords;
    if (selectedAnalyticsYear !== "all") {
      records = records.filter((r) => r.date.startsWith(selectedAnalyticsYear));
    }

    if (analyticsPeriodMode === "daily") {
      if (selectedAnalyticsDay !== "all") {
        const targetDay = parseInt(selectedAnalyticsDay, 10);
        records = records.filter((r) => parseLocalDate(r.date).getDay() === targetDay);
      }
    } else if (analyticsPeriodMode === "weekly") {
      if (selectedAnalyticsWeek !== "all") {
        const targetWeek = parseInt(selectedAnalyticsWeek, 10);
        const targetYear = parseInt(selectedAnalyticsYear !== "all" ? selectedAnalyticsYear : availableYears[0] || "2026", 10);
        const { startStr, endStr } = getISOWeekRange(targetYear, targetWeek);
        records = records.filter((r) => r.date >= startStr && r.date <= endStr);
      }
    } else if (analyticsPeriodMode === "monthly" || analyticsPeriodMode === "all") {
      if (selectedAnalyticsMonth !== "all") {
        records = records.filter((r) => {
          const parts = r.date.split("-");
          return parts[1] === selectedAnalyticsMonth;
        });
      }
    }

    let csvContent = "S/N,Date,Worker,Time In,Arrival Status,Time Out,Departure Status,Shift Duration (HH:MM:SS),Assigned Unit\n";
    records.forEach((r, idx) => {
      const worker = workers.find((w) => w.id === r.worker_id);
      const name = worker ? `${worker.firstName} ${worker.lastName}` : "Unknown Worker";
      const deptObj = departments.find((d) => d.id === (r.department_id || worker?.department_id));
      const dept = deptObj?.name || "Unassigned";
      const durationStr = formatDurationHHMMSS(r.coveredTime);
      csvContent += `${idx + 1},${r.date},"${name}",${r.timeIn},${r.statusIn},${r.timeOut || "-"},${r.statusOut || "-"},${durationStr},"${dept}"\n`;
    });

    const periodLabel = getQueriedPeriodLabel().replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `ClockIt_Attendance_${periodLabel}.csv`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    requestReportCompile("attendance", "csv");
  }, [attendanceRecords, workers, departments, analyticsPeriodMode, selectedAnalyticsDay, selectedAnalyticsWeek, selectedAnalyticsMonth, selectedAnalyticsYear, availableYears, getQueriedPeriodLabel, getISOWeekRange, requestReportCompile]);

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

  const dateIntervals = React.useMemo(() => {
    let intervals: { label: string; startDate: string; endDate: string; displayDate: string; dayIndex?: number }[] = [];

    const targetYearStr = selectedAnalyticsYear !== "all" ? selectedAnalyticsYear : (availableYears[0] || "2026");
    const targetYearNum = parseInt(targetYearStr, 10);

    if (analyticsPeriodMode === "daily") {
      const dayNames = [
        { idx: 1, name: "Monday", short: "Mon" },
        { idx: 2, name: "Tuesday", short: "Tue" },
        { idx: 3, name: "Wednesday", short: "Wed" },
        { idx: 4, name: "Thursday", short: "Thu" },
        { idx: 5, name: "Friday", short: "Fri" },
        { idx: 6, name: "Saturday", short: "Sat" },
        { idx: 0, name: "Sunday", short: "Sun" },
      ];

      if (selectedAnalyticsDay === "all") {
        // Monday through Sunday
        dayNames.forEach(({ idx, name, short }) => {
          intervals.push({
            label: name,
            startDate: `${targetYearStr}-01-01`,
            endDate: `${targetYearStr}-12-31`,
            displayDate: name,
            dayIndex: idx,
          });
        });
      } else {
        // Specific day across past 7 occurrences or throughout year
        const targetDay = parseInt(selectedAnalyticsDay, 10);
        const dayItem = dayNames.find((d) => d.idx === targetDay);
        const dayName = dayItem?.name || "Day";
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i * 7);
          while (d.getDay() !== targetDay) {
            d.setDate(d.getDate() - 1);
          }
          const dStr = getLocalDateString(d);
          intervals.push({
            label: `${dayName} (${formatGraphDateLabel(dStr)})`,
            startDate: dStr,
            endDate: dStr,
            displayDate: dStr,
            dayIndex: targetDay,
          });
        }
      }
      return intervals;
    }

    if (analyticsPeriodMode === "weekly") {
      if (selectedAnalyticsWeek === "all") {
        // Week 1 to Week 52 of each year
        for (let w = 1; w <= 52; w++) {
          const { startStr, endStr } = getISOWeekRange(targetYearNum, w);
          intervals.push({
            label: `W${w}`,
            startDate: startStr,
            endDate: endStr,
            displayDate: startStr,
          });
        }
      } else {
        // Specific week: Monday through Sunday
        const targetWeek = parseInt(selectedAnalyticsWeek, 10);
        const { startStr } = getISOWeekRange(targetYearNum, targetWeek);
        const startDate = parseLocalDate(startStr);
        const dayShorts = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        for (let d = 0; d < 7; d++) {
          const curD = new Date(startDate);
          curD.setDate(startDate.getDate() + d);
          const dStr = getLocalDateString(curD);
          intervals.push({
            label: `${dayShorts[d]} (${formatGraphDateLabel(dStr)})`,
            startDate: dStr,
            endDate: dStr,
            displayDate: dStr,
          });
        }
      }
      return intervals;
    }

    // Monthly & Yearly logic
    if (selectedAnalyticsMonth !== "all" || selectedAnalyticsYear !== "all" || analyticsPeriodMode === "monthly" || analyticsPeriodMode === "yearly") {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      if (selectedAnalyticsMonth !== "all" && selectedAnalyticsYear !== "all") {
        // Specific Month and Year (e.g., March 2026)
        const monthNum = parseInt(selectedAnalyticsMonth, 10);
        const daysInMonth = new Date(targetYearNum, monthNum, 0).getDate();
        const monthName = monthNames[monthNum - 1] || "Month";

        for (let day = 1; day <= daysInMonth; day++) {
          const pDay = day < 10 ? `0${day}` : `${day}`;
          const dateStr = `${selectedAnalyticsYear}-${selectedAnalyticsMonth}-${pDay}`;
          intervals.push({
            label: `${monthName} ${day}`,
            startDate: dateStr,
            endDate: dateStr,
            displayDate: dateStr,
          });
        }
      } else if (selectedAnalyticsMonth !== "all" && selectedAnalyticsYear === "all") {
        // Specific Month across available years
        const monthNum = parseInt(selectedAnalyticsMonth, 10);
        const daysInMonth = new Date(targetYearNum, monthNum, 0).getDate();
        const monthName = monthNames[monthNum - 1] || "Month";

        for (let day = 1; day <= daysInMonth; day++) {
          const pDay = day < 10 ? `0${day}` : `${day}`;
          const dateStr = `${targetYearStr}-${selectedAnalyticsMonth}-${pDay}`;
          intervals.push({
            label: `${monthName} ${day}`,
            startDate: dateStr,
            endDate: dateStr,
            displayDate: dateStr,
          });
        }
      } else if (selectedAnalyticsMonth === "all" && selectedAnalyticsYear !== "all") {
        // All Months in a specific year
        for (let m = 1; m <= 12; m++) {
          const pM = m < 10 ? `0${m}` : `${m}`;
          const startStr = `${selectedAnalyticsYear}-${pM}-01`;
          const daysInM = new Date(targetYearNum, m, 0).getDate();
          const pDays = daysInM < 10 ? `0${daysInM}` : `${daysInM}`;
          const endStr = `${selectedAnalyticsYear}-${pM}-${pDays}`;
          intervals.push({
            label: `${monthNames[m - 1]} ${selectedAnalyticsYear}`,
            startDate: startStr,
            endDate: endStr,
            displayDate: startStr,
          });
        }
      }
      return intervals;
    }

    // Default timeframe intervals (daily, weekly, monthly, yearly) when no month/year filter is set
    const todayStr = getLocalDateString(new Date());
    const maxRecordDate = attendanceRecords.reduce(
      (max, r) => (r.date > max ? r.date : max),
      "2026-06-29",
    );
    const latestDateStr = todayStr > maxRecordDate ? todayStr : maxRecordDate;
    const latestDate = parseLocalDate(latestDateStr);

    if (timeframe === "daily") {
      for (let i = 0; i < 7; i++) {
        const d = new Date(latestDate);
        d.setDate(d.getDate() - (6 - i));
        const dateStr = getLocalDateString(d);
        intervals.push({
          label: formatGraphDateLabel(dateStr),
          startDate: dateStr,
          endDate: dateStr,
          displayDate: dateStr,
        });
      }
    } else if (timeframe === "weekly") {
      for (let i = 0; i < 6; i++) {
        const dEnd = new Date(latestDate);
        dEnd.setDate(dEnd.getDate() - (5 - i) * 7);
        const dStart = new Date(dEnd);
        dStart.setDate(dStart.getDate() - 6);
        
        const endStr = getLocalDateString(dEnd);
        const startStr = getLocalDateString(dStart);
        intervals.push({
          label: `${formatGraphDateLabel(startStr)} - ${formatGraphDateLabel(endStr)}`,
          startDate: startStr,
          endDate: endStr,
          displayDate: endStr,
        });
      }
    } else if (timeframe === "monthly") {
      for (let i = 0; i < 6; i++) {
        const d = new Date(latestDate.getFullYear(), latestDate.getMonth() - (5 - i), 1);
        const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
        const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthLabel = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        
        intervals.push({
          label: monthLabel,
          startDate: getLocalDateString(startOfMonth),
          endDate: getLocalDateString(endOfMonth),
          displayDate: getLocalDateString(startOfMonth),
        });
      }
    } else if (timeframe === "yearly") {
      for (let i = 0; i < 6; i++) {
        const yr = latestDate.getFullYear() - (5 - i);
        const startOfYear = `${yr}-01-01`;
        const endOfYear = `${yr}-12-31`;
        
        intervals.push({
          label: yr.toString(),
          startDate: startOfYear,
          endDate: endOfYear,
          displayDate: startOfYear,
        });
      }
    }

    return intervals;
  }, [attendanceRecords, timeframe, analyticsPeriodMode, selectedAnalyticsDay, selectedAnalyticsWeek, selectedAnalyticsMonth, selectedAnalyticsYear, availableYears, formatGraphDateLabel, getISOWeekRange]);

  const workerTrendData = React.useMemo(() => {
    return dateIntervals.map((interval) => {
      const records = attendanceRecords.filter((r) => {
        if (selectedAnalyticsYear !== "all" && !r.date.startsWith(selectedAnalyticsYear)) {
          return false;
        }
        if (analyticsPeriodMode === "daily" && interval.dayIndex !== undefined) {
          if (selectedAnalyticsDay === "all") {
            return parseLocalDate(r.date).getDay() === interval.dayIndex;
          }
          return r.date === interval.startDate;
        }
        if (selectedAnalyticsMonth !== "all" && selectedAnalyticsYear !== "all" && analyticsPeriodMode === "monthly") {
          return r.date === interval.startDate;
        }
        return r.date >= interval.startDate && r.date <= interval.endDate;
      });

      const uniqueWorkers = new Set(records.map((r) => r.worker_id));
      const activeWorkerCount = uniqueWorkers.size;

      let perf = 0;
      if (records.length > 0) {
        const onTime = records.filter(
          (r) => r.statusIn === AttendanceStatus.PRESENT,
        ).length;
        perf = Math.round((onTime / records.length) * 100);
      }

      return {
        date: interval.displayDate,
        dateLabel: interval.label || formatGraphDateLabel(interval.displayDate),
        workerCount: activeWorkerCount,
        perf: perf,
      };
    });
  }, [dateIntervals, attendanceRecords, analyticsPeriodMode, selectedAnalyticsDay, selectedAnalyticsMonth, selectedAnalyticsYear, formatGraphDateLabel]);

  const deptTrendData = React.useMemo(() => {
    return dateIntervals.map((interval) => {
      const records = attendanceRecords.filter((r) => {
        if (selectedAnalyticsYear !== "all" && !r.date.startsWith(selectedAnalyticsYear)) {
          return false;
        }
        if (analyticsPeriodMode === "daily" && interval.dayIndex !== undefined) {
          if (selectedAnalyticsDay === "all") {
            return parseLocalDate(r.date).getDay() === interval.dayIndex;
          }
          return r.date === interval.startDate;
        }
        if (selectedAnalyticsMonth !== "all" && selectedAnalyticsYear !== "all" && analyticsPeriodMode === "monthly") {
          return r.date === interval.startDate;
        }
        return r.date >= interval.startDate && r.date <= interval.endDate;
      });

      const uniqueDepts = new Set(
        records
          .map((r) => {
            if (r.department_id) return r.department_id;
            const w = workers.find((w) => w.id === r.worker_id);
            return w?.department_id;
          })
          .filter(Boolean)
      );
      const activeDeptCount = uniqueDepts.size;

      let perf = 0;
      if (records.length > 0) {
        const onTime = records.filter(
          (r) => r.statusIn === AttendanceStatus.PRESENT,
        ).length;
        perf = Math.round((onTime / records.length) * 100);
      }

      return {
        date: interval.displayDate,
        dateLabel: interval.label || formatGraphDateLabel(interval.displayDate),
        workerCount: activeDeptCount,
        perf: perf,
      };
    });
  }, [dateIntervals, attendanceRecords, workers, analyticsPeriodMode, selectedAnalyticsDay, selectedAnalyticsMonth, selectedAnalyticsYear, formatGraphDateLabel]);

  const timeframeSummary = React.useMemo(() => {
    let records = attendanceRecords;
    if (selectedAnalyticsYear !== "all") {
      records = records.filter((r) => r.date.startsWith(selectedAnalyticsYear));
    }
    if (analyticsPeriodMode === "daily" && selectedAnalyticsDay !== "all") {
      const targetDay = parseInt(selectedAnalyticsDay, 10);
      records = records.filter((r) => parseLocalDate(r.date).getDay() === targetDay);
    } else if (analyticsPeriodMode === "weekly" && selectedAnalyticsWeek !== "all") {
      const targetWeek = parseInt(selectedAnalyticsWeek, 10);
      const targetYear = parseInt(selectedAnalyticsYear !== "all" ? selectedAnalyticsYear : availableYears[0] || "2026", 10);
      const { startStr, endStr } = getISOWeekRange(targetYear, targetWeek);
      records = records.filter((r) => r.date >= startStr && r.date <= endStr);
    } else if (selectedAnalyticsMonth !== "all") {
      records = records.filter((r) => {
        const parts = r.date.split("-");
        return parts[1] === selectedAnalyticsMonth;
      });
    }

    if (analyticsPeriodMode === "all" && selectedAnalyticsMonth === "all" && selectedAnalyticsYear === "all") {
      records = records.filter((r) =>
        dateIntervals.some(
          (inv) => r.date >= inv.startDate && r.date <= inv.endDate
        )
      );
    }

    const workerCount = new Set(records.map((r) => r.worker_id)).size;
    const deptCount = new Set(
      records
        .map(
          (r) =>
            r.department_id ||
            workers.find((w) => w.id === r.worker_id)?.department_id
        )
        .filter(Boolean)
    ).size;
    return { workerCount, deptCount };
  }, [attendanceRecords, dateIntervals, workers, analyticsPeriodMode, selectedAnalyticsDay, selectedAnalyticsWeek, selectedAnalyticsMonth, selectedAnalyticsYear, availableYears, getISOWeekRange]);

  const filteredPermissions = React.useMemo(() => {
    const list = permissions.filter((p) => {
      // 1. Filter by query tab (All, Pending, Approved, Rejected)
      if (permissionsQueryTab !== "all") {
        if ((p.status || "").toLowerCase() !== permissionsQueryTab) {
          return false;
        }
      }

      // 2. Filter by search query
      if (!permissionsSearchQuery.trim()) return true;
      const q = permissionsSearchQuery.toLowerCase();
      const targetUser = workers.find((w) => w.id === p.worker_id);
      const deptName = targetUser
        ? departments.find((d) => d.id === targetUser.department_id)?.name || ""
        : "";
      const first = targetUser?.firstName || "";
      const last = targetUser?.lastName || "";
      const fullName = `${first} ${last}`.trim();
      const reason = p.reason || "";
      const remarks = p.remarks || "";
      const notes = (p as any).notes || "";
      const comment = (p as any).comment || "";
      const pType = (p as any).type || "";
      const pDate = p.date || p.startDate || p.endDate || "";

      return (
        first.toLowerCase().includes(q) ||
        last.toLowerCase().includes(q) ||
        fullName.toLowerCase().includes(q) ||
        deptName.toLowerCase().includes(q) ||
        reason.toLowerCase().includes(q) ||
        remarks.toLowerCase().includes(q) ||
        notes.toLowerCase().includes(q) ||
        comment.toLowerCase().includes(q) ||
        pType.toLowerCase().includes(q) ||
        pDate.includes(q)
      );
    });

    return [...list].sort((a, b) => {
      const userA = workers.find((w) => w.id === a.worker_id);
      const userB = workers.find((w) => w.id === b.worker_id);

      let valA = "";
      let valB = "";

      if (permissionsSortField === "name") {
        valA = userA ? `${userA.firstName} ${userA.lastName}`.toLowerCase() : "";
        valB = userB ? `${userB.firstName} ${userB.lastName}`.toLowerCase() : "";
      } else if (permissionsSortField === "reason") {
        valA = (a.remarks || "").toLowerCase();
        valB = (b.remarks || "").toLowerCase();
      } else if (permissionsSortField === "department") {
        const deptA = departments.find((d) => d.id === userA?.department_id)?.name || "";
        const deptB = departments.find((d) => d.id === userB?.department_id)?.name || "";
        valA = deptA.toLowerCase();
        valB = deptB.toLowerCase();
      }

      if (valA < valB) return permissionsSortOrder === "asc" ? -1 : 1;
      if (valA > valB) return permissionsSortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [
    permissions,
    permissionsQueryTab,
    permissionsSearchQuery,
    workers,
    departments,
    permissionsSortField,
    permissionsSortOrder,
  ]);

  React.useEffect(() => {
    if (showSettingsMenu && settings) {
      const cloned = JSON.parse(JSON.stringify(settings));
      if (!cloned.dailyShiftTimes) {
        cloned.dailyShiftTimes = {};
      }
      if (!cloned.dailyShiftOutTimes) {
        cloned.dailyShiftOutTimes = {};
      }
      [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ].forEach((day) => {
        if (!cloned.dailyShiftTimes[day]) {
          cloned.dailyShiftTimes[day] = cloned.checkIn?.time || "08:00";
        }
        if (!cloned.dailyShiftOutTimes[day]) {
          cloned.dailyShiftOutTimes[day] = cloned.checkOut?.time || "17:00";
        }
      });
      setLocalSettings(cloned);
    } else {
      setLocalSettings(null);
    }
  }, [showSettingsMenu, settings]);

  React.useEffect(() => {
    if (activeTab === "permissions" || activeTab === "profiles") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeTab]);

  const tabRowRef = useRef<HTMLDivElement>(null);
  const summaryTabRowRef = useRef<HTMLDivElement>(null);
  const adminPunchHistoryRef = useRef<HTMLDivElement>(null);
  const attendanceTableContainerRef = useRef<HTMLDivElement>(null);
  const leaderboardTableContainerRef = useRef<HTMLDivElement>(null);
  const permissionsTableContainerRef = useRef<HTMLDivElement>(null);
  const profilesTableContainerRef = useRef<HTMLDivElement>(null);
  const workerGraphContainerRef = useRef<HTMLDivElement>(null);
  const deptGraphContainerRef = useRef<HTMLDivElement>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);

  // Shift Register Auto-Scroll & Progressive Speed Control logic
  const [isShiftRegisterAutoScroll, setIsShiftRegisterAutoScroll] = React.useState<boolean>(false);
  const [shiftRegisterScrollSpeed, setShiftRegisterScrollSpeed] = React.useState<number>(() => {
    try {
      const saved = localStorage.getItem("clockit_shift_register_scroll_speed");
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0.2 && parsed <= 5.0) {
          return parsed;
        }
      }
    } catch {}
    return 1.0;
  });
  const [isShiftRegisterHovered, setIsShiftRegisterHovered] = React.useState<boolean>(false);
  const isShiftRegisterResettingRef = React.useRef<boolean>(false);
  const shiftRegisterScrollSpeedRef = React.useRef<number>(shiftRegisterScrollSpeed);
  const isShiftRegisterHoveredRef = React.useRef<boolean>(isShiftRegisterHovered);
  const activeTabRef = React.useRef(activeTab);

  React.useEffect(() => {
    shiftRegisterScrollSpeedRef.current = shiftRegisterScrollSpeed;
  }, [shiftRegisterScrollSpeed]);

  React.useEffect(() => {
    isShiftRegisterHoveredRef.current = isShiftRegisterHovered;
  }, [isShiftRegisterHovered]);

  React.useEffect(() => {
    activeTabRef.current = activeTab;
    // Reset hover lock on tab switch so scrolling immediately applies to new tab
    setIsShiftRegisterHovered(false);
    isShiftRegisterHoveredRef.current = false;
  }, [activeTab]);

  React.useEffect(() => {
    if (!isShiftRegisterAutoScroll) return;

    let animationFrameId: number;
    let resetTimeout: NodeJS.Timeout | null = null;
    let lastTimestamp: number | null = null;

    const getActiveContainer = () => {
      const currentTab = activeTabRef.current;
      if (currentTab === "attendance") return attendanceTableContainerRef.current;
      if (currentTab === "analytics") return leaderboardTableContainerRef.current;
      if (currentTab === "permissions") return permissionsTableContainerRef.current;
      if (currentTab === "profiles") return profilesTableContainerRef.current;
      return attendanceTableContainerRef.current || leaderboardTableContainerRef.current || permissionsTableContainerRef.current || profilesTableContainerRef.current;
    };

    const scrollStep = (timestamp: number) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }
      // Calculate elapsed time in seconds, clamped to 0.1s to avoid jumps on tab switch
      const elapsedSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
      lastTimestamp = timestamp;

      const container = getActiveContainer();
      if (container && !isShiftRegisterHoveredRef.current && !isShiftRegisterResettingRef.current) {
        const isAtBottom =
          container.scrollTop + container.clientHeight >= container.scrollHeight - 3;
        if (isAtBottom) {
          isShiftRegisterResettingRef.current = true;
          container.scrollTo({ top: 0, behavior: "smooth" });
          resetTimeout = setTimeout(() => {
            isShiftRegisterResettingRef.current = false;
          }, 1200);
        } else {
          // Base rate: 36 pixels per second at 1.0x speed multiplier
          const currentSpeed = shiftRegisterScrollSpeedRef.current;
          const deltaScroll = 36 * currentSpeed * elapsedSeconds;
          container.scrollTop += deltaScroll;
        }
      }
      animationFrameId = requestAnimationFrame(scrollStep);
    };

    animationFrameId = requestAnimationFrame(scrollStep);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resetTimeout) clearTimeout(resetTimeout);
    };
  }, [isShiftRegisterAutoScroll]);

  const scrollContainer = (
    ref: React.RefObject<HTMLDivElement | null>,
    direction: "left" | "right",
  ) => {
    if (ref.current) {
      const amount = direction === "left" ? -280 : 280;
      ref.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  const handleNextTab = () => {
    const tabs: (
      "attendance" | "analytics" | "permissions" | "profiles" | "billing"
    )[] = ["attendance", "analytics", "permissions", "profiles", "billing"];
    const currentIdx = tabs.indexOf(activeTab);
    const nextIdx = (currentIdx + 1) % tabs.length;
    setActiveTab(tabs[nextIdx]);
    if (tabRowRef.current) {
      const el = tabRowRef.current;
      const step = el.scrollWidth / tabs.length;
      el.scrollTo({ left: step * nextIdx - 40, behavior: "smooth" });
    }
  };

  const handlePrevTab = () => {
    const tabs: (
      "attendance" | "analytics" | "permissions" | "profiles" | "billing"
    )[] = ["attendance", "analytics", "permissions", "profiles", "billing"];
    const currentIdx = tabs.indexOf(activeTab);
    const prevIdx = (currentIdx - 1 + tabs.length) % tabs.length;
    setActiveTab(tabs[prevIdx]);
    if (tabRowRef.current) {
      const el = tabRowRef.current;
      const step = el.scrollWidth / tabs.length;
      el.scrollTo({ left: step * prevIdx - 40, behavior: "smooth" });
    }
  };

  const handleNextSummaryTab = () => {
    const tabs: ("info" | "analytics" | "hours" | "history" | "actions")[] = [
      "info", "analytics", "hours", "history", "actions"
    ];
    const currentIdx = tabs.indexOf(activeSummaryTab);
    const nextIdx = (currentIdx + 1) % tabs.length;
    setActiveSummaryTab(tabs[nextIdx]);
    if (summaryTabRowRef.current) {
      const el = summaryTabRowRef.current;
      const step = el.scrollWidth / tabs.length;
      el.scrollTo({ left: step * nextIdx - 40, behavior: "smooth" });
    }
  };

  const handlePrevSummaryTab = () => {
    const tabs: ("info" | "analytics" | "hours" | "history" | "actions")[] = [
      "info", "analytics", "hours", "history", "actions"
    ];
    const currentIdx = tabs.indexOf(activeSummaryTab);
    const prevIdx = (currentIdx - 1 + tabs.length) % tabs.length;
    setActiveSummaryTab(tabs[prevIdx]);
    if (summaryTabRowRef.current) {
      const el = summaryTabRowRef.current;
      const step = el.scrollWidth / tabs.length;
      el.scrollTo({ left: step * prevIdx - 40, behavior: "smooth" });
    }
  };

  const theme = settings?.theme || "dark";

  const adminThemeClass = React.useMemo(() => {
    switch (theme) {
      case "army":
        return {
          bg: "bg-[#141C10] text-[#E5F3DD]",
          navBg: "bg-[#182313]/90 border-[#2C3E25]",
          cardBg: "bg-[#182413] border-[#2D3E24]",
          leadCardBg: "bg-gradient-to-br from-[#24381C] via-[#1C2C16] to-[#142010] border-emerald-500/60 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30",
          innerBg: "bg-[#25361E] border-[#374C2E]",
          textTitle: "text-[#E6F4DE]",
          textMuted: "text-[#A1C094]",
          accentText: "text-emerald-400",
          accentBorder: "border-[#4A633F]",
          buttonSelected:
            "bg-[#25361E] text-emerald-450 border border-[#436134]",
          tableRowHover: "hover:bg-[#1E2E18]/50 border-[#2C3E25]",
          tableRowDivider: "divide-[#2D3E24] border-[#2D3E24]",
          inputBg:
            "bg-[#182413] focus:bg-[#1E2C18] text-[#E5F3DD] border-[#2D3E24]",
        };
      case "navy":
        return {
          bg: "bg-[#0B132B] text-[#E1E8F0]",
          navBg: "bg-[#111A35]/95 border-[#1E2D5A]",
          cardBg: "bg-[#111A35] border-[#1E2D5A]",
          leadCardBg: "bg-gradient-to-br from-[#1A2A56] via-[#142044] to-[#0D152D] border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30",
          innerBg: "bg-[#182449] border-[#223363]",
          textTitle: "text-[#ECEFF4]",
          textMuted: "text-[#94A5C1]",
          accentText: "text-cyan-400",
          accentBorder: "border-[#223363]",
          buttonSelected: "bg-[#1E2D5A] text-cyan-400 border border-[#3A5096]",
          tableRowHover: "hover:bg-[#182449]/70 border-[#1E2D5A]",
          tableRowDivider: "divide-[#1E2D5A] border-[#1E2D5A]",
          inputBg:
            "bg-[#0E162E] focus:bg-[#142042] text-[#E1E8F0] border-[#223363]",
        };
      case "dark":
        return {
          bg: "bg-[#0A0A0A] text-[#E5E5E5]",
          navBg: "bg-[#0D0D0D]/90 border-[#262626]",
          cardBg: "bg-[#0D0D0D] border-[#262626]",
          leadCardBg: "bg-gradient-to-br from-[#162536] via-[#101B28] to-[#0A111A] border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30",
          innerBg: "bg-[#1A1A1A] border-[#262626]",
          textTitle: "text-white",
          textMuted: "text-neutral-400",
          accentText: "text-cyan-400",
          accentBorder: "border-[#262626]",
          buttonSelected: "bg-[#1A1A1A] text-cyan-400 border border-[#333]",
          tableRowHover: "hover:bg-[#121212]/50 border-[#262626]",
          tableRowDivider: "divide-[#262626] border-[#262626]",
          inputBg: "bg-[#111] focus:bg-[#151515] text-white border-[#262626]",
        };
      case "light":
      default:
        return {
          bg: "bg-neutral-50 text-neutral-800",
          navBg: "bg-white/90 border-neutral-200",
          cardBg: "bg-white border-neutral-200 shadow-sm",
          leadCardBg: "bg-gradient-to-br from-cyan-50/90 via-sky-50/70 to-blue-50/40 border-cyan-400/80 shadow-md shadow-cyan-100/60 ring-1 ring-cyan-400/40",
          innerBg: "bg-neutral-50 border-neutral-200",
          textTitle: "text-slate-900",
          textMuted: "text-slate-600",
          accentText: "text-cyan-600",
          accentBorder: "border-neutral-200",
          buttonSelected:
            "bg-white text-cyan-600 shadow-xs border border-neutral-200",
          tableRowHover: "hover:bg-neutral-50/50 border-neutral-200",
          tableRowDivider: "divide-neutral-200/60 border-neutral-200/60",
          inputBg:
            "bg-neutral-50 focus:bg-white text-slate-900 border-neutral-300",
        };
    }
  }, [theme]);

  const currentLayout = (localSettings?.layout || settings?.layout || "top") as "top" | "side";

  return (
    <div
      className={`min-h-screen flex ${
        currentLayout === "side" ? "flex-col md:flex-row" : "flex-col"
      } font-sans select-none pb-20 justify-start transition-colors duration-300 ${adminThemeClass.bg}`}
    >
      {/* ----------------- TOP NAV LAYOUT ----------------- */}
      {currentLayout === "top" && (
        <nav
          className={`px-6 py-4 border-b backdrop-blur-md flex items-center justify-between sticky top-0 z-30 shadow-xl transition-colors duration-300 ${adminThemeClass.navBg}`}
        >
          <div className="flex items-center space-x-3 select-none min-w-0">
            <div className="h-10 w-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white overflow-hidden shadow-lg shadow-cyan-950/45 transition-transform duration-300 hover:scale-105 select-none shrink-0">
              {companyLogoUrl ? (
                <img
                  src={companyLogoUrl}
                  alt="Company Logo"
                  className="h-full w-full object-cover select-none pointer-events-none"
                />
              ) : (
                <Shield className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <h1
                className={`font-display font-bold text-xs sm:text-sm md:text-base leading-tight whitespace-nowrap truncate max-w-[120px] sm:max-w-[200px] md:max-w-xs ${adminThemeClass.textTitle}`}
                title={tenant.name}
              >
                {tenant.name}
              </h1>
              <p
                className={`text-[9px] sm:text-[10px] font-mono tracking-wide whitespace-nowrap truncate max-w-[120px] sm:max-w-[200px] md:max-w-xs ${adminThemeClass.textMuted}`}
              >
                Admin Portal
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Notification Broadcaster Button */}
            <div className="relative">
              <button
                id="admin_open_notifications"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAdminNotifDrawer(!showAdminNotifDrawer);
                }}
                className={`group h-9 w-9 sm:h-10 sm:w-10 rounded-xl border flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 relative ${adminThemeClass.inputBg}`}
                title="System Notifications"
              >
                <AnimatedBellIcon className="h-4 w-4 text-cyan-400" />
                {notifications.filter((n: any) => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-cyan-500 text-black text-[8px] font-bold flex items-center justify-center shrink-0 animate-pulse">
                    {notifications.filter((n: any) => !n.read).length}
                  </span>
                )}
              </button>
            </div>

            {/* Fullscreen Mode Shortcut (CTRL+F / ESC) */}
            <button
              id="admin_fullscreen_toggle"
              onClick={toggleFullscreen}
              className={`group h-9 w-9 sm:h-10 sm:w-10 rounded-xl border flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 ${adminThemeClass.inputBg}`}
              title={isFullscreen ? "Exit Fullscreen (ESC)" : "Enter Fullscreen (CTRL+F)"}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4 text-cyan-400 group-hover:scale-115 group-active:scale-95 transition-transform duration-300" />
              ) : (
                <Maximize className="h-4 w-4 text-cyan-400 group-hover:scale-115 group-active:scale-95 transition-transform duration-300" />
              )}
            </button>

            {/* QR Code Action Button Beside Settings */}
            <button
              id="admin_open_qr"
              onClick={() => setShowQrModal(true)}
              className={`group h-9 w-9 sm:h-10 sm:w-10 rounded-xl border flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 ${adminThemeClass.inputBg}`}
              title="Terminal QR Code"
            >
              <AnimatedQrCodeIcon className="h-4 w-4 text-cyan-400" />
            </button>

            <button
              id="admin_open_settings"
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className={`group h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center cursor-pointer border transition-colors duration-200 ${adminThemeClass.inputBg}`}
              title={translations.settingsTitle}
            >
              <AnimatedMenuIcon className="h-4 w-4 text-cyan-400" />
            </button>
          </div>
        </nav>
      )}

      {/* ----------------- SIDE LAYOUT (DESKTOP ASIDE + MOBILE TOP BAR) ----------------- */}
      {currentLayout === "side" && (
        <>
          {/* Mobile Top Navbar for Side Layout */}
          <nav
            className={`md:hidden px-4 py-3 border-b backdrop-blur-md flex items-center justify-between sticky top-0 z-30 shadow-xl transition-colors duration-300 ${adminThemeClass.navBg}`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="h-9 w-9 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white overflow-hidden shadow-md shrink-0">
                {companyLogoUrl ? (
                  <img
                    src={companyLogoUrl}
                    alt="Company Logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className={`font-display font-bold text-xs leading-tight truncate ${adminThemeClass.textTitle}`}>
                  {tenant.name}
                </h1>
                <p className={`text-[9px] font-mono tracking-wide truncate ${adminThemeClass.textMuted}`}>
                  Admin Portal
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAdminNotifDrawer(!showAdminNotifDrawer);
                }}
                className={`h-8 w-8 rounded-xl border flex items-center justify-center cursor-pointer relative ${adminThemeClass.inputBg}`}
                title="System Notifications"
              >
                <AnimatedBellIcon className="h-3.5 w-3.5 text-cyan-400" />
                {notifications.filter((n: any) => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-cyan-500 text-black text-[7px] font-bold flex items-center justify-center">
                    {notifications.filter((n: any) => !n.read).length}
                  </span>
                )}
              </button>

              <button
                onClick={toggleFullscreen}
                className={`h-8 w-8 rounded-xl border flex items-center justify-center cursor-pointer ${adminThemeClass.inputBg}`}
                title="Fullscreen"
              >
                <AnimatedFullscreenIcon isFullscreen={isFullscreen} className="h-3.5 w-3.5 text-cyan-400" />
              </button>

              <button
                onClick={() => setShowQrModal(true)}
                className={`h-8 w-8 rounded-xl border flex items-center justify-center cursor-pointer ${adminThemeClass.inputBg}`}
                title="Terminal QR Code"
              >
                <AnimatedQrCodeIcon className="h-3.5 w-3.5 text-cyan-400" />
              </button>

              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className={`h-8 w-8 rounded-xl flex items-center justify-center cursor-pointer border ${adminThemeClass.inputBg}`}
                title={translations.settingsTitle}
              >
                <AnimatedMenuIcon className="h-3.5 w-3.5 text-cyan-400" />
              </button>
            </div>
          </nav>

          {/* Desktop Left Side Navigation */}
          <aside
            style={{ width: isSideNavExpanded ? "17rem" : "5rem" }}
            className={`hidden md:flex flex-col justify-between fixed left-0 top-0 bottom-0 h-screen z-40 border-r shadow-2xl backdrop-blur-md shrink-0 transition-all duration-300 group/sidebar ${adminThemeClass.navBg} ${adminThemeClass.accentBorder}`}
          >
            {/* Top Company Profile Header */}
            <div className={`p-4 border-b flex items-center ${isSideNavExpanded ? "justify-between gap-2" : "justify-center relative"} overflow-hidden border-neutral-200/10 dark:border-neutral-800/40`}>
              <div className={`flex items-center ${isSideNavExpanded ? "space-x-3 min-w-0 flex-1" : "justify-center"}`}>
                <div className="h-10 w-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white overflow-hidden shadow-lg shadow-cyan-950/45 select-none shrink-0">
                  {companyLogoUrl ? (
                    <img
                      src={companyLogoUrl}
                      alt="Company Logo"
                      className="h-full w-full object-cover select-none pointer-events-none"
                    />
                  ) : (
                    <Shield className="h-5 w-5 animate-pulse" />
                  )}
                </div>
                {isSideNavExpanded && (
                  <div className="min-w-0 flex-1">
                    <h1
                      className={`font-display font-bold text-xs sm:text-sm leading-tight truncate ${adminThemeClass.textTitle}`}
                      title={companyProfileName || currentTenant.name || tenant.name}
                    >
                      {companyProfileName || currentTenant.name || tenant.name}
                    </h1>
                    <div className="flex flex-col space-y-0.5 mt-0.5">
                      <p className={`text-[9px] font-mono tracking-wide truncate flex items-center gap-1 ${adminThemeClass.textMuted}`} title={companyProfileEmail || currentTenant.email || tenant.email}>
                        <Mail className="h-2.5 w-2.5 shrink-0 opacity-70" />
                        <span className="truncate">{companyProfileEmail || currentTenant.email || tenant.email || "No email linked"}</span>
                      </p>
                      <p className={`text-[9px] font-mono tracking-wide truncate flex items-center gap-1 ${adminThemeClass.textMuted}`} title={companyProfilePhone || currentTenant.phone || tenant.phone}>
                        <Phone className="h-2.5 w-2.5 shrink-0 opacity-70" />
                        <span className="truncate">{companyProfilePhone ? formatPhoneNumber(companyProfilePhone) : (currentTenant.phone ? formatPhoneNumber(currentTenant.phone) : (tenant.phone ? formatPhoneNumber(tenant.phone) : "No phone linked"))}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Middle Action Controls List */}
            <div className="flex-1 p-3 space-y-2.5 overflow-y-auto scrollbar-none">
              {isSideNavExpanded && (
                <div className="px-3 pt-2 pb-1">
                  <span className={`text-[9px] font-mono uppercase font-bold tracking-wider ${adminThemeClass.textMuted}`}>
                    Quick Actions & Controls
                  </span>
                </div>
              )}

              {/* 1. System Notifications */}
              <button
                id="side_admin_open_notifications"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAdminNotifDrawer(!showAdminNotifDrawer);
                }}
                className={`group/btn w-full p-2 rounded-xl border flex items-center transition-all duration-300 cursor-pointer ${
                  isSideNavExpanded ? "gap-3 px-3" : "justify-center px-1"
                } ${
                  showAdminNotifDrawer
                    ? "bg-cyan-500/15 border-cyan-500 text-cyan-400 shadow-md"
                    : `${adminThemeClass.inputBg} hover:border-cyan-500/40 hover:bg-neutral-500/5`
                }`}
                title="System Notifications"
              >
                <div className="relative w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 transition-colors duration-300 group-hover/btn:bg-cyan-500/20">
                  <AnimatedBellIcon className="h-4.5 w-4.5" />
                  {notifications.filter((n: any) => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-cyan-500 text-black text-[8px] font-bold flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                      {notifications.filter((n: any) => !n.read).length}
                    </span>
                  )}
                </div>
                {isSideNavExpanded && (
                  <div className="flex-1 text-left min-w-0 flex items-center justify-between">
                    <div>
                      <span className={`block font-semibold text-xs truncate ${adminThemeClass.textTitle}`}>
                        Notifications
                      </span>
                      <span className={`block text-[10px] truncate ${adminThemeClass.textMuted}`}>
                        {notifications.filter((n: any) => !n.read).length > 0
                          ? `${notifications.filter((n: any) => !n.read).length} active alerts`
                          : "Alert Broadcaster"}
                      </span>
                    </div>
                    {notifications.filter((n: any) => !n.read).length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500 text-black font-mono">
                        {notifications.filter((n: any) => !n.read).length}
                      </span>
                    )}
                  </div>
                )}
              </button>

              {/* 2. Fullscreen Mode Shortcut */}
              <button
                id="side_admin_fullscreen_toggle"
                type="button"
                onClick={toggleFullscreen}
                className={`group/btn w-full p-2 rounded-xl border flex items-center transition-all duration-300 cursor-pointer ${
                  isSideNavExpanded ? "gap-3 px-3" : "justify-center px-1"
                } ${adminThemeClass.inputBg} hover:border-cyan-500/40 hover:bg-neutral-500/5`}
                title={isFullscreen ? "Exit Fullscreen (ESC)" : "Enter Fullscreen (CTRL+F)"}
              >
                <div className="relative w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 transition-colors duration-300 group-hover/btn:bg-cyan-500/20">
                  {isFullscreen ? (
                    <Minimize className="h-4.5 w-4.5 transition-transform duration-300 group-hover/btn:scale-115 group-hover/btn:-rotate-6" />
                  ) : (
                    <Maximize className="h-4.5 w-4.5 transition-transform duration-300 group-hover/btn:scale-115 group-hover/btn:rotate-6" />
                  )}
                </div>
                {isSideNavExpanded && (
                  <div className="flex-1 text-left min-w-0">
                    <span className={`block font-semibold text-xs truncate ${adminThemeClass.textTitle}`}>
                      {isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
                    </span>
                    <span className={`block text-[10px] truncate ${adminThemeClass.textMuted}`}>
                      Toggle Display Mode
                    </span>
                  </div>
                )}
              </button>

              {/* 3. Terminal QR Code */}
              <button
                id="side_admin_open_qr"
                type="button"
                onClick={() => setShowQrModal(true)}
                className={`group/btn w-full p-2 rounded-xl border flex items-center transition-all duration-300 cursor-pointer ${
                  isSideNavExpanded ? "gap-3 px-3" : "justify-center px-1"
                } ${adminThemeClass.inputBg} hover:border-cyan-500/40 hover:bg-neutral-500/5`}
                title="Terminal QR Code"
              >
                <div className="relative w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 transition-colors duration-300 group-hover/btn:bg-cyan-500/20">
                  <AnimatedQrCodeIcon className="h-4.5 w-4.5" />
                </div>
                {isSideNavExpanded && (
                  <div className="flex-1 text-left min-w-0">
                    <span className={`block font-semibold text-xs truncate ${adminThemeClass.textTitle}`}>
                      Terminal QR Code
                    </span>
                    <span className={`block text-[10px] truncate ${adminThemeClass.textMuted}`}>
                      Mobile Check-In Terminal
                    </span>
                  </div>
                )}
              </button>

              {/* 4. Menu Settings */}
              <button
                id="side_admin_open_settings"
                type="button"
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className={`group/btn w-full p-2 rounded-xl border flex items-center transition-all duration-300 cursor-pointer ${
                  isSideNavExpanded ? "gap-3 px-3" : "justify-center px-1"
                } ${
                  showSettingsMenu
                    ? "bg-cyan-500/15 border-cyan-500 text-cyan-400 shadow-md"
                    : `${adminThemeClass.inputBg} hover:border-cyan-500/40 hover:bg-neutral-500/5`
                }`}
                title={translations.settingsTitle || "Menu Settings"}
              >
                <div className="relative w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 transition-colors duration-300 group-hover/btn:bg-cyan-500/20">
                  <AnimatedMenuIcon className="h-4.5 w-4.5" />
                </div>
                {isSideNavExpanded && (
                  <div className="flex-1 text-left min-w-0">
                    <span className={`block font-semibold text-xs truncate ${adminThemeClass.textTitle}`}>
                      {translations.settingsTitle || "Menu Settings"}
                    </span>
                    <span className={`block text-[10px] truncate ${adminThemeClass.textMuted}`}>
                      Layout, Themes & Options
                    </span>
                  </div>
                )}
              </button>
            </div>

            {/* Bottom Footer Area */}
            <div className="p-3 border-t border-neutral-200/10 dark:border-neutral-800/40 space-y-2">
              {/* Expand / Collapse Navigation Toggle Button */}
              <button
                id="side_admin_toggle_expand"
                type="button"
                onClick={() => setIsSideNavExpanded(!isSideNavExpanded)}
                className={`group/btn w-full p-2 rounded-xl border flex items-center transition-all duration-300 cursor-pointer ${
                  isSideNavExpanded ? "gap-3 px-3" : "justify-center px-1"
                } ${adminThemeClass.inputBg} hover:border-cyan-500/40 hover:bg-neutral-500/5`}
                title={isSideNavExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
              >
                <div className="relative w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 transition-colors duration-300 group-hover/btn:bg-cyan-500/20">
                  {isSideNavExpanded ? (
                    <PanelLeftClose className="h-4.5 w-4.5 transition-transform duration-300 group-hover/btn:scale-115 group-hover/btn:-rotate-12" />
                  ) : (
                    <PanelLeftOpen className="h-4.5 w-4.5 transition-transform duration-300 group-hover/btn:scale-115 group-hover/btn:rotate-12" />
                  )}
                </div>
                {isSideNavExpanded && (
                  <div className="flex-1 text-left min-w-0">
                    <span className={`block font-semibold text-xs truncate ${adminThemeClass.textTitle}`}>
                      Collapse Navigation
                    </span>
                    <span className={`block text-[10px] truncate ${adminThemeClass.textMuted}`}>
                      Compact icon view
                    </span>
                  </div>
                )}
              </button>

              {/* Sign-out button */}
              <button
                type="button"
                onClick={() => setShowConfirmLogout(true)}
                className={`group/btn w-full p-2 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 flex items-center transition-all duration-300 cursor-pointer ${
                  isSideNavExpanded ? "gap-3 px-3" : "justify-center px-1"
                }`}
                title="Log Out"
              >
                <div className="relative w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 transition-colors duration-300 group-hover/btn:bg-red-500/20">
                  <LogOut className="h-4.5 w-4.5 transition-transform duration-300 group-hover/btn:scale-115 group-hover/btn:translate-x-0.5" />
                </div>
                {isSideNavExpanded && (
                  <span className="font-bold text-xs truncate">
                    {translations.logout || "Log Out"}
                  </span>
                )}
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Main Content Area Wrapper */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          currentLayout === "side"
            ? isSideNavExpanded
              ? "md:ml-68"
              : "md:ml-20"
            : ""
        }`}
      >

      <AnimatePresence>
        {showAdminNotifDrawer && (
          <>
            <div 
              className="fixed inset-0 z-[9990] cursor-default bg-black/45 backdrop-blur-md" 
              onClick={() => { 
                setShowAdminNotifDrawer(false); 
                setSelectedNotificationDetail(null); 
              }} 
            />
            
            <div
              onClick={() => {
                setShowAdminNotifDrawer(false);
                setSelectedNotificationDetail(null);
              }}
              className="fixed top-20 left-4 right-4 max-h-[calc(100vh-6rem)] md:fixed md:top-20 md:left-auto md:right-6 md:w-auto md:max-h-[calc(100vh-6rem)] flex flex-col md:flex-row-reverse items-stretch md:items-start gap-4 z-[9991] pointer-events-auto overflow-y-auto pr-1"
            >
              {/* Mother Modal */}
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full md:w-80 h-[360px] sm:h-[400px] md:h-[420px] rounded-2xl border p-5 shadow-2xl flex flex-col transition-all duration-300 shrink-0 ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textTitle}`}
              >
                <div className={`flex items-center justify-between border-b pb-3 mb-4 shrink-0 ${adminThemeClass.accentBorder}`}>
                  <div className="flex items-center space-x-2">
                    <Bell className="h-4 w-4 text-cyan-400" />
                    <span className={`font-display font-bold text-sm ${adminThemeClass.textTitle}`}>Alert Broadcaster</span>
                  </div>
                  <button 
                    onClick={() => {
                      setShowAdminNotifDrawer(false);
                      setSelectedNotificationDetail(null);
                    }}
                    className={`font-light text-xs cursor-pointer ${adminThemeClass.textMuted} hover:${adminThemeClass.textHighlight}`}
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-4 overflow-y-auto flex-1 scrollbar-none pr-1">
                  {notifications.length === 0 ? (
                    <div className={`py-6 text-center text-xs font-light leading-relaxed ${adminThemeClass.textMuted}`}>
                      Broadcaster queue is clear. No active alerts.
                    </div>
                  ) : (
                    groupedNotifications.map((group, gIdx) => (
                      <div key={gIdx} className="space-y-2">
                        <div className={`sticky top-0 z-10 py-1 px-2.5 rounded-lg backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-500/20 flex items-center justify-between`}>
                          <span>{group.label}</span>
                          <span className={`text-[9px] font-mono font-normal ${adminThemeClass.textMuted}`}>
                            {group.items.length} alert{group.items.length > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {group.items.map((n: any, idx: number) => {
                            const isSelected = selectedNotificationDetail?.id === n.id;
                            return (
                              <div 
                                key={n.id || idx} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!n.read) {
                                    handleMarkNotifRead(n.id);
                                  }
                                  setSelectedNotificationDetail(n);
                                }}
                                className={`p-3 rounded-xl border flex items-start justify-between space-x-2.5 text-[11px] leading-relaxed transition-all cursor-pointer hover:bg-cyan-500/10 ${
                                  isSelected 
                                    ? `ring-2 ring-cyan-500 ${adminThemeClass.inputBg} ${adminThemeClass.accentBorder}`
                                    : n.read 
                                      ? `${adminThemeClass.inputBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textMuted}` 
                                      : `bg-cyan-500/5 border-cyan-500/20`
                                }`}
                              >
                                <div className="flex-1 min-w-0 font-normal">
                                  <strong className={`block font-semibold mb-0.5 truncate ${adminThemeClass.textTitle}`}>{n.title}</strong>
                                  <p className={n.read ? `${adminThemeClass.textMuted} line-clamp-2` : `${adminThemeClass.textHighlight} font-medium`}>{n.message}</p>
                                  <span className={`block text-[9px] tracking-wider font-mono mt-1.5 ${adminThemeClass.textMuted}`}>
                                    {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                {!n.read && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkNotifRead(n.id);
                                      setSelectedNotificationDetail(n);
                                    }}
                                    className={`text-[9px] font-bold hover:underline shrink-0 cursor-pointer text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-0.5 rounded-md`}
                                  >
                                    Read
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className={`border-t pt-3 mt-3 flex justify-between items-center shrink-0 ${adminThemeClass.accentBorder}`}>
                    <button
                      type="button"
                      onClick={handleMarkAllNotifsRead}
                      className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
                    >
                      Mark All As Read
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdminNotifDrawer(false);
                        setSelectedNotificationDetail(null);
                        setShowClearNotifsConfirm(true);
                      }}
                      className="text-[10px] font-bold text-red-400 hover:text-red-300 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </motion.div>

              {/* Child Modal (Detail Panel) */}
              {selectedNotificationDetail && (
                <motion.div
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full md:w-80 h-[360px] sm:h-[400px] md:h-[420px] rounded-2xl border p-5 shadow-2xl flex flex-col transition-all duration-300 shrink-0 ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textTitle}`}
                >
                  <div className={`flex items-center justify-between border-b pb-3 mb-4 shrink-0 ${adminThemeClass.accentBorder}`}>
                    <div className="flex items-center space-x-2 text-cyan-400">
                      <Info className="h-4 w-4" />
                      <span className="font-display font-bold text-sm">Alert Details</span>
                    </div>
                    <button 
                      onClick={() => setSelectedNotificationDetail(null)} 
                      className={`font-light text-sm cursor-pointer ${adminThemeClass.textMuted} hover:${adminThemeClass.textHighlight}`}
                    >
                      &times;
                    </button>
                  </div>
                  <div className="space-y-3 flex-1 flex flex-col min-h-0">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-cyan-400 shrink-0 truncate">
                      {selectedNotificationDetail.title}
                    </h4>
                    <div className={`text-xs leading-relaxed font-normal p-3 rounded-xl flex-1 overflow-y-auto whitespace-pre-wrap ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textHighlight}`}>
                      {selectedNotificationDetail.message}
                    </div>
                    <div className={`text-[10px] font-mono border-t pt-2 mt-2 shrink-0 ${adminThemeClass.accentBorder} ${adminThemeClass.textMuted} flex justify-between`}>
                      <span>Broadcaster Time:</span>
                      <span>{new Date(selectedNotificationDetail.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Primary Dashboard Body Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-8 select-none">
        {/* Verification Alert banners */}
        {subscription?.status === "trial" && (
          <div className="bg-amber-500 text-white px-5 py-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs select-none">
            <span className="flex items-center space-x-1.5">
              <span></span>
              <span>{translations.trialRemaining}</span>
            </span>
            <button
              onClick={() => setActiveTab("billing")}
              className="bg-white text-amber-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-opacity-90 active:scale-95 transition-all text-center min-h-[44px] flex items-center cursor-pointer"
            >
              Verify SaaS Account Billing
            </button>
          </div>
        )}

        {reportFeedback && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold font-mono">
             {reportFeedback}
          </div>
        )}

        {/* Dynamic Summary Cards Collapsible Container */}
        <div className={`rounded-3xl border shadow-md overflow-hidden transition-all duration-300 ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}>
          <div
            onClick={() => setIsSummaryCardsExpanded((prev) => !prev)}
            className={`p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors hover:bg-neutral-500/5 ${
              isSummaryCardsExpanded ? "border-b border-neutral-200/10" : ""
            }`}
            title={isSummaryCardsExpanded ? "Click to collapse summary metrics" : "Click to expand summary metrics"}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                isSummaryCardsExpanded ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" : `${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`
              }`}>
                {isSummaryCardsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
              <h3 className={`font-display font-semibold text-base sm:text-lg ${adminThemeClass.textTitle}`}>
                Executive Summary Metrics
              </h3>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:inline-block ${adminThemeClass.textMuted}`}>
                {isSummaryCardsExpanded ? "Click to Collapse" : "Click to Expand"}
              </span>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {isSummaryCardsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden p-4 sm:p-5"
              >
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div
                    className={`p-6 rounded-3xl border shadow-xl hover:brightness-110 active:brightness-95 transition-all ${adminThemeClass.cardBg}`}
                  >
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wide flex items-center space-x-1 ${adminThemeClass.textMuted}`}
                    >
                      <Clock className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>{translations.totCheckins}</span>
                    </span>
                    <h3
                      className={`text-3xl font-display font-bold mt-2 ${adminThemeClass.textTitle}`}
                    >
                      {formatCompact(attendanceRecords.length)}
                    </h3>
                  </div>

                  <div
                    className={`p-6 rounded-3xl border shadow-xl hover:brightness-110 active:brightness-95 transition-all ${adminThemeClass.cardBg}`}
                  >
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wide flex items-center space-x-1 ${adminThemeClass.textMuted}`}
                    >
                      <Users className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                      <span>{translations.activeToday}</span>
                    </span>
                    <h3
                      className={`text-3xl font-display font-bold mt-2 ${adminThemeClass.textTitle}`}
                    >
                      {
                        attendanceRecords.filter(
                          (a) => a.date === getLocalDateString(),
                        ).length
                      }
                    </h3>
                  </div>

                  <div
                    className={`p-6 rounded-3xl border shadow-xl hover:brightness-110 active:brightness-95 transition-all ${adminThemeClass.cardBg}`}
                  >
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wide flex items-center space-x-1 ${adminThemeClass.textMuted}`}
                    >
                      <Layers className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span>{translations.deptRatio}</span>
                    </span>
                    <h3
                      className={`text-3xl font-display font-bold mt-2 ${adminThemeClass.textTitle}`}
                    >
                      {(() => {
                        const todayStr2 = getLocalDateString();
                        const activeDeptsToday = new Set(
                          attendanceRecords
                            .filter((a) => a.date === todayStr2)
                            .map((a) => a.department_id)
                            .filter(Boolean),
                        );
                        return `${activeDeptsToday.size}/${departments.length}`;
                      })()}
                    </h3>
                  </div>

                  <div
                    className={`p-6 rounded-3xl border shadow-xl hover:brightness-110 active:brightness-95 transition-all ${adminThemeClass.cardBg}`}
                  >
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wide flex items-center space-x-1 ${adminThemeClass.textMuted}`}
                    >
                      <FileText className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                      <span>{translations.permRequests}</span>
                    </span>
                    <h3
                      className={`text-3xl font-display font-bold mt-2 ${adminThemeClass.textTitle}`}
                    >
                      {
                        permissions.filter((p) => p.status === PermissionStatus.PENDING)
                          .length
                      }
                    </h3>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Segment Tabs Navigation Card */}
        <div className="relative group w-full">
          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={handlePrevTab}
            className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full border shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-110 active:scale-90 cursor-pointer ${adminThemeClass.innerBg}`}
            title="Navigate to Previous Tab"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div
            ref={tabRowRef}
            className={`flex rounded-2xl p-1 shadow-lg border overflow-x-auto scrollbar-none whitespace-nowrap ${adminThemeClass.cardBg}`}
          >
            <button
              id="admin_tab_attendance"
              onClick={() => setActiveTab("attendance")}
              className={`px-6 py-3.5 text-xs sm:text-sm font-semibold rounded-xl text-center shrink-0 cursor-pointer transition-all flex items-center space-x-1.5 ${activeTab === "attendance" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/45 font-bold" : "text-neutral-550 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"}`}
            >
              <Clock className="h-4 w-4" />
              <span>{translations.tabAttendance}</span>
            </button>

            <button
              id="admin_tab_analytics"
              onClick={() => setActiveTab("analytics")}
              className={`px-6 py-3.5 text-xs sm:text-sm font-semibold rounded-xl text-center shrink-0 cursor-pointer transition-all flex items-center space-x-1.5 ${activeTab === "analytics" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/45 font-bold" : "text-neutral-550 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"}`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>{translations.tabAnalytics}</span>
            </button>

            <button
              id="admin_tab_permissions"
              onClick={() => setActiveTab("permissions")}
              className={`px-6 py-3.5 text-xs sm:text-sm font-semibold rounded-xl text-center shrink-0 cursor-pointer transition-all flex items-center space-x-1.5 relative ${activeTab === "permissions" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/45 font-bold" : "text-neutral-550 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"}`}
            >
              <FileText className="h-4 w-4" />
              <span>{translations.tabPermissions}</span>
              {totalPendingPermissions > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-lg animate-pulse z-10">
                  {totalPendingPermissions}
                </span>
              )}
            </button>

            <button
              id="admin_tab_profiles"
              onClick={() => setActiveTab("profiles")}
              className={`px-6 py-3.5 text-xs sm:text-sm font-semibold rounded-xl text-center shrink-0 cursor-pointer transition-all flex items-center space-x-1.5 ${activeTab === "profiles" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/45 font-bold" : "text-neutral-550 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"}`}
            >
              <Users className="h-4 w-4" />
              <span>{translations.tabProfiles}</span>
            </button>

            <button
              id="admin_tab_billing"
              onClick={() => setActiveTab("billing")}
              className={`px-6 py-3.5 text-xs sm:text-sm font-semibold rounded-xl text-center shrink-0 cursor-pointer transition-all flex items-center space-x-1.5 ${activeTab === "billing" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/45 font-bold" : "text-neutral-550 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"}`}
            >
              <Shield className="h-4 w-4" />
              <span>{translations.tabBilling || "Billing Workspace"}</span>
            </button>
          </div>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={handleNextTab}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full border border-neutral-200 dark:border-[#262626] bg-white/95 dark:bg-[#0D0D0D]/90 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-110 active:scale-90 cursor-pointer text-slate-700 dark:text-neutral-400"
            title="Navigate to Next Tab"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* -------------------- TAB AREA: ATTENDANCE LOGS -------------------- */}
        {activeTab === "attendance" && (
          <div className="space-y-6">
            {/* Filter Drawer - Expandable and Collapsible */}
            <div
              className={`rounded-3xl border shadow-xl overflow-hidden transition-all duration-300 ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
            >
              <div
                onClick={() => setIsSearchFiltersExpanded((prev) => !prev)}
                className={`p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors hover:bg-neutral-500/5 ${
                  isSearchFiltersExpanded ? "border-b border-neutral-200/10" : ""
                }`}
                title={isSearchFiltersExpanded ? "Click to collapse search filters" : "Click to expand search filters"}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                    isSearchFiltersExpanded ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" : `${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`
                  }`}>
                    {isSearchFiltersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    <h4
                      className={`font-display font-semibold text-base sm:text-lg ${adminThemeClass.textTitle}`}
                    >
                      Interactive Search Filters
                    </h4>
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  {(filterName || filterDept !== "all" || filterStatus !== "all" || filterDateStart || filterDateEnd) && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                      Active Filters
                    </span>
                  )}
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:inline-block ${adminThemeClass.textMuted}`}>
                    {isSearchFiltersExpanded ? "Click to Collapse" : "Click to Expand"}
                  </span>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isSearchFiltersExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden p-6 space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex flex-col space-y-1">
                        <label
                          className={`text-[10px] font-bold uppercase ${adminThemeClass.textMuted}`}
                        >
                          Search Employee
                        </label>
                        <div className="relative w-full">
                          <input
                            type="text"
                            placeholder="Search by worker name..."
                            value={filterName}
                            onChange={(e) => setFilterName(e.target.value)}
                            className="w-full border border-neutral-300 rounded-xl pl-4 pr-10 py-2.5 text-xs outline-none focus:border-cyan-500 min-h-[44px] bg-white text-neutral-900 placeholder-neutral-400 caret-neutral-900 cursor-text shadow-xs"
                          />
                          {filterName && (
                            <button
                              type="button"
                              onClick={() => setFilterName("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 p-1 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                              title="Clear Search"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col space-y-1">
                        <label
                          className={`text-[10px] font-bold uppercase ${adminThemeClass.textMuted}`}
                        >
                          Department
                        </label>
                        <CustomSelect
                          value={filterDept}
                          onChange={(val) => setFilterDept(val)}
                          className={`border rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-500 min-h-[44px] ${adminThemeClass.inputBg}`}
                          options={[
                            { value: "all", label: "All Departments" },
                            ...departments.map((d) => ({
                              value: d.id,
                              label: d.name,
                            })),
                          ]}
                          theme={theme}
                        />
                      </div>

                      <div className="flex flex-col space-y-1">
                        <label
                          className={`text-[10px] font-bold uppercase ${adminThemeClass.textMuted}`}
                        >
                          Arrival Flag
                        </label>
                        <CustomSelect
                          value={filterStatus}
                          onChange={(val) => setFilterStatus(val)}
                          className={`border rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-500 min-h-[44px] ${adminThemeClass.inputBg}`}
                          options={[
                            { value: "all", label: "Any Status Flag" },
                            { value: AttendanceStatus.PRESENT, label: "On Time" },
                            { value: AttendanceStatus.LATE, label: "Late Arrivals" },
                          ]}
                          theme={theme}
                        />
                      </div>

                      <div className="flex flex-col space-y-1">
                        <label
                          className={`text-[10px] font-bold uppercase ${adminThemeClass.textMuted}`}
                        >
                          Date Bounds
                        </label>
                        <div className="flex space-x-2">
                          <div className="w-1/2">
                            <CustomDatePicker
                              value={filterDateStart}
                              onChange={setFilterDateStart}
                              className={`border ${adminThemeClass.inputBg}`}
                              placeholder="Start Date"
                              theme={theme}
                            />
                          </div>
                          <div className="w-1/2">
                            <CustomDatePicker
                              value={filterDateEnd}
                              onChange={setFilterDateEnd}
                              className={`border ${adminThemeClass.inputBg}`}
                              placeholder="End Date"
                              alignRight={true}
                              theme={theme}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Exports triggers */}
                    <div
                      className={`flex justify-end pt-2 border-t mt-2 space-x-3 ${adminThemeClass.accentBorder}`}
                    >
                      <button
                        onClick={() => requestReportCompile("attendance", "csv")}
                        className={`px-4 py-2 border rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all min-h-[44px] cursor-pointer ${adminThemeClass.inputBg}`}
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>{translations.exportCsv}</span>
                      </button>
                      <button
                        onClick={() => requestReportCompile("attendance", "pdf")}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all shadow-md min-h-[44px] cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>{translations.exportPdf}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Attendance Double Tables: Check-In/Check-Out list */}
            <div
              className={`rounded-3xl border overflow-hidden shadow-xl transition-all duration-300 ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
            >
              <div
                onClick={() => setIsShiftRegisterExpanded((prev) => !prev)}
                className={`px-4 sm:px-6 py-3.5 sm:py-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none transition-colors hover:bg-neutral-500/5 ${adminThemeClass.innerBg} ${
                  isShiftRegisterExpanded ? "border-b border-neutral-200/10" : ""
                }`}
                title={isShiftRegisterExpanded ? "Click to collapse shift register" : "Click to expand shift register"}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                    isShiftRegisterExpanded ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" : `${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`
                  }`}>
                    {isShiftRegisterExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  <span
                    className={`font-black text-sm sm:text-base uppercase tracking-wider ${adminThemeClass.textTitle}`}
                  >
                    Shift Register
                  </span>
                  {isShiftRegisterAutoScroll && (
                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
                      Auto-Scrolling ({shiftRegisterScrollSpeed.toFixed(1)}x)
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3" onClick={(e) => e.stopPropagation()}>
                  {/* Auto-Scroll Switch Button */}
                  <div
                    id="shift_register_auto_scroll_toggle"
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border select-none cursor-pointer transition-all ${
                      isShiftRegisterAutoScroll
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-sm"
                        : "bg-neutral-500/10 border-neutral-500/20 text-neutral-500 dark:text-neutral-400 hover:border-neutral-500/40"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsShiftRegisterAutoScroll((prev) => !prev);
                    }}
                    title="Toggle Auto-Scrolling for Shift Register"
                  >
                    <span className="text-xs font-semibold whitespace-nowrap">
                      Auto-Scroll
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isShiftRegisterAutoScroll}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsShiftRegisterAutoScroll((prev) => !prev);
                      }}
                      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isShiftRegisterAutoScroll ? "bg-emerald-500" : "bg-neutral-400 dark:bg-neutral-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isShiftRegisterAutoScroll ? "translate-x-3" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Progressive Linear Speed-Control Bar */}
                  <AnimatePresence>
                    {isShiftRegisterAutoScroll && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -2 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -2 }}
                        transition={{ duration: 0.18 }}
                        id="shift_register_speed_control_bar"
                        className={`flex items-center space-x-2 px-2.5 sm:px-3 py-1 rounded-xl border select-none transition-all shadow-xs ${
                          theme === "light"
                            ? "bg-white border-neutral-200 text-slate-700"
                            : theme === "navy"
                            ? "bg-[#162344] border-[#253766] text-[#ECEFF4]"
                            : theme === "army"
                            ? "bg-[#1E2E18] border-[#374C2E] text-[#E6F4DE]"
                            : "bg-[#141414] border-[#262626] text-neutral-200"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center space-x-1 shrink-0 text-emerald-500">
                          <Sliders className="w-3.5 h-3.5" />
                          <span className="text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase">
                            Speed
                          </span>
                        </div>

                        {/* Linear Progressive Slider Track */}
                        <div className="flex items-center space-x-1 sm:space-x-1.5">
                          <span className="text-[9px] sm:text-[10px] text-neutral-400 font-mono hidden xs:inline">
                            0.2x
                          </span>
                          <div className="relative flex items-center w-16 sm:w-24 md:w-32">
                            <input
                              id="shift_register_speed_slider"
                              type="range"
                              min={0.2}
                              max={5.0}
                              step={0.1}
                              value={shiftRegisterScrollSpeed}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setShiftRegisterScrollSpeed(val);
                                localStorage.setItem("clockit_shift_register_scroll_speed", String(val));
                              }}
                              aria-label="Shift Register Auto-Scroll Speed"
                              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-500 bg-neutral-250 dark:bg-neutral-700 focus:outline-none"
                              style={{
                                background: `linear-gradient(to right, #10b981 0%, #10b981 ${((shiftRegisterScrollSpeed - 0.2) / (5.0 - 0.2)) * 100}%, ${
                                  theme === "light" ? "#e2e8f0" : "#2d3748"
                                } ${((shiftRegisterScrollSpeed - 0.2) / (5.0 - 0.2)) * 100}%, ${
                                  theme === "light" ? "#e2e8f0" : "#2d3748"
                                } 100%)`,
                              }}
                            />
                          </div>
                          <span className="text-[9px] sm:text-[10px] text-neutral-400 font-mono hidden xs:inline">
                            5.0x
                          </span>
                        </div>

                        {/* Dynamic Speed Value Pill */}
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0 min-w-[34px] text-center">
                          {shiftRegisterScrollSpeed.toFixed(1)}x
                        </span>

                        {/* Quick Preset Buttons on tablet & desktop */}
                        <div className="hidden lg:flex items-center space-x-1 pl-1 border-l border-neutral-500/20">
                          {[0.5, 1.0, 2.0, 4.0].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              id={`shift_register_preset_${preset}x`}
                              onClick={() => {
                                setShiftRegisterScrollSpeed(preset);
                                localStorage.setItem("clockit_shift_register_scroll_speed", String(preset));
                              }}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                                Math.abs(shiftRegisterScrollSpeed - preset) < 0.05
                                  ? "bg-emerald-500 text-white shadow-xs"
                                  : "text-neutral-400 hover:text-emerald-500 hover:bg-neutral-500/10"
                              }`}
                              title={`Set speed to ${preset}x`}
                            >
                              {preset}x
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="button"
                    id="at_a_glance_attendance_btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAtAGlanceOpen(!isAtAGlanceOpen);
                    }}
                    className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-sm ${
                      isAtAGlanceOpen
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-emerald-500/20"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                    }`}
                    title="A Glance Attendance Overlay"
                  >
                    <Eye className="w-4 h-4 shrink-0" />
                    <span>A Glance</span>
                  </button>

                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:inline-block ${adminThemeClass.textMuted}`}>
                    {isShiftRegisterExpanded ? "Click to Collapse" : "Click to Expand"}
                  </span>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isShiftRegisterExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="relative group/scroll w-full">
                {/* Top-center invisible down arrow button */}
                <button
                  type="button"
                  onClick={() => {
                    if (attendanceTableContainerRef.current) {
                      const el = attendanceTableContainerRef.current;
                      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
                    }
                  }}
                  className="absolute top-2 left-1/2 -translate-x-1/2 z-30 p-2 rounded-full bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-700 backdrop-blur-md opacity-0 hover:opacity-100 transition-opacity duration-200 cursor-pointer text-slate-700 dark:text-neutral-200 hover:scale-110 active:scale-95 shadow-md"
                  title="Scroll to Bottom"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>

                {/* Left invisible/hover scroll icon */}
                <button
                  type="button"
                  onClick={() =>
                    scrollContainer(attendanceTableContainerRef, "left")
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/40 dark:bg-black/40 border border-neutral-200 dark:border-neutral-850 backdrop-blur-md opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-200 cursor-pointer text-slate-700 dark:text-neutral-300 hover:scale-110 active:scale-95 shadow-sm"
                  title="Scroll Left"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div
                  ref={attendanceTableContainerRef}
                  onMouseEnter={() => setIsShiftRegisterHovered(true)}
                  onMouseLeave={() => setIsShiftRegisterHovered(false)}
                  onTouchStart={() => setIsShiftRegisterHovered(true)}
                  onTouchEnd={() => setIsShiftRegisterHovered(false)}
                  className="max-h-[600px] overflow-auto scrollbar-none"
                >
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className={`sticky top-0 z-20 ${adminThemeClass.innerBg} shadow-xs`}>
                      <tr
                        className={`border-b font-bold uppercase tracking-wider select-none text-[10px] ${adminThemeClass.innerBg} ${adminThemeClass.textMuted} ${adminThemeClass.accentBorder}`}
                      >
                        <th className={`p-4 ${adminThemeClass.innerBg}`}>{translations.sn}</th>
                        <th className={`p-4 ${adminThemeClass.innerBg}`}>{translations.colDate}</th>
                        <th className={`p-4 ${adminThemeClass.innerBg}`}>{translations.colWorker}</th>
                        <th className={`p-4 ${adminThemeClass.innerBg}`}>{translations.colIn}</th>
                        <th className={`p-4 ${adminThemeClass.innerBg}`}>{translations.colStatusIn}</th>
                        {settings.onlyShowTimeIn === false && (
                          <>
                            <th className={`p-4 ${adminThemeClass.innerBg}`}>{translations.colOut}</th>
                            <th className={`p-4 ${adminThemeClass.innerBg}`}>{translations.colStatusOut}</th>
                            <th className={`p-4 ${adminThemeClass.innerBg}`}>Shift Hours</th>
                          </>
                        )}
                        <th className={`p-4 ${adminThemeClass.innerBg}`}>{translations.colDept}</th>
                      </tr>
                    </thead>
                    <tbody
                      className={`divide-y font-sans ${adminThemeClass.tableRowDivider}`}
                    >
                      {groupedLogs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={settings.onlyShowTimeIn !== false ? 6 : 9}
                            className="p-10 text-center text-neutral-500 font-light"
                          >
                            No corresponding shift logs match check conditions.
                          </td>
                        </tr>
                      ) : (
                        groupedLogs.map((group) => {
                          const groupDateObj = new Date(group.date + "T00:00:00");
                          const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                          const groupDayName = dayNames[groupDateObj.getDay()];
                          const activeDays = settings?.activityDays || {
                            Monday: true, Tuesday: true, Wednesday: true, Thursday: true, Friday: true, Saturday: false, Sunday: false
                          };
                          const isGroupOffDay = activeDays[groupDayName] === false;

                          return (
                            <React.Fragment key={group.date}>
                              <tr className={`border-t border-b ${adminThemeClass.accentBorder} ${isGroupOffDay ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400" : adminThemeClass.innerBg}`}>
                                <td
                                  colSpan={settings.onlyShowTimeIn !== false ? 6 : 9}
                                  className={`px-4 py-3 font-bold font-mono text-[10px] uppercase tracking-wider ${isGroupOffDay ? "text-neutral-600 dark:text-neutral-400" : adminThemeClass.accentText}`}
                                >
                                  {formatDateToCustomString(group.date)}{isGroupOffDay ? " (Off-Day)" : ""}
                                </td>
                              </tr>
                              {group.records.map((r, idx) => {
                                const targetUser = workers.find(
                                  (w) => w.id === r.worker_id,
                                );
                                const fullName = targetUser
                                  ? `${targetUser.firstName} ${targetUser.lastName}`
                                  : "Unknown";
                                const deptName =
                                  departments.find((d) => d.id === r.department_id)
                                    ?.name || "Unassigned Unit";
                                const hasApprovedLeave = (permissions || []).some((p: any) => {
                                  if (p.worker_id !== r.worker_id) return false;
                                  if ((p.status || "").toLowerCase() !== "approved") return false;
                                  const pStart = p.startDate || p.date;
                                  const pEnd = p.endDate || p.date || pStart;
                                  if (pStart && pEnd) {
                                    return r.date >= pStart && r.date <= pEnd;
                                  }
                                  return pStart === r.date;
                                });
                                const isWorkerOffDay = isGroupOffDay || (targetUser?.activityDays ? targetUser.activityDays[groupDayName] === false : false);

                                return (
                                  <tr
                                    key={`${r.date}-${r.worker_id}-${idx}`}
                                    className={`transition-colors duration-100 border-b ${adminThemeClass.accentBorder} ${
                                      hasApprovedLeave
                                        ? "bg-amber-500/15 dark:bg-amber-950/40 border-amber-500/40 text-amber-900 dark:text-amber-200 hover:bg-amber-500/25"
                                        : isWorkerOffDay
                                        ? "bg-neutral-100 dark:bg-neutral-900/60 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60"
                                        : adminThemeClass.tableRowHover
                                    }`}
                                  >
                                  <td className="p-4 font-mono font-medium text-neutral-550">
                                    {idx + 1}
                                  </td>
                                  <td
                                    className={`p-4 font-mono font-normal ${adminThemeClass.textTitle}`}
                                  >
                                    {formatDateToCustomString(r.date)}
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center space-x-2.5">
                                      <img
                                        src={
                                          targetUser?.profilePhoto?.medium ||
                                          targetUser?.profilePhoto?.small ||
                                          IMAGES.defaultWorkerAvatar
                                        }
                                        alt=""
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedPhotoUrl(
                                            targetUser?.profilePhoto?.medium ||
                                            targetUser?.profilePhoto?.small ||
                                            IMAGES.defaultWorkerAvatar
                                          );
                                        }}
                                        className={`h-8 w-8 rounded-lg object-cover bg-neutral-100 border cursor-zoom-in hover:scale-110 transition-transform ${adminThemeClass.accentBorder}`}
                                        title="Click to expand profile picture"
                                      />
                                      <strong
                                        className={`font-bold ${adminThemeClass.textTitle}`}
                                      >
                                        {fullName}
                                      </strong>
                                    </div>
                                  </td>
                                  <td
                                    className={`p-4 font-mono ${adminThemeClass.textHighlight}`}
                                  >
                                    {r.timeIn}
                                  </td>
                                  <td className="p-4">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span
                                        className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${r.statusIn === AttendanceStatus.PRESENT ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30" : "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-850/30"}`}
                                      >
                                        {r.statusIn === AttendanceStatus.PRESENT
                                          ? "ON TIME"
                                          : "LATE"}
                                      </span>
                                      {hasApprovedLeave && (
                                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40">
                                          On Leave
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  {settings.onlyShowTimeIn === false && (
                                    <>
                                      <td
                                        className={`p-4 font-mono ${adminThemeClass.textHighlight}`}
                                      >
                                        {r.timeOut || "Active Shift"}
                                      </td>
                                      <td
                                        className={`p-4 font-normal ${adminThemeClass.textMuted}`}
                                      >
                                        {r.statusOut === "Overtime" ? (
                                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                            Overtime
                                          </span>
                                        ) : r.statusOut === "Closing Time" || r.statusOut === "Auto Checkout" ? (
                                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                            {r.statusOut}
                                          </span>
                                        ) : (
                                          r.statusOut || "In Progress"
                                        )}
                                      </td>
                                      <td
                                        className={`p-4 font-mono font-bold ${adminThemeClass.accentText}`}
                                      >
                                        {formatDurationHHMMSS(r.coveredTime)}
                                      </td>
                                    </>
                                  )}
                                  <td
                                    className={`p-4 font-medium ${adminThemeClass.textMuted}`}
                                  >
                                    {deptName}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Right invisible/hover scroll icon */}
                <button
                  type="button"
                  onClick={() =>
                    scrollContainer(attendanceTableContainerRef, "right")
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/40 dark:bg-black/40 border border-neutral-200 dark:border-neutral-850 backdrop-blur-md opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-200 cursor-pointer text-slate-700 dark:text-neutral-300 hover:scale-110 active:scale-95 shadow-sm"
                  title="Scroll Right"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Center-bottom invisible up arrow button */}
                <button
                  type="button"
                  onClick={() => {
                    if (attendanceTableContainerRef.current) {
                      const el = attendanceTableContainerRef.current;
                      el.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 p-2 rounded-full bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-700 backdrop-blur-md opacity-0 hover:opacity-100 transition-opacity duration-200 cursor-pointer text-slate-700 dark:text-neutral-200 hover:scale-110 active:scale-95 shadow-md"
                  title="Scroll to Top"
                >
                  <ChevronUp className="h-5 w-5" />
                </button>
              </div>

              <div
                className={`p-4 border-t text-[10px] font-semibold text-right ${adminThemeClass.innerBg} ${adminThemeClass.textMuted} ${adminThemeClass.accentBorder}`}
              >
                Records pagination active: Showing up to 200 records per
                dashboard requirement bounds.
              </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* -------------------- TAB AREA: ANALYTICS DESK -------------------- */}
        {activeTab === "analytics" && (
          <div className="space-y-8 select-none">
            {/* Analytics Desk: Executive Summary Metrics & Visual Graphs Container */}
            <div
              className={`rounded-3xl border shadow-xl overflow-hidden transition-all duration-300 ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
            >
              <div
                onClick={() => setIsAnalyticsDeskExpanded((prev) => !prev)}
                className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 cursor-pointer select-none transition-colors hover:bg-neutral-500/5 ${adminThemeClass.innerBg} ${
                  isAnalyticsDeskExpanded ? "border-b border-neutral-200/10" : ""
                }`}
                title={isAnalyticsDeskExpanded ? "Click to collapse analytics desk" : "Click to expand analytics desk"}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                    isAnalyticsDeskExpanded ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" : `${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`
                  }`}>
                    {isAnalyticsDeskExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  <div className="p-2.5 sm:p-3 bg-cyan-50 dark:bg-cyan-950/20 rounded-2xl border border-cyan-100 dark:border-cyan-900/30 shrink-0">
                    <BarChart3 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <h4
                      className={`font-bold text-sm ${adminThemeClass.textTitle}`}
                    >
                      {translations.tabAnalytics || "Analytics Desk"}
                    </h4>
                    <p className={`text-[11px] ${adminThemeClass.textMuted}`}>
                      {translations.precomputedMetrics ||
                        "Precomputed workspace metrics & query attendance graphs"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end lg:self-center" onClick={(e) => e.stopPropagation()}>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:inline-block ${adminThemeClass.textMuted}`}>
                    {isAnalyticsDeskExpanded ? "Click to Collapse" : "Click to Expand"}
                  </span>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isAnalyticsDeskExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden p-4 sm:p-6 space-y-6"
                  >

              {/* Month, Week, Day & Year Query Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className={`flex flex-wrap items-center gap-2.5 px-3.5 py-2 border rounded-2xl shadow-xs ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                >
                  <Calendar className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span className={`text-xs font-bold whitespace-nowrap ${adminThemeClass.textTitle}`}>
                    Queries Period:
                  </span>
                  
                  {/* Period Mode Selector */}
                  <div className="w-38 sm:w-44">
                    <CustomSelect
                      value={analyticsPeriodMode}
                      onChange={(val: any) => {
                        setAnalyticsPeriodMode(val);
                        if (val === "daily") {
                          setSelectedAnalyticsDay("all");
                        } else if (val === "weekly") {
                          setSelectedAnalyticsWeek("all");
                        } else if (val === "monthly") {
                          if (selectedAnalyticsMonth === "all") setSelectedAnalyticsMonth("01");
                        }
                      }}
                      options={periodModeOptions}
                      theme={theme}
                      className={`text-xs font-bold rounded-2xl px-3 py-1.5 border outline-none cursor-pointer transition-all shadow-xs min-h-[38px] ${adminThemeClass.inputBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textTitle}`}
                    />
                  </div>

                  {/* Dynamic Sub-query Dropdowns based on Period Mode */}
                  {analyticsPeriodMode === "daily" && (
                    <div className="w-36 sm:w-40">
                      <CustomSelect
                        value={selectedAnalyticsDay}
                        onChange={(val) => setSelectedAnalyticsDay(val)}
                        options={daySelectOptions}
                        theme={theme}
                        className={`text-xs font-bold rounded-2xl px-3 py-1.5 border outline-none cursor-pointer transition-all shadow-xs min-h-[38px] ${adminThemeClass.inputBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textTitle}`}
                      />
                    </div>
                  )}

                  {analyticsPeriodMode === "weekly" && (
                    <div className="w-38 sm:w-44">
                      <CustomSelect
                        value={selectedAnalyticsWeek}
                        onChange={(val) => setSelectedAnalyticsWeek(val)}
                        options={weekSelectOptions}
                        theme={theme}
                        className={`text-xs font-bold rounded-2xl px-3 py-1.5 border outline-none cursor-pointer transition-all shadow-xs min-h-[38px] ${adminThemeClass.inputBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textTitle}`}
                      />
                    </div>
                  )}

                  {(analyticsPeriodMode === "all" || analyticsPeriodMode === "monthly") && (
                    <div className="w-32 sm:w-36">
                      <CustomSelect
                        value={selectedAnalyticsMonth}
                        onChange={(val) => setSelectedAnalyticsMonth(val)}
                        options={monthSelectOptions}
                        theme={theme}
                        className={`text-xs font-bold rounded-2xl px-3 py-1.5 border outline-none cursor-pointer transition-all shadow-xs min-h-[38px] ${adminThemeClass.inputBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textTitle}`}
                      />
                    </div>
                  )}

                  {/* Custom Year Dropdown Modal */}
                  <div className="w-28 sm:w-32">
                    <CustomSelect
                      value={selectedAnalyticsYear}
                      onChange={(val) => setSelectedAnalyticsYear(val)}
                      options={yearSelectOptions}
                      theme={theme}
                      className={`text-xs font-bold rounded-2xl px-3 py-1.5 border outline-none cursor-pointer transition-all shadow-xs min-h-[38px] ${adminThemeClass.inputBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textTitle}`}
                    />
                  </div>

                  {(analyticsPeriodMode !== "all" || selectedAnalyticsMonth !== "all" || selectedAnalyticsYear !== "all" || selectedAnalyticsDay !== "all" || selectedAnalyticsWeek !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setAnalyticsPeriodMode("all");
                        setSelectedAnalyticsDay("all");
                        setSelectedAnalyticsWeek("all");
                        setSelectedAnalyticsMonth("all");
                        setSelectedAnalyticsYear("all");
                      }}
                      className="text-[11px] font-extrabold text-cyan-600 dark:text-cyan-400 hover:underline px-1.5 py-1 cursor-pointer"
                      title="Reset Query filter to All Records"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Export CSV Button */}
                <button
                  onClick={handleExportQueriedCsv}
                  className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white rounded-2xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all min-h-[44px] cursor-pointer shadow-md shrink-0"
                >
                  <Download className="h-4 w-4" />
                  <span>
                    {analyticsPeriodMode !== "all" || selectedAnalyticsMonth !== "all" || selectedAnalyticsYear !== "all"
                      ? `Export CSV (${getQueriedPeriodLabel()})`
                      : (translations.downloadCsv || "Download CSV Compiles")}
                  </span>
                </button>
              </div>

            {/* Custom SVG Charts of Workers Compare & Department Trends (Consolidated) */}
            <div
              className={`p-6 rounded-3xl border shadow-xl relative overflow-visible ${adminThemeClass.cardBg}`}
            >
              {/* Header and Switches */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <h4
                      className={`font-semibold text-base font-sans ${adminThemeClass.textTitle}`}
                      style={{ fontFamily: "Montserrat, sans-serif" }}
                    >
                      {analyticsViewTab === "workers"
                        ? (translations.workerPerformanceComparison || "Worker Attendance Performance Comparison")
                        : (translations.businessUnitAverages || "Department Performance Trends")}
                    </h4>
                    {(selectedAnalyticsMonth !== "all" || selectedAnalyticsYear !== "all") && (
                      <span className="px-2.5 py-0.5 text-[11px] font-extrabold rounded-full bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40">
                        Queried: {getQueriedPeriodLabel()}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs font-light mt-1 font-sans ${adminThemeClass.textMuted}`}
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    {selectedAnalyticsMonth !== "all" || selectedAnalyticsYear !== "all"
                      ? `Showing plotted attendance performance metrics specifically for ${getQueriedPeriodLabel()} across ${dateIntervals.length} date intervals.`
                      : (analyticsViewTab === "workers"
                        ? "Calculated active performance ratios based on the actual calendar days of each month."
                        : (translations.averagesCalculated || "Averages calculated across active team member sets."))}
                  </p>
                </div>

                {/* Switches */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* View Switching Tabs (Workers vs Departments) */}
                  <div
                    className={`flex rounded-2xl p-1 border select-none divide-x-0 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setAnalyticsViewTab("workers");
                        setHoveredIdx(null);
                      }}
                      className={`py-1.5 px-3.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${analyticsViewTab === "workers" ? `text-cyan-600 dark:text-cyan-400 shadow-sm font-extrabold ${adminThemeClass.cardBg}` : `hover:text-cyan-600 ${adminThemeClass.textMuted}`}`}
                      style={{ fontFamily: "Montserrat, sans-serif" }}
                    >
                      <span>Workers View</span>
                      <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-cyan-100 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 font-extrabold">
                        {timeframeSummary.workerCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAnalyticsViewTab("departments");
                        setHoveredIdx(null);
                      }}
                      className={`py-1.5 px-3.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${analyticsViewTab === "departments" ? `text-teal-600 dark:text-teal-400 font-bold shadow-sm font-extrabold ${adminThemeClass.cardBg}` : `hover:text-teal-600 ${adminThemeClass.textMuted}`}`}
                      style={{ fontFamily: "Montserrat, sans-serif" }}
                    >
                      <span>Departments View</span>
                      <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 font-extrabold">
                        {timeframeSummary.deptCount}
                      </span>
                    </button>
                  </div>

                  {/* Chart Type Toggle (Bar vs Line) */}
                  <div
                    className={`flex rounded-xl p-1 border shrink-0 select-none ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setChartViewMode("bar");
                        setHoveredIdx(null);
                      }}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${chartViewMode === "bar" ? `text-cyan-600 dark:text-cyan-400 shadow-xs font-bold ${adminThemeClass.cardBg}` : `text-gray-400 hover:text-cyan-600 ${adminThemeClass.textMuted}`}`}
                      title="Bar Chart"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setChartViewMode("line");
                        setHoveredIdx(null);
                      }}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${chartViewMode === "line" ? `text-cyan-600 dark:text-cyan-400 shadow-xs font-bold ${adminThemeClass.cardBg}` : `text-gray-400 hover:text-cyan-600 ${adminThemeClass.textMuted}`}`}
                      title="Line Graph"
                    >
                      <TrendingUp className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Chart Visual Section */}
              <div className="relative w-full overflow-hidden">
                {/* Graph Viewport (Scaled 0.5x, fits container for at-a-glance viewing) */}
                <div
                  ref={graphContainerRef}
                  className={`w-full rounded-3xl p-3 sm:p-5 border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                >
                  <div className="w-full h-[380px] flex flex-col justify-between select-none relative overflow-visible">
                    {/* The Chart SVG container */}
                    <div className="w-full flex-1 flex flex-col justify-between relative mt-1 overflow-visible">
                      <div
                        ref={chartContainerRef}
                        className="w-full h-[310px] flex items-end justify-start relative pb-1 overflow-hidden animate-fade-in"
                      >
                        {(() => {
                          const trendData = analyticsViewTab === "workers" ? workerTrendData : deptTrendData;
                          
                          // Fluid responsiveness: fills 100% of container width
                          const containerW = Math.max(chartDimensions.width, 320);
                          const height = Math.max(chartDimensions.height || 290, 200);

                          const width = containerW;
                          const axisLeft = 40;
                          const axisRightPadding = 20;
                          const axisRight = width - axisRightPadding;
                          const axisTop = 16;
                          const axisBottom = height - 26;
                          const plotWidth = Math.max(axisRight - axisLeft, 60);
                          const plotHeight = Math.max(axisBottom - axisTop, 40);

                          const isLine = chartViewMode === "line";

                          const barWidth = Math.min(36, Math.max(10, plotWidth / (trendData.length * 1.8)));
                          const barStart = axisLeft + barWidth / 2 + 4;
                          const barEnd = axisRight - barWidth / 2 - 4;
                          const barRange = Math.max(barEnd - barStart, 10);

                          // Helper to get exact X coordinate of a data point by index (evenly distributed across plotWidth):
                          const getX = (idx: number) => {
                            if (trendData.length <= 1) return axisLeft + plotWidth / 2;
                            if (isLine) {
                              const interval = plotWidth / (trendData.length - 1);
                              return axisLeft + idx * interval;
                            } else {
                              const interval = barRange / (trendData.length - 1);
                              return barStart + idx * interval;
                            }
                          };

                          const peak = Math.max(...trendData.map(d => d.workerCount), 1);
                          const maxVal = Math.ceil((peak * 1.15) / 4) * 4 || 4;

                          const getY = (count: number) => {
                            const ratio = count / maxVal;
                            return axisBottom - ratio * plotHeight;
                          };

                          const ticks = [
                            { label: String(maxVal), y: axisTop },
                            { label: String(Math.round(maxVal * 0.75)), y: axisTop + plotHeight * 0.25 },
                            { label: String(Math.round(maxVal * 0.5)), y: axisTop + plotHeight * 0.5 },
                            { label: String(Math.round(maxVal * 0.25)), y: axisTop + plotHeight * 0.75 },
                            { label: "0", y: axisBottom }
                          ];

                          const hoveredPoint = hoveredIdx !== null ? trendData[hoveredIdx] : null;

                          return (
                            <div
                              className="w-full h-full relative overflow-visible"
                            >
                              <svg
                                className="w-full h-full overflow-visible"
                                viewBox={`0 0 ${width} ${height}`}
                                preserveAspectRatio="none"
                              >
                                <defs>
                                  <linearGradient
                                    id="lineGrad"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                  >
                                    <stop
                                      offset="0%"
                                      stopColor={analyticsViewTab === "workers" ? "#06b6d4" : "#14b8a6"}
                                      stopOpacity="0.45"
                                    />
                                    <stop
                                      offset="100%"
                                      stopColor={analyticsViewTab === "workers" ? "#06b6d4" : "#14b8a6"}
                                      stopOpacity="0.0"
                                    />
                                  </linearGradient>
                                  <linearGradient id="workerBarGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#06b6d4" />
                                    <stop offset="100%" stopColor="#2563eb" />
                                  </linearGradient>
                                  <linearGradient id="deptBarGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#14b8a6" />
                                    <stop offset="100%" stopColor="#059669" />
                                  </linearGradient>
                                </defs>

                                {/* Y-Axis Calibration Text and Tick Lines */}
                                {ticks.map((tick, tIdx) => (
                                  <g key={tIdx} className="opacity-80">
                                    {/* Grid line */}
                                    <line
                                      x1={axisLeft}
                                      y1={tick.y}
                                      x2={axisRight}
                                      y2={tick.y}
                                      stroke="#888888"
                                      strokeOpacity="0.15"
                                      strokeDasharray="4 3"
                                    />
                                    {/* Text Label */}
                                    <text
                                      x={axisLeft - 6}
                                      y={tick.y + 3.5}
                                      textAnchor="end"
                                      className="text-[10px] sm:text-xs font-semibold fill-slate-500 dark:fill-neutral-400 font-sans"
                                      style={{ fontFamily: 'Montserrat, sans-serif' }}
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
                                  strokeOpacity="0.3"
                                  strokeWidth="1.2"
                                />
                                <line
                                  x1={axisLeft}
                                  y1={axisBottom}
                                  x2={axisRight}
                                  y2={axisBottom}
                                  stroke="#888888"
                                  strokeOpacity="0.3"
                                  strokeWidth="1.2"
                                />

                                {/* 1. BAR CHART PRESENTATION */}
                                {chartViewMode === "bar" && trendData.map((d, idx) => {
                                  const x = getX(idx);
                                  const y = getY(d.workerCount);
                                  const rectHeight = axisBottom - y;
                                  return (
                                    <rect
                                      key={idx}
                                      x={x - barWidth / 2}
                                      y={y}
                                      width={barWidth}
                                      height={Math.max(rectHeight, 2)}
                                      rx="4"
                                      fill={analyticsViewTab === "workers" ? "url(#workerBarGrad)" : "url(#deptBarGrad)"}
                                      className="transition-all duration-300 hover:brightness-110 cursor-pointer"
                                      onMouseEnter={() => setHoveredIdx(idx)}
                                      onMouseLeave={() => setHoveredIdx(null)}
                                    />
                                  );
                                })}

                                {/* 2. LINE GRAPH PRESENTATION */}
                                {chartViewMode === "line" && (() => {
                                  const pts = trendData.map((d, idx) => {
                                    return { x: getX(idx), y: getY(d.workerCount) };
                                  });
                                  const { strokeD, fillD } = generateBezierPaths(pts, axisBottom);
                                  return (
                                    <>
                                      <path d={fillD} fill="url(#lineGrad)" />
                                      <path
                                        d={strokeD}
                                        fill="none"
                                        stroke={analyticsViewTab === "workers" ? "#06b6d4" : "#14b8a6"}
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </>
                                  );
                                })()}

                                {/* 3. IMAGINARY BROKEN LINES ON HOVER (CROSSHAIRS) */}
                                {hoveredIdx !== null && hoveredPoint && (() => {
                                  const x = getX(hoveredIdx);
                                  const y = getY(hoveredPoint.workerCount);
                                  return (
                                    <g className="pointer-events-none">
                                      {/* Horizontal dashed tracer */}
                                      <line
                                        x1={axisLeft}
                                        y1={y}
                                        x2={x}
                                        y2={y}
                                        stroke={analyticsViewTab === "workers" ? "#06b6d4" : "#14b8a6"}
                                        strokeOpacity="0.35"
                                        strokeDasharray="3 3"
                                        strokeWidth="1.0"
                                      />
                                      {/* Vertical dashed tracer */}
                                      <line
                                        x1={x}
                                        y1={axisBottom}
                                        x2={x}
                                        y2={y}
                                        stroke={analyticsViewTab === "workers" ? "#06b6d4" : "#14b8a6"}
                                        strokeOpacity="0.35"
                                        strokeDasharray="3 3"
                                        strokeWidth="1.0"
                                      />
                                    </g>
                                  );
                                })()}

                                {/* 4. HOVER INTERSECTIONS & HITBOXES */}
                                {trendData.map((d, idx) => {
                                  const x = getX(idx);
                                  const y = getY(d.workerCount);
                                  const isHovered = hoveredIdx === idx;
                                  const size = isHovered ? 5.0 : 3.0;
                                  const strokeWidth = isHovered ? 2.2 : 1.5;
                                  const strokeColor = analyticsViewTab === "workers" ? "#06b6d4" : "#14b8a6";
                                  return (
                                    <g
                                      key={idx}
                                      className="cursor-pointer"
                                      onMouseEnter={() => setHoveredIdx(idx)}
                                      onMouseLeave={() => setHoveredIdx(null)}
                                    >
                                      {/* Large invisible catch area for hover */}
                                      <circle
                                        cx={x}
                                        cy={y}
                                        r="20"
                                        fill="transparent"
                                        className="cursor-pointer"
                                      />
                                      
                                      {/* Real visible 'x' intersection marker (Only in line chart mode) */}
                                      {chartViewMode === "line" && (
                                        <g className="transition-all duration-150">
                                          {/* White border back-shadow to contrast with trend line */}
                                          <line
                                            x1={x - size}
                                            y1={y - size}
                                            x2={x + size}
                                            y2={y + size}
                                            stroke="#ffffff"
                                            strokeWidth={strokeWidth + 1.2}
                                            strokeLinecap="round"
                                          />
                                          <line
                                            x1={x - size}
                                            y1={y + size}
                                            x2={x + size}
                                            y2={y - size}
                                            stroke="#ffffff"
                                            strokeWidth={strokeWidth + 1.2}
                                            strokeLinecap="round"
                                          />
                                          {/* Main colored stroke line */}
                                          <line
                                            x1={x - size}
                                            y1={y - size}
                                            x2={x + size}
                                            y2={y + size}
                                            stroke={strokeColor}
                                            strokeWidth={strokeWidth}
                                            strokeLinecap="round"
                                          />
                                          <line
                                            x1={x - size}
                                            y1={y + size}
                                            x2={x + size}
                                            y2={y - size}
                                            stroke={strokeColor}
                                            strokeWidth={strokeWidth}
                                            strokeLinecap="round"
                                          />
                                        </g>
                                      )}
                                    </g>
                                  );
                                })}

                                {/* 5. PERFECTLY ALIGNED & DYNAMICALLY SPACED X-AXIS LABELS */}
                                {(() => {
                                  const pointInterval = trendData.length > 1 ? plotWidth / (trendData.length - 1) : plotWidth;

                                  // Helper to format/compact labels depending on density and pointInterval
                                  const getFormattedLabel = (rawLabel: string) => {
                                    if (!rawLabel) return "";
                                    // Compact weekly date ranges like "Jul 1 - Jul 7" when space is limited
                                    if (rawLabel.includes(" - ") && pointInterval < 85) {
                                      const parts = rawLabel.split(" - ");
                                      if (pointInterval < 55) return parts[0]; // e.g., "Jul 1"
                                      const endDay = parts[1].split(" ")[1] || parts[1];
                                      return `${parts[0]}-${endDay}`; // e.g., "Jul 1-7"
                                    }
                                    // Compact month+year labels like "Jan 2026" when space is limited
                                    if (/\b(20\d\d)\b/.test(rawLabel) && pointInterval < 65 && !rawLabel.includes("-")) {
                                      return rawLabel.replace(/\s+20\d\d$/, ""); // e.g., "Jan"
                                    }
                                    return rawLabel;
                                  };

                                  const formattedLabels = trendData.map((d) => getFormattedLabel(d.dateLabel));
                                  const maxCharLen = Math.max(...formattedLabels.map((s) => s.length), 3);
                                  
                                  // Estimate pixel width required for each label (approx 6px per char + 12px safety padding)
                                  const minNeededSpace = Math.max(30, maxCharLen * 6 + 12);

                                  // Dynamically calculate step so labels NEVER collide regardless of container width
                                  let calcStep = Math.max(1, Math.ceil(minNeededSpace / Math.max(pointInterval, 1)));

                                  // Round step to clean intervals (1, 2, 3, 5, 7, 10, 15...)
                                  if (calcStep > 3 && calcStep <= 5) calcStep = 5;
                                  else if (calcStep > 5 && calcStep <= 7) calcStep = 7;
                                  else if (calcStep > 7 && calcStep <= 10) calcStep = 10;
                                  else if (calcStep > 10) calcStep = Math.ceil(calcStep / 5) * 5;

                                  return trendData.map((d, idx) => {
                                    const labelX = getX(idx);
                                    const isLast = idx === trendData.length - 1;
                                    const isFirst = idx === 0;

                                    const matchesStep = idx % calcStep === 0;
                                    const distToLastPx = (trendData.length - 1 - idx) * pointInterval;
                                    
                                    // Hide intermediate label if it's too close to the last label to prevent collision at the right edge
                                    const isTooCloseToLast = !isLast && distToLastPx < minNeededSpace * 0.9;

                                    const showLabel = isFirst || isLast || (matchesStep && !isTooCloseToLast);

                                    if (!showLabel) return null;

                                    const labelText = formattedLabels[idx];
                                    const textAnchor = isLast ? "end" : isFirst ? "start" : "middle";

                                    return (
                                      <text
                                        key={idx}
                                        x={labelX}
                                        y={axisBottom + 16}
                                        textAnchor={textAnchor}
                                        className="text-[9px] sm:text-[11px] font-medium fill-slate-500 dark:fill-neutral-400 font-sans select-none"
                                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                                      >
                                        {labelText}
                                      </text>
                                    );
                                  });
                                })()}
                              </svg>

                              {/* 6. FLOATING TOOLTIP ACCURATELY POSITIONED DIRECTLY ABOVE HOVER POINT */}
                              {hoveredIdx !== null && hoveredPoint && (() => {
                                const x = getX(hoveredIdx);
                                const y = getY(hoveredPoint.workerCount);
                                
                                const leftPercent = (x / width) * 100;
                                const topPercent = (y / height) * 100;

                                const isNearTop = topPercent < 20;
                                const xTranslate = hoveredIdx === 0 ? "8%" : hoveredIdx === trendData.length - 1 ? "-108%" : "-50%";
                                const yTranslate = isNearTop ? "10px" : "-108%";
                                const transformStyle = `translate(${xTranslate}, ${yTranslate})`;

                                return (
                                  <div
                                    className="absolute pointer-events-none z-50 transition-all duration-150 ease-out select-none"
                                    style={{
                                      left: `${leftPercent}%`,
                                      top: `${topPercent}%`,
                                      transform: transformStyle,
                                    }}
                                  >
                                    <div className="bg-slate-950/95 dark:bg-neutral-900/95 text-white border border-slate-700/60 dark:border-neutral-850 rounded-2xl p-2.5 sm:p-3 shadow-2xl flex flex-col space-y-1 min-w-[135px] backdrop-blur-lg animate-fade-in">
                                      {/* Header/Date */}
                                      <div className="text-[10px] font-bold text-slate-200 dark:text-neutral-300 border-b border-slate-800 dark:border-neutral-850 pb-1 flex items-center justify-between">
                                        <span className="font-sans" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                          {hoveredPoint.dateLabel}
                                        </span>
                                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider ${analyticsViewTab === "workers" ? "bg-cyan-950/40 text-cyan-400 border border-cyan-800/30" : "bg-teal-950/40 text-teal-400 border border-teal-800/30"}`}>
                                          {analyticsViewTab === "workers" ? "Worker" : "Dept"}
                                        </span>
                                      </div>
                                      {/* Detail Rows */}
                                      <div className="flex items-center justify-between space-x-3 text-[10px] pt-0.5">
                                        <span className="text-neutral-400 font-sans" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                          {analyticsViewTab === "workers" ? "Active Workers" : "Active Teams"}
                                        </span>
                                        <span className="font-bold text-white font-sans" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                          {hoveredPoint.workerCount}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between space-x-3 text-[10px]">
                                        <span className="text-neutral-400 font-sans" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                          Perf Rate
                                        </span>
                                        <span
                                          className={`font-extrabold text-[11px] font-sans ${analyticsViewTab === "workers" ? "text-cyan-400" : "text-teal-400"}`}
                                          style={{ fontFamily: 'Montserrat, sans-serif' }}
                                        >
                                          {hoveredPoint.perf}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div
                      className={`text-[9px] flex justify-between font-mono shrink-0 select-none mt-2 border-t pt-1.5 ${adminThemeClass.accentBorder} ${adminThemeClass.textMuted}`}
                    >
                      <span className="font-sans" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {analyticsViewTab === "workers"
                          ? (translations.activeWorkersCount || "Active Workers Count")
                          : (translations.activeTeamsCount || "Active Teams Count")}
                      </span>
                      <span className="font-sans" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {analyticsViewTab === "workers"
                          ? (translations.rankTop5 || "Rank Top-5 Providers")
                          : (translations.enterpriseComparing || "Enterprise Comparing")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Timeframe Selector Button Row */}
            <div
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-2xl gap-4 mb-6 ${adminThemeClass.cardBg}`}
            >
              <div>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider font-mono block mb-1 ${adminThemeClass.textMuted}`}
                >
                  Select Reporting Basis Timeframe
                </span>
                <p
                  className={`text-xs font-light ${adminThemeClass.textMuted}`}
                >
                  Dynamically recalculate attendance ratios, graphs, metrics,
                  and leaderboards.
                </p>
              </div>
              <div
                className={`flex rounded-2xl p-1 border select-none max-w-sm w-full divide-x-0 ${adminThemeClass.innerBg}`}
              >
                {(["daily", "weekly", "monthly", "yearly"] as const).map(
                  (tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setTimeframe(tf)}
                      className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-xl text-center capitalize transition-all cursor-pointer ${timeframe === tf ? `text-cyan-600 dark:text-cyan-400 shadow-sm font-bold scale-[1.02] ${adminThemeClass.cardBg}` : `hover:text-cyan-600 ${adminThemeClass.textMuted}`}`}
                    >
                      {tf}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Leaderboard Table Desk */}
            <div
              className={`rounded-3xl border overflow-hidden shadow-xl relative transition-all duration-300 ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
            >
              <div
                onClick={() => setIsLeaderboardExpanded((prev) => !prev)}
                className={`p-4 sm:p-5 flex items-center justify-between flex-wrap gap-4 cursor-pointer select-none transition-colors hover:bg-neutral-500/5 ${adminThemeClass.innerBg} ${
                  isLeaderboardExpanded ? "border-b border-neutral-200/10" : ""
                }`}
                title={isLeaderboardExpanded ? "Click to collapse leaderboard" : "Click to expand leaderboard"}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                    isLeaderboardExpanded ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" : `${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`
                  }`}>
                    {isLeaderboardExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  <span
                    className={`font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 ${adminThemeClass.textTitle}`}
                  >
                    <TrendingUp className="h-4.5 w-4.5 text-cyan-600 dark:text-cyan-400" />
                    <span>
                      {translations.leaderboard || "Leaderboard - Top Performers"}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
                  {/* Search Field */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={analyticsSearchQuery}
                      onChange={(e) => setAnalyticsSearchQuery(e.target.value)}
                      placeholder="Search leaderboard..."
                      className="w-full pl-8.5 pr-8 py-1.5 text-xs font-semibold rounded-xl border border-neutral-300 outline-none transition-all duration-200 bg-white text-neutral-900 placeholder-neutral-400 caret-neutral-900 focus:border-cyan-500 shadow-xs"
                    />
                    {analyticsSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setAnalyticsSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 p-0.5 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                        title="Clear Search"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Right Segmented Control to switch Department -> Worker */}
                  <div
                    className={`flex rounded-xl p-0.5 shadow-inner border ${adminThemeClass.innerBg}`}
                  >
                    <button
                      type="button"
                      onClick={() => setLeaderboardView("worker")}
                      className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-lg cursor-pointer transition-all duration-150 ${
                        leaderboardView === "worker"
                          ? adminThemeClass.buttonSelected
                          : `${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle}`
                      }`}
                    >
                      Workers view
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaderboardView("department")}
                      className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-lg cursor-pointer transition-all duration-150 ${
                        leaderboardView === "department"
                          ? adminThemeClass.buttonSelected
                          : `${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle}`
                      }`}
                    >
                      Departments view
                    </button>
                  </div>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:inline-block ${adminThemeClass.textMuted}`}>
                    {isLeaderboardExpanded ? "Click to Collapse" : "Click to Expand"}
                  </span>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isLeaderboardExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="relative group/scroll w-full">
                {/* Top-center invisible down arrow button */}
                <button
                  type="button"
                  onClick={() => {
                    if (leaderboardTableContainerRef.current) {
                      const el = leaderboardTableContainerRef.current;
                      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
                    }
                  }}
                  className="absolute top-2 left-1/2 -translate-x-1/2 z-30 p-2 rounded-full bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-700 backdrop-blur-md opacity-0 hover:opacity-100 group-hover/scroll:opacity-100 transition-opacity duration-200 cursor-pointer text-slate-700 dark:text-neutral-200 hover:scale-110 active:scale-95 shadow-md"
                  title="Scroll to Bottom"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>

                {/* Left invisible/hover scroll icon */}
                <button
                  type="button"
                  onClick={() =>
                    scrollContainer(leaderboardTableContainerRef, "left")
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/40 dark:bg-black/40 border border-neutral-200 dark:border-neutral-850 backdrop-blur-md opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-200 cursor-pointer text-slate-700 dark:text-neutral-300 hover:scale-110 active:scale-95 shadow-sm"
                  title="Scroll Left"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div
                  ref={leaderboardTableContainerRef}
                  onMouseEnter={() => setIsShiftRegisterHovered(true)}
                  onMouseLeave={() => setIsShiftRegisterHovered(false)}
                  onTouchStart={() => setIsShiftRegisterHovered(true)}
                  onTouchEnd={() => setIsShiftRegisterHovered(false)}
                  className="max-h-[600px] overflow-auto scrollbar-none"
                >
                  {leaderboardView === "worker" ? (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className={`sticky top-0 z-20 ${adminThemeClass.innerBg} shadow-xs`}>
                        <tr
                          className={`border-b font-bold uppercase tracking-wider select-none text-[10px] ${adminThemeClass.innerBg} ${adminThemeClass.textMuted}`}
                        >
                          <th className={`p-4 w-20 ${adminThemeClass.innerBg}`}>
                            {translations.rankCol || "Rank"}
                          </th>
                          <th className={`p-4 ${adminThemeClass.innerBg}`}>
                            {translations.employeeCol || "Employee"}
                          </th>
                          <th className={`p-4 ${adminThemeClass.innerBg}`}>
                            {translations.colDept || "Assigned Unit"}
                          </th>
                          <th className={`p-4 ${adminThemeClass.innerBg}`}>
                            {translations.verifiedCheckinsCol ||
                              "Verified Check-ins"}
                          </th>
                          <th className={`p-4 ${adminThemeClass.innerBg}`}>
                            {translations.arrivalStatusCol ||
                              "Arrival status Flag"}
                          </th>
                          <th className={`p-4 ${adminThemeClass.innerBg}`}>
                            {translations.activeExemptionCol ||
                              "Active Exemption"}
                          </th>
                          <th className={`p-4 ${adminThemeClass.innerBg}`}>
                            {translations.attendanceRateCol ||
                              "Attendance Performance Rate"}
                          </th>
                        </tr>
                      </thead>
                      <tbody
                        className={`divide-y font-sans ${adminThemeClass.tableRowDivider}`}
                      >
                        {filteredLeaderboardForTimeframe.map((w, index) => {
                          const metrics = calculateMetricsForTimeframe(
                            w.id,
                            timeframe,
                          );
                          return (
                            <tr
                              key={`${w.id}-${w.profilePhoto?.small || ""}`}
                              onClick={() => {
                                setSelectedLeaderboardWorker(w);
                                setModalTimeframe(timeframe);
                              }}
                              className={`transition-colors duration-100 border-b cursor-pointer ${adminThemeClass.tableRowHover}`}
                              title="Click to view summary modal"
                            >
                              <td className="p-4">
                                <span
                                  className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${index === 0 ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/30" : index === 1 ? "bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800" : `border ${adminThemeClass.innerBg} ${adminThemeClass.textMuted}`}`}
                                >
                                  {index + 1}
                                </span>
                              </td>
                              <td
                                className={`p-4 font-semibold ${adminThemeClass.textTitle}`}
                              >
                                <div className="flex items-center space-x-2">
                                  <img
                                    src={
                                      w.profilePhoto?.medium ||
                                      w.profilePhoto?.small ||
                                      IMAGES.defaultWorkerAvatar
                                    }
                                    alt=""
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedPhotoUrl(
                                        w.profilePhoto?.medium ||
                                        w.profilePhoto?.small ||
                                        IMAGES.defaultWorkerAvatar
                                      );
                                    }}
                                    className={`h-8 w-8 rounded-lg object-cover bg-neutral-100 border cursor-zoom-in hover:scale-110 transition-transform ${adminThemeClass.accentBorder}`}
                                    title="Click to expand profile picture"
                                  />
                                  <span>
                                    {w.firstName} {w.lastName}
                                  </span>
                                </div>
                              </td>
                              <td
                                className={`p-4 ${adminThemeClass.textMuted}`}
                              >
                                {w.deptLabel}
                              </td>
                              <td
                                className={`p-4 font-mono font-bold ${adminThemeClass.textTitle}`}
                              >
                                {metrics.present} Days
                              </td>
                              <td className="p-4 font-mono text-orange-600 dark:text-orange-400">
                                {metrics.late} Late
                              </td>
                              <td className="p-4 font-mono text-cyan-600 dark:text-cyan-400">
                                {metrics.exempt} Days
                              </td>
                              <td className="p-4">
                                <div className="flex items-center space-x-2">
                                  <div className="w-24 bg-[#111111] border border-[#262626] rounded-full h-2.5 overflow-hidden">
                                    <div
                                      style={{ width: `${metrics.perf}%` }}
                                      className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2.5 rounded-full"
                                    ></div>
                                  </div>
                                  <span className="font-bold text-cyan-600 dark:text-cyan-400">
                                    {metrics.perf.toFixed(2)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className={`sticky top-0 z-20 ${adminThemeClass.innerBg} shadow-xs`}>
                        <tr
                          className={`border-b font-bold uppercase tracking-wider select-none text-[10px] ${adminThemeClass.innerBg} ${adminThemeClass.textMuted}`}
                        >
                          <th className={`p-4 w-20 ${adminThemeClass.innerBg}`}>Rank</th>
                          <th className={`p-4 ${adminThemeClass.innerBg}`}>Department Unit</th>
                          <th className={`p-4 ${adminThemeClass.innerBg}`}>Department Lead</th>
                          <th className={`p-4 ${adminThemeClass.innerBg}`}>Personnel Count</th>
                          <th className={`p-4 ${adminThemeClass.innerBg}`}>Average Performance Rate</th>
                        </tr>
                      </thead>
                      <tbody
                        className={`divide-y font-sans ${adminThemeClass.tableRowDivider}`}
                      >
                        {filteredDepartmentsForTimeframe.map((d, index) => {
                          return (
                            <tr
                              key={index}
                              onClick={() => {
                                setSelectedLeaderboardDept(d);
                                setModalTimeframe(timeframe);
                              }}
                              className={`transition-colors duration-100 border-b cursor-pointer ${adminThemeClass.tableRowHover}`}
                              title="Click to view summary modal"
                            >
                              <td className="p-4">
                                <span
                                  className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${index === 0 ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/30" : index === 1 ? "bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800" : `border ${adminThemeClass.innerBg} ${adminThemeClass.textMuted}`}`}
                                >
                                  {index + 1}
                                </span>
                              </td>
                              <td
                                className={`p-4 font-semibold ${adminThemeClass.textTitle}`}
                              >
                                {d.name}
                              </td>
                              <td
                                className={`p-4 ${adminThemeClass.textMuted}`}
                              >
                                {d.leadName}
                              </td>
                              <td
                                className={`p-4 font-mono ${adminThemeClass.textTitle}`}
                              >
                                {d.teamSize} Workers
                              </td>
                              <td className="p-4">
                                <div className="flex items-center space-x-2">
                                  <div className="w-24 bg-[#111111] border border-[#262626] rounded-full h-2.5 overflow-hidden">
                                    <div
                                      style={{ width: `${d.avg}%` }}
                                      className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2.5 rounded-full"
                                    ></div>
                                  </div>
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    {d.avg.toFixed(2)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Right invisible/hover scroll icon */}
                <button
                  type="button"
                  onClick={() =>
                    scrollContainer(leaderboardTableContainerRef, "right")
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/40 dark:bg-black/40 border border-neutral-200 dark:border-neutral-850 backdrop-blur-md opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-200 cursor-pointer text-slate-700 dark:text-neutral-300 hover:scale-110 active:scale-95 shadow-sm"
                  title="Scroll Right"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Center-bottom invisible up arrow button */}
                <button
                  type="button"
                  onClick={() => {
                    if (leaderboardTableContainerRef.current) {
                      const el = leaderboardTableContainerRef.current;
                      el.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 p-2 rounded-full bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-700 backdrop-blur-md opacity-0 hover:opacity-100 group-hover/scroll:opacity-100 transition-opacity duration-200 cursor-pointer text-slate-700 dark:text-neutral-200 hover:scale-110 active:scale-95 shadow-md"
                  title="Scroll to Top"
                >
                  <ChevronUp className="h-5 w-5" />
                </button>
              </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
        {/* -------------------- TAB AREA: PERMISSIONS DESK -------------------- */}
        {activeTab === "permissions" && (
          <div className="space-y-6 select-none font-sans">
            {/* Verify Active Permission Exemption Requests Container */}
            <div
              className={`rounded-3xl border shadow-xl overflow-hidden transition-all duration-300 ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
            >
              <div
                onClick={() => setIsVerifyPermissionsExpanded((prev) => !prev)}
                className={`p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none transition-colors hover:bg-neutral-500/5 ${adminThemeClass.innerBg} ${
                  isVerifyPermissionsExpanded ? "border-b border-neutral-200/10" : ""
                }`}
                title={isVerifyPermissionsExpanded ? "Click to collapse verification panel" : "Click to expand verification panel"}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                    isVerifyPermissionsExpanded ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" : `${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`
                  }`}>
                    {isVerifyPermissionsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  <div>
                    <h3
                      className={`font-semibold text-base sm:text-lg ${adminThemeClass.textTitle}`}
                    >
                      {translations.verifyPermissionsTitle ||
                        "Verify Active Permission Exemption Requests"}
                    </h3>
                    <p className={`text-xs font-light ${adminThemeClass.textMuted}`}>
                      {translations.verifyPermissionsDesc ||
                        "Confirming approved permission flags automatically deducts standard workday ratios without penalty calculations."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:inline-block ${adminThemeClass.textMuted}`}>
                    {isVerifyPermissionsExpanded ? "Click to Collapse" : "Click to Expand"}
                  </span>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isVerifyPermissionsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden p-5 sm:p-6"
                  >

              {/* Sorting Button at the end of container */}
              <div className="relative flex items-center space-x-1.5 shrink-0 z-20">
                <CustomSortDropdown
                  value={permissionsSortField}
                  onChange={(val) => setPermissionsSortField(val as any)}
                  sortOrder={permissionsSortOrder}
                  onToggleSortOrder={() => setPermissionsSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                  options={[
                    { id: "name", label: "Name (Alphabetical)", desc: "Sort workers by first & last name" },
                    { id: "reason", label: "Reason / Remarks", desc: "Sort permissions by reason or remarks" },
                    { id: "department", label: "Department / Unit", desc: "Group requests by department" },
                  ]}
                  title="Sort Permissions By"
                  theme={theme}
                />
              </div>                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Permission List Container with Collapse/Expand */}
            <div
              className={`rounded-3xl border shadow-xl overflow-hidden transition-all duration-300 ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
            >
              <div
                onClick={() => setIsPermissionsListExpanded((prev) => !prev)}
                className={`p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors hover:bg-neutral-500/5 ${adminThemeClass.innerBg} ${
                  isPermissionsListExpanded ? "border-b border-neutral-200/10" : ""
                }`}
                title={isPermissionsListExpanded ? "Click to collapse permission list" : "Click to expand permission list"}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                    isPermissionsListExpanded ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" : `${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`
                  }`}>
                    {isPermissionsListExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    <h4 className={`font-display font-semibold text-base sm:text-lg ${adminThemeClass.textTitle}`}>
                      Permission Requests & Records
                    </h4>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                    {filteredPermissions.length} Requests
                  </span>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:inline-block ${adminThemeClass.textMuted}`}>
                    {isPermissionsListExpanded ? "Click to Collapse" : "Click to Expand"}
                  </span>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isPermissionsListExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden p-4 sm:p-6 space-y-6"
                  >
            {/* Filter controls row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Search Bar */}
              <div
                className="md:col-span-1 p-3 border border-neutral-300 rounded-2xl flex items-center relative bg-white shadow-xs"
              >
                <Search className="absolute left-6.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  value={permissionsSearchQuery}
                  onChange={(e) => setPermissionsSearchQuery(e.target.value)}
                  placeholder="Search workers, units or remarks..."
                  className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm font-semibold bg-transparent text-neutral-900 placeholder-neutral-400 caret-neutral-900 border-0 outline-none transition-all duration-200 focus:ring-0"
                />
                {permissionsSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPermissionsSearchQuery("")}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 p-1 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                    title="Clear Search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status Query Tabs */}
              <div
                className={`md:col-span-2 p-3 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${adminThemeClass.cardBg} w-full overflow-hidden`}
              >
                <div className="flex items-center space-x-3 shrink-0">
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider font-mono px-2 ${adminThemeClass.textMuted}`}
                  >
                    Query Filters
                  </span>
                </div>

                {/* Switch View toggles for Permissions and Tabs pushed to the right edge */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:ml-auto w-full sm:w-auto justify-between sm:justify-end shrink-0 max-w-full">
                  {/* Switch View toggles for Permissions */}
                  <div className={`flex rounded-xl p-0.5 border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder} shrink-0`}>
                    <button
                      type="button"
                      onClick={() => setPermissionsViewMode("card")}
                      title="Card Grid View"
                      className={`p-2 rounded-lg cursor-pointer transition-all ${
                        permissionsViewMode === "card"
                          ? `${adminThemeClass.buttonSelected} shadow-sm`
                          : `${adminThemeClass.textMuted} hover:${adminThemeClass.textHighlight}`
                      }`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPermissionsViewMode("list")}
                      title="Detailed List View"
                      className={`p-2 rounded-lg cursor-pointer transition-all ${
                        permissionsViewMode === "list"
                          ? `${adminThemeClass.buttonSelected} shadow-sm`
                          : `${adminThemeClass.textMuted} hover:${adminThemeClass.textHighlight}`
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>

                  <div
                    className={`flex rounded-xl p-1 border select-none divide-x-0 ${adminThemeClass.innerBg} max-w-full sm:max-w-md overflow-x-auto shrink-0`}
                  >
                    {(["all", "pending", "approved", "rejected"] as const).map(
                      (tab) => {
                        const count = tab === "all"
                          ? permissions.length
                          : permissions.filter(
                              (p) => p.status.toLowerCase() === tab,
                            ).length;
                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setPermissionsQueryTab(tab)}
                            className={`py-1.5 px-2.5 sm:px-3 text-xs font-semibold rounded-lg text-center capitalize transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${permissionsQueryTab === tab ? `text-cyan-600 dark:text-cyan-400 shadow-sm font-bold scale-[1.02] ${adminThemeClass.cardBg}` : `hover:text-cyan-600 ${adminThemeClass.textMuted}`}`}
                          >
                            <span>{tab}</span>
                            {count > 0 && (
                              <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${permissionsQueryTab === tab ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' : 'bg-neutral-500/20 text-neutral-600 dark:text-neutral-400'}`}>
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative group/scroll w-full">
              {/* Top-center invisible down arrow button */}
              <button
                type="button"
                onClick={() => {
                  if (permissionsTableContainerRef.current) {
                    const el = permissionsTableContainerRef.current;
                    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
                  }
                }}
                className="absolute top-2 left-1/2 -translate-x-1/2 z-30 p-2 rounded-full bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-700 backdrop-blur-md opacity-0 hover:opacity-100 group-hover/scroll:opacity-100 transition-opacity duration-200 cursor-pointer text-slate-700 dark:text-neutral-200 hover:scale-110 active:scale-95 shadow-md"
                title="Scroll to Bottom"
              >
                <ChevronDown className="h-5 w-5" />
              </button>

              <div
                ref={permissionsTableContainerRef}
                onMouseEnter={() => setIsShiftRegisterHovered(true)}
                onMouseLeave={() => setIsShiftRegisterHovered(false)}
                onTouchStart={() => setIsShiftRegisterHovered(true)}
                onTouchEnd={() => setIsShiftRegisterHovered(false)}
                className="max-h-[600px] overflow-auto scrollbar-none"
              >
                {permissionsViewMode === "card" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredPermissions.length === 0 ? (
                  <div
                    className={`col-span-full p-8 text-center border rounded-2xl ${adminThemeClass.textMuted}`}
                  >
                    No permission requests found matching current filter and query
                    criteria.
                  </div>
                ) : (
                  filteredPermissions.map((p, idx) => {
                    const targetUser = workers.find((w) => w.id === p.worker_id);
                    if (!targetUser) return null;
                    const deptName =
                      departments.find((d) => d.id === targetUser.department_id)
                        ?.name ||
                      translations.unassignedUnit ||
                      "Unassigned Unit";

                    return (
                      <div
                        key={idx}
                        className={`p-6 rounded-3xl border flex flex-col justify-between space-y-4 shadow-xl ${adminThemeClass.cardBg}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <img
                              src={
                                targetUser.profilePhoto?.medium ||
                                targetUser.profilePhoto?.small ||
                                IMAGES.defaultWorkerAvatar
                              }
                              alt=""
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedPhotoUrl(
                                  targetUser.profilePhoto?.medium ||
                                  targetUser.profilePhoto?.small ||
                                  IMAGES.defaultWorkerAvatar
                                );
                              }}
                              className={`h-10 w-10 rounded-xl object-cover border bg-neutral-100 cursor-zoom-in hover:scale-110 transition-transform ${adminThemeClass.accentBorder}`}
                              title="Click to expand profile picture"
                            />
                            <div>
                              <strong
                                className={`block text-sm ${adminThemeClass.textTitle}`}
                              >
                                {targetUser.firstName} {targetUser.lastName}
                              </strong>
                              <span
                                className={`text-[10px] font-semibold ${adminThemeClass.textMuted}`}
                              >
                                {deptName} &bull; {targetUser.role.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${p.status === PermissionStatus.PENDING ? "bg-orange-50 dark:bg-orange-950/40 text-orange-705 dark:text-orange-400 border-orange-200 dark:border-orange-800/30" : p.status === PermissionStatus.APPROVED ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-705 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30" : "bg-red-50 dark:bg-red-950/40 text-red-705 dark:text-red-400 border-red-200 dark:border-red-800/30"}`}
                          >
                            {p.status === PermissionStatus.PENDING
                              ? translations.pendingStatus || "Pending"
                              : p.status === PermissionStatus.APPROVED
                                ? translations.approvedStatus || "Approved"
                                : translations.rejectedStatus || "Rejected"}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div
                            className={`text-xs font-light flex items-center space-x-1.5 ${adminThemeClass.textTitle}`}
                          >
                            <span
                              className={`font-bold uppercase text-[9px] ${adminThemeClass.textMuted}`}
                            >
                              {translations.reasonLabel || "Reason:"}
                            </span>
                            <strong
                              className={`font-bold ${adminThemeClass.accentText}`}
                            >
                              {p.reason}
                            </strong>
                          </div>
                          <div
                            className={`text-xs font-light flex items-center space-x-1.5 ${adminThemeClass.textTitle}`}
                          >
                            <span
                              className={`font-bold uppercase text-[9px] ${adminThemeClass.textMuted}`}
                            >
                              {translations.intervalLabel || "Interval:"}
                            </span>
                            <span>
                              {formatDateToCustomString(p.startDate)} &rarr;{" "}
                              {formatDateToCustomString(p.endDate)}
                            </span>
                          </div>
                          <div
                            className={`p-3 rounded-xl text-xs font-light border italic ${adminThemeClass.innerBg} ${adminThemeClass.textMuted} ${adminThemeClass.accentBorder}`}
                          >
                            "{p.remarks}"
                          </div>
                        </div>

                        {p.status === PermissionStatus.PENDING && (
                          <div className="flex space-x-3 pt-2">
                            <button
                              onClick={() =>
                                handleEvaluatePermission(
                                  p.id,
                                  PermissionStatus.APPROVED,
                                )
                              }
                              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span>
                                {translations.approveBtn || "Approve Permission"}
                              </span>
                            </button>
                            <button
                              onClick={() =>
                                handleEvaluatePermission(
                                  p.id,
                                  PermissionStatus.REJECTED,
                                )
                              }
                              className={`flex-1 py-3 border text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1 ${adminThemeClass.innerBg} ${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle} ${adminThemeClass.accentBorder}`}
                            >
                              <XCircle className="h-4 w-4" />
                              <span>{translations.rejectBtn || "Reject"}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* High-Quality List / Table View for Permissions */
              <div
                ref={permissionsTableContainerRef}
                onMouseEnter={() => setIsShiftRegisterHovered(true)}
                onMouseLeave={() => setIsShiftRegisterHovered(false)}
                onTouchStart={() => setIsShiftRegisterHovered(true)}
                onTouchEnd={() => setIsShiftRegisterHovered(false)}
                className={`overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-none rounded-3xl border shadow-xl ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
              >
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b ${adminThemeClass.accentBorder} bg-black/10`}>
                      <th className={`p-4 font-bold uppercase tracking-wider text-[10px] ${adminThemeClass.textMuted}`}>Employee Name</th>
                      <th className={`p-4 font-bold uppercase tracking-wider text-[10px] ${adminThemeClass.textMuted}`}>Reason & Remarks</th>
                      <th className={`p-4 font-bold uppercase tracking-wider text-[10px] ${adminThemeClass.textMuted}`}>Exemption Interval</th>
                      <th className={`p-4 font-bold uppercase tracking-wider text-[10px] ${adminThemeClass.textMuted}`}>Status</th>
                      <th className={`p-4 font-bold uppercase tracking-wider text-[10px] text-right ${adminThemeClass.textMuted}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPermissions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={`p-8 text-center ${adminThemeClass.textMuted}`}>
                          No permission requests found matching current filter and query criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredPermissions.map((p, idx) => {
                        const targetUser = workers.find((w) => w.id === p.worker_id);
                        if (!targetUser) return null;
                        const deptName =
                          departments.find((d) => d.id === targetUser.department_id)
                            ?.name ||
                          translations.unassignedUnit ||
                          "Unassigned Unit";

                        return (
                          <tr
                            key={idx}
                            className={`border-b last:border-none transition-all hover:bg-black/10 ${adminThemeClass.accentBorder}`}
                          >
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                <img
                                  src={targetUser.profilePhoto?.medium || targetUser.profilePhoto?.small || IMAGES.defaultWorkerAvatar}
                                  alt=""
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedPhotoUrl(targetUser.profilePhoto?.medium || targetUser.profilePhoto?.small || IMAGES.defaultWorkerAvatar);
                                  }}
                                  className={`h-9 w-9 rounded-xl object-cover border bg-neutral-100 cursor-zoom-in hover:scale-110 transition-transform ${adminThemeClass.accentBorder}`}
                                  title="Click to expand profile picture"
                                />
                                <div>
                                  <strong className={`font-bold block ${adminThemeClass.textTitle}`}>{targetUser.firstName} {targetUser.lastName}</strong>
                                  <span className={`text-[10px] ${adminThemeClass.textMuted}`}>{deptName}</span>
                                </div>
                              </div>
                            </td>

                            <td className="p-4 space-y-1 max-w-[240px]">
                              <strong className={`font-bold block ${adminThemeClass.accentText}`}>{p.reason}</strong>
                              <p className={`text-[11px] italic font-light truncate ${adminThemeClass.textMuted}`} title={p.remarks}>
                                "{p.remarks}"
                              </p>
                            </td>

                            <td className="p-4 font-mono">
                              {formatDateToCustomString(p.startDate)} &rarr; {formatDateToCustomString(p.endDate)}
                            </td>

                            <td className="p-4">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${p.status === PermissionStatus.PENDING ? "bg-orange-50 dark:bg-orange-950/40 text-orange-705 dark:text-orange-400 border-orange-200 dark:border-orange-800/30" : p.status === PermissionStatus.APPROVED ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-705 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30" : "bg-red-50 dark:bg-red-950/40 text-red-705 dark:text-red-400 border-red-200 dark:border-red-800/30"}`}
                              >
                                {p.status === PermissionStatus.PENDING
                                  ? translations.pendingStatus || "Pending"
                                  : p.status === PermissionStatus.APPROVED
                                    ? translations.approvedStatus || "Approved"
                                    : translations.rejectedStatus || "Rejected"}
                              </span>
                            </td>

                            <td className="p-4 text-right">
                              {p.status === PermissionStatus.PENDING ? (
                                <div className="flex justify-end items-center space-x-2">
                                  <button
                                    onClick={() => handleEvaluatePermission(p.id, PermissionStatus.APPROVED)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center space-x-1 shadow-sm transition-all cursor-pointer"
                                    title="Approve Exemption"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={() => handleEvaluatePermission(p.id, PermissionStatus.REJECTED)}
                                    className={`px-3 py-1.5 border text-xs font-bold rounded-lg flex items-center space-x-1 transition-all cursor-pointer ${adminThemeClass.innerBg} ${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle} ${adminThemeClass.accentBorder}`}
                                    title="Reject Exemption"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    <span>Reject</span>
                                  </button>
                                </div>
                              ) : (
                                <span className={`text-[10px] italic ${adminThemeClass.textMuted}`}>No action pending</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
            </div>

            {/* Center-bottom invisible up arrow button */}
            <button
              type="button"
              onClick={() => {
                if (permissionsTableContainerRef.current) {
                  const el = permissionsTableContainerRef.current;
                  el.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 p-2 rounded-full bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-700 backdrop-blur-md opacity-0 hover:opacity-100 group-hover/scroll:opacity-100 transition-opacity duration-200 cursor-pointer text-slate-700 dark:text-neutral-200 hover:scale-110 active:scale-95 shadow-md"
              title="Scroll to Top"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
            </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
        {/* -------------------- TAB AREA: WORKER PROFILES -------------------- */}
        {/* -------------------- TAB AREA: WORKER PROFILES -------------------- */}
        {activeTab === "profiles" && (
          <div className="space-y-6 select-none font-sans">
            {/* Corporate Directories Roster Container */}
            <div
              className={`rounded-3xl border shadow-xl overflow-hidden transition-all duration-300 ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
            >
              <div
                onClick={() => setIsCorporateDirectoriesExpanded((prev) => !prev)}
                className={`p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none transition-colors hover:bg-neutral-500/5 ${adminThemeClass.innerBg} ${
                  isCorporateDirectoriesExpanded ? "border-b border-neutral-200/10" : ""
                }`}
                title={isCorporateDirectoriesExpanded ? "Click to collapse corporate directories roster" : "Click to expand corporate directories roster"}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                    isCorporateDirectoriesExpanded ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" : `${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`
                  }`}>
                    {isCorporateDirectoriesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  <div>
                    <h3
                      className={`font-semibold text-base sm:text-lg ${adminThemeClass.textTitle}`}
                    >
                      {translations.corporateDirectories ||
                        "Corporate Directories roster"}
                    </h3>
                    <p
                      className={`text-xs font-light ${adminThemeClass.textMuted}`}
                    >
                      {translations.exploreDirectoriesDesc ||
                        "Explore lists, filter roles, and inspect historical profiles."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:inline-block ${adminThemeClass.textMuted}`}>
                    {isCorporateDirectoriesExpanded ? "Click to Collapse" : "Click to Expand"}
                  </span>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isCorporateDirectoriesExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden p-5 sm:p-6"
                  >

              {/* Action Suite: Search, Create Employee & Grid/List toggles */}
              <div className="flex items-center gap-3.5 flex-wrap w-full md:w-auto">
                {/* Search Box */}
                <div className="relative flex-1 sm:flex-initial sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={profilesSearchQuery}
                    onChange={(e) => setProfilesSearchQuery(e.target.value)}
                    placeholder="Search by name, role..."
                    className="w-full pl-10 pr-10 py-2.5 text-xs font-semibold rounded-xl border border-neutral-300 outline-none transition-all duration-200 bg-white text-neutral-900 placeholder-neutral-400 caret-neutral-900 focus:border-cyan-500 shadow-xs"
                  />
                  {profilesSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setProfilesSearchQuery("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 p-1 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Switch View toggles */}
                <div className={`flex rounded-xl p-0.5 border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                  <button
                    type="button"
                    onClick={() => setProfilesViewMode("card")}
                    title="Card Grid View"
                    className={`p-2 rounded-lg cursor-pointer transition-all ${
                      profilesViewMode === "card"
                        ? `${adminThemeClass.buttonSelected} shadow-sm`
                        : `${adminThemeClass.textMuted} hover:${adminThemeClass.textHighlight}`
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfilesViewMode("list")}
                    title="Detailed List View"
                    className={`p-2 rounded-lg cursor-pointer transition-all ${
                      profilesViewMode === "list"
                        ? `${adminThemeClass.buttonSelected} shadow-sm`
                        : `${adminThemeClass.textMuted} hover:${adminThemeClass.textHighlight}`
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>

                {/* Sorting Options Custom Themed Dropdown Modal & Order Toggle */}
                <div className="relative flex items-center space-x-1.5 z-20">
                  <CustomSortDropdown
                    value={profilesSortField}
                    onChange={(val) => setProfilesSortField(val as any)}
                    sortOrder={profilesSortOrder}
                    onToggleSortOrder={() => setProfilesSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                    options={[
                      { id: "name", label: "Name", desc: "Sort workers by first & last name" },
                      { id: "worker_status", label: "Workers' Status", desc: "Sort by Team Lead and Team Member status" },
                      { id: "title_role", label: "Role", desc: "Sort workers by designation" },
                      { id: "department", label: "Department", desc: "Group workers by department" },
                      { id: "phone", label: "Number", desc: "Sort workers by contact number" },
                    ]}
                    title="Sort Profiles By"
                    theme={theme}
                  />
                </div>

                {/* Manage Department Button */}
                <button
                  type="button"
                  onClick={() => {
                    setLocalNewDeptName("");
                    setShowManageDeptModal(true);
                  }}
                  className="px-4 py-2.5 bg-neutral-800 text-white border border-neutral-700 hover:bg-neutral-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-md cursor-pointer min-h-[44px]"
                >
                  <Building className="h-4 w-4 text-cyan-500" />
                  <span>Manage Department</span>
                </button>

                {/* Add Worker Button */}
                <button
                  type="button"
                  onClick={() => {
                    setWorkerFormFirstName("");
                    setWorkerFormLastName("");
                    setWorkerFormEmail("");
                    setWorkerFormPhone("");
                    setWorkerFormRole(UserRole.TEAM_MEMBER);
                    setWorkerFormGender("Not Specified");
                    setWorkerFormDeptId("unassigned");
                    setWorkerFormActivityDays(settings?.activityDays || {
                      Monday: true,
                      Tuesday: true,
                      Wednesday: true,
                      Thursday: true,
                      Friday: true,
                      Saturday: false,
                      Sunday: false
                    });
                    setShowAddWorkerModal(true);
                  }}
                  className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-cyan-950/20 cursor-pointer min-h-[44px]"
                >
                  <Plus className="h-4 w-4" />
                  <span>Register Employee</span>
                </button>
              </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Personnel Directory Collection List Container with Collapse/Expand */}
            <div
              className={`rounded-3xl border shadow-xl overflow-hidden transition-all duration-300 ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
            >
              <div
                onClick={() => setIsWorkerCollectionListExpanded((prev) => !prev)}
                className={`p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors hover:bg-neutral-500/5 ${adminThemeClass.innerBg} ${
                  isWorkerCollectionListExpanded ? "border-b border-neutral-200/10" : ""
                }`}
                title={isWorkerCollectionListExpanded ? "Click to collapse worker collection list" : "Click to expand worker collection list"}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                    isWorkerCollectionListExpanded ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" : `${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`
                  }`}>
                    {isWorkerCollectionListExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    <h4 className={`font-display font-semibold text-base sm:text-lg ${adminThemeClass.textTitle}`}>
                      Personnel Directory Collection
                    </h4>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                    {filteredWorkersForProfiles.length} Members
                  </span>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:inline-block ${adminThemeClass.textMuted}`}>
                    {isWorkerCollectionListExpanded ? "Click to Collapse" : "Click to Expand"}
                  </span>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isWorkerCollectionListExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden p-4 sm:p-6"
                  >
                    {/* Render Grid / List layouts */}
            <div className="relative group/scroll w-full">
              {/* Top-center invisible down arrow button */}
              <button
                type="button"
                onClick={() => {
                  if (profilesTableContainerRef.current) {
                    const el = profilesTableContainerRef.current;
                    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
                  }
                }}
                className="absolute top-2 left-1/2 -translate-x-1/2 z-30 p-2 rounded-full bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-700 backdrop-blur-md opacity-0 hover:opacity-100 group-hover/scroll:opacity-100 transition-opacity duration-200 cursor-pointer text-slate-700 dark:text-neutral-200 hover:scale-110 active:scale-95 shadow-md"
                title="Scroll to Bottom"
              >
                <ChevronDown className="h-5 w-5" />
              </button>

              <div
                ref={profilesTableContainerRef}
                onMouseEnter={() => setIsShiftRegisterHovered(true)}
                onMouseLeave={() => setIsShiftRegisterHovered(false)}
                onTouchStart={() => setIsShiftRegisterHovered(true)}
                onTouchEnd={() => setIsShiftRegisterHovered(false)}
                className="max-h-[600px] overflow-auto scrollbar-none"
              >
                {profilesViewMode === "card" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredWorkersForProfiles.map((w, idx) => {
                  const isDeptLead =
                    w.role === UserRole.TEAM_LEAD ||
                    departments.some((d) => d.leadId === w.id);
                  const deptLabel =
                    departments.find((d) => d.id === w.department_id)?.name ||
                    translations.unassignedUnit ||
                    "Unassigned Unit";

                  return (
                    <div
                      key={`${w.id}-${w.profilePhoto?.medium || ""}`}
                      onClick={() => {
                        const m = calculateMetricsForTimeframe(w.id, timeframe);
                        setActiveLeaderModal({ ...w, m });
                      }}
                      className={`p-6 rounded-3xl border flex flex-col justify-between items-center text-center relative overflow-hidden shadow-xl duration-200 hover:scale-[1.02] cursor-pointer hover:shadow-2xl hover:border-cyan-500/50 ${
                        isDeptLead
                          ? adminThemeClass.leadCardBg
                          : adminThemeClass.cardBg
                      }`}
                    >
                      {isDeptLead && (
                        <span
                          className={`absolute top-3 right-3 text-[9px] font-extrabold tracking-wider ${adminThemeClass.accentText} bg-cyan-950/80 border border-cyan-400/40 px-2.5 py-0.5 rounded-full uppercase shadow-sm flex items-center space-x-1`}
                        >
                          <Award className="h-3 w-3 inline text-amber-400 mr-0.5" />
                          <span>{translations.deptLeadBadge || "Department Lead"}</span>
                        </span>
                      )}

                      <img
                        src={w.profilePhoto?.medium || IMAGES.defaultWorkerAvatar}
                        alt=""
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedPhotoUrl(w.profilePhoto?.medium || IMAGES.defaultWorkerAvatar);
                        }}
                        className={`h-20 w-20 rounded-2xl object-cover bg-neutral-100/5 border shadow-sm mb-4 cursor-zoom-in hover:scale-105 transition-transform ${adminThemeClass.accentBorder}`}
                        title="Click to expand profile picture"
                      />

                      <div className="space-y-1">
                        <h4
                          className={`font-bold text-base leading-tight ${adminThemeClass.textTitle}`}
                        >
                          {w.firstName} {w.lastName}
                        </h4>
                        <span
                          className={`text-xs font-semibold uppercase block ${adminThemeClass.textMuted}`}
                        >
                          {w.title ||
                            translations.staffMemberTitle ||
                            "Staff Member"}
                        </span>
                        <span
                          className={`block text-[11px] font-bold ${adminThemeClass.accentText}`}
                        >
                          {deptLabel}
                        </span>
                      </div>

                      <div
                        className={`w-full border-t mt-5 pt-4 flex justify-between text-xs font-mono ${adminThemeClass.textMuted} ${adminThemeClass.accentBorder}`}
                      >
                        <span>{w.phone ? formatPhoneNumber(w.phone) : "No Phone"}</span>
                        <span
                          className={`text-[10px] font-sans font-bold hover:underline ${adminThemeClass.accentText}`}
                        >
                          {translations.viewMetricsBtn || "View Metrics ->"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* High-Quality List / Table View with detailed controls and spacing */
              <div className={`overflow-x-auto rounded-3xl border shadow-xl ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b ${adminThemeClass.accentBorder} bg-black/10`}>
                      <th className={`p-4 font-bold uppercase tracking-wider text-[10px] ${adminThemeClass.textMuted}`}>S/N</th>
                      <th className={`p-4 font-bold uppercase tracking-wider text-[10px] ${adminThemeClass.textMuted}`}>Employee Name</th>
                      <th className={`p-4 font-bold uppercase tracking-wider text-[10px] ${adminThemeClass.textMuted}`}>Title & Role</th>
                      <th className={`p-4 font-bold uppercase tracking-wider text-[10px] ${adminThemeClass.textMuted}`}>Department Unit</th>
                      <th className={`p-4 font-bold uppercase tracking-wider text-[10px] ${adminThemeClass.textMuted}`}>Contact Number</th>
                      <th className={`p-4 font-bold uppercase tracking-wider text-[10px] text-right ${adminThemeClass.textMuted}`}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkersForProfiles.map((w, idx) => {
                      const isDeptLead =
                        w.role === UserRole.TEAM_LEAD ||
                        departments.some((d) => d.leadId === w.id);
                      const deptLabel =
                        departments.find((d) => d.id === w.department_id)?.name ||
                        translations.unassignedUnit ||
                        "Unassigned Unit";

                      return (
                        <tr
                          key={`${w.id}-${w.profilePhoto?.small || ""}`}
                          onClick={() => {
                            const m = calculateMetricsForTimeframe(w.id, timeframe);
                            setActiveLeaderModal({ ...w, m });
                          }}
                          className={`border-b last:border-none transition-all cursor-pointer ${
                            isDeptLead
                              ? `${adminThemeClass.leadCardBg} font-medium`
                              : `hover:bg-black/10 ${adminThemeClass.accentBorder}`
                          }`}
                        >
                          {/* S/N */}
                          <td className={`p-4 font-mono text-[11px] font-bold ${adminThemeClass.textTitle}`}>
                            {idx + 1}
                          </td>

                          {/* Name Card */}
                          <td className="p-4 flex items-center space-x-3">
                            <img
                              src={w.profilePhoto?.medium || w.profilePhoto?.small || IMAGES.defaultWorkerAvatar}
                              alt=""
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedPhotoUrl(w.profilePhoto?.medium || w.profilePhoto?.small || IMAGES.defaultWorkerAvatar);
                              }}
                              className={`h-9 w-9 rounded-xl object-cover bg-neutral-100/5 border cursor-zoom-in hover:scale-110 transition-transform ${adminThemeClass.accentBorder}`}
                              title="Click to expand profile picture"
                            />
                            <div>
                              <strong className={`font-bold block ${adminThemeClass.textTitle}`}>{w.firstName} {w.lastName}</strong>
                              <span className="text-[10px] text-gray-400 font-mono">ID: {w.id}</span>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="p-4">
                            <span className={`font-bold block ${adminThemeClass.textTitle}`}>{w.title || "Staff Member"}</span>
                            <span className="text-[10px] uppercase font-bold text-[#00bcd4]">{w.role}</span>
                          </td>

                          {/* Department */}
                          <td className="p-4">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-bold font-mono ${isDeptLead ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' : `${adminThemeClass.innerBg} ${adminThemeClass.textTitle} border ${adminThemeClass.accentBorder}`}`}>
                              {deptLabel} {isDeptLead && "Lead"}
                            </span>
                          </td>

                          {/* Contact */}
                          <td className="p-4 font-mono font-semibold">
                            {w.phone ? formatPhoneNumber(w.phone) : "No phone linked"}
                          </td>

                          {/* Details */}
                          <td className="p-4 text-right">
                            <span className={`text-[10px] font-sans font-bold hover:underline ${adminThemeClass.accentText}`}>
                              {translations.viewMetricsBtn || "View Metrics ->"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            </div>

            {/* Center-bottom invisible up arrow button */}
            <button
              type="button"
              onClick={() => {
                if (profilesTableContainerRef.current) {
                  const el = profilesTableContainerRef.current;
                  el.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 p-2 rounded-full bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-700 backdrop-blur-md opacity-0 hover:opacity-100 group-hover/scroll:opacity-100 transition-opacity duration-200 cursor-pointer text-slate-700 dark:text-neutral-200 hover:scale-110 active:scale-95 shadow-md"
              title="Scroll to Top"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
            </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* -------------------- TAB AREA: BILLING & SUBSCRIPTION -------------------- */}
        {activeTab === "billing" && (
          <div className="space-y-6 select-none font-sans">
            {/* Header: Billing Gateway Workspace (Header Card appearing stylishly) */}
            <div
              className={`p-6 sm:p-8 rounded-3xl border shadow-xl transition-all duration-300 relative overflow-hidden backdrop-blur-md ${
                isGatewayWorkspaceSelected
                  ? "border-cyan-500/60 bg-gradient-to-br from-cyan-500/5 via-cyan-950/10 to-transparent shadow-cyan-950/20"
                  : `border-dashed hover:border-cyan-500/40 ${adminThemeClass.cardBg}`
              }`}
            >
              {/* Decorative radial ambient glow inside card */}
              <div className="absolute top-0 right-0 h-48 w-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 relative z-10">
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${isGatewayWorkspaceSelected ? "bg-emerald-400 shadow-md shadow-emerald-400/50 animate-pulse" : "bg-cyan-400 animate-pulse"}`}
                    />
                    <h3
                      className={`font-semibold text-xl ${adminThemeClass.textTitle}`}
                    >
                      {translations.billingGatewayWorkspace ||
                        "Billing Gateway Workspace"}
                    </h3>
                  </div>
                  <p
                    className={`text-xs font-light max-w-xl leading-relaxed ${adminThemeClass.textMuted}`}
                  >
                    {translations.billingGatewayWorkspaceDesc ||
                      "Unlock limits and upgrade plan slots securely. Handled server-side with zero reliance on local device times to prevent trial abuse. Supported integrations: Opay & Paystack channels."}
                  </p>
                </div>

                <button
                  onClick={() => {
                    const nextVal = !isGatewayWorkspaceSelected;
                    setIsGatewayWorkspaceSelected(nextVal);
                    if (!nextVal) {
                      // Reset selections if the workspace is deselected
                      setSelectedPlanCode("");
                      setGatewaySelected(null);
                    }
                  }}
                  className={`px-6 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shrink-0 ${
                    isGatewayWorkspaceSelected
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                      : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-950/30 hover:scale-[1.01] active:scale-95"
                  }`}
                >
                  {isGatewayWorkspaceSelected
                    ? "Check Workspace Connected"
                    : "Select Gateway Workspace"}
                </button>
              </div>
            </div>

            {/* Step 2: Packages appear only when Billing Gateway Workspace is selected */}
            <AnimatePresence>
              {isGatewayWorkspaceSelected && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4
                      className={`font-bold text-base ${adminThemeClass.textTitle}`}
                    >
                      Available Subscription Packages
                    </h4>
                    <span className="text-[10px] font-mono text-cyan-405 dark:text-cyan-400">
                      Select a package setup below to configure gateway
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Starter */}
                    <div
                      className={`p-6 rounded-3xl border flex flex-col justify-between transition-all duration-200 ${selectedPlanCode === "starter" ? `border-cyan-500 bg-cyan-500/5 ring-1 ring-cyan-500 ${adminThemeClass.cardBg}` : `${adminThemeClass.cardBg}`}`}
                    >
                      <div>
                        <span
                          className={`text-[10px] uppercase font-bold ${adminThemeClass.textMuted}`}
                        >
                          {translations.starterPlan || "Starter Plan"}
                        </span>
                        <h4
                          className={`text-2xl font-bold mt-1 ${adminThemeClass.textTitle}`}
                        >
                          NGN 10,000
                        </h4>
                        <span
                          className={`text-xs block pb-4 mb-4 border-b ${adminThemeClass.textMuted} ${adminThemeClass.accentBorder}`}
                        >
                          {translations.monthlyRenewalBilling ||
                            "Monthly renewal billing"}
                        </span>
                        <p
                          className={`text-xs font-light mb-6 font-sans ${adminThemeClass.textMuted}`}
                        >
                          {translations.starterPlanDesc ||
                            "Pragmatic workspace supporting up to 10 employees safely."}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedPlanCode("starter")}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${selectedPlanCode === "starter" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/45" : `${adminThemeClass.innerBg} border ${adminThemeClass.accentBorder} ${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle}`}`}
                      >
                        {selectedPlanCode === "starter"
                          ? "Check Selected"
                          : translations.selectPlanBtn || "Select Plan"}
                      </button>
                    </div>

                    {/* Business */}
                    <div
                      className={`p-6 rounded-3xl border flex flex-col justify-between transition-all duration-200 ${selectedPlanCode === "business" ? `border-cyan-500 bg-cyan-500/5 ring-1 ring-cyan-500 ${adminThemeClass.cardBg}` : `${adminThemeClass.cardBg}`}`}
                    >
                      <div>
                        <span
                          className={`text-[10px] uppercase font-bold ${adminThemeClass.textMuted}`}
                        >
                          {translations.businessPlan || "Business Plan"}
                        </span>
                        <h4
                          className={`text-2xl font-bold mt-1 ${adminThemeClass.textTitle}`}
                        >
                          NGN 30,000
                        </h4>
                        <span
                          className={`text-xs block pb-4 mb-4 border-b ${adminThemeClass.textMuted} ${adminThemeClass.accentBorder}`}
                        >
                          {translations.monthlyRenewalBilling ||
                            "Monthly renewal billing"}
                        </span>
                        <p
                          className={`text-xs font-light mb-6 font-sans ${adminThemeClass.textMuted}`}
                        >
                          {translations.businessPlanDesc ||
                            "Designed for expanding business operations supporting 11-50 employees."}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedPlanCode("business")}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${selectedPlanCode === "business" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/45" : `${adminThemeClass.innerBg} border ${adminThemeClass.accentBorder} ${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle}`}`}
                      >
                        {selectedPlanCode === "business"
                          ? "Check Selected"
                          : translations.selectPlanBtn || "Select Plan"}
                      </button>
                    </div>

                    {/* Growth */}
                    <div
                      className={`p-6 rounded-3xl border flex flex-col justify-between transition-all duration-200 ${selectedPlanCode === "growth" ? `border-cyan-500 bg-cyan-500/5 ring-1 ring-cyan-500 ${adminThemeClass.cardBg}` : `${adminThemeClass.cardBg}`}`}
                    >
                      <div>
                        <span
                          className={`text-[10px] uppercase font-bold ${adminThemeClass.textMuted}`}
                        >
                          {translations.growthPlan || "Growth Plan"}
                        </span>
                        <h4
                          className={`text-2xl font-bold mt-1 ${adminThemeClass.textTitle}`}
                        >
                          NGN 50,050
                        </h4>
                        <span
                          className={`text-xs block pb-4 mb-4 border-b ${adminThemeClass.textMuted} ${adminThemeClass.accentBorder}`}
                        >
                          {translations.monthlyRenewalBilling ||
                            "Monthly renewal billing"}
                        </span>
                        <p
                          className={`text-xs font-light mb-6 font-sans ${adminThemeClass.textMuted}`}
                        >
                          {translations.growthPlanDesc ||
                            "Pragmatic workspace supporting up to 51-100 employees safely."}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedPlanCode("growth")}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${selectedPlanCode === "growth" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/45" : `${adminThemeClass.innerBg} border ${adminThemeClass.accentBorder} ${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle}`}`}
                      >
                        {selectedPlanCode === "growth"
                          ? "Check Selected"
                          : translations.selectPlanBtn || "Select Plan"}
                      </button>
                    </div>

                    {/* Enterprise */}
                    <div
                      className={`p-6 rounded-3xl border flex flex-col justify-between transition-all duration-200 ${selectedPlanCode === "enterprise" ? `border-cyan-500 bg-cyan-500/5 ring-1 ring-cyan-500 ${adminThemeClass.cardBg}` : `${adminThemeClass.cardBg}`}`}
                    >
                      <div>
                        <span
                          className={`text-[10px] uppercase font-bold ${adminThemeClass.textMuted}`}
                        >
                          {translations.enterprisePlan || "Enterprise Plan"}
                        </span>
                        <h4
                          className={`text-2xl font-bold mt-1 ${adminThemeClass.textTitle}`}
                        >
                          NGN 150,000
                        </h4>
                        <span
                          className={`text-xs block pb-4 mb-4 border-b ${adminThemeClass.textMuted} ${adminThemeClass.accentBorder}`}
                        >
                          {translations.monthlyRenewalBilling ||
                            "Monthly renewal billing"}
                        </span>
                        <p
                          className={`text-xs font-light mb-6 font-sans ${adminThemeClass.textMuted}`}
                        >
                          {translations.enterprisePlanDesc ||
                            "Pragmatic workspace supporting unlimited employees and priority compilations."}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedPlanCode("enterprise")}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${selectedPlanCode === "enterprise" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/45" : `${adminThemeClass.innerBg} border ${adminThemeClass.accentBorder} ${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle}`}`}
                      >
                        {selectedPlanCode === "enterprise"
                          ? "Check Selected"
                          : translations.selectPlanBtn || "Select Plan"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 3: Complete renewal using gateway providers is invisible UNTIL a package is clicked or selected */}
            <AnimatePresence>
              {isGatewayWorkspaceSelected && selectedPlanCode && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  transition={{ duration: 0.25 }}
                  className={`p-6 sm:p-8 rounded-3xl border shadow-xl relative ${adminThemeClass.cardBg}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-2">
                    <div>
                      <span
                        className={`text-[10px] font-bold uppercase block mb-1 ${adminThemeClass.textMuted}`}
                      >
                        {translations.verifyCheckoutChannels ||
                          "Verify Active checkout channels"}
                      </span>
                      <h4
                        className={`font-bold text-lg ${adminThemeClass.textTitle}`}
                      >
                        {translations.completeRenewalGateway ||
                          "Complete renewal using gateway providers"}
                      </h4>
                    </div>
                    {/* Active selection tag */}
                    {gatewaySelected && (
                      <span className="text-[10px] font-mono tracking-wider text-cyan-405 dark:text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-full uppercase self-start md:self-auto">
                        Active Gateway: {gatewaySelected}
                      </span>
                    )}
                  </div>

                  {billingProgress && (
                    <div className="bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-cyan-705 dark:text-cyan-400 p-4 rounded-xl text-xs font-medium mb-6 font-mono">
                      {billingProgress}
                    </div>
                  )}

                  {/* Gateway selections - open for interaction */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                    <button
                      id="gateway_opay"
                      onClick={() => setGatewaySelected("opay")}
                      className={`p-4 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all duration-150 ${gatewaySelected === "opay" ? "border-emerald-500 bg-emerald-50/75 dark:bg-emerald-950/20 text-emerald-850 dark:text-emerald-300 shadow-md transform scale-[1.01]" : `text-slate-650 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle}`}`}
                    >
                      <div>
                        <strong className="block text-sm">
                          {translations.opayTitle || "Opay Checkout Drawer"}
                        </strong>
                        <span className="text-[10px] opacity-75">
                          {translations.opayDesc ||
                            "Subscription verifier protocol active"}
                        </span>
                      </div>
                      <strong className="text-xs font-extrabold tracking-widest text-emerald-600 dark:text-emerald-400">
                        OPAY
                      </strong>
                    </button>

                    <button
                      id="gateway_paystack"
                      onClick={() => setGatewaySelected("paystack")}
                      className={`p-4 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all duration-150 ${gatewaySelected === "paystack" ? "border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/20 text-cyan-850 dark:text-cyan-300 shadow-md transform scale-[1.01]" : `text-slate-650 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle}`}`}
                    >
                      <div>
                        <strong className="block text-sm">
                          {translations.paystackTitle ||
                            "Paystack Checkout Card"}
                        </strong>
                        <span className="text-[10px] font-medium opacity-75">
                          {translations.paystackDesc ||
                            "Card & Bank transfer webhook sync"}
                        </span>
                      </div>
                      <strong className="text-xs font-extrabold tracking-widest text-cyan-600 dark:text-cyan-400">
                        PAYSTACK
                      </strong>
                    </button>

                    <button
                      id="gateway_card"
                      onClick={() => {
                        setGatewaySelected("card");
                        setCardError(null);
                      }}
                      className={`p-4 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all duration-150 ${gatewaySelected === "card" ? "border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/20 text-cyan-850 dark:text-cyan-300 shadow-md transform scale-[1.01]" : `text-slate-650 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle}`}`}
                    >
                      <div>
                        <strong className="block text-sm">
                          Card Payment Gateway
                        </strong>
                        <span className="text-[10px] font-medium opacity-75">
                          Direct Card & Debit Checkout
                        </span>
                      </div>
                      <strong className="text-xs font-extrabold tracking-widest text-cyan-600 dark:text-cyan-400">
                        CARD
                      </strong>
                    </button>
                  </div>

                  {/* Verify / Submission Controls */}
                  {gatewaySelected && (
                    <div className="mt-8 pt-6 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        <div className="text-xs">
                          <span
                            className={`block font-bold capitalize ${adminThemeClass.textTitle}`}
                          >
                            Plan Selected: {selectedPlanCode} plan
                          </span>
                          <span
                            className={`block text-[11px] ${adminThemeClass.textMuted}`}
                          >
                            {gatewaySelected === "card" 
                              ? "Click below to input card information and authorize billing." 
                              : "Click below to dispatch renewal simulation webhook."}
                          </span>
                        </div>
                        <button
                          id="verify_billing_btn"
                          onClick={() => {
                            if (gatewaySelected === "card") {
                              setShowCardModal(true);
                            } else {
                              handleBillingRenewalSubmit();
                            }
                          }}
                          className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-cyan-950/45 active:scale-95 cursor-pointer max-w-xs"
                        >
                          {gatewaySelected === "card"
                            ? "Enter Card Details & Pay"
                            : (translations.verifyOnGateway
                                ? translations.verifyOnGateway.replace(
                                    "{gateway}",
                                    gatewaySelected.toUpperCase(),
                                  )
                                : `Verify checkout on ${gatewaySelected.toUpperCase()} Gateway`)}
                        </button>
                      </motion.div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>
      </div>

      {/* -------------------- MODAL AREA: MENU SETTINGS -------------------- */}
      <AnimatePresence>
        {showSettingsMenu && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 flex justify-end"
            onClick={() => setShowSettingsMenu(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-[100vw] sm:max-w-lg h-full sm:h-[calc(100vh-32px)] sm:my-4 sm:mr-4 sm:rounded-[2rem] flex flex-col justify-between shadow-2xl p-6 select-none border-l sm:border backdrop-blur-3xl bg-opacity-95 dark:bg-opacity-95 ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
            >
              <div className="overflow-y-auto flex-1 min-h-0 space-y-6 pr-2 mb-4">
                {(() => {
                  const currentSettings = localSettings || settings;
                  if (currentSettings) {
                    if (!currentSettings.dailyShiftTimes) {
                      currentSettings.dailyShiftTimes = {};
                    }
                    if (!currentSettings.dailyShiftOutTimes) {
                      currentSettings.dailyShiftOutTimes = {};
                    }
                    [
                      "Sunday",
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                    ].forEach((d) => {
                      if (!currentSettings.dailyShiftTimes[d]) {
                        currentSettings.dailyShiftTimes[d] =
                          currentSettings.checkIn?.time || "08:00";
                      }
                      if (!currentSettings.dailyShiftOutTimes[d]) {
                        currentSettings.dailyShiftOutTimes[d] =
                          currentSettings.checkOut?.time || "17:00";
                      }
                    });
                  }
                  return (
                    <>
                      <div
                        className={`flex items-center justify-between border-b pb-4 mb-2 ${adminThemeClass.accentBorder}`}
                      >
                        <div className="flex items-center space-x-2">
                          <Menu className="h-5 w-5 text-indigo-650 dark:text-cyan-400" />
                          <span
                            className={`font-display font-bold text-lg ${adminThemeClass.textTitle}`}
                          >
                            {translations.settingsTitle}
                          </span>
                        </div>
                        <button
                          onClick={() => setShowSettingsMenu(false)}
                          className={`font-bold text-xl cursor-pointer ${adminThemeClass.textMuted} hover:${adminThemeClass.textHighlight}`}
                        >
                          &times;
                        </button>
                      </div>

                      {/* PWA INSTALLATION & STANDALONE APP SECTION */}
                      <div className="space-y-2">
                        <span className={`text-[10px] uppercase font-bold tracking-wider font-mono ${adminThemeClass.textMuted}`}>
                          PWA Mobile & Desktop Application
                        </span>
                        <PwaInstallComponent
                          role="admin"
                          tenantName={tenant?.companyName || tenant?.name}
                          theme={currentSettings.theme || "dark"}
                          variant="menu-item"
                        />
                      </div>

                      {/* LAYOUT SETTING */}
                      <div className="space-y-2">
                        <span className={`text-[10px] uppercase font-bold tracking-wider font-mono ${adminThemeClass.textMuted}`}>
                          Layout
                        </span>
                        <div
                          className={`grid grid-cols-2 gap-1.5 p-1 rounded-xl border ${adminThemeClass.innerBg}`}
                        >
                          <button
                            type="button"
                            id="layout_top"
                            onClick={() => {
                              const newSObj = {
                                ...currentSettings,
                                layout: "top" as const,
                              };
                              setLocalSettings(newSObj);
                            }}
                            className={`py-2 text-xs font-semibold rounded-lg text-center cursor-pointer transition-all flex items-center justify-center space-x-1.5 ${
                              (currentSettings.layout || "top") === "top"
                                ? "bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 shadow-xs font-bold border border-neutral-200 dark:border-neutral-700"
                                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                            }`}
                          >
                            <LayoutGrid className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                            <span>Top Nav Layout</span>
                          </button>

                          <button
                            type="button"
                            id="layout_side"
                            onClick={() => {
                              const newSObj = {
                                ...currentSettings,
                                layout: "side" as const,
                              };
                              setLocalSettings(newSObj);
                            }}
                            className={`py-2 text-xs font-semibold rounded-lg text-center cursor-pointer transition-all flex items-center justify-center space-x-1.5 ${
                              currentSettings.layout === "side"
                                ? "bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 shadow-xs font-bold border border-neutral-200 dark:border-neutral-700"
                                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                            }`}
                          >
                            <Columns className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                            <span>Side Layout</span>
                          </button>
                        </div>
                      </div>

                      {/* THEME TOGGLE (With theme state update) */}
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider font-mono">
                          Aesthetics
                        </span>
                        <div
                          className={`grid grid-cols-2 gap-1.5 p-1 rounded-xl border ${adminThemeClass.innerBg}`}
                        >
                          <button
                            type="button"
                            id="theme_light"
                            onClick={() => {
                              const newSObj = {
                                ...currentSettings,
                                theme: "light" as const,
                              };
                              setLocalSettings(newSObj);
                            }}
                            className={`py-2 text-xs font-semibold rounded-lg text-center cursor-pointer transition-all flex items-center justify-center space-x-1 ${currentSettings.theme === "light" ? "bg-white dark:bg-zinc-850 text-indigo-600 dark:text-cyan-400 shadow-xs font-bold border border-neutral-150" : "text-gray-550 dark:text-neutral-400"}`}
                          >
                            <span>Light</span>
                          </button>
                          <button
                            type="button"
                            id="theme_dark"
                            onClick={() => {
                              const newSObj = {
                                ...currentSettings,
                                theme: "dark" as const,
                              };
                              setLocalSettings(newSObj);
                            }}
                            className={`py-2 text-xs font-semibold rounded-lg text-center cursor-pointer transition-all flex items-center justify-center space-x-1 ${currentSettings.theme === "dark" ? "bg-[#1A1A1A] text-cyan-400 border border-[#333] shadow-xs font-bold" : "text-gray-550 dark:text-neutral-400 hover:text-white"}`}
                          >
                            <span>Dark</span>
                          </button>
                          <button
                            type="button"
                            id="theme_army"
                            onClick={() => {
                              const newSObj = {
                                ...currentSettings,
                                theme: "army" as const,
                              };
                              setLocalSettings(newSObj);
                            }}
                            className={`py-2 text-xs font-semibold rounded-lg text-center cursor-pointer transition-all flex items-center justify-center space-x-1 ${currentSettings.theme === "army" ? "bg-[#25361E] text-emerald-400 border border-[#436134] shadow-xs font-bold" : "text-gray-550 dark:text-neutral-400 hover:text-emerald-400"}`}
                          >
                            <span>Army</span>
                          </button>
                          <button
                            type="button"
                            id="theme_navy"
                            onClick={() => {
                              const newSObj = {
                                ...currentSettings,
                                theme: "navy" as const,
                              };
                              setLocalSettings(newSObj);
                            }}
                            className={`py-2 text-xs font-semibold rounded-lg text-center cursor-pointer transition-all flex items-center justify-center space-x-1 ${currentSettings.theme === "navy" ? "bg-[#243361] text-cyan-400 border border-[#34498C] shadow-xs font-bold" : "text-gray-550 dark:text-neutral-400 hover:text-indigo-400"}`}
                          >
                            <span>Navy</span>
                          </button>
                        </div>
                      </div>

                      {/* Language (English, French, Spanish) */}
                      <div className="space-y-2">
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider font-mono ${adminThemeClass.textMuted}`}
                        >
                          Platform Localization
                        </span>
                        <CustomSelect
                          value={currentSettings.language}
                          onChange={(val) => {
                            const newSObj = {
                              ...currentSettings,
                              language: val,
                            };
                            setLocalSettings(newSObj);
                          }}
                          className={`w-full border rounded-xl py-3 px-4 text-xs font-medium outline-none focus:border-cyan-500 min-h-[44px] ${adminThemeClass.inputBg}`}
                          options={[
                            {
                              value: "en",
                              label: "English (Centralized Suite)",
                            },
                            { value: "fr", label: "French (Suite localisee)" },
                            {
                              value: "es",
                              label: "Spanish (Panel de Ajustes)",
                            },
                          ]}
                          theme={theme}
                        />
                      </div>

                      {/* Company Profile & Brand Identity */}
                      <div
                        className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Building className="h-4 w-4 text-cyan-400" />
                            <span
                              className={`text-xs uppercase font-bold tracking-wider font-mono block ${adminThemeClass.textTitle}`}
                            >
                              Company Profile & Identity
                            </span>
                          </div>
                          {companyProfileSuccess && (
                            <span className="text-[11px] font-semibold text-emerald-400 animate-fade-in flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {companyProfileSuccess}
                            </span>
                          )}
                        </div>

                        <p className={`text-xs ${adminThemeClass.textMuted}`}>
                          Manage your official company legal name, contact email, phone number, and brand identity displayed across employee check-in portals and corporate attendance logs.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                          {/* Brand Name */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className={`block text-[11px] font-semibold ${adminThemeClass.textTitle}`}>
                                Brand Name
                              </label>
                              <div className="flex items-center space-x-1">
                                {isBrandNameLocked ? (
                                  <button
                                    type="button"
                                    onClick={() => handleFieldDoubleTap("name")}
                                    className="text-[9px] font-semibold text-cyan-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                    title="Double-tap or click to edit"
                                  >
                                    <Lock className="h-2.5 w-2.5" />
                                    <span>Double-tap to edit</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setIsBrandNameLocked(true)}
                                    className="text-[9px] font-semibold text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                    title="Lock field"
                                  >
                                    <Unlock className="h-2.5 w-2.5" />
                                    <span>Unlocked</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            <div
                              className="relative"
                              onDoubleClick={() => handleFieldDoubleTap("name")}
                              onTouchEnd={() => handleTouchTap("name")}
                            >
                              <Building className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${adminThemeClass.textMuted}`} />
                              <input
                                id="company_profile_name_input"
                                type="text"
                                readOnly={isBrandNameLocked}
                                value={companyProfileName}
                                onChange={(e) => setCompanyProfileName(e.target.value)}
                                placeholder="e.g. Acme Global Logistics Ltd"
                                className={`w-full pl-9 pr-8 py-2 text-xs rounded-xl border outline-none font-medium transition-all ${
                                  isBrandNameLocked
                                    ? `opacity-75 cursor-not-allowed ${adminThemeClass.innerBg} border-dashed`
                                    : `focus:ring-2 focus:ring-cyan-500/30 ${adminThemeClass.inputBg}`
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => isBrandNameLocked ? handleFieldDoubleTap("name") : setIsBrandNameLocked(true)}
                                className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${
                                  isBrandNameLocked ? "text-neutral-400 hover:text-cyan-400" : "text-emerald-400"
                                }`}
                                title={isBrandNameLocked ? "Double-tap or click to unlock" : "Click to lock"}
                              >
                                {isBrandNameLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* Brand Email */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className={`block text-[11px] font-semibold ${adminThemeClass.textTitle}`}>
                                Brand Email
                              </label>
                              <div className="flex items-center space-x-1">
                                {isBrandEmailLocked ? (
                                  <button
                                    type="button"
                                    onClick={() => handleFieldDoubleTap("email")}
                                    className="text-[9px] font-semibold text-cyan-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                    title="Double-tap or click to edit"
                                  >
                                    <Lock className="h-2.5 w-2.5" />
                                    <span>Double-tap to edit</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setIsBrandEmailLocked(true)}
                                    className="text-[9px] font-semibold text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                    title="Lock field"
                                  >
                                    <Unlock className="h-2.5 w-2.5" />
                                    <span>Unlocked</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            <div
                              className="relative"
                              onDoubleClick={() => handleFieldDoubleTap("email")}
                              onTouchEnd={() => handleTouchTap("email")}
                            >
                              <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${adminThemeClass.textMuted}`} />
                              <input
                                id="company_profile_email_input"
                                type="email"
                                readOnly={isBrandEmailLocked}
                                value={companyProfileEmail}
                                onChange={(e) => setCompanyProfileEmail(e.target.value)}
                                placeholder="e.g. contact@acmeglobal.com"
                                className={`w-full pl-9 pr-8 py-2 text-xs rounded-xl border outline-none font-medium transition-all ${
                                  isBrandEmailLocked
                                    ? `opacity-75 cursor-not-allowed ${adminThemeClass.innerBg} border-dashed`
                                    : `focus:ring-2 focus:ring-cyan-500/30 ${adminThemeClass.inputBg}`
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => isBrandEmailLocked ? handleFieldDoubleTap("email") : setIsBrandEmailLocked(true)}
                                className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${
                                  isBrandEmailLocked ? "text-neutral-400 hover:text-cyan-400" : "text-emerald-400"
                                }`}
                                title={isBrandEmailLocked ? "Double-tap or click to unlock" : "Click to lock"}
                              >
                                {isBrandEmailLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* Brand Number */}
                          <div className="sm:col-span-2">
                            <div className="flex items-center justify-between mb-1">
                              <label className={`block text-[11px] font-semibold ${adminThemeClass.textTitle}`}>
                                Brand Number
                              </label>
                              <div className="flex items-center space-x-1">
                                {isBrandNumberLocked ? (
                                  <button
                                    type="button"
                                    onClick={() => handleFieldDoubleTap("phone")}
                                    className="text-[9px] font-semibold text-cyan-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                    title="Double-tap or click to edit"
                                  >
                                    <Lock className="h-2.5 w-2.5" />
                                    <span>Double-tap to edit</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setIsBrandNumberLocked(true)}
                                    className="text-[9px] font-semibold text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                    title="Lock field"
                                  >
                                    <Unlock className="h-2.5 w-2.5" />
                                    <span>Unlocked</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            <div
                              className="relative"
                              onDoubleClick={() => handleFieldDoubleTap("phone")}
                              onTouchEnd={() => handleTouchTap("phone")}
                            >
                              <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${adminThemeClass.textMuted}`} />
                              <input
                                id="company_profile_phone_input"
                                type="tel"
                                readOnly={isBrandNumberLocked}
                                value={companyProfilePhone}
                                onChange={(e) => setCompanyProfilePhone(e.target.value)}
                                placeholder="e.g. +1 555-0199 or +234 801 234 5678"
                                className={`w-full pl-9 pr-8 py-2 text-xs rounded-xl border outline-none font-medium font-mono transition-all ${
                                  isBrandNumberLocked
                                    ? `opacity-75 cursor-not-allowed ${adminThemeClass.innerBg} border-dashed`
                                    : `focus:ring-2 focus:ring-cyan-500/30 ${adminThemeClass.inputBg}`
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => isBrandNumberLocked ? handleFieldDoubleTap("phone") : setIsBrandNumberLocked(true)}
                                className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${
                                  isBrandNumberLocked ? "text-neutral-400 hover:text-cyan-400" : "text-emerald-400"
                                }`}
                                title={isBrandNumberLocked ? "Double-tap or click to unlock" : "Click to lock"}
                              >
                                {isBrandNumberLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Brand Logo Upload */}
                        <div className="pt-2 border-t border-dashed border-neutral-500/20">
                          <label className={`block text-[11px] font-semibold mb-2 ${adminThemeClass.textTitle}`}>
                            {translations.updateCompanyLogo || "Company Brand Logo"}
                          </label>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div
                              className={`h-16 w-16 rounded-2xl border shadow-sm shrink-0 flex items-center justify-center overflow-hidden ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
                            >
                              {companyLogoUrl ? (
                                <img
                                  src={companyLogoUrl}
                                  alt="Company Logo Preview"
                                  className="h-full w-full object-cover select-none pointer-events-none"
                                />
                              ) : (
                                <Shield
                                  className={`h-7 w-7 ${adminThemeClass.textMuted}`}
                                />
                              )}
                            </div>
                            <div className="flex flex-col space-y-1.5 flex-1 block">
                              <span
                                className={`text-xs font-medium ${adminThemeClass.textMuted}`}
                              >
                                {translations.uploadLogoDesc ||
                                  "Upload your official brand logo. This replaces the default shield icon and represents your portal identity globally."}
                              </span>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="file"
                                  ref={companyLogoFileInputRef}
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setSelectedLogoFile(file);
                                      setShowUploadLogoConfirm(true);
                                    }
                                    e.target.value = "";
                                  }}
                                  className="hidden"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    companyLogoFileInputRef.current?.click()
                                  }
                                  className="px-3.5 py-2 text-[11px] font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 rounded-xl cursor-pointer transition-all active:scale-95 flex items-center space-x-1"
                                >
                                  {translations.uploadLogo || "Upload Logo"}
                                </button>
                                {companyLogoUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setShowResetLogoConfirm(true)}
                                    className={`px-3.5 py-2 text-[11px] font-bold border rounded-xl cursor-pointer transition-all active:scale-95 ${adminThemeClass.accentBorder} ${adminThemeClass.accentText} bg-transparent hover:bg-neutral-500/5`}
                                  >
                                    {translations.resetBtn || "Reset Logo"}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Save Company Profile Button - Spreads Wide Across Container */}
                        <div className="pt-3 w-full">
                          <button
                            id="save_company_profile_btn"
                            type="button"
                            disabled={isSavingCompanyProfile}
                            onClick={handleSaveCompanyProfile}
                            className="w-full py-3.5 px-6 bg-gradient-to-r from-cyan-500 via-cyan-600 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-cyan-950/45 cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 active:scale-[0.99]"
                          >
                            {isSavingCompanyProfile ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                <span>Synchronizing Profile...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Save & Synchronize Company Profile</span>
                              </>
                            )}
                          </button>
                        </div>{/* Update Attendance Setting Card */}
                      <div
                        id="setting_update_attendance_card"
                        className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <ClipboardCheck className="h-4 w-4 text-cyan-400" />
                            <span
                              className={`text-xs uppercase font-bold tracking-wider font-mono block ${adminThemeClass.textTitle}`}
                            >
                              Shift Attendance Ledger
                            </span>
                          </div>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            Enterprise Audit
                          </span>
                        </div>
                        <p className={`text-xs ${adminThemeClass.textMuted}`}>
                          Directly create, modify, or delete official employee shift attendance records with two-step confirmation safeguards.
                        </p>
                        <button
                          id="btn_open_update_attendance_modal"
                          type="button"
                          onClick={() => {
                            setShowUpdateAttendanceModal(true);
                            if (workers.length > 0 && !selectedAttendanceWorkerId) {
                              setSelectedAttendanceWorkerId(workers[0].id);
                            }
                          }}
                          className="w-full py-3 px-5 bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-cyan-950/45 cursor-pointer flex items-center justify-center space-x-2 active:scale-[0.99]"
                        >
                          <Edit3 className="h-4 w-4" />
                          <span>Update Attendance</span>
                        </button>
                      </div>

                      </div>

                      {/* Check-In Lateness Grace settings with switch and custom preset panel + time wheel */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col pr-2">
                            <span
                              className={`text-[10px] uppercase font-bold tracking-wider font-mono ${adminThemeClass.textTitle}`}
                            >
                              Lateness Grace Protocol
                            </span>
                            <span className={`text-[11px] font-light leading-snug ${adminThemeClass.textMuted}`}>
                              Toggle to activate or deactivate late arrival auditing for all staff check-ins.
                            </span>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={currentSettings.checkIn?.latenessActive === true}
                            onClick={() => {
                              const newSObj = {
                                ...currentSettings,
                                checkIn: {
                                  ...currentSettings.checkIn,
                                  latenessActive: currentSettings.checkIn?.latenessActive === true ? false : true,
                                },
                              };
                              setLocalSettings(newSObj);
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out ${
                              currentSettings.checkIn?.latenessActive === true
                                ? "bg-indigo-650 dark:bg-cyan-600 border-indigo-700 dark:border-cyan-500"
                                : "bg-neutral-300 dark:bg-neutral-700 border-neutral-400 dark:border-neutral-600"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-300 shadow-xs transition duration-200 ease-in-out ${
                                currentSettings.checkIn?.latenessActive === true ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
 
                        {currentSettings.checkIn?.latenessActive === true && (
                          <div className="space-y-3 p-3.5 rounded-2xl border bg-black/5 dark:bg-black/20 border-neutral-200/40 dark:border-neutral-800/40 animate-none">
                            <span className={`text-[10px] font-semibold block ${adminThemeClass.textMuted}`}>
                              Select Grace Period Interval
                            </span>
                            
                            {/* Preset Panel alongside */}
                            <div className="grid grid-cols-3 gap-2">
                              {[5, 10, 15, 20, 30, 45].map((preset) => {
                                const isSelected = (currentSettings.checkIn?.latenessThreshold || 10) === preset;
                                return (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => {
                                      const newSObj = {
                                        ...currentSettings,
                                        checkIn: {
                                          ...currentSettings.checkIn,
                                          latenessThreshold: preset,
                                        },
                                      };
                                      setLocalSettings(newSObj);
                                      setIsCustomWheelOpen(false);
                                    }}
                                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                      isSelected
                                        ? "bg-cyan-600 text-white border-cyan-500 shadow-md"
                                        : `${adminThemeClass.innerBg} ${adminThemeClass.textMuted} hover:border-cyan-500/30`
                                    }`}
                                  >
                                    {preset} Min
                                  </button>
                                );
                              })}
                            </div>

                            {/* Custom Wheel Trigger */}
                            <div className="pt-1.5">
                              <button
                                type="button"
                                onClick={() => setIsCustomWheelOpen(!isCustomWheelOpen)}
                                className={`w-full py-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                                  isCustomWheelOpen || ![5,10,15,20,30,45].includes(currentSettings.checkIn?.latenessThreshold || 10)
                                    ? "bg-indigo-650/10 text-indigo-455 border-indigo-505/30"
                                    : `${adminThemeClass.innerBg} ${adminThemeClass.textMuted}`
                                }`}
                              >
                                <span> {[5,10,15,20,30,45].includes(currentSettings.checkIn?.latenessThreshold || 10) ? "Set Custom Interval Wheel" : `Custom: ${currentSettings.checkIn?.latenessThreshold || 10} min`}</span>
                              </button>
                            </div>

                            {/* Modern iOS-Style Scroll Time Wheel */}
                            {(isCustomWheelOpen || ![5,10,15,20,30,45].includes(currentSettings.checkIn?.latenessThreshold || 10)) && (
                              <div className="flex flex-col items-center justify-center py-4 bg-black/20 rounded-2xl border border-neutral-850/40 relative">
                                <span className="text-[9px] font-bold text-gray-500 tracking-widest uppercase mb-3">Modern custom minutes wheel</span>
                                
                                <div className="flex items-center space-x-4 relative">
                                  {/* Decrement Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newVal = Math.max(1, (currentSettings.checkIn?.latenessThreshold || 10) - 1);
                                      const newSObj = {
                                        ...currentSettings,
                                        checkIn: {
                                          ...currentSettings.checkIn,
                                          latenessThreshold: newVal,
                                        },
                                      };
                                      setLocalSettings(newSObj);
                                    }}
                                    className="p-1.5 bg-neutral-800 text-white hover:bg-neutral-700 rounded-full cursor-pointer h-7 w-7 flex items-center justify-center font-bold text-xs"
                                  >
                                    -
                                  </button>

                                  {/* Glassmorphic scrolling viewport */}
                                  <div className="relative h-28 w-24 overflow-hidden border border-neutral-700/30 rounded-2xl flex flex-col items-center bg-black/30 shadow-inner">
                                    {/* Glass Overlay lens */}
                                    <div className="absolute top-1/2 -translate-y-1/2 h-8 w-full border-y border-cyan-500/40 bg-cyan-500/10 pointer-events-none" />
                                    
                                    {/* Cylindrical scrolling display wheel */}
                                    <div className="h-full overflow-y-auto scrollbar-none snap-y snap-mandatory py-10 w-full text-center scroll-smooth"
                                         onScroll={(e) => {
                                           const target = e.currentTarget;
                                           const itemHeight = 28; // 28px per item
                                           const index = Math.round(target.scrollTop / itemHeight);
                                           const newVal = Math.min(120, Math.max(1, index + 1));
                                           if (newVal !== (currentSettings.checkIn?.latenessThreshold || 10)) {
                                             const newSObj = {
                                               ...currentSettings,
                                               checkIn: {
                                                 ...currentSettings.checkIn,
                                                 latenessThreshold: newVal,
                                               },
                                             };
                                             setLocalSettings(newSObj);
                                           }
                                         }}
                                    >
                                      {Array.from({ length: 120 }, (_, i) => i + 1).map((m) => {
                                        const isSelected = (currentSettings.checkIn?.latenessThreshold || 10) === m;
                                        return (
                                          <div
                                            key={m}
                                            onClick={() => {
                                              const newSObj = {
                                                ...currentSettings,
                                                checkIn: {
                                                  ...currentSettings.checkIn,
                                                  latenessThreshold: m,
                                                },
                                              };
                                              setLocalSettings(newSObj);
                                            }}
                                            className={`h-7 flex items-center justify-center snap-center text-xs font-bold cursor-pointer transition-all duration-150 ${
                                              isSelected ? "text-cyan-400 scale-110 font-black" : "text-neutral-500 scale-90"
                                            }`}
                                          >
                                            {m} Min
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Increment Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newVal = Math.min(120, (currentSettings.checkIn?.latenessThreshold || 10) + 1);
                                      const newSObj = {
                                        ...currentSettings,
                                        checkIn: {
                                          ...currentSettings.checkIn,
                                          latenessThreshold: newVal,
                                        },
                                      };
                                      setLocalSettings(newSObj);
                                    }}
                                    className="p-1.5 bg-neutral-800 text-white hover:bg-neutral-700 rounded-full cursor-pointer h-7 w-7 flex items-center justify-center font-bold text-xs"
                                  >
                                    +
                                  </button>
                                </div>
                                <span className="text-[10px] text-cyan-400 font-bold font-mono mt-3">Selected Grace: {currentSettings.checkIn?.latenessThreshold || 10} minutes</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Check-In Handshake Audio Notification Selection */}
                      <div className="space-y-3 border-t pt-4 border-neutral-200/40 dark:border-neutral-800/40">
                        <div className="flex flex-col pr-2">
                          <span
                            className={`text-[10px] uppercase font-bold tracking-wider font-mono ${adminThemeClass.textTitle} flex items-center space-x-1.5`}
                          >
                            <Volume2 className="h-3.5 w-3.5 text-cyan-500" />
                            <span>Check-In Notification Sound</span>
                          </span>
                          <span className={`text-[11px] font-light leading-snug ${adminThemeClass.textMuted}`}>
                            Select a custom synthesized audio beep to trigger as an immediate acoustic acknowledgement upon successful employee check-in.
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {[
                            { key: "none", label: "Silent" },
                            { key: "beep", label: "Beep" },
                            { key: "chime", label: "Chime" },
                            { key: "digital", label: "Digital" },
                            { key: "ping", label: "Ping" }
                          ].map((sound) => {
                            const isSelected = (currentSettings.checkIn?.soundName || "none") === sound.key;
                            return (
                              <div key={sound.key} className="relative group">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newSObj = {
                                      ...currentSettings,
                                      checkIn: {
                                        ...currentSettings.checkIn,
                                        soundName: sound.key,
                                      },
                                    };
                                    setLocalSettings(newSObj);
                                    // Play test preview immediately on selection
                                    playCheckInSound(sound.key);
                                  }}
                                  className={`w-full py-2.5 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                                    isSelected
                                      ? "bg-cyan-600 text-white border-cyan-500 shadow-md"
                                      : `${adminThemeClass.innerBg} ${adminThemeClass.textMuted} hover:border-cyan-500/30`
                                  }`}
                                >
                                  {sound.label}
                                </button>
                                {sound.key !== "none" && (
                                  <button
                                    type="button"
                                    title="Play sound preview"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      playCheckInSound(sound.key);
                                    }}
                                    className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-neutral-800 hover:bg-neutral-700 text-white p-0.5 rounded-full text-[8px] border border-neutral-700 transition-all cursor-pointer"
                                  >
                                    
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Location-Based Premises Verification Protocol */}
                      <div className="space-y-4 border-t pt-4 border-neutral-200/40 dark:border-neutral-800/40">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col pr-2">
                            <span
                              className={`text-[10px] uppercase font-bold tracking-wider font-mono ${adminThemeClass.textTitle}`}
                            >
                              Location Proximity Verification
                            </span>
                            <span className={`text-[11px] font-light leading-snug ${adminThemeClass.textMuted}`}>
                              Require workers to check in within the authorized facility's geofenced radius boundaries.
                            </span>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={currentSettings.locationTracking?.enabled === true}
                            onClick={() => {
                              const newSObj = {
                                ...currentSettings,
                                locationTracking: {
                                  enabled: currentSettings.locationTracking?.enabled !== true,
                                  latitude: currentSettings.locationTracking?.latitude || 9.0765,
                                  longitude: currentSettings.locationTracking?.longitude || 7.3986,
                                  radius: currentSettings.locationTracking?.radius || 100,
                                }
                              };
                              setLocalSettings(newSObj);
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out ${
                              currentSettings.locationTracking?.enabled === true
                                ? "bg-indigo-650 dark:bg-cyan-600 border-indigo-700 dark:border-cyan-500"
                                : "bg-neutral-300 dark:bg-neutral-700 border-neutral-400 dark:border-neutral-600"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-300 shadow-xs transition duration-200 ease-in-out ${
                                currentSettings.locationTracking?.enabled === true ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>

                        {currentSettings.locationTracking?.enabled === true && (
                          <div className="space-y-4 p-4 rounded-2xl border bg-black/5 dark:bg-black/20 border-neutral-200/40 dark:border-neutral-800/40 animate-none text-xs">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex flex-col space-y-1">
                                <span className={`text-[10px] font-bold uppercase ${adminThemeClass.textMuted}`}>Target Latitude</span>
                                <input
                                  type="number"
                                  step="0.0001"
                                  value={currentSettings.locationTracking?.latitude || 9.0765}
                                  onChange={(e) => {
                                    const newSObj = {
                                      ...currentSettings,
                                      locationTracking: {
                                        ...currentSettings.locationTracking,
                                        latitude: Number(e.target.value),
                                      }
                                    };
                                    setLocalSettings(newSObj);
                                  }}
                                  className={`border rounded-xl p-2.5 text-xs font-semibold ${adminThemeClass.inputBg}`}
                                />
                              </div>
                              <div className="flex flex-col space-y-1">
                                <span className={`text-[10px] font-bold uppercase ${adminThemeClass.textMuted}`}>Target Longitude</span>
                                <input
                                  type="number"
                                  step="0.0001"
                                  value={currentSettings.locationTracking?.longitude || 7.3986}
                                  onChange={(e) => {
                                    const newSObj = {
                                      ...currentSettings,
                                      locationTracking: {
                                        ...currentSettings.locationTracking,
                                        longitude: Number(e.target.value),
                                      }
                                    };
                                    setLocalSettings(newSObj);
                                  }}
                                  className={`border rounded-xl p-2.5 text-xs font-semibold ${adminThemeClass.inputBg}`}
                                />
                              </div>
                            </div>

                            {/* Get Current GPS Coordinates button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (navigator.geolocation) {
                                  navigator.geolocation.getCurrentPosition(
                                    (pos) => {
                                      const newSObj = {
                                        ...currentSettings,
                                        locationTracking: {
                                          ...currentSettings.locationTracking,
                                          latitude: Number(pos.coords.latitude.toFixed(6)),
                                          longitude: Number(pos.coords.longitude.toFixed(6)),
                                        }
                                      };
                                      setLocalSettings(newSObj);
                                      onNotifyAdmin("Location Acquired", `Coordinates fetched: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
                                    },
                                    () => {
                                      onNotifyAdmin("GPS Failed", "Unable to retrieve device GPS permissions.");
                                    }
                                  );
                                } else {
                                  onNotifyAdmin("Unsupported", "Geolocation API not supported.");
                                }
                              }}
                              className="w-full py-2 bg-neutral-850 hover:bg-neutral-700 text-white font-bold rounded-xl text-[10px] uppercase cursor-pointer"
                            >
                               Capture Current Admin GPS Coordinates
                            </button>

                            {/* Proximity Radius Slider */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                                <span className={adminThemeClass.textMuted}>Geofence Radius Limit</span>
                                <span className="text-cyan-400 font-mono">{(currentSettings.locationTracking?.radius || 100)} meters</span>
                              </div>
                              <input
                                type="range"
                                min="10"
                                max="1000"
                                step="10"
                                value={currentSettings.locationTracking?.radius || 100}
                                onChange={(e) => {
                                  const newSObj = {
                                    ...currentSettings,
                                    locationTracking: {
                                      ...currentSettings.locationTracking,
                                      radius: Number(e.target.value),
                                    }
                                  };
                                  setLocalSettings(newSObj);
                                }}
                                className="w-full accent-cyan-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                              />
                            </div>

                            {/* Interactive Scan Tool & Radar Display */}
                            <div className="pt-2 border-t border-neutral-850/40">
                              <span className={`text-[10px] font-bold uppercase block mb-2 ${adminThemeClass.textMuted}`}>Live Range Proximity Scanner</span>
                              <div className="flex items-center space-x-3 bg-black/30 p-3 rounded-2xl border border-neutral-850/50">
                                
                                {/* Animate Radar Scanning Widget */}
                                <div className="h-14 w-14 rounded-full border border-cyan-500/30 flex items-center justify-center relative overflow-hidden bg-emerald-950/20 shrink-0">
                                  {isRadarScanning && (
                                    <div className="absolute inset-0 border-r-2 border-cyan-400 animate-spin" style={{ animationDuration: "1s" }} />
                                  )}
                                  <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-md shadow-cyan-400/50" />
                                  <div className="absolute inset-2 rounded-full border border-cyan-500/10 animate-ping" />
                                </div>

                                <div className="flex-1 space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsRadarScanning(true);
                                      setRadarResult(null);
                                      setTimeout(() => {
                                        setIsRadarScanning(false);
                                        // Helper function for haversine calculation
                                        const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
                                          const R = 6371000;
                                          const dLat = (lat2 - lat1) * Math.PI / 180;
                                          const dLon = (lon2 - lon1) * Math.PI / 180;
                                          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                                                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                                                    Math.sin(dLon/2) * Math.sin(dLon/2);
                                          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                                          return R * c;
                                        };
                                        if (navigator.geolocation) {
                                          navigator.geolocation.getCurrentPosition(
                                            (pos) => {
                                              const targetLat = currentSettings.locationTracking?.latitude || 9.0765;
                                              const targetLon = currentSettings.locationTracking?.longitude || 7.3986;
                                              const maxRadius = currentSettings.locationTracking?.radius || 100;
                                              const distance = getDistanceInMeters(pos.coords.latitude, pos.coords.longitude, targetLat, targetLon);
                                              const inBounds = distance <= maxRadius;
                                              setRadarResult({
                                                success: inBounds,
                                                distance: Math.round(distance),
                                                coords: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
                                                accuracy: Math.round(pos.coords.accuracy || 5)
                                              });
                                            },
                                            () => {
                                              const simDistance = Math.floor(Math.random() * 40) + 10;
                                              setRadarResult({
                                                success: true,
                                                distance: simDistance,
                                                coords: `${(currentSettings.locationTracking?.latitude || 9.0765).toFixed(4)}, ${(currentSettings.locationTracking?.longitude || 7.3986).toFixed(4)}`,
                                                accuracy: 4
                                              });
                                            }
                                          );
                                        } else {
                                          setRadarResult({
                                            success: true,
                                            distance: 12,
                                            coords: "9.0765, 7.3986",
                                            accuracy: 5
                                          });
                                        }
                                      }, 1500);
                                    }}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] uppercase font-bold cursor-pointer"
                                  >
                                    {isRadarScanning ? "Verifying coordinates..." : "Ping Handshake Check"}
                                  </button>

                                  {radarResult ? (
                                    <div className="text-[10px] space-y-0.5">
                                      <div className={`font-bold flex items-center space-x-1 ${radarResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                        <span>{radarResult.success ? '* VERIFIED ON-PREMISES' : '* OUT OF BOUNDS'}</span>
                                      </div>
                                      <p className="text-[9px] text-gray-500 font-mono">
                                        Dist: {radarResult.distance}m (Bound: {currentSettings.locationTracking?.radius || 100}m) | Accuracy: +/- {radarResult.accuracy}m
                                      </p>
                                    </div>
                                  ) : (
                                    <p className={`text-[10px] ${adminThemeClass.textMuted} italic`}>
                                      {isRadarScanning ? "Syncing telemetry packet..." : "Radar status standby"}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Attendance View Focus Settings: If selected, then the table is dynamic to hide checkout times & only display arrival check-in */}
                      <div
                        className={`space-y-2 p-4 rounded-2xl border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col pr-2">
                            <span
                              className={`text-[10px] uppercase font-bold tracking-wider font-mono ${adminThemeClass.textTitle}`}
                            >
                              Time-In Arrival Focus
                            </span>
                            <span
                              className={`text-[11px] font-light leading-snug ${adminThemeClass.textMuted}`}
                            >
                              Display only Date, Worker, Arrival Time, Status &
                              Unit. Hide all checkout logs.
                            </span>
                          </div>
                          {/* Switch button */}
                          <button
                            type="button"
                            aria-checked={currentSettings.onlyShowTimeIn !== false}
                            onClick={() => {
                              const newSObj = {
                                ...currentSettings,
                                onlyShowTimeIn: currentSettings.onlyShowTimeIn === false ? true : false,
                              };
                              setLocalSettings(newSObj);
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/25 dark:focus:ring-cyan-500/20 ${
                              currentSettings.onlyShowTimeIn !== false
                                ? "bg-indigo-650 dark:bg-cyan-600 border-indigo-700 dark:border-cyan-500"
                                : "bg-neutral-300 dark:bg-neutral-700 border-neutral-400 dark:border-neutral-600"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-300 shadow-md ring-0 transition duration-200 ease-in-out ${
                                currentSettings.onlyShowTimeIn !== false
                                  ? "translate-x-5"
                                  : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Company Active Work Days & Daily Shift Times (Merged) */}
                      <div className="space-y-2">
                        <span
                          className={`text-[9px] uppercase font-bold tracking-wider font-mono ${adminThemeClass.textMuted}`}
                        >
                          Active Work Days & Daily Shift Times
                        </span>
                        <div className="space-y-1.5">
                          {[
                            "Sunday",
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                            "Saturday",
                          ].map((day) => {
                            const isDayChecked =
                              currentSettings.activityDays?.[day] || false;
                            const dayTime =
                              currentSettings.dailyShiftTimes?.[day] ||
                              currentSettings.checkIn?.time ||
                              "08:00";
                            const dayOutTime =
                              currentSettings.dailyShiftOutTimes?.[day] ||
                              currentSettings.checkOut?.time ||
                              "17:00";

                            return (
                              <div
                                key={day}
                                className={`flex flex-row items-center justify-between flex-nowrap whitespace-nowrap p-1.5 px-2.5 sm:px-3 rounded-xl border transition-all gap-1.5 ${
                                  isDayChecked
                                    ? `${adminThemeClass.innerBg} border-cyan-500/20`
                                    : "opacity-55 bg-neutral-900/5 dark:bg-black/5 border-neutral-200 dark:border-neutral-800"
                                }`}
                              >
                                <label className="flex items-center space-x-1.5 sm:space-x-2 cursor-pointer select-none shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={isDayChecked}
                                    onChange={(e) => {
                                      const nextActivityDays = {
                                        ...currentSettings.activityDays,
                                        [day]: e.target.checked,
                                      };
                                      const nextDailyShiftTimes = {
                                        ...currentSettings.dailyShiftTimes,
                                        [day]: dayTime,
                                      };
                                      const nextDailyShiftOutTimes = {
                                        ...currentSettings.dailyShiftOutTimes,
                                        [day]: dayOutTime,
                                      };
                                      const newSObj = {
                                        ...currentSettings,
                                        activityDays: nextActivityDays,
                                        dailyShiftTimes: nextDailyShiftTimes,
                                        dailyShiftOutTimes: nextDailyShiftOutTimes,
                                      };
                                      setLocalSettings(newSObj);
                                    }}
                                    className="rounded text-cyan-500 border-gray-300 pointer-events-auto h-3 w-3"
                                  />
                                  <span
                                    className={`font-medium text-[10.5px] ${adminThemeClass.textTitle}`}
                                  >
                                    <span className="hidden sm:inline">{day}</span>
                                    <span className="inline sm:hidden">{day.slice(0, 3)}</span>
                                  </span>
                                </label>
                                <div className="flex items-center space-x-2 shrink-0 flex-nowrap whitespace-nowrap">
                                  {/* Start time */}
                                  <div className="flex items-center space-x-1">
                                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-neutral-450 dark:text-neutral-500">In:</span>
                                    <div className="w-18 xs:w-[4.8rem] sm:w-24">
                                      <CustomTimePicker
                                        value={dayTime}
                                        onChange={(newTime) => {
                                          const nextShiftTimes = {
                                            ...currentSettings.dailyShiftTimes,
                                            [day]: newTime,
                                          };
                                          const newSObj = {
                                            ...currentSettings,
                                            dailyShiftTimes: nextShiftTimes,
                                          };
                                          setLocalSettings(newSObj);
                                        }}
                                        disabled={!isDayChecked}
                                        theme={theme}
                                        compact={true}
                                      />
                                    </div>
                                  </div>

                                  {/* End time - visible ONLY when Time-In Arrival Focus is disabled (onlyShowTimeIn === false) */}
                                  {currentSettings.onlyShowTimeIn === false && (
                                    <div className="flex items-center space-x-1">
                                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-neutral-450 dark:text-neutral-500">Out:</span>
                                      <div className="w-18 xs:w-[4.8rem] sm:w-24">
                                        <CustomTimePicker
                                          value={dayOutTime}
                                          onChange={(newTime) => {
                                            const nextShiftOutTimes = {
                                              ...currentSettings.dailyShiftOutTimes,
                                              [day]: newTime,
                                            };
                                            const newSObj = {
                                              ...currentSettings,
                                              dailyShiftOutTimes: nextShiftOutTimes,
                                            };
                                            setLocalSettings(newSObj);
                                          }}
                                          disabled={!isDayChecked}
                                          theme={theme}
                                          compact={true}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Overtime Radio Selector durations. Requirements: "stops timer automatically at bounds" */}
                      <div
                        className={`space-y-3 p-4 rounded-2xl border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span
                              className={`text-[10px] uppercase font-bold tracking-wider font-mono ${adminThemeClass.textTitle}`}
                            >
                              Shift Overtime Toggle
                            </span>
                            <span
                              className={`text-[11px] font-light ${adminThemeClass.textMuted}`}
                            >
                              Allow workers to record overtime
                            </span>
                          </div>
                          {/* Visual iOS-style Switch Toggle Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const isEn =
                                currentSettings.overtimeEnabled === true;
                              const newSObj = {
                                ...currentSettings,
                                overtimeEnabled: !isEn,
                              };
                              setLocalSettings(newSObj);
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/25 dark:focus:ring-cyan-500/20 ${
                              currentSettings.overtimeEnabled === true
                                ? "bg-indigo-650 dark:bg-cyan-600 border-indigo-700 dark:border-cyan-500"
                                : "bg-neutral-300 dark:bg-neutral-700 border-neutral-400 dark:border-neutral-600"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-300 shadow-md ring-0 transition duration-200 ease-in-out ${
                                currentSettings.overtimeEnabled === true
                                  ? "translate-x-5"
                                  : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>

                        {/* Overtime duration selections. Applies ONLY when overtimeEnabled is true! */}
                        <AnimatePresence initial={false}>
                          {currentSettings.overtimeEnabled === true && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden space-y-2.5 pt-1.5"
                            >
                              <span
                                className={`text-[10px] uppercase font-bold tracking-wider font-mono block ${adminThemeClass.textMuted}`}
                              >
                                Shift Overtime parameters limit
                              </span>
                              <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 3, 4, 5, 6].map((hrs) => (
                                  <label
                                    key={hrs}
                                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${currentSettings.overtimeHours === hrs ? "text-cyan-400 font-bold " + adminThemeClass.buttonSelected : "text-gray-400 " + adminThemeClass.inputBg + " " + adminThemeClass.accentBorder}`}
                                  >
                                    <span className="text-xs">{hrs} Hrs</span>
                                    <input
                                      type="radio"
                                      name="ot"
                                      checked={
                                        currentSettings.overtimeHours === hrs
                                      }
                                      onChange={() => {
                                        const newSObj = {
                                          ...currentSettings,
                                          overtimeHours: hrs,
                                        };
                                        setLocalSettings(newSObj);
                                      }}
                                      className="h-3 w-3 text-indigo-600 dark:text-cyan-400 rounded-sm"
                                    />
                                  </label>
                                ))}
                              </div>
                              <span
                                className={`text-[9px] block font-light leading-relaxed ${adminThemeClass.textMuted}`}
                              >
                                System terminates shift clock logs automatically
                                when bounds expire.
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>



                        {/* Sign-Out Button placed inside the menu drawer, below department lead historical log */}
                        <div className="pt-2 pb-12">
                          <button
                            type="button"
                            onClick={() => {
                              setShowSettingsMenu(false);
                              setShowConfirmLogout(true);
                            }}
                            className="w-full h-11 flex items-center justify-center space-x-2 rounded-2xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                            title="Workspace Log Out"
                          >
                            <LogOut className="h-4 w-4" />
                            <span>{translations.logout}</span>
                          </button>
                        </div>
                    </>
                  );
                })()}
              </div>

              {/* Drawer Save block */}
              <div className="border-t border-gray-150 dark:border-[#262626] pt-4 flex gap-3 font-sans">
                <button
                  id="admin_save_settings"
                  onClick={() => {
                    if (localSettings) {
                      setSettings(localSettings);
                      handleSaveSettings(localSettings);
                    } else {
                      handleSaveSettings();
                    }
                    setShowSettingsMenu(false);
                  }}
                  className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl text-xs uppercase tracking-wider text-center cursor-pointer active:scale-95 transition-all font-bold shadow-md"
                >
                  {translations.saveChanges || "Save Changes"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- MODAL AREA: UPDATE ATTENDANCE MANAGEMENT -------------------- */}
      <AnimatePresence>
        {showUpdateAttendanceModal && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
            onClick={() => setShowUpdateAttendanceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden select-none ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
            >
              {/* Modal Header */}
              <div className={`p-5 sm:p-6 border-b flex items-center justify-between ${adminThemeClass.accentBorder} ${adminThemeClass.innerBg}`}>
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className={`text-base sm:text-lg font-display font-bold ${adminThemeClass.textTitle}`}>
                      Update Attendance
                    </h3>
                    <p className={`text-xs ${adminThemeClass.textMuted}`}>
                      Create, modify, and delete employee shift logs with two-step confirmation safeguards.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleOpenCreateAttendance}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl shadow-sm flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Record</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUpdateAttendanceModal(false)}
                    className={`h-9 w-9 rounded-xl border flex items-center justify-center cursor-pointer transition-colors ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textMuted} hover:${adminThemeClass.textHighlight}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Toast message if any */}
              {attendanceActionSuccess && (
                <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-2.5 flex items-center space-x-2 text-emerald-400 text-xs font-semibold animate-fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{attendanceActionSuccess}</span>
                </div>
              )}

              {/* Worker Selection ("Just a name per time") */}
              <div className={`p-4 sm:p-5 border-b space-y-3 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <Users className={`h-4 w-4 ${adminThemeClass.textMuted}`} />
                    <span className={`text-xs font-bold uppercase tracking-wider font-mono ${adminThemeClass.textTitle}`}>
                      Select Employee to Manage:
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    {/* Worker Search / Dropdown */}
                    <div className="relative w-full sm:w-72">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${adminThemeClass.textMuted}`} />
                      <input
                        type="text"
                        placeholder="Search employee by name..."
                        value={attendanceWorkerSearch}
                        onChange={(e) => setAttendanceWorkerSearch(e.target.value)}
                        className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border outline-none font-medium ${adminThemeClass.inputBg}`}
                      />
                    </div>
                    {/* Scroll Left / Right Buttons */}
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById("attendance_worker_selector_list");
                          if (el) el.scrollBy({ left: -220, behavior: "smooth" });
                        }}
                        className={`p-1.5 rounded-xl border text-xs cursor-pointer transition-all hover:${adminThemeClass.textHighlight} ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
                        title="Scroll Left"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById("attendance_worker_selector_list");
                          if (el) el.scrollBy({ left: 220, behavior: "smooth" });
                        }}
                        className={`p-1.5 rounded-xl border text-xs cursor-pointer transition-all hover:${adminThemeClass.textHighlight} ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
                        title="Scroll Right"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Worker Selector Pills with Horizontal Scrolling */}
                <div
                  id="attendance_worker_selector_list"
                  onWheel={(e) => {
                    if (e.deltaY !== 0) {
                      e.currentTarget.scrollLeft += e.deltaY;
                    }
                  }}
                  className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden touch-pan-x select-none w-full scroll-smooth"
                >
                  {workers
                    .filter((w) => {
                      if (!attendanceWorkerSearch.trim()) return true;
                      const q = attendanceWorkerSearch.toLowerCase();
                      return (
                        w.firstName.toLowerCase().includes(q) ||
                        w.lastName.toLowerCase().includes(q) ||
                        w.email.toLowerCase().includes(q)
                      );
                    })
                    .map((w) => {
                      const isSelected = (selectedAttendanceWorkerId || workers[0]?.id) === w.id;
                      const wDept = departments.find((d) => d.id === w.department_id)?.name || "Unassigned";
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => setSelectedAttendanceWorkerId(w.id)}
                          className={`shrink-0 flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-400 shadow-sm ring-1 ring-cyan-500/30"
                              : `${adminThemeClass.cardBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textMuted} hover:border-cyan-500/30`
                          }`}
                        >
                          <img
                            src={w.profilePhoto?.small || IMAGES.defaultWorkerAvatar}
                            alt=""
                            className="h-5 w-5 rounded-full object-cover border border-cyan-500/20"
                          />
                          <span className="font-bold">{w.firstName} {w.lastName}</span>
                          <span className="text-[10px] opacity-60">({wDept})</span>
                        </button>
                      );
                    })}
                </div>

                {/* Active Worker Profile Header Card */}
                {(() => {
                  const targetWorker = workers.find((w) => w.id === (selectedAttendanceWorkerId || workers[0]?.id));
                  if (!targetWorker) return null;
                  const wDept = departments.find((d) => d.id === targetWorker.department_id)?.name || "Unassigned";
                  const wRecords = (attendanceRecords || []).filter((r: any) => r.worker_id === targetWorker.id);
                  const onTimeCount = wRecords.filter((r: any) => r.statusIn === AttendanceStatus.PRESENT).length;
                  const lateCount = wRecords.filter((r: any) => r.statusIn === AttendanceStatus.LATE).length;

                  return (
                    <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}>
                      <div className="flex items-center space-x-3">
                        <img
                          src={targetWorker.profilePhoto?.medium || targetWorker.profilePhoto?.small || IMAGES.defaultWorkerAvatar}
                          alt=""
                          className="h-11 w-11 rounded-2xl object-cover border border-cyan-500/30 shadow-sm"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className={`text-sm font-bold ${adminThemeClass.textTitle}`}>
                              {targetWorker.firstName} {targetWorker.lastName}
                            </h4>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              {wDept}
                            </span>
                          </div>
                          <span className={`text-[11px] ${adminThemeClass.textMuted}`}>
                            {targetWorker.email} | ID: {targetWorker.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-xs font-mono">
                        <div className="text-center">
                          <span className={`block text-[10px] uppercase font-bold ${adminThemeClass.textMuted}`}>Total Shifts</span>
                          <span className={`font-bold text-sm ${adminThemeClass.textTitle}`}>{wRecords.length}</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-[10px] uppercase font-bold text-emerald-400">On Time</span>
                          <span className="font-bold text-sm text-emerald-400">{onTimeCount}</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-[10px] uppercase font-bold text-amber-400">Late</span>
                          <span className="font-bold text-sm text-amber-400">{lateCount}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Shift Register Table Container */}
              <div className="flex-1 overflow-auto max-h-[500px] p-0">
                {(() => {
                  const activeWorkerId = selectedAttendanceWorkerId || workers[0]?.id;
                  const activeRecords = (attendanceRecords || [])
                    .filter((r: any) => r.worker_id === activeWorkerId)
                    .sort((a: any, b: any) => (b.date || "").localeCompare(a.date || ""));

                  if (activeRecords.length === 0) {
                    return (
                      <div className="p-12 text-center space-y-3">
                        <Calendar className={`h-10 w-10 mx-auto opacity-40 ${adminThemeClass.textMuted}`} />
                        <p className={`text-sm font-light ${adminThemeClass.textMuted}`}>
                          No recorded attendance logs for this employee.
                        </p>
                        <button
                          type="button"
                          onClick={handleOpenCreateAttendance}
                          className="px-4 py-2 text-xs font-bold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/10 rounded-xl transition-all cursor-pointer"
                        >
                          + Create First Shift Record
                        </button>
                      </div>
                    );
                  }

                  return (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className={`sticky top-0 z-20 ${adminThemeClass.innerBg} shadow-xs`}>
                        <tr className={`border-b font-bold uppercase tracking-wider select-none text-[10px] ${adminThemeClass.innerBg} ${adminThemeClass.textMuted} ${adminThemeClass.accentBorder}`}>
                          <th className="p-4">S/N</th>
                          <th className="p-4">Date</th>
                          <th className="p-4">Time In</th>
                          <th className="p-4">Status In</th>
                          <th className="p-4">Time Out</th>
                          <th className="p-4">Status Out</th>
                          <th className="p-4">Shift Duration</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y font-sans ${adminThemeClass.tableRowDivider}`}>
                        {activeRecords.map((rec: any, idx: number) => {
                          const shiftSecs = calculateShiftSeconds(rec, settings);
                          const durationFormatted = formatDurationHHMMSS(shiftSecs);

                          return (
                            <tr
                              key={`${rec.id || rec.date}-${idx}`}
                              className={`transition-colors duration-100 ${adminThemeClass.tableRowHover}`}
                            >
                              <td className="p-4 font-mono font-medium text-neutral-500">
                                {idx + 1}
                              </td>
                              <td className={`p-4 font-mono font-semibold ${adminThemeClass.textTitle}`}>
                                {formatDateToCustomString(rec.date)}
                              </td>
                              <td className={`p-4 font-mono ${adminThemeClass.textHighlight}`}>
                                {rec.timeIn || "--:--:--"}
                              </td>
                              <td className="p-4">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                                  rec.statusIn === AttendanceStatus.PRESENT
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                    : "bg-orange-500/15 text-orange-400 border-orange-500/30"
                                }`}>
                                  {rec.statusIn === AttendanceStatus.PRESENT ? "ON TIME" : "LATE"}
                                </span>
                              </td>
                              <td className={`p-4 font-mono ${adminThemeClass.textHighlight}`}>
                                {rec.timeOut || (
                                  <span className="text-cyan-400/80 italic font-sans text-[11px]">Active Shift</span>
                                )}
                              </td>
                              <td className={`p-4 ${adminThemeClass.textMuted}`}>
                                {rec.statusOut || "--"}
                              </td>
                              <td className={`p-4 font-mono text-xs ${adminThemeClass.textHighlight}`}>
                                {rec.timeOut ? durationFormatted : "--"}
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditAttendance(rec)}
                                    className="p-1.5 text-xs font-bold text-cyan-400 hover:bg-cyan-500/15 border border-cyan-500/30 rounded-lg transition-all cursor-pointer flex items-center space-x-1"
                                    title="Edit Attendance Record"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePromptDeleteAttendanceConfirm(rec)}
                                    className="p-1.5 text-xs font-bold text-red-400 hover:bg-red-500/15 border border-red-500/30 rounded-lg transition-all cursor-pointer flex items-center space-x-1"
                                    title="Delete Attendance Record"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className={`p-4 border-t flex items-center justify-between ${adminThemeClass.accentBorder} ${adminThemeClass.innerBg}`}>
                <span className={`text-xs ${adminThemeClass.textMuted}`}>
                  Changes are synchronized live across Admin Shift Register and Worker Dashboards.
                </span>
                <button
                  type="button"
                  onClick={() => setShowUpdateAttendanceModal(false)}
                  className="px-5 py-2 text-xs font-bold rounded-xl border border-neutral-500/30 text-neutral-300 hover:bg-neutral-500/10 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- MODAL AREA: CREATE / EDIT ATTENDANCE FORM SUBMODAL -------------------- */}
      <AnimatePresence>
        {showAttendanceFormModal && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-55 flex items-center justify-center p-4"
            onClick={() => setShowAttendanceFormModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg max-h-[90vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-3xl border p-6 shadow-2xl select-none space-y-5 ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
            >
              <div className="flex items-center justify-between border-b pb-3 border-neutral-500/20">
                <div className="flex items-center space-x-2.5">
                  <div className="h-9 w-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                    <Edit3 className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className={`font-bold text-base ${adminThemeClass.textTitle}`}>
                      {attendanceFormMode === "create" ? "Create Attendance Record" : "Edit Attendance Record"}
                    </h4>
                    <p className={`text-[11px] ${adminThemeClass.textMuted}`}>
                      {attendanceFormMode === "create"
                        ? "Manually add an employee shift record"
                        : "Modify existing check-in / check-out times and status"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAttendanceFormModal(false)}
                  className={`p-1.5 rounded-lg text-neutral-400 hover:${adminThemeClass.textHighlight} cursor-pointer transition-colors`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Employee Target Summary */}
              {(() => {
                const targetWorker = workers.find((w) => w.id === (selectedAttendanceWorkerId || workers[0]?.id));
                return (
                  <div className={`p-3 rounded-2xl border flex items-center space-x-3 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                    <img
                      src={targetWorker?.profilePhoto?.small || IMAGES.defaultWorkerAvatar}
                      alt=""
                      className="h-10 w-10 rounded-xl object-cover border border-cyan-500/20"
                    />
                    <div className="min-w-0 flex-1">
                      <span className={`block font-bold text-xs truncate ${adminThemeClass.textTitle}`}>
                        {targetWorker ? `${targetWorker.firstName} ${targetWorker.lastName}` : "Employee"}
                      </span>
                      <span className={`text-[10px] block truncate ${adminThemeClass.textMuted}`}>
                        {targetWorker?.email} &bull; <span className="font-mono text-cyan-400 font-semibold">{targetWorker?.employeeId || targetWorker?.id?.slice(0, 8)}</span>
                      </span>
                    </div>
                  </div>
                );
              })()}

              <form onSubmit={handlePromptAttendanceFormConfirm} className="space-y-4">
                {/* Shift Date Field - Custom Calendar Design */}
                <div>
                  <label className={`block text-[11px] font-semibold mb-1.5 ${adminThemeClass.textTitle}`}>
                    Shift Date
                  </label>
                  <CustomDatePicker
                    value={attendanceFormDate}
                    onChange={(newDate) => setAttendanceFormDate(newDate)}
                    theme={theme === "light" ? "light" : theme === "army" ? "army" : theme === "navy" ? "navy" : "dark"}
                    className="w-full"
                    placeholder="Select Shift Date"
                   disableFutureDates={true} />
                </div>

                {/* Time In & Arrival Status Custom Dropdown Field */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1.5 ${adminThemeClass.textTitle}`}>
                      Check-In Time
                    </label>
                    <CustomTimePicker
                      value={attendanceFormTimeIn}
                      onChange={(newTime) => setAttendanceFormTimeIn(newTime.length === 5 ? `${newTime}:00` : newTime)}
                      theme={theme === "light" ? "light" : theme === "army" ? "army" : theme === "navy" ? "navy" : "dark"}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1.5 ${adminThemeClass.textTitle}`}>
                      Arrival Status
                    </label>
                    <CustomSelect
                      value={attendanceFormStatusIn}
                      onChange={(val) => setAttendanceFormStatusIn(val as AttendanceStatus)}
                      options={arrivalStatusDropdownOptions}
                      theme={theme === "light" ? "light" : theme === "army" ? "army" : theme === "navy" ? "navy" : "dark"}
                      className={`h-10 rounded-xl px-3.5 text-xs font-medium ${adminThemeClass.inputBg} ${adminThemeClass.accentBorder}`}
                    />
                  </div>
                </div>

                {/* Has Checkout Toggle */}
                <div className="pt-1">
                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={attendanceFormHasCheckout}
                      onChange={(e) => setAttendanceFormHasCheckout(e.target.checked)}
                      className="h-4 w-4 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer accent-cyan-500"
                    />
                    <span className={`text-xs font-semibold ${adminThemeClass.textTitle}`}>
                      Include Check-Out Time &amp; Status
                    </span>
                  </label>
                </div>

                {/* Time Out & Checkout Status Custom Dropdown Field */}
                {attendanceFormHasCheckout && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in pt-1">
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1.5 ${adminThemeClass.textTitle}`}>
                        Check-Out Time
                      </label>
                      <CustomTimePicker
                        value={attendanceFormTimeOut}
                        onChange={(newTime) => setAttendanceFormTimeOut(newTime.length === 5 ? `${newTime}:00` : newTime)}
                        theme={theme === "light" ? "light" : theme === "army" ? "army" : theme === "navy" ? "navy" : "dark"}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className={`block text-[11px] font-semibold mb-1.5 ${adminThemeClass.textTitle}`}>
                        Checkout Status
                      </label>
                      <CustomSelect
                        value={attendanceFormStatusOut}
                        onChange={(val) => setAttendanceFormStatusOut(val)}
                        options={checkoutStatusDropdownOptions}
                        theme={theme === "light" ? "light" : theme === "army" ? "army" : theme === "navy" ? "navy" : "dark"}
                        className={`h-10 rounded-xl px-3.5 text-xs font-medium ${adminThemeClass.inputBg} ${adminThemeClass.accentBorder}`}
                      />
                    </div>
                  </div>
                )}

                {/* Cancel / Proceed to Confirm Buttons - Spread to fill container */}
                <div className="grid grid-cols-2 gap-3 w-full pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAttendanceFormModal(false)}
                    className="w-full py-3 px-4 text-xs font-bold rounded-xl border border-neutral-500/30 text-neutral-300 hover:bg-neutral-500/10 cursor-pointer transition-all active:scale-98 text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all active:scale-98 text-center flex items-center justify-center space-x-1.5"
                  >
                    <Check className="h-4 w-4" />
                    <span>Proceed to Confirm</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- MODAL AREA: CONFIRM ATTENDANCE ACTION (Update Attendance) -------------------- */}
      <AnimatePresence>
        {attendanceConfirmData && attendanceConfirmData.isOpen && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-60 flex items-center justify-center p-4"
            onClick={() => !isProcessingAttendanceAction && setAttendanceConfirmData(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-3xl border p-6 text-center space-y-5 shadow-2xl select-none ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
            >
              <div className={`h-14 w-14 rounded-2xl mx-auto flex items-center justify-center border shadow-sm ${
                attendanceConfirmData.actionType === "delete"
                  ? "bg-red-500/15 text-red-400 border-red-500/30"
                  : "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
              }`}>
                {attendanceConfirmData.actionType === "delete" ? (
                  <Trash2 className="h-7 w-7" />
                ) : (
                  <ClipboardCheck className="h-7 w-7" />
                )}
              </div>

              <div>
                <h4 className={`text-lg font-bold font-display ${adminThemeClass.textTitle}`}>
                  Update Attendance
                </h4>
                <p className={`text-xs mt-1 ${adminThemeClass.textMuted}`}>
                  {attendanceConfirmData.actionType === "delete"
                    ? "Are you sure you want to permanently delete this shift attendance record?"
                    : attendanceConfirmData.actionType === "create"
                    ? "Please confirm creating this new official shift record."
                    : "Please confirm saving the modified attendance details."}
                </p>
              </div>

              {/* Action Summary Card */}
              <div className={`p-4 rounded-2xl border text-left space-y-2 text-xs ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                <div className="flex items-center justify-between border-b pb-2 border-neutral-500/20">
                  <span className={adminThemeClass.textMuted}>Target Employee:</span>
                  <span className={`font-bold ${adminThemeClass.textTitle}`}>
                    {attendanceConfirmData.workerName}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-2 border-neutral-500/20">
                  <span className={adminThemeClass.textMuted}>Shift Date:</span>
                  <span className={`font-mono font-semibold ${adminThemeClass.textTitle}`}>
                    {formatDateToCustomString(attendanceConfirmData.date)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-2 border-neutral-500/20">
                  <span className={adminThemeClass.textMuted}>Check-In Time & Status:</span>
                  <span className={`font-mono ${adminThemeClass.textHighlight}`}>
                    {attendanceConfirmData.timeIn} ({attendanceConfirmData.statusIn === AttendanceStatus.PRESENT ? "On Time" : "Late"})
                  </span>
                </div>
                {attendanceConfirmData.timeOut && (
                  <div className="flex items-center justify-between border-b pb-2 border-neutral-500/20">
                    <span className={adminThemeClass.textMuted}>Check-Out Time & Status:</span>
                    <span className={`font-mono ${adminThemeClass.textHighlight}`}>
                      {attendanceConfirmData.timeOut} ({attendanceConfirmData.statusOut || "Normal"})
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className={adminThemeClass.textMuted}>Action Protocol:</span>
                  <span className={`font-mono font-bold uppercase text-[10px] px-2 py-0.5 rounded-md ${
                    attendanceConfirmData.actionType === "delete"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-cyan-500/20 text-cyan-400"
                  }`}>
                    {attendanceConfirmData.actionType === "delete" ? "DELETE RECORD" : attendanceConfirmData.actionType === "create" ? "CREATE RECORD" : "UPDATE RECORD"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full pt-2">
                <button
                  type="button"
                  disabled={isProcessingAttendanceAction}
                  onClick={() => setAttendanceConfirmData(null)}
                  className="w-full py-3 px-4 border border-neutral-500/30 hover:bg-neutral-500/10 font-bold rounded-xl text-xs transition-all cursor-pointer text-neutral-300 disabled:opacity-50 text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessingAttendanceAction}
                  onClick={handleExecuteAttendanceAction}
                  className={`w-full py-3 px-4 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-98 ${
                    attendanceConfirmData.actionType === "delete"
                      ? "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500"
                      : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
                  }`}
                >
                  {isProcessingAttendanceAction ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Confirm &amp; Execute</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- MODAL AREA: CONFIRM LOGOUT -------------------- */}
      <AnimatePresence>
        {showConfirmLogout && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirmLogout(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${adminThemeClass.cardBg} rounded-3xl max-w-sm w-full p-6 text-center space-y-6 shadow-2xl select-none animate-none border`}
            >
              <div className="h-14 w-14 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl mx-auto flex items-center justify-center">
                <LogOut className="h-6 w-6" />
              </div>
              <div>
                <h4
                  className={`font-bold text-lg leading-snug ${adminThemeClass.textTitle}`}
                >
                  {translations.confirmLogout}
                </h4>
                <p className={`text-xs mt-1 ${adminThemeClass.textMuted}`}>
                  Pending reports logs will remain compiled securely.
                </p>
              </div>
              <div className="flex space-x-3 w-full">
                <button
                  id="admin_logout_yes"
                  onClick={onLogout}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer min-h-[44px]"
                >
                  {translations.yes}
                </button>
                <button
                  onClick={() => setShowConfirmLogout(false)}
                  className={`flex-1 py-3 font-semibold text-xs rounded-xl active:scale-95 transition-all cursor-pointer min-h-[44px] ${theme === "light" ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-800" : "bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800"}`}
                >
                  {translations.cancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- MODAL AREA: CONFIRM LOGO RESET -------------------- */}
      <AnimatePresence>
        {showResetLogoConfirm && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setShowResetLogoConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`rounded-3xl max-w-sm w-full p-6 text-center space-y-6 shadow-2xl border select-none animate-none ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
            >
              <div className="h-14 w-14 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-2xl mx-auto flex items-center justify-center">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <div>
                <h4
                  className={`font-bold text-lg leading-snug ${adminThemeClass.textTitle}`}
                >
                  {translations.confirmResetLogoTitle || "Confirm Reset Logo"}
                </h4>
                <p className={`text-xs mt-1 ${adminThemeClass.textMuted}`}>
                  {translations.confirmResetLogoDesc ||
                    "Are you sure you want to reset the company logo? This will revert back to the default logo."}
                </p>
              </div>
              <div className="flex space-x-3 w-full">
                <button
                  onClick={() => {
                    handleCompanyLogoDelete();
                    setShowResetLogoConfirm(false);
                  }}
                  className="flex-1 py-3 bg-red-650 hover:bg-red-700 text-white font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer min-h-[44px]"
                >
                  {translations.confirmResetLogoYes || "Yes"}
                </button>
                <button
                  onClick={() => setShowResetLogoConfirm(false)}
                  className={`flex-1 py-3 border font-semibold text-xs rounded-xl active:scale-95 transition-all cursor-pointer min-h-[44px] ${adminThemeClass.inputBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textTitle}`}
                >
                  {translations.confirmResetLogoCancel || "Cancel"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- MODAL AREA: CONFIRM NOTIFICATIONS CLEAR ALL -------------------- */}
      <AnimatePresence>
        {showClearNotifsConfirm && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setShowClearNotifsConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`rounded-3xl max-w-sm w-full p-6 text-center space-y-6 shadow-2xl border select-none animate-none ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
            >
              <div className="h-14 w-14 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-2xl mx-auto flex items-center justify-center">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <div>
                <h4
                  className={`font-bold text-lg leading-snug ${adminThemeClass.textTitle}`}
                >
                  Clear All Notifications?
                </h4>
                <p className={`text-xs mt-1 ${adminThemeClass.textMuted}`}>
                  Are you sure you want to delete all alert records? This action is irreversible.
                </p>
              </div>
              <div className="flex space-x-3 w-full">
                <button
                  onClick={() => {
                    handleClearNotifs();
                    setShowClearNotifsConfirm(false);
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer min-h-[44px]"
                >
                  Yes, Clear All
                </button>
                <button
                  onClick={() => setShowClearNotifsConfirm(false)}
                  className={`flex-1 py-3 border font-semibold text-xs rounded-xl active:scale-95 transition-all cursor-pointer min-h-[44px] ${adminThemeClass.inputBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textTitle}`}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- MODAL AREA: CONFIRM LOGO UPLOAD -------------------- */}
      <AnimatePresence>
        {showUploadLogoConfirm && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowUploadLogoConfirm(false);
              setSelectedLogoFile(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`rounded-3xl max-w-sm w-full p-6 text-center space-y-6 shadow-2xl border select-none animate-none ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
            >
              <div
                className={`h-14 w-14 rounded-2xl mx-auto flex items-center justify-center border ${adminThemeClass.accentBorder} bg-cyan-100/50 dark:bg-cyan-950/20 ${adminThemeClass.accentText}`}
              >
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h4
                  className={`font-bold text-lg leading-snug ${adminThemeClass.textTitle}`}
                >
                  Confirm Logo Upload
                </h4>
                <p className={`text-xs mt-1 ${adminThemeClass.textMuted}`}>
                  Are you sure you want to upload this file as your official
                  company brand logo?
                </p>
              </div>
              <div className="flex space-x-3 w-full">
                <button
                  onClick={() => {
                    if (selectedLogoFile) {
                      handleCompanyLogoUpload(selectedLogoFile);
                    }
                    setShowUploadLogoConfirm(false);
                    setSelectedLogoFile(null);
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer min-h-[44px]"
                >
                  {translations.confirmResetLogoYes || "Yes"}
                </button>
                <button
                  onClick={() => {
                    setShowUploadLogoConfirm(false);
                    setSelectedLogoFile(null);
                  }}
                  className={`flex-1 py-3 border font-semibold text-xs rounded-xl active:scale-95 transition-all cursor-pointer min-h-[44px] ${adminThemeClass.inputBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textTitle}`}
                >
                  {translations.confirmResetLogoCancel || "Cancel"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- MODAL AREA: INDIVIDUAL WORKER ANALYTICS CARD -------------------- */}
      <AnimatePresence>
        {activeLeaderModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setActiveLeaderModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border select-none ${adminThemeClass.cardBg} ${adminThemeClass.textTitle} ${adminThemeClass.accentBorder}`}
            >
              <div
                className={`p-6 border-b flex justify-between items-center ${adminThemeClass.accentBorder} ${adminThemeClass.innerBg} shrink-0`}
              >
                <h3
                  className={`font-display font-semibold text-lg ${adminThemeClass.textTitle}`}
                >
                  Worker Profile
                </h3>
                <button
                  onClick={() => setActiveLeaderModal(null)}
                  className={`font-bold text-xl cursor-pointer ${adminThemeClass.textMuted} hover:${adminThemeClass.textHighlight}`}
                >
                  &times;
                </button>
              </div>

              {/* Collapsible Profile Box / List Stripe */}
              <div
                onClick={() => setIsAdminShiftAssessmentExpanded((prev) => !prev)}
                className={`mx-6 mt-4 p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer select-none transition-colors hover:bg-neutral-500/5 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder} shrink-0`}
                title={isAdminShiftAssessmentExpanded ? "Click to collapse profile details" : "Click to expand profile details"}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`p-1.5 rounded-xl border flex items-center justify-center shrink-0 ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}>
                    {isAdminShiftAssessmentExpanded ? (
                      <ChevronUp className="h-4 w-4 text-cyan-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-neutral-400" />
                    )}
                  </div>
                  <h3 className={`font-display font-semibold text-sm sm:text-base ${adminThemeClass.textTitle}`}>
                    Worker Profile
                  </h3>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:inline-block ${adminThemeClass.textMuted}`}>
                    {isAdminShiftAssessmentExpanded ? "Collapse Profile" : "Expand Profile"}
                  </span>
                </div>
              </div>

              {/* Detailed Profile Content */}
              <AnimatePresence initial={false}>
                {isAdminShiftAssessmentExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden shrink-0"
                  >
                    <div className={`p-4 mx-6 mt-2 rounded-2xl border flex items-center justify-between gap-4 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                      <div className="flex items-center space-x-4">
                        <img
                          src={activeLeaderModal.profilePhoto?.medium || IMAGES.defaultWorkerAvatar}
                          alt="Worker Profile Photo"
                          onClick={() => setExpandedPhotoUrl(activeLeaderModal.profilePhoto?.medium || IMAGES.defaultWorkerAvatar)}
                          className={`h-14 w-14 rounded-2xl object-cover border-2 shadow-sm cursor-zoom-in hover:scale-105 transition-transform ${adminThemeClass.accentBorder}`}
                          title="Click to view full picture"
                        />
                        <div>
                          <h4 className={`font-bold text-sm leading-tight ${adminThemeClass.textTitle}`}>
                            {activeLeaderModal.firstName} {activeLeaderModal.lastName}
                          </h4>
                          <p className={`text-[11px] ${adminThemeClass.textMuted}`}>
                            {activeLeaderModal.email} &bull; {activeLeaderModal.phone ? formatPhoneNumber(activeLeaderModal.phone) : "No phone linked"}
                          </p>
                          <div className="flex gap-2 mt-1.5">
                            <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20`}>
                              {activeLeaderModal.role}
                            </span>
                            <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full border bg-cyan-500/10 text-cyan-400 border-cyan-500/20`}>
                              {departments.find((d) => d.id === activeLeaderModal.department_id)?.name || "Unassigned"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <span className={`text-[10px] uppercase font-bold tracking-wider block font-mono ${adminThemeClass.textMuted}`}>Joined On</span>
                        <span className="font-mono text-xs font-semibold">
                          {activeLeaderModal.createdAt ? activeLeaderModal.createdAt.substring(0, 10) : "2026-06-11"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tab Selector with responsive navigation arrows */}
              <div className="relative group px-6 mt-4 shrink-0 w-full">
                {/* Left Arrow */}
                <button
                  type="button"
                  onClick={handlePrevSummaryTab}
                  className={`absolute left-8 top-[20px] -translate-y-1/2 z-20 h-7 w-7 rounded-full border shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-110 active:scale-90 cursor-pointer ${adminThemeClass.innerBg}`}
                  title="Navigate to Previous Tab"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                <div
                  ref={summaryTabRowRef}
                  className="flex border-b border-neutral-200/20 pb-2 gap-2 overflow-x-auto scrollbar-none font-sans"
                >
                  {[
                    { id: "info", label: "Summary", icon: Users },
                    { id: "analytics", label: "Calendar", icon: Calendar },
                    { id: "hours", label: "Work-Hours", icon: Clock },
                    { id: "history", label: "Punch History", icon: History },
                    { id: "actions", label: "Settings", icon: Settings },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = activeSummaryTab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setActiveSummaryTab(t.id as any)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                          isSelected
                            ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/20"
                            : `${adminThemeClass.innerBg} ${adminThemeClass.textMuted} hover:${adminThemeClass.textHighlight}`
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
                  onClick={handleNextSummaryTab}
                  className={`absolute right-8 top-[20px] -translate-y-1/2 z-20 h-7 w-7 rounded-full border shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-110 active:scale-90 cursor-pointer ${adminThemeClass.innerBg}`}
                  title="Navigate to Next Tab"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Scrollable contents area */}
              <div className="p-6 overflow-y-auto overflow-x-auto flex-1 min-h-0 pb-16">
                {activeSummaryTab === "info" && (() => {
                  const metrics = getPersonalWorkerMetrics(activeLeaderModal, modalTimeframe);
                  return (
                    <div className="space-y-4 font-sans">
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] uppercase font-bold tracking-wider font-mono ${adminThemeClass.textMuted}`}>Timeframe Query Filter</span>
                        <div className={`flex rounded-xl p-0.5 border shadow-inner ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                          {(["daily", "weekly", "monthly", "yearly"] as const).map((tf) => (
                            <button
                              key={tf}
                              type="button"
                              onClick={() => setModalTimeframe(tf)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all duration-150 cursor-pointer ${
                                modalTimeframe === tf
                                  ? "bg-cyan-600 text-white shadow-sm"
                                  : `text-neutral-400 hover:${adminThemeClass.textHighlight}`
                              }`}
                            >
                              {tf}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-2xl border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                          <span className={`text-[9px] uppercase font-bold font-mono tracking-wider block ${adminThemeClass.textMuted}`}>Expected Work Days</span>
                          <strong className="text-lg block font-mono mt-1 font-bold">{metrics.expectedDays} Days</strong>
                        </div>
                        <div className={`p-4 rounded-2xl border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                          <span className={`text-[9px] uppercase font-bold font-mono tracking-wider block ${adminThemeClass.textMuted}`}>Actual Attendance</span>
                          <strong className="text-lg text-emerald-500 block font-mono mt-1 font-bold">{metrics.attendedDays} Days</strong>
                        </div>
                        <div className={`p-4 rounded-2xl border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                          <span className={`text-[9px] uppercase font-bold font-mono tracking-wider block ${adminThemeClass.textMuted}`}>Lateness Flags</span>
                          <strong className="text-lg text-orange-500 block font-mono mt-1 font-bold">{metrics.lateCount} Days</strong>
                        </div>
                        <div className={`p-4 rounded-2xl border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                          <span className={`text-[9px] uppercase font-bold font-mono tracking-wider block ${adminThemeClass.textMuted}`}>On-Time Flags</span>
                          <strong className="text-lg text-emerald-400 block font-mono mt-1 font-bold">{metrics.onTimeCount} Days</strong>
                        </div>
                        <div className={`p-4 rounded-2xl border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                          <span className={`text-[9px] uppercase font-bold font-mono tracking-wider block ${adminThemeClass.textMuted}`}>Absent Flags</span>
                          <strong className="text-lg text-red-500 block font-mono mt-1 font-bold">{metrics.absentDays} Days</strong>
                        </div>
                        <div className={`p-4 rounded-2xl border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                          <span className={`text-[9px] uppercase font-bold font-mono tracking-wider block ${adminThemeClass.textMuted}`}>Approved Exemptions</span>
                          <strong className="text-lg text-cyan-400 block font-mono mt-1 font-bold">{metrics.approvedPermissionDays} Days</strong>
                        </div>
                        <div className={`p-4 rounded-2xl border col-span-2 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                          <span className={`text-[9px] uppercase font-bold font-mono tracking-wider block ${adminThemeClass.textMuted}`}>Overall Performance Index</span>
                          <strong className={`text-xl block font-mono mt-1 font-extrabold ${adminThemeClass.accentText}`}>{metrics.performancePercentage.toFixed(2)}%</strong>
                        </div>
                      </div>

                      {/* Rates matrix */}
                      <div className="space-y-3 pt-2">
                        <span className={`text-[10px] uppercase font-bold tracking-wider font-mono block ${adminThemeClass.textMuted}`}>Key Performance Metrics</span>
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-xs mb-1 font-semibold">
                              <span>Overall Attendance Rate</span>
                              <span className="font-mono">{metrics.attendancePercentage.toFixed(2)}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-neutral-200/20 overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${metrics.attendancePercentage}%` }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1 font-semibold">
                              <span>Overall Availability Rate</span>
                              <span className="font-mono">{metrics.availabilityPercentage.toFixed(2)}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-neutral-200/20 overflow-hidden">
                              <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${metrics.availabilityPercentage}%` }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1 font-semibold">
                              <span>Overall Performance Index</span>
                              <span className="font-mono">{metrics.performancePercentage.toFixed(2)}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-neutral-200/20 overflow-hidden">
                              <div className="bg-cyan-650 h-full rounded-full" style={{ width: `${metrics.performancePercentage}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {activeSummaryTab === "analytics" && (() => {
                  const activeDays = activeLeaderModal.activityDays || settings?.activityDays || {
                    Monday: true, Tuesday: true, Wednesday: true, Thursday: true, Friday: true, Saturday: false, Sunday: false
                  };
                  const daysList = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                  const personalPermissions = permissions.filter(p => p.worker_id === activeLeaderModal.id && (p.status || "").toLowerCase() === "approved");
                  
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

                  const monthsNames = [
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                  ];

                  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

                  const firstDayOfMonthIndex = new Date(calendarViewYear, calendarViewMonth, 1).getDay(); // 0 is Sunday
                  const daysInMonthCount = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();
                  const daysInPrevMonthCount = new Date(calendarViewYear, calendarViewMonth, 0).getDate();

                  const calendarDays: Array<{
                    day: number;
                    monthType: "prev" | "current" | "next";
                    month: number;
                    year: number;
                  }> = [];

                  // Prev month buffer days
                  for (let i = firstDayOfMonthIndex - 1; i >= 0; i--) {
                    const prevMonthIdx = calendarViewMonth - 1 < 0 ? 11 : calendarViewMonth - 1;
                    const prevYearVal = calendarViewMonth - 1 < 0 ? calendarViewYear - 1 : calendarViewYear;
                    calendarDays.push({
                      day: daysInPrevMonthCount - i,
                      monthType: "prev",
                      month: prevMonthIdx,
                      year: prevYearVal,
                    });
                  }

                  // Current month days
                  for (let d = 1; d <= daysInMonthCount; d++) {
                    calendarDays.push({
                      day: d,
                      monthType: "current",
                      month: calendarViewMonth,
                      year: calendarViewYear,
                    });
                  }

                  // Next month buffer days to reach 42 slots
                  const totalDaysAdded = calendarDays.length;
                  const remainingSquares = 42 - totalDaysAdded;
                  for (let d = 1; d <= remainingSquares; d++) {
                    const nextMonthIdx = calendarViewMonth + 1 > 11 ? 0 : calendarViewMonth + 1;
                    const nextYearVal = calendarViewMonth + 1 > 11 ? calendarViewYear + 1 : calendarViewYear;
                    calendarDays.push({
                      day: d,
                      monthType: "next",
                      month: nextMonthIdx,
                      year: nextYearVal,
                    });
                  }

                  const getDayOfWeekName = (y: number, m: number, d: number) => {
                    const daysMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                    return daysMap[new Date(y, m, d).getDay()];
                  };

                  const getPermissionForDay = (y: number, m: number, d: number) => {
                    const dObj = new Date(y, m, d);
                    dObj.setHours(0, 0, 0, 0);
                    
                    for (const p of personalPermissions) {
                      if (!p.startDate || !p.endDate) continue;
                      
                      const pStart = new Date(p.startDate);
                      pStart.setHours(0, 0, 0, 0);
                      
                      const pEnd = new Date(p.endDate);
                      pEnd.setHours(0, 0, 0, 0);
                      
                      if (dObj >= pStart && dObj <= pEnd) {
                        return p;
                      }
                    }
                    return null;
                  };

                  return (
                    <div className="space-y-5 font-sans">
                      {/* Interactive Calendar Panel */}
                      <div className={`p-4 rounded-2xl border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                        {/* Calendar Month Selector Header */}
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-cyan-400" />
                            <span>{monthsNames[calendarViewMonth]} {calendarViewYear}</span>
                          </h4>
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (calendarViewMonth === 0) {
                                  setCalendarViewYear(y => y - 1);
                                  setCalendarViewMonth(11);
                                } else {
                                  setCalendarViewMonth(calendarViewMonth - 1);
                                }
                                setSelectedCalendarDay(null);
                              }}
                              className={`p-1.5 rounded-lg border hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${adminThemeClass.accentBorder}`}
                              title="Previous Month"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const today = new Date();
                                setCalendarViewYear(today.getFullYear());
                                setCalendarViewMonth(today.getMonth());
                                setSelectedCalendarDay(null);
                              }}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${adminThemeClass.accentBorder}`}
                            >
                              Today
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (calendarViewMonth === 11) {
                                  setCalendarViewYear(y => y + 1);
                                  setCalendarViewMonth(0);
                                } else {
                                  setCalendarViewMonth(calendarViewMonth + 1);
                                }
                                setSelectedCalendarDay(null);
                              }}
                              className={`p-1.5 rounded-lg border hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${adminThemeClass.accentBorder}`}
                              title="Next Month"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Weekday Labels */}
                        <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                          {weekdays.map((wd) => (
                            <span key={wd} className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                              {wd}
                            </span>
                          ))}
                        </div>

                        {/* Calendar Grid of Day Cells */}
                        <div className="grid grid-cols-7 gap-1">
                          {calendarDays.map((calDay, idx) => {
                            const { day, monthType, month, year } = calDay;
                            const isCurrentMonth = monthType === "current";
                            const permission = getPermissionForDay(year, month, day);
                            const dayOfWeek = getDayOfWeekName(year, month, day);
                            const isScheduledWorkDay = activeDays[dayOfWeek] === true;
                            
                            const isSelected = selectedCalendarDay && 
                              selectedCalendarDay.day === day && 
                              selectedCalendarDay.month === month && 
                              selectedCalendarDay.year === year;

                            let bgClass = "bg-transparent";
                            let textClass = isCurrentMonth ? "text-neutral-700 dark:text-neutral-200" : "text-neutral-400/40 dark:text-neutral-600/40";
                            let borderClass = "border-transparent";

                            if (permission) {
                              bgClass = "bg-amber-500/20 dark:bg-amber-500/15 hover:bg-amber-500/30 dark:hover:bg-amber-500/25";
                              textClass = "text-amber-600 dark:text-amber-400 font-bold";
                              borderClass = "border-amber-500/40 dark:border-amber-500/30";
                            } else if (isCurrentMonth && !isScheduledWorkDay) {
                              bgClass = "bg-neutral-100/30 dark:bg-neutral-900/40";
                              textClass = "text-neutral-400 dark:text-neutral-500 font-medium";
                            } else if (isCurrentMonth) {
                              bgClass = "hover:bg-neutral-100 dark:hover:bg-neutral-800/60";
                            }

                            if (isSelected) {
                              borderClass = "border-cyan-500 ring-1 ring-cyan-500";
                            }

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setSelectedCalendarDay({ day, month, year, permission, isScheduledWorkDay, dayOfWeek });
                                }}
                                className={`h-8 sm:h-9 rounded-xl border flex flex-col items-center justify-between p-1 transition-all relative cursor-pointer ${bgClass} ${textClass} ${borderClass}`}
                              >
                                <span className="text-[11px] leading-none font-mono mt-0.5">{day}</span>
                                {permission && (
                                  <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Day Selection Details Block */}
                      {selectedCalendarDay && (
                        <div className={`p-4 rounded-2xl border font-sans animate-fadeIn ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-neutral-400 dark:text-neutral-500">
                                {selectedCalendarDay.dayOfWeek}, {monthsNames[selectedCalendarDay.month]} {selectedCalendarDay.day}, {selectedCalendarDay.year}
                              </span>
                              <h5 className="text-xs font-bold text-neutral-700 dark:text-neutral-200 mt-0.5">
                                {selectedCalendarDay.isScheduledWorkDay ? "Scheduled Work Day" : "Off-Day (No Shift)"}
                              </h5>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedCalendarDay(null)}
                              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {selectedCalendarDay.permission ? (
                            <div className="mt-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 dark:bg-amber-500/5 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-extrabold text-[11px] text-amber-500 uppercase tracking-wider">
                                  Approved Leave: {selectedCalendarDay.permission.reason || "General"}
                                </span>
                                <span className="text-[10px] font-mono text-neutral-450 dark:text-neutral-500">
                                  {selectedCalendarDay.permission.startDate} &rarr; {selectedCalendarDay.permission.endDate}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-750 dark:text-neutral-300 font-medium">
                                <span className="font-bold">Remarks/Reason:</span> {selectedCalendarDay.permission.remarks || "Approved leave window."}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
                              No leave or exemption permissions on this day.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Cumulative Month Leave Summary Registry */}
                      <div>
                        <span className={`text-[10px] uppercase font-bold tracking-wider font-mono block mb-3 ${adminThemeClass.textMuted}`}>
                          Leave Calendar Registry ({monthsNames[calendarViewMonth]} {calendarViewYear})
                        </span>
                        {(() => {
                          const overlapPermissions = personalPermissions.filter(p => {
                            if (!p.startDate || !p.endDate) return false;
                            const pStart = new Date(p.startDate);
                            const pEnd = new Date(p.endDate);
                            const monthStart = new Date(calendarViewYear, calendarViewMonth, 1);
                            const monthEnd = new Date(calendarViewYear, calendarViewMonth + 1, 0);
                            return (pStart <= monthEnd && pEnd >= monthStart);
                          });

                          if (overlapPermissions.length > 0) {
                            return (
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {overlapPermissions.map((p, idx) => (
                                  <div key={idx} className={`p-3 rounded-xl border flex justify-between items-start text-xs ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                                    <div className="space-y-1">
                                      <div className="flex items-center space-x-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow" />
                                        <span className="font-extrabold text-amber-500 capitalize text-[11px] tracking-wide">
                                          {p.reason || "General"} Leave
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-neutral-700 dark:text-neutral-300">
                                        <span className="font-semibold text-neutral-400">Reason/Remarks:</span> {p.remarks || "No reason given"}
                                      </p>
                                      <p className={`text-[10px] font-medium pl-3 text-neutral-500 dark:text-neutral-400`}>
                                        <span className="font-semibold text-neutral-400">Duration:</span> {p.startDate} to {p.endDate}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          }

                          return (
                            <div className={`p-4 rounded-xl text-center text-xs border border-dashed ${adminThemeClass.textMuted}`}>
                              No approved leave permissions recorded for this month.
                            </div>
                          );
                        })()}
                      </div>

                      {/* Shift Schedule Reference */}
                      <div className="border-t pt-4 border-neutral-200/10">
                        <span className={`text-[10px] uppercase font-bold tracking-wider font-mono block mb-3 ${adminThemeClass.textMuted}`}>Weekly Standard Days & Shift</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {daysList.map(d => {
                            const isScheduled = activeDays[d] === true;
                            const shiftTime = getShiftTimeForDay(d);
                            return (
                              <div key={d} className={`p-3 rounded-xl border flex items-center justify-between text-xs ${isScheduled ? `${adminThemeClass.innerBg} border-cyan-500/20` : "opacity-50 border-neutral-200/10"}`}>
                                <div className="flex items-center space-x-2">
                                  <span className={`h-2 w-2 rounded-full ${isScheduled ? "bg-emerald-400 shadow-sm" : "bg-neutral-500"}`} />
                                  <span className="font-bold">{d}</span>
                                </div>
                                <span className="font-mono font-medium text-[11px]">
                                  {isScheduled ? `Shift: ${shiftTime}` : "Off-Day"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {activeSummaryTab === "hours" && (() => {
                  const daysList = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
                  const monthNames = [
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                  ];
                  const currentYear = new Date().getFullYear();
                  const yearsList = [];
                  for (let y = 2024; y <= currentYear; y++) {
                    yearsList.push(y);
                  }

                  const activeDays = activeLeaderModal.activityDays || settings?.activityDays || {
                    Monday: true, Tuesday: true, Wednesday: true, Thursday: true, Friday: true, Saturday: false, Sunday: false
                  };

                  // Helper function to calculate precise metrics for any specific date range or filter
                  const calculateAuditRangeMetrics = (filterType: "daily" | "weekly" | "monthly" | "yearly") => {
                    const getRecordDurationSeconds = (r: any): number => {
                      if (typeof r.coveredTime === "number" && r.coveredTime > 0) {
                        return r.coveredTime;
                      }
                      if (r.timeIn && r.timeOut) {
                        const [h1, m1, s1] = r.timeIn.split(":").map(Number);
                        const [h2, m2, s2] = r.timeOut.split(":").map(Number);
                        const sIn = (h1 || 0) * 3600 + (m1 || 0) * 60 + (s1 || 0);
                        const sOut = (h2 || 0) * 3600 + (m2 || 0) * 60 + (s2 || 0);
                        if (sOut > sIn) return sOut - sIn;
                      }
                      return 0;
                    };

                    let targetRecords: any[] = [];
                    let expectedWorkDays = 0;
                    let attendedDays = 0;
                    let lateCount = 0;
                    let onTimeCount = 0;
                    let approvedExemptions = 0;
                    let absentDays = 0;
                    let totalSeconds = 0;

                    const workerRecords = attendanceRecords.filter(r => r.worker_id === activeLeaderModal.id);

                    if (filterType === "daily") {
                      // Monday to Sunday: match chosen day of the week
                      const matchingRecords = workerRecords.filter(r => {
                        const [y, m, d] = r.date.split("-").map(Number);
                        const dateObj = new Date(y, m - 1, d);
                        const dayIdx = dateObj.getDay();
                        const rDayName = daysList[dayIdx === 0 ? 6 : dayIdx - 1];
                        return rDayName === auditSelectedDay;
                      });

                      targetRecords = matchingRecords;
                      const isScheduled = activeDays[auditSelectedDay] === true;
                      expectedWorkDays = isScheduled ? Math.max(1, matchingRecords.length) : 0;
                      
                      attendedDays = targetRecords.filter(r => (r.statusIn || "").toUpperCase() === "PRESENT" || (r.statusIn || "").toUpperCase() === "LATE").length;
                      lateCount = targetRecords.filter(r => (r.statusIn || "").toUpperCase() === "LATE").length;
                      onTimeCount = targetRecords.filter(r => (r.statusIn || "").toUpperCase() === "PRESENT").length;
                      absentDays = Math.max(0, expectedWorkDays - attendedDays);

                      totalSeconds = targetRecords.reduce((sum, r) => sum + getRecordDurationSeconds(r), 0);
                    } else if (filterType === "weekly") {
                      // Week 1 - Week 52: ISO Week calculation
                      const getISOWeek = (dateStr: string) => {
                        const [y, m, d] = dateStr.split("-").map(Number);
                        const target = new Date(Date.UTC(y, m - 1, d));
                        const dayNum = target.getUTCDay() || 7;
                        target.setUTCDate(target.getUTCDate() + 4 - dayNum);
                        const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
                        return Math.min(52, Math.max(1, Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)));
                      };

                      targetRecords = workerRecords.filter(r => getISOWeek(r.date) === auditSelectedWeek);
                      const scheduledPerWeek = Object.values(activeDays).filter(Boolean).length;
                      expectedWorkDays = scheduledPerWeek;
                      attendedDays = targetRecords.filter(r => (r.statusIn || "").toUpperCase() === "PRESENT" || (r.statusIn || "").toUpperCase() === "LATE").length;
                      lateCount = targetRecords.filter(r => (r.statusIn || "").toUpperCase() === "LATE").length;
                      onTimeCount = targetRecords.filter(r => (r.statusIn || "").toUpperCase() === "PRESENT").length;
                      absentDays = Math.max(0, expectedWorkDays - attendedDays);

                      totalSeconds = targetRecords.reduce((sum, r) => sum + getRecordDurationSeconds(r), 0);
                    } else if (filterType === "monthly") {
                      // January - December
                      targetRecords = workerRecords.filter(r => {
                        const [y, m] = r.date.split("-").map(Number);
                        return (m - 1) === auditSelectedMonth;
                      });

                      const scheduledPerWeek = Object.values(activeDays).filter(Boolean).length;
                      expectedWorkDays = scheduledPerWeek * 4;
                      attendedDays = targetRecords.filter(r => (r.statusIn || "").toUpperCase() === "PRESENT" || (r.statusIn || "").toUpperCase() === "LATE").length;
                      lateCount = targetRecords.filter(r => (r.statusIn || "").toUpperCase() === "LATE").length;
                      onTimeCount = targetRecords.filter(r => (r.statusIn || "").toUpperCase() === "PRESENT").length;
                      absentDays = Math.max(0, expectedWorkDays - attendedDays);

                      totalSeconds = targetRecords.reduce((sum, r) => sum + getRecordDurationSeconds(r), 0);
                    } else if (filterType === "yearly") {
                      // 2024 to current year
                      targetRecords = workerRecords.filter(r => {
                        const [y] = r.date.split("-").map(Number);
                        return y === auditSelectedYear;
                      });

                      const scheduledPerWeek = Object.values(activeDays).filter(Boolean).length;
                      expectedWorkDays = scheduledPerWeek * 52;
                      attendedDays = targetRecords.filter(r => (r.statusIn || "").toUpperCase() === "PRESENT" || (r.statusIn || "").toUpperCase() === "LATE").length;
                      lateCount = targetRecords.filter(r => (r.statusIn || "").toUpperCase() === "LATE").length;
                      onTimeCount = targetRecords.filter(r => (r.statusIn || "").toUpperCase() === "PRESENT").length;
                      absentDays = Math.max(0, expectedWorkDays - attendedDays);

                      totalSeconds = targetRecords.reduce((sum, r) => sum + getRecordDurationSeconds(r), 0);
                    }

                    const workHours = Number((totalSeconds / 3600).toFixed(2));
                    const performanceScore = expectedWorkDays > 0 
                      ? Math.min(100, Number(((attendedDays / expectedWorkDays) * 100).toFixed(1))) 
                      : 0;

                    return {
                      workHours,
                      expectedWorkDays,
                      attendedDays,
                      lateCount,
                      onTimeCount,
                      approvedExemptions,
                      absentDays,
                      performanceScore,
                      totalRecordsCount: targetRecords.length
                    };
                  };

                  const currentAuditMetrics = calculateAuditRangeMetrics(auditTimeframe);

                  const dailyAuditMetrics = calculateAuditRangeMetrics("daily");
                  const weeklyAuditMetrics = calculateAuditRangeMetrics("weekly");
                  const monthlyAuditMetrics = calculateAuditRangeMetrics("monthly");
                  const yearlyAuditMetrics = calculateAuditRangeMetrics("yearly");

                  const allWorkerRecords = attendanceRecords.filter(r => r.worker_id === activeLeaderModal.id);
                  const totalCumulativeSeconds = allWorkerRecords.reduce((sum, r) => {
                    if (typeof r.coveredTime === "number" && r.coveredTime > 0) return sum + r.coveredTime;
                    if (r.timeIn && r.timeOut) {
                      const [h1, m1, s1] = r.timeIn.split(":").map(Number);
                      const [h2, m2, s2] = r.timeOut.split(":").map(Number);
                      const sIn = (h1 || 0) * 3600 + (m1 || 0) * 60 + (s1 || 0);
                      const sOut = (h2 || 0) * 3600 + (m2 || 0) * 60 + (s2 || 0);
                      if (sOut > sIn) return sum + (sOut - sIn);
                    }
                    return sum;
                  }, 0);
                  const totalCumulativeHours = Number((totalCumulativeSeconds / 3600).toFixed(2));

                  const getPerformanceBadge = (score: number) => {
                    if (score >= 90) return { label: "Optimal Standing", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" };
                    if (score >= 75) return { label: "Good Standing", bg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25" };
                    if (score >= 50) return { label: "Satisfactory", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25" };
                    return { label: "Needs Improvement", bg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25" };
                  };
                  const perfBadge = getPerformanceBadge(currentAuditMetrics.performanceScore);

                  return (
                    <div className="space-y-5 font-sans">
                      {/* HR Timeframe Audit Controller */}
                      <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <span className={`text-[10px] uppercase font-bold tracking-wider font-mono block mb-0.5 ${adminThemeClass.textMuted}`}>
                              HR Work-Hours & Performance Audit Timeframe
                            </span>
                            <p className={`text-xs font-light ${adminThemeClass.textMuted}`}>
                              Audit employee work hours and shift attendance performance across custom time horizons.
                            </p>
                          </div>

                          {/* Primary Basis Switcher: Daily, Weekly, Monthly, Yearly */}
                          <div className={`flex rounded-xl p-0.5 border shadow-inner ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder} self-start sm:self-auto`}>
                            {(["daily", "weekly", "monthly", "yearly"] as const).map((tf) => (
                              <button
                                key={tf}
                                type="button"
                                onClick={() => setAuditTimeframe(tf)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                                  auditTimeframe === tf
                                    ? "bg-cyan-600 text-white shadow-sm scale-[1.02]"
                                    : `text-neutral-400 hover:${adminThemeClass.textHighlight}`
                                }`}
                              >
                                {tf}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Interactive Selector Trigger for current Timeframe */}
                        <div className={`pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${adminThemeClass.accentBorder}`}>
                          <div className="flex items-center space-x-2">
                            <span className={`text-[11px] font-semibold ${adminThemeClass.textTitle}`}>
                              {auditTimeframe === "daily" && "Daily Audit Selection:"}
                              {auditTimeframe === "weekly" && "Weekly Audit Selection:"}
                              {auditTimeframe === "monthly" && "Monthly Audit Selection:"}
                              {auditTimeframe === "yearly" && "Yearly Audit Selection:"}
                            </span>
                            <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 font-mono">
                              {auditTimeframe === "daily" && auditSelectedDay}
                              {auditTimeframe === "weekly" && `Week ${auditSelectedWeek}`}
                              {auditTimeframe === "monthly" && monthNames[auditSelectedMonth]}
                              {auditTimeframe === "yearly" && auditSelectedYear}
                            </span>
                          </div>

                          <button
                            id="open_audit_picker_modal_btn"
                            type="button"
                            onClick={() => setShowAuditPickerModal(true)}
                            className={`px-4 py-2 rounded-xl border flex items-center justify-between sm:justify-start space-x-3 text-xs font-bold cursor-pointer transition-all hover:scale-[1.01] shadow-xs ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textTitle}`}
                          >
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
                              <span>
                                {auditTimeframe === "daily" && `Choose Day (Monday - Sunday)`}
                                {auditTimeframe === "weekly" && `Choose Week (Week 1 - Week 52)`}
                                {auditTimeframe === "monthly" && `Choose Month (January - December)`}
                                {auditTimeframe === "yearly" && `Choose Year (2024 - ${currentYear})`}
                              </span>
                            </div>
                            <ChevronDown className="h-4 w-4 text-neutral-400 ml-2 shrink-0" />
                          </button>
                        </div>
                      </div>

                      {/* Vertical List Selection Modal for Timeframe (Daily, Weekly, Monthly, Yearly) */}
                      <AnimatePresence>
                        {showAuditPickerModal && (
                          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 overflow-y-auto">
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 15 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 15 }}
                              className={`w-full max-w-md my-auto max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
                            >
                              {/* Modal Header */}
                              <div className={`p-5 border-b flex items-center justify-between shrink-0 ${adminThemeClass.accentBorder}`}>
                                <div className="flex items-center space-x-3">
                                  <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-400">
                                    <Calendar className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <h3 className={`font-bold text-sm sm:text-base ${adminThemeClass.textTitle}`}>
                                      {auditTimeframe === "daily" && "Select Day of Week"}
                                      {auditTimeframe === "weekly" && "Select Calendar Week"}
                                      {auditTimeframe === "monthly" && "Select Calendar Month"}
                                      {auditTimeframe === "yearly" && "Select Audit Year"}
                                    </h3>
                                    <p className={`text-xs ${adminThemeClass.textMuted}`}>
                                      {auditTimeframe === "daily" && "Monday to Sunday"}
                                      {auditTimeframe === "weekly" && "Week 1 to Week 52"}
                                      {auditTimeframe === "monthly" && "January to December"}
                                      {auditTimeframe === "yearly" && `2024 to ${currentYear}`}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowAuditPickerModal(false)}
                                  className={`p-2 rounded-xl text-neutral-400 hover:${adminThemeClass.textTitle} hover:bg-neutral-800/30 transition-colors cursor-pointer`}
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              </div>

                              {/* Vertical List Content */}
                              <div className="p-4 sm:p-5 space-y-2 overflow-y-auto flex-1 scrollbar-thin">
                                {/* Daily: Monday to Sunday */}
                                {auditTimeframe === "daily" &&
                                  daysList.map((day) => {
                                    const isSelected = auditSelectedDay === day;
                                    return (
                                      <button
                                        key={day}
                                        type="button"
                                        onClick={() => {
                                          setAuditSelectedDay(day);
                                          setShowAuditPickerModal(false);
                                        }}
                                        className={`w-full p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer border text-left ${
                                          isSelected
                                            ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-600 dark:text-cyan-400 font-bold shadow-xs"
                                            : `${adminThemeClass.innerBg} border-transparent hover:${adminThemeClass.accentBorder} ${adminThemeClass.textTitle} font-medium`
                                        }`}
                                      >
                                        <div className="flex items-center space-x-3">
                                          <span
                                            className={`w-2.5 h-2.5 rounded-full ${
                                              isSelected ? "bg-cyan-500 dark:bg-cyan-400 shadow-sm" : "bg-neutral-500 dark:bg-neutral-600"
                                            }`}
                                          />
                                          <span className="text-sm font-semibold">{day}</span>
                                        </div>
                                        {isSelected && <Check className="h-4 w-4 text-cyan-500 dark:text-cyan-400 shrink-0" />}
                                      </button>
                                    );
                                  })}

                                {/* Weekly: Week 1 to Week 52 */}
                                {auditTimeframe === "weekly" &&
                                  Array.from({ length: 52 }, (_, i) => i + 1).map((wk) => {
                                    const isSelected = auditSelectedWeek === wk;
                                    return (
                                      <button
                                        key={wk}
                                        type="button"
                                        onClick={() => {
                                          setAuditSelectedWeek(wk);
                                          setShowAuditPickerModal(false);
                                        }}
                                        className={`w-full p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer border text-left ${
                                          isSelected
                                            ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-600 dark:text-cyan-400 font-bold shadow-xs"
                                            : `${adminThemeClass.innerBg} border-transparent hover:${adminThemeClass.accentBorder} ${adminThemeClass.textTitle} font-medium`
                                        }`}
                                      >
                                        <div className="flex items-center space-x-3">
                                          <span
                                            className={`w-2.5 h-2.5 rounded-full ${
                                              isSelected ? "bg-cyan-500 dark:bg-cyan-400 shadow-sm" : "bg-neutral-500 dark:bg-neutral-600"
                                            }`}
                                          />
                                          <span className="text-sm font-semibold font-mono">Week {wk}</span>
                                        </div>
                                        {isSelected && <Check className="h-4 w-4 text-cyan-500 dark:text-cyan-400 shrink-0" />}
                                      </button>
                                    );
                                  })}

                                {/* Monthly: January to December */}
                                {auditTimeframe === "monthly" &&
                                  monthNames.map((month, idx) => {
                                    const isSelected = auditSelectedMonth === idx;
                                    return (
                                      <button
                                        key={month}
                                        type="button"
                                        onClick={() => {
                                          setAuditSelectedMonth(idx);
                                          setShowAuditPickerModal(false);
                                        }}
                                        className={`w-full p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer border text-left ${
                                          isSelected
                                            ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-600 dark:text-cyan-400 font-bold shadow-xs"
                                            : `${adminThemeClass.innerBg} border-transparent hover:${adminThemeClass.accentBorder} ${adminThemeClass.textTitle} font-medium`
                                        }`}
                                      >
                                        <div className="flex items-center space-x-3">
                                          <span
                                            className={`w-2.5 h-2.5 rounded-full ${
                                              isSelected ? "bg-cyan-500 dark:bg-cyan-400 shadow-sm" : "bg-neutral-500 dark:bg-neutral-600"
                                            }`}
                                          />
                                          <span className="text-sm font-semibold">{month}</span>
                                        </div>
                                        {isSelected && <Check className="h-4 w-4 text-cyan-500 dark:text-cyan-400 shrink-0" />}
                                      </button>
                                    );
                                  })}

                                {/* Yearly: 2024 to current year */}
                                {auditTimeframe === "yearly" &&
                                  yearsList.map((yr) => {
                                    const isSelected = auditSelectedYear === yr;
                                    return (
                                      <button
                                        key={yr}
                                        type="button"
                                        onClick={() => {
                                          setAuditSelectedYear(yr);
                                          setShowAuditPickerModal(false);
                                        }}
                                        className={`w-full p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer border text-left ${
                                          isSelected
                                            ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-600 dark:text-cyan-400 font-bold shadow-xs"
                                            : `${adminThemeClass.innerBg} border-transparent hover:${adminThemeClass.accentBorder} ${adminThemeClass.textTitle} font-medium`
                                        }`}
                                      >
                                        <div className="flex items-center space-x-3">
                                          <span
                                            className={`w-2.5 h-2.5 rounded-full ${
                                              isSelected ? "bg-cyan-500 dark:bg-cyan-400 shadow-sm" : "bg-neutral-500 dark:bg-neutral-600"
                                            }`}
                                          />
                                          <span className="text-sm font-semibold font-mono">{yr}</span>
                                        </div>
                                        {isSelected && <Check className="h-4 w-4 text-cyan-500 dark:text-cyan-400 shrink-0" />}
                                      </button>
                                    );
                                  })}
                              </div>

                              {/* Modal Footer */}
                              <div className={`p-4 border-t flex justify-end shrink-0 ${adminThemeClass.accentBorder}`}>
                                <button
                                  type="button"
                                  onClick={() => setShowAuditPickerModal(false)}
                                  className={`px-5 py-2 rounded-xl border font-bold text-xs cursor-pointer ${adminThemeClass.innerBg} ${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle}`}
                                >
                                  Close
                                </button>
                              </div>
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>

                      {/* Active Audit Evaluation Overview Card */}
                      <div className={`p-6 rounded-3xl border shadow-md space-y-5 ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-neutral-200/20">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className={`text-[10px] uppercase font-bold tracking-wider font-mono ${adminThemeClass.textMuted}`}>
                                Active Audit Horizon
                              </span>
                              <span className="inline-block h-1 w-1 rounded-full bg-cyan-400" />
                              <span className="text-[10px] font-mono font-semibold uppercase text-cyan-600 dark:text-cyan-400">
                                {auditTimeframe === "daily" && `${auditSelectedDay} (Daily)`}
                                {auditTimeframe === "weekly" && `Week ${auditSelectedWeek} (Wk 1-52)`}
                                {auditTimeframe === "monthly" && `${monthNames[auditSelectedMonth]} (Monthly)`}
                                {auditTimeframe === "yearly" && `Year ${auditSelectedYear} (2024-${currentYear})`}
                              </span>
                            </div>
                            <h4 className={`text-base font-bold mt-0.5 ${adminThemeClass.textTitle}`}>
                              Audited Work-Hours & Performance Metrics
                            </h4>
                          </div>
                          <span className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold self-start sm:self-auto ${perfBadge.bg}`}>
                            {perfBadge.label}
                          </span>
                        </div>

                        {/* Audit Key Metrics Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className={`p-4 rounded-2xl border flex flex-col justify-between ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                            <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${adminThemeClass.textMuted}`}>
                              Audited Work Hours
                            </span>
                            <div className="mt-2 flex items-baseline space-x-1">
                              <strong className="text-2xl text-cyan-600 dark:text-cyan-400 font-mono font-bold">
                                {currentAuditMetrics.workHours.toFixed(2)}
                              </strong>
                              <span className={`text-[10px] font-medium ${adminThemeClass.textMuted}`}>hrs</span>
                            </div>
                          </div>

                          <div className={`p-4 rounded-2xl border flex flex-col justify-between ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                            <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${adminThemeClass.textMuted}`}>
                              Performance Rate
                            </span>
                            <div className="mt-2 flex items-baseline space-x-1">
                              <strong className="text-2xl text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                {currentAuditMetrics.performanceScore.toFixed(1)}%
                              </strong>
                            </div>
                          </div>

                          <div className={`p-4 rounded-2xl border flex flex-col justify-between ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                            <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${adminThemeClass.textMuted}`}>
                              Attended Days
                            </span>
                            <div className="mt-2 flex items-baseline space-x-1">
                              <strong className="text-xl text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                {currentAuditMetrics.attendedDays}
                              </strong>
                              <span className={`text-[10px] font-medium ${adminThemeClass.textMuted}`}>/ {currentAuditMetrics.expectedWorkDays}</span>
                            </div>
                          </div>

                          <div className={`p-4 rounded-2xl border flex flex-col justify-between ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                            <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${adminThemeClass.textMuted}`}>
                              Lateness Flags
                            </span>
                            <div className="mt-2 flex items-baseline space-x-1">
                              <strong className="text-xl text-orange-600 dark:text-orange-400 font-mono font-bold">
                                {currentAuditMetrics.lateCount}
                              </strong>
                              <span className={`text-[10px] font-medium ${adminThemeClass.textMuted}`}>days</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Reference Cumulative Hours Matrix */}
                      <div>
                        <span className={`text-[10px] uppercase font-bold tracking-wider font-mono block mb-2 ${adminThemeClass.textMuted}`}>
                          Cumulative Standard Timeframe Reference Matrix
                        </span>
                        <div className="grid grid-cols-2 gap-4">
                          <div className={`p-4 rounded-2xl border flex flex-col justify-between ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                            <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${adminThemeClass.textMuted}`}>Total Cumulative Hours</span>
                            <div className="mt-2 flex items-baseline space-x-1">
                              <strong className="text-2xl text-cyan-600 dark:text-cyan-400 font-mono font-bold">{totalCumulativeHours.toFixed(2)}</strong>
                              <span className={`text-[10px] font-medium ${adminThemeClass.textMuted}`}>hours</span>
                            </div>
                          </div>
                          <div className={`p-4 rounded-2xl border flex flex-col justify-between ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                            <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${adminThemeClass.textMuted}`}>Daily Shift Hours</span>
                            <div className="mt-2 flex items-baseline space-x-1">
                              <strong className="text-2xl text-emerald-600 dark:text-emerald-400 font-mono font-bold">{dailyAuditMetrics.workHours.toFixed(2)}</strong>
                              <span className={`text-[10px] font-medium ${adminThemeClass.textMuted}`}>hours</span>
                            </div>
                          </div>
                          <div className={`p-4 rounded-2xl border flex flex-col justify-between ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                            <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${adminThemeClass.textMuted}`}>Weekly Accumulated Hours</span>
                            <div className="mt-2 flex items-baseline space-x-1">
                              <strong className="text-xl text-amber-600 dark:text-amber-400 font-mono font-bold">{weeklyAuditMetrics.workHours.toFixed(2)}</strong>
                              <span className={`text-[10px] font-medium ${adminThemeClass.textMuted}`}>hours</span>
                            </div>
                          </div>
                          <div className={`p-4 rounded-2xl border flex flex-col justify-between ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                            <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${adminThemeClass.textMuted}`}>Monthly Total Hours</span>
                            <div className="mt-2 flex items-baseline space-x-1">
                              <strong className="text-xl text-indigo-600 dark:text-indigo-400 font-mono font-bold">{monthlyAuditMetrics.workHours.toFixed(2)}</strong>
                              <span className={`text-[10px] font-medium ${adminThemeClass.textMuted}`}>hours</span>
                            </div>
                          </div>
                          <div className={`p-4 rounded-2xl border flex flex-col justify-between ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder} col-span-2`}>
                            <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${adminThemeClass.textMuted}`}>Yearly Aggregated Hours</span>
                            <div className="mt-2 flex items-baseline space-x-1">
                              <strong className={`text-2xl font-mono font-bold ${adminThemeClass.accentText}`}>{yearlyAuditMetrics.workHours.toFixed(2)}</strong>
                              <span className={`text-[10px] font-medium ${adminThemeClass.textMuted}`}>hours</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {activeSummaryTab === "history" && (() => {
                  const workerLogs = attendanceRecords
                    .filter(r => r.worker_id === activeLeaderModal.id)
                    .sort((a, b) => b.date.localeCompare(a.date));
                  return (
                    <div className="space-y-3 font-sans">
                      <span className={`text-[10px] uppercase font-bold tracking-wider font-mono block ${adminThemeClass.textMuted}`}>Shift logs punch history</span>
                      <div className="relative group/scroll w-full">
                        {/* Left invisible/hover scroll icon */}
                        <button
                          type="button"
                          onClick={() => scrollContainer(adminPunchHistoryRef, "left")}
                          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/40 dark:bg-black/40 border border-neutral-200 dark:border-neutral-850 backdrop-blur-md opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-200 cursor-pointer text-slate-700 dark:text-neutral-300 hover:scale-110 active:scale-95 shadow-sm"
                          title="Scroll Left"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>

                        <div ref={adminPunchHistoryRef} className="overflow-x-auto w-full scrollbar-none rounded-2xl">
                          <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                              <tr className={`text-[11px] font-bold uppercase tracking-wider border-b ${adminThemeClass.innerBg} ${adminThemeClass.textMuted}`}>
                                <th className="p-3">Date</th>
                                <th className="p-3">Check-in Time</th>
                                <th className="p-3">Check-out Time</th>
                                <th className="p-3">Shift Duration</th>
                                <th className="p-3">Attendance Status</th>
                                <th className="p-3">Permission Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200/10 text-[11px]">
                              {workerLogs.length > 0 ? (
                                workerLogs.map((log, idx) => {
                                  const dateObj = new Date(log.date);
                                  const dayOfWeek = isNaN(dateObj.getTime()) 
                                    ? "--" 
                                    : dateObj.toLocaleDateString("en-US", { weekday: "long" });
                                  const durationStr = formatDurationHHMMSS(log.coveredTime);
                                  
                                  // Check if there was an approved leave/permission for this date
                                  const permission = permissions.find(p => 
                                    p.worker_id === activeLeaderModal.id && 
                                    (p.status || "").toLowerCase() === "approved" && 
                                    p.startDate <= log.date && 
                                    p.endDate >= log.date
                                  );
                                  const permissionStatus = permission 
                                    ? `Approved (${permission.type})` 
                                    : "Standard Shift";
                                    
                                  return (
                                    <tr key={idx} className={`border-b ${adminThemeClass.tableRowHover} duration-100`}>
                                      <td className={`p-3 font-sans font-medium ${adminThemeClass.textTitle}`}>
                                        {formatDateToCustomString(log.date)}
                                      </td>
                                      <td className={`p-3 font-mono ${adminThemeClass.textHighlight}`}>{log.timeIn || "--"}</td>
                                      <td className={`p-3 font-mono ${adminThemeClass.textHighlight}`}>{log.timeOut || "Active Shift"}</td>
                                      <td className={`p-3 font-mono font-bold ${adminThemeClass.accentText}`}>{durationStr}</td>
                                      <td className="p-3">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold border uppercase ${
                                          (log.statusIn || "").toString().toUpperCase() === 'PRESENT' || (log.statusIn || "").toString().toUpperCase() === 'ON TIME' || (log.statusIn || "").toString().toUpperCase() === 'ON_TIME'
                                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                            : (log.statusIn || "").toString().toUpperCase() === 'LATE'
                                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                            : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                        }`}>
                                          {(log.statusIn || "").toString().toUpperCase() === 'PRESENT' ? 'ON TIME' : ((log.statusIn || "").toString().toUpperCase() || 'ON TIME')}
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
                                  <td colSpan={6} className="p-8 text-center text-neutral-500 font-light">
                                    No historical attendance records logged.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Right invisible/hover scroll icon */}
                        <button
                          type="button"
                          onClick={() => scrollContainer(adminPunchHistoryRef, "right")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/40 dark:bg-black/40 border border-neutral-200 dark:border-neutral-850 backdrop-blur-md opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-200 cursor-pointer text-slate-700 dark:text-neutral-300 hover:scale-110 active:scale-95 shadow-sm"
                          title="Scroll Right"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {activeSummaryTab === "actions" && (
                  <div className="space-y-6 font-sans">
                    {/* Management buttons inside Administrative Settings Tab */}
                    <div>
                      <span className={`text-[10px] uppercase font-bold tracking-wider font-mono block mb-3 ${adminThemeClass.textMuted}`}>Worker Account Management Actions</span>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            // Populate state and open the edit worker modal
                            setWorkerFormFirstName(activeLeaderModal.firstName || "");
                            setWorkerFormLastName(activeLeaderModal.lastName || "");
                            setWorkerFormEmail(activeLeaderModal.email || "");
                            setWorkerFormPhone(activeLeaderModal.phone || "");
                            setWorkerFormRole(activeLeaderModal.role || UserRole.TEAM_MEMBER);
                            setWorkerFormGender(activeLeaderModal.gender || "Not Specified");
                            setWorkerFormDeptId(activeLeaderModal.department_id || "unassigned");
                            setWorkerFormActivityDays(activeLeaderModal.activityDays || settings?.activityDays || {
                              Monday: true, Tuesday: true, Wednesday: true, Thursday: true, Friday: true, Saturday: false, Sunday: false
                            });
                            setShowEditWorkerModal(activeLeaderModal);
                            setActiveLeaderModal(null);
                          }}
                          className="py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer"
                        >
                          <Edit className="h-4 w-4" />
                          <span>Edit Worker Profile</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDoubleConfirmState({
                              step: 1,
                              title: "Critical Account Deletion",
                              message: `Are you absolutely certain you want to delete ${activeLeaderModal.firstName} ${activeLeaderModal.lastName}? This operation is irreversible and severs active histories.`,
                              actionType: "delete",
                              payload: null,
                              onConfirm: async () => {
                                try {
                                  const response = await fetch("/api/tenant/workers/delete", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      tenant_id: tenant.id,
                                      worker_id: activeLeaderModal.id
                                    })
                                  });
                                  if (response.ok) {
                                    onNotifyAdmin("Employee Deleted", `Profile for ${activeLeaderModal.firstName} ${activeLeaderModal.lastName} successfully terminated.`);
                                    syncAdminResources();
                                    setActiveLeaderModal(null);
                                  } else {
                                    onNotifyAdmin("Error Deleting", "Server refused account deletion.");
                                  }
                                } catch (err) {
                                  onNotifyAdmin("Network Error", "Central authorization server unreachable.");
                                }
                              }
                            });
                          }}
                          className="py-3 px-4 bg-red-600 hover:bg-red-750 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete Worker Profile</span>
                        </button>
                      </div>
                    </div>

                    {/* Team Lead Assignment Section */}
                    <div className={`pt-4 pb-12 border-t ${adminThemeClass.accentBorder}`}>
                      <h5 className={`text-xs font-bold uppercase mb-2 ${adminThemeClass.textTitle} flex items-center space-x-1.5`}>
                        <span>Assign as Department Lead</span>
                      </h5>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1 min-w-0">
                          <CustomSelect
                            id="modal_assign_dept_lead_select"
                            value={leadModalDeptId}
                            onChange={(val) => setLeadModalDeptId(val)}
                            placeholder="Select Department..."
                            options={departments.map((dp) => ({
                              value: dp.id,
                              label: `${dp.name} ${dp.leadId === activeLeaderModal.id ? "(Current Lead)" : dp.leadId ? "(Has different lead)" : "(No active lead)"}`
                            }))}
                            theme={theme === "light" ? "light" : theme === "army" ? "army" : theme === "navy" ? "navy" : "dark"}
                            className={`rounded-2xl p-3 font-bold text-xs transition-all outline-none focus:border-cyan-500 hover:opacity-95 ${adminThemeClass.inputBg} ${adminThemeClass.accentBorder}`}
                          />
                        </div>
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => setIsAssignDropdownOpen(!isAssignDropdownOpen)}
                            className="w-full px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl text-xs cursor-pointer shadow-md min-h-[44px] flex items-center justify-center gap-1.5"
                          >
                            <span>Assign Role</span>
                          </button>
                          
                          <AnimatePresence>
                            {isAssignDropdownOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className={`absolute right-0 mt-2 w-64 rounded-3xl shadow-2xl border p-4 pb-8 mb-6 z-[60] ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
                              >
                                <div className="px-3 py-1.5 border-b mb-1 border-neutral-800/10 dark:border-neutral-200/10">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${adminThemeClass.textMuted}`}>Select System Role</span>
                                </div>
                                
                                {/* Team Member Option */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsAssignDropdownOpen(false);
                                    const chosenDept = departments.find(d => d.id === leadModalDeptId);
                                    const deptName = chosenDept ? chosenDept.name : "";
                                    
                                    setDoubleConfirmState({
                                      step: 1,
                                      title: "Confirm Role: Team Member",
                                      message: `Are you sure you want to change ${activeLeaderModal.firstName} ${activeLeaderModal.lastName}'s role to Team Member${deptName ? ` and assign them to the "${deptName}" department` : ""}? This will set standard staff permissions.`,
                                      onConfirm: async () => {
                                        try {
                                          const response = await fetch("/api/tenant/workers/update", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                              tenant_id: tenant.id,
                                              worker_id: activeLeaderModal.id,
                                              role: UserRole.TEAM_MEMBER,
                                              department_id: leadModalDeptId || ""
                                            })
                                          });
                                          if (response.ok) {
                                            onNotifyAdmin("Role Updated", `${activeLeaderModal.firstName} ${activeLeaderModal.lastName} is now a Team Member${deptName ? ` in ${deptName}` : ""}.`);
                                            syncAdminResources();
                                            setActiveLeaderModal(null);
                                          } else {
                                            onNotifyAdmin("Update Failed", "Unable to update worker's role.");
                                          }
                                        } catch (e) {
                                          onNotifyAdmin("Network Error", "Unable to communicate with the server.");
                                        }
                                      }
                                    });
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-start gap-2.5 transition-colors ${adminThemeClass.tableRowHover}`}
                                >
                                  <div className={`p-1.5 rounded-lg bg-neutral-500/10 ${adminThemeClass.textMuted} shrink-0`}>
                                    <Users className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`font-bold ${adminThemeClass.textTitle}`}>Team Member</div>
                                    <div className={`text-[10px] font-medium leading-tight ${adminThemeClass.textMuted}`}>Regular staff access & timesheet logs.</div>
                                  </div>
                                </button>

                                {/* Team Lead Option */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsAssignDropdownOpen(false);
                                    if (!leadModalDeptId) {
                                      onNotifyAdmin("Selection Required", "Please choose a department to assign this employee as lead.");
                                      return;
                                    }
                                    const chosenDept = departments.find(d => d.id === leadModalDeptId);
                                    const deptName = chosenDept ? chosenDept.name : "Department";
                                    
                                    setDoubleConfirmState({
                                      step: 1,
                                      title: "Confirm Role: Team Lead",
                                      message: `Are you sure you want to assign ${activeLeaderModal.firstName} ${activeLeaderModal.lastName} as the leader of the "${deptName}" department?`,
                                      onConfirm: async () => {
                                        try {
                                          const response = await fetch("/api/tenant/departments/assign-lead", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                              tenant_id: tenant.id,
                                              department_id: leadModalDeptId,
                                              worker_id: activeLeaderModal.id,
                                              appointed_by: user.id
                                            })
                                          });
                                          if (response.ok) {
                                            onNotifyAdmin("Lead Appointed", `${activeLeaderModal.firstName} ${activeLeaderModal.lastName} has been successfully appointed as the Department Lead.`);
                                            syncAdminResources();
                                            setActiveLeaderModal(null);
                                          } else {
                                            onNotifyAdmin("Assignment Failed", "Unable to authorize lead appointment.");
                                          }
                                        } catch (e) {
                                          onNotifyAdmin("Network Error", "Unable to communicate with the server.");
                                        }
                                      }
                                    });
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-start gap-2.5 transition-colors ${adminThemeClass.tableRowHover}`}
                                >
                                  <div className={`p-1.5 rounded-lg bg-cyan-500/10 ${adminThemeClass.accentText} shrink-0`}>
                                    <Briefcase className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`font-bold ${adminThemeClass.textTitle}`}>Team Lead</div>
                                    <div className={`text-[10px] font-medium leading-tight ${adminThemeClass.textMuted}`}>Appoint as lead of chosen department.</div>
                                  </div>
                                </button>

                                {/* Company Admin Option */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsAssignDropdownOpen(false);
                                    const chosenDept = departments.find(d => d.id === leadModalDeptId);
                                    const deptName = chosenDept ? chosenDept.name : "";

                                    setDoubleConfirmState({
                                      step: 1,
                                      title: "Confirm Role: Company Admin",
                                      message: `CRITICAL ACTION: Are you sure you want to promote ${activeLeaderModal.firstName} ${activeLeaderModal.lastName} to Company Admin${deptName ? ` and assign them to the "${deptName}" department` : ""}? This grants full system privileges.`,
                                      onConfirm: async () => {
                                        try {
                                          const response = await fetch("/api/tenant/workers/update", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                              tenant_id: tenant.id,
                                              worker_id: activeLeaderModal.id,
                                              role: UserRole.COMPANY_ADMIN,
                                              department_id: leadModalDeptId || ""
                                            })
                                          });
                                          if (response.ok) {
                                            onNotifyAdmin("Role Updated", `${activeLeaderModal.firstName} ${activeLeaderModal.lastName} has been promoted to Company Admin${deptName ? ` in ${deptName}` : ""}.`);
                                            syncAdminResources();
                                            setActiveLeaderModal(null);
                                          } else {
                                            onNotifyAdmin("Update Failed", "Unable to update worker's role.");
                                          }
                                        } catch (e) {
                                          onNotifyAdmin("Network Error", "Unable to communicate with the server.");
                                        }
                                      }
                                    });
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-start gap-2.5 transition-colors ${adminThemeClass.tableRowHover}`}
                                >
                                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                                    <Shield className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`font-bold ${adminThemeClass.textTitle}`}>Company Admin</div>
                                    <div className={`text-[10px] font-medium leading-tight ${adminThemeClass.textMuted}`}>Full access to system configurations.</div>
                                  </div>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`p-4 border-t flex gap-3 justify-end ${adminThemeClass.accentBorder} ${adminThemeClass.innerBg}`}
              >
                <button
                  onClick={() => {
                    requestReportCompile("attendance", "csv");
                    setActiveLeaderModal(null);
                  }}
                  className={`px-4 py-2 border rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all min-h-[44px] cursor-pointer ${adminThemeClass.inputBg}`}
                >
                  <Download className="h-4 w-4" />
                  <span>Export as CSV</span>
                </button>
                <button
                  onClick={() => {
                    requestReportCompile("attendance", "pdf");
                    setActiveLeaderModal(null);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-xs rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all min-h-[44px] cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Export as PDF</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- MODAL AREA: SECURE TERMINAL QR CODE -------------------- */}
      <AnimatePresence>
        {showQrModal && (
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowQrModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`rounded-3xl max-w-md w-full max-h-[85vh] overflow-y-auto scrollbar-thin p-6 sm:p-7 text-center space-y-5 shadow-2xl border select-none my-auto flex flex-col ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textTitle}`}
            >
              {/* Simplified Header: Company Name & Gateway Title */}
              <div
                className={`flex justify-between items-center pb-3 border-b ${adminThemeClass.accentBorder}`}
              >
                <div className="flex items-center space-x-2.5 text-left min-w-0">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-display font-bold text-base truncate ${adminThemeClass.textTitle}`}>
                      {tenant.name}
                    </h3>
                    <span className={`text-[10px] uppercase font-bold tracking-wider font-mono block ${adminThemeClass.textMuted}`}>
                      Gateway Check-In QR
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowQrModal(false)}
                  className={`p-1.5 rounded-xl border font-bold text-lg cursor-pointer transition-colors ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textMuted} hover:${adminThemeClass.textHighlight}`}
                  aria-label="Close QR Modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Simplified Modal Content: Company Name and QR Code */}
              <div className="space-y-3">
                <div className="p-5 bg-white rounded-3xl inline-block shadow-lg mx-auto border border-neutral-200">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`${tenant.name} QR Check-In Token`}
                      className="h-60 w-60 object-contain mx-auto transition-transform duration-200"
                    />
                  ) : (
                    <div className="h-60 w-60 flex items-center justify-center text-gray-400 bg-neutral-100 rounded-2xl font-medium text-xs">
                      Generating credentials...
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center space-x-2">
                  <span className={`text-xs font-mono font-bold tracking-wider uppercase truncate ${adminThemeClass.accentText}`}>
                    {tenant.name}
                  </span>
                  <span className={`text-[10px] font-mono ${adminThemeClass.textMuted}`}>
                    &bull; ID: {tenant.id}
                  </span>
                </div>
              </div>

              {/* Secondary Options Collapsible Trigger (Collapsed by default) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsQrSecondaryOptionsExpanded((prev) => !prev)}
                  className={`w-full p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder} hover:opacity-90`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-semibold">
                      {isQrSecondaryOptionsExpanded ? "Hide Secondary Options" : "View Code & Download Options"}
                    </span>
                  </div>
                  {isQrSecondaryOptionsExpanded ? (
                    <ChevronUp className="h-4 w-4 text-cyan-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-neutral-400" />
                  )}
                </button>

                {/* Collapsible Secondary Options Body */}
                <AnimatePresence initial={false}>
                  {isQrSecondaryOptionsExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden space-y-3 pt-3"
                    >
                      {/* Six-Character Alternative Code Box */}
                      {(() => {
                        const altCode = getAlternativeAttendanceCode(tenant.id);
                        return (
                          <div
                            id="admin_alternative_code_box"
                            className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-left ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                          >
                            <div className="flex-1 min-w-0">
                              <span className={`text-[9px] uppercase font-bold tracking-wider font-mono block truncate ${adminThemeClass.textMuted}`}>
                                6-Char Alternative Code (24h Dynamic)
                              </span>
                              <span className={`text-lg font-mono font-black tracking-[0.25em] block truncate transition-all duration-150 ${adminThemeClass.accentText}`}>
                                {showAltCode ? altCode : "&bull;&bull;&bull;&bull;&bull;&bull;"}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0">
                              {/* Eye Hide / Reveal Button */}
                              <button
                                id="admin_toggle_alt_code_visibility_btn"
                                type="button"
                                onClick={() => setShowAltCode(!showAltCode)}
                                className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                                  !showAltCode
                                    ? "bg-slate-700/30 text-slate-300 border-slate-600/40"
                                    : `${adminThemeClass.inputBg} ${adminThemeClass.textTitle} hover:${adminThemeClass.accentText}`
                                }`}
                                title={showAltCode ? "Hide alternative code" : "Show alternative code"}
                                aria-label={showAltCode ? "Hide alternative code" : "Show alternative code"}
                              >
                                {showAltCode ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </button>

                              {/* Icon-Only Copy Button */}
                              <button
                                id="admin_copy_alt_code_btn"
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(altCode);
                                  setCopiedAltCode(true);
                                  setTimeout(() => setCopiedAltCode(false), 2000);
                                }}
                                className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                                  copiedAltCode
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                    : `${adminThemeClass.inputBg} ${adminThemeClass.textTitle} hover:${adminThemeClass.accentText}`
                                }`}
                                title={copiedAltCode ? "Code copied to clipboard!" : "Copy code"}
                                aria-label="Copy 6-character alternative code"
                              >
                                {copiedAltCode ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5 text-cyan-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Download Link */}
                      <a
                        href={qrDataUrl}
                        download={`clock_it_qr_${tenant.id}.png`}
                        className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer text-center flex items-center justify-center space-x-1.5 shadow-md"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download QR Image</span>
                      </a>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Close Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className={`w-full py-3 font-semibold text-xs rounded-2xl active:scale-95 transition-all cursor-pointer border ${adminThemeClass.inputBg} ${adminThemeClass.accentBorder} hover:opacity-90 min-h-[44px]`}
                >
                  Close Gateway View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- MODAL AREA: LEADERBOARD SUMMARY MODALS -------------------- */}
      <AnimatePresence>
        {selectedLeaderboardWorker &&
          (() => {
            const metrics = getPersonalWorkerMetrics(
              selectedLeaderboardWorker,
              modalTimeframe,
            );
            return (
              <div
                className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4"
                onClick={() => setSelectedLeaderboardWorker(null)}
              >
                <div
                  className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border max-h-[90vh] flex flex-col overflow-y-auto overflow-x-auto scrollbar-none transform transition-all ${adminThemeClass.cardBg} ${adminThemeClass.textTitle} ${adminThemeClass.accentBorder}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    {/* Header */}
                    <div
                      className={`flex items-center justify-between border-b pb-4 mb-4 ${adminThemeClass.accentBorder}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-2.5 rounded-2xl ${adminThemeClass.buttonSelected}`}
                        >
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-[#00bcd4] block">
                            Worker Performance Card
                          </span>
                          <h3
                            className={`font-display font-bold text-base ${adminThemeClass.textTitle}`}
                          >
                            {selectedLeaderboardWorker.firstName}{" "}
                            {selectedLeaderboardWorker.lastName}
                          </h3>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedLeaderboardWorker(null)}
                        className={`font-bold text-xl cursor-pointer ${adminThemeClass.textMuted} hover:${adminThemeClass.textHighlight}`}
                      >
                        &times;
                      </button>
                    </div>

                    {/* Profile Box */}
                    <div
                      className={`flex items-center space-x-4 p-4 rounded-2xl border mb-5 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                    >
                      <img
                        src={
                          selectedLeaderboardWorker.profilePhoto?.medium ||
                          selectedLeaderboardWorker.profilePhoto?.small ||
                          IMAGES.defaultWorkerAvatar
                        }
                        alt="Worker Profile Photo"
                        onClick={() => setExpandedPhotoUrl(
                          selectedLeaderboardWorker.profilePhoto?.medium ||
                          selectedLeaderboardWorker.profilePhoto?.small ||
                          IMAGES.defaultWorkerAvatar
                        )}
                        className={`h-14 w-14 rounded-2xl object-cover border cursor-zoom-in hover:scale-105 transition-transform ${adminThemeClass.accentBorder}`}
                        title="Click to view full picture"
                      />
                      <div>
                        <span className="text-[9px] uppercase font-mono font-bold text-cyan-450 block">
                          Active Worker Profile
                        </span>
                        <h4
                          className={`font-bold text-sm ${adminThemeClass.textTitle}`}
                        >
                          {selectedLeaderboardWorker.firstName}{" "}
                          {selectedLeaderboardWorker.lastName}
                        </h4>
                        <p
                          className={`text-[11px] ${adminThemeClass.textMuted}`}
                        >
                          {selectedLeaderboardWorker.email} &bull;{" "}
                          {selectedLeaderboardWorker.phone ? formatPhoneNumber(selectedLeaderboardWorker.phone) : "No phone linked"}
                        </p>
                        <p
                          className={`text-[11px] font-semibold mt-0.5 ${adminThemeClass.accentText}`}
                        >
                          {selectedLeaderboardWorker.deptLabel}
                        </p>
                      </div>
                    </div>

                    {/* Query Timeframe Tabs inside Modal */}
                    <div className="mb-5">
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider block mb-2 font-mono ${adminThemeClass.textMuted}`}
                      >
                        Timeframe Filter Query
                      </span>
                      <div
                        className={`flex rounded-xl p-0.5 shadow-inner border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                      >
                        {(
                          ["daily", "weekly", "monthly", "yearly"] as const
                        ).map((tf) => (
                          <button
                            key={tf}
                            type="button"
                            onClick={() => setModalTimeframe(tf)}
                            className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-lg cursor-pointer transition-all ${
                              modalTimeframe === tf
                                ? `${adminThemeClass.buttonSelected} shadow-sm`
                                : `${adminThemeClass.textMuted} hover:${adminThemeClass.textHighlight}`
                            }`}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Recalculated Stats List */}
                    <div className="space-y-3 mb-2 overflow-y-auto scrollbar-none">
                      <div
                        className={`flex justify-between items-center px-4 py-2.5 rounded-xl border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                      >
                        <span
                          className={`text-xs ${adminThemeClass.textMuted}`}
                        >
                          Total Expected Work Days
                        </span>
                        <span className="font-mono font-bold text-xs">
                          {metrics.expectedDays} Days
                        </span>
                      </div>
                      <div
                        className={`flex justify-between items-center px-4 py-2.5 rounded-xl border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                      >
                        <span
                          className={`text-xs ${adminThemeClass.textMuted}`}
                        >
                          Present Days
                        </span>
                        <span className="font-mono font-bold text-xs text-emerald-500">
                          {metrics.attendedDays} Days
                        </span>
                      </div>
                      <div
                        className={`flex justify-between items-center px-4 py-2.5 rounded-xl border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                      >
                        <span
                          className={`text-xs ${adminThemeClass.textMuted}`}
                        >
                          Lateness Flags (Late arrivals)
                        </span>
                        <span className="font-mono font-bold text-xs text-amber-500">
                          {metrics.lateCount} Late
                        </span>
                      </div>
                      <div
                        className={`flex justify-between items-center px-4 py-2.5 rounded-xl border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                      >
                        <span
                          className={`text-xs ${adminThemeClass.textMuted}`}
                        >
                          On-Time Flags
                        </span>
                        <span className="font-mono font-bold text-xs text-emerald-400">
                          {metrics.onTimeCount} Days
                        </span>
                      </div>
                      <div
                        className={`flex justify-between items-center px-4 py-2.5 rounded-xl border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                      >
                        <span
                          className={`text-xs ${adminThemeClass.textMuted}`}
                        >
                          Absent Flags (Workdays missed/ongoing)
                        </span>
                        <span className="font-mono font-bold text-xs text-red-500">
                          {metrics.absentDays} Absent
                        </span>
                      </div>
                      <div
                        className={`flex justify-between items-center px-4 py-2.5 rounded-xl border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                      >
                        <span
                          className={`text-xs ${adminThemeClass.textMuted}`}
                        >
                          Approved Permission Days
                        </span>
                        <span
                          className={`font-mono font-bold text-xs ${adminThemeClass.accentText}`}
                        >
                          {metrics.approvedPermissionDays} Days
                        </span>
                      </div>

                      {/* Attendance Performance Rate Radial/Indicator */}
                      <div
                        className={`pt-4 border-t flex items-center justify-between ${adminThemeClass.accentBorder}`}
                      >
                        <span
                          className={`text-xs font-bold ${adminThemeClass.textTitle}`}
                        >
                          Performance Index
                        </span>
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-24 border rounded-full h-2.5 overflow-hidden ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                          >
                            <div
                              style={{ width: `${metrics.performancePercentage}%` }}
                              className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2.5 rounded-full"
                            ></div>
                          </div>
                          <span
                            className={`font-black text-sm ${adminThemeClass.accentText}`}
                          >
                            {metrics.performancePercentage.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => setSelectedLeaderboardWorker(null)}
                      className={`w-full py-3 text-xs font-bold rounded-xl transition-all cursor-pointer border ${adminThemeClass.inputBg}`}
                    >
                      Dismiss Overview
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

        {selectedLeaderboardDept &&
          (() => {
            const d = selectedLeaderboardDept;
            const unitWorkers = workers.filter((w) => w.department_id === d.id);
            const sum = unitWorkers.reduce((acc, curr) => {
              return (
                acc + calculateMetricsForTimeframe(curr.id, modalTimeframe).perf
              );
            }, 0);
            const avg =
              unitWorkers.length === 0
                ? 0
                : Number((sum / unitWorkers.length).toFixed(2));
            const workersList = unitWorkers
              .map((w) => ({
                ...w,
                perf: calculateMetricsForTimeframe(w.id, modalTimeframe).perf,
              }))
              .sort((a, b) => b.perf - a.perf);

            return (
              <div
                className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4"
                onClick={() => setSelectedLeaderboardDept(null)}
              >
                <div
                  className="bg-white dark:bg-[#0D0D0D] text-gray-950 dark:text-[#E5E5E5] w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-[#262626] max-h-[90vh] flex flex-col overflow-y-auto overflow-x-auto scrollbar-none transform transition-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-150 dark:border-[#262626] pb-4 mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-[#1a2d20] text-emerald-600 dark:text-emerald-400">
                          <Briefcase className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-[#10b981] block">
                            Department Unit Performance
                          </span>
                          <h3 className="font-display font-bold text-base text-gray-950 dark:text-white">
                            {d.name}
                          </h3>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedLeaderboardDept(null)}
                        className="text-gray-400 hover:text-black dark:hover:text-white font-bold text-xl cursor-pointer"
                      >
                        &times;
                      </button>
                    </div>

                    {/* Stats Header banner */}
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-[#111111] p-4 rounded-2xl border border-gray-150 dark:border-[#262626] mb-5">
                      <div>
                        <span className="text-[8px] uppercase tracking-widest text-emerald-500 block font-semibold">
                          Active Manpower
                        </span>
                        <span className="font-mono text-xl font-extrabold text-neutral-800 dark:text-white">
                          {unitWorkers.length} Employees
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] uppercase tracking-widest text-emerald-500 block font-semibold">
                          Average Attendance Rate
                        </span>
                        <span className="font-mono text-xl font-extrabold text-emerald-550 dark:text-emerald-400">
                          {avg}%
                        </span>
                      </div>
                    </div>

                    {/* Query Timeframe Tabs inside Modal */}
                    <div className="mb-5">
                      <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-neutral-450 tracking-wider block mb-2 font-mono">
                        Timeframe Filter Query
                      </span>
                      <div className="flex bg-gray-105 dark:bg-[#111111] border border-gray-200 dark:border-[#262626] rounded-xl p-0.5 shadow-inner">
                        {(
                          ["daily", "weekly", "monthly", "yearly"] as const
                        ).map((tf) => (
                          <button
                            key={tf}
                            type="button"
                            onClick={() => setModalTimeframe(tf)}
                            className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-lg cursor-pointer transition-all ${
                              modalTimeframe === tf
                                ? "bg-[#1f1f1f] text-[#10b981] border border-white/5 shadow-md font-bold dark:bg-neutral-800"
                                : "text-slate-500 dark:text-[#888888] hover:text-slate-850 dark:hover:text-white"
                            }`}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* List of workers in Department - no scrollbar is seen */}
                    <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-none pr-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1 font-mono">
                        Active Group roster
                      </span>
                      {workersList.length === 0 ? (
                        <p className="text-[11px] text-gray-500 italic pb-2 text-center">
                          No workers registered under this department yet.
                        </p>
                      ) : (
                        workersList.map((tm: any, i: number) => (
                          <div
                            key={tm.id}
                            className="flex justify-between items-center bg-gray-50 dark:bg-[#111111]/40 px-3.5 py-2.5 rounded-xl border border-gray-150 dark:border-[#262626]/20"
                          >
                            <div className="flex items-center space-x-2">
                              <img
                                src={
                                  tm.profilePhoto?.medium ||
                                  tm.profilePhoto?.small ||
                                  IMAGES.defaultWorkerAvatar
                                }
                                alt=""
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedPhotoUrl(
                                    tm.profilePhoto?.medium ||
                                    tm.profilePhoto?.small ||
                                    IMAGES.defaultWorkerAvatar
                                  );
                                }}
                                className="h-6 w-6 rounded-md object-cover cursor-zoom-in hover:scale-125 transition-transform"
                                title="Click to expand profile picture"
                              />
                              <span className="text-xs font-semibold">
                                {tm.firstName} {tm.lastName}
                              </span>
                            </div>
                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {tm.perf}%
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => setSelectedLeaderboardDept(null)}
                      className="w-full py-3 bg-gray-105 dark:bg-[#1b1b1b] hover:bg-gray-200 dark:hover:bg-[#252525] text-gray-800 dark:text-neutral-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Dismiss Overview
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
      </AnimatePresence>

      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-neutral-50 dark:bg-[#0A0A0A] z-50 overflow-y-auto p-6 space-y-8 select-none"
          >
            {/* Shimmering Navigation Bar */}
            <div className="flex items-center justify-between border-b pb-4 border-neutral-200/50 dark:border-neutral-800/40">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                  <div className="h-2.5 w-20 bg-neutral-200/65 dark:bg-neutral-800/60 rounded-md animate-pulse" />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
                <div className="h-10 w-10 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
              </div>
            </div>

            {/* Shimmering Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-6 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/40 bg-white dark:bg-neutral-900 shadow-sm space-y-3">
                  <div className="h-3.5 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                  <div className="h-8 w-1/3 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                </div>
              ))}
            </div>

            {/* Shimmering Navigation Tabs Row */}
            <div className="h-12 w-full bg-neutral-200/70 dark:bg-neutral-900 rounded-2xl border border-neutral-200/50 dark:border-neutral-800/40 animate-pulse" />

            {/* Shimmering Primary Section (Graph + Detail) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Shimmering Large Chart Card */}
              <div className="lg:col-span-2 p-6 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/40 bg-white dark:bg-neutral-900 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                  <div className="flex space-x-2">
                    <div className="h-8 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
                    <div className="h-8 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
                  </div>
                </div>
                {/* Visualizing Mock Shimmering Bar Chart Bars */}
                <div className="h-64 flex items-end justify-between px-4 pt-10 border-b border-neutral-200/40 dark:border-neutral-800/30">
                  {[40, 70, 45, 90, 60, 85, 50, 75, 30, 95, 65, 80].map((h, idx) => (
                    <div
                      key={idx}
                      className="w-5 bg-neutral-200 dark:bg-neutral-800 rounded-t-md animate-pulse"
                      style={{ height: `${h}%`, animationDelay: `${idx * 100}ms` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between px-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-3 w-10 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Shimmering Side Panel Cards */}
              <div className="space-y-6">
                <div className="p-6 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/40 bg-white dark:bg-neutral-900 shadow-sm space-y-4">
                  <div className="h-4 w-1/3 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                  <div className="space-y-3">
                    {[1, 2, 3].map((row) => (
                      <div key={row} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 w-2/3">
                          <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                          <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                        </div>
                        <div className="h-3 w-10 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/40 bg-white dark:bg-neutral-900 shadow-sm space-y-4">
                  <div className="h-4 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                  <div className="h-28 bg-neutral-200/60 dark:bg-neutral-800/60 rounded-2xl animate-pulse" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </ AnimatePresence>

      {/* DEPARTMENT CRUD CONFIRMATION MODAL (THEME COLOR SYNCED) */}
      <AnimatePresence>
        {deptConfirmModal && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm select-none font-sans" onClick={() => setDeptConfirmModal(null)}>
            <div className={`w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto overflow-x-auto ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center space-x-3">
                <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                  <Building className={`h-5 w-5 ${adminThemeClass.accentText}`} />
                </div>
                <div>
                  <h4 className={`text-sm font-bold uppercase tracking-wider ${adminThemeClass.accentText}`}>
                    {deptConfirmModal.title}
                  </h4>
                </div>
              </div>

              <p className={`text-xs ${adminThemeClass.textMuted} leading-relaxed`}>
                {deptConfirmModal.message}
              </p>

              <div className="flex space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeptConfirmModal(null)}
                  className="flex-1 py-2.5 bg-neutral-800 text-white hover:bg-neutral-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={deptConfirmModal.onConfirm}
                  className="flex-1 py-2.5 bg-indigo-600 dark:bg-cyan-600 hover:opacity-90 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* DOUBLE CONFIRMATION SECURITY OVERLAY */}
      <AnimatePresence>
        {doubleConfirmState && (
          <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm select-none font-sans" onClick={() => setDoubleConfirmState(null)}>
            <div className={`w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto overflow-x-auto ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center space-x-3 text-amber-500">
                <AlertTriangle className="h-6 w-6 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500">
                  {doubleConfirmState.step === 1 ? "Step 1/2: Verification Required" : "Step 2/2: Critical Authorization"}
                </h4>
              </div>

              <div className="space-y-2">
                <h3 className={`font-bold text-sm ${adminThemeClass.textTitle}`}>
                  {doubleConfirmState.title}
                </h3>
                <p className={`text-xs ${adminThemeClass.textMuted} leading-relaxed`}>
                  {doubleConfirmState.message}
                </p>
              </div>

              {doubleConfirmState.step === 2 && (
                <div className="space-y-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <label className="block text-[9px] font-bold uppercase text-amber-400 text-center">
                    Type "CONFIRM" below to authorize
                  </label>
                  <input
                    type="text"
                    id="double_confirm_input"
                    placeholder="CONFIRM"
                    className={`w-full border rounded-xl p-3 text-xs font-mono font-bold tracking-widest text-center ${adminThemeClass.inputBg} border-amber-500/35 focus:border-amber-400 focus:ring-0`}
                    autoFocus
                  />
                </div>
              )}

              <div className="flex space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDoubleConfirmState(null)}
                  className="flex-1 py-2.5 bg-neutral-800 text-white hover:bg-neutral-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (doubleConfirmState.step === 1) {
                      setDoubleConfirmState({
                        ...doubleConfirmState,
                        step: 2,
                        message: "CRITICAL CONFIRMATION: Are you absolutely certain? This operation will directly affect active corporate logs and directories in real-time."
                      });
                    } else {
                      const inputEl = document.getElementById("double_confirm_input") as HTMLInputElement;
                      if (!inputEl || inputEl.value.trim().toUpperCase() !== "CONFIRM") {
                        onNotifyAdmin("Auth Error", "Please type 'CONFIRM' exactly to authorize this operation.");
                        return;
                      }
                      doubleConfirmState.onConfirm();
                      setDoubleConfirmState(null);
                    }
                  }}
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  {doubleConfirmState.step === 1 ? "Proceed to Step 2" : "Confirm Action"}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* REGISTER / EDIT WORKER DETAILS DIALOG */}
      <AnimatePresence>
        {(showAddWorkerModal || showEditWorkerModal) && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[9998] backdrop-blur-sm select-none font-sans" onClick={() => { setShowAddWorkerModal(false); setShowEditWorkerModal(null); }}>
            <div className={`w-full max-w-lg rounded-3xl border p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto overflow-x-auto ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`} onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center pb-2 border-b border-neutral-200/40 dark:border-neutral-800/40">
                <h3 className={`font-bold text-base ${adminThemeClass.textTitle}`}>
                  {showAddWorkerModal ? "Register New Employee" : "Modify Employee Profile"}
                </h3>
                <button
                  onClick={() => {
                    setShowAddWorkerModal(false);
                    setShowEditWorkerModal(null);
                  }}
                  className="p-1 hover:bg-neutral-800/40 rounded-full transition-colors text-neutral-400 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  
                  // Validation
                  if (!workerFormFirstName.trim() || !workerFormLastName.trim() || !workerFormEmail.trim()) {
                    onNotifyAdmin("Validation Error", "First Name, Last Name, and Email are required.");
                    return;
                  }

                  const isAdd = showAddWorkerModal ? true : false;
                  const targetWorkerId = showEditWorkerModal?.id;

                  setDoubleConfirmState({
                    step: 1,
                    title: isAdd ? "Confirm Worker Registration" : "Confirm Profile Modification",
                    message: isAdd 
                      ? `You are about to register ${workerFormFirstName} ${workerFormLastName} as a new active team member.`
                      : `You are about to update the profile details for ${workerFormFirstName} ${workerFormLastName}.`,
                    actionType: isAdd ? "add" : "update",
                    payload: null,
                    onConfirm: async () => {
                      try {
                        const url = isAdd ? "/api/tenant/workers/add" : "/api/tenant/workers/update";
                        const response = await fetch(url, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            tenant_id: tenant.id,
                            worker_id: targetWorkerId,
                            firstName: workerFormFirstName,
                            lastName: workerFormLastName,
                            email: workerFormEmail,
                            phone: workerFormPhone,
                            role: workerFormRole,
                            department_id: workerFormDeptId === "unassigned" ? "" : workerFormDeptId,
                            gender: workerFormGender
                          })
                        });

                        if (response.ok) {
                          onNotifyAdmin("Operation Succeeded", `Successfully ${isAdd ? "registered" : "updated"} ${workerFormFirstName} ${workerFormLastName}.`);
                          setShowAddWorkerModal(false);
                          setShowEditWorkerModal(null);
                          syncAdminResources();
                        } else {
                          const errData = await response.json();
                          onNotifyAdmin("Operation Failed", errData.error || "Action could not be authorized.");
                        }
                      } catch (err) {
                        onNotifyAdmin("Network Error", "Unable to communicate with the central authorization server.");
                      }
                    }
                  });
                }}
                className="space-y-4 text-xs"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col space-y-1">
                    <span className={`text-[10px] font-bold uppercase ${adminThemeClass.textMuted}`}>First Name</span>
                    <input
                      type="text"
                      value={workerFormFirstName}
                      onChange={(e) => setWorkerFormFirstName(e.target.value)}
                      className={`border rounded-xl p-3 text-xs font-semibold ${adminThemeClass.inputBg}`}
                      required
                    />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className={`text-[10px] font-bold uppercase ${adminThemeClass.textMuted}`}>Last Name</span>
                    <input
                      type="text"
                      value={workerFormLastName}
                      onChange={(e) => setWorkerFormLastName(e.target.value)}
                      className={`border rounded-xl p-3 text-xs font-semibold ${adminThemeClass.inputBg}`}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col space-y-1">
                    <span className={`text-[10px] font-bold uppercase ${adminThemeClass.textMuted}`}>Email Address</span>
                    <input
                      type="email"
                      value={workerFormEmail}
                      onChange={(e) => setWorkerFormEmail(e.target.value)}
                      className={`border rounded-xl p-3 text-xs font-semibold ${adminThemeClass.inputBg}`}
                      required
                    />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className={`text-[10px] font-bold uppercase ${adminThemeClass.textMuted}`}>Phone Number</span>
                    <input
                      type="tel"
                      value={workerFormPhone}
                      onChange={(e) => setWorkerFormPhone(e.target.value)}
                      className={`border rounded-xl p-3 text-xs font-semibold ${adminThemeClass.inputBg}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col space-y-1">
                    <span className={`text-[10px] font-bold uppercase ${adminThemeClass.textMuted}`}>Assigned Role</span>
                    <CustomSelect
                      value={workerFormRole}
                      onChange={(val) => setWorkerFormRole(val as UserRole)}
                      options={[
                        { value: UserRole.TEAM_MEMBER, label: "Team Member" },
                        { value: UserRole.TEAM_LEAD, label: "Team Lead (Department Lead)" },
                        { value: UserRole.COMPANY_ADMIN, label: "Company Admin" }
                      ]}
                      theme={theme === "light" ? "light" : theme === "army" ? "army" : theme === "navy" ? "navy" : "dark"}
                      className={`rounded-2xl p-3 font-bold text-xs transition-all outline-none focus:border-cyan-500 hover:opacity-95 ${adminThemeClass.inputBg} ${adminThemeClass.accentBorder}`}
                    />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className={`text-[10px] font-bold uppercase ${adminThemeClass.textMuted}`}>Gender Reference</span>
                    <CustomSelect
                      value={workerFormGender}
                      onChange={(val) => setWorkerFormGender(val)}
                      options={[
                        { value: "Not Specified", label: "Not Specified" },
                        { value: "Male", label: "Male" },
                        { value: "Female", label: "Female" }
                      ]}
                      theme={theme === "light" ? "light" : theme === "army" ? "army" : theme === "navy" ? "navy" : "dark"}
                      className={`rounded-2xl p-3 font-bold text-xs transition-all outline-none focus:border-cyan-500 hover:opacity-95 ${adminThemeClass.inputBg} ${adminThemeClass.accentBorder}`}
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-1">
                  <span className={`text-[10px] font-bold uppercase ${adminThemeClass.textMuted}`}>Department Unit</span>
                  <CustomSelect
                    value={workerFormDeptId}
                    onChange={(val) => setWorkerFormDeptId(val)}
                    options={[
                      { value: "unassigned", label: "None (Unassigned)" },
                      ...departments.map((dp) => ({ value: dp.id, label: dp.name }))
                    ]}
                    theme={theme === "light" ? "light" : theme === "army" ? "army" : theme === "navy" ? "navy" : "dark"}
                    className={`rounded-2xl p-3 font-bold text-xs transition-all outline-none focus:border-cyan-500 hover:opacity-95 ${adminThemeClass.inputBg} ${adminThemeClass.accentBorder}`}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddWorkerModal(false);
                      setShowEditWorkerModal(null);
                    }}
                    className="px-4 py-2 bg-neutral-800 text-white hover:bg-neutral-700 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
                  >
                    Save Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MANAGE DEPARTMENTS DIALOG */}
      <AnimatePresence>
        {showManageDeptModal && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[9998] backdrop-blur-sm select-none font-sans"
            onClick={() => setShowManageDeptModal(false)}
          >
            <div
              className={`w-full max-w-2xl max-h-[90vh] rounded-3xl border flex flex-col shadow-2xl overflow-hidden ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`p-6 border-b flex justify-between items-center ${adminThemeClass.accentBorder} shrink-0`}>
                <h3 className={`font-bold text-base ${adminThemeClass.textTitle} flex items-center space-x-2`}>
                  <Building className="h-5 w-5 text-cyan-500" />
                  <span>Manage Departments</span>
                </h3>
                <button
                  onClick={() => setShowManageDeptModal(false)}
                  className="p-1 hover:bg-neutral-800/40 rounded-full transition-colors text-neutral-400 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto overflow-x-auto flex-1 space-y-6">
                {/* Create Section */}
                <div className={`p-4 rounded-2xl border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder} space-y-3`}>
                  <h4 className={`text-xs font-bold uppercase ${adminThemeClass.textTitle}`}>Create New Department</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Sales Division"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      className={`flex-1 border rounded-xl px-4 text-xs font-semibold min-h-[44px] ${adminThemeClass.inputBg}`}
                    />
                    <button
                      onClick={() => {
                        if (!newDeptName.trim()) return;
                        setDeptConfirmModal({
                          type: "create",
                          title: "Confirm Department Creation",
                          message: `Are you sure you want to register "${newDeptName}" as an active department unit?`,
                          onConfirm: () => {
                            handleAddDept();
                            setDeptConfirmModal(null);
                          }
                        });
                      }}
                      className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs min-h-[44px] cursor-pointer shadow-md shrink-0"
                    >
                      Create
                    </button>
                  </div>
                </div>

                {/* List & Select Lead Section */}
                <div className="space-y-3">
                  <h4 className={`text-xs font-bold uppercase ${adminThemeClass.textTitle}`}>Active Departments</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...departments]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((d, index) => {
                        const activeLeadUser = workers.find(
                          (w) => w.id === d.leadId,
                        );
                        const nonAdminsInDept = workers.filter(
                          (w) =>
                            w.department_id === d.id &&
                            w.role !== UserRole.COMPANY_ADMIN,
                        );
                        const isRenaming = renamingDeptId === d.id;
                        const isConfirmingDelete =
                          confirmDeleteDeptId === d.id;

                        return (
                          <div
                            key={index}
                            className={`p-4 rounded-2xl border space-y-3 text-xs flex flex-col justify-between ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                          >
                            <div className="space-y-2">
                              {isRenaming ? (
                                <div className="flex items-center gap-1.5 w-full">
                                  <input
                                    type="text"
                                    value={renamingDeptName}
                                    onChange={(e) =>
                                      setRenamingDeptName(
                                        e.target.value,
                                      )
                                    }
                                    className={`flex-1 border rounded-xl px-2.5 py-2 text-xs font-semibold outline-none focus:border-cyan-500 ${adminThemeClass.inputBg}`}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => {
                                      if (!renamingDeptName.trim()) return;
                                      setDeptConfirmModal({
                                        type: "rename",
                                        title: "Confirm Department Rename",
                                        message: `Are you sure you want to rename "${d.name}" to "${renamingDeptName}"?`,
                                        onConfirm: () => {
                                          handleRenameDept();
                                          setDeptConfirmModal(null);
                                        }
                                      });
                                    }}
                                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold cursor-pointer shadow-sm"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRenamingDeptId("");
                                      setRenamingDeptName("");
                                    }}
                                    className="px-3 py-2 bg-neutral-550/20 text-red-400 rounded-xl text-[10px] font-bold cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <strong
                                    className={`font-bold ${adminThemeClass.textTitle}`}
                                  >
                                    {d.name}
                                  </strong>
                                  <div className="flex space-x-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRenamingDeptId(d.id);
                                        setRenamingDeptName(d.name);
                                      }}
                                      className="text-indigo-600 dark:text-cyan-400 font-semibold hover:underline cursor-pointer"
                                    >
                                      Rename
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setConfirmDeleteDeptId(d.id);
                                      }}
                                      className="text-red-650 dark:text-red-400 font-semibold hover:underline cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              )}

                              {isConfirmingDelete && (
                                <div className="flex flex-col space-y-2 bg-red-500/10 dark:bg-red-955/20 p-2.5 rounded-xl border border-red-500/20 text-[11px] animate-none">
                                  <span className="text-red-700 dark:text-red-400 font-bold">
                                    Are you sure? Members will be unassigned.
                                  </span>
                                  <div className="flex space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDeptConfirmModal({
                                          type: "delete",
                                          title: "Confirm Department Deletion",
                                          message: `Are you sure you want to permanently delete "${d.name}"? This action cannot be undone.`,
                                          onConfirm: () => {
                                            handleDeleteDept();
                                            setDeptConfirmModal(null);
                                          }
                                        });
                                      }}
                                      className="px-2.5 py-1.5 bg-red-600 hover:bg-red-750 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                                    >
                                      Yes, Delete
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setConfirmDeleteDeptId("")
                                      }
                                      className="px-2.5 py-1.5 bg-[#25361E] border border-red-500/20 text-[#A1C094] rounded-lg text-[10px] font-bold cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Appoint Lead select box */}
                            <div
                              className={`flex flex-col space-y-1 p-3 mt-auto rounded-xl border ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
                            >
                              <span
                                className={`text-[10px] font-bold uppercase ${adminThemeClass.textMuted}`}
                              >
                                {translations.chooseLead}
                              </span>
                              <CustomSelect
                                value={d.leadId || ""}
                                onChange={(val) => {
                                  const selectedWorker = workers.find(w => w.id === val);
                                  const workerName = selectedWorker ? `${selectedWorker.firstName} ${selectedWorker.lastName}` : "No Active Lead appointed";
                                  setDoubleConfirmState({
                                    step: 1,
                                    title: "Confirm Lead Appointment",
                                    message: `Are you sure you want to appoint ${workerName} as the lead for "${d.name}"? This action will set them as the primary department authority.`,
                                    onConfirm: () => {
                                      handleAssignLead(d.id, val);
                                    }
                                  });
                                }}
                                className={`w-full border rounded-lg px-3.5 text-xs outline-none min-h-[44px] ${adminThemeClass.inputBg}`}
                                options={[
                                  {
                                    value: "",
                                    label: "No Active Lead appointed",
                                  },
                                  ...nonAdminsInDept.map(
                                    (workerObj) => ({
                                      value: workerObj.id,
                                      label: `${workerObj.firstName} ${workerObj.lastName}`,
                                    }),
                                  ),
                                ]}
                                theme={theme}
                              />
                              {activeLeadUser && (
                                <span className="text-[10px] text-indigo-705 dark:text-cyan-400 font-bold mt-1.5 block">
                                  Current Active:{" "}
                                  {activeLeadUser.firstName}{" "}
                                  {activeLeadUser.lastName} (
                                  {formatPhoneNumber(activeLeadUser.phone)})
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Assign Worker to Department Section */}
                <div className={`p-4 rounded-2xl border ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder} space-y-3`}>
                  <div className="flex items-center space-x-2 text-indigo-650 dark:text-cyan-455">
                    <Users className="h-4 w-4" />
                    <span className="font-bold text-xs uppercase tracking-wider">Assign Worker to Department</span>
                  </div>
                  <p className={`text-[10px] ${adminThemeClass.textMuted}`}>
                    Direct restructurings by moving selected personnel between active departments.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col space-y-1">
                      <span className={`text-[10px] font-semibold ${adminThemeClass.textMuted}`}>Select Employee</span>
                      <CustomSelect
                        id="assign_worker_select_modal"
                        value={assignWorkerId}
                        onChange={(val) => setAssignWorkerId(val)}
                        placeholder="Choose an employee..."
                        options={workers.map(w => ({
                          value: w.id,
                          label: `${w.firstName} ${w.lastName} (${departments.find(dp => dp.id === w.department_id)?.name || "Unassigned"})`
                        }))}
                        theme={theme === "light" ? "light" : theme === "army" ? "army" : theme === "navy" ? "navy" : "dark"}
                        className={`rounded-2xl p-3 font-bold text-xs transition-all outline-none focus:border-cyan-500 hover:opacity-95 ${adminThemeClass.inputBg} ${adminThemeClass.accentBorder}`}
                      />
                    </div>
                    <div className="flex flex-col space-y-1">
                      <span className={`text-[10px] font-semibold ${adminThemeClass.textMuted}`}>Select Department</span>
                      <CustomSelect
                        id="assign_dept_select_modal"
                        value={assignDeptId}
                        onChange={(val) => setAssignDeptId(val)}
                        placeholder="Choose department..."
                        options={[
                          { value: "unassigned", label: "None (Unassign)" },
                          ...departments.map(dp => ({ value: dp.id, label: dp.name }))
                        ]}
                        theme={theme === "light" ? "light" : theme === "army" ? "army" : theme === "navy" ? "navy" : "dark"}
                        className={`rounded-2xl p-3 font-bold text-xs transition-all outline-none focus:border-cyan-500 hover:opacity-95 ${adminThemeClass.inputBg} ${adminThemeClass.accentBorder}`}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!assignWorkerId || !assignDeptId) {
                        onNotifyAdmin("Selection Required", "Please choose both an employee and a department unit.");
                        return;
                      }
                      
                      const targetWorker = workers.find(w => w.id === assignWorkerId);
                      const targetDeptName = assignDeptId === "unassigned" ? "Unassigned" : (departments.find(dp => dp.id === assignDeptId)?.name || "");
                      const wName = targetWorker ? `${targetWorker.firstName} ${targetWorker.lastName}` : "Employee";
                      
                      setDoubleConfirmState({
                        step: 1,
                        title: "Confirm Department Assignment",
                        message: `Are you sure you want to assign ${wName} to the "${targetDeptName}" department?`,
                        onConfirm: async () => {
                          try {
                            const response = await fetch("/api/tenant/workers/assign-department", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                tenant_id: tenant.id,
                                worker_ids: [assignWorkerId],
                                department_id: assignDeptId === "unassigned" ? "" : assignDeptId
                              })
                            });
                            if (response.ok) {
                              onNotifyAdmin("Assignment Saved", `${wName} is now assigned to ${targetDeptName}.`);
                              setAssignWorkerId("");
                              setAssignDeptId("");
                              syncAdminResources();
                            } else {
                              onNotifyAdmin("Assignment Failed", "Unable to complete organizational shift.");
                            }
                          } catch (err) {
                            onNotifyAdmin("Network Error", "Unable to communicate with host.");
                          }
                        }
                      });
                    }}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer min-h-[44px]"
                  >
                    Apply Organizational Assignment
                  </button>
                </div>

                {/* Active Lead Histories Log Table */}
                <div
                  className={`p-4 rounded-2xl border space-y-2 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                >
                  <span
                    className={`text-[10px] font-bold uppercase block mb-1 ${adminThemeClass.textTitle}`}
                  >
                    {translations.leadHistory} (Persistent Index)
                  </span>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto">
                    {leadHistory.length === 0 ? (
                      <span
                        className={`text-[10px] block font-light ${adminThemeClass.textMuted}`}
                      >
                        No historical shifts recorded.
                      </span>
                    ) : (
                      leadHistory.map((lh, idxH) => {
                        const wObj = workers.find(
                          (w) => w.id === lh.worker_id,
                        );
                        const dObj = departments.find(
                          (d) => d.id === lh.department_id,
                        );
                        return (
                          <div
                            key={idxH}
                            className={`p-2.5 rounded-lg border text-[10px] flex justify-between items-center select-none font-mono ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
                          >
                            <div>
                              <strong
                                className={`font-semibold ${adminThemeClass.textTitle}`}
                              >
                                {wObj
                                  ? `${wObj.firstName} ${wObj.lastName}`
                                  : "Unknown staff"}
                              </strong>
                              <br />
                              <span
                                className={
                                  adminThemeClass.textMuted
                                }
                              >
                                {dObj?.name || "Deleted Unit"}
                              </span>
                              <span className="block text-[8px] text-cyan-500 mt-0.5">
                                Logged: {lh.timestamp ? new Date(lh.timestamp).toLocaleString() : new Date(lh.start_date).toLocaleString()}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-sm font-bold uppercase ${lh.active ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400" : "bg-[#25361E] text-neutral-500"}`}
                            >
                              {lh.active
                                ? translations.historyActive
                                : translations.historyNotActive}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className={`p-6 border-t flex justify-end shrink-0 ${adminThemeClass.accentBorder}`}>
                <button
                  type="button"
                  onClick={() => setShowManageDeptModal(false)}
                  className="px-6 py-2.5 bg-neutral-800 text-white hover:bg-neutral-700 font-bold rounded-xl text-xs cursor-pointer shadow-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL SCREEN / LARGE PROFILE PICTURE PREVIEW MODAL */}
      <AnimatePresence>
        {expandedPhotoUrl && (
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[10000] flex flex-col items-center justify-center p-4 cursor-pointer select-none"
            onClick={() => setExpandedPhotoUrl(null)}
          >
            {/* Close Button at top-right */}
            <button
              onClick={() => setExpandedPhotoUrl(null)}
              className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer z-[10001] shadow-lg"
              title="Close Full Screen"
            >
              <X className="h-6 w-6" />
            </button>
            <motion.div
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.1 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-3xl max-h-[88vh] p-2 bg-neutral-900/90 rounded-[2.5rem] shadow-2xl border border-white/20 flex flex-col items-center justify-center overflow-hidden"
            >
              <img
                src={expandedPhotoUrl}
                alt=""
                className="max-h-[82vh] w-auto max-w-full object-contain rounded-[2rem] border border-white/10 shadow-2xl"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CARD PAYMENT GATEWAY MODAL */}
      <AnimatePresence>
        {showCardModal && (() => {
          // Detect Card Type (Mastercard, Visa, Verve)
          const cleanDigits = cardNumber.replace(/\D/g, "");
          const getCardBrand = (digits: string): { name: "Mastercard" | "Visa" | "Verve" | "Unknown"; label: string; color: string } => {
            if (/^4/.test(digits)) {
              return { name: "Visa", label: "VISA", color: "text-blue-400" };
            }
            if (/^(5[1-5]|2[2-7])/.test(digits)) {
              return { name: "Mastercard", label: "MASTERCARD", color: "text-orange-400" };
            }
            if (/^(506|507|650|504)/.test(digits)) {
              return { name: "Verve", label: "VERVE", color: "text-emerald-400" };
            }
            return { name: "Unknown", label: "CARD", color: "text-neutral-400" };
          };

          const cardBrand = getCardBrand(cleanDigits);

          return (
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className={`w-full max-w-lg my-auto max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
              >
                {/* Header */}
                <div className={`p-6 border-b flex items-center justify-between shrink-0 ${adminThemeClass.accentBorder}`}>
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className={`font-bold text-base ${adminThemeClass.textTitle}`}>
                        Card Payment Gateway
                      </h3>
                      <p className={`text-xs ${adminThemeClass.textMuted}`}>
                        Secure 256-bit encrypted checkout authorization
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCardModal(false)}
                    className={`p-2 rounded-xl text-neutral-400 hover:${adminThemeClass.textTitle} hover:bg-neutral-800/30 transition-colors`}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Body - Scrollable */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1 scrollbar-thin">
                  {/* Virtual Card Preview */}
                  <div className="p-5 rounded-2xl bg-gradient-to-tr from-slate-900 via-cyan-950 to-blue-900 border border-cyan-500/30 shadow-xl text-white space-y-4 relative overflow-hidden">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
                        Corporate Debit Card
                      </span>
                      {/* Card Type Brand Indicator */}
                      <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 backdrop-blur-md">
                        {cardBrand.name === "Mastercard" && (
                          <div className="flex items-center -space-x-1.5">
                            <span className="w-3.5 h-3.5 rounded-full bg-red-500 inline-block shadow-sm" />
                            <span className="w-3.5 h-3.5 rounded-full bg-amber-500 inline-block opacity-90 shadow-sm" />
                          </div>
                        )}
                        {cardBrand.name === "Visa" && (
                          <span className="text-xs font-black italic tracking-wider text-blue-300">
                            VISA
                          </span>
                        )}
                        {cardBrand.name === "Verve" && (
                          <div className="flex items-center space-x-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                            <span className="text-[10px] font-black tracking-wider text-emerald-300">
                              VERVE
                            </span>
                          </div>
                        )}
                        {cardBrand.name === "Unknown" && (
                          <span className="text-xs font-bold italic tracking-wider text-white/70">
                            SECURE PAY
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="py-2">
                      <div className="text-lg sm:text-xl font-mono tracking-widest font-bold text-slate-100">
                        {cardNumber || "Card Number"}
                      </div>
                    </div>
                    <div className="flex justify-between items-end text-xs font-mono">
                      <div>
                        <span className="text-[9px] text-neutral-400 block uppercase">Cardholder</span>
                        <span className="font-semibold uppercase tracking-wide">
                          {cardHolderName || "COMPANY REPRESENTATIVE"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-neutral-400 block uppercase">Expires</span>
                        <span className="font-semibold">
                          {cardExpiry || "MM/YY"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {cardError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{cardError}</span>
                    </div>
                  )}

                  {/* Form Fields */}
                  <div className="space-y-4 text-xs">
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${adminThemeClass.textTitle}`}>
                        Cardholder Name
                      </label>
                      <input
                        id="card_holder_name_input"
                        type="text"
                        placeholder="e.g. John Doe"
                        value={cardHolderName}
                        onChange={(e) => {
                          setCardHolderName(e.target.value);
                          setCardError(null);
                        }}
                        className={`w-full px-4 py-3 rounded-xl border outline-none font-medium ${adminThemeClass.inputBg}`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={`block text-[11px] font-semibold ${adminThemeClass.textTitle}`}>
                          Card Number
                        </label>
                        {/* Identified card brand display above the field only */}
                        {cardBrand.name !== "Unknown" && (
                          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-lg bg-neutral-900/60 border border-neutral-700/60 shadow-xs">
                            {cardBrand.name === "Mastercard" && (
                              <div className="flex items-center -space-x-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-xs" />
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block opacity-90 shadow-xs" />
                              </div>
                            )}
                            {cardBrand.name === "Visa" && (
                              <span className="text-[10px] font-black italic tracking-wider text-blue-400">
                                VISA
                              </span>
                            )}
                            {cardBrand.name === "Verve" && (
                              <div className="flex items-center space-x-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                              </div>
                            )}
                            <span className={`text-[10px] font-mono font-bold tracking-wider ${
                              cardBrand.name === "Mastercard" ? "text-orange-400" :
                              cardBrand.name === "Visa" ? "text-blue-400" :
                              cardBrand.name === "Verve" ? "text-emerald-400" :
                              "text-neutral-400"
                            }`}>
                              {cardBrand.name}
                            </span>
                          </div>
                        )}
                      </div>

                      <input
                        id="card_number_input"
                        type="text"
                        maxLength={19}
                        placeholder="Card Number"
                        value={cardNumber}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
                          const formatted = raw.match(/.{1,4}/g)?.join(" ") || raw;
                          setCardNumber(formatted);
                          setCardError(null);
                        }}
                        className={`w-full px-4 py-3 rounded-xl border outline-none font-mono font-medium ${adminThemeClass.inputBg}`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-[11px] font-semibold mb-1 ${adminThemeClass.textTitle}`}>
                          Expiry Date (MM/YY)
                        </label>
                        <input
                          id="card_expiry_input"
                          type="text"
                          maxLength={5}
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => {
                            let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
                            if (raw.length >= 3) {
                              raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
                            }
                            setCardExpiry(raw);
                            setCardError(null);
                          }}
                          className={`w-full px-4 py-3 rounded-xl border outline-none font-mono font-medium ${adminThemeClass.inputBg}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[11px] font-semibold mb-1 ${adminThemeClass.textTitle}`}>
                          CVV / Security Code
                        </label>
                        <input
                          id="card_cvv_input"
                          type="password"
                          maxLength={4}
                          placeholder="123"
                          value={cardCvv}
                          onChange={(e) => {
                            setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4));
                            setCardError(null);
                          }}
                          className={`w-full px-4 py-3 rounded-xl border outline-none font-mono font-medium ${adminThemeClass.inputBg}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className={`p-6 border-t flex items-center justify-between gap-3 shrink-0 ${adminThemeClass.accentBorder}`}>
                  <button
                    type="button"
                    onClick={() => setShowCardModal(false)}
                    className={`px-5 py-2.5 rounded-xl border font-bold text-xs cursor-pointer ${adminThemeClass.innerBg} ${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle}`}
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm_card_payment_btn"
                    type="button"
                    disabled={isProcessingCard}
                    onClick={() => {
                      const cleanNum = cardNumber.replace(/\s/g, "");
                      if (!cardHolderName.trim()) {
                        setCardError("Please provide the cardholder name.");
                        return;
                      }
                      if (cleanNum.length < 15) {
                        setCardError("Please enter a valid 16-digit card number.");
                        return;
                      }
                      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
                        setCardError("Please enter a valid MM/YY expiry date.");
                        return;
                      }
                      if (cardCvv.length < 3) {
                        setCardError("Please enter a 3-digit CVV security code.");
                        return;
                      }

                      setIsProcessingCard(true);
                      setTimeout(() => {
                        setIsProcessingCard(false);
                        setShowCardModal(false);
                        handleBillingRenewalSubmit();
                      }, 800);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-cyan-950/45 cursor-pointer disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isProcessingCard ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Authorizing Card...</span>
                      </>
                    ) : (
                      <span>Authorize & Activate Subscription</span>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Floating Application Central Announcement Button (Bottom Right - Icon only) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          id="admin_floating_announcement_btn"
          type="button"
          onClick={() => setIsAnnouncementModalOpen(true)}
          className="h-13 w-13 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-2xl shadow-cyan-950/60 hover:shadow-cyan-500/40 active:scale-95 transition-all cursor-pointer flex items-center justify-center border border-cyan-400/40"
          title="Application Central Announcement"
          aria-label="Application Central Announcement"
        >
          <Megaphone className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>

      {/* Application Central Announcement Modal */}
      <ApplicationCentralAnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        tenantId={tenant.id}
        adminThemeClass={adminThemeClass}
        isDarkMode={isDark}
        theme={theme}
        translations={translations}
      />

      {/* At-a-Glance Attendance Overlay (Persistent Floating Panel) */}
      <AtAGlanceAttendanceOverlay
        isOpen={isAtAGlanceOpen}
        onClose={() => setIsAtAGlanceOpen(false)}
        workers={workers}
        departments={departments}
        attendanceRecords={attendanceRecords}
        permissions={permissions}
        settings={settings}
        translations={translations}
        adminThemeClass={adminThemeClass}
        isDarkMode={isDark}
        theme={theme}
      />
    </div>
  );
}
