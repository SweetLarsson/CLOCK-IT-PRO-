import { InternationalHoliday, CustomHoliday, TenantSettings } from "../types.js";

export interface TimezoneOption {
  value: string;
  label: string;
  region: string;
  offset: string;
}

export const DEFAULT_INTERNATIONAL_HOLIDAYS: InternationalHoliday[] = [
  {
    id: "new_years_day",
    name: "New Year's Day",
    month: 1,
    day: 1,
    description: "Global celebration marking the arrival of the new calendar year across cultures and continents.",
    enabled: true,
    category: "international"
  },
  {
    id: "mlk_day",
    name: "Martin Luther King Jr. Day",
    month: 1,
    day: 19,
    description: "Honors the life, legacy, and civil rights leadership of Dr. Martin Luther King Jr. promoting equality and justice.",
    enabled: true,
    category: "cultural"
  },
  {
    id: "mother_language_day",
    name: "International Mother Language Day",
    month: 2,
    day: 21,
    description: "Promotes linguistic and cultural diversity and multilingualism across regions worldwide.",
    enabled: true,
    category: "heritage"
  },
  {
    id: "commonwealth_day",
    name: "Commonwealth Day",
    month: 3,
    day: 10,
    description: "Annual celebration observed across 56 member nations of the Commonwealth community.",
    enabled: false,
    category: "regional"
  },
  {
    id: "intl_womens_day",
    name: "International Women's Day",
    month: 3,
    day: 8,
    description: "Global focal point commemorating women's social, economic, cultural, and political accomplishments and rights advocacy.",
    enabled: true,
    category: "un_observance"
  },
  {
    id: "world_health_day",
    name: "World Health Day",
    month: 4,
    day: 7,
    description: "Founded by the World Health Organization (WHO) to champion global healthcare accessibility, well-being, and public hygiene.",
    enabled: false,
    category: "un_observance"
  },
  {
    id: "world_heritage_day",
    name: "World Heritage Day",
    month: 4,
    day: 18,
    description: "Celebrates cultural monuments and sites of outstanding universal value across humanity.",
    enabled: true,
    category: "heritage"
  },
  {
    id: "europe_day",
    name: "Europe Day",
    month: 5,
    day: 9,
    description: "Celebrates peace, democratic unity, and international partnership across European nations.",
    enabled: false,
    category: "regional"
  },
  {
    id: "workers_day",
    name: "International Workers' Day / Labour Day",
    month: 5,
    day: 1,
    description: "Dedicated to celebrating workers, laborers, and the historic labor movement's defense of employment dignity and fair hours.",
    enabled: true,
    category: "international"
  },
  {
    id: "africa_day",
    name: "Africa Day",
    month: 5,
    day: 25,
    description: "Annual commemoration of the founding of the Organization of African Unity (now African Union) in 1963.",
    enabled: true,
    category: "cultural"
  },
  {
    id: "world_environment_day",
    name: "World Environment Day",
    month: 6,
    day: 5,
    description: "United Nations flagship day promoting worldwide awareness and environmental preservation initiatives.",
    enabled: false,
    category: "un_observance"
  },
  {
    id: "juneteenth",
    name: "Juneteenth National Independence Day",
    month: 6,
    day: 19,
    description: "Commemorates the emancipation of enslaved African Americans and marks a celebration of freedom and resilience.",
    enabled: false,
    category: "cultural"
  },
  {
    id: "mandela_day",
    name: "Nelson Mandela International Day",
    month: 7,
    day: 18,
    description: "Honors Nelson Mandela's 67 years of human rights service, encouraging community service and peaceful unity.",
    enabled: false,
    category: "un_observance"
  },
  {
    id: "youth_day",
    name: "International Youth Day",
    month: 8,
    day: 12,
    description: "Highlights youth development, education, and the voices of emerging generations worldwide.",
    enabled: false,
    category: "un_observance"
  },
  {
    id: "peace_day",
    name: "International Day of Peace",
    month: 9,
    day: 21,
    description: "Dedicated to world peace and the observance of 24 hours of global ceasefire and non-violence.",
    enabled: false,
    category: "un_observance"
  },
  {
    id: "teachers_day",
    name: "World Teachers' Day",
    month: 10,
    day: 5,
    description: "Celebrates the vital contributions of educators, teachers, and pedagogical mentors to societal growth.",
    enabled: false,
    category: "un_observance"
  },
  {
    id: "un_day",
    name: "United Nations Day",
    month: 10,
    day: 24,
    description: "Marks the anniversary of the 1945 entry into force of the UN Charter fostering international cooperation.",
    enabled: false,
    category: "un_observance"
  },
  {
    id: "mens_day",
    name: "International Men's Day",
    month: 11,
    day: 19,
    description: "Highlights men's physical and mental health, positive male role models, and family well-being.",
    enabled: false,
    category: "cultural"
  },
  {
    id: "human_rights_day",
    name: "Human Rights Day",
    month: 12,
    day: 10,
    description: "Commemorates the day the UN General Assembly adopted the Universal Declaration of Human Rights in 1948.",
    enabled: false,
    category: "un_observance"
  },
  {
    id: "christmas_day",
    name: "Christmas Day",
    month: 12,
    day: 25,
    description: "Celebrated across nations as a festive religious and cultural holiday honoring joy, peace, and family gatherings.",
    enabled: true,
    category: "international"
  },
  {
    id: "boxing_day",
    name: "Boxing Day",
    month: 12,
    day: 26,
    description: "Traditional public holiday following Christmas, historically rooted in sharing gift boxes and charity.",
    enabled: true,
    category: "international"
  },
  {
    id: "new_years_eve",
    name: "New Year's Eve",
    month: 12,
    day: 31,
    description: "Celebration closing out the current calendar year with anticipation and reflections.",
    enabled: true,
    category: "international"
  }
];

export const GLOBAL_TIMEZONES: TimezoneOption[] = [
  { value: "UTC", label: "UTC / GMT (Coordinated Universal Time)", region: "Universal", offset: "UTC+00:00" },
  { value: "Africa/Lagos", label: "West Africa Time - Lagos, Abuja, Port Harcourt (WAT)", region: "Africa", offset: "UTC+01:00" },
  { value: "Africa/Johannesburg", label: "South Africa Standard Time - Johannesburg, Cape Town (SAST)", region: "Africa", offset: "UTC+02:00" },
  { value: "Africa/Nairobi", label: "East Africa Time - Nairobi, Kampala, Addis Ababa (EAT)", region: "Africa", offset: "UTC+03:00" },
  { value: "Africa/Cairo", label: "Eastern European Time - Cairo, Alexandria (EET)", region: "Africa", offset: "UTC+02:00" },
  { value: "Africa/Accra", label: "Greenwich Mean Time - Accra (GMT)", region: "Africa", offset: "UTC+00:00" },
  { value: "Africa/Casablanca", label: "Western European Time - Casablanca (WET)", region: "Africa", offset: "UTC+01:00" },
  { value: "Europe/London", label: "Greenwich Mean Time / BST - London, Edinburgh (GMT/BST)", region: "Europe", offset: "UTC+00:00" },
  { value: "Europe/Paris", label: "Central European Time - Paris, Lyon (CET)", region: "Europe", offset: "UTC+01:00" },
  { value: "Europe/Berlin", label: "Central European Time - Berlin, Munich, Frankfurt (CET)", region: "Europe", offset: "UTC+01:00" },
  { value: "Europe/Madrid", label: "Central European Time - Madrid, Barcelona (CET)", region: "Europe", offset: "UTC+01:00" },
  { value: "Europe/Rome", label: "Central European Time - Rome, Milan (CET)", region: "Europe", offset: "UTC+01:00" },
  { value: "Europe/Amsterdam", label: "Central European Time - Amsterdam (CET)", region: "Europe", offset: "UTC+01:00" },
  { value: "Europe/Moscow", label: "Moscow Standard Time - Moscow, St. Petersburg (MSK)", region: "Europe", offset: "UTC+03:00" },
  { value: "America/New_York", label: "Eastern Time - New York, Boston, Miami, Atlanta (EST/EDT)", region: "Americas", offset: "UTC-05:00" },
  { value: "America/Chicago", label: "Central Time - Chicago, Dallas, Houston (CST/CDT)", region: "Americas", offset: "UTC-06:00" },
  { value: "America/Denver", label: "Mountain Time - Denver, Phoenix, Salt Lake (MST/MDT)", region: "Americas", offset: "UTC-07:00" },
  { value: "America/Los_Angeles", label: "Pacific Time - Los Angeles, San Francisco, Seattle (PST/PDT)", region: "Americas", offset: "UTC-08:00" },
  { value: "America/Toronto", label: "Eastern Time - Toronto, Montreal, Ottawa (EST/EDT)", region: "Americas", offset: "UTC-05:00" },
  { value: "America/Vancouver", label: "Pacific Time - Vancouver (PST/PDT)", region: "Americas", offset: "UTC-08:00" },
  { value: "America/Sao_Paulo", label: "Brasília Time - São Paulo, Rio de Janeiro (BRT)", region: "Americas", offset: "UTC-03:00" },
  { value: "America/Buenos_Aires", label: "Argentina Time - Buenos Aires (ART)", region: "Americas", offset: "UTC-03:00" },
  { value: "America/Mexico_City", label: "Central Standard Time - Mexico City (CST)", region: "Americas", offset: "UTC-06:00" },
  { value: "Asia/Dubai", label: "Gulf Standard Time - Dubai, Abu Dhabi (GST)", region: "Middle East", offset: "UTC+04:00" },
  { value: "Asia/Riyadh", label: "Arabia Standard Time - Riyadh, Jeddah (AST)", region: "Middle East", offset: "UTC+03:00" },
  { value: "Asia/Kolkata", label: "India Standard Time - Mumbai, New Delhi, Bengaluru (IST)", region: "Asia", offset: "UTC+05:30" },
  { value: "Asia/Dhaka", label: "Bangladesh Standard Time - Dhaka (BST)", region: "Asia", offset: "UTC+06:00" },
  { value: "Asia/Bangkok", label: "Indochina Time - Bangkok, Hanoi, Jakarta (ICT)", region: "Asia", offset: "UTC+07:00" },
  { value: "Asia/Singapore", label: "Singapore Standard Time - Singapore (SGT)", region: "Asia", offset: "UTC+08:00" },
  { value: "Asia/Hong_Kong", label: "Hong Kong Time - Hong Kong (HKT)", region: "Asia", offset: "UTC+08:00" },
  { value: "Asia/Shanghai", label: "China Standard Time - Beijing, Shanghai (CST)", region: "Asia", offset: "UTC+08:00" },
  { value: "Asia/Tokyo", label: "Japan Standard Time - Tokyo, Osaka (JST)", region: "Asia", offset: "UTC+09:00" },
  { value: "Asia/Seoul", label: "Korea Standard Time - Seoul (KST)", region: "Asia", offset: "UTC+09:00" },
  { value: "Australia/Sydney", label: "Australian Eastern Time - Sydney, Canberra (AEST)", region: "Oceania", offset: "UTC+10:00" },
  { value: "Australia/Melbourne", label: "Australian Eastern Time - Melbourne (AEST)", region: "Oceania", offset: "UTC+10:00" },
  { value: "Australia/Perth", label: "Australian Western Time - Perth (AWST)", region: "Oceania", offset: "UTC+08:00" },
  { value: "Pacific/Auckland", label: "New Zealand Standard Time - Auckland, Wellington (NZST)", region: "Oceania", offset: "UTC+12:00" }
];

/**
 * Calculates current date and time in the specified timezone
 */
export function getDateInTimezone(date: Date = new Date(), timezone: string = "UTC"): {
  year: number;
  month: number; // 1-12
  monthIndex: number; // 0-11
  day: number; // 1-31
  dateString: string; // YYYY-MM-DD
  timeString: string; // HH:MM:SS
  formattedDisplay: string;
} {
  const tz = timezone || "UTC";
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false
    });

    const parts = formatter.formatToParts(date);
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    let hour = date.getHours();
    let minute = date.getMinutes();
    let second = date.getSeconds();

    for (const p of parts) {
      if (p.type === "year") year = parseInt(p.value, 10);
      if (p.type === "month") month = parseInt(p.value, 10);
      if (p.type === "day") day = parseInt(p.value, 10);
      if (p.type === "hour") hour = parseInt(p.value, 10);
      if (p.type === "minute") minute = parseInt(p.value, 10);
      if (p.type === "second") second = parseInt(p.value, 10);
    }

    const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const timeString = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;

    const displayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });

    return {
      year,
      month,
      monthIndex: month - 1,
      day,
      dateString,
      timeString,
      formattedDisplay: displayFormatter.format(date)
    };
  } catch (err) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const timeString = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    return {
      year,
      month,
      monthIndex: month - 1,
      day,
      dateString,
      timeString,
      formattedDisplay: date.toLocaleDateString()
    };
  }
}

export interface ApprovedHolidayInfo {
  id: string;
  name: string;
  description: string;
  type: "international" | "custom";
  month: number; // 1-12
  day: number; // 1-31
  year?: number;
  repeatsAnnually: boolean;
  dateDisplay: string;
}

/**
 * Checks if a specific day (year, monthIndex 0-11, day 1-31) is an approved holiday for a tenant
 */
export function getHolidayForDate(
  year: number,
  monthIndex: number, // 0-11
  day: number, // 1-31
  settings?: TenantSettings
): ApprovedHolidayInfo | null {
  // If holiday management is disabled for this tenant, return null
  if (!settings || settings.holidayManagementEnabled === false) {
    return null;
  }

  const targetMonth = monthIndex + 1; // Convert to 1-12

  // 1. Check Custom Holidays first (they can override or add specific observances)
  if (settings.customHolidays && settings.customHolidays.length > 0) {
    const customMatch = settings.customHolidays.find((ch) => {
      if (ch.enabled === false) return false;
      // If holiday has a specific year and does not repeat annually
      if (ch.year && !ch.repeatsAnnually && ch.year !== year) {
        return false;
      }
      return ch.month === targetMonth && ch.day === day;
    });

    if (customMatch) {
      return {
        id: customMatch.id,
        name: customMatch.name,
        description: customMatch.description || "Official company-approved custom holiday.",
        type: "custom",
        month: customMatch.month,
        day: customMatch.day,
        year: customMatch.year,
        repeatsAnnually: customMatch.repeatsAnnually,
        dateDisplay: `${customMatch.month}/${customMatch.day}`
      };
    }
  }

  // 2. Check International Holidays
  // Use tenant's configured international holidays, or default list if not yet customized
  const intlHolidays = (settings.internationalHolidays && settings.internationalHolidays.length > 0)
    ? settings.internationalHolidays
    : DEFAULT_INTERNATIONAL_HOLIDAYS;

  const intlMatch = intlHolidays.find((ih) => {
    return ih.enabled !== false && ih.month === targetMonth && ih.day === day;
  });

  if (intlMatch) {
    return {
      id: intlMatch.id,
      name: intlMatch.name,
      description: intlMatch.description || "Recognized international public holiday.",
      type: "international",
      month: intlMatch.month,
      day: intlMatch.day,
      repeatsAnnually: true,
      dateDisplay: `${intlMatch.month}/${intlMatch.day}`
    };
  }

  return null;
}

/**
 * Checks if a string date (YYYY-MM-DD) is an approved holiday
 */
export function isHolidayDateString(
  dateString: string,
  settings?: TenantSettings
): ApprovedHolidayInfo | null {
  if (!dateString) return null;
  const parts = dateString.split("-");
  if (parts.length < 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return getHolidayForDate(year, month - 1, day, settings);
}

/**
 * Retrieves all approved holidays (both international and custom) for a given year
 */
export function getAllApprovedHolidays(settings?: TenantSettings, targetYear: number = new Date().getFullYear()): ApprovedHolidayInfo[] {
  if (!settings || settings.holidayManagementEnabled === false) {
    return [];
  }

  const results: ApprovedHolidayInfo[] = [];

  // International
  const intlList = (settings.internationalHolidays && settings.internationalHolidays.length > 0)
    ? settings.internationalHolidays
    : DEFAULT_INTERNATIONAL_HOLIDAYS;

  intlList.forEach((ih) => {
    if (ih.enabled !== false) {
      results.push({
        id: ih.id,
        name: ih.name,
        description: ih.description,
        type: "international",
        month: ih.month,
        day: ih.day,
        year: targetYear,
        repeatsAnnually: true,
        dateDisplay: `${targetYear}-${String(ih.month).padStart(2, "0")}-${String(ih.day).padStart(2, "0")}`
      });
    }
  });

  // Custom
  if (settings.customHolidays) {
    settings.customHolidays.forEach((ch) => {
      if (ch.enabled !== false) {
        if (!ch.repeatsAnnually && ch.year && ch.year !== targetYear) {
          return;
        }
        results.push({
          id: ch.id,
          name: ch.name,
          description: ch.description,
          type: "custom",
          month: ch.month,
          day: ch.day,
          year: ch.year || targetYear,
          repeatsAnnually: ch.repeatsAnnually,
          dateDisplay: `${targetYear}-${String(ch.month).padStart(2, "0")}-${String(ch.day).padStart(2, "0")}`
        });
      }
    });
  }

  // Sort chronologically by month then day
  return results.sort((a, b) => {
    if (a.month !== b.month) return a.month - b.month;
    return a.day - b.day;
  });
}

/**
 * Checks whether today is a worker's birthday based on company timezone
 */
export function isWorkerBirthdayToday(
  worker: { birthMonth?: number; birthDay?: number },
  timezone: string = "UTC"
): boolean {
  if (!worker.birthMonth || !worker.birthDay) return false;
  const currentInTz = getDateInTimezone(new Date(), timezone);
  return worker.birthMonth === currentInTz.month && worker.birthDay === currentInTz.day;
}
