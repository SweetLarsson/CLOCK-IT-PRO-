import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

interface CustomDatePickerProps {
  value: string; // Expected "YYYY-MM-DD" or ""
  onChange: (dateString: string) => void;
  theme?: "army" | "navy" | "dark" | "light" | string;
  className?: string;
  placeholder?: string;
  id?: string;
  alignRight?: boolean;
  maxDate?: string; // "YYYY-MM-DD"
  disableFutureDates?: boolean;
}

export default function CustomDatePicker({
  value,
  onChange,
  theme = "dark",
  className = "",
  placeholder = "Select date...",
  id,
  alignRight = false,
  maxDate,
  disableFutureDates = false
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Today reference string
  const todayStr = useMemo(() => {
    const d = new Date();
    const yStr = String(d.getFullYear()).padStart(4, "0");
    const mStr = String(d.getMonth() + 1).padStart(2, "0");
    const dStr = String(d.getDate()).padStart(2, "0");
    return `${yStr}-${mStr}-${dStr}`;
  }, []);

  const effectiveMaxDate = useMemo(() => {
    if (disableFutureDates && maxDate) {
      return maxDate < todayStr ? maxDate : todayStr;
    }
    if (disableFutureDates) return todayStr;
    return maxDate;
  }, [disableFutureDates, maxDate, todayStr]);

  // Position state for portal
  const [popoverPosition, setPopoverPosition] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    isPlacementAbove: boolean;
  }>({
    left: 0,
    isPlacementAbove: false
  });

  const parsedTheme = useMemo(() => {
    if (theme === "army" || theme === "navy" || theme === "light" || theme === "dark") {
      return theme;
    }
    return "dark";
  }, [theme]);

  // Derive initial year and month
  const initialDate = useMemo(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());

  // Update view when value changes
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split("-").map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [value]);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    // Reduced by ~0.5x width footprint (215px vs 320px)
    const popoverWidth = Math.min(215, viewportWidth - 16);
    const spaceBelow = viewportHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;

    // Flip above if space below is < 230px and space above is greater
    const isPlacementAbove = spaceBelow < 230 && spaceAbove > spaceBelow;

    let left = alignRight
      ? rect.right - popoverWidth
      : rect.left;

    // Clamp left within viewport
    left = Math.max(8, Math.min(left, viewportWidth - popoverWidth - 8));

    if (isPlacementAbove) {
      setPopoverPosition({
        bottom: viewportHeight - rect.top + 4,
        left,
        isPlacementAbove: true
      });
    } else {
      setPopoverPosition({
        top: rect.bottom + 4,
        left,
        isPlacementAbove: false
      });
    }
  }, [alignRight]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScroll = () => updatePosition();
      const handleResize = () => updatePosition();
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [isOpen, updatePosition]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const formatDateString = (year: number, month: number, day: number) => {
    const yStr = String(year).padStart(4, "0");
    const mStr = String(month + 1).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    return `${yStr}-${mStr}-${dStr}`;
  };

  const getDisplayString = () => {
    if (!value) return placeholder;
    try {
      const parts = value.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric"
        });
      }
    } catch {
      // fallback
    }
    return value;
  };

  // Theme-specific styles (Compact 0.5x scale)
  const activeThemeClass = useMemo(() => {
    switch (parsedTheme) {
      case "army":
        return {
          panelBg: "bg-[#182313] border border-[#2D4222] text-[#E5F3DD]",
          headerBorder: "border-[#2D4222]",
          buttonHover: "hover:bg-[#25361E] text-[#A0BCA2] hover:text-[#E5F3DD]",
          monthText: "text-[#E5F3DD]",
          mutedText: "text-[#7A987D]",
          daySelected: "bg-emerald-600 text-white font-bold rounded-lg shadow-xs",
          todayBorder: "border-emerald-500/70 text-emerald-300 font-bold rounded-lg",
          dayHoverCurrent: "hover:bg-[#25361E] text-[#E5F3DD] rounded-lg",
          dayMuted: "text-[#495E46] hover:bg-[#202E1B] rounded-lg",
          footerBtn: "text-emerald-400 hover:underline font-semibold"
        };
      case "navy":
        return {
          panelBg: "bg-[#111A35] border border-[#202E5A] text-[#E1E8F0]",
          headerBorder: "border-[#202E5A]",
          buttonHover: "hover:bg-[#243361] text-[#8DA9C4] hover:text-[#E1E8F0]",
          monthText: "text-[#E1E8F0]",
          mutedText: "text-[#627D98]",
          daySelected: "bg-cyan-600 text-white font-bold rounded-lg shadow-xs",
          todayBorder: "border-cyan-500/70 text-cyan-300 font-bold rounded-lg",
          dayHoverCurrent: "hover:bg-[#243361] text-[#E1E8F0] rounded-lg",
          dayMuted: "text-[#3E5270] hover:bg-[#1A264D] rounded-lg",
          footerBtn: "text-cyan-400 hover:underline font-semibold"
        };
      case "light":
        return {
          panelBg: "bg-white border border-neutral-200 text-slate-900",
          headerBorder: "border-neutral-200",
          buttonHover: "hover:bg-neutral-100 text-slate-600 hover:text-slate-900",
          monthText: "text-slate-900",
          mutedText: "text-slate-400",
          daySelected: "bg-cyan-600 text-white font-bold rounded-lg shadow-xs",
          todayBorder: "border-cyan-500 text-cyan-700 font-bold rounded-lg",
          dayHoverCurrent: "hover:bg-neutral-100 text-slate-800 rounded-lg",
          dayMuted: "text-slate-300 hover:bg-neutral-50 rounded-lg",
          footerBtn: "text-cyan-600 hover:underline font-semibold"
        };
      case "dark":
      default:
        return {
          panelBg: "bg-[#0D0D0D] border border-[#262626] text-white",
          headerBorder: "border-[#262626]",
          buttonHover: "hover:bg-[#1A1A1A] text-neutral-400 hover:text-white",
          monthText: "text-white",
          mutedText: "text-neutral-400",
          daySelected: "bg-cyan-500 text-black font-bold rounded-lg shadow-xs shadow-cyan-500/20",
          todayBorder: "border-cyan-500/70 text-cyan-300 font-bold rounded-lg",
          dayHoverCurrent: "hover:bg-[#1A1A1A] text-neutral-200 rounded-lg",
          dayMuted: "text-neutral-600 hover:bg-[#141414] rounded-lg",
          footerBtn: "text-cyan-400 hover:underline font-semibold"
        };
    }
  }, [parsedTheme]);

  // Calendar Calculation logic
  const daysInMonthCount = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayWeekdayIndex = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
  const calendarDays: Array<{
    day: number;
    month: "prev" | "current" | "next";
    year: number;
    isCurrent: boolean;
  }> = [];

  // Buffer days from previous month
  for (let i = firstDayWeekdayIndex - 1; i >= 0; i--) {
    const prevMonthIdx = viewMonth - 1 < 0 ? 11 : viewMonth - 1;
    const prevYearVal = viewMonth - 1 < 0 ? viewYear - 1 : viewYear;
    calendarDays.push({
      day: prevMonthLastDay - i,
      month: "prev",
      year: prevYearVal,
      isCurrent: false
    });
  }

  // Days of current month
  for (let d = 1; d <= daysInMonthCount; d++) {
    calendarDays.push({
      day: d,
      month: "current",
      year: viewYear,
      isCurrent: true
    });
  }

  // Buffer days from next month to complete standard grid (multiple of 7)
  const totalDaysAdded = calendarDays.length;
  const remainingSquares = (7 - (totalDaysAdded % 7)) % 7;
  for (let d = 1; d <= (totalDaysAdded + remainingSquares < 35 ? remainingSquares + 7 : remainingSquares); d++) {
    const nextMonthIdx = viewMonth + 1 > 11 ? 0 : viewMonth + 1;
    const nextYearVal = viewMonth + 1 > 11 ? viewYear + 1 : viewYear;
    calendarDays.push({
      day: d,
      month: "next",
      year: nextYearVal,
      isCurrent: false
    });
  }

  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const themeMonths = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];

  const handleSelectDay = (
    day: number,
    targetMonth: "prev" | "current" | "next",
    targetYear: number,
    isDisabled: boolean
  ) => {
    if (isDisabled) return;
    let finalMonth = viewMonth;
    let finalYear = targetYear;
    if (targetMonth === "prev") {
      finalMonth = viewMonth - 1 < 0 ? 11 : viewMonth - 1;
    } else if (targetMonth === "next") {
      finalMonth = viewMonth + 1 > 11 ? 0 : viewMonth + 1;
    }
    const valueStr = formatDateString(finalYear, finalMonth, day);
    onChange(valueStr);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setIsOpen(false);
  };

  const popoverContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          style={{
            position: "fixed",
            top: popoverPosition.top !== undefined ? `${popoverPosition.top}px` : undefined,
            bottom: popoverPosition.bottom !== undefined ? `${popoverPosition.bottom}px` : undefined,
            left: `${popoverPosition.left}px`,
            width: "215px",
            maxWidth: "calc(100vw - 16px)",
            zIndex: 99999
          }}
          className={`rounded-2xl shadow-2xl p-2.5 select-none ${activeThemeClass.panelBg}`}
        >
          {/* Header Area - Compact 0.5x Scale */}
          <div
            className={`flex items-center justify-between mb-2 pb-1.5 border-b ${activeThemeClass.headerBorder}`}
          >
            <button
              type="button"
              onClick={handlePrevMonth}
              className={`p-1 rounded-lg transition-all cursor-pointer flex items-center justify-center ${activeThemeClass.buttonHover}`}
              title="Previous Month"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center space-x-1">
              <span className={`text-xs font-bold leading-tight ${activeThemeClass.monthText}`}>
                {themeMonths[viewMonth]} {viewYear}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className={`p-1 rounded-lg transition-all cursor-pointer flex items-center justify-center ${activeThemeClass.buttonHover}`}
              title="Next Month"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Weekday Titles */}
          <div
            className={`grid grid-cols-7 text-center mb-1 text-[9px] font-bold tracking-wide ${activeThemeClass.mutedText}`}
          >
            {weekdays.map((wd) => (
              <div key={wd} className="py-0.5">
                {wd}
              </div>
            ))}
          </div>

          {/* Monthly Day Grid - 0.5x Reduced Size */}
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {calendarDays.map((calDay, idx) => {
              const dateKey = formatDateString(
                calDay.year,
                calDay.month === "prev"
                  ? viewMonth - 1
                  : calDay.month === "next"
                  ? viewMonth + 1
                  : viewMonth,
                calDay.day
              );
              const isSelected = value === dateKey;
              const isToday = todayStr === dateKey;
              const isDisabled = Boolean(effectiveMaxDate && dateKey > effectiveMaxDate);

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(calDay.day, calDay.month, calDay.year, isDisabled)}
                  className={`h-6 w-full flex items-center justify-center text-[10px] font-medium transition-all border border-transparent select-none rounded-md ${
                    isDisabled
                      ? "opacity-25 cursor-not-allowed pointer-events-none line-through"
                      : isSelected
                      ? activeThemeClass.daySelected
                      : isToday
                      ? activeThemeClass.todayBorder
                      : calDay.month === "current"
                      ? `${activeThemeClass.dayHoverCurrent} cursor-pointer`
                      : `${activeThemeClass.dayMuted} cursor-pointer opacity-50`
                  }`}
                >
                  <span>{calDay.day}</span>
                </button>
              );
            })}
          </div>

          {/* Footer Options Bar - Compact */}
          <div
            className={`flex items-center justify-between mt-2 pt-1.5 border-t text-[9px] ${activeThemeClass.headerBorder}`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (effectiveMaxDate && todayStr > effectiveMaxDate) {
                  onChange(effectiveMaxDate);
                } else {
                  onChange(todayStr);
                }
                setIsOpen(false);
              }}
              className={activeThemeClass.footerBtn}
            >
              Today
            </button>

            {value && (
              <button
                type="button"
                onClick={handleClear}
                className={`px-1.5 py-0.5 hover:text-red-500 font-semibold transition-colors cursor-pointer flex items-center gap-0.5 hover:bg-red-500/10 rounded-md border border-transparent hover:border-red-500/20 ${activeThemeClass.mutedText}`}
              >
                <X className="h-2.5 w-2.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div ref={containerRef} id={id} className="relative w-full">
      {/* Trigger Field */}
      <button
        type="button"
        onClick={() => {
          if (!isOpen) {
            updatePosition();
          }
          setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between text-left transition-all relative border outline-none min-h-[40px] pl-9 pr-8 rounded-xl cursor-pointer shadow-xs select-none ${
          isOpen ? "border-cyan-500 ring-2 ring-cyan-500/10" : ""
        } ${className}`}
      >
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 hover:text-cyan-400 transition-colors pointer-events-none">
          <CalendarIcon className="h-3.5 w-3.5" />
        </span>
        <span className={`text-xs truncate ${!value ? "text-neutral-500" : ""}`}>
          {getDisplayString()}
        </span>
        {/* Padded right indicator */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 dark:text-neutral-500">
          <ChevronRight
            className={`h-3 w-3 transform transition-transform duration-200 ${
              isOpen ? "rotate-90 text-cyan-400" : ""
            }`}
          />
        </span>
      </button>

      {/* Render via Portal so it displays over ALL collapsible containers, cards, and modals */}
      {typeof document !== "undefined" && ReactDOM.createPortal(popoverContent, document.body)}
    </div>
  );
}
