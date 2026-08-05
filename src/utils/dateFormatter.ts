export function formatDateToCustomString(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    let dateObj: Date;
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      dateObj = new Date(year, month, day);
    } else {
      dateObj = new Date(dateStr);
    }

    if (isNaN(dateObj.getTime())) {
      return dateStr;
    }

    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const weekday = weekdays[dateObj.getDay()];
    const day = dateObj.getDate();
    const month = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();

    // Suffix for the day (e.g., 1st, 2nd, 3rd, 4th...)
    let suffix = "th";
    if (day === 1 || day === 21 || day === 31) {
      suffix = "st";
    } else if (day === 2 || day === 22) {
      suffix = "nd";
    } else if (day === 3 || day === 23) {
      suffix = "rd";
    }

    return `${weekday} ${day}${suffix} ${month} ${year}`;
  } catch (e) {
    return dateStr;
  }
}

export function groupNotificationsByDate<T extends { timestamp: string | number }>(notifs: T[]): { label: string; items: T[] }[] {
  if (!notifs || notifs.length === 0) return [];

  const sorted = [...notifs].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    const validA = isNaN(timeA) ? 0 : timeA;
    const validB = isNaN(timeB) ? 0 : timeB;
    return validB - validA;
  });

  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const groupsMap = new Map<string, { label: string; items: T[] }>();

  sorted.forEach((n) => {
    const d = new Date(n.timestamp);
    const dateStr = isNaN(d.getTime()) ? "unknown" : d.toDateString();

    let label = "";
    if (dateStr === todayStr) {
      label = "Today";
    } else if (dateStr === yesterdayStr) {
      label = "Yesterday";
    } else if (dateStr === "unknown") {
      label = "Recent";
    } else {
      label = d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    if (!groupsMap.has(dateStr)) {
      groupsMap.set(dateStr, { label, items: [] });
    }
    groupsMap.get(dateStr)!.items.push(n);
  });

  return Array.from(groupsMap.values());
}

