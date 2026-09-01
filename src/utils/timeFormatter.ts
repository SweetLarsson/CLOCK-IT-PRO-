/**
 * Standardized Time and Shift Duration Formatting Utilities
 * Adheres to global HH:MM:SS duration display and dynamic Performance Index calculation
 */

export function formatDurationHHMMSS(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || isNaN(totalSeconds) || totalSeconds <= 0) {
    return "00:00:00";
  }

  const rounded = Math.floor(totalSeconds);
  const hrs = Math.floor(rounded / 3600);
  const mins = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

export function parseTimeToSeconds(timeStr: string | null | undefined): number {
  if (!timeStr) return 0;
  try {
    const parts = timeStr.trim().split(":");
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const s = parts.length > 2 ? parseInt(parts[2], 10) || 0 : 0;
    return h * 3600 + m * 60 + s;
  } catch {
    return 0;
  }
}

export function getClosingTimeForDate(dateStr?: string, settings?: any): string {
  if (!settings) return "17:00";

  if (dateStr && settings.dailyShiftTimes) {
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayName = dayNames[d.getDay()];
        if (settings.dailyShiftTimes[dayName]?.out) {
          return settings.dailyShiftTimes[dayName].out;
        }
      }
    } catch {
      // Fallback
    }
  }

  return settings.checkOut?.time || settings.closingTime || "17:00";
}

/**
 * Calculates shift duration in seconds.
 * Critical Rule: Any worker who clocks in after the configured workday closing time
 * MUST have their shift duration recorded/calculated as 0 seconds (00:00:00).
 */
export function calculateShiftSeconds(
  record: { timeIn?: string | null; timeOut?: string | null; coveredTime?: number | null; date?: string },
  settings?: any
): number {
  if (!record || !record.timeIn) {
    return 0;
  }

  const closingTimeStr = getClosingTimeForDate(record.date, settings);
  const closingSecs = parseTimeToSeconds(closingTimeStr);
  const inSecs = parseTimeToSeconds(record.timeIn);

  // If clock-in happened at or after the configured workday close, shift hours = 00:00:00
  if (closingSecs > 0 && inSecs >= closingSecs) {
    return 0;
  }

  if (record.timeOut) {
    const outSecs = parseTimeToSeconds(record.timeOut);
    if (outSecs > inSecs) {
      let duration = outSecs - inSecs;
      return Math.max(0, duration);
    }
    // If checkout time is past midnight or equal
    if (record.coveredTime !== undefined && record.coveredTime !== null && record.coveredTime > 0) {
      return record.coveredTime;
    }
    return 0;
  }

  if (record.coveredTime !== undefined && record.coveredTime !== null && record.coveredTime > 0) {
    return record.coveredTime;
  }

  return 0;
}

/**
 * Performance Index Formula:
 * Performance Index = (Present Days ÷ Total Expected Workdays) × 100
 * Displayed to 2 decimal places.
 */
export function calculatePerformanceIndex(presentDays: number, totalExpectedWorkdays: number): number {
  if (!totalExpectedWorkdays || totalExpectedWorkdays <= 0) {
    return 0;
  }
  const index = (presentDays / totalExpectedWorkdays) * 100;
  return Number(Math.min(100, Math.max(0, index)).toFixed(2));
}

export function formatPerformanceIndex(presentDays: number, totalExpectedWorkdays: number): string {
  const score = calculatePerformanceIndex(presentDays, totalExpectedWorkdays);
  return `${score.toFixed(2)}%`;
}
