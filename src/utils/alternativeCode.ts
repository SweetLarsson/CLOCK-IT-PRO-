/**
 * Utility to generate and validate the 6-character alphanumeric alternative attendance code
 * Rotates dynamically every 24 hours based on calendar date (YYYY-MM-DD)
 */

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getAlternativeAttendanceCode(tenantId: string, dateStr?: string): string {
  if (!tenantId) return "CLK789";
  
  const effectiveDate = dateStr || getTodayDateString();
  const combinedSeed = `${tenantId}_${effectiveDate}_clk_daily`;

  // Deterministic 32-bit FNV-1a / DJB2 variant hash based on tenant ID + dynamic daily date
  let hash = 2166136261;
  for (let i = 0; i < combinedSeed.length; i++) {
    hash ^= combinedSeed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
    hash |= 0;
  }
  
  // Exclude easily confused characters: 0, O, 1, I, L
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let result = "";
  let seed = Math.abs(hash);
  
  for (let i = 0; i < 6; i++) {
    const charCode = combinedSeed.charCodeAt(i % combinedSeed.length) || 65;
    const index = Math.abs(seed + charCode * (i + 7) + i * 19) % alphabet.length;
    result += alphabet[index];
    seed = Math.floor(seed / 5) + (charCode * 13) + (i * 23);
  }
  
  return result.toUpperCase();
}

export function validateAlternativeAttendanceCode(inputCode: string, tenantId: string): boolean {
  if (!inputCode || !tenantId) return false;
  const cleanInput = inputCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  
  // Valid if matches today's dynamic 24-hour code or yesterday's code (to allow grace around 24h midnight shifts)
  const todayCode = getAlternativeAttendanceCode(tenantId, getTodayDateString()).toUpperCase();
  if (cleanInput === todayCode) return true;
  
  const yesterdayCode = getAlternativeAttendanceCode(tenantId, getYesterdayDateString()).toUpperCase();
  if (cleanInput === yesterdayCode) return true;

  return false;
}
