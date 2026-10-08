/**
 * Billing & Subscription Duration Utilities
 * Handles subscription durations, discounts, and pricing calculations.
 */

export type SubscriptionDurationKey = "1w" | "2w" | "1m" | "2m" | "3m" | "6m" | "12m";

export interface SubscriptionDurationOption {
  key: SubscriptionDurationKey;
  label: string;
  unit: "week" | "month";
  count: number;
  monthsEquivalent: number;
  discountPercent: number;
  badge: string;
  days: number;
  highlight?: boolean;
}

export const SUBSCRIPTION_DURATION_OPTIONS: SubscriptionDurationOption[] = [
  {
    key: "1w",
    label: "1 Week",
    unit: "week",
    count: 1,
    monthsEquivalent: 0.25,
    discountPercent: 0,
    badge: "No Discount (0%)",
    days: 7,
  },
  {
    key: "2w",
    label: "2 Weeks",
    unit: "week",
    count: 2,
    monthsEquivalent: 0.5,
    discountPercent: 5,
    badge: "5% OFF",
    days: 14,
  },
  {
    key: "1m",
    label: "1 Month",
    unit: "month",
    count: 1,
    monthsEquivalent: 1,
    discountPercent: 10,
    badge: "10% OFF",
    days: 30,
  },
  {
    key: "2m",
    label: "2 Months",
    unit: "month",
    count: 2,
    monthsEquivalent: 2,
    discountPercent: 12.5,
    badge: "12.5% OFF",
    days: 60,
  },
  {
    key: "3m",
    label: "3 Months",
    unit: "month",
    count: 3,
    monthsEquivalent: 3,
    discountPercent: 15,
    badge: "15% OFF",
    days: 90,
  },
  {
    key: "6m",
    label: "6 Months",
    unit: "month",
    count: 6,
    monthsEquivalent: 6,
    discountPercent: 20,
    badge: "20% OFF",
    days: 180,
  },
  {
    key: "12m",
    label: "12 Months",
    unit: "month",
    count: 12,
    monthsEquivalent: 12,
    discountPercent: 25,
    badge: "25% OFF (Max Savings)",
    days: 365,
    highlight: true,
  },
];

export const PLAN_BASE_MONTHLY_PRICES: Record<string, number> = {
  starter: 10000,
  business: 30000,
  growth: 50050,
  enterprise: 150000,
};

/**
 * Resolves a duration option from either a string key ("1w", "2w", "1m", etc.)
 * or a numeric durationMonths / number of days.
 */
export function getDurationOption(durationInput?: string | number | null): SubscriptionDurationOption {
  if (!durationInput && durationInput !== 0) {
    return SUBSCRIPTION_DURATION_OPTIONS[3]; // Default to 2 Months
  }

  if (typeof durationInput === "string") {
    const normalized = durationInput.trim().toLowerCase();
    const found = SUBSCRIPTION_DURATION_OPTIONS.find(
      (opt) =>
        opt.key.toLowerCase() === normalized ||
        opt.label.toLowerCase() === normalized ||
        opt.label.toLowerCase().replace(/\s+/g, "") === normalized.replace(/\s+/g, "")
    );
    if (found) return found;
  }

  const num = Number(durationInput);
  if (!isNaN(num)) {
    if (num === 0.25 || num === 7) return SUBSCRIPTION_DURATION_OPTIONS[0]; // 1 Week
    if (num === 0.5 || num === 14) return SUBSCRIPTION_DURATION_OPTIONS[1]; // 2 Weeks
    if (num === 1 || num === 30 || num === 28 || num === 31) return SUBSCRIPTION_DURATION_OPTIONS[2]; // 1 Month
    if (num === 2 || num === 60) return SUBSCRIPTION_DURATION_OPTIONS[3]; // 2 Months
    if (num === 3 || num === 90) return SUBSCRIPTION_DURATION_OPTIONS[4]; // 3 Months
    if (num === 6 || num === 180) return SUBSCRIPTION_DURATION_OPTIONS[5]; // 6 Months
    if (num === 12 || num === 365 || num === 360) return SUBSCRIPTION_DURATION_OPTIONS[6]; // 12 Months
  }

  return SUBSCRIPTION_DURATION_OPTIONS[3]; // Default to 2 Months
}

export interface SubscriptionPricingCalculation {
  baseMonthly: number;
  originalPrice: number;
  discountPercent: number;
  discountAmount: number;
  finalPrice: number;
  durationOption: SubscriptionDurationOption;
  monthlyEquivalentPrice: number;
}

/**
 * Calculates pricing, duration discounts, and net payable amounts.
 */
export function calculateSubscriptionPricing(
  planCode: string,
  durationInput?: string | number | null
): SubscriptionPricingCalculation {
  const normalizedPlan = (planCode || "starter").toLowerCase();
  const baseMonthly = PLAN_BASE_MONTHLY_PRICES[normalizedPlan] || 10000;
  const durationOption = getDurationOption(durationInput);

  let originalPrice = 0;
  if (durationOption.unit === "week") {
    if (durationOption.count === 1) {
      originalPrice = Math.round(baseMonthly / 4);
    } else {
      originalPrice = Math.round(baseMonthly / 2);
    }
  } else {
    originalPrice = baseMonthly * durationOption.count;
  }

  const discountPercent = durationOption.discountPercent;
  const discountAmount = Math.round((originalPrice * discountPercent) / 100);
  const finalPrice = originalPrice - discountAmount;

  const monthlyEquivalentPrice =
    durationOption.monthsEquivalent > 0
      ? Math.round(finalPrice / durationOption.monthsEquivalent)
      : finalPrice;

  return {
    baseMonthly,
    originalPrice,
    discountPercent,
    discountAmount,
    finalPrice,
    durationOption,
    monthlyEquivalentPrice,
  };
}

/**
 * Calculates the expiration date based on start date and duration option.
 */
export function calculateSubscriptionEndDate(
  startDate: Date = new Date(),
  durationInput?: string | number | null
): Date {
  const option = getDurationOption(durationInput);
  const end = new Date(startDate.getTime());

  if (option.unit === "week") {
    end.setDate(end.getDate() + option.days);
  } else {
    end.setMonth(end.getMonth() + option.count);
  }

  return end;
}
