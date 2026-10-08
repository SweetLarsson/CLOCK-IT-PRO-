/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Compass,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  Sparkles,
  Clock,
  BarChart3,
  FileText,
  Users,
  CreditCard,
  QrCode,
  Megaphone,
  Settings,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
} from "lucide-react";

export interface TourStep {
  id: string;
  targetId?: string;
  title: string;
  description: string;
  badge?: string;
  requiredTab?: string;
  preferredPlacement?: "top" | "bottom" | "left" | "right" | "center";
  iconName?: string;
}

export interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  role: "admin" | "worker";
  theme?: "dark" | "light" | "army" | "navy" | string;
  onNavigateTab?: (tab: string) => void;
  userId?: string;
}

const getStepIcon = (iconName?: string) => {
  switch (iconName) {
    case "clock":
      return <Clock className="h-5 w-5 text-cyan-400" />;
    case "analytics":
      return <BarChart3 className="h-5 w-5 text-cyan-400" />;
    case "permissions":
      return <FileText className="h-5 w-5 text-cyan-400" />;
    case "users":
      return <Users className="h-5 w-5 text-cyan-400" />;
    case "billing":
      return <CreditCard className="h-5 w-5 text-cyan-400" />;
    case "qr":
      return <QrCode className="h-5 w-5 text-cyan-400" />;
    case "announcements":
      return <Megaphone className="h-5 w-5 text-cyan-400" />;
    case "settings":
      return <Settings className="h-5 w-5 text-cyan-400" />;
    case "check":
      return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
    case "welcome":
    default:
      return <Sparkles className="h-5 w-5 text-cyan-400" />;
  }
};

export const ADMIN_TOUR_STEPS: TourStep[] = [
  {
    id: "admin_welcome",
    title: "Welcome to Your Admin Portal",
    badge: "Getting Started",
    description:
      "CLOCK-IT PRO+ gives you real-time command over your organization's shift presence, automated analytics, digital permissions desk, and contactless clock-ins.",
    preferredPlacement: "center",
    iconName: "welcome",
  },
  {
    id: "admin_attendance",
    targetId: "admin_tab_attendance",
    requiredTab: "attendance",
    title: "Shift Register & Live Attendance",
    badge: "Operations",
    description:
      "Monitor active workers in real time, view exact arrival and departure timestamps, track lunch breaks, and activate the hands-free auto-scrolling shift teleprompter.",
    preferredPlacement: "bottom",
    iconName: "clock",
  },
  {
    id: "admin_analytics",
    targetId: "admin_tab_analytics",
    requiredTab: "analytics",
    title: "Performance & Velocity Analytics",
    badge: "Intelligence",
    description:
      "Explore attendance punctuality ratios, department breakdowns, late arrival trends, and generate compiled audit reports ready for export.",
    preferredPlacement: "bottom",
    iconName: "analytics",
  },
  {
    id: "admin_permissions",
    targetId: "admin_tab_permissions",
    requiredTab: "permissions",
    title: "Digital Permissions & Leaves",
    badge: "Compliance",
    description:
      "Review incoming employee absence, medical, or shift exemption requests with real-time approvals, automatic status updates, and full audit logs.",
    preferredPlacement: "bottom",
    iconName: "permissions",
  },
  {
    id: "admin_profiles",
    targetId: "admin_tab_profiles",
    requiredTab: "profiles",
    title: "Workforce Directory & Teams",
    badge: "Team Management",
    description:
      "Manage employee profiles, assign corporate departments, reset worker credentials, and organize your workforce seamlessly.",
    preferredPlacement: "bottom",
    iconName: "users",
  },
  {
    id: "admin_billing",
    targetId: "admin_tab_billing",
    requiredTab: "billing",
    title: "Billing & Brand Identity",
    badge: "Customization",
    description:
      "Upgrade your plan, manage payment gateways (Opay, Paystack, Card), and customize your corporate identity, name, phone, email, and brand logo.",
    preferredPlacement: "bottom",
    iconName: "billing",
  },
  {
    id: "admin_qr",
    targetId: "admin_open_qr",
    title: "Contactless QR Terminal",
    badge: "Terminal Kiosk",
    description:
      "Launch the rotating high-security QR Code Terminal on any tablet or kiosk display for instantaneous contactless worker clock-ins.",
    preferredPlacement: "bottom",
    iconName: "qr",
  },
  {
    id: "admin_announcements",
    targetId: "admin_floating_announcement_btn",
    title: "Central Broadcast & Surveys",
    badge: "Comms & Feedback",
    description:
      "Broadcast company bulletins, urgent notices, or interactive employee feedback forms with live rating metrics and archived audits.",
    preferredPlacement: "left",
    iconName: "announcements",
  },
  {
    id: "admin_settings",
    targetId: "admin_open_settings",
    title: "Theme & System Policies",
    badge: "Configuration",
    description:
      "Choose from Dark, Light, Army, or Navy themes, adjust shift grace periods, configure sound chimes, or replay this interactive tour anytime.",
    preferredPlacement: "bottom",
    iconName: "settings",
  },
];

export const WORKER_TOUR_STEPS: TourStep[] = [
  {
    id: "worker_welcome",
    title: "Welcome to Your Worker Portal",
    badge: "Overview",
    description:
      "CLOCK-IT PRO+ makes tracking your shifts, clocking in and out, and submitting leave requests effortless from your mobile or desktop browser.",
    preferredPlacement: "center",
    iconName: "welcome",
  },
  {
    id: "worker_scan",
    targetId: "worker_tab_scan",
    requiredTab: "scan",
    title: "Fast Clock-In & Verification",
    badge: "Daily Attendance",
    description:
      "Scan the company QR terminal with your camera or enter your 6-digit alternate PIN to record your verified check-in or checkout instantly.",
    preferredPlacement: "bottom",
    iconName: "qr",
  },
  {
    id: "worker_history",
    targetId: "worker_tab_history",
    requiredTab: "history",
    title: "Attendance History & Hours",
    badge: "Personal Metrics",
    description:
      "Review your logged shift hours, overtime records, weekly attendance trends, and punctuality scores at any time.",
    preferredPlacement: "bottom",
    iconName: "analytics",
  },
  {
    id: "worker_permission",
    targetId: "worker_tab_permission",
    requiredTab: "permission",
    title: "Leave & Exemption Requests",
    badge: "Digital Requests",
    description:
      "Submit medical, absence, or duty exemption requests directly to management with instant notification upon review.",
    preferredPlacement: "bottom",
    iconName: "permissions",
  },
  {
    id: "worker_menu",
    targetId: "worker_menu_settings",
    title: "Menu, Themes & Tour",
    badge: "Preferences",
    description:
      "Customize your theme, install the progressive web app (PWA) to your home screen, update profile photos, or restart this tour whenever needed.",
    preferredPlacement: "bottom",
    iconName: "settings",
  },
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onClose,
  onComplete,
  role,
  theme = "dark",
  onNavigateTab,
  userId = "default",
}) => {
  const steps = role === "admin" ? ADMIN_TOUR_STEPS : WORKER_TOUR_STEPS;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });
  const [dontShowAgain, setDontShowAgain] = useState(true);

  const currentStep = steps[currentStepIndex] || steps[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Theme styling helpers adhering to Global UI Standards
  const getThemeStyles = () => {
    switch (theme) {
      case "army":
        return {
          cardBg: "bg-[#182413] border-[#2D3E24] text-[#E6F4DE] shadow-[#111c0c]/80",
          accentBadge: "bg-[#25361E] text-emerald-400 border border-[#374C2E]",
          textTitle: "text-[#E6F4DE]",
          textBody: "text-[#A1C094]",
          buttonPrimary:
            "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-lg shadow-emerald-950/40",
          buttonSecondary:
            "bg-[#25361E]/80 hover:bg-[#25361E] text-[#E6F4DE] border border-[#374C2E]",
          progressFill: "bg-emerald-500",
          dotActive: "bg-emerald-400 ring-emerald-400/40",
          dotInactive: "bg-[#2D3E24] hover:bg-[#374C2E]",
        };
      case "navy":
        return {
          cardBg: "bg-[#111A31] border-[#1C2B54] text-[#ECEFF4] shadow-[#090e1c]/80",
          accentBadge: "bg-[#243361] text-cyan-300 border border-[#233566]",
          textTitle: "text-[#ECEFF4]",
          textBody: "text-[#94A5C1]",
          buttonPrimary:
            "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-950/40",
          buttonSecondary:
            "bg-[#243361]/80 hover:bg-[#243361] text-[#ECEFF4] border border-[#233566]",
          progressFill: "bg-cyan-500",
          dotActive: "bg-cyan-400 ring-cyan-400/40",
          dotInactive: "bg-[#1C2B54] hover:bg-[#233566]",
        };
      case "light":
        return {
          cardBg: "bg-white border-neutral-200 text-slate-900 shadow-2xl shadow-neutral-300/60",
          accentBadge: "bg-cyan-50 text-cyan-700 border border-cyan-200",
          textTitle: "text-slate-900",
          textBody: "text-slate-600",
          buttonPrimary:
            "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/20",
          buttonSecondary:
            "bg-neutral-100 hover:bg-neutral-200 text-slate-700 border border-neutral-200",
          progressFill: "bg-cyan-600",
          dotActive: "bg-cyan-600 ring-cyan-500/30",
          dotInactive: "bg-neutral-200 hover:bg-neutral-300",
        };
      case "dark":
      default:
        return {
          cardBg: "bg-[#0D0D0D] border-[#262626] text-white shadow-2xl shadow-black/90",
          accentBadge: "bg-[#1A1A1A] text-cyan-400 border border-[#333333]",
          textTitle: "text-white",
          textBody: "text-neutral-300",
          buttonPrimary:
            "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-950/50",
          buttonSecondary:
            "bg-[#1A1A1A] hover:bg-[#242424] text-neutral-200 border border-[#333333]",
          progressFill: "bg-cyan-400",
          dotActive: "bg-cyan-400 ring-cyan-400/40",
          dotInactive: "bg-[#262626] hover:bg-[#333333]",
        };
    }
  };

  const themeStyles = getThemeStyles();

  // Scroll target element into view and calculate bounding rect
  const updateTargetRect = useCallback(() => {
    if (!isOpen) return;

    if (!currentStep.targetId) {
      setTargetRect(null);
      return;
    }

    const element = document.getElementById(currentStep.targetId);
    if (element) {
      const rect = element.getBoundingClientRect();
      // Ensure element is actually visible in layout
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect);
        // Only scroll if element is outside comfortable viewport
        const isOffscreen =
          rect.top < 60 ||
          rect.bottom > window.innerHeight - 60 ||
          rect.left < 20 ||
          rect.right > window.innerWidth - 20;

        if (isOffscreen) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        }
        return;
      }
    }
    // Fallback if element not found or hidden
    setTargetRect(null);
  }, [isOpen, currentStep.targetId]);

  // When step changes, handle tab navigation and target tracking
  useEffect(() => {
    if (!isOpen) return;

    if (currentStep.requiredTab && onNavigateTab) {
      onNavigateTab(currentStep.requiredTab);
    }

    // Measure after brief DOM repaint / tab transition
    const timer = setTimeout(() => {
      updateTargetRect();
    }, 180);

    return () => clearTimeout(timer);
  }, [isOpen, currentStepIndex, currentStep, onNavigateTab, updateTargetRect]);

  // Window resize & scroll listeners
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      updateTargetRect();
    };

    const handleScroll = () => {
      updateTargetRect();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, updateTargetRect]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSkip();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrevious();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleComplete = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(`has_completed_onboarding_${role}_${userId}`, "true");
      } catch (e) {}
    }
    if (onComplete) onComplete();
    onClose();
  };

  const handleSkip = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(`has_completed_onboarding_${role}_${userId}`, "true");
      } catch (e) {}
    }
    onClose();
  };

  if (!isOpen) return null;

  // Spotlight padding around targeted element
  const pad = 8;
  const spotlightBox = targetRect
    ? {
        x: Math.max(0, targetRect.left - pad),
        y: Math.max(0, targetRect.top - pad),
        width: targetRect.width + pad * 2,
        height: targetRect.height + pad * 2,
      }
    : null;

  // Compute Tooltip position dynamically based on spotlight placement
  const calculateTooltipPosition = () => {
    const cardWidth = Math.min(420, windowSize.width - 32);
    const cardHeight = 240; // estimated max height

    if (!spotlightBox || currentStep.preferredPlacement === "center") {
      return {
        isFixedCenter: true,
        style: {
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: `${cardWidth}px`,
        },
      };
    }

    const { x, y, width, height } = spotlightBox;
    const spaceBelow = windowSize.height - (y + height);
    const spaceAbove = y;
    const spaceRight = windowSize.width - (x + width);
    const spaceLeft = x;

    let posX = x + width / 2 - cardWidth / 2;
    let posY = y + height + 16;

    // Constrain X so card never overflows screen walls
    posX = Math.max(16, Math.min(windowSize.width - cardWidth - 16, posX));

    // Determine Y placement
    if (currentStep.preferredPlacement === "top" && spaceAbove > cardHeight + 20) {
      posY = Math.max(16, y - cardHeight - 16);
    } else if (currentStep.preferredPlacement === "left" && spaceLeft > cardWidth + 24) {
      posX = Math.max(16, x - cardWidth - 16);
      posY = Math.max(16, Math.min(windowSize.height - cardHeight - 16, y));
    } else if (currentStep.preferredPlacement === "right" && spaceRight > cardWidth + 24) {
      posX = Math.min(windowSize.width - cardWidth - 16, x + width + 16);
      posY = Math.max(16, Math.min(windowSize.height - cardHeight - 16, y));
    } else {
      // Default: bottom, or fallback to top if bottom is tight
      if (spaceBelow < cardHeight + 20 && spaceAbove > cardHeight + 20) {
        posY = Math.max(16, y - cardHeight - 16);
      } else {
        posY = Math.min(windowSize.height - cardHeight - 16, y + height + 16);
      }
    }

    return {
      isFixedCenter: false,
      style: {
        top: `${posY}px`,
        left: `${posX}px`,
        width: `${cardWidth}px`,
      },
    };
  };

  const { isFixedCenter, style: tooltipStyle } = calculateTooltipPosition();
  const progressPercent = Math.round(((currentStepIndex + 1) / steps.length) * 100);

  return (
    <div
      id="onboarding_tour_overlay"
      className="fixed inset-0 z-50 overflow-hidden select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Dashboard Onboarding Tour"
    >
      {/* Dynamic SVG Spotlight Mask */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none transition-all duration-300"
        style={{ width: "100vw", height: "100vh" }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White reveals the dark background */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cuts out the spotlight hole */}
            {spotlightBox && (
              <rect
                x={spotlightBox.x}
                y={spotlightBox.y}
                width={spotlightBox.width}
                height={spotlightBox.height}
                rx="16"
                ry="16"
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Backdrop overlay masked by the cutout */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.78)"
          mask="url(#tour-spotlight-mask)"
          className="pointer-events-auto transition-opacity duration-300"
          onClick={handleSkip}
        />
      </svg>

      {/* Pulsing Glowing Border Ring around Spotlight Target */}
      {spotlightBox && (
        <div
          id="onboarding_tour_spotlight_ring"
          className="fixed pointer-events-none transition-all duration-300 rounded-2xl border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.6)] animate-pulse z-50"
          style={{
            top: `${spotlightBox.y}px`,
            left: `${spotlightBox.x}px`,
            width: `${spotlightBox.width}px`,
            height: `${spotlightBox.height}px`,
          }}
        />
      )}

      {/* Floating Tour Tooltip Card */}
      <div
        id="onboarding_tour_card_container"
        className="fixed z-50 pointer-events-auto"
        style={tooltipStyle}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, y: isFixedCenter ? 0 : 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isFixedCenter ? 0 : -8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            id="onboarding_tour_card"
            className={`rounded-3xl border p-5 sm:p-6 shadow-2xl backdrop-blur-xl ${themeStyles.cardBg}`}
          >
            {/* Header: Badge & Close */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 shrink-0">
                  {getStepIcon(currentStep.iconName)}
                </div>
                {currentStep.badge && (
                  <span
                    className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full ${themeStyles.accentBadge}`}
                  >
                    {currentStep.badge}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-mono font-medium opacity-60 ${themeStyles.textBody}`}>
                  {currentStepIndex + 1} / {steps.length}
                </span>
                <button
                  id="onboarding_tour_close_btn"
                  onClick={handleSkip}
                  className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close tour (Esc)"
                  aria-label="Close tour"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-1.5 mb-4">
              <h3 className={`text-base sm:text-lg font-extrabold font-display leading-snug ${themeStyles.textTitle}`}>
                {currentStep.title}
              </h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${themeStyles.textBody}`}>
                {currentStep.description}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/10 rounded-full h-1.5 mb-4 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${themeStyles.progressFill}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Footer Controls: Dots, Skip & Next */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
              {/* Step Dots indicator */}
              <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                {steps.map((s, idx) => (
                  <button
                    key={s.id}
                    id={`onboarding_tour_dot_${idx}`}
                    onClick={() => setCurrentStepIndex(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === currentStepIndex
                        ? `w-5 ${themeStyles.dotActive} ring-2`
                        : `w-2 ${themeStyles.dotInactive}`
                    }`}
                    title={`Go to step ${idx + 1}: ${s.title}`}
                    aria-label={`Go to step ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 justify-end">
                {!isFirstStep && (
                  <button
                    id="onboarding_tour_prev_btn"
                    onClick={handlePrevious}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${themeStyles.buttonSecondary}`}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Back</span>
                  </button>
                )}

                {isLastStep ? (
                  <button
                    id="onboarding_tour_finish_btn"
                    onClick={handleComplete}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${themeStyles.buttonPrimary}`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Finish Tour</span>
                  </button>
                ) : (
                  <button
                    id="onboarding_tour_next_btn"
                    onClick={handleNext}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${themeStyles.buttonPrimary}`}
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Persistence Checkbox & Keyboard Hint */}
            <div className="mt-3 pt-2.5 flex items-center justify-between text-[11px] text-neutral-400 opacity-80 border-t border-white/5">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900 text-cyan-500 focus:ring-0 h-3.5 w-3.5 cursor-pointer"
                />
                <span>Don&apos;t show automatically again</span>
              </label>

              <span className="hidden sm:inline font-mono text-[10px]">
                Esc to exit • ➔ Next
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
