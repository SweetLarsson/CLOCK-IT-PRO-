import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CustomDatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string; // Tailwind styling for trigger button
  id?: string;
  alignRight?: boolean;
  theme?: "light" | "dark" | "army" | "navy";
}

export default function CustomDatePicker({
  value,
  onChange,
  placeholder = "Select Date",
  className = "",
  id = "",
  alignRight = false,
  theme = "dark"
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsedTheme = theme || "dark";
  const activeThemeClass = React.useMemo(() => {
    switch (parsedTheme) {
      case "army":
        return {
          panelBg: "bg-[#182413] border-[#2D3E24] text-[#E5F3DD]",
          headerBorder: "border-[#203118]",
          monthText: "text-[#E6F4DE]",
          mutedText: "text-[#A1C094]",
          buttonHover: "hover:bg-[#25361E] hover:text-[#E6F4DE] border-transparent hover:border-[#436134]",
          daySelected: "bg-[#25361E] text-emerald-400 border border-[#436134] font-bold rounded-xl shadow-md",
          todayBorder: "text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 rounded-xl font-bold",
          dayHoverCurrent: "text-[#E6F4DE] hover:bg-[#25361E]/80 hover:text-white rounded-xl hover:scale-105",
          dayMuted: "text-[#A1C094]/40 hover:bg-[#25361E]/50 rounded-xl",
          footerBtn: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
        };
      case "navy":
        return {
          panelBg: "bg-[#111A31] border-[#1C2B54] text-[#E1E8F0]",
          headerBorder: "border-[#152140]",
          monthText: "text-[#ECEFF4]",
          mutedText: "text-[#94A5C1]",
          buttonHover: "hover:bg-[#243361] hover:text-[#ECEFF4] border-transparent hover:border-[#34498C]",
          daySelected: "bg-[#243361] text-cyan-400 border border-[#34498C] font-bold rounded-xl shadow-md",
          todayBorder: "text-cyan-400 border border-cyan-500/20 bg-cyan-500/10 rounded-xl font-bold",
          dayHoverCurrent: "text-[#ECEFF4] hover:bg-[#243361]/80 hover:text-white rounded-xl hover:scale-105",
          dayMuted: "text-[#94A5C1]/40 hover:bg-[#243361]/50 rounded-xl",
          footerBtn: "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
        };
      case "light":
        return {
          panelBg: "bg-white border-neutral-200 text-slate-850 shadow-2xl",
          headerBorder: "border-neutral-150",
          monthText: "text-slate-900",
          mutedText: "text-slate-500",
          buttonHover: "hover:bg-neutral-100 hover:text-slate-950 border-neutral-250",
          daySelected: "bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-bold rounded-xl shadow-md shadow-cyan-950/45",
          todayBorder: "text-cyan-600 border border-cyan-500/20 bg-cyan-50 rounded-xl font-bold",
          dayHoverCurrent: "text-neutral-800 hover:bg-neutral-100 hover:text-slate-950 rounded-xl hover:scale-105",
          dayMuted: "text-neutral-400 hover:bg-neutral-50 rounded-xl",
          footerBtn: "text-cyan-600 bg-cyan-50 border border-cyan-205 hover:bg-cyan-100 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
        };
      case "dark":
      default:
        return {
          panelBg: "bg-[#0F0F0F] border-[#262626] text-[#E5E5E5] shadow-2xl",
          headerBorder: "border-[#202020]",
          monthText: "text-white",
          mutedText: "text-neutral-450",
          buttonHover: "hover:bg-[#1A1A1A] hover:text-[#E5E5E5] border-transparent hover:border-[#333] transition-all",
          daySelected: "bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-bold rounded-xl shadow-md shadow-cyan-950/45",
          todayBorder: "text-cyan-400 border border border-cyan-500/20 bg-cyan-950/15 rounded-xl font-bold",
          dayHoverCurrent: "text-neutral-205 hover:bg-[#1A1A1A] hover:text-white rounded-xl hover:scale-105",
          dayMuted: "text-neutral-600 hover:bg-[#1A1A1A]/50 rounded-xl",
          footerBtn: "text-cyan-400 bg-cyan-950/20 border border-cyan-500/10 hover:bg-cyan-950/40 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
        };
    }
  }, [parsedTheme]);

  // Parse initial date value or default to today
  const getParsedDate = (valStr: string) => {
    if (!valStr) return new Date();
    const parts = valStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date();
  };

  const selectedDate = value ? getParsedDate(value) : null;

  // Track the grid view month/year state
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());

  // Keep viewDate synchronized when selectedDate changes externally
  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [value]);

  // Click outside detection to close the calendar panel
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth(); // 0-11

  // Handle month shifts
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  // Quick helper to format string back to YYYY-MM-DD locally
  const formatDateString = (year: number, month: number, day: number) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

  // Beautiful human display string helper
  const getDisplayString = () => {
    if (!selectedDate) return placeholder;
    return selectedDate.toLocaleDateString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric"
    });
  };

  // Generate calendar days
  const firstDayOfMonthIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const daysInMonthCount = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonthCount = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays: Array<{
    day: number;
    month: "prev" | "current" | "next";
    year: number;
    isCurrent: boolean;
  }> = [];

  // Buffer days from previous month
  for (let i = firstDayOfMonthIndex - 1; i >= 0; i--) {
    const prevMonthIdx = viewMonth - 1 < 0 ? 11 : viewMonth - 1;
    const prevYearVal = viewMonth - 1 < 0 ? viewYear - 1 : viewYear;
    calendarDays.push({
      day: daysInPrevMonthCount - i,
      month: "prev",
      year: prevYearVal,
      isCurrent: false
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonthCount; d++) {
    calendarDays.push({
      day: d,
      month: "current",
      year: viewYear,
      isCurrent: true
    });
  }

  // Buffer days from next month to complete standard grid (multiple of 7, 42 squares preferred)
  const totalDaysAdded = calendarDays.length;
  const remainingSquares = 42 - totalDaysAdded;
  for (let d = 1; d <= remainingSquares; d++) {
    const nextMonthIdx = viewMonth + 1 > 11 ? 0 : viewMonth + 1;
    const nextYearVal = viewMonth + 1 > 11 ? viewYear + 1 : viewYear;
    calendarDays.push({
      day: d,
      month: "next",
      year: nextYearVal,
      isCurrent: false
    });
  }

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const themeMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleSelectDay = (day: number, targetMonth: "prev" | "current" | "next", targetYear: number) => {
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

  return (
    <div ref={containerRef} id={id} className="relative w-full">
      {/* Trigger Field */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between text-left transition-all relative border outline-none min-h-[44px] pl-11 pr-10 rounded-2xl cursor-pointer shadow-sm select-none ${
          isOpen ? "border-cyan-500 ring-2 ring-cyan-500/10" : ""
        } ${className}`}
      >
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 hover:text-cyan-400 transition-colors pointer-events-none">
          <CalendarIcon className="h-4 w-4" />
        </span>
        <span className={`text-sm truncate ${!value ? "text-neutral-500" : ""}`}>
          {getDisplayString()}
        </span>
        {/* Elegant right padded indicator */}
        <span className="absolute right-4.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 dark:text-neutral-505">
          <ChevronRight className={`h-3 w-3 transform transition-transform duration-200 ${isOpen ? "rotate-90 text-cyan-400" : ""}`} />
        </span>
      </button>

      {/* Popover Calendar Grid - Curved rounded corners throughout */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute mt-2 z-50 rounded-2xl shadow-2xl p-4 w-[290px] sm:w-[320px] select-none ${activeThemeClass.panelBg} ${
              alignRight ? "right-0" : "left-0"
            }`}
          >
            {/* Header Area */}
            <div className={`flex items-center justify-between mb-4 pb-2 border-b ${activeThemeClass.headerBorder}`}>
              <button
                type="button"
                onClick={handlePrevMonth}
                className={`p-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${activeThemeClass.buttonHover}`}
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <div className="flex flex-col items-center">
                <span className={`text-sm font-bold leading-tight ${activeThemeClass.monthText}`}>
                  {themeMonths[viewMonth]} {viewYear}
                </span>
                <span className={`text-[9px] font-mono tracking-widest uppercase ${activeThemeClass.mutedText}`}>
                  Interactive Grid
                </span>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className={`p-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${activeThemeClass.buttonHover}`}
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Weekday Titles */}
            <div className={`grid grid-cols-7 text-center mb-1 text-xs font-bold tracking-wide ${activeThemeClass.mutedText}`}>
              {weekdays.map((wd) => (
                <div key={wd} className="py-1">
                  {wd[0]}
                </div>
              ))}
            </div>

            {/* Monthly Day Grid - Grid numbers and highlight selections have beautifully curved edges */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarDays.map((calDay, idx) => {
                const dateKey = formatDateString(calDay.year, calDay.month === "prev" ? viewMonth - 1 : calDay.month === "next" ? viewMonth + 1 : viewMonth, calDay.day);
                const isSelected = value === dateKey;
                const isToday = formatDateString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) === dateKey;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectDay(calDay.day, calDay.month, calDay.year)}
                    className={`h-8 sm:h-9 w-full flex items-center justify-center text-xs font-medium cursor-pointer transition-all border border-transparent select-none ${
                      isSelected
                        ? activeThemeClass.daySelected
                        : isToday
                        ? activeThemeClass.todayBorder
                        : calDay.month === "current"
                        ? activeThemeClass.dayHoverCurrent
                        : activeThemeClass.dayMuted
                    }`}
                  >
                    <span>{calDay.day}</span>
                  </button>
                );
              })}
            </div>

            {/* Footer Options Bar */}
            <div className={`flex items-center justify-between mt-4 pt-3 border-t text-[10px] ${activeThemeClass.headerBorder}`}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const today = new Date();
                  const todayStr = formatDateString(today.getFullYear(), today.getMonth(), today.getDate());
                  onChange(todayStr);
                  setIsOpen(false);
                }}
                className={activeThemeClass.footerBtn}
              >
                Go to Today
              </button>
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className={`px-2.5 py-1.5 hover:text-red-500 font-semibold transition-colors cursor-pointer flex items-center gap-1 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 ${activeThemeClass.mutedText}`}
                >
                  <X className="h-3 w-3" />
                  <span>Clear Selection</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
