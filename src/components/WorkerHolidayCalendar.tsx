import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Globe, 
  Sparkles, 
  Info, 
  X, 
  CheckCircle2,
  CalendarDays,
  PartyPopper
} from "lucide-react";
import { TenantSettings, User, Permission } from "../types.js";
import { 
  getHolidayForDate, 
  getDateInTimezone, 
  ApprovedHolidayInfo, 
  DEFAULT_INTERNATIONAL_HOLIDAYS 
} from "../utils/holidayUtils.js";

interface WorkerHolidayCalendarProps {
  user: User;
  settings?: TenantSettings;
  permissions: Permission[];
  themeClass: any;
  translations: any;
  isDark?: boolean;
}

export const WorkerHolidayCalendar: React.FC<WorkerHolidayCalendarProps> = ({
  user,
  settings,
  permissions,
  themeClass,
  translations,
  isDark
}) => {
  const isHolidayEnabled = settings?.holidayManagementEnabled !== false;
  const companyTz = settings?.timezone || "UTC";

  // Current real-world date in company timezone
  const nowInTz = getDateInTimezone(new Date(), companyTz);

  // Calendar navigation state
  const [viewYear, setViewYear] = useState<number>(nowInTz.year);
  const [viewMonthIndex, setViewMonthIndex] = useState<number>(nowInTz.monthIndex); // 0-11

  // Selected holiday for modal/drawer details
  const [selectedHoliday, setSelectedHoliday] = useState<ApprovedHolidayInfo | null>(null);

  // Background scroll lock when modal is open
  useEffect(() => {
    if (selectedHoliday) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedHoliday]);

  // Calendar math
  const daysInMonth = new Date(viewYear, viewMonthIndex + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonthIndex, 1).getDay(); // 0 = Sunday

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handlePrevMonth = () => {
    if (viewMonthIndex === 0) {
      setViewMonthIndex(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonthIndex((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonthIndex === 11) {
      setViewMonthIndex(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonthIndex((prev) => prev + 1);
    }
  };

  const handleJumpToday = () => {
    setViewYear(nowInTz.year);
    setViewMonthIndex(nowInTz.monthIndex);
  };

  // Check worker's scheduled days
  const activeDays = (user?.activityDays && Object.keys(user.activityDays).length > 0)
    ? user.activityDays
    : ((settings?.activityDays && Object.keys(settings.activityDays).length > 0)
      ? settings.activityDays
      : {
          Monday: true, Tuesday: true, Wednesday: true, Thursday: true, Friday: true, Saturday: false, Sunday: false
        });

  const fullDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Filter worker's approved leave permissions
  const personalPermissions = permissions.filter(
    (p) => p.worker_id === user.id && (p.status || "").toLowerCase() === "approved"
  );

  const isDayInApprovedLeave = (year: number, monthIndex: number, day: number) => {
    const targetDateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return personalPermissions.some((p) => {
      return targetDateStr >= p.startDate && targetDateStr <= p.endDate;
    });
  };

  // Compile list of upcoming approved holidays for the current year
  const getUpcomingHolidays = () => {
    if (!isHolidayEnabled || !settings) return [];

    const list: (ApprovedHolidayInfo & { fullDate: Date; daysRemaining: number })[] = [];
    const todayMidnight = new Date(nowInTz.year, nowInTz.monthIndex, nowInTz.day);

    // 1. Custom Holidays
    if (settings.customHolidays) {
      settings.customHolidays.forEach((ch) => {
        if (ch.enabled === false) return;
        if (ch.year && !ch.repeatsAnnually && ch.year !== nowInTz.year) return;

        const hDate = new Date(nowInTz.year, ch.month - 1, ch.day);
        const diffMs = hDate.getTime() - todayMidnight.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        list.push({
          id: ch.id,
          name: ch.name,
          description: ch.description || "Official company-approved custom holiday.",
          type: "custom",
          month: ch.month,
          day: ch.day,
          year: ch.year,
          repeatsAnnually: ch.repeatsAnnually,
          dateDisplay: `${monthNames[ch.month - 1]} ${ch.day}`,
          fullDate: hDate,
          daysRemaining: diffDays
        });
      });
    }

    // 2. International Holidays
    const intlList = (settings.internationalHolidays && settings.internationalHolidays.length > 0)
      ? settings.internationalHolidays
      : DEFAULT_INTERNATIONAL_HOLIDAYS;

    intlList.forEach((ih) => {
      if (ih.enabled === false) return;

      const hDate = new Date(nowInTz.year, ih.month - 1, ih.day);
      const diffMs = hDate.getTime() - todayMidnight.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      list.push({
        id: ih.id,
        name: ih.name,
        description: ih.description,
        type: "international",
        month: ih.month,
        day: ih.day,
        repeatsAnnually: true,
        dateDisplay: `${monthNames[ih.month - 1]} ${ih.day}`,
        fullDate: hDate,
        daysRemaining: diffDays
      });
    });

    // Sort by calendar sequence
    return list.sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());
  };

  const allApprovedHolidays = getUpcomingHolidays();
  const futureApprovedHolidays = allApprovedHolidays.filter((h) => h.daysRemaining >= 0);

  return (
    <div className="space-y-6 font-sans">
      {/* 1. CALENDAR CONTAINER */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`p-5 sm:p-6 rounded-3xl border shadow-md space-y-4 ${themeClass.cardBg} ${themeClass.accentBorder}`}
      >
        {/* Calendar Header with navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200/15">
          <div>
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4 text-cyan-400" />
              <h3 className={`text-sm sm:text-base font-bold tracking-tight ${themeClass.textTitle}`}>
                {monthNames[viewMonthIndex]} {viewYear}
              </h3>
            </div>
            <p className={`text-[11px] font-light mt-0.5 flex items-center gap-1.5 ${themeClass.textMuted}`}>
              <Clock className="h-3 w-3 text-neutral-400" />
              <span>Timezone: <strong>{companyTz}</strong></span>
              {!isHolidayEnabled && (
                <span className="text-amber-400 font-medium ml-1">• Holiday Automations Paused</span>
              )}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="worker_cal_jump_today_btn"
              type="button"
              onClick={handleJumpToday}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${themeClass.innerBg} ${themeClass.textMuted} hover:${themeClass.textTitle}`}
            >
              Today
            </button>

            <div className="flex items-center space-x-1">
              <button
                id="worker_cal_prev_month_btn"
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous Month"
                className={`h-8 w-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${themeClass.innerBg} ${themeClass.textMuted} hover:${themeClass.textTitle}`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                id="worker_cal_next_month_btn"
                type="button"
                onClick={handleNextMonth}
                aria-label="Next Month"
                className={`h-8 w-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${themeClass.innerBg} ${themeClass.textMuted} hover:${themeClass.textTitle}`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] sm:text-[11px] text-neutral-400">
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 shadow-sm shadow-cyan-500/50" />
            <span>Approved Holiday</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>Scheduled Shift</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-400" />
            <span>Approved Leave</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-600" />
            <span>Rest / Off Day</span>
          </div>
        </div>

        {/* 7-column Calendar Matrix */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {/* Weekday headers */}
          {weekdayNames.map((wName) => (
            <div
              key={wName}
              className="py-2 text-center font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400"
            >
              {wName}
            </div>
          ))}

          {/* Empty cells before month starts */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-14 sm:h-20 rounded-2xl bg-neutral-500/5 opacity-25" />
          ))}

          {/* Days of current month */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayOfWeekIdx = new Date(viewYear, viewMonthIndex, day).getDay();
            const dayOfWeekName = fullDayNames[dayOfWeekIdx];
            const isWorkDay = activeDays[dayOfWeekName] === true;
            const isToday = viewYear === nowInTz.year && viewMonthIndex === nowInTz.monthIndex && day === nowInTz.day;
            const holiday = isHolidayEnabled ? getHolidayForDate(viewYear, viewMonthIndex, day, settings) : null;
            const hasLeave = isDayInApprovedLeave(viewYear, viewMonthIndex, day);

            return (
              <div
                key={`day-${day}`}
                onClick={() => holiday && setSelectedHoliday(holiday)}
                className={`relative h-14 sm:h-20 p-1.5 sm:p-2 rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                  holiday 
                    ? "bg-gradient-to-br from-cyan-950/40 to-blue-950/20 border-cyan-500/40 shadow-sm cursor-pointer hover:border-cyan-400 hover:scale-[1.02]" 
                    : isToday 
                    ? "border-cyan-500/60 bg-cyan-500/10" 
                    : `${themeClass.innerBg} border-neutral-200/10`
                }`}
              >
                {/* Top row: day number and icons */}
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-xs sm:text-sm font-bold ${
                      isToday 
                        ? "h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[11px]" 
                        : holiday 
                        ? "text-cyan-300 font-extrabold" 
                        : themeClass.textTitle
                    }`}
                  >
                    {day}
                  </span>

                  {/* Status indicators */}
                  <div className="flex items-center space-x-1">
                    {holiday && (
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
                    )}
                    {hasLeave && (
                      <span className="h-2 w-2 rounded-full bg-purple-400" title="Approved Leave" />
                    )}
                    {!holiday && !hasLeave && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isWorkDay ? "bg-emerald-500/80" : "bg-neutral-600"
                        }`}
                      />
                    )}
                  </div>
                </div>

                {/* Bottom label: holiday badge or schedule status */}
                <div className="truncate">
                  {holiday ? (
                    <div className="flex items-center space-x-1 bg-cyan-900/60 text-cyan-200 border border-cyan-700/50 px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold truncate">
                      <Sparkles className="h-2.5 w-2.5 shrink-0 text-cyan-300" />
                      <span className="truncate">{holiday.name}</span>
                    </div>
                  ) : hasLeave ? (
                    <span className="text-[9px] text-purple-300 font-medium truncate block">Leave</span>
                  ) : (
                    <span className={`text-[9px] font-light truncate block ${themeClass.textMuted}`}>
                      {isWorkDay ? "Shift" : "Off"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* 2. UPCOMING APPROVED HOLIDAYS LIST */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className={`p-5 sm:p-6 rounded-3xl border shadow-md space-y-4 ${themeClass.cardBg} ${themeClass.accentBorder}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <h3 className={`text-sm sm:text-base font-bold tracking-tight ${themeClass.textTitle}`}>
              {translations.upcomingHolidays || "Upcoming Organization Holidays"}
            </h3>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${themeClass.innerBg} ${themeClass.textMuted}`}>
            {allApprovedHolidays.length} Observances in {nowInTz.year}
          </span>
        </div>

        {futureApprovedHolidays.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {futureApprovedHolidays.slice(0, 6).map((h) => {
              const isToday = h.daysRemaining === 0;
              const isTomorrow = h.daysRemaining === 1;

              return (
                <div
                  key={h.id}
                  onClick={() => setSelectedHoliday(h)}
                  className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 cursor-pointer transition-all duration-200 hover:scale-[1.01] ${
                    isToday
                      ? "bg-gradient-to-br from-cyan-950/60 to-blue-900/40 border-cyan-400 shadow-md shadow-cyan-950/30"
                      : `${themeClass.innerBg} border-neutral-200/10 hover:border-cyan-500/30`
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Date badge */}
                    <div className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-mono text-center shrink-0">
                      <span className="block text-[9px] uppercase tracking-wider font-bold">
                        {monthNames[h.month - 1].slice(0, 3)}
                      </span>
                      <span className="text-sm font-black">{h.day}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold line-clamp-1 ${themeClass.textTitle}`}>
                          {h.name}
                        </span>
                      </div>
                      <p className={`text-[11px] font-light mt-0.5 line-clamp-2 leading-snug ${themeClass.textMuted}`}>
                        {h.description}
                      </p>
                    </div>
                  </div>

                  {/* Days remaining badge */}
                  <div className="shrink-0 text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider block ${
                      isToday
                        ? "bg-cyan-500 text-white animate-pulse"
                        : isTomorrow
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-neutral-800 text-neutral-300"
                    }`}>
                      {isToday ? "Today!" : isTomorrow ? "Tomorrow" : `In ${h.daysRemaining}d`}
                    </span>
                    <span className="text-[9px] text-neutral-400 mt-1 block capitalize">
                      {h.type}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`p-6 text-center text-xs border border-dashed rounded-2xl ${themeClass.textMuted}`}>
            {isHolidayEnabled 
              ? "No further holidays scheduled for this calendar year."
              : "Holiday management is currently paused by administrator."}
          </div>
        )}
      </motion.div>

      {/* 3. HOLIDAY DETAILS MODAL */}
      <AnimatePresence>
        {selectedHoliday && (
          <div
            id="worker_holiday_modal_backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              id="worker_holiday_modal_card"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto space-y-4 ${themeClass.cardBg} ${themeClass.accentBorder}`}
            >
              <div className="flex items-start justify-between pb-3 border-b border-neutral-200/15">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className={`text-base font-bold ${themeClass.textTitle}`}>
                      {selectedHoliday.name}
                    </h4>
                    <span className="text-xs text-cyan-400 font-semibold flex items-center gap-1.5 mt-0.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {monthNames[selectedHoliday.month - 1]} {selectedHoliday.day}
                      {selectedHoliday.year ? `, ${selectedHoliday.year}` : " (Annual)"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedHoliday(null)}
                  className="h-8 w-8 rounded-full border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono font-bold px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 capitalize">
                  {selectedHoliday.type} Holiday
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  Company Paid Holiday
                </span>
              </div>

              {/* Background & Significance */}
              <div className={`p-4 rounded-2xl border space-y-1.5 ${themeClass.innerBg} ${themeClass.accentBorder}`}>
                <span className={`text-[10px] uppercase font-bold tracking-wider font-mono block ${themeClass.textMuted}`}>
                  Background & Significance
                </span>
                <p className={`text-xs font-light leading-relaxed ${themeClass.textTitle}`}>
                  {selectedHoliday.description}
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedHoliday(null)}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
