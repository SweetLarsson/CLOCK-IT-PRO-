/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { QrCode } from "lucide-react";

export interface OfficialAppLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  showText?: boolean;
  appName?: string;
  subtitle?: string;
  className?: string;
  badgeClassName?: string;
  textClassName?: string;
  subtitleClassName?: string;
  animate?: boolean;
  onClick?: () => void;
}

const sizeConfig = {
  xs: {
    badge: "h-6 w-6 rounded-lg",
    icon: "h-3.5 w-3.5",
    title: "text-xs",
    subtitle: "text-[9px]",
    gap: "gap-2",
  },
  sm: {
    badge: "h-8 w-8 rounded-xl",
    icon: "h-4.5 w-4.5",
    title: "text-sm",
    subtitle: "text-[10px]",
    gap: "gap-2.5",
  },
  md: {
    badge: "h-10 w-10 rounded-xl",
    icon: "h-5 w-5",
    title: "text-base sm:text-lg",
    subtitle: "text-[10px] sm:text-xs",
    gap: "gap-3",
  },
  lg: {
    badge: "h-14 w-14 rounded-2xl",
    icon: "h-7 w-7",
    title: "text-xl sm:text-2xl",
    subtitle: "text-xs",
    gap: "gap-3.5",
  },
  xl: {
    badge: "h-20 w-20 sm:h-24 sm:w-24 rounded-3xl",
    icon: "h-10 w-10 sm:h-12 sm:w-12",
    title: "text-2xl sm:text-3xl",
    subtitle: "text-xs sm:text-sm",
    gap: "gap-4",
  },
  "2xl": {
    badge: "h-28 w-28 sm:h-32 sm:w-32 rounded-3xl",
    icon: "h-14 w-14 sm:h-16 sm:w-16",
    title: "text-3xl sm:text-4xl",
    subtitle: "text-sm sm:text-base",
    gap: "gap-5",
  },
};

/**
 * Official Company & Application Logo
 * Standardized across Landing Page, Dashboards, Splash Screens & System Controls.
 * Uses the signature cyan-to-blue linear gradient with the official white QR Code emblem.
 */
export function OfficialAppLogo({
  size = "md",
  showText = false,
  appName = "CLOCK-IT PRO+",
  subtitle,
  className = "",
  badgeClassName = "",
  textClassName = "text-white",
  subtitleClassName = "text-neutral-400",
  animate = false,
  onClick,
}: OfficialAppLogoProps) {
  const config = sizeConfig[size] || sizeConfig.md;

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center ${config.gap} select-none ${
        onClick ? "cursor-pointer group" : ""
      } ${className}`}
    >
      {/* Signature Logo Badge */}
      <div
        className={`relative shrink-0 flex items-center justify-center bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-950/40 border border-white/20 transition-all duration-300 ${
          config.badge
        } ${animate ? "animate-pulse" : ""} ${
          onClick ? "group-hover:brightness-110 group-hover:scale-105" : ""
        } ${badgeClassName}`}
      >
        <QrCode className={`${config.icon} stroke-[2.2]`} />
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col min-w-0 leading-tight">
          <span
            className={`font-display font-bold tracking-tight truncate ${config.title} ${textClassName}`}
          >
            {appName}
          </span>
          {subtitle && (
            <span
              className={`font-mono tracking-wide truncate mt-0.5 ${config.subtitle} ${subtitleClassName}`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default OfficialAppLogo;
