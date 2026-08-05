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
} from "lucide-react";

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
  isDarkMode,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [containerOpacity, setContainerOpacity] = useState<number>(1);
  const [isAutoScrollActive, setIsAutoScrollActive] = useState<boolean>(false);
  const [isUserHovered, setIsUserHovered] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<AttendanceFilterType>("ALL");

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const isResettingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isAutoScrollActive) return;

    const container = tableContainerRef.current;
    if (!container) return;

    let animationFrameId: number;
    let resetTimeout: NodeJS.Timeout | null = null;

    const scrollStep = () => {
      if (container && !isUserHovered && !isResettingRef.current) {
        const isAtBottom =
          container.scrollTop + container.clientHeight >= container.scrollHeight - 3;
        if (isAtBottom) {
          isResettingRef.current = true;
          container.scrollTo({ top: 0, behavior: "smooth" });
          resetTimeout = setTimeout(() => {
            isResettingRef.current = false;
          }, 1000);
        } else {
          container.scrollTop += 0.8;
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
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 620, height: 540 });
  const [isInitializedPos, setIsInitializedPos] = useState(false);

  const dragRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const isResizingRef = useRef(false);
  const resizeStartPos = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Initialize sensible position on first open
  useEffect(() => {
    if (isOpen && !isInitializedPos) {
      const defaultWidth = Math.min(640, window.innerWidth - 32);
      const defaultHeight = Math.min(560, window.innerHeight - 100);
      const startX = Math.max(16, window.innerWidth - defaultWidth - 40);
      const startY = Math.max(80, Math.min(120, window.innerHeight - defaultHeight - 40));
      
      setPos({ x: startX, y: startY });
      setSize({ width: defaultWidth, height: defaultHeight });
      setIsInitializedPos(true);
    }
  }, [isOpen, isInitializedPos]);

  // Handle Dragging
  const handleMouseDownDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("input")) return;
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

  // Handle Resizing
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isResizingRef.current = true;
    resizeStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaX = ev.clientX - resizeStartPos.current.x;
      const deltaY = ev.clientY - resizeStartPos.current.y;
      
      const newW = Math.max(380, Math.min(window.innerWidth - pos.x - 20, resizeStartPos.current.width + deltaX));
      const newH = Math.max(340, Math.min(window.innerHeight - pos.y - 20, resizeStartPos.current.height + deltaY));
      
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

  // Compute live worker attendance statuses for today
  const todayStr = useMemo(() => getLocalDateString(new Date()), []);

  // Deduplicate workers list to prevent any duplicate rows in At-a-Glance table, matching Leaderboard filtering
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

  const evaluatedWorkers = useMemo(() => {
    return uniqueWorkers.map((worker, index) => {
      const workerId = worker.id || worker.worker_id;

      // Extract worker name matching Leaderboard - Top Performers formatting
      const name =
        worker.firstName || worker.lastName
          ? `${worker.firstName || ""} ${worker.lastName || ""}`.trim()
          : (worker.name || worker.full_name || worker.email || "Unknown Worker");

      // Extract department matching Leaderboard - Top Performers formatting
      const department =
        (departments || []).find((d: any) => d.id === worker.department_id)?.name ||
        worker.deptLabel ||
        worker.department ||
        "Unassigned";

      // Helper to match worker credentials with attendance/permission records
      const matchesRecord = (record: any) => {
        const rId = record.worker_id || record.workerId;
        const rName = record.workerName || record.worker_name || record.name;
        if (rId && workerId && String(rId) === String(workerId)) return true;
        if (rName && name && String(rName).trim().toLowerCase() === String(name).trim().toLowerCase()) return true;
        if (worker.email && record.email && String(record.email).toLowerCase() === String(worker.email).toLowerCase()) return true;
        return false;
      };

      // 1. Check approved permission status for today
      const hasApprovedPermission = (permissions || []).some((p: any) => {
        const status = (p.status || "").toLowerCase();
        return (
          matchesRecord(p) &&
          status === "approved" &&
          p.startDate <= todayStr &&
          p.endDate >= todayStr
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
          badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
          dotColor: "bg-amber-500",
        };
      }

      // 2. Check attendance records for today from shift register / attendance logs
      const todayRecord = (attendanceRecords || []).find((r: any) => {
        return matchesRecord(r) && r.date === todayStr;
      });

      if (todayRecord && (todayRecord.timeIn || todayRecord.statusIn)) {
        const statusInUpper = (todayRecord.statusIn || "").toString().toUpperCase();
        if (statusInUpper === "LATE") {
          return {
            sn: index + 1,
            id: workerId,
            name,
            department,
            status: "LATE" as const,
            statusLabel: "Late",
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
        badgeColor: "bg-neutral-500/15 text-neutral-500 dark:text-neutral-400 border-neutral-500/30",
        dotColor: "bg-neutral-400 dark:bg-neutral-500",
      };
    });
  }, [uniqueWorkers, departments, attendanceRecords, permissions, todayStr]);

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

  if (!isOpen) return null;

  // Minimized Widget Bar
  if (isMinimized) {
    return (
      <div
        className={`fixed bottom-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all select-none ${
          isDarkMode
            ? "bg-neutral-900/95 border-neutral-700 text-white"
            : "bg-white/95 border-neutral-200 text-slate-800"
        }`}
      >
        <div className="flex items-center space-x-2 shrink-0">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Eye className="w-4 h-4" />
          </div>
          <span className="font-bold text-xs uppercase tracking-wider truncate">A Glance Attendance</span>
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
          <span className="px-2 py-0.5 rounded-md bg-neutral-500/15 text-neutral-400 border border-neutral-500/30" title="Not in Attendance">
            {summaryCounters.notInAttendance}
          </span>
        </div>

        <div className="flex items-center space-x-1 border-l pl-2 border-neutral-500/20">
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="p-1.5 rounded-lg hover:bg-neutral-500/10 transition-colors"
            title="Restore Window"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
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
      className={`flex flex-col rounded-3xl border shadow-2xl backdrop-blur-2xl transition-shadow select-none overflow-hidden ${
        isDarkMode
          ? "bg-neutral-900/95 border-neutral-700/80 text-white shadow-black/60"
          : "bg-white/95 border-neutral-200/90 text-slate-900 shadow-slate-300/60"
      }`}
    >
      {/* Draggable Title Bar Header */}
      <div
        ref={dragRef}
        onMouseDown={handleMouseDownDrag}
        className={`px-4 sm:px-5 py-3 flex items-center justify-between gap-2 border-b cursor-move shrink-0 ${
          isDarkMode ? "bg-neutral-950/40 border-neutral-800" : "bg-neutral-100/60 border-neutral-200"
        }`}
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-bold text-sm tracking-tight flex items-center space-x-2 truncate">
              <span className="truncate">A Glance Attendance</span>
              <span className="hidden xs:inline-block text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-500 font-normal shrink-0">
                Live Today
              </span>
            </h3>
            <p className="text-[10px] text-neutral-400 leading-tight truncate hidden sm:block">
              Instant attendance status for all registered workers
            </p>
          </div>
        </div>

        {/* Right Side Header Controls + Opacity Progressive Indicator + Auto-Scroll Switch */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Auto-Scroll Toggle Switch */}
          <div 
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-xl border select-none cursor-pointer transition-all min-w-0 ${
              isAutoScrollActive
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-500"
                : "bg-neutral-500/10 border-neutral-500/20 text-neutral-400 hover:border-neutral-500/40"
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
                isAutoScrollActive ? "bg-emerald-500" : "bg-neutral-600 dark:bg-neutral-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isAutoScrollActive ? "translate-x-3" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Linear Progressive Transparency/Opacity Indicator Slider */}
          <div 
            className="flex items-center space-x-1.5 px-2 py-1 rounded-xl bg-neutral-500/10 border border-neutral-500/20 select-none cursor-default min-w-0"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            title="Adjust Container Transparency / Opacity"
          >
            <div className="flex items-center space-x-1 text-neutral-400 min-w-0">
              <Sliders className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="hidden md:inline text-[9px] font-mono font-medium uppercase tracking-wider text-neutral-400 truncate max-w-[50px]">
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
                className="w-full h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
              />
            </div>
            <span className="text-[10px] font-mono font-bold w-7 text-right text-emerald-600 dark:text-emerald-400 shrink-0">
              {Math.round(containerOpacity * 100)}%
            </span>
          </div>

          <div className="flex items-center space-x-0.5 border-l border-neutral-500/20 pl-1.5">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-xl hover:bg-neutral-500/15 text-neutral-400 hover:text-white transition-colors"
              title="Minimize Overlay"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors"
              title="Close Overlay"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col p-4 sm:p-5 overflow-visible gap-3.5 min-h-0">
        {/* Live Summary Counters Panel */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 shrink-0">
          <div className="p-2 sm:p-2.5 rounded-2xl border bg-neutral-500/5 border-neutral-500/15 text-center flex flex-col items-center justify-center min-w-0">
            <span className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider truncate w-full block text-center" title="Total Workers">Total</span>
            <span className="text-sm sm:text-base font-bold font-mono truncate w-full block text-center">{summaryCounters.total}</span>
          </div>
          <div className="p-2 sm:p-2.5 rounded-2xl border bg-emerald-500/10 border-emerald-500/25 text-center flex flex-col items-center justify-center min-w-0">
            <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider truncate w-full block text-center" title="On Time">On Time</span>
            <span className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate w-full block text-center">{summaryCounters.onTime}</span>
          </div>
          <div className="p-2 sm:p-2.5 rounded-2xl border bg-sky-500/10 border-sky-500/25 text-center flex flex-col items-center justify-center min-w-0">
            <span className="text-[10px] uppercase font-semibold text-sky-600 dark:text-sky-400 tracking-wider truncate w-full block text-center" title="Late">Late</span>
            <span className="text-sm sm:text-base font-bold font-mono text-sky-600 dark:text-sky-400 truncate w-full block text-center">{summaryCounters.late}</span>
          </div>
          <div className="p-2 sm:p-2.5 rounded-2xl border bg-amber-500/10 border-amber-500/25 text-center flex flex-col items-center justify-center min-w-0">
            <span className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400 tracking-wider truncate w-full block text-center" title="Permission">Permission</span>
            <span className="text-sm sm:text-base font-bold font-mono text-amber-600 dark:text-amber-400 truncate w-full block text-center">{summaryCounters.onPermission}</span>
          </div>
          <div className="p-2 sm:p-2.5 rounded-2xl border bg-neutral-500/10 border-neutral-500/20 text-center flex flex-col items-center justify-center min-w-0">
            <span className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider truncate w-full block text-center" title="Not In">Not In</span>
            <span className="text-sm sm:text-base font-bold font-mono text-neutral-400 truncate w-full block text-center">{summaryCounters.notInAttendance}</span>
          </div>
        </div>

        {/* Visual Status Legend & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="flex items-center space-x-1.5 font-medium min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm shrink-0"></span>
              <span className="text-neutral-300 truncate max-w-[80px] sm:max-w-none">On Time</span>
            </span>
            <span className="flex items-center space-x-1.5 font-medium min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block shadow-sm shrink-0"></span>
              <span className="text-neutral-300 truncate max-w-[80px] sm:max-w-none">Late</span>
            </span>
            <span className="flex items-center space-x-1.5 font-medium min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-sm shrink-0"></span>
              <span className="text-neutral-300 truncate max-w-[80px] sm:max-w-none" title="Permission">Permission</span>
            </span>
            <span className="flex items-center space-x-1.5 font-medium min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 inline-block shadow-sm shrink-0"></span>
              <span className="text-neutral-400 truncate max-w-[95px] sm:max-w-none" title="Not in Attendance">Not in Attendance</span>
            </span>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            {/* Sort Field Custom Dropdown List Modal & Order Toggle */}
            <div className="relative flex items-center space-x-1 z-30">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSortDropdownOpen((prev) => !prev)}
                  className={`pl-3 pr-3.5 py-1.5 rounded-xl border flex items-center justify-between space-x-2.5 cursor-pointer transition-all shadow-sm ${
                    isDarkMode
                      ? "bg-neutral-800 border-neutral-700 text-neutral-200 hover:border-emerald-500/50"
                      : "bg-neutral-100 border-neutral-200 text-slate-800 hover:border-emerald-500/50"
                  }`}
                  title="Sort Workers List"
                >
                  <div className="flex items-center space-x-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-[11px] font-semibold text-neutral-400 hidden sm:inline whitespace-nowrap">
                      Sort:
                    </span>
                    <span className="text-xs font-bold whitespace-nowrap">
                      {sortField === "name" && "Name"}
                      {sortField === "department" && "Department"}
                      {sortField === "status" && "Status"}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-neutral-400 shrink-0 transition-transform duration-200 ml-2.5 ${
                      isSortDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown List Modal */}
                <AnimatePresence>
                  {isSortDropdownOpen && (
                    <>
                      {/* Backdrop overlay to close on click outside */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsSortDropdownOpen(false)}
                      />

                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className={`absolute right-0 top-full mt-1.5 w-56 sm:w-60 max-w-[calc(100vw-3rem)] rounded-2xl border p-2 shadow-2xl z-50 backdrop-blur-xl max-h-[220px] overflow-y-auto scrollbar-thin ${
                          isDarkMode
                            ? "bg-neutral-900/98 border-neutral-700 text-white shadow-black/80"
                            : "bg-white/98 border-neutral-200 text-slate-900 shadow-slate-300/80"
                        }`}
                      >
                        <div className="px-3 py-1.5 border-b border-neutral-500/15 mb-1 flex items-center justify-between sticky top-0 bg-inherit backdrop-blur-md z-10">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                            Sort Workers By
                          </span>
                          <span className="text-[10px] font-mono text-emerald-500 font-semibold">
                            {sortOrder === "asc" ? "A → Z" : "Z → A"}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {[
                            { id: "name", label: "Worker Name", desc: "Alphabetical by worker full name" },
                            { id: "department", label: "Department", desc: "Group workers by department" },
                            { id: "status", label: "Attendance Status", desc: "On Time, Late, Permission, Not In" },
                          ].map((opt) => {
                            const isSelected = sortField === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setSortField(opt.id as AttendanceSortField);
                                  setIsSortDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold"
                                    : isDarkMode
                                    ? "text-neutral-200 hover:bg-neutral-800"
                                    : "text-slate-800 hover:bg-neutral-100"
                                }`}
                              >
                                <div>
                                  <div className="text-xs font-semibold">{opt.label}</div>
                                  <div className="text-[10px] text-neutral-400 leading-tight">{opt.desc}</div>
                                </div>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                className={`p-2 rounded-xl border transition-colors ${
                  isDarkMode
                    ? "bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white"
                    : "bg-white border-neutral-200 text-slate-600 hover:text-slate-900 shadow-sm"
                }`}
                title={`Sort Order: ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
              >
                {sortOrder === "asc" ? (
                  <ArrowUp className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-[160px] min-w-[90px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search worker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-3 py-1 rounded-xl text-xs border outline-none transition-all truncate ${
                  isDarkMode
                    ? "bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500 focus:border-emerald-500/50 shadow-sm"
                    : "bg-white border-neutral-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500/50 shadow-sm"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setFilterTab("ALL")}
            className={`px-3 py-1 rounded-xl transition-all shrink-0 ${
              filterTab === "ALL"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 font-bold"
                : isDarkMode
                ? "bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800"
                : "bg-neutral-100 text-slate-600 hover:bg-neutral-200"
            }`}
          >
            All ({summaryCounters.total})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("ON_TIME")}
            className={`px-3 py-1 rounded-xl transition-all shrink-0 ${
              filterTab === "ON_TIME"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 font-bold"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
            }`}
          >
            On Time ({summaryCounters.onTime})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("LATE")}
            className={`px-3 py-1 rounded-xl transition-all shrink-0 ${
              filterTab === "LATE"
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/20 font-bold"
                : "bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20"
            }`}
          >
            Late ({summaryCounters.late})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("ON_PERMISSION")}
            className={`px-2.5 sm:px-3 py-1 rounded-xl transition-all shrink-0 truncate max-w-[130px] sm:max-w-none ${
              filterTab === "ON_PERMISSION"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20 font-bold"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
            }`}
            title={`Permission (${summaryCounters.onPermission})`}
          >
            Permission ({summaryCounters.onPermission})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("NOT_IN_ATTENDANCE")}
            className={`px-3 py-1 rounded-xl transition-all shrink-0 ${
              filterTab === "NOT_IN_ATTENDANCE"
                ? "bg-neutral-500 text-white shadow-md shadow-neutral-500/20 font-bold"
                : "bg-neutral-500/10 text-neutral-400 hover:bg-neutral-500/20"
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
          className={`flex-1 overflow-auto rounded-2xl border ${
            isDarkMode ? "bg-neutral-950/50 border-neutral-800" : "bg-neutral-50/50 border-neutral-200"
          }`}
        >
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <thead className="sticky top-0 z-10">
              <tr
                className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                  isDarkMode ? "bg-neutral-900 border-neutral-800 text-neutral-400" : "bg-neutral-100 border-neutral-200 text-neutral-500"
                }`}
              >
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
                  className="py-2.5 px-3 cursor-pointer hover:text-emerald-500 transition-colors select-none w-1/3 min-w-0"
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
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-emerald-500 transition-colors select-none w-1/3 min-w-0"
                  title="Sort by Attendance Status"
                >
                  <div className="flex items-center justify-end space-x-1 min-w-0">
                    <span className="truncate">Status</span>
                    {sortField === "status" ? (
                      sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-500 shrink-0" /> : <ArrowDown className="w-3 h-3 text-emerald-500 shrink-0" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-40 shrink-0" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/10">
              {filteredList.length > 0 ? (
                filteredList.map((worker, index) => (
                  <tr
                    key={worker.id || index}
                    className={`transition-colors hover:bg-emerald-500/5 ${
                      isDarkMode ? "hover:bg-neutral-800/50" : "hover:bg-neutral-100"
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-neutral-400">
                      {index + 1}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-neutral-200 min-w-0">
                      <div className="flex items-center space-x-2 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full ${worker.dotColor} shrink-0`}
                        />
                        <span className="truncate block" title={worker.name}>{worker.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-500 dark:text-neutral-400 font-medium min-w-0">
                      <span className="truncate block" title={worker.department}>{worker.department}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right min-w-0">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border truncate max-w-[85px] xs:max-w-[120px] sm:max-w-none align-middle ${worker.badgeColor}`}
                        title={worker.statusLabel}
                      >
                        {worker.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-neutral-400 font-medium">
                    No registered workers found matching filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resize handle in bottom-right corner */}
      <div
        onMouseDown={handleMouseDownResize}
        className="absolute bottom-1 right-1 p-1 cursor-se-resize text-neutral-400 hover:text-emerald-400 transition-colors"
        title="Drag to resize panel"
      >
        <GripHorizontal className="w-4 h-4 rotate-45" />
      </div>
    </div>
  );
};
