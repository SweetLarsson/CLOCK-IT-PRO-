import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Eye,
  X,
  Minus,
  Maximize2,
  GripHorizontal,
  Search,
  Users,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  ChevronDown,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  Sliders,
  Calendar,
  RotateCcw,
} from "lucide-react";
import CustomDatePicker from "./CustomDatePicker";
import CustomSortDropdown from "./CustomSortDropdown";

interface AtAGlanceAttendanceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  workers: any[];
  departments?: any[];
  attendanceRecords: any[];
  permissions: any[];
  settings?: any;
  translations?: any;
  adminThemeClass: any;
  isDarkMode: boolean;
  theme?: "army" | "navy" | "dark" | "light" | string;
}

export type AttendanceFilterType = "ALL" | "ON_TIME" | "LATE" | "ON_PERMISSION" | "NOT_IN_ATTENDANCE";
export type AttendanceSortField = "name" | "department" | "status";

function getLocalDateString(dateInput?: Date): string {
  const d = dateInput || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const AtAGlanceAttendanceOverlay: React.FC<AtAGlanceAttendanceOverlayProps> = ({
  isOpen,
  onClose,
  workers = [],
  departments = [],
  attendanceRecords = [],
  permissions = [],
  settings,
  translations,
  adminThemeClass,
  isDarkMode = true,
  theme = "dark",
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [containerOpacity, setContainerOpacity] = useState<number>(1);
  const [isAutoScrollActive, setIsAutoScrollActive] = useState<boolean>(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("clockit_overlay_scroll_speed");
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0.2 && parsed <= 5.0) {
          return parsed;
        }
      }
    } catch {}
    return 1.0;
  });
  const [isUserHovered, setIsUserHovered] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<AttendanceFilterType>("ALL");

  // Today reference string
  const todayStr = useMemo(() => getLocalDateString(new Date()), []);

  // Date query states: Entry Query Date (Start) and Return Entry Query Date (End)
  const [entryQueryDate, setEntryQueryDate] = useState<string>(todayStr);
  const [returnEntryQueryDate, setReturnEntryQueryDate] = useState<string>(todayStr);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const isResettingRef = useRef<boolean>(false);
  const autoScrollSpeedRef = useRef<number>(autoScrollSpeed);

  useEffect(() => {
    autoScrollSpeedRef.current = autoScrollSpeed;
  }, [autoScrollSpeed]);

  useEffect(() => {
    if (!isAutoScrollActive) return;

    const container = tableContainerRef.current;
    if (!container) return;

    let animationFrameId: number;
    let resetTimeout: NodeJS.Timeout | null = null;
    let lastTimestamp: number | null = null;

    const scrollStep = (timestamp: number) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }
      const elapsedSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
      lastTimestamp = timestamp;

      if (container && !isUserHovered && !isResettingRef.current) {
        const isAtBottom =
          container.scrollTop + container.clientHeight >= container.scrollHeight - 3;
        if (isAtBottom) {
          isResettingRef.current = true;
          container.scrollTo({ top: 0, behavior: "smooth" });
          resetTimeout = setTimeout(() => {
            isResettingRef.current = false;
          }, 1200);
        } else {
          const currentSpeed = autoScrollSpeedRef.current;
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
  }, [isAutoScrollActive, isUserHovered]);

  // Sorting state
  const [sortField, setSortField] = useState<AttendanceSortField>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  const handleSort = (field: AttendanceSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Window position & dimensions state for dragging & resizing
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 680, height: 620 });
  const [isInitializedPos, setIsInitializedPos] = useState(false);

  const dragRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const isResizingRef = useRef(false);
  const resizeStartPos = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Initialize sensible position on first open
  useEffect(() => {
    if (isOpen && !isInitializedPos) {
      const defaultWidth = Math.min(700, window.innerWidth - 32);
      const defaultHeight = Math.min(640, window.innerHeight - 80);
      const startX = Math.max(16, window.innerWidth - defaultWidth - 32);
      const startY = Math.max(50, Math.min(80, window.innerHeight - defaultHeight - 32));
      
      setPos({ x: startX, y: startY });
      setSize({ width: defaultWidth, height: defaultHeight });
      setIsInitializedPos(true);
    }
  }, [isOpen, isInitializedPos]);

  // Handle Dragging
  const handleMouseDownDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("input") || (e.target as HTMLElement).closest(".custom-datepicker")) return;
    isDraggingRef.current = true;
    dragStartPos.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newX = Math.max(10, Math.min(window.innerWidth - size.width - 10, ev.clientX - dragStartPos.current.x));
      const newY = Math.max(10, Math.min(window.innerHeight - 80, ev.clientY - dragStartPos.current.y));
      setPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Handle Resizing on ANY side or corner of the container
  type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
  const handleMouseDownResize = (e: React.MouseEvent, direction: ResizeDir = "se") => {
    e.stopPropagation();
    e.preventDefault();
    isResizingRef.current = true;
    resizeStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };
    const startX = pos.x;
    const startY = pos.y;
    const startW = size.width;
    const startH = size.height;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaX = ev.clientX - resizeStartPos.current.x;
      const deltaY = ev.clientY - resizeStartPos.current.y;
      
      let newW = startW;
      let newH = startH;
      let newX = startX;
      let newY = startY;

      // Horizontal resizing
      if (direction.includes("e")) {
        newW = Math.max(380, Math.min(window.innerWidth - startX - 10, startW + deltaX));
      } else if (direction.includes("w")) {
        const maxLeft = startX + startW - 380;
        const proposedX = Math.max(10, Math.min(maxLeft, startX + deltaX));
        newW = startW + (startX - proposedX);
        newX = proposedX;
      }

      // Vertical resizing
      if (direction.includes("s")) {
        newH = Math.max(340, Math.min(window.innerHeight - startY - 10, startH + deltaY));
      } else if (direction.includes("n")) {
        const maxTop = startY + startH - 340;
        const proposedY = Math.max(10, Math.min(maxTop, startY + deltaY));
        newH = startH + (startY - proposedY);
        newY = proposedY;
      }
      
      setPos({ x: newX, y: newY });
      setSize({ width: newW, height: newH });
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };
  // Date range normalization
  const startDateStr = useMemo(() => {
    return entryQueryDate <= returnEntryQueryDate ? entryQueryDate : returnEntryQueryDate;
  }, [entryQueryDate, returnEntryQueryDate]);

  const endDateStr = useMemo(() => {
    return entryQueryDate <= returnEntryQueryDate ? returnEntryQueryDate : entryQueryDate;
  }, [entryQueryDate, returnEntryQueryDate]);

  const isRangeQuery = useMemo(() => {
    return startDateStr !== endDateStr;
  }, [startDateStr, endDateStr]);

  const totalQueryDays = useMemo(() => {
    if (!isRangeQuery) return 1;
    try {
      const s = new Date(startDateStr + "T00:00:00");
      const e = new Date(endDateStr + "T00:00:00");
      const diffTime = e.getTime() - s.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24)) + 1;
      return Math.max(1, diffDays);
    } catch {
      return 1;
    }
  }, [isRangeQuery, startDateStr, endDateStr]);

  // Quick Date Presets Handler
  const handleSetPreset = (preset: "today" | "yesterday" | "this_week" | "last_7_days" | "this_month") => {
    const now = new Date();
    if (preset === "today") {
      setEntryQueryDate(todayStr);
      setReturnEntryQueryDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = getLocalDateString(y);
      setEntryQueryDate(yStr);
      setReturnEntryQueryDate(yStr);
    } else if (preset === "this_week") {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      setEntryQueryDate(getLocalDateString(monday));
      setReturnEntryQueryDate(todayStr);
    } else if (preset === "last_7_days") {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      setEntryQueryDate(getLocalDateString(d));
      setReturnEntryQueryDate(todayStr);
    } else if (preset === "this_month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setEntryQueryDate(getLocalDateString(firstDay));
      setReturnEntryQueryDate(todayStr);
    }
  };

  // Deduplicate workers list
  const uniqueWorkers = useMemo(() => {
    const list = (workers || []).filter((w: any) => {
      const r = (w.role || "").toString().toUpperCase();
      return r !== "COMPANY_ADMIN" && r !== "COMPANYADMIN" && r !== "ADMIN";
    });

    const map = new Map<string, any>();
    list.forEach((w: any) => {
      const key = String(w.id || w.worker_id || w.email || `${w.firstName || ""}_${w.lastName || ""}`).trim();
      if (key && !map.has(key)) {
        map.set(key, w);
      }
    });
    return Array.from(map.values());
  }, [workers]);

  // Compute live worker attendance statuses based on Date Query
  const evaluatedWorkers = useMemo(() => {
    return uniqueWorkers.map((worker, index) => {
      const workerId = worker.id || worker.worker_id;

      // Extract worker name
      const name =
        worker.firstName || worker.lastName
          ? `${worker.firstName || ""} ${worker.lastName || ""}`.trim()
          : (worker.name || worker.full_name || worker.email || "Unknown Worker");

      // Extract department
      const department =
        (departments || []).find((d: any) => d.id === worker.department_id)?.name ||
        worker.deptLabel ||
        worker.department ||
        "Unassigned";

      // Helper to match worker credentials with records
      const matchesRecord = (record: any) => {
        const rId = record.worker_id || record.workerId;
        const rName = record.workerName || record.worker_name || record.name;
        if (rId && workerId && String(rId) === String(workerId)) return true;
        if (rName && name && String(rName).trim().toLowerCase() === String(name).trim().toLowerCase()) return true;
        if (worker.email && record.email && String(record.email).toLowerCase() === String(worker.email).toLowerCase()) return true;
        return false;
      };

      if (!isRangeQuery) {
        // --- SINGLE DAY QUERY MODE ---
        const targetDate = startDateStr;

        // 1. Check approved permission for targetDate
        const hasApprovedPermission = (permissions || []).some((p: any) => {
          const status = (p.status || "").toLowerCase();
          return (
            matchesRecord(p) &&
            status === "approved" &&
            p.startDate <= targetDate &&
            p.endDate >= targetDate
          );
        });

        if (hasApprovedPermission) {
          return {
            sn: index + 1,
            id: workerId,
            name,
            department,
            status: "ON_PERMISSION" as const,
            statusLabel: "On Permission",
            detail: "Approved Leave / Permission",
            badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
            dotColor: "bg-amber-500",
          };
        }

        // 2. Check attendance records for targetDate
        const dayRecord = (attendanceRecords || []).find((r: any) => {
          return matchesRecord(r) && r.date === targetDate;
        });

        if (dayRecord && (dayRecord.timeIn || dayRecord.statusIn)) {
          const statusInUpper = (dayRecord.statusIn || "").toString().toUpperCase();
          if (statusInUpper === "LATE") {
            return {
              sn: index + 1,
              id: workerId,
              name,
              department,
              status: "LATE" as const,
              statusLabel: "Late",
              detail: `In: ${dayRecord.timeIn || "--"} | Out: ${dayRecord.timeOut || "Active"}`,
              badgeColor: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
              dotColor: "bg-sky-500",
            };
          }
          return {
            sn: index + 1,
            id: workerId,
            name,
            department,
            status: "ON_TIME" as const,
            statusLabel: "On Time",
            detail: `In: ${dayRecord.timeIn || "--"} | Out: ${dayRecord.timeOut || "Active"}`,
            badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
            dotColor: "bg-emerald-500",
          };
        }

        // 3. Default: Not in Attendance
        return {
          sn: index + 1,
          id: workerId,
          name,
          department,
          status: "NOT_IN_ATTENDANCE" as const,
          statusLabel: "Not in Attendance",
          detail: "No punch log on date",
          badgeColor: "bg-neutral-500/15 text-neutral-500 dark:text-neutral-400 border-neutral-500/30",
          dotColor: "bg-neutral-400 dark:bg-neutral-500",
        };
      } else {
        // --- DATE RANGE QUERY MODE ---
        // Find attendance logs in date range
        const rangeRecords = (attendanceRecords || []).filter((r: any) => {
          return matchesRecord(r) && r.date >= startDateStr && r.date <= endDateStr && (r.timeIn || r.statusIn);
        });

        // Set of distinct dates attended
        const attendedDates = new Set(rangeRecords.map((r: any) => r.date));
        const lateDates = new Set(
          rangeRecords
            .filter((r: any) => (r.statusIn || "").toString().toUpperCase() === "LATE")
            .map((r: any) => r.date)
        );

        // Check approved permissions covering range
        const matchingPermissions = (permissions || []).filter((p: any) => {
          const status = (p.status || "").toLowerCase();
          return (
            matchesRecord(p) &&
            status === "approved" &&
            p.startDate <= endDateStr &&
            p.endDate >= startDateStr
          );
        });

        // Count permission days
        let permissionDaysCount = 0;
        if (matchingPermissions.length > 0) {
          const s = new Date(startDateStr + "T00:00:00");
          const e = new Date(endDateStr + "T00:00:00");
          let cur = new Date(s);
          while (cur <= e) {
            const curStr = getLocalDateString(cur);
            if (
              !attendedDates.has(curStr) &&
              matchingPermissions.some((p: any) => p.startDate <= curStr && p.endDate >= curStr)
            ) {
              permissionDaysCount++;
            }
            cur.setDate(cur.getDate() + 1);
          }
        }

        const daysPresent = attendedDates.size;
        const daysLate = lateDates.size;
        const totalWorkDays = totalQueryDays;
        const availabilityPercent = Math.min(
          100,
          Math.round(((daysPresent + permissionDaysCount) / Math.max(1, totalWorkDays)) * 100)
        );

        if (daysPresent > 0) {
          if (daysLate > 0) {
            return {
              sn: index + 1,
              id: workerId,
              name,
              department,
              status: "LATE" as const,
              statusLabel: `Present (${daysPresent}/${totalWorkDays}d)`,
              detail: `${daysLate} Late arrival${daysLate > 1 ? "s" : ""} · ${availabilityPercent}% Availability`,
              badgeColor: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
              dotColor: "bg-sky-500",
            };
          }
          return {
            sn: index + 1,
            id: workerId,
            name,
            department,
            status: "ON_TIME" as const,
            statusLabel: `Present (${daysPresent}/${totalWorkDays}d)`,
            detail: `100% On-Time · ${availabilityPercent}% Availability`,
            badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
            dotColor: "bg-emerald-500",
          };
        } else if (permissionDaysCount > 0) {
          return {
            sn: index + 1,
            id: workerId,
            name,
            department,
            status: "ON_PERMISSION" as const,
            statusLabel: `Permission (${permissionDaysCount}d)`,
            detail: `Approved leave across range`,
            badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
            dotColor: "bg-amber-500",
          };
        } else {
          return {
            sn: index + 1,
            id: workerId,
            name,
            department,
            status: "NOT_IN_ATTENDANCE" as const,
            statusLabel: `Absent (0/${totalWorkDays}d)`,
            detail: `No attendance logged in range`,
            badgeColor: "bg-neutral-500/15 text-neutral-500 dark:text-neutral-400 border-neutral-500/30",
            dotColor: "bg-neutral-400 dark:bg-neutral-500",
          };
        }
      }
    });
  }, [
    uniqueWorkers,
    departments,
    attendanceRecords,
    permissions,
    isRangeQuery,
    startDateStr,
    endDateStr,
    totalQueryDays,
  ]);

  // Live Summary Counters
  const summaryCounters = useMemo(() => {
    const total = evaluatedWorkers.length;
    let onTime = 0;
    let late = 0;
    let onPermission = 0;
    let notInAttendance = 0;

    evaluatedWorkers.forEach((w) => {
      if (w.status === "ON_TIME") onTime++;
      else if (w.status === "LATE") late++;
      else if (w.status === "ON_PERMISSION") onPermission++;
      else if (w.status === "NOT_IN_ATTENDANCE") notInAttendance++;
    });

    return { total, onTime, late, onPermission, notInAttendance };
  }, [evaluatedWorkers]);

  // Filtered and sorted list based on tab, search query, and sortField
  const filteredList = useMemo(() => {
    const list = evaluatedWorkers.filter((item) => {
      if (filterTab !== "ALL" && item.status !== filterTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.department.toLowerCase().includes(q) ||
          (item.id && item.id.toString().toLowerCase().includes(q))
        );
      }
      return true;
    });

    const statusRank: Record<string, number> = {
      ON_TIME: 1,
      LATE: 2,
      ON_PERMISSION: 3,
      NOT_IN_ATTENDANCE: 4,
    };

    return [...list].sort((a, b) => {
      let result = 0;
      if (sortField === "name") {
        result = a.name.localeCompare(b.name);
      } else if (sortField === "department") {
        result = a.department.localeCompare(b.department);
      } else if (sortField === "status") {
        const rankA = statusRank[a.status] || 99;
        const rankB = statusRank[b.status] || 99;
        if (rankA !== rankB) {
          result = rankA - rankB;
        } else {
          result = a.name.localeCompare(b.name);
        }
      }

      return sortOrder === "asc" ? result : -result;
    });
  }, [evaluatedWorkers, filterTab, searchQuery, sortField, sortOrder]);

  const modalTheme = useMemo(() => {
    if (theme === "army") {
      return {
        containerBg: "bg-[#182413]/98 border-[#2D3E24] text-[#E6F4DE] shadow-black/80",
        headerBg: "bg-[#141C10]/95 border-[#2D3E24] text-[#E6F4DE]",
        subHeaderBg: "bg-[#182413]/90 border-[#2D3E24]",
        innerBg: "bg-[#25361E] border-[#374C2E] text-[#E6F4DE]",
        inputBg: "bg-[#141C10] border-[#2D3E24] text-[#E6F4DE] placeholder-[#A1C094]/60",
        textTitle: "text-[#E6F4DE]",
        textMuted: "text-[#A1C094]",
        cardBg: "bg-[#1E2E18]/80 border-[#2D3E24]",
        accentText: "text-emerald-400",
        accentBorder: "border-[#2D3E24]",
        tableHeaderBg: "bg-[#141C10] border-[#2D3E24] text-[#A1C094]",
        tableContainer: "bg-[#182413] border-[#2D3E24]",
        tableRowHover: "hover:bg-[#25361E]/50",
        tableRowDivider: "divide-[#2D3E24]",
        dropdownBg: "bg-[#141C10] border-[#2D3E24] text-[#E6F4DE]",
        dropdownHover: "hover:bg-[#25361E]",
        controlBtnBg: "bg-[#25361E] border-[#374C2E] text-[#E6F4DE] hover:border-emerald-500/50",
        pillInactive: "bg-[#25361E] text-[#A1C094] border-[#374C2E] hover:text-[#E6F4DE]",
        datePickerTheme: "dark" as const,
        datePickerClass: "bg-[#141C10] border-[#2D3E24] text-[#E6F4DE]",
      };
    }
    if (theme === "navy") {
      return {
        containerBg: "bg-[#111A35]/98 border-[#1E2D5A] text-[#ECEFF4] shadow-black/80",
        headerBg: "bg-[#0B132B]/95 border-[#1E2D5A] text-[#ECEFF4]",
        subHeaderBg: "bg-[#111A35]/90 border-[#1E2D5A]",
        innerBg: "bg-[#182449] border-[#223363] text-[#ECEFF4]",
        inputBg: "bg-[#0B132B] border-[#1E2D5A] text-[#ECEFF4] placeholder-[#94A5C1]/60",
        textTitle: "text-[#ECEFF4]",
        textMuted: "text-[#94A5C1]",
        cardBg: "bg-[#142044]/80 border-[#1E2D5A]",
        accentText: "text-cyan-400",
        accentBorder: "border-[#1E2D5A]",
        tableHeaderBg: "bg-[#0B132B] border-[#1E2D5A] text-[#94A5C1]",
        tableContainer: "bg-[#111A35] border-[#1E2D5A]",
        tableRowHover: "hover:bg-[#182449]/50",
        tableRowDivider: "divide-[#1E2D5A]",
        dropdownBg: "bg-[#0B132B] border-[#1E2D5A] text-[#ECEFF4]",
        dropdownHover: "hover:bg-[#182449]",
        controlBtnBg: "bg-[#182449] border-[#223363] text-[#ECEFF4] hover:border-cyan-500/50",
        pillInactive: "bg-[#182449] text-[#94A5C1] border-[#223363] hover:text-[#ECEFF4]",
        datePickerTheme: "dark" as const,
        datePickerClass: "bg-[#0B132B] border-[#1E2D5A] text-[#ECEFF4]",
      };
    }
    if (theme === "light") {
      return {
        containerBg: "bg-white/98 border-slate-200 text-slate-900 shadow-2xl shadow-slate-400/20",
        headerBg: "bg-slate-50/95 border-slate-200 text-slate-900",
        subHeaderBg: "bg-slate-50/70 border-slate-200",
        innerBg: "bg-slate-100 border-slate-200 text-slate-900",
        inputBg: "bg-white border-slate-200 text-slate-900 placeholder-slate-400",
        textTitle: "text-slate-900",
        textMuted: "text-slate-500",
        cardBg: "bg-slate-50 border-slate-200",
        accentText: "text-emerald-600",
        accentBorder: "border-slate-200",
        tableHeaderBg: "bg-slate-100 border-slate-200 text-slate-600",
        tableContainer: "bg-white border-slate-200",
        tableRowHover: "hover:bg-slate-50",
        tableRowDivider: "divide-slate-200",
        dropdownBg: "bg-white border-slate-200 text-slate-900",
        dropdownHover: "hover:bg-slate-100",
        controlBtnBg: "bg-white border-slate-200 text-slate-800 hover:border-emerald-500/50",
        pillInactive: "bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-200",
        datePickerTheme: "light" as const,
        datePickerClass: "bg-white border-slate-200 text-slate-900",
      };
    }
    // Default dark
    return {
      containerBg: "bg-neutral-950/98 border-neutral-800 text-white shadow-black/80",
      headerBg: "bg-black/60 border-neutral-800 text-white",
      subHeaderBg: "bg-neutral-950/40 border-neutral-800",
      innerBg: "bg-neutral-900 border-neutral-800 text-white",
      inputBg: "bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500",
      textTitle: "text-white",
      textMuted: "text-neutral-400",
      cardBg: "bg-neutral-900/60 border-neutral-800",
      accentText: "text-emerald-500",
      accentBorder: "border-neutral-800",
      tableHeaderBg: "bg-neutral-900 border-neutral-800 text-neutral-400",
      tableContainer: "bg-neutral-950 border-neutral-800",
      tableRowHover: "hover:bg-neutral-900/60",
      tableRowDivider: "divide-neutral-800 border-neutral-800",
      dropdownBg: "bg-neutral-950 border-neutral-800 text-white",
      dropdownHover: "hover:bg-neutral-900",
      controlBtnBg: "bg-neutral-900 border-neutral-800 text-neutral-200 hover:border-emerald-500/50",
      pillInactive: "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200 hover:bg-neutral-850",
      datePickerTheme: "dark" as const,
      datePickerClass: "bg-neutral-900 border-neutral-800 text-white",
    };
  }, [theme]);

  if (!isOpen) return null; // Minimized Widget Bar
  if (isMinimized) {
    return (
      <div
        className={`fixed bottom-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all select-none ${modalTheme.containerBg}`}
      >
        <div className="flex items-center space-x-2 shrink-0">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Eye className="w-4 h-4" />
          </div>
          <span className={`font-bold text-xs uppercase tracking-wider truncate ${modalTheme.textTitle}`}>
            A Glance Attendance
          </span>
        </div>

        {/* Live Counter Badges */}
        <div className="flex items-center space-x-1.5 text-[11px] font-semibold font-mono">
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" title="On Time">
            {summaryCounters.onTime}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/30" title="Late">
            {summaryCounters.late}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30" title="On Permission">
            {summaryCounters.onPermission}
          </span>
          <span className={`px-2 py-0.5 rounded-md bg-neutral-500/15 ${modalTheme.textMuted} border ${modalTheme.accentBorder}`} title="Not in Attendance">
            {summaryCounters.notInAttendance}
          </span>
        </div>

        <div className={`flex items-center space-x-1 border-l pl-2 ${modalTheme.accentBorder}`}>
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className={`p-1.5 rounded-lg ${modalTheme.dropdownHover} ${modalTheme.textMuted} hover:${modalTheme.textTitle} transition-colors cursor-pointer`}
            title="Restore Window"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: `${pos.y}px`,
        left: `${pos.x}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        opacity: containerOpacity,
        zIndex: 9999,
        transition: "opacity 0.08s ease-out",
      }}
      className={`flex flex-col rounded-3xl border shadow-2xl backdrop-blur-2xl transition-shadow select-none overflow-hidden ${modalTheme.containerBg}`}
    >
      {/* Draggable Title Bar Header */}
      <div
        ref={dragRef}
        onMouseDown={handleMouseDownDrag}
        className={`px-4 sm:px-5 py-3 flex items-center justify-between gap-2 border-b cursor-move shrink-0 ${modalTheme.headerBg}`}
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className={`font-display font-bold text-sm tracking-tight flex items-center space-x-2 truncate ${modalTheme.textTitle}`}>
              <span className="truncate">A Glance Attendance</span>
              <span className="hidden xs:inline-block text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-500 font-semibold shrink-0">
                {isRangeQuery ? `${totalQueryDays} Days Range` : "Single Day"}
              </span>
            </h3>
            <p className={`text-[10px] ${modalTheme.textMuted} leading-tight truncate hidden sm:block`}>
              {isRangeQuery
                ? `Monitoring availability from ${startDateStr} to ${endDateStr}`
                : `Instant attendance status for ${startDateStr}`}
            </p>
          </div>
        </div>

        {/* Right Side Header Controls + Opacity Slider + Auto-Scroll Switch */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Auto-Scroll Toggle Switch */}
          <div 
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-xl border select-none cursor-pointer transition-all min-w-0 ${
              isAutoScrollActive
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-500 shadow-xs"
                : `${modalTheme.innerBg} ${modalTheme.textMuted}`
            }`}
            onClick={() => setIsAutoScrollActive((prev) => !prev)}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            title="Toggle Auto-Scrolling for Attendance List"
          >
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider hidden sm:inline truncate max-w-[70px]">
              Auto-Scroll
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isAutoScrollActive}
              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isAutoScrollActive ? "bg-emerald-500" : "bg-neutral-500/40"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isAutoScrollActive ? "translate-x-3" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Linear Progressive Speed-Control Bar (when auto-scroll is active) */}
          <AnimatePresence>
            {isAutoScrollActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: "auto" }}
                exit={{ opacity: 0, scale: 0.95, width: 0 }}
                transition={{ duration: 0.18 }}
                className={`flex items-center space-x-1.5 px-2 py-1 rounded-xl ${modalTheme.innerBg} select-none min-w-0`}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                title="Adjust Auto-Scroll Speed"
              >
                <span className="hidden md:inline text-[9px] font-mono font-medium uppercase tracking-wider text-emerald-500 truncate">
                  Speed
                </span>
                <div className="relative flex items-center w-12 sm:w-16 shrink-0">
                  <input
                    type="range"
                    min={0.2}
                    max={5.0}
                    step={0.1}
                    value={autoScrollSpeed}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setAutoScrollSpeed(val);
                      localStorage.setItem("clockit_overlay_scroll_speed", String(val));
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
                    style={{
                      background: `linear-gradient(to right, #10b981 0%, #10b981 ${((autoScrollSpeed - 0.2) / (5.0 - 0.2)) * 100}%, #737373 ${((autoScrollSpeed - 0.2) / (5.0 - 0.2)) * 100}%, #737373 100%)`,
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-500 shrink-0 min-w-[26px] text-right">
                  {autoScrollSpeed.toFixed(1)}x
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Linear Progressive Transparency/Opacity Indicator Slider */}
          <div 
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-xl ${modalTheme.innerBg} select-none cursor-default min-w-0`}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            title="Adjust Container Transparency / Opacity"
          >
            <div className={`flex items-center space-x-1 ${modalTheme.textMuted} min-w-0`}>
              <Sliders className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className={`hidden md:inline text-[9px] font-mono font-medium uppercase tracking-wider ${modalTheme.textMuted} truncate max-w-[50px]`}>
                Opacity
              </span>
            </div>
            <div className="relative flex items-center w-12 sm:w-20 shrink-0">
              <input
                type="range"
                min={0.15}
                max={1.0}
                step={0.01}
                value={containerOpacity}
                onChange={(e) => setContainerOpacity(parseFloat(e.target.value))}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
              />
            </div>
            <span className="text-[10px] font-mono font-bold w-7 text-right text-emerald-500 shrink-0">
              {Math.round(containerOpacity * 100)}%
            </span>
          </div>

          <div className={`flex items-center space-x-0.5 border-l ${modalTheme.accentBorder} pl-1.5`}>
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className={`p-1.5 rounded-xl ${modalTheme.dropdownHover} ${modalTheme.textMuted} hover:${modalTheme.textTitle} transition-colors cursor-pointer`}
              title="Minimize Overlay"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
              title="Close Overlay"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Date Query Section: Entry Query Date + Return Entry Query Date + Quick Presets */}
      <div
        className={`px-4 sm:px-5 py-2.5 border-b flex flex-col gap-2.5 shrink-0 ${modalTheme.subHeaderBg}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {/* Entry Query Date (Start Date) */}
            <div className="flex items-center space-x-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider ${modalTheme.textMuted} whitespace-nowrap`}>
                Entry Query Date:
              </label>
              <div className="w-32 sm:w-36">
                <CustomDatePicker
                  id="at_a_glance_entry_query_date"
                  value={entryQueryDate}
                  onChange={(val) => setEntryQueryDate(val)}
                  placeholder="Entry Date"
                  theme={modalTheme.datePickerTheme}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl ${modalTheme.datePickerClass}`}
                />
              </div>
            </div>

            {/* Separator icon */}
            <span className={`${modalTheme.textMuted} text-xs font-bold hidden xs:inline`}>→</span>

            {/* Return Entry Query Date (End Date) */}
            <div className="flex items-center space-x-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider ${modalTheme.textMuted} whitespace-nowrap`}>
                Return Entry Query Date:
              </label>
              <div className="w-32 sm:w-36">
                <CustomDatePicker
                  id="at_a_glance_return_query_date"
                  value={returnEntryQueryDate}
                  onChange={(val) => setReturnEntryQueryDate(val)}
                  placeholder="Return Date"
                  theme={modalTheme.datePickerTheme}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl ${modalTheme.datePickerClass}`}
                />
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            <button
              type="button"
              onClick={() => handleSetPreset("today")}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                entryQueryDate === todayStr && returnEntryQueryDate === todayStr
                  ? "bg-emerald-500 text-white shadow-xs"
                  : `${modalTheme.pillInactive}`
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset("yesterday")}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${modalTheme.pillInactive}`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset("last_7_days")}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${modalTheme.pillInactive}`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset("this_month")}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${modalTheme.pillInactive}`}
            >
              This Month
            </button>
            {(entryQueryDate !== todayStr || returnEntryQueryDate !== todayStr) && (
              <button
                type="button"
                onClick={() => handleSetPreset("today")}
                className="p-1 rounded-lg text-emerald-500 hover:bg-emerald-500/15 transition-all cursor-pointer"
                title="Reset date query to today"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col p-4 sm:p-5 overflow-visible gap-3 min-h-0">
        {/* Live Summary Counters Panel */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 shrink-0">
          <div className={`p-2 sm:p-2.5 rounded-2xl border ${modalTheme.cardBg} text-center flex flex-col items-center justify-center min-w-0`}>
            <span className={`text-[10px] uppercase font-semibold ${modalTheme.textMuted} tracking-wider truncate w-full block text-center`} title="Total Workers">Total</span>
            <span className={`text-sm sm:text-base font-bold font-mono ${modalTheme.textTitle} truncate w-full block text-center`}>{summaryCounters.total}</span>
          </div>
          <div className="p-2 sm:p-2.5 rounded-2xl border bg-emerald-500/10 border-emerald-500/25 text-center flex flex-col items-center justify-center min-w-0">
            <span className="text-[10px] uppercase font-semibold text-emerald-500 tracking-wider truncate w-full block text-center" title="On Time">On Time</span>
            <span className="text-sm sm:text-base font-bold font-mono text-emerald-500 truncate w-full block text-center">{summaryCounters.onTime}</span>
          </div>
          <div className="p-2 sm:p-2.5 rounded-2xl border bg-sky-500/10 border-sky-500/25 text-center flex flex-col items-center justify-center min-w-0">
            <span className="text-[10px] uppercase font-semibold text-sky-400 tracking-wider truncate w-full block text-center" title="Late">Late</span>
            <span className="text-sm sm:text-base font-bold font-mono text-sky-400 truncate w-full block text-center">{summaryCounters.late}</span>
          </div>
          <div className="p-2 sm:p-2.5 rounded-2xl border bg-amber-500/10 border-amber-500/25 text-center flex flex-col items-center justify-center min-w-0">
            <span className="text-[10px] uppercase font-semibold text-amber-400 tracking-wider truncate w-full block text-center" title="Permission">Permission</span>
            <span className="text-sm sm:text-base font-bold font-mono text-amber-400 truncate w-full block text-center">{summaryCounters.onPermission}</span>
          </div>
          <div className={`p-2 sm:p-2.5 rounded-2xl border ${modalTheme.cardBg} text-center flex flex-col items-center justify-center min-w-0`}>
            <span className={`text-[10px] uppercase font-semibold ${modalTheme.textMuted} tracking-wider truncate w-full block text-center`} title="Not In">Not In</span>
            <span className={`text-sm sm:text-base font-bold font-mono ${modalTheme.textMuted} truncate w-full block text-center`}>{summaryCounters.notInAttendance}</span>
          </div>
        </div>

        {/* Visual Status Legend & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="flex items-center space-x-1.5 font-medium min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm shrink-0"></span>
              <span className={`${modalTheme.textTitle} truncate max-w-[80px] sm:max-w-none`}>On Time</span>
            </span>
            <span className="flex items-center space-x-1.5 font-medium min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block shadow-sm shrink-0"></span>
              <span className={`${modalTheme.textTitle} truncate max-w-[80px] sm:max-w-none`}>Late</span>
            </span>
            <span className="flex items-center space-x-1.5 font-medium min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-sm shrink-0"></span>
              <span className={`${modalTheme.textTitle} truncate max-w-[80px] sm:max-w-none`} title="Permission">Permission</span>
            </span>
            <span className="flex items-center space-x-1.5 font-medium min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 inline-block shadow-sm shrink-0"></span>
              <span className={`${modalTheme.textMuted} truncate max-w-[95px] sm:max-w-none`} title="Not in Attendance">Not in Attendance</span>
            </span>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            {/* Sort Field Custom Dropdown (Rendered via Portal over the container to prevent any clipping) */}
            <div className="relative flex items-center space-x-1 z-30">
              <CustomSortDropdown
                value={sortField}
                onChange={(val) => setSortField(val as AttendanceSortField)}
                sortOrder={sortOrder}
                onToggleSortOrder={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                options={[
                  { id: "name", label: "Worker Name", desc: "Alphabetical Order (A-Z)" },
                  { id: "department", label: "Department", desc: "Grouped by Department" },
                  { id: "status", label: "Attendance Status", desc: "Present, Late, Not In" },
                ]}
                title="Sort Workers By"
                theme={theme === "light" ? "light" : theme === "army" ? "army" : theme === "navy" ? "navy" : "dark"}
              />
            </div>

            {/* Live Search worker filter */}
            <div className="relative flex-1 max-w-[160px] min-w-[90px]">
              <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${modalTheme.textMuted}`} />
              <input
                type="text"
                placeholder="Search worker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-3 py-1 rounded-xl text-xs border outline-none transition-all truncate ${modalTheme.inputBg} focus:border-emerald-500/50 shadow-sm`}
              />
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setFilterTab("ALL")}
            className={`px-3 py-1 rounded-xl transition-all shrink-0 cursor-pointer ${
              filterTab === "ALL"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 font-bold"
                : `${modalTheme.pillInactive}`
            }`}
          >
            All ({summaryCounters.total})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("ON_TIME")}
            className={`px-3 py-1 rounded-xl transition-all shrink-0 cursor-pointer ${
              filterTab === "ON_TIME"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 font-bold"
                : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20"
            }`}
          >
            On Time ({summaryCounters.onTime})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("LATE")}
            className={`px-3 py-1 rounded-xl transition-all shrink-0 cursor-pointer ${
              filterTab === "LATE"
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/20 font-bold"
                : "bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/20"
            }`}
          >
            Late ({summaryCounters.late})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("ON_PERMISSION")}
            className={`px-2.5 sm:px-3 py-1 rounded-xl transition-all shrink-0 truncate max-w-[130px] sm:max-w-none cursor-pointer ${
              filterTab === "ON_PERMISSION"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20 font-bold"
                : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
            }`}
            title={`Permission (${summaryCounters.onPermission})`}
          >
            Permission ({summaryCounters.onPermission})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("NOT_IN_ATTENDANCE")}
            className={`px-3 py-1 rounded-xl transition-all shrink-0 cursor-pointer ${
              filterTab === "NOT_IN_ATTENDANCE"
                ? "bg-neutral-600 text-white shadow-md shadow-neutral-600/20 font-bold"
                : `${modalTheme.pillInactive}`
            }`}
          >
            Not In ({summaryCounters.notInAttendance})
          </button>
        </div>

        {/* Registered Workers List Table */}
        <div
          ref={tableContainerRef}
          onMouseEnter={() => setIsUserHovered(true)}
          onMouseLeave={() => setIsUserHovered(false)}
          onTouchStart={() => setIsUserHovered(true)}
          onTouchEnd={() => setIsUserHovered(false)}
          className={`flex-1 overflow-auto rounded-2xl border ${modalTheme.tableContainer}`}
        >
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <thead className={`sticky top-0 z-10 ${modalTheme.tableHeaderBg}`}>
              <tr className={`border-b ${modalTheme.accentBorder} text-[10px] font-bold uppercase tracking-wider`}>
                <th className="py-2.5 px-3 w-10 sm:w-12 text-center select-none font-bold uppercase tracking-wider">
                  S/N
                </th>
                <th
                  onClick={() => handleSort("name")}
                  className="py-2.5 px-3 cursor-pointer hover:text-emerald-500 transition-colors select-none w-1/3 min-w-0"
                  title="Sort by Worker Name"
                >
                  <div className="flex items-center space-x-1 min-w-0">
                    <span className="truncate">Worker Name</span>
                    {sortField === "name" ? (
                      sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-500 shrink-0" /> : <ArrowDown className="w-3 h-3 text-emerald-500 shrink-0" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-40 shrink-0" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("department")}
                  className="py-2.5 px-3 cursor-pointer hover:text-emerald-500 transition-colors select-none w-1/4 min-w-0"
                  title="Sort by Department"
                >
                  <div className="flex items-center space-x-1 min-w-0">
                    <span className="truncate">Department</span>
                    {sortField === "department" ? (
                      sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-500 shrink-0" /> : <ArrowDown className="w-3 h-3 text-emerald-500 shrink-0" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-40 shrink-0" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-emerald-500 transition-colors select-none w-2/5 min-w-0"
                  title="Sort by Attendance Status"
                >
                  <div className="flex items-center justify-end space-x-1 min-w-0">
                    <span className="truncate">Status & Details</span>
                    {sortField === "status" ? (
                      sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-500 shrink-0" /> : <ArrowDown className="w-3 h-3 text-emerald-500 shrink-0" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-40 shrink-0" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${modalTheme.tableRowDivider}`}>
              {filteredList.length > 0 ? (
                filteredList.map((worker, index) => (
                  <tr
                    key={worker.id || index}
                    className={`transition-colors ${modalTheme.tableRowHover}`}
                  >
                    <td className={`py-2.5 px-3 text-center font-mono font-medium ${modalTheme.textMuted}`}>
                      {index + 1}
                    </td>
                    <td className={`py-2.5 px-3 font-semibold ${modalTheme.textTitle} min-w-0`}>
                      <div className="flex items-center space-x-2 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full ${worker.dotColor} shrink-0`}
                        />
                        <span className="truncate block" title={worker.name}>{worker.name}</span>
                      </div>
                    </td>
                    <td className={`py-2.5 px-3 ${modalTheme.textMuted} font-medium min-w-0`}>
                      <span className="truncate block" title={worker.department}>{worker.department}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right min-w-0">
                      <div className="flex flex-col items-end gap-0.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border truncate max-w-[130px] sm:max-w-none align-middle ${worker.badgeColor}`}
                          title={worker.statusLabel}
                        >
                          {worker.statusLabel}
                        </span>
                        {worker.detail && (
                          <span className={`text-[10px] ${modalTheme.textMuted} truncate max-w-[140px] sm:max-w-none font-mono`}>
                            {worker.detail}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className={`py-10 text-center ${modalTheme.textMuted} font-medium`}>
                    No registered workers found matching filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8-Directional Resize Handles on all sides & corners of the container */}
      {/* Top Edge */}
      <div
        onMouseDown={(e) => handleMouseDownResize(e, "n")}
        className="absolute top-0 left-3 right-3 h-2 cursor-n-resize z-30 hover:bg-emerald-500/20 transition-colors"
        title="Drag top edge to resize"
      />
      {/* Bottom Edge */}
      <div
        onMouseDown={(e) => handleMouseDownResize(e, "s")}
        className="absolute bottom-0 left-3 right-3 h-2 cursor-s-resize z-30 hover:bg-emerald-500/20 transition-colors"
        title="Drag bottom edge to resize"
      />
      {/* Left Edge */}
      <div
        onMouseDown={(e) => handleMouseDownResize(e, "w")}
        className="absolute left-0 top-3 bottom-3 w-2 cursor-w-resize z-30 hover:bg-emerald-500/20 transition-colors"
        title="Drag left edge to resize"
      />
      {/* Right Edge */}
      <div
        onMouseDown={(e) => handleMouseDownResize(e, "e")}
        className="absolute right-0 top-3 bottom-3 w-2 cursor-e-resize z-30 hover:bg-emerald-500/20 transition-colors"
        title="Drag right edge to resize"
      />
      {/* Top-Left Corner */}
      <div
        onMouseDown={(e) => handleMouseDownResize(e, "nw")}
        className="absolute top-0 left-0 w-3.5 h-3.5 cursor-nw-resize z-30"
        title="Drag top-left corner to resize"
      />
      {/* Top-Right Corner */}
      <div
        onMouseDown={(e) => handleMouseDownResize(e, "ne")}
        className="absolute top-0 right-0 w-3.5 h-3.5 cursor-ne-resize z-30"
        title="Drag top-right corner to resize"
      />
      {/* Bottom-Left Corner */}
      <div
        onMouseDown={(e) => handleMouseDownResize(e, "sw")}
        className="absolute bottom-0 left-0 w-3.5 h-3.5 cursor-sw-resize z-30"
        title="Drag bottom-left corner to resize"
      />
      {/* Bottom-Right Corner with visible grip */}
      <div
        onMouseDown={(e) => handleMouseDownResize(e, "se")}
        className={`absolute bottom-1 right-1 p-1 cursor-se-resize ${modalTheme.textMuted} hover:text-emerald-500 transition-colors z-30`}
        title="Drag bottom-right corner to resize"
      >
        <GripHorizontal className="w-4 h-4 rotate-45" />
      </div>

    </div>
  );
};
