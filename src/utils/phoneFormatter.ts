export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  
  // Strip existing spaces to format consistently
  const cleaned = phone.replace(/\s+/g, "");
  
  // Check if it starts with + country code, e.g., +234
  if (cleaned.startsWith("+")) {
    if (cleaned.length === 14) {
      // e.g. +2348064599545 -> +234 806 459 9545
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)} ${cleaned.slice(10)}`;
    }
    // General fallback for + followed by digits
    if (cleaned.length > 10) {
      const countryCodeLen = cleaned.length - 10;
      return `${cleaned.slice(0, countryCodeLen)} ${cleaned.slice(countryCodeLen, countryCodeLen + 3)} ${cleaned.slice(countryCodeLen + 3, countryCodeLen + 6)} ${cleaned.slice(countryCodeLen + 6)}`;
    }
  } else {
    // Non + country code, e.g. 08064599545 (11 digits)
    if (cleaned.length === 11) {
      // 0806 459 9545
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }
  }
  return cleaned;
}
